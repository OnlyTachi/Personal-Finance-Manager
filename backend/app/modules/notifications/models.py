from app.core.utils import generate_uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Text
from app.db.session import Base


class NotificationDB(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.username"), nullable=False)
    tipo = Column(String, nullable=False)
    titulo = Column(String, nullable=False)
    mensagem = Column(Text, nullable=False)
    lida = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
