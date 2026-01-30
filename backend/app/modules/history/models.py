from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime


class Snapshot(Base):
    __tablename__ = "snapshots"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(String, ForeignKey("users.username"))
    timestamp = Column(DateTime, default=datetime.now)

    valor_total_bruto = Column(Float, default=0.0)
    valor_total_investido = Column(Float, default=0.0, nullable=True)

    total_aportes = Column(Float, default=0.0, nullable=True)
    total_saques = Column(Float, default=0.0, nullable=True)
