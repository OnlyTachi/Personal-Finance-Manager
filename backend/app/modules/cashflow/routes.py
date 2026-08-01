from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    UploadFile,
    File,
    Body,
    status,
)
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.cashflow import schemas, service
from datetime import datetime

router = APIRouter()


@router.get("/", response_model=List[schemas.Movimentacao])
def list_movimentacoes(
    month: Optional[int] = Query(None),
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not month or not year:
        now = datetime.now()
        month = now.month
        year = now.year

    return service.get_movimentacoes(db, current_user.username, month=month, year=year)


@router.post("/", response_model=schemas.Movimentacao)
def create_movimentacao(
    mov_in: schemas.MovimentacaoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.create_movimentacao(db, mov_in, current_user.username)


@router.delete("/{mov_id}")
def delete_movimentacao(
    mov_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service.delete_movimentacao(db, mov_id, current_user.username)
    return {"message": "Movimentação excluída"}


@router.get("/summary")
def get_summary(
    month: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return service.get_monthly_summary(db, current_user.username, month, year)


# --- ENDPOINTS DE TETOS ORÇAMENTÁRIOS ---


@router.get("/budgets", response_model=List[schemas.BudgetLimitResponse])
def list_budgets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista todos os limites de orçamento personalizados do usuário."""
    return service.get_user_budgets(db, current_user.username)


@router.post("/budgets", response_model=schemas.BudgetLimitResponse)
def upsert_budget(
    budget_in: schemas.BudgetLimitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cria ou atualiza o teto orçamentário para uma determinada categoria."""
    return service.upsert_user_budget(db, current_user.username, budget_in)


@router.delete("/budgets/{budget_id}")
def delete_budget(
    budget_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove o limite personalizado de uma categoria (retornando ao fallback se houver)."""
    success = service.delete_user_budget(db, current_user.username, budget_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orçamento não encontrado.",
        )
    return {"message": "Limite de orçamento removido com sucesso."}
