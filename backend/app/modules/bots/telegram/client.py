# app/modules/bots/telegram/client.py
import logging
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    filters,
    ConversationHandler,
)
from app.core.config import settings
from .handlers import (
    start,
    handle_photo,
    router_handler,
    summary_command,
    handle_callback,
    cancel,
    ESPERANDO_ENTRADA,
)

logger = logging.getLogger(__name__)

ptb_application = None

# Só constrói a aplicação se o token estiver devidamente preenchido no .env
if settings.TELEGRAM_BOT_TOKEN:
    ptb_application = ApplicationBuilder().token(settings.TELEGRAM_BOT_TOKEN).build()

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            ESPERANDO_ENTRADA: [
                MessageHandler(filters.PHOTO, handle_photo),
                MessageHandler(filters.TEXT & (~filters.COMMAND), router_handler),
            ]
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    ptb_application.add_handler(conv_handler)
    ptb_application.add_handler(CommandHandler("resumo", summary_command))
    ptb_application.add_handler(CallbackQueryHandler(handle_callback))


async def start_telegram_bot():
    """Inicia o Bot do Telegram alternando dinamicamente entre Webhook e Async Polling."""
    if not ptb_application or not settings.TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN não configurado. Bot do Telegram inativo.")
        return

    await ptb_application.initialize()
    await ptb_application.start()

    webhook_domain = getattr(settings, "WEBHOOK_DOMAIN", None)

    if webhook_domain:
        webhook_url = f"{webhook_domain.rstrip('/')}/api/v1/bots/webhook/telegram"
        await ptb_application.bot.set_webhook(url=webhook_url)
        logger.info(f"🚀 Telegram Bot rodando via Webhook em: {webhook_url}")
    else:
        await ptb_application.bot.delete_webhook(drop_pending_updates=True)
        await ptb_application.updater.start_polling()
        logger.info("⚡ Telegram Bot rodando via Async Long Polling (Dev mode)...")


async def stop_telegram_bot():
    """Encerramento gracioso no shutdown do FastAPI."""
    if not ptb_application:
        return

    if ptb_application.updater and ptb_application.updater.running:
        await ptb_application.updater.stop()

    await ptb_application.stop()
    await ptb_application.shutdown()
    logger.info("🛑 Telegram Bot finalizado com sucesso.")
