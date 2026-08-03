from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Time
from sqlalchemy.sql import func
from app.db.session import Base


class ReportPreference(Base):
    __tablename__ = "report_preferences"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(String, ForeignKey("users.username"), nullable=False, unique=True)

    # Contatos
    contact_email = Column(String, nullable=True)
    discord_webhook_url = Column(String, nullable=True)

    # Agendamento do Check-up Diário
    daily_enabled = Column(Boolean, default=True)
    daily_time = Column(String, default="08:00")  # Formato HH:MM

    # Agendamento do Relatório Semanal (Ex: Toda Segunda-feira)
    weekly_enabled = Column(Boolean, default=False)
    weekly_day = Column(Integer, default=0)  # 0 = Segunda, 1 = Terça...
    weekly_time = Column(String, default="09:00")

    # Agendamento do Relatório Mensal (Ex: Dia 1 de cada mês)
    monthly_enabled = Column(Boolean, default=False)
    monthly_day = Column(Integer, default=1)  # Dia 1 a 28
    monthly_time = Column(String, default="09:00")

    updated_at = Column(DateTime, onupdate=func.now(), default=func.now())
