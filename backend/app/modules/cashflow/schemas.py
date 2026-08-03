from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class BudgetLimitBase(BaseModel):
    categoria: str
    limite_mensal: float


class BudgetLimitCreate(BudgetLimitBase):
    pass


class BudgetLimitUpdate(BaseModel):
    limite_mensal: float


class BudgetLimitResponse(BudgetLimitBase):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MovimentacaoBase(BaseModel):
    descricao: str
    valor: float
    data: Optional[datetime] = None
    categoria: Optional[str] = "Outros"
    origem: Optional[str] = "MANUAL"
    conciliado: Optional[bool] = False
    observacao: Optional[str] = None
    shared: Optional[bool] = False
    historico: Optional[str] = None


class MovimentacaoCreate(MovimentacaoBase):
    pass


class MovimentacaoUpdate(BaseModel):
    descricao: Optional[str] = None
    valor: Optional[float] = None
    data: Optional[datetime] = None
    categoria: Optional[str] = None
    conciliado: Optional[bool] = None
    shared: Optional[bool] = None
    historico: Optional[str] = None


class Movimentacao(MovimentacaoBase):
    id: str
    owner_id: str
    fitid: Optional[str] = None
    comprovante_url: Optional[str] = None

    class Config:
        from_attributes = True
