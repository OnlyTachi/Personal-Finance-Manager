from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.couple import service
from app.modules.investments import schemas as inv_schemas

router = APIRouter()


@router.get("/summary")
def get_couple_summary(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if not current_user.partner_id:
        return {"status": "no_partner"}

    partner = db.query(User).filter(User.username == current_user.partner_id).first()
    if not partner:
        return {"status": "partner_not_found"}

    if partner.partner_id != current_user.username:
        return {"status": "pending_approval", "partner_name": current_user.partner_id}

    data = service.get_couple_dashboard_data(
        db, current_user.username, partner.username
    )
    return {"status": "linked", "data": data}


@router.get("/history")
def get_couple_history_route(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    if not current_user.partner_id:
        raise HTTPException(status_code=400, detail="Sem parceiro.")

    partner = db.query(User).filter(User.username == current_user.partner_id).first()
    if not partner or partner.partner_id != current_user.username:
        raise HTTPException(status_code=403, detail="Vínculo não confirmado.")

    return service.get_couple_history_data(db, current_user.username, partner.username)


@router.get("/goals", response_model=List[inv_schemas.Goal])
def get_goals(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    partner_id = None
    if current_user.partner_id:
        partner = (
            db.query(User).filter(User.username == current_user.partner_id).first()
        )
        if partner and partner.partner_id == current_user.username:
            partner_id = partner.username
    return service.get_couple_goals(db, current_user.username, partner_id)
