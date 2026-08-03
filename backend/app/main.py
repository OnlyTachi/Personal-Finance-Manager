import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core import market_data
from app.core.config import settings
from app.core.templating import render_template
from app.db.session import Base, SessionLocal, engine

# Importações para o Scheduler
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

# Importando Rotas
from app.modules.auth import admin_routes
from app.modules.auth import routes as auth_routes
from app.modules.bots import router as bots_router
from app.modules.bots.discord.client import bot as discord_bot
from app.modules.bots.discord.client import start_discord_bot_async
from app.modules.bots.telegram.client import start_telegram_bot, stop_telegram_bot
from app.modules.calculator import routes as calculator_routes
from app.modules.cashflow import routes as cashflow_routes
from app.modules.couple import routes as couple_routes
from app.modules.email import routes as email_automation_routes
from app.modules.gamification import routes as gamification_routes
from app.modules.history import routes as history_routes
from app.modules.investments import routes as investment_routes
from app.modules.notifications import routes as notifications_routes
from app.modules.reports import routes as reports_routes
from app.modules.data_pipeline import routes as pipeline_routes

# Importando Services / Models
from app.modules.auth import models as auth_models
from app.modules.history import service as history_service
from app.modules.investments import service as inv_service
import app.modules.reports.mailer as reports_mailer
import app.modules.reports.models as reports_models
import app.modules.reports.service as reports_service
from app.modules.reports.services import webhook_service

# Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# --- Funções de Agendamento ---
def scheduled_market_update():
    logger.info("⏳ Iniciando atualização agendada de mercado...")
    inv_service.update_cdi_rate_variable()
    db = SessionLocal()
    try:
        inv_service.refresh_all_assets_prices(db)
        users = db.query(auth_models.User).all()
        for user in users:
            history_service.rebuild_user_history(db, user.username)
        logger.info("✅ Atualização agendada concluída com sucesso.")
    except Exception as e:
        logger.error(f"❌ Erro na atualização agendada: {e}")
    finally:
        db.close()


def check_and_send_scheduled_reports():
    """Roda periodicamente (a cada minuto) e dispara e-mails/webhooks nos horários configurados."""
    db = SessionLocal()
    try:
        now = datetime.now()
        current_time_str = now.strftime("%H:%M")
        current_weekday = now.weekday()
        current_monthday = now.day

        # --- DISPARO DO CHECK-UP DIÁRIO ---
        daily_users = (
            db.query(reports_models.ReportPreference)
            .filter(
                reports_models.ReportPreference.daily_enabled == True,
                reports_models.ReportPreference.daily_time == current_time_str,
                reports_models.ReportPreference.contact_email.isnot(None),
            )
            .all()
        )
        for pref in daily_users:
            data = reports_service.get_daily_checkup_data(db, pref.owner_id)

            # Envio E-mail Diário
            html_diario = render_template("reports/daily_report.html", {"data": data})
            reports_mailer.send_email_html(
                to_email=pref.contact_email,
                subject=f"Check-up Diário: Resumo de {data['data_referencia']}",
                html_content=html_diario,
            )

            # Envio via Webhook do Discord
            if pref.discord_webhook_url:
                fields = [
                    {
                        "name": "Saídas Ontem",
                        "value": f"R$ {data['total_saidas_ontem']:.2f}",
                        "inline": True,
                    },
                    {
                        "name": "Entradas Ontem",
                        "value": f"R$ {data['total_entradas_ontem']:.2f}",
                        "inline": True,
                    },
                ]
                webhook_service.send_discord_webhook(
                    webhook_url=pref.discord_webhook_url,
                    title=f"Check-up Diário ({data['data_referencia']})",
                    description="Resumo rápido dos lançamentos de ontem.",
                    fields=fields,
                    color_type="INFO",
                )

        # --- DISPARO DO RELATÓRIO SEMANAL ---
        weekly_users = (
            db.query(reports_models.ReportPreference)
            .filter(
                reports_models.ReportPreference.weekly_enabled == True,
                reports_models.ReportPreference.weekly_day == current_weekday,
                reports_models.ReportPreference.weekly_time == current_time_str,
                reports_models.ReportPreference.contact_email.isnot(None),
            )
            .all()
        )
        for pref in weekly_users:
            data = reports_service.get_weekly_report_data(db, pref.owner_id)
            html = render_template("reports/weekly_report.html", {"data": data})
            reports_mailer.send_email_html(
                to_email=pref.contact_email,
                subject=f"Relatório Semanal: Correção de Rota ({data['periodo_texto']})",
                html_content=html,
            )

        # --- DISPARO DO RELATÓRIO MENSAL ---
        monthly_users = (
            db.query(reports_models.ReportPreference)
            .filter(
                reports_models.ReportPreference.monthly_enabled == True,
                reports_models.ReportPreference.monthly_day == current_monthday,
                reports_models.ReportPreference.monthly_time == current_time_str,
                reports_models.ReportPreference.contact_email.isnot(None),
            )
            .all()
        )
        for pref in monthly_users:
            data = reports_service.get_monthly_report_data(db, pref.owner_id)
            html = render_template("reports/monthly_report.html", {"data": data})
            reports_mailer.send_email_html(
                to_email=pref.contact_email,
                subject=f"Relatório Mensal de Fechamento ({data['periodo']})",
                html_content=html,
            )

    except Exception as e:
        logger.error(f"Erro no agendador de relatórios: {e}")
    finally:
        db.close()


async def async_check_reports_job():
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, check_and_send_scheduled_reports)


# --- Inicialização ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        market_data.update_market_indices, CronTrigger(hour="9,18", minute="0")
    )
    scheduler.add_job(async_check_reports_job, CronTrigger(minute="*"))
    scheduler.start()
    logger.info("Scheduler iniciado com sucesso.")

    # Telegram
    await start_telegram_bot()

    # Discord
    discord_task = None
    if settings.DISCORD_BOT_TOKEN:
        discord_task = asyncio.create_task(
            start_discord_bot_async(settings.DISCORD_BOT_TOKEN)
        )
        logger.info("Task assíncrona do Discord iniciada.")

    yield

    scheduler.shutdown()

    await stop_telegram_bot()

    if settings.DISCORD_BOT_TOKEN and discord_task:
        await discord_bot.close()
        discord_task.cancel()


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Investimento API está online! 🚀"}


# Registro de Routers
app.include_router(auth_routes.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(admin_routes.router, prefix="/api/v1/admin", tags=["Admin"])
app.include_router(
    investment_routes.router, prefix="/api/v1/investments", tags=["Investments"]
)
app.include_router(
    calculator_routes.router, prefix="/api/v1/calculator", tags=["Calculadoras"]
)
app.include_router(history_routes.router, prefix="/api/v1/history", tags=["History"])
app.include_router(cashflow_routes.router, prefix="/api/v1/cashflow", tags=["Cashflow"])
app.include_router(
    gamification_routes.router, prefix="/api/v1/gamification", tags=["Gamification"]
)
app.include_router(
    email_automation_routes.router,
    prefix="/api/v1/email-automation",
    tags=["Email Automation"],
)
app.include_router(reports_routes.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(
    notifications_routes.router,
    prefix="/api/v1/notifications",
    tags=["Notifications"],
)
app.include_router(couple_routes.router, prefix="/api/v1/couple", tags=["Couple"])
app.include_router(bots_router.router, prefix="/api/v1/bots", tags=["Bots"])
app.include_router(
    pipeline_routes.router, prefix="/api/v1/pipeline", tags=["Data Pipeline"]
)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
