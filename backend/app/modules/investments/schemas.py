from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# --- Schemas para Transação ---
class TransacaoBase(BaseModel):
    tipo: str
    valor: float
    quantidade: Optional[float] = 0.0
    timestamp: Optional[datetime] = None

    rendimento_realizado: Optional[float] = 0.0
    iof_pago: Optional[float] = 0.0
    ir_pago: Optional[float] = 0.0
    valor_liquido: Optional[float] = 0.0


class TransacaoCreate(TransacaoBase):
    ativo_id: str


class TransacaoUpdate(BaseModel):
    valor: Optional[float] = None
    quantidade: Optional[float] = None
    timestamp: Optional[datetime] = None
    tipo: Optional[str] = None


class Transacao(TransacaoBase):
    id: str

    class Config:
        from_attributes = True


# --- Schemas para Ativo ---
class AtivoBase(BaseModel):
    nome: str
    categoria: str
    tipo_indexador: str
    valor_taxa: Optional[float] = 0.0
    ticker: Optional[str] = None
    status: Optional[str] = "Ativo"


class AtivoCreate(AtivoBase):
    valor_inicial: float
    data_inicio: Optional[datetime] = None


class AtivoUpdate(BaseModel):
    nome: Optional[str] = None
    categoria: Optional[str] = None
    tipo_indexador: Optional[str] = None
    valor_taxa: Optional[float] = None
    ticker: Optional[str] = None
    status: Optional[str] = None


class Ativo(AtivoBase):
    id: str
    valor_atual_bruto: float
    imposto_estimado: float
    valor_liquido_estimado: float
    transacoes: List[Transacao] = []

    class Config:
        from_attributes = True


# --- Schemas para Parcelas) ---
class ParcelaBase(BaseModel):
    numero: int
    data_vencimento: datetime
    valor: float
    status: str
    data_pagamento: Optional[datetime] = None


class Parcela(ParcelaBase):
    id: str
    passivo_id: str

    class Config:
        from_attributes = True


# --- Schemas para Passivo (Dívidas) ---
class PassivoBase(BaseModel):
    nome: str
    tipo: str
    valor_original: float
    saldo_devedor: float
    taxa_juros_anual: Optional[float] = 0.0
    prazo_meses: Optional[int] = 0
    valor_parcela: Optional[float] = 0.0
    data_inicio: Optional[datetime] = None


class PassivoCreate(PassivoBase):
    pass


class Passivo(PassivoBase):
    id: str
    status: str
    parcelas: List[Parcela] = []

    class Config:
        from_attributes = True


class SimulacaoSaque(BaseModel):
    valor_bruto: float
    valor_liquido: float
    total_imposto: float
    iof: float
    ir: float
    lucro_realizado: float
    detalhes: List[str]


class Snapshot(BaseModel):
    id: int
    timestamp: datetime
    valor_total_bruto: float

    class Config:
        from_attributes = True


# --- Schemas para Goals (Metas) ---
class GoalBase(BaseModel):
    nome: str
    valor_alvo: float
    valor_atual: Optional[float] = 0.0
    data_limite: Optional[datetime] = None
    descricao: Optional[str] = None
    cor: Optional[str] = "#3b82f6"


class GoalCreate(GoalBase):
    pass


class GoalUpdate(BaseModel):
    nome: Optional[str] = None
    valor_alvo: Optional[float] = None
    valor_atual: Optional[float] = None
    data_limite: Optional[datetime] = None
    descricao: Optional[str] = None
    cor: Optional[str] = None


class Goal(GoalBase):
    id: str
    owner_id: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
