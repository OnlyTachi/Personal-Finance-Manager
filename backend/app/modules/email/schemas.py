from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal, List
from datetime import datetime
from typing import Optional


class ExtracaoSLM(BaseModel):
    tipo_evento: Literal["COMPRA", "TRANSFERENCIA", "INVESTIMENTO", "RECEITA"] = Field(
        description="Natureza da transação financeira."
    )
    estabelecimento_ou_instituicao: str = Field(
        description="Nome do banco, corretora ou loja/estabelecimento."
    )
    valor_total: float = Field(description="Valor total da transação.")
    data_hora: Optional[str] = Field(
        default=None,
        description="Data e hora em formato ISO 8601 (YYYY-MM-DDTHH:MM:SS).",
    )
    meio_pagamento: Optional[str] = Field(default="PIX")
    parcelas: Optional[int] = Field(default=1)

    destino: Optional[str] = None
    ticker_ativo: Optional[str] = None
    quantidade_cotas: Optional[float] = None
    preco_unitario: Optional[float] = None


class ChatMessageInput(BaseModel):
    message: str = Field(description="Pergunta para o assistente financeiro.")


class ConfirmMatchInput(BaseModel):
    banco_transacao_id: str
    loja_transacao_id: Optional[str] = None


class EmailAccountCreate(BaseModel):
    email: EmailStr
    password: str
    imap_server: Optional[str] = "imap.gmail.com"
    imap_port: Optional[int] = 993


class EmailAccountResponse(BaseModel):
    id: int
    masked_email: str
    imap_server: str
    is_active: bool
    last_synced_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
