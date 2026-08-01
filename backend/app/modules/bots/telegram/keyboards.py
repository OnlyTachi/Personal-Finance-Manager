from telegram import InlineKeyboardButton, InlineKeyboardMarkup


def build_expense_keyboard(mov_id: str, is_shared: bool) -> InlineKeyboardMarkup:
    """Cria o teclado inline padrão logo após o registro de uma despesa no Telegram."""
    keyboard = [
        [
            InlineKeyboardButton("❌ Desfazer", callback_data=f"del_{mov_id}"),
            InlineKeyboardButton("🏷️ Categoria", callback_data=f"chgcat_{mov_id}"),
        ],
        [
            InlineKeyboardButton(
                "💔 Desmarcar Casal" if is_shared else "💑 Dividir c/ Casal",
                callback_data=f"toggle_shared_{mov_id}",
            )
        ],
    ]
    return InlineKeyboardMarkup(keyboard)


def build_category_selection_keyboard(mov_id: str) -> InlineKeyboardMarkup:
    """Cria um teclado com opções rápidas de categorias principais."""
    cats = ["Alimentação", "Transporte", "Lazer", "Mercado", "Outros"]
    keyboard = []
    row = []

    for c in cats:
        row.append(InlineKeyboardButton(c, callback_data=f"setcat_{mov_id}_{c}"))
        if len(row) == 2:
            keyboard.append(row)
            row = []

    if row:
        keyboard.append(row)

    return InlineKeyboardMarkup(keyboard)
