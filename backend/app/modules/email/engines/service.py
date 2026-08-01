from sqlalchemy.orm import Session
from app.modules.email.engines.imap_engine import GenericIMAPEngine
from app.modules.email.slm_processor import extract_transaction_from_email
from app.modules.email import models, schemas
from app.modules.email.reconciliation_service import run_reconciliation_process
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

from datetime import datetime
from app.modules.email.exceptions.mail import IMAPCredentialsMissingException


def run_email_pipeline_for_user(db: Session, user_username: str):
    accounts = (
        db.query(models.EmailAccount)
        .filter(
            models.EmailAccount.owner_id == user_username,
            models.EmailAccount.is_active == True,
        )
        .all()
    )

    if not accounts:
        logger.warning(
            f"Nenhuma conta IMAP cadastrada para {user_username}. Cancelando varredura."
        )
        return {"error": "EMAIL_NOT_CONFIGURED", "message": "Nenhuma conta vinculada."}

    total_emails_processed = 0
    total_new_records = 0

    for acc in accounts:
        try:
            engine = GenericIMAPEngine(
                email_address=acc.email,
                password_or_token=acc.encrypted_password,
                imap_host=acc.imap_server,
                imap_port=acc.imap_port,
            )
            emails = engine.fetch_unseen_emails(limit=15, target_folder="Financias")
            total_emails_processed += len(emails)

            for em in emails:
                extracted: schemas.ExtracaoSLM = extract_transaction_from_email(
                    subject=em["subject"],
                    sender=em["sender"],
                    body_text=em["body_text"],
                )
                if not extracted:
                    continue

                sender_lower = em["sender"].lower()
                bancos_conhecidos = [
                    "nubank",
                    "inter",
                    "bradesco",
                    "itau",
                    "rico",
                    "santander",
                    "btg",
                    "caixa",
                ]
                origem_cat = (
                    "BANCO"
                    if any(b in sender_lower for b in bancos_conhecidos)
                    else "LOJA"
                )

                db_record = models.EmailTransactionDB(
                    owner_id=user_username,
                    tipo_evento=extracted.tipo_evento,
                    estabelecimento_ou_instituicao=extracted.estabelecimento_ou_instituicao,
                    valor_total=extracted.valor_total,
                    meio_pagamento=extracted.meio_pagamento,
                    parcelas=extracted.parcelas or 1,
                    destino=extracted.destino,
                    ticker_ativo=extracted.ticker_ativo,
                    quantidade_cotas=extracted.quantidade_cotas,
                    preco_unitario=extracted.preco_unitario,
                    status_reconciliacao="PENDENTE",
                    origem_categoria=origem_cat,
                    email_uid=em["uid"],
                    raw_payload=em["body_text"][:500],
                )
                db.add(db_record)
                total_new_records += 1

            acc.last_synced_at = datetime.utcnow()
            db.add(acc)
            db.commit()

        except Exception as e:
            logger.error(f"Erro ao processar conta {acc.masked_email}: {e}")
            continue

    reconcile_res = run_reconciliation_process(db, user_username)
    return {
        "processed_emails": total_emails_processed,
        "created_records": total_new_records,
        "reconciled_pairs": reconcile_res["reconciled_pairs"],
    }
