from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from app.db.session import get_db
from app.core import security
from app.modules.auth import models, schemas, service
from app.modules.auth.dependencies import get_current_user

router = APIRouter()


# --- Rotas Existentes (Login/Register) ---
@router.post("/register", response_model=schemas.User)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    user = (
        db.query(models.User).filter(models.User.username == user_in.username).first()
    )
    if user:
        raise HTTPException(status_code=400, detail="Username já cadastrado")

    hashed_pw = security.get_password_hash(user_in.password)
    count_users = db.query(models.User).count()
    is_admin = True if count_users == 0 else False

    new_user = models.User(
        username=user_in.username, hashed_password=hashed_pw, is_admin=is_admin
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = (
        db.query(models.User).filter(models.User.username == form_data.username).first()
    )
    if not user or not security.verify_password(
        form_data.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user.last_login = datetime.now()
    db.commit()
    access_token = security.create_access_token(subject=user.username)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# --- Rotas de Parceiro (Casal) ---
@router.post("/partner/link", response_model=schemas.User)
def link_partner(
    link_req: schemas.PartnerLinkRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if link_req.partner_username == current_user.username:
        raise HTTPException(
            status_code=400, detail="Você não pode adicionar a si mesmo."
        )
    partner = (
        db.query(models.User)
        .filter(models.User.username == link_req.partner_username)
        .first()
    )
    if not partner:
        raise HTTPException(status_code=404, detail="Usuário parceiro não encontrado.")
    current_user.partner_id = partner.username
    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/partner/unlink", response_model=schemas.User)
def unlink_partner(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    current_user.partner_id = None
    db.commit()
    db.refresh(current_user)
    return current_user


# --- TELEGRAM & SETTINGS ---


@router.post("/telegram/generate-code")
def generate_telegram_link_code(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    code = service.generate_telegram_code(db, current_user.username)
    return {"code": code}


@router.get("/telegram/devices")
def list_telegram_devices(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    # Retorna lista de dispositivos conectados, convertendo para dict simples se necessário
    devices = service.get_linked_devices(db, current_user.username)
    return [
        {"id": d.id, "device_name": d.device_name, "created_at": d.created_at}
        for d in devices
    ]


@router.delete("/telegram/devices/{device_id}")
def delete_telegram_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    success = service.unlink_device(db, device_id, current_user.username)
    if not success:
        raise HTTPException(status_code=404, detail="Dispositivo não encontrado")
    return {"message": "Dispositivo removido"}


@router.post("/change-password")
def change_user_password(
    payload: schemas.UserUpdateAdmin,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not payload.password:
        raise HTTPException(status_code=400, detail="Senha vazia")

    service.change_password(db, current_user.username, payload.password)
    return {"message": "Senha alterada com sucesso"}


@router.post("/discord/generate-code")
def generate_discord_link_code(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    code = service.generate_discord_code(db, current_user.username)
    return {"code": code}
