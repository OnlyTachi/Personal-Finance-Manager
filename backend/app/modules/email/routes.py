from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db

# Importando Auth
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.models import User

# Importando Email
from app.modules.email.engines import service
from app.modules.email import schemas, models
from app.modules.email import assistant_service
from app.modules.email import schemas, models, reconciliation_service, assistant_service

router = APIRouter()


@router.post("/reconcile/reject")
def reject_match(
    payload: schemas.ConfirmMatchInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Descarta/rejeita o vínculo de uma transação de e-mail pendente.
    """
    tx = (
        db.query(models.EmailTransactionDB)
        .filter(
            models.EmailTransactionDB.id == payload.banco_transacao_id,
            models.EmailTransactionDB.owner_id == current_user.username,
        )
        .first()
    )
    if not tx:
        raise HTTPException(status_code=404, detail="Transação não encontrada.")

    # Altera o status para REJEITADO / DESCARTE
    tx.status_reconciliacao = "REJEITADO"
    db.add(tx)
    db.commit()

    return {"message": "Conciliação descartada com sucesso."}


@router.post("/assistant/chat")
def chat_assistant(
    payload: schemas.ChatMessageInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Processa a pergunta do usuário com o Assistente Conversacional (Snapshot + Tools).
    """
    reply = assistant_service.process_assistant_chat(
        db, current_user.username, payload.message
    )
    return {"reply": reply}


@router.post("/scan")
def trigger_email_scan(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Dispara a varredura IMAP + extração SLM + Reconciliação em background.
    """
    background_tasks.add_task(
        service.run_email_pipeline_for_user, db, current_user.username
    )
    return {
        "message": "Varredura e reconciliação de e-mails iniciadas em segundo plano."
    }


@router.get("/reconcile/pending")
def get_pending_reconciliations(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """
    Retorna a lista de e-mails recebidos que ainda precisam de confirmação/match.
    """
    pending = (
        db.query(models.EmailTransactionDB)
        .filter(
            models.EmailTransactionDB.owner_id == current_user.username,
            models.EmailTransactionDB.status_reconciliacao == "PENDENTE",
        )
        .all()
    )
    return pending


@router.post("/reconcile/match")
def confirm_match(
    payload: schemas.ConfirmMatchInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Confirmação manual de match entre uma transação de Banco e de Loja.
    """
    banco_tx = (
        db.query(models.EmailTransactionDB)
        .filter(
            models.EmailTransactionDB.id == payload.banco_transacao_id,
            models.EmailTransactionDB.owner_id == current_user.username,
        )
        .first()
    )

    if not banco_tx:
        raise HTTPException(
            status_code=404, detail="Transação do banco não encontrada."
        )

    loja_tx = None
    if payload.loja_transacao_id:
        loja_tx = (
            db.query(models.EmailTransactionDB)
            .filter(
                models.EmailTransactionDB.id == payload.loja_transacao_id,
                models.EmailTransactionDB.owner_id == current_user.username,
            )
            .first()
        )

    reconciliation_service.reconcile_pair(db, current_user.username, banco_tx, loja_tx)
    db.commit()

    return {
        "message": "Reconciliação confirmada e lançada no fluxo de caixa com sucesso!"
    }


# --- GERENCIAMENTO DE CONTAS DE E-MAIL ---


@router.get("/accounts", response_model=List[schemas.EmailAccountResponse])
def list_email_accounts(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Lista todas as contas de e-mail conectadas (mascaradas)."""
    return (
        db.query(models.EmailAccount)
        .filter(
            models.EmailAccount.owner_id == current_user.username,
            models.EmailAccount.is_active == True,
        )
        .all()
    )


@router.post("/accounts", response_model=schemas.EmailAccountResponse, status_code=201)
def link_email_account(
    account_in: schemas.EmailAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Testa a conexão IMAP e vincula uma nova conta de e-mail."""
    # 1. Valida se a conta já existe para o usuário
    existing = (
        db.query(models.EmailAccount)
        .filter(
            models.EmailAccount.owner_id == current_user.username,
            models.EmailAccount.email == account_in.email,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=400, detail="Esta conta de e-mail já está cadastrada."
        )

    # 2. Testa conexão IMAP antes de salvar
    is_valid = service.GenericIMAPEngine.test_connection(
        email_address=account_in.email,
        password=account_in.password,
        host=account_in.imap_server,
        port=account_in.imap_port,
    )
    if not is_valid:
        raise HTTPException(
            status_code=400,
            detail="Não foi possível conectar ao servidor IMAP. Verifique o e-mail, servidor e a Senha de Aplicativo.",
        )

    # 3. Salva no banco
    new_acc = models.EmailAccount(
        owner_id=current_user.username,
        email=account_in.email,
        encrypted_password=account_in.password,
        imap_server=account_in.imap_server,
        imap_port=account_in.imap_port,
    )
    db.add(new_acc)
    db.commit()
    db.refresh(new_acc)
    return new_acc


@router.delete("/accounts/{account_id}", status_code=204)
def unlink_email_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Desvincula/Remove uma conta de e-mail."""
    acc = (
        db.query(models.EmailAccount)
        .filter(
            models.EmailAccount.id == account_id,
            models.EmailAccount.owner_id == current_user.username,
        )
        .first()
    )
    if not acc:
        raise HTTPException(status_code=404, detail="Conta de e-mail não encontrada.")

    db.delete(acc)
    db.commit()
    return None
