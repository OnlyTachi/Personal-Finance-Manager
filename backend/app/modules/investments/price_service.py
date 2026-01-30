import yfinance as yf
import requests
import logging

logger = logging.getLogger(__name__)


def get_crypto_price(ticker: str) -> float:
    """
    Busca preço de cripto na CoinGecko.
    O ticker deve ser o ID da CoinGecko (ex: 'bitcoin', 'ethereum').
    """
    try:
        # CoinGecko usa IDs em minúsculo (ex: bitcoin)
        clean_id = ticker.lower().strip()
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={clean_id}&vs_currencies=brl"
        response = requests.get(url, timeout=10)
        data = response.json()

        if clean_id in data:
            return float(data[clean_id]["brl"])
        else:
            logger.warning(f"Cripto '{ticker}' não encontrada na CoinGecko.")
            return 0.0
    except Exception as e:
        logger.error(f"Erro ao buscar cripto {ticker}: {e}")
        return 0.0


def get_stock_price(ticker: str) -> float:
    """
    Busca preço de ações/FIIs no Yahoo Finance.
    Para B3, o ticker deve ter .SA (ex: PETR4.SA).
    """
    try:
        clean_ticker = ticker.upper().strip()
        if not clean_ticker.endswith(".SA") and len(clean_ticker) <= 6:
            # Tenta adicionar .SA se o usuário esqueceu (assumindo B3)
            clean_ticker += ".SA"

        stock = yf.Ticker(clean_ticker)
        # Tenta pegar o preço mais recente (fast access)
        history = stock.history(period="1d")

        if not history.empty:
            return float(history["Close"].iloc[-1])
        else:
            logger.warning(f"Ticker '{ticker}' sem dados no Yahoo Finance.")
            return 0.0
    except Exception as e:
        logger.error(f"Erro ao buscar ação {ticker}: {e}")
        return 0.0


def get_price(ticker: str, tipo_indexador: str) -> float:
    """Roteador que decide qual API usar baseado no tipo."""
    if not ticker:
        return 0.0

    if tipo_indexador == "CRYPTO":
        return get_crypto_price(ticker)
    elif tipo_indexador == "B3" or tipo_indexador == "USA":  # USA usa yfinance tbm
        return get_stock_price(ticker)

    return 0.0
