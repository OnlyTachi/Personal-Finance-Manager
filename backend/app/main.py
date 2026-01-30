# Importações FastAPI e Middleware
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine, Base, SessionLocal
from app.core.config import settings
from contextlib import asynccontextmanager
import logging
import asyncio
import threading

# Importações para o Scheduler
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

# Importando Rotas
from app.modules.investments import routes as investment_routes
from app.modules.auth import routes as auth_routes
from app.modules.auth import admin_routes
from app.modules.calculator import routes as calculator_routes
from app.modules.history import routes as history_routes
from app.modules.cashflow import routes as cashflow_routes
from app.modules.gamification import routes as gamification_routes

# Importando Services para o Job
from app.modules.investments import service as inv_service
from app.modules.auth import models as auth_models
from app.modules.history import service as history_service

# Importando Bot
from app.modules.bots.telegram.client import run_telegram_bot

# Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Importando Models
from app.modules.investments import models as inv_models
from app.modules.auth import models as auth_models
from app.modules.history import models as history_models
from app.modules.cashflow import models as cashflow_models
from app.modules.gamification import models as gamification_models

Base.metadata.create_all(bind=engine)


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


# --- LIFESPAN (Inicialização) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Inicia Scheduler
    scheduler = AsyncIOScheduler()
    scheduler.add_job(scheduled_market_update, CronTrigger(hour="9,18", minute="0"))
    scheduler.start()
    logger.info("🚀 Scheduler de Investimentos iniciado.")

    # 2. Inicia Telegram Bot (em Thread separada para não bloquear o FastAPI)
    if settings.TELEGRAM_BOT_TOKEN:
        bot_thread = threading.Thread(
            target=run_telegram_bot, args=(settings.TELEGRAM_BOT_TOKEN,)
        )
        bot_thread.daemon = True
        bot_thread.start()
    else:
        logger.warning("⚠️ TELEGRAM_BOT_TOKEN não definido. Chatbot desativado.")

    yield

    scheduler.shutdown()


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

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
