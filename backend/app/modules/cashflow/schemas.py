from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


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


class TransactionPreview(BaseModel):
    data_temp: str
    descricao: str
    valor: float
    categoria_sugerida: str
    hash_id: Optional[str] = None
    historico: Optional[str] = None


class BulkImportRequest(BaseModel):
    transactions: List[TransactionPreview]


# --- Schemas de Mapeamento CSV ---


class AnalyzeResponse(BaseModel):
    file_token: str
    headers: List[str]
    sample_rows: List[List[Any]]


class ColumnMapping(BaseModel):
    date_col: str
    amount_col: str
    description_col: str
    history_col: Optional[str] = None
    memo_col: Optional[str] = None
    use_history_for_ai: Optional[bool] = False


class MapRequest(BaseModel):
    file_token: str
    mapping: ColumnMapping