from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.gamification import service, schemas

router = APIRouter()


@router.get("/status", response_model=schemas.GamificationStatus)
def get_gamification_status(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return service.get_user_gamification_status(db, current_user.username)


@router.get("/battle", response_model=schemas.MonthlyBattle)
def get_monthly_battle_route(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return service.get_monthly_battle(db, current_user.username)
