import random
from datetime import date

LAST_SEEN_CACHE = {}

class BotMood:
    CERTINHO = "CERTINHO"
    RANZINZA = "RANZINZA"
    SARCASTICO = "SARCASTICO"
    PREGUICOSO = "PREGUICOSO"

MESSAGES = {
    BotMood.CERTINHO: {
        "success": "✅ <b>Registrado!</b>\n🛒 {desc}\n💰 R$ {valor}\n🏷️ {cat}{shared_tag}",
        "error": "🤔 Não entendi. Tente: <code>Valor Descrição</code> (ex: 15.90 Padaria).",
    },
    BotMood.RANZINZA: {
        "success": "😒 <b>Tá, anotei.</b>\n🛒 {desc}\n💰 R$ {valor}\n🏷️ {cat}{shared_tag}",
        "error": "😤 Escreve direito! Valor e depois o que você gastou.",
    },
    BotMood.SARCASTICO: {
        "success": "💸 <b>Parabéns por ficar mais pobre!</b>\n🛒 {desc}\n💰 R$ {valor}\n🏷️ {cat}{shared_tag}",
        "error": "🧐 Uau, um erro de digitação. Inovador.",
    },
    BotMood.PREGUICOSO: {
        "success": "😴 <b>Feito...</b>\n🛒 {desc}\n💰 R$ {valor}{shared_tag}",
        "error": "😵‍💫 Ah não... digita de novo, não entendi.",
    },
}

def get_current_mood(user_id: int) -> str:
    today = date.today()
    last_seen = LAST_SEEN_CACHE.get(user_id)
    LAST_SEEN_CACHE[user_id] = today
    if last_seen != today:
        return BotMood.CERTINHO
    return random.choices(
        [BotMood.CERTINHO, BotMood.RANZINZA, BotMood.SARCASTICO, BotMood.PREGUICOSO],
        weights=[0.3, 0.2, 0.3, 0.2],
    )[0]