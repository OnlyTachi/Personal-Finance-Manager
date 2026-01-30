import requests
import json
import logging
import re
import google.generativeai as genai
from PIL import Image
import io
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from app.core.config import settings
from app.modules.cashflow.models import Movimentacao
from .prompts import build_categorization_prompt

logger = logging.getLogger(__name__)

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

def get_historical_context_data(db: Session, user_username: str, description: str, additional_context: str = None) -> list:
    """
    Busca objetos de transações passadas para usar no prompt.
    """
    try:
        full_text = f"{description} {additional_context or ''}".strip()
        keywords = re.split(r"\s+", full_text)
        valid_keywords = [k for k in keywords if len(k) > 3 and k.lower() not in ["pix", "enviado", "transferencia", "compra", "debito"]]
        
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
                    Movimentacao.observacao.ilike(f"%{main_keyword}%")
                )
            )
            .order_by(desc(Movimentacao.data))
            .limit(5)
            .all()
        )
        return exemplos
    except Exception as e:
        logger.error(f"Erro ao buscar contexto ICL: {e}")
        return []

def call_ollama(url: str, model: str, prompt: str, timeout: tuple) -> dict:
    """Função genérica para chamar API do Ollama"""
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.1,
            "num_predict": 128,
        },
    }
    response = requests.post(url, json=payload, timeout=timeout)
    response.raise_for_status()
    # Tenta limpar o JSON se a LLM mandou texto extra
    content = response.json()["response"]
    if "```json" in content:
        content = content.split("```json")[1].split("```")[0]
    return json.loads(content)

def categorize_transaction_ai(
    db: Session, user_username: str, description: str, value: float, additional_context: str = None
) -> str:
    """
    Orquestrador de Categorização (Texto)
    """
    # 1. Busca histórico (ICL)
    history_examples = get_historical_context_data(db, user_username, description, additional_context)
    
    # 2. Constrói o Prompt Otimizado
    prompt = build_categorization_prompt(description, value, additional_context or "", history_examples)

    # 3. Tenta Ollama Remoto (Tier 2)
    try:
        result = call_ollama(
            settings.OLLAMA_WORKER_URL,
            settings.OLLAMA_WORKER_MODEL,
            prompt,
            timeout=(0.5, 10.0),
        )
        cat = result.get("categoria")
        if cat:
            logger.info(f"🚀 GPU Success: {description} -> {cat}")
            return cat
    except Exception as e:
        logger.warning(f"⚠️ GPU Falhou: {e}. Tentando Local...")

    # 4. Tenta Ollama Local (Tier 3)
    try:
        result = call_ollama(
            settings.OLLAMA_LOCAL_URL,
            settings.OLLAMA_LOCAL_MODEL,
            prompt,
            timeout=(None, 60.0),
        )
        cat = result.get("categoria")
        if cat:
            logger.info(f"✅ CPU Success: {description} -> {cat}")
            return cat
    except Exception as e:
        logger.error(f"❌ Erro Fatal IA Local: {e}")

    return None

def analyze_receipt_gemini(image_bytes: bytes) -> dict:
    if not settings.GEMINI_API_KEY:
        return None
    try:
        model = genai.GenerativeModel("gemini-2.5-flash-preview-09-2025")
        image = Image.open(io.BytesIO(image_bytes))
        prompt = """
        Analise este comprovante. Extraia:
        1. Nome do estabelecimento (descricao).
        2. Valor total (valor).
        3. Data (data YYYY-MM-DD).
        4. Categoria sugerida (categoria).
        Retorne JSON.
        """
        response = model.generate_content([prompt, image])
        text_response = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(text_response)
    except Exception as e:
        logger.error(f"Erro Gemini Vision: {e}")
        return None

def interpret_chat_intent(question: str) -> dict:
    prompt = f"""
    Traduza para intenção de busca financeira.
    Pergunta: "{question}"
    JSON Esperado: {{ "keywords": ["..."], "date_filter": "current_month|last_month|all_time" }}
    """
    if settings.GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel("gemini-2.5-flash-preview-09-2025")
            response = model.generate_content(prompt)
            text = response.text.replace("```json", "").replace("```", "").strip()
            return json.loads(text)
        except Exception: pass
    
    return {
        "keywords": [question.replace("quanto gastei", "").strip()],
        "date_filter": "current_month"
    }