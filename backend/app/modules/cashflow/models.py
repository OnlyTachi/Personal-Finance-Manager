from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime
import uuid


# Função para gerar UUIDs únicos
def generate_uuid():
    return str(uuid.uuid4())


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

    # --- NOVO: Casal / Splitwise ---
    shared = Column(Boolean, default=False)  # Se True, entra no cálculo de divisão

    # Metadados
    comprovante_url = Column(String, nullable=True)
    observacao = Column(String, nullable=True)

    owner = relationship("app.modules.auth.models.User")

    # --- Propriedade Auxiliar para o Frontend ---
    # Isso permite que o campo 'historico' do Schema seja preenchido
    # automaticamente com o valor de 'observacao'
    @property
    def historico(self):
        return self.observacao