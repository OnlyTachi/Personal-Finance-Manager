from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Body
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


@router.post("/upload/preview", response_model=List[schemas.TransactionPreview])
async def upload_file_preview(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Rota legada para OFX/PDF que já retorna as transações processadas.
    """
    content = await file.read()
    try:
        preview_data = service.process_file_preview(content, file.filename)
        return preview_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- NOVAS ROTAS DE MAPEAMENTO ---


@router.post("/upload/analyze", response_model=schemas.AnalyzeResponse)
async def analyze_file_route(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Passo 1: Recebe o arquivo, salva temporariamente e retorna os cabeçalhos.
    """
    try:
        content = await file.read()
        return service.analyze_csv_headers(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload/map", response_model=List[schemas.TransactionPreview])
def map_file_route(
    payload: schemas.MapRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Passo 2: Aplica o mapeamento de colunas no arquivo temporário.
    """
    try:
        return service.apply_csv_mapping(payload.file_token, payload.mapping)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/import/bulk")
def import_bulk_transactions(
    payload: schemas.BulkImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Recebe a lista final confirmada pelo usuário e salva no banco.
    """
    try:
        return service.create_bulk_movimentacoes(
            db, payload.transactions, current_user.username
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
