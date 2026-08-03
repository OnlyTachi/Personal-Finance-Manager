from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User
from app.modules.cashflow import service as cashflow_service
from app.modules.data_pipeline import schemas
from app.modules.data_pipeline.extractors import document_parser
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Request,
    BackgroundTasks,
)
from app.modules.data_pipeline.extractors.email_engine import InboundEmailWebhookEngine
from app.core.utils import generate_uuid
from app.modules.data_pipeline.tasks import (
    process_heavy_document_async,
    TASK_STATUS_STORE,
)
from app.modules.data_pipeline.tasks import process_historical_imap_sync_async

BaseModel = schemas.BaseModel

router = APIRouter()


class IMAPHistoricalSyncRequest(BaseModel):
    imap_host: str = "imap.gmail.com"
    imap_port: int = 993
    email_user: str
    email_password: str  # Senha de Aplicativo (16 dígitos)
    days_back: int = 90  # Padrão: Últimos 3 meses


@router.post("/imap/sync-history", status_code=202)
def trigger_imap_historical_sync(
    payload: IMAPHistoricalSyncRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """
    Inicia a busca e processamento de e-mails antigos via IMAP em segundo plano.
    """
    task_id = generate_uuid()
    background_tasks.add_task(
        process_historical_imap_sync_async,
        task_id=task_id,
        host=payload.imap_host,
        user=payload.email_user,
        password=payload.email_password,
        port=payload.imap_port,
        days_back=payload.days_back,
        username=current_user.username,
    )
    return {
        "message": f"Busca retroativa dos últimos {payload.days_back} dias iniciada.",
        "task_id": task_id,
        "status_check_url": f"/api/v1/pipeline/tasks/{task_id}",
    }


@router.post("/upload/async-process", status_code=202)
async def upload_file_async(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Recebe arquivos pesados (PDFs/Extratos grandes), dispara o processamento
    em background e retorna imediatamente o ID de acompanhamento.
    """
    task_id = generate_uuid()
    content = await file.read()

    background_tasks.add_task(
        process_heavy_document_async,
        task_id=task_id,
        file_content=content,
        filename=file.filename,
        username=current_user.username,
    )

    return {
        "message": "Processamento iniciado em segundo plano.",
        "task_id": task_id,
        "status_check_url": f"/api/v1/pipeline/tasks/{task_id}",
    }


@router.get("/tasks/{task_id}")
def check_task_status(task_id: str, current_user: User = Depends(get_current_user)):
    """Consulta o progresso ou resultado de uma tarefa de ingestão assíncrona."""
    task = TASK_STATUS_STORE.get(task_id)
    if not task:
        raise HTTPException(
            status_code=404, detail="Tarefa não encontrada ou expirada."
        )
    return task


@router.post("/webhook/email/{username}")
async def inbound_email_webhook(
    username: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Endpoint HTTP para Inbound Email Webhook (Resend/SendGrid/Cloudflare).
    Recebe o e-mail em tempo real, executa a extração via SLM e persiste no fluxo de caixa.
    """
    try:
        payload = await request.json()
        canonical_tx = InboundEmailWebhookEngine.process_webhook_payload(payload)

        if canonical_tx:
            cashflow_service.create_bulk_movimentacoes(
                db=db, transactions=[canonical_tx], user_username=username
            )
            return {"status": "processed", "transaction": canonical_tx.descricao}

        return {
            "status": "ignored",
            "reason": "SLM não identificou evento financeiro relevante",
        }

    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Erro no processamento do webhook: {str(e)}"
        )


@router.post("/upload/preview", response_model=List[schemas.CanonicalTransactionDTO])
async def upload_file_preview(
    file: UploadFile = File(...), current_user: User = Depends(get_current_user)
):
    content = await file.read()
    try:
        return document_parser.process_file_preview(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload/analyze", response_model=schemas.AnalyzeResponse)
async def analyze_file_route(
    file: UploadFile = File(...), current_user: User = Depends(get_current_user)
):
    try:
        content = await file.read()
        return document_parser.analyze_csv_headers(content, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload/map", response_model=List[schemas.CanonicalTransactionDTO])
def map_file_route(
    payload: schemas.MapRequest, current_user: User = Depends(get_current_user)
):
    try:
        return document_parser.apply_csv_mapping(payload.file_token, payload.mapping)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/import/bulk")
def import_bulk_transactions(
    payload: schemas.BulkImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return cashflow_service.create_bulk_movimentacoes(
            db, payload.transactions, current_user.username
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
