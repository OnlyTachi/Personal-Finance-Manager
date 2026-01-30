from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.core import security
from app.modules.auth import models, schemas, dependencies
from app.modules.investments import models as inv_models

router = APIRouter()


# Dependência global: Só admin entra aqui
@router.get("/users", response_model=List[schemas.User])
def list_users(
    db: Session = Depends(get_db),
    admin: models.User = Depends(dependencies.get_current_admin_user),
):
    return db.query(models.User).all()


@router.post("/users", response_model=schemas.User)
def create_user_admin(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(dependencies.get_current_admin_user),
):
    exists = (
        db.query(models.User).filter(models.User.username == user_in.username).first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="Usuário já existe")

    hashed_pw = security.get_password_hash(user_in.password)
    new_user = models.User(username=user_in.username, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.put("/users/{username}", response_model=schemas.User)
def update_user_admin(
    username: str,
    user_update: schemas.UserUpdateAdmin,
    db: Session = Depends(get_db),
    admin: models.User = Depends(dependencies.get_current_admin_user),
):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if user_update.password:
        user.hashed_password = security.get_password_hash(user_update.password)

    if user_update.is_admin is not None:
        # Previne que o admin remova seu próprio acesso acidentalmente se for o único
        user.is_admin = user_update.is_admin

    db.commit()
    db.refresh(user)
    return user


@router.delete("/users/{username}")
def delete_user_admin(
    username: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(dependencies.get_current_admin_user),
):
    if username == admin.username:
        raise HTTPException(status_code=400, detail="Você não pode se deletar.")

    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # O Cascade do banco deve limpar o resto (ativos, movimentações, etc)
    db.delete(user)
    db.commit()
    return {"message": "Usuário deletado com sucesso"}


@router.get("/users/{username}/stats", response_model=schemas.UserStats)
def analyze_user(
    username: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(dependencies.get_current_admin_user),
):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    ativos = (
        db.query(inv_models.Ativo).filter(inv_models.Ativo.owner_id == username).all()
    )
    passivos = (
        db.query(inv_models.Passivo)
        .filter(inv_models.Passivo.owner_id == username)
        .all()
    )

    total_ativos = sum(a.valor_atual_bruto for a in ativos)
    total_dividas = sum(p.saldo_devedor for p in passivos)

    return {
        "username": user.username,
        "total_ativos": total_ativos,
        "total_dividas": total_dividas,
        "patrimonio_liquido": total_ativos - total_dividas,
        "data_cadastro": user.created_at,
    }
