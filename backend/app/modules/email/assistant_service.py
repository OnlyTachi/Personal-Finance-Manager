import json
import logging
import requests
from sqlalchemy.orm import Session
from app.core.config import settings

from app.core.ai.tools import (
    AVAILABLE_TOOLS,
    TOOLS_SCHEMA,
    build_user_financial_snapshot,
)

logger = logging.getLogger(__name__)


def process_assistant_chat(db: Session, user_username: str, user_message: str) -> str:
    snapshot = build_user_financial_snapshot(db, user_username)
    system_instruction = f"""Você é o Assistente Financeiro Pessoal do Personal Finance Manager. CONTEXTO ATUAL DO USUÁRIO (SNAPSHOT): {json.dumps(snapshot, ensure_ascii=False, indent=2)} REGRAS: 1. Responda diretamente se a informação estiver no SNAPSHOT. 2. Se precisar consultar um histórico específico de loja ou ticker que não está no snapshot, use as TOOLS. 3. Formate valores no padrão R$ X.XXX,XX."""

    url = (
        settings.OLLAMA_WORKER_URL
        or settings.OLLAMA_LOCAL_URL
        or "http://localhost:11434/api/chat"
    )
    model = settings.OLLAMA_WORKER_MODEL or settings.OLLAMA_LOCAL_MODEL or "qwen2.5:3b"

    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": user_message},
    ]
    try:
        response = requests.post(
            url,
            json={
                "model": model,
                "messages": messages,
                "tools": TOOLS_SCHEMA,
                "stream": False,
            },
            timeout=30.0,
        )
        response.raise_for_status()
        res_data = response.json()
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

            second_res = requests.post(
                url,
                json={"model": model, "messages": messages, "stream": False},
                timeout=30.0,
            )
            second_res.raise_for_status()
            return second_res.json().get("message", {}).get("content", "")

        return message_obj.get("content", "")
    except Exception as e:
        logger.error(f"Erro no chat assistente: {e}")
        return "Desculpe, falha ao conectar com o serviço de inteligência artificial no momento."
