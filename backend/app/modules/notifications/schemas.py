from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NotificationBase(BaseModel):
    tipo: str
    titulo: str
    mensagem: str
    lida: bool = False


class NotificationCreate(NotificationBase):
    user_id: str


class NotificationResponse(NotificationBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True
