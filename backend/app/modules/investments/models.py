from sqlalchemy import (
    Column,
    String,
    Float,
    DateTime,
    ForeignKey,
    Integer,
    Boolean,
    text,
)
from sqlalchemy.orm import relationship
from app.db.session import Base
import uuid
from datetime import datetime


def generate_uuid():
    return str(uuid.uuid4())


class Ativo(Base):
    __tablename__ = "ativos"

    id = Column(String, primary_key=True, default=generate_uuid)
    owner_id = Column(String, ForeignKey("users.username"))

    nome = Column(String, nullable=False)
    categoria = Column(String, default="Outros")
    tipo_indexador = Column(String, default="MANUAL")
    valor_taxa = Column(Float, default=0.0)
    ticker = Column(String, nullable=True)
    status = Column(String, default="Ativo")

    valor_atual_bruto = Column(Float, default=0.0)
    imposto_estimado = Column(Float, default=0.0)
    valor_liquido_estimado = Column(Float, default=0.0)

    transacoes = relationship(
        "Transacao", back_populates="ativo", cascade="all, delete-orphan"
    )
    owner = relationship("User", back_populates="ativos")


class Transacao(Base):
    __tablename__ = "transacoes"

    id = Column(String, primary_key=True, default=generate_uuid)
    ativo_id = Column(String, ForeignKey("ativos.id"))
    timestamp = Column(DateTime, default=datetime.now)
    tipo = Column(String)
    valor = Column(Float)
    quantidade = Column(Float, default=0.0)

    rendimento_realizado = Column(Float, default=0.0)
    iof_pago = Column(Float, default=0.0)
    ir_pago = Column(Float, default=0.0)
    valor_liquido = Column(Float, default=0.0)

    ativo = relationship("Ativo", back_populates="transacoes")


class Passivo(Base):
    __tablename__ = "passivos"
    id = Column(String, primary_key=True, default=generate_uuid)
    owner_id = Column(String, ForeignKey("users.username"))

    nome = Column(String, nullable=False)
    tipo = Column(String)

    valor_original = Column(Float)
    saldo_devedor = Column(Float)

    taxa_juros_anual = Column(Float, default=0.0)
    prazo_meses = Column(Integer, default=0)
    valor_parcela = Column(Float, default=0.0)

    data_inicio = Column(DateTime, default=datetime.now)
    status = Column(String, default="Ativo")

    owner = relationship("User", back_populates="passivos")
    parcelas = relationship(
        "Parcela", back_populates="passivo", cascade="all, delete-orphan"
    )


class Parcela(Base):
    __tablename__ = "parcelas"
    id = Column(String, primary_key=True, default=generate_uuid)
    passivo_id = Column(String, ForeignKey("passivos.id"))

    numero = Column(Integer)  # 1, 2, 3...
    data_vencimento = Column(DateTime)
    valor = Column(Float)

    status = Column(String, default="Pendente")  # Pendente, Pago
    data_pagamento = Column(DateTime, nullable=True)

    passivo = relationship("Passivo", back_populates="parcelas")


class Goal(Base):
    __tablename__ = "goals"

    id = Column(String, primary_key=True, default=generate_uuid)
    owner_id = Column(String, ForeignKey("users.username"))

    nome = Column(String, nullable=False)
    valor_alvo = Column(Float, nullable=False)
    valor_atual = Column(Float, default=0.0)
    data_limite = Column(DateTime, nullable=True)

    descricao = Column(String, nullable=True)
    cor = Column(String, default="#3b82f6")
    created_at = Column(DateTime, server_default=text("(CURRENT_TIMESTAMP)"))
