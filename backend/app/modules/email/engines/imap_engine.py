import imaplib
import email
from email.header import decode_header
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import logging
from .base_engine import BaseEmailReaderEngine

logger = logging.getLogger(__name__)


class GenericIMAPEngine(BaseEmailReaderEngine):
    """
    Engine centralizada IMAP:
    - Teste de conexão
    - Varredura de não lidos (com movimentação/expurgo)
    - Busca histórica por palavras-chave (sem expurgo)
    """

    @staticmethod
    def test_connection(
        email_address: str, password: str, host: str, port: int
    ) -> bool:
        try:
            mail = imaplib.IMAP4_SSL(host, port)
            mail.login(email_address, password)
            mail.logout()
            return True
        except Exception as e:
            logger.warning(f"Falha no teste de conexão IMAP para {email_address}: {e}")
            return False

    def _parse_email_message(self, raw_bytes: bytes) -> Dict[str, Any]:
        """Método auxiliar interno para parse de cabeçalhos e sanitização do corpo."""
        msg = email.message_from_bytes(raw_bytes)

        raw_subject = msg.get("Subject", "Sem Assunto")
        subject_parts = decode_header(raw_subject)
        subject = ""
        for part, encoding in subject_parts:
            if isinstance(part, bytes):
                subject += part.decode(encoding or "utf-8", errors="ignore")
            else:
                subject += str(part)

        sender = msg.get("From", "Desconhecido")

        body_html, body_plain = "", ""
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                disposition = str(part.get("Content-Disposition"))
                if "attachment" not in disposition:
                    payload = part.get_payload(decode=True)
                    if payload:
                        if content_type == "text/html":
                            body_html = payload.decode(
                                part.get_content_charset() or "utf-8", errors="ignore"
                            )
                        elif content_type == "text/plain":
                            body_plain = payload.decode(
                                part.get_content_charset() or "utf-8", errors="ignore"
                            )
        else:
            payload = msg.get_payload(decode=True)
            if payload:
                body_plain = payload.decode(
                    msg.get_content_charset() or "utf-8", errors="ignore"
                )

        final_body = self.clean_html_body(body_html if body_html else body_plain)
        return {"subject": subject, "sender": sender, "body_text": final_body}

    def fetch_unseen_emails(
        self, limit: int = 15, target_folder: str = "Financias"
    ) -> List[Dict[str, Any]]:
        """Leitura contínua dos últimos e-mails NÃO LIDOS + Mover para pasta."""
        extracted_emails = []
        try:
            mail = imaplib.IMAP4_SSL(self.imap_host, self.imap_port)
            mail.login(self.email_address, self.password_or_token)
            mail.select("INBOX")
            mail.create(target_folder)

            status, messages = mail.search(None, "UNSEEN")
            if status != "OK" or not messages[0]:
                mail.logout()
                return []

            mail_ids = messages[0].split()[-limit:]
            for m_id in mail_ids:
                res, msg_data = mail.fetch(m_id, "(RFC822)")
                if res != "OK":
                    continue
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        parsed = self._parse_email_message(response_part[1])
                        parsed["uid"] = m_id.decode()
                        extracted_emails.append(parsed)

                        # Move e deleta da Inbox
                        mail.copy(m_id, target_folder)
                        mail.store(m_id, "+FLAGS", "\\Deleted")

            mail.expunge()
            mail.logout()
            return extracted_emails
        except Exception as e:
            logger.error(f"Erro na leitura IMAP não lidos: {e}")
            return []

    def fetch_historical_emails(
        self, days_back: int = 90, keywords: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Busca retroativa por janela de dias e termos chave (Somente leitura)."""
        if not keywords:
            keywords = [
                "compra",
                "pix",
                "transferencia",
                "comprovante",
                "fatura",
                "pagamento",
            ]

        extracted_emails = []
        try:
            mail = imaplib.IMAP4_SSL(self.imap_host, self.imap_port)
            mail.login(self.email_address, self.password_or_token)
            mail.select("INBOX", readonly=True)

            since_date = (datetime.now() - timedelta(days=days_back)).strftime(
                "%d-%b-%Y"
            )
            processed_uids = set()

            for kw in keywords:
                search_query = f'(SINCE "{since_date}" TEXT "{kw}")'
                status, data = mail.search(None, search_query)
                if status != "OK" or not data[0]:
                    continue

                email_ids = data[0].split()
                for e_id in email_ids:
                    if e_id in processed_uids:
                        continue

                    res, msg_data = mail.fetch(e_id, "(RFC822)")
                    if res != "OK":
                        continue

                    for response_part in msg_data:
                        if isinstance(response_part, tuple):
                            parsed = self._parse_email_message(response_part[1])
                            parsed["uid"] = e_id.decode()
                            extracted_emails.append(parsed)
                            processed_uids.add(e_id)

            mail.logout()
            return extracted_emails
        except Exception as e:
            logger.error(f"[IMAP Engine Error] Falha na varredura retroativa: {e}")
            return []
