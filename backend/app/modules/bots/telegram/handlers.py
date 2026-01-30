import logging
import re
from datetime import datetime, timedelta
from contextlib import contextmanager

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.constants import ParseMode
from telegram.ext import ContextTypes, ConversationHandler

from app.db.session import SessionLocal
from app.modules.cashflow import models, schemas
from app.modules.cashflow import service as cashflow_service
from app.modules.cashflow.categorizer import predict_category
from app.modules.cashflow.ai_service import analyze_receipt_gemini, interpret_chat_intent
from app.modules.auth.models import TelegramDevice
from app.modules.auth import service as auth_service
from app.modules.gamification import service as gamification_service
from .persona import MESSAGES, get_current_mood

logger = logging.getLogger(__name__)
logging.getLogger("httpx").setLevel(logging.WARNING)
REGEX_GASTO = r"^(?:R\$)?\s*([+-]?\d+[.,]?\d*)\s+(.+)$"
ESPERANDO_ENTRADA = 1

@contextmanager
def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    args = context.args

    with get_db_session() as db:
        if args and len(args) > 0:
            link_code = args[0]
            success = auth_service.verify_and_link_telegram(
                db,
                link_code,
                str(user_id),
                f"{update.effective_user.first_name}'s Telegram",
            )
            if success:
                await update.message.reply_text(
                    "✅ <b>Conta vinculada!</b> Agora pode registrar gastos.",
                    parse_mode=ParseMode.HTML,
                )
                return ESPERANDO_ENTRADA
            else:
                await update.message.reply_text("❌ Código inválido.")
                return ConversationHandler.END

        device = db.query(TelegramDevice).filter(TelegramDevice.telegram_id == str(user_id)).first()
        if not device:
            await update.message.reply_text(
                "🚫 Não autorizado. Gere o código no painel web e use <code>/start CODIGO</code>.",
                parse_mode=ParseMode.HTML,
            )
            return ConversationHandler.END

        user_username = device.user_id

    msg = f"👋 <b>Olá, {user_username}!</b>\n\nEu entendo comandos como:\n• <code>15 almoço</code> (Registra gasto)\n• <code>Quanto gastei em jogos?</code> (Chat IA) 🤖\n• <b>Envie uma FOTO</b> de nota fiscal! 📸"
    await update.message.reply_text(msg, parse_mode=ParseMode.HTML)
    return ESPERANDO_ENTRADA

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    await update.message.reply_text("👀 Analisando comprovante...")

    try:
        photo_file = await update.message.photo[-1].get_file()
        image_bytes = await photo_file.download_as_bytearray()

        result = analyze_receipt_gemini(image_bytes)

        if not result:
            await update.message.reply_text("❌ Não consegui ler os dados dessa imagem. Tente enviar o texto manualmente.")
            return ESPERANDO_ENTRADA

        descricao = result.get("descricao", "Compra desconhecida")
        valor = float(result.get("valor", 0.0))
        categoria = result.get("categoria", "Outros")
        
        if valor > 0:
            valor = -valor

        with get_db_session() as db:
            device = db.query(TelegramDevice).filter(TelegramDevice.telegram_id == str(user_id)).first()
            if not device:
                return ConversationHandler.END
            
            new_mov_in = schemas.MovimentacaoCreate(
                descricao=descricao,
                valor=valor,
                data=datetime.now(),
                categoria=categoria,
                origem="TELEGRAM_OCR",
                conciliado=False
            )
            
            mov = cashflow_service.create_movimentacao(db, new_mov_in, device.user_id)
            
            msg_text = f"✨ <b>Leitura com IA Sucesso!</b>\n\n🛒 {descricao}\n💰 R$ {abs(valor):.2f}\n🏷️ {categoria}"
            
            keyboard = [
                [
                    InlineKeyboardButton("🗑️ Errado / Desfazer", callback_data=f"del_{mov.id}"),
                    InlineKeyboardButton("📂 Mudar Categoria", callback_data=f"chgcat_{mov.id}"),
                ]
            ]
            
            await update.message.reply_text(msg_text, parse_mode=ParseMode.HTML, reply_markup=InlineKeyboardMarkup(keyboard))

    except Exception as e:
        logger.error(f"Erro no handler de foto: {e}")
        await update.message.reply_text("💥 Erro ao processar imagem.")

    return ESPERANDO_ENTRADA

async def router_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = update.message.text.strip()
    if re.match(r'^(?:R\$)?\s*[+-]?\d', text):
        await handle_expense(update, context)
    else:
        await handle_chat_query(update, context)
    return ESPERANDO_ENTRADA

async def handle_expense(update: Update, context: ContextTypes.DEFAULT_TYPE):
    raw_text = update.message.text
    user_id = update.effective_user.id

    text_lower = raw_text.lower()
    data_lancamento = datetime.now()
    clean_text = raw_text

    if text_lower.startswith("ontem"):
        data_lancamento = data_lancamento - timedelta(days=1)
        clean_text = raw_text[5:].strip()

    is_shared = False
    if "/c" in clean_text or "/casal" in clean_text.lower():
        is_shared = True
        clean_text = re.sub(r"(/c|/casal)\b", "", clean_text, flags=re.IGNORECASE).strip()

    forced_category = None
    cat_match = re.search(r"#(\w+)", clean_text)
    if cat_match:
        forced_category = cat_match.group(1)
        clean_text = clean_text.replace(cat_match.group(0), "").strip()

    match = re.match(REGEX_GASTO, clean_text)

    if not match:
        mood = get_current_mood(user_id)
        await update.message.reply_text(MESSAGES[mood]["error"], parse_mode=ParseMode.HTML)
        return ESPERANDO_ENTRADA

    valor_str = match.group(1).replace(",", ".")
    descricao = match.group(2).strip()
    valor = float(valor_str)

    if "+" not in raw_text and valor > 0:
        valor = -valor

    with get_db_session() as db:
        device = db.query(TelegramDevice).filter(TelegramDevice.telegram_id == str(user_id)).first()
        if not device:
            await update.message.reply_text("🚫 Sessão expirada.")
            return ConversationHandler.END

        user_username = device.user_id
        categoria = forced_category if forced_category else predict_category(descricao)

        new_mov_in = schemas.MovimentacaoCreate(
            descricao=descricao,
            valor=valor,
            data=data_lancamento,
            categoria=categoria,
            origem="TELEGRAM",
            shared=is_shared,
            conciliado=False,
        )
        mov = cashflow_service.create_movimentacao(db, new_mov_in, user_username)
        earned_badges = gamification_service.check_and_award_badges(db, user_username)

        mood = get_current_mood(user_id)
        shared_tag = " (💞 Compartilhado)" if is_shared else ""

        msg_text = MESSAGES[mood]["success"].format(
            desc=descricao,
            valor=f"{abs(valor):.2f}",
            cat=categoria,
            shared_tag=shared_tag,
        )

        if earned_badges:
            msg_text += f"\n\n🏆 <b>Nova Conquista:</b> {earned_badges[0]}!"

        keyboard = [
            [
                InlineKeyboardButton("🗑️ Desfazer", callback_data=f"del_{mov.id}"),
                InlineKeyboardButton("📂 Categoria", callback_data=f"chgcat_{mov.id}"),
            ],
            [
                InlineKeyboardButton(
                    "💔 Desmarcar Casal" if is_shared else "❤️ Dividir c/ Casal",
                    callback_data=f"toggle_shared_{mov.id}",
                )
            ],
        ]

        await update.message.reply_text(msg_text, parse_mode=ParseMode.HTML, reply_markup=InlineKeyboardMarkup(keyboard))

    return ESPERANDO_ENTRADA

async def handle_chat_query(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    query_text = update.message.text
    
    await update.message.reply_chat_action("typing")
    
    with get_db_session() as db:
        device = db.query(TelegramDevice).filter(TelegramDevice.telegram_id == str(user_id)).first()
        if not device: return

        ai_filters = interpret_chat_intent(query_text)
        results = cashflow_service.search_smart_transactions(db, device.user_id, ai_filters)
        
        valor_fmt = f"R$ {abs(results['total']):.2f}"
        periodo_map = {
            "current_month": "Neste mês", 
            "last_month": "Mês passado", 
            "today": "Hoje", 
            "all_time": "Todo o período"
        }
        periodo_texto = periodo_map.get(ai_filters.get('date_filter'), "no período")
        
        msg = f"🤖 <b>Análise Inteligente</b>\n"
        msg += f"🔎 <i>Busquei por: {', '.join(ai_filters['keywords'])} ({periodo_texto})</i>\n\n"
        
        if results['count'] == 0:
            msg += "🤷‍♂️ Não encontrei nenhum gasto com esses termos."
        else:
            msg += f"💰 <b>Total Gasto: {valor_fmt}</b>\n"
            msg += f"🧾 <b>{results['count']}</b> lançamentos encontrados.\n"
            
            if results['top_places']:
                msg += f"\n📍 <b>Principais locais:</b> {results['top_places']}..."
        
        await update.message.reply_text(msg, parse_mode=ParseMode.HTML)

async def summary_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    with get_db_session() as db:
        device = db.query(TelegramDevice).filter(TelegramDevice.telegram_id == str(update.effective_user.id)).first()
        if not device: return

        user_username = device.user_id
        now = datetime.now()
        stats = cashflow_service.get_monthly_summary(db, user_username, now.month, now.year)

    saldo_emoji = "🟢" if stats["saldo"] >= 0 else "🔴"
    msg = (
        f"📊 <b>Resumo de {now.strftime('%B/%Y')}</b>\n\n"
        f"💰 Entradas: R$ {stats['entradas']:.2f}\n"
        f"💸 Saídas: R$ {abs(stats['saidas']):.2f}\n"
        f"────────────────\n"
        f"{saldo_emoji} <b>Saldo: R$ {stats['saldo']:.2f}</b>"
    )

    keyboard = [[InlineKeyboardButton("🔄 Atualizar", callback_data="refresh_summary")]]
    await update.message.reply_text(msg, parse_mode=ParseMode.HTML, reply_markup=InlineKeyboardMarkup(keyboard))

async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data
    user_id = update.effective_user.id

    with get_db_session() as db:
        device = db.query(TelegramDevice).filter(TelegramDevice.telegram_id == str(user_id)).first()
        if not device: return

        if data.startswith("del_"):
            mov_id = data.split("_")[1]
            cashflow_service.delete_movimentacao(db, mov_id, device.user_id)
            await query.edit_message_text(f"🗑️ <b>Lançamento apagado.</b>", parse_mode=ParseMode.HTML)

        elif data.startswith("toggle_shared_"):
            mov_id = data.split("shared_")[1]
            mov = db.query(models.Movimentacao).filter(models.Movimentacao.id == mov_id).first()
            if mov:
                new_state = not mov.shared
                cashflow_service.update_movimentacao(db, mov_id, schemas.MovimentacaoUpdate(shared=new_state), device.user_id)
                new_keyboard = [
                    [InlineKeyboardButton("🗑️ Desfazer", callback_data=f"del_{mov.id}"), InlineKeyboardButton("📂 Categoria", callback_data=f"chgcat_{mov.id}")],
                    [InlineKeyboardButton("💔 Desmarcar Casal" if new_state else "❤️ Dividir c/ Casal", callback_data=f"toggle_shared_{mov.id}")],
                ]
                await query.edit_message_reply_markup(reply_markup=InlineKeyboardMarkup(new_keyboard))

        elif data.startswith("chgcat_"):
            mov_id = data.split("_")[1]
            cats = ["Alimentação", "Transporte", "Lazer", "Mercado", "Outros"]
            keyboard = []
            row = []
            for c in cats:
                row.append(InlineKeyboardButton(c, callback_data=f"setcat_{mov_id}_{c}"))
                if len(row) == 2:
                    keyboard.append(row)
                    row = []
            if row: keyboard.append(row)
            await query.edit_message_text("Selecione a nova categoria:", reply_markup=InlineKeyboardMarkup(keyboard))

        elif data.startswith("setcat_"):
            _, mov_id, new_cat = data.split("_")
            cashflow_service.update_movimentacao(db, mov_id, schemas.MovimentacaoUpdate(categoria=new_cat), device.user_id)
            await query.edit_message_text(f"✅ Categoria alterada para <b>{new_cat}</b>.", parse_mode=ParseMode.HTML)

        elif data == "refresh_summary":
            now = datetime.now()
            stats = cashflow_service.get_monthly_summary(db, device.user_id, now.month, now.year)
            saldo_emoji = "🟢" if stats["saldo"] >= 0 else "🔴"
            msg = (
                f"📊 <b>Resumo de {now.strftime('%B/%Y')}</b>\n(Atualizado agora)\n\n"
                f"💰 Entradas: R$ {stats['entradas']:.2f}\n"
                f"💸 Saídas: R$ {abs(stats['saidas']):.2f}\n"
                f"────────────────\n"
                f"{saldo_emoji} <b>Saldo: R$ {stats['saldo']:.2f}</b>"
            )
            keyboard = [[InlineKeyboardButton("🔄 Atualizar", callback_data="refresh_summary")]]
            await query.edit_message_text(msg, parse_mode=ParseMode.HTML, reply_markup=InlineKeyboardMarkup(keyboard))

async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("🛑 Até mais.")
    return ConversationHandler.END