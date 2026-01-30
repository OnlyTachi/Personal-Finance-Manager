import requests
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# Cache simples em memória para evitar spam na API do Banco Central
_CACHE = {"data": None, "timestamp": None}
CACHE_DURATION_HOURS = 24


def get_market_indices():
    """
    Busca os principais indicadores econômicos (Selic, CDI, IPCA)
    utilizando as APIs públicas do Banco Central do Brasil (SGS).
    Baseado no conceito do Notebook 10 do curso Python para Investimentos.
    """
    global _CACHE

    # Verifica cache
    if _CACHE["data"] and _CACHE["timestamp"]:
        age = datetime.now() - _CACHE["timestamp"]
        if age < timedelta(hours=CACHE_DURATION_HOURS):
            return _CACHE["data"]

    indices = {
        "selic": 0.0,
        "cdi": 0.0,
        "ipca": 0.0,
        "last_updated": datetime.now().isoformat(),
    }

    try:
        # 1. Busca Meta Selic (Série 432)
        # Fonte: https://api.bcb.gov.br/
        selic = _fetch_bcb_series(432)
        if selic:
            indices["selic"] = selic
            # Assumindo CDI como muito próximo da Selic (fallback se não achar série específica)
            indices["cdi"] = selic - 0.10 if selic > 0.10 else selic

        # 2. Busca CDI Anualizado (Série 4389 - Taxa de juros - CDI anualizada base 252)
        cdi_real = _fetch_bcb_series(4389)
        if cdi_real:
            indices["cdi"] = cdi_real

        # 3. Busca IPCA acumulado 12 meses (Série 13522)
        ipca = _fetch_bcb_series(13522)
        if ipca:
            indices["ipca"] = ipca

        # Atualiza Cache se obteve sucesso em pelo menos um
        if indices["selic"] > 0:
            _CACHE["data"] = indices
            _CACHE["timestamp"] = datetime.now()
            logger.info("Índices econômicos atualizados via BCB API.")

        return indices

    except Exception as e:
        logger.error(f"Erro geral ao buscar índices: {e}")
        # Retorna valores zerados ou do último cache vencido em caso de erro crítico
        return _CACHE["data"] if _CACHE["data"] else indices


def _fetch_bcb_series(code: int) -> float:
    """
    Função auxiliar para consultar endpoint JSON do SGS/BCB.
    Retorna o último valor disponível da série.
    """
    try:
        url = f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados/ultimos/1?formato=json"
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()

        if data and len(data) > 0:
            valor = data[0].get("valor", "0")
            return float(valor)
    except Exception as e:
        logger.warning(f"Falha ao buscar série BCB {code}: {e}")
        return 0.0
