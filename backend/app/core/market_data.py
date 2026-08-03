import requests
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class MarketDataCache:
    selic: float = 11.25
    cdi: float = 11.15
    ipca: float = 4.50
    last_updated: datetime = None


_cache = MarketDataCache()
CACHE_DURATION_HOURS = 24


def _fetch_bcb_series(code: int) -> float:
    """Busca o último valor de uma série temporal no SGS do Banco Central."""
    try:
        url = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados/ultimos/1?formato=json"
        response = requests.get(url, timeout=5.0)
        response.raise_for_status()
        data = response.json()
        if data and len(data) > 0:
            return float(data[0].get("valor", "0"))
    except Exception as e:
        logger.warning(f"Falha ao buscar série BCB {code}: {e}")
    return 0.0


def update_market_indices():
    """Força a atualização dos índices via BCB e atualiza o cache em memória."""
    logger.info("Atualizando índices econômicos via BCB API...")

    selic = _fetch_bcb_series(432)
    if selic > 0:
        _cache.selic = selic
        _cache.cdi = selic - 0.10 if selic > 0.10 else selic

    cdi_real = _fetch_bcb_series(4389)
    if cdi_real > 0:
        _cache.cdi = cdi_real

    ipca = _fetch_bcb_series(13522)
    if ipca > 0:
        _cache.ipca = ipca

    _cache.last_updated = datetime.now()
    logger.info(
        f"Índices atualizados: Selic={_cache.selic}%, CDI={_cache.cdi}%, IPCA={_cache.ipca}%"
    )


def get_market_indices() -> dict:
    """Retorna o dicionário com todos os indicadores (usado pelas calculadoras/frontend)."""
    if _cache.last_updated is None:
        update_market_indices()
    else:
        age = datetime.now() - _cache.last_updated
        if age > timedelta(hours=CACHE_DURATION_HOURS):
            update_market_indices()

    return {
        "selic": _cache.selic,
        "cdi": _cache.cdi,
        "ipca": _cache.ipca,
        "last_updated": (
            _cache.last_updated.isoformat() if _cache.last_updated else None
        ),
    }


def get_current_cdi() -> float:
    """Retorna apenas a taxa CDI atualizada (rápido para loop de processamento do backend)."""
    if _cache.last_updated is None:
        update_market_indices()
    else:
        age = datetime.now() - _cache.last_updated
        if age > timedelta(hours=CACHE_DURATION_HOURS):
            update_market_indices()

    return _cache.cdi
