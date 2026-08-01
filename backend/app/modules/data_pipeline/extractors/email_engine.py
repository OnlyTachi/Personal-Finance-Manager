# app/modules/data_pipeline/extractors/email_engine.py
import logging
from typing import Dict, Any, Optional
from bs4 import BeautifulSoup
from app.modules.data_pipeline.schemas import CanonicalTransactionDTO
from app.modules.email.slm_processor import extract_transaction_from_email

logger = logging.getLogger(__name__)


class InboundEmailWebhookEngine:
    """
    Engine de recebimento de e-mails via Webhook HTTP
    (Compatível com provedores como Resend, SendGrid, Cloudflare Email Routing e Mailgun).
    """

    @staticmethod
    def clean_html_body(html_content: str) -> str:
        if not html_content:
            return ""
        soup = BeautifulSoup(html_content, "html.parser")
        for tag in soup(["script", "style", "footer", "header", "nav"]):
            tag.extract()
        text = soup.get_text(separator=" ")
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        clean_text = " ".join(chunk for chunk in chunks if chunk)
        return clean_text[:4000]

    @classmethod
    def process_webhook_payload(
        cls, payload: Dict[str, Any]
    ) -> Optional[CanonicalTransactionDTO]:
        try:
            subject = payload.get("subject") or payload.get("headers", {}).get(
                "Subject", "Sem Assunto"
            )
            sender = payload.get("from") or payload.get("sender") or "Desconhecido"
            raw_body = (
                payload.get("html")
                or payload.get("body_html")
                or payload.get("text")
                or payload.get("body_plain")
                or ""
            )
            clean_body = cls.clean_html_body(raw_body)
            if not clean_body:
                logger.warning("E-mail recebido sem conteúdo analisável.")
                return None
            slm_result = extract_transaction_from_email(
                subject=subject, sender=sender, body_text=clean_body
            )
            if not slm_result:
                return None

            if isinstance(slm_result, str):
                import json
                import re

                try:
                    cleaned_str = slm_result.strip()
                    if cleaned_str.startswith("```"):
                        cleaned_str = re.sub(r"^```(?:json)?\s*", "", cleaned_str)
                        cleaned_str = re.sub(r"\s*```$", "", cleaned_str)

                    slm_result = json.loads(cleaned_str.strip())
                except Exception as parse_error:
                    logger.warning(
                        f"Falha ao decodificar JSON retornado pelo SLM: {parse_error} | Conteúdo: {slm_result}"
                    )
                    return None

            if isinstance(slm_result, dict):
                tipo_evento = slm_result.get("tipo_evento", "COMPRA")
                valor_total = slm_result.get("valor_total", 0.0)
                estabelecimento = slm_result.get(
                    "estabelecimento_ou_instituicao", "Compra"
                )
                meio_pagamento = slm_result.get("meio_pagamento", "PIX")
                parcelas = slm_result.get("parcelas", 1)
            else:
                tipo_evento = getattr(slm_result, "tipo_evento", "COMPRA")
                valor_total = getattr(slm_result, "valor_total", 0.0)
                estabelecimento = getattr(
                    slm_result, "estabelecimento_ou_instituicao", "Compra"
                )
                meio_pagamento = getattr(slm_result, "meio_pagamento", "PIX")
                parcelas = getattr(slm_result, "parcelas", 1)
            valor = float(valor_total)
            if tipo_evento in ["COMPRA", "TRANSFERENCIA"] and valor > 0:
                valor = -valor

            return CanonicalTransactionDTO(
                descricao=estabelecimento,
                valor=valor,
                categoria_sugerida="Outros",
                origem="EMAIL_SLM",
                meio_pagamento=meio_pagamento,
                parcelas=parcelas,
                historico_raw=f"Assunto: {subject} | Remetente: {sender}",
            )
        except Exception as e:
            logger.warning(
                f"E-mail ignorado pelo SLM (não transacional ou formato inválido): {e}"
            )
            return None
