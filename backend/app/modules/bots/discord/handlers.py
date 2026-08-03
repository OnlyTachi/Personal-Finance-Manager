import discord
from app.db.session import SessionLocal
from app.modules.cashflow import service as cashflow_service
from app.modules.cashflow import schemas as cashflow_schemas
from app.modules.cashflow.categorizer import predict_category
from app.modules.bots.discord import service as discord_service


class CategorySelectView(discord.ui.View):
    def __init__(self, mov_id: str):
        super().__init__(timeout=60)
        self.mov_id = mov_id

    @discord.ui.select(
        placeholder="Selecione uma nova categoria...",
        options=[
            discord.SelectOption(label="Alimentação", value="Alimentação", emoji="🍔"),
            discord.SelectOption(label="Transporte", value="Transporte", emoji="🚗"),
            discord.SelectOption(
                label="Lazer & Assinaturas", value="Lazer & Assinaturas", emoji="🎮"
            ),
            discord.SelectOption(label="Compras", value="Compras", emoji="🛍️"),
            discord.SelectOption(label="Outros", value="Outros", emoji="📦"),
        ],
    )
    async def select_callback(
        self, interaction: discord.Interaction, select: discord.ui.Select
    ):
        db = SessionLocal()
        try:
            username = discord_service.get_user_by_discord_id(
                db, str(interaction.user.id)
            )
            if username:
                cashflow_service.update_movimentacao(
                    db,
                    self.mov_id,
                    cashflow_schemas.MovimentacaoUpdate(categoria=select.values[0]),
                    username,
                )
                await interaction.response.edit_message(
                    content=f"✅ Categoria alterada para **{select.values[0]}**!",
                    embed=None,
                    view=None,
                )
        finally:
            db.close()


async def handle_text_message(message: discord.Message):
    """Permite registrar gastos digitando texto simples como '15.90 Almoço'."""
    if message.author.bot or not message.guild is None:  # Apenas DMs privadas
        return

    db = SessionLocal()
    try:
        username = discord_service.get_user_by_discord_id(db, str(message.author.id))
        if not username:
            return

        text = message.content.strip()
        import re

        match = re.match(r"^(?:R\$)?\s*([+-]?\d+[.,]?\d*)\s+(.+)$", text)
        if match:
            valor = float(match.group(1).replace(",", "."))
            descricao = match.group(2).strip()
            cat = predict_category(descricao)

            mov_in = cashflow_schemas.MovimentacaoCreate(
                descricao=descricao, valor=-abs(valor), categoria=cat, origem="DISCORD"
            )
            mov = cashflow_service.create_movimentacao(db, mov_in, username)

            embed = discord.Embed(
                title="💸 Registrado com sucesso!", color=discord.Color.green()
            )
            embed.add_field(name="Descrição", value=descricao)
            embed.add_field(name="Valor", value=f"R$ {abs(valor):.2f}")
            embed.add_field(name="Categoria", value=cat)

            await message.channel.send(embed=embed)
    finally:
        db.close()
