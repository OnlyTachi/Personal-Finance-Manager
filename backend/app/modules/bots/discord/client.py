# app/modules/bots/discord/client.py
import logging
import discord
from discord.ext import commands
from app.modules.bots.discord.commands.commands_finance import setup_finance_commands

logger = logging.getLogger(__name__)

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)


@bot.event
async def on_ready():
    setup_finance_commands(bot)
    await bot.tree.sync()
    logger.info(f"🤖 Bot do Discord conectado como: {bot.user}")


async def start_discord_bot_async(token: str):
    """Inicia o bot do Discord como uma task assíncrona nativa."""
    try:
        await bot.start(token)
    except Exception as e:
        logger.error(f"Erro ao iniciar Bot do Discord: {e}")
