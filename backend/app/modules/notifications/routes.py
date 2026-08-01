from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.notifications import models, schemas

router = APIRouter()


@router.get("/", response_model=List[schemas.NotificationResponse])
def list_notifications(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return (
        db.query(models.NotificationDB)
        .filter(models.NotificationDB.user_id == current_user.username)
        .order_by(models.NotificationDB.created_at.desc())
        .limit(50)
        .all()
    )


@router.put("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notif = (
        db.query(models.NotificationDB)
        .filter(
            models.NotificationDB.id == notification_id,
            models.NotificationDB.user_id == current_user.username,
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")

    notif.lida = True
    db.commit()
    return {"message": "Notificação marcada como lida"}
