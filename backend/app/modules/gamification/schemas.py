from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional


class Badge(BaseModel):
    code: str
    name: str
    description: str
    icon: str
    color: str
    earned: bool = False
    earned_at: Optional[datetime] = None


class GamificationStatus(BaseModel):
    total_badges: int
    earned_count: int
    badges: List[Badge]
    level: str


class BattleStats(BaseModel):
    username: str
    income: float
    expenses: float
    saved: float
    savings_rate: float
    invested: float


class MonthlyBattle(BaseModel):
    month: int
    year: int
    user: BattleStats
    partner: Optional[BattleStats] = None

    saver_winner: Optional[str] = None
    investor_winner: Optional[str] = None

    reward_message: str
