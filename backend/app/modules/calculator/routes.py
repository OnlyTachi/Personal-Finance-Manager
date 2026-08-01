from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User
from . import service, schemas
from app.core import market_data

router = APIRouter()


# --- Rotas Originais ---
@router.post("/simulate", response_model=schemas.ResultadoSimulacao)
def simulate_compound(
    valor_inicial: float,
    aporte_mensal: float,
    meses: int,
    taxa_anual: float,
    is_isento: bool,
):
    return service.calcular_projecao_rf(
        valor_inicial, aporte_mensal, meses, taxa_anual, is_isento
    )


@router.post("/simple_interest", response_model=schemas.ResultadoSimulacao)
def simulate_simple(input: schemas.JurosSimplesInput):
    return service.calcular_juros_simples(
        input.valor_inicial, input.taxa_anual, input.anos
    )


@router.post("/first_million", response_model=schemas.ResultadoPrimeiroMilhao)
def simulate_first_million(input: schemas.PrimeiroMilhaoInput):
    return service.calcular_primeiro_milhao(
        input.valor_inicial, input.taxa_anual, input.anos
    )


@router.post("/emergency_fund", response_model=schemas.ResultadoReserva)
def simulate_emergency(input: schemas.ReservaEmergenciaInput):
    return service.calcular_reserva(input.despesa_mensal, input.meses_protecao)


@router.post("/compare", response_model=schemas.ResultadoComparacao)
def compare_scenarios(input: schemas.ComparadorInput):
    return service.comparar_cenarios(
        input.valor_inicial,
        input.aporte_mensal,
        input.meses,
        input.taxa_a,
        input.isento_a,
        input.taxa_b,
        input.isento_b,
    )


@router.post("/cdi", response_model=schemas.ResultadoSimulacao)
def simulate_cdi(input: schemas.CdiInput):
    return service.simular_cdi(
        input.valor_inicial,
        input.aporte_mensal,
        input.anos,
        input.percentual_cdi,
        input.taxa_di_atual,
    )


@router.post("/project_asset", response_model=schemas.ResultadoSimulacao)
def project_asset(input: schemas.ProjetarAtivoInput, db: Session = Depends(get_db)):
    try:
        return service.projetar_ativo_existente(
            db, input.ativo_id, input.aporte_mensal, input.anos
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/quick_rf", response_model=schemas.ResultadoComparacao)
def simulate_quick_rf(input: schemas.SimuladorRapidoInput):
    return service.simulador_rapido_rf(
        input.valor_inicial, input.anos, input.taxa_cdb, input.taxa_lci, input.taxa_di
    )


@router.get("/indices")
def get_indices_economicos(current_user: User = Depends(get_current_user)):
    """
    Retorna as taxas atuais de mercado (Selic, CDI, IPCA)
    obtidas do Banco Central.
    """
    return market_data.get_market_indices()
