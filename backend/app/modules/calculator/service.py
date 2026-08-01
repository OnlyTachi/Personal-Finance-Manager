from typing import List
from sqlalchemy.orm import Session
from app.modules.investments import models
import requests
import logging
from datetime import datetime, timedelta
from .schemas import (
    ResultadoSimulacao,
    DadosMes,
    ResultadoReserva,
    ResultadoPrimeiroMilhao,
    ResultadoComparacao,
)

logger = logging.getLogger(__name__)


def get_market_indices():
    """
    Busca os principais indicadores econômicos (Selic, CDI, IPCA)
    utilizando as APIs públicas do Banco Central do Brasil (SGS).
    """

    indices = {
        "selic": 0.0,
        "cdi": 0.0,
        "ipca": 0.0,
        "last_updated": datetime.now().isoformat(),
    }


def _fetch_bcb_series(code: int) -> float:
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


def get_ir_rate(dias: int) -> float:
    if dias <= 180:
        return 0.225
    elif dias <= 360:
        return 0.200
    elif dias <= 720:
        return 0.175
    else:
        return 0.150


def calcular_projecao_rf(
    valor_inicial: float,
    aporte_mensal: float,
    periodo_meses: int,
    taxa_juros_anual: float,
    isento_ir: bool = False,
) -> ResultadoSimulacao:
    """
    Simula a evolução de um investimento de Renda Fixa com aportes mensais.
    """
    taxa_juros_mensal = (1 + taxa_juros_anual / 100) ** (1 / 12) - 1
    patrimonio_atual = valor_inicial
    total_investido = valor_inicial
    dados_projecao = []

    dados_projecao.append(
        {
            "mes": 0,
            "patrimonio_bruto": round(patrimonio_atual, 2),
            "total_investido": round(total_investido, 2),
            "patrimonio_liquido": round(patrimonio_atual, 2),
            "rendimento_mes": 0.0,
        }
    )

    for mes in range(1, periodo_meses + 1):
        juros_mes = patrimonio_atual * taxa_juros_mensal
        patrimonio_atual += juros_mes
        patrimonio_atual += aporte_mensal
        total_investido += aporte_mensal

        lucro_bruto = patrimonio_atual - total_investido
        imposto_pago = 0.0
        if not isento_ir and lucro_bruto > 0:
            imposto_pago = lucro_bruto * get_ir_rate(mes * 30)

        dados_projecao.append(
            {
                "mes": mes,
                "patrimonio_bruto": round(patrimonio_atual, 2),
                "patrimonio_liquido": round(patrimonio_atual - imposto_pago, 2),
                "total_investido": round(total_investido, 2),
                "rendimento_mes": round(juros_mes, 2),
            }
        )

    lucro_bruto = patrimonio_atual - total_investido
    imposto_final = (
        lucro_bruto * get_ir_rate(periodo_meses * 30)
        if not isento_ir and lucro_bruto > 0
        else 0.0
    )

    return ResultadoSimulacao(
        valor_bruto=round(patrimonio_atual, 2),
        total_investido=round(total_investido, 2),
        lucro_bruto=round(lucro_bruto, 2),
        imposto_pago=round(imposto_final, 2),
        valor_liquido=round(patrimonio_atual - imposto_final, 2),
        tipo="Isento" if isento_ir else "Tributável",
        projecao_mensal=[DadosMes(**d) for d in dados_projecao],
    )


def calcular_juros_simples(
    valor_inicial: float, taxa_anual: float, anos: int
) -> ResultadoSimulacao:
    total_investido = valor_inicial
    juros_totais = valor_inicial * (taxa_anual / 100) * anos
    montante = valor_inicial + juros_totais
    dados_projecao = []

    # Gera 12 pontos para o gráfico
    for i in range(13):
        val = valor_inicial + (juros_totais * (i / 12))
        dados_projecao.append(
            DadosMes(
                mes=i,
                patrimonio_bruto=val,
                patrimonio_liquido=val,
                total_investido=valor_inicial,
                rendimento_mes=0,
            )
        )

    return ResultadoSimulacao(
        valor_bruto=round(montante, 2),
        total_investido=round(valor_inicial, 2),
        lucro_bruto=round(juros_totais, 2),
        imposto_pago=0.0,
        valor_liquido=round(montante, 2),
        tipo="Juros Simples",
        projecao_mensal=dados_projecao,
    )


def calcular_primeiro_milhao(
    valor_inicial: float, taxa_anual: float, anos: int
) -> ResultadoPrimeiroMilhao:
    meta = 1_000_000.0
    meses = anos * 12
    if meses == 0:
        meses = 1
    taxa_mensal = (1 + taxa_anual / 100) ** (1 / 12) - 1
    if taxa_mensal == 0:
        return ResultadoPrimeiroMilhao(
            aporte_mensal_necessario=0, total_investido=0, total_juros=0
        )

    fv_inicial = valor_inicial * ((1 + taxa_mensal) ** meses)
    deficit = meta - fv_inicial

    if deficit <= 0:
        return ResultadoPrimeiroMilhao(
            aporte_mensal_necessario=0,
            total_investido=valor_inicial,
            total_juros=meta - valor_inicial,
        )

    fator = (((1 + taxa_mensal) ** meses) - 1) / taxa_mensal
    aporte = deficit / fator

    total_inv = valor_inicial + (aporte * meses)

    return ResultadoPrimeiroMilhao(
        aporte_mensal_necessario=round(aporte, 2),
        total_investido=round(total_inv, 2),
        total_juros=round(meta - total_inv, 2),
    )


def calcular_reserva(despesa_mensal: float, meses: int) -> ResultadoReserva:
    total = despesa_mensal * meses
    desc = f"Meta para {meses} meses de segurança."
    return ResultadoReserva(valor_reserva=round(total, 2), descricao=desc)


def comparar_cenarios(
    valor_inicial, aporte_mensal, meses, taxa_a, isento_a, taxa_b, isento_b
) -> ResultadoComparacao:
    cenario_a = calcular_projecao_rf(
        valor_inicial, aporte_mensal, meses, taxa_a, isento_a
    )
    cenario_b = calcular_projecao_rf(
        valor_inicial, aporte_mensal, meses, taxa_b, isento_b
    )
    diff = cenario_a.valor_liquido - cenario_b.valor_liquido
    melhor = "Cenário A" if diff > 0 else "Cenário B"
    if abs(diff) < 0.01:
        melhor = "Empate"

    return ResultadoComparacao(
        cenario_a=cenario_a,
        cenario_b=cenario_b,
        diferenca_liquida=round(abs(diff), 2),
        melhor_cenario=melhor,
    )


def simular_cdi(
    valor_inicial: float,
    aporte_mensal: float,
    anos: int,
    percentual_cdi: float,
    taxa_di_atual: float,
) -> ResultadoSimulacao:
    taxa_efetiva = taxa_di_atual * (percentual_cdi / 100.0)
    return calcular_projecao_rf(
        valor_inicial, aporte_mensal, anos * 12, taxa_efetiva, isento_ir=False
    )


def projetar_ativo_existente(
    db: Session, ativo_id: str, aporte_mensal: float, anos: int
) -> ResultadoSimulacao:
    ativo = db.query(models.Ativo).filter(models.Ativo.id == ativo_id).first()
    if not ativo:
        raise Exception("Ativo não encontrado")

    taxa_uso = ativo.valor_taxa if ativo.valor_taxa > 0 else 0.0
    isento = (
        "LCI" in ativo.nome.upper()
        or "LCA" in ativo.nome.upper()
        or "ISENTO" in ativo.nome.upper()
    )

    return calcular_projecao_rf(
        valor_inicial=ativo.valor_atual_bruto,
        aporte_mensal=aporte_mensal,
        periodo_meses=anos * 12,
        taxa_juros_anual=taxa_uso,
        isento_ir=isento,
    )


def simulador_rapido_rf(
    valor_inicial: float, anos: int, taxa_cdb: float, taxa_lci: float, taxa_di: float
) -> ResultadoComparacao:
    taxa_efetiva_a = taxa_di * (taxa_cdb / 100.0)
    taxa_efetiva_b = taxa_di * (taxa_lci / 100.0)

    return comparar_cenarios(
        valor_inicial=valor_inicial,
        aporte_mensal=0,
        meses=anos * 12,
        taxa_a=taxa_efetiva_a,
        isento_a=False,
        taxa_b=taxa_efetiva_b,
        isento_b=True,
    )
