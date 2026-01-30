from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SnapshotBase(BaseModel):
    timestamp: datetime
    valor_total_bruto: float
    valor_total_investido: Optional[float] = 0.0
    total_aportes: Optional[float] = 0.0
    total_saques: Optional[float] = 0.0


class Snapshot(SnapshotBase):
    id: int
    owner_id: str

    class Config:
        from_attributes = True
