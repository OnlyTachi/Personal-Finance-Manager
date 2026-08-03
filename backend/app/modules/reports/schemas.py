from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date


class CustomReportFilterInput(BaseModel):
    data_inicio: date
    data_fim: date
    categorias: Optional[List[str]] = None
    origens: Optional[List[str]] = None
    apenas_compartilhadas: Optional[bool] = None
    formato_saida: Optional[str] = "json"


class ReportPreferenceBase(BaseModel):
    contact_email: Optional[EmailStr] = None
    discord_webhook_url: Optional[str] = None
    daily_enabled: bool = True
    daily_time: str = "08:00"
    weekly_enabled: bool = False
    weekly_day: int = 0
    weekly_time: str = "09:00"
    monthly_enabled: bool = False
    monthly_day: int = 1
    monthly_time: str = "09:00"


class ReportPreferenceUpdate(ReportPreferenceBase):
    discord_webhook_url: Optional[str] = None
    pass


class ReportPreferenceResponse(ReportPreferenceBase):
    id: int
    owner_id: str

    class Config:
        from_attributes = True
