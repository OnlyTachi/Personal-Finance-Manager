import datetime
from app.core.utils import generate_uuid

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class EmailTransactionDB(Base):
    __tablename__ = "email_transactions"

    id = Column(String, primary_key=True, default=generate_uuid)
    owner_id = Column(String, ForeignKey("users.username"), nullable=False)

    # Dados extraídos pelo SLM
    tipo_evento = Column(
        String, nullable=False
    )  # COMPRA, TRANSFERENCIA, INVESTIMENTO, RECEITA
    estabelecimento_ou_instituicao = Column(String, nullable=False)
    valor_total = Column(Float, nullable=False)
    data_hora = Column(DateTime, default=func.now(), nullable=False)
    meio_pagamento = Column(String, nullable=True)
    parcelas = Column(Integer, default=1)

    # Metadados de Investimentos/Transferências
    ticker_ativo = Column(String, nullable=True)
    quantidade_cotas = Column(Float, nullable=True)
    preco_unitario = Column(Float, nullable=True)
    destino = Column(String, nullable=True)

    # Controle de Reconciliação
    status_reconciliacao = Column(
        String, default="PENDENTE"
    )  # PENDENTE, RECONCILIADO, ISOLADO
    origem_categoria = Column(String, nullable=False)  # BANCO ou LOJA
    email_uid = Column(String, nullable=True)
    raw_payload = Column(Text, nullable=True)


class ParcelaFaturaDB(Base):
    __tablename__ = "parcelas_fatura"

    id = Column(String, primary_key=True, default=generate_uuid)
    email_transaction_id = Column(
        String, ForeignKey("email_transactions.id"), nullable=False
    )
    owner_id = Column(String, ForeignKey("users.username"), nullable=False)

    numero_parcela = Column(Integer, nullable=False)  # Ex: 1, 2, 3...
    total_parcelas = Column(Integer, nullable=False)  # Ex: 10
    mes_vencimento = Column(String, nullable=False)  # Formato "YYYY-MM"
    valor_parcela = Column(Float, nullable=False)
    status_pago = Column(Integer, default=0)  # 0 = Projetado, 1 = Pago
    created_at = Column(DateTime, server_default=func.now())

    transacao_email = relationship("EmailTransactionDB", backref="parcelas_projetadas")


class EmailAccount(Base):
    __tablename__ = "email_accounts"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(String, ForeignKey("users.username"), nullable=False)

    email = Column(String, nullable=False)
    imap_server = Column(String, default="imap.gmail.com")
    imap_port = Column(Integer, default=993)
    encrypted_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    last_synced_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())

    @property
    def masked_email(self) -> str:
        if "@" not in self.email:
            return self.email
        name, domain = self.email.split("@", 1)
        if len(name) <= 2:
            masked_name = name[0] + "..."
        else:
            masked_name = name[:2] + "..."
        return f"{masked_name}@{domain}"
