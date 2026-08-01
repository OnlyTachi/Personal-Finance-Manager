import discord


def build_expense_embed(
    descricao: str, valor: float, categoria: str, shared: bool
) -> discord.Embed:
    embed = discord.Embed(
        title="💸 Lançamento Registrado!", color=discord.Color.brand_green()
    )
    embed.add_field(name="Descrição", value=descricao, inline=True)
    embed.add_field(name="Valor", value=f"R$ {abs(valor):.2f}", inline=True)
    embed.add_field(name="Categoria", value=categoria, inline=False)
    if shared:
        embed.set_footer(text="👥 Despesa compartilhada com o casal")
    return embed


class ExpenseActionView(discord.ui.View):
    def __init__(self, mov_id: str):
        super().__init__(timeout=None)
        self.mov_id = mov_id

    @discord.ui.button(
        label="Desfazer", style=discord.ButtonStyle.danger, custom_id="undo_expense"
    )
    async def undo_callback(
        self, interaction: discord.Interaction, button: discord.ui.Button
    ):
        await interaction.response.send_message(
            "❌ Lançamento desfeito com sucesso!", ephemeral=True
        )
