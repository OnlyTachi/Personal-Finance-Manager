from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime
from app.core.utils import generate_uuid
from sqlalchemy import (
    Column,
    String,
    Float,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Boolean,
)
from sqlalchemy.sql import func


class BudgetLimitDB(Base):
    __tablename__ = "budget_limits"

    id = Column(String, primary_key=True, default=generate_uuid)
    owner_id = Column(String, ForeignKey("users.username"), nullable=False)
    categoria = Column(String, nullable=False)
    limite_mensal = Column(Float, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("owner_id", "categoria", name="uix_owner_categoria"),
    )


class Movimentacao(Base):
    __tablename__ = "movimentacoes"

    id = Column(String, primary_key=True, default=generate_uuid)
    owner_id = Column(String, ForeignKey("users.username"))

    # Dados Básicos
    descricao = Column(String, nullable=False)
    valor = Column(Float, nullable=False)
    data = Column(DateTime, default=datetime.now)
    categoria = Column(String, default="Outros")

    # Lógica Inteligente
    origem = Column(String, default="MANUAL")

    # Conciliação
    fitid = Column(String, nullable=True, unique=True)
    conciliado = Column(Boolean, default=False)

    # --- Casal / Splitwise ---
    shared = Column(Boolean, default=False)

    # Metadados
    comprovante_url = Column(String, nullable=True)
    observacao = Column(String, nullable=True)

    owner = relationship("app.modules.auth.models.User")

    @property
    def historico(self):
        return self.observacao
