import requests
import logging
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Tabela de cores em Hexadecimal
COLOR_MAP = {
    "INFO": 3818744,  # Azul (#38BDF8)
    "SUCCESS": 1095745,  # Verde (#10B981)
    "WARNING": 16107019,  # Amarelo (#F59E0B)
    "ALERT": 15685444,  # Vermelho (#EF4444)
    "CASAL": 15485081,  # Rosa (#EC4899)
}


def send_discord_webhook(
    webhook_url: str,
    title: str,
    description: str,
    fields: Optional[List[Dict[str, Any]]] = None,
    color_type: str = "INFO",
    footer_text: str = "Personal Finance Manager",
) -> bool:
    """
    Envia um Embed formatado para uma URL de Webhook do Discord.
    """
    if not webhook_url:
        return False

    color_decimal = COLOR_MAP.get(color_type.upper(), COLOR_MAP["INFO"])

    embed = {
        "title": title,
        "description": description,
        "color": color_decimal,
        "footer": {"text": footer_text},
    }

    if fields:
        embed["fields"] = fields

    payload = {"username": "Finance Bot", "embeds": [embed]}

    try:
        response = requests.post(webhook_url, json=payload, timeout=5.0)
        response.raise_for_status()
        logger.info(f"Discord Webhook disparado com sucesso ({title})")
        return True
    except Exception as e:
        logger.error(f"Erro ao disparar Discord Webhook: {e}")
        return False
