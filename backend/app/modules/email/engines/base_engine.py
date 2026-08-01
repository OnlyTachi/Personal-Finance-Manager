from abc import ABC, abstractmethod
from typing import List, Dict, Any
from bs4 import BeautifulSoup
import re


class BaseEmailReaderEngine(ABC):
    """
    Classe base abstrata para leitura e sanitização de e-mails transacionais.
    """

    def __init__(
        self,
        email_address: str,
        password_or_token: str,
        imap_host: str = None,
        imap_port: int = 993,
    ):
        self.email_address = email_address
        self.password_or_token = password_or_token
        self.imap_host = imap_host
        self.imap_port = imap_port

    @abstractmethod
    def fetch_unseen_emails(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Retorna lista de dicionários contendo:
        {"uid": str, "subject": str, "sender": str, "body_text": str}
        """
        pass

    def clean_html_body(self, html_content: str) -> str:
        """
        Remove tags HTML, scripts, CSS e rodapés poluídos para economizar tokens no SLM.
        """
        if not html_content:
            return ""

        soup = BeautifulSoup(html_content, "html.parser")

        for script in soup(["script", "style", "footer", "header", "nav"]):
            script.extract()

        text = soup.get_text(separator=" ")

        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        clean_text = " ".join(chunk for chunk in chunks if chunk)

        return clean_text[:4000]  # Limita o texto para não estourar a janela do SLM
