from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.history import service, schemas

router = APIRouter()


@router.get("/", response_model=List[schemas.Snapshot])
def get_portfolio_history(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    history = service.get_history(db, current_user.username)

    # Se não tiver histórico OU se o histórico estiver com dados "migrados" (null/0 no investido)
    # Verifica se o ultimo snapshot tem valor investido zerado mas valor bruto positivo (indicio de dado antigo)
    needs_rebuild = False
    if not history:
        needs_rebuild = True
    elif history[-1].valor_total_investido is None or (
        history[-1].valor_total_bruto > 0
        and (history[-1].valor_total_investido or 0) == 0
    ):
        # A lógica aqui é: se tem dinheiro mas investido é 0/Null, provavelmente é dado pré-migração. (versão antiga XD)
        needs_rebuild = True

    if needs_rebuild:
        service.rebuild_user_history(db, current_user.username)
        history = service.get_history(db, current_user.username)

    return history


@router.post("/rebuild")
def force_rebuild_history(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    service.rebuild_user_history(db, current_user.username)
    return {"message": "Histórico reconstruído com sucesso."}
