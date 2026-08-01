import logging
from sqlalchemy.orm import Session
from app.modules.notifications import models
from app.modules.reports.models import ReportPreference
from app.modules.reports.services.webhook_service import send_discord_webhook

logger = logging.getLogger(__name__)


def notify_user(
    db: Session,
    user_username: str,
    tipo: str,
    titulo: str,
    mensagem: str,
    enviar_email: bool = False,
    color_type: str = "INFO",
):
    notif = models.NotificationDB(
        user_id=user_username, tipo=tipo, titulo=titulo, mensagem=mensagem
    )
    db.add(notif)
    db.commit()

    pref = (
        db.query(ReportPreference)
        .filter(ReportPreference.owner_id == user_username)
        .first()
    )

    if pref and pref.discord_webhook_url:
        category_colors = {
            "FATURA": "WARNING",
            "META": "SUCCESS",
            "ANOMALIA": "ALERT",
            "CASAL_NOVA_DESPESA": "CASAL",
            "CASAL_QUITACAO": "SUCCESS",
        }
        chosen_color = category_colors.get(tipo, color_type)

        send_discord_webhook(
            webhook_url=pref.discord_webhook_url,
            title=f"🔔 {titulo}",
            description=mensagem.replace("<b>", "**").replace(
                "</b>", "**"
            ),  # Ajusta tags HTML para Markdown do Discord
            color_type=chosen_color,
        )

    if enviar_email and pref and pref.contact_email:
        from app.modules.reports.mailer import send_email_html

        send_email_html(
            to_email=pref.contact_email,
            subject=f"🔔 {titulo}",
            html_content=f"<p>{mensagem}</p>",
        )


# --- GATILHOS DAS NOTIFICAÇÕES ---


# 1. Alerta de Fatura de Cartão
def check_invoice_due_alerts(
    db: Session,
    user_username: str,
    nome_cartao: str,
    valor: float,
    dias_para_vencimento: int,
):
    titulo = f"Fatura do Cartão {nome_cartao}"
    msg = f"Sua fatura do cartão <b>{nome_cartao}</b> no valor de <b>R$ {valor:.2f}</b> vence em {dias_para_vencimento} dia(s)."
    notify_user(db, user_username, "FATURA", titulo, msg, enviar_email=True)


# 2. Comemoração de Meta Atingida
def check_goal_reached_alerts(
    db: Session, user_username: str, nome_meta: str, valor_alvo: float
):
    titulo = "🎉 Meta Atingida!"
    msg = f"Parabéns! Você alcançou 100% do seu objetivo na meta <b>{nome_meta}</b> (R$ {valor_alvo:.2f})."
    notify_user(db, user_username, "META", titulo, msg, enviar_email=True)


# 3. Alertas de Despesas Anômalas / Compras Atípicas
def check_anomaly_expense_alert(
    db: Session,
    user_username: str,
    descricao: str,
    valor: float,
    media_categoria: float,
):
    titulo = "⚠️ Alerta de Gasto Anômalo"
    msg = f"Detectamos um gasto fora do padrão: <b>{descricao}</b> no valor de <b>R$ {abs(valor):.2f}</b>. A média dessa categoria é R$ {media_categoria:.2f}."
    notify_user(db, user_username, "ANOMALIA", titulo, msg, enviar_email=True)


# 4. Gestão de Casal: Nova Despesa Compartilhada
def notify_partner_new_shared_expense(
    db: Session,
    autor_username: str,
    partner_username: str,
    descricao: str,
    valor: float,
):
    titulo = "👥 Nova Despesa Compartilhada"
    msg = f"<b>{autor_username}</b> adicionou uma nova despesa dividida: <b>{descricao}</b> (R$ {abs(valor):.2f})."
    notify_user(
        db, partner_username, "CASAL_NOVA_DESPESA", titulo, msg, enviar_email=False
    )


# 5. Gestão de Casal: Acerto de Contas Quitado
def notify_partner_settlement_cleared(
    db: Session, autor_username: str, partner_username: str, valor_quitado: float
):
    titulo = "🤝 Acerto de Contas Quitado"
    msg = f"<b>{autor_username}</b> marcou o acerto de contas do casal como <b>QUITADO</b> no valor de R$ {abs(valor_quitado):.2f}."
    notify_user(db, partner_username, "CASAL_QUITACAO", titulo, msg, enviar_email=True)
