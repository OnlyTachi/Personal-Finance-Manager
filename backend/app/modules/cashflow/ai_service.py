import json
import logging
import re
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, func, extract

from app.core.config import settings
from app.modules.cashflow.models import Movimentacao
from .prompts import build_categorization_prompt
from app.core.ai.llm.service import OllamaClient
from app.core.ai.gemini.service import GeminiClient
from app.core.ai.tools import (
    AVAILABLE_TOOLS,
    TOOLS_SCHEMA,
    build_user_financial_snapshot,
)

logger = logging.getLogger(__name__)
gemini_client = GeminiClient()


def get_historical_context_data(
    db: Session, user_username: str, description: str, additional_context: str = None
) -> list:
    try:
        full_text = f"{description} {additional_context or ''}".strip()
        keywords = re.split(r"\s+", full_text)
        valid_keywords = [
            k
            for k in keywords
            if len(k) > 3
            and k.lower() not in ["pix", "enviado", "transferencia", "compra", "debito"]
        ]
        if not valid_keywords:
            return []

        main_keyword = max(valid_keywords, key=len)
        exemplos = (
            db.query(Movimentacao)
            .filter(
                Movimentacao.owner_id == user_username,
                Movimentacao.categoria != "Outros",
                or_(
                    Movimentacao.descricao.ilike(f"%{main_keyword}%"),
                    Movimentacao.observacao.ilike(f"%{main_keyword}%"),
                ),
            )
            .order_by(desc(Movimentacao.data))
            .limit(5)
            .all()
        )
        return exemplos
    except Exception as e:
        logger.error(f"Erro ao buscar contexto ICL: {e}")
        return []


def categorize_transaction_ai(
    db: Session,
    user_username: str,
    description: str,
    value: float,
    additional_context: str = None,
) -> str:
    history_examples = get_historical_context_data(
        db, user_username, description, additional_context
    )
    prompt = build_categorization_prompt(
        description, value, additional_context or "", history_examples
    )
    try:
        result = OllamaClient.generate(prompt=prompt)
        cat = result.get("categoria")
        if cat:
            logger.info(f"  [AI Success] {description} -> {cat}")
            return cat
    except Exception as e:
        logger.error(f"  [AI Error] Falha ao categorizar: {e}")
    return None


def analyze_receipt_gemini(image_bytes: bytes) -> dict:
    prompt = """
    Analise este comprovante. Extraia:
    1. Nome do estabelecimento (descricao).
    2. Valor total (valor).
    3. Data (data YYYY-MM-DD).
    4. Categoria sugerida (categoria).
    Retorne JSON.
    """
    return gemini_client.analyze_image(image_bytes, prompt)


def interpret_chat_intent(question: str) -> dict:
    prompt = f"""
    Traduza para intenção de busca financeira.
    Pergunta: "{question}"
    JSON Esperado: {{ "keywords": ["..."], "date_filter": "current_month|last_month|all_time" }}
    """
    result = gemini_client.generate_text_json(prompt)
    if result:
        return result
    return {
        "keywords": [question.replace("quanto gastei", "").strip()],
        "date_filter": "current_month",
    }


def process_assistant_chat(db: Session, user_username: str, user_message: str) -> str:
    snapshot = build_user_financial_snapshot(db, user_username)
    system_instruction = f"""Você é o Assistente Financeiro Pessoal do Personal Finance Manager. CONTEXTO ATUAL DO USUÁRIO (SNAPSHOT): {json.dumps(snapshot, ensure_ascii=False, indent=2)} REGRAS: 1. Responda diretamente se a informação estiver no SNAPSHOT. 2. Se precisar consultar um histórico específico de loja ou ticker que não está no snapshot, use as TOOLS. 3. Formate valores no padrão R$ X.XXX,XX."""

    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": user_message},
    ]
    try:
        res_data = OllamaClient.chat(messages=messages, tools=TOOLS_SCHEMA)
        message_obj = res_data.get("message", {})
        tool_calls = message_obj.get("tool_calls", [])

        if tool_calls:
            messages.append(message_obj)
            for call in tool_calls:
                func_name = call.get("function", {}).get("name")
                func_args = call.get("function", {}).get("arguments", {})

                if func_name in AVAILABLE_TOOLS:
                    tool_res = AVAILABLE_TOOLS[func_name](
                        db, user_username, **func_args
                    )
                    messages.append(
                        {
                            "role": "tool",
                            "content": json.dumps(tool_res, ensure_ascii=False),
                        }
                    )

            second_res = OllamaClient.chat(messages=messages)
            return second_res.get("message", {}).get("content", "")

        return message_obj.get("content", "")
    except Exception as e:
        logger.error(f"Erro no chat assistente: {e}")
        return "Desculpe, falha ao conectar com o serviço de inteligência artificial no momento."
