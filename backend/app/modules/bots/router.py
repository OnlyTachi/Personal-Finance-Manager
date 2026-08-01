# app/modules/bots/router.py
from fastapi import APIRouter, Request, HTTPException
from telegram import Update
from app.modules.bots.telegram.client import ptb_application

router = APIRouter()


@router.post("/webhook/telegram")
async def telegram_webhook(request: Request):
    if not ptb_application:
        raise HTTPException(
            status_code=503, detail="Telegram Bot desativado no servidor."
        )

    req_json = await request.json()
    update = Update.de_json(req_json, ptb_application.bot)
    await ptb_application.process_update(update)
    return {"status": "ok"}
