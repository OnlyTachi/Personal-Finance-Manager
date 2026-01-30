from pydantic import BaseModel
from typing import List, Optional


# --- Mantendo os anteriores... ---
class DadosMes(BaseModel):
    mes: int
    patrimonio_bruto: float
    patrimonio_liquido: float
    total_investido: float
    rendimento_mes: float


class ResultadoSimulacao(BaseModel):
    valor_bruto: float
    total_investido: float
    lucro_bruto: float
    imposto_pago: float
    valor_liquido: float
    tipo: str
    projecao_mensal: List[DadosMes]


# --- Inputs Anteriores ---
class JurosSimplesInput(BaseModel):
    valor_inicial: float
    taxa_anual: float
    anos: int


class PrimeiroMilhaoInput(BaseModel):
    valor_inicial: float
    taxa_anual: float
    anos: int


class ReservaEmergenciaInput(BaseModel):
    despesa_mensal: float
    meses_protecao: Optional[int] = 6


class ComparadorInput(BaseModel):
    valor_inicial: float
    aporte_mensal: float
    meses: int
    taxa_a: float
    isento_a: bool
    taxa_b: float
    isento_b: bool


# --- NOVOS INPUTS ---


class CdiInput(BaseModel):
    valor_inicial: float
    aporte_mensal: float
    anos: int
    percentual_cdi: float  # Ex: 110%
    taxa_di_atual: float  # Ex: 10.65% (Manual ou default)


class ProjetarAtivoInput(BaseModel):
    ativo_id: str
    aporte_mensal: float
    anos: int
    # A taxa será pega do cadastro do ativo no banco


class SimuladorRapidoInput(BaseModel):
    valor_inicial: float
    anos: int
    taxa_cdb: float  # % do CDI
    taxa_lci: float  # % do CDI
    taxa_di: float  # CDI Atual


# --- Respostas Específicas ---
class ResultadoReserva(BaseModel):
    valor_reserva: float
    descricao: str


class ResultadoPrimeiroMilhao(BaseModel):
    aporte_mensal_necessario: float
    total_investido: float
    total_juros: float


class ResultadoComparacao(BaseModel):
    cenario_a: ResultadoSimulacao
    cenario_b: ResultadoSimulacao
    diferenca_liquida: float
    melhor_cenario: str
