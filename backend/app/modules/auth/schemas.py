from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password: str


class User(UserBase):
    is_admin: bool = False
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    partner_id: Optional[str] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


class PartnerLinkRequest(BaseModel):
    partner_username: str


# --- Admin Schemas ---


class UserUpdateAdmin(BaseModel):
    password: Optional[str] = None
    is_admin: Optional[bool] = None


class UserStats(BaseModel):
    username: str
    total_ativos: float
    total_dividas: float
    patrimonio_liquido: float
    data_cadastro: Optional[datetime] = None
