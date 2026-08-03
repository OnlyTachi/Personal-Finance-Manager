from pydantic import BaseModel, Field
from typing import Optional, Literal, List, Any
from datetime import datetime
from app.core.utils import generate_uuid


class CanonicalTransactionDTO(BaseModel):
    """
    Contrato único e padronizado de saída para QUALQUER extrator de dados
    (CSV, PDF, OFX, Email SLM, Vision OCR).
    """

    id: str = Field(
        default_factory=generate_uuid,
        description="Identificador único temporário/staging",
    )
    data: datetime = Field(description="Data e hora da transação")
    descricao: str = Field(
        description="Nome do estabelecimento, recebedor ou histórico principal"
    )
    valor: float = Field(
        description="Valor numérico (negativo para saídas, positivo para entradas)"
    )
    categoria_sugerida: Optional[str] = Field(
        default="Outros", description="Categoria prevista por regras ou IA"
    )
    origem: Literal[
        "CSV", "PDF", "OFX", "EMAIL_SLM", "VISION_OCR", "MANUAL", "IMPORT"
    ] = Field(description="Fonte de ingestão")
    meio_pagamento: Optional[str] = Field(
        default=None, description="PIX, Cartão de Crédito, Boleto, etc."
    )
    parcelas: int = Field(default=1, description="Quantidade de parcelas (padrão 1)")
    historico_raw: Optional[str] = Field(
        default=None, description="Texto/memo original sem tratamento para auditoria"
    )
    shared: bool = Field(
        default=False, description="Flag de despesa compartilhada com casal"
    )
    fitid: Optional[str] = Field(
        default=None,
        description="ID único bancário (OFX/Bank API) para evitar duplicatas",
    )

    class Config:
        from_attributes = True


# --- Schemas Auxiliares de Requisição/Resposta do Pipeline ---


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


class BulkImportRequest(BaseModel):
    transactions: List[CanonicalTransactionDTO]
