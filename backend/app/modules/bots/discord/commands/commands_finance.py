import discord
from discord import app_commands
from discord.ext import commands
from app.db.session import SessionLocal
from app.modules.cashflow import service as cashflow_service
from app.modules.cashflow import schemas as cashflow_schemas
from app.modules.bots.discord import service as discord_bot_service
from app.modules.bots.discord.embed_builder import (
    build_expense_embed,
    ExpenseActionView,
)
from datetime import datetime
from app.modules.investments import service as inv_service
from app.modules.auth.models import User
from app.modules.couple import service as couple_service


def setup_finance_commands(bot: commands.Bot):

    @bot.tree.command(
        name="vincular", description="Vincular sua conta com o código do painel web"
    )
    async def vincular_command(interaction: discord.Interaction, codigo: str):
        db = SessionLocal()
        try:
            success = discord_bot_service.verify_and_link_discord(
                db,
                codigo,
                str(interaction.user.id),
                f"{interaction.user.name}'s Discord",
            )
            if success:
                await interaction.response.send_message(
                    "✅ **Conta vinculada com sucesso!** Já pode registrar lançamentos.",
                    ephemeral=True,
                )
            else:
                await interaction.response.send_message(
                    "⚠️ Código inválido ou expirado.", ephemeral=True
                )
        finally:
            db.close()

    @bot.tree.command(name="gasto", description="Registra um novo gasto no sistema")
    @app_commands.describe(
        valor="Valor gasto (ex: 15.90)",
        descricao="Descrição",
        compartilhado="Dividir com casal?",
    )
    async def gasto_command(
        interaction: discord.Interaction,
        valor: float,
        descricao: str,
        compartilhado: bool = False,
    ):
        db = SessionLocal()
        try:
            username = discord_bot_service.get_user_by_discord_id(
                db, str(interaction.user.id)
            )
            if not username:
                await interaction.response.send_message(
                    "⚠️ Conta não vinculada! Use `/vincular SEU_CODIGO` primeiro.",
                    ephemeral=True,
                )
                return

            mov_in = cashflow_schemas.MovimentacaoCreate(
                descricao=descricao,
                valor=-abs(valor),
                categoria="Outros",
                origem="DISCORD",
                shared=compartilhado,
            )
            mov = cashflow_service.create_movimentacao(db, mov_in, username)

            embed = build_expense_embed(
                mov.descricao, mov.valor, mov.categoria, mov.shared
            )
            view = ExpenseActionView(mov.id)
            await interaction.response.send_message(embed=embed, view=view)
        finally:
            db.close()

    @bot.tree.command(
        name="resumo", description="Exibe o resumo financeiro do mês atual"
    )
    async def resumo_command(interaction: discord.Interaction):
        db = SessionLocal()
        try:
            username = discord_bot_service.get_user_by_discord_id(
                db, str(interaction.user.id)
            )
            if not username:
                await interaction.response.send_message(
                    "⚠️ Conta não vinculada!", ephemeral=True
                )
                return

            now = datetime.now()
            stats = cashflow_service.get_monthly_summary(
                db, username, now.month, now.year
            )

            embed = discord.Embed(
                title=f"📊 Resumo Financeiro - {now.strftime('%m/%Y')}",
                color=discord.Color.blue(),
            )
            embed.add_field(
                name="Entradas", value=f"R$ {stats['entradas']:.2f}", inline=True
            )
            embed.add_field(
                name="Saídas", value=f"R$ {abs(stats['saidas']):.2f}", inline=True
            )
            embed.add_field(
                name="Saldo", value=f"R$ {stats['saldo']:.2f}", inline=False
            )

            await interaction.response.send_message(embed=embed)
        finally:
            db.close()

    @bot.tree.command(name="meta", description="Consulta o progresso das suas metas")
    async def meta_command(interaction: discord.Interaction):
        db = SessionLocal()
        try:
            username = discord_bot_service.get_user_by_discord_id(
                db, str(interaction.user.id)
            )
            if not username:
                await interaction.response.send_message(
                    "⚠️ Conta não vinculada!", ephemeral=True
                )
                return

            goals = couple_service.get_couple_goals(db, username)
            if not goals:
                await interaction.response.send_message(
                    "🎯 Nenhuma meta cadastrada no momento.", ephemeral=True
                )
                return

            embed = discord.Embed(
                title="🎯 Progresso das Metas", color=discord.Color.gold()
            )
            for g in goals:
                pct = (g.valor_atual / g.valor_alvo * 100) if g.valor_alvo > 0 else 0
                embed.add_field(
                    name=g.nome,
                    value=f"R$ {g.valor_atual:.2f} / R$ {g.valor_alvo:.2f} ({pct:.1f}%)",
                    inline=False,
                )

            await interaction.response.send_message(embed=embed)
        finally:
            db.close()

    @bot.tree.command(
        name="casal", description="Verifica o acerto de contas com o parceiro"
    )
    async def casal_command(interaction: discord.Interaction):
        db = SessionLocal()
        try:
            username = discord_bot_service.get_user_by_discord_id(
                db, str(interaction.user.id)
            )
            if not username:
                await interaction.response.send_message(
                    "⚠️ Conta não vinculada!", ephemeral=True
                )
                return

            user = db.query(User).filter(User.username == username).first()
            if not user or not user.partner_id:
                await interaction.response.send_message(
                    "👥 Você não possui um parceiro vinculado.", ephemeral=True
                )
                return
            dashboard = couple_service.get_couple_dashboard_data(
                db, username, user.partner_id
            )
            val = dashboard["settlement"]["value"]

            embed = discord.Embed(
                title="👥 Acerto de Contas do Casal", color=discord.Color.purple()
            )
            if val > 0:
                msg = f"**{user.partner_id}** te deve **R$ {abs(val):.2f}**"
            elif val < 0:
                msg = f"Você deve **R$ {abs(val):.2f}** para **{user.partner_id}**"
            else:
                msg = "Contas rigorosamente equilibradas!"

            embed.description = msg
            await interaction.response.send_message(embed=embed)
        finally:
            db.close()
