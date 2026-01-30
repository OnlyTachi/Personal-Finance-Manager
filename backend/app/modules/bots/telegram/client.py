import asyncio
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    filters,
    ConversationHandler,
)
from .handlers import (
    start,
    handle_photo,
    router_handler,
    summary_command,
    handle_callback,
    cancel,
    ESPERANDO_ENTRADA
)

def run_telegram_bot(token: str):
    if not token: return
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    application = ApplicationBuilder().token(token).build()

    conv_handler = ConversationHandler(
        entry_points=[CommandHandler("start", start)],
        states={
            ESPERANDO_ENTRADA: [
                MessageHandler(filters.PHOTO, handle_photo),
                MessageHandler(filters.TEXT & (~filters.COMMAND), router_handler)
            ]
        },
        fallbacks=[CommandHandler("cancel", cancel)],
    )

    application.add_handler(conv_handler)
    application.add_handler(CommandHandler("resumo", summary_command))
    application.add_handler(CallbackQueryHandler(handle_callback))

    application.run_polling(stop_signals=[])