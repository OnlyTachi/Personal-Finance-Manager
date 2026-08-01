import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email_html(to_email: str, subject: str, html_content: str) -> bool:
    """
    Envia e-mail em formato HTML via SMTP.
    """
    smtp_server = getattr(settings, "SMTP_SERVER", "smtp.gmail.com")
    smtp_port = getattr(settings, "SMTP_PORT", 587)
    smtp_user = getattr(settings, "SMTP_USER", None)
    smtp_password = getattr(settings, "SMTP_PASSWORD", None)

    if not smtp_user or not smtp_password:
        logger.warning(
            f"Configurações SMTP ausentes. E-mail para {to_email} não enviado."
        )
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_user
        msg["To"] = to_email

        part = MIMEText(html_content, "html", "utf-8")
        msg.attach(part)

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, to_email, msg.as_string())
        server.quit()

        logger.info(f"E-mail enviado com sucesso para {to_email}")
        return True
    except Exception as e:
        logger.error(f"Erro ao enviar e-mail via SMTP para {to_email}: {e}")
        return False
