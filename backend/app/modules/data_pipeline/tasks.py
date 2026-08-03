import logging
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.modules.data_pipeline.extractors import document_parser
from app.modules.cashflow import service as cashflow_service
from app.modules.email.slm_processor import extract_transaction_from_email
from app.modules.data_pipeline.schemas import CanonicalTransactionDTO
from app.modules.cashflow import service as cashflow_service
from app.modules.email.engines.imap_engine import GenericIMAPEngine

logger = logging.getLogger(__name__)

TASK_STATUS_STORE: Dict[str, Dict[str, Any]] = {}

logger = logging.getLogger(__name__)


def process_historical_imap_sync_async(
    task_id: str,
    host: str,
    user: str,
    password: str,
    port: int,
    days_back: int,
    username: str,
):
    db: Session = SessionLocal()
    try:
        engine = GenericIMAPEngine(
            email_address=user,
            password_or_token=password,
            imap_host=host,
            imap_port=port,
        )

        raw_emails = engine.fetch_historical_emails(days_back=days_back)
        canonical_txs = []

        for em in raw_emails:
            slm_res = extract_transaction_from_email(
                subject=em["subject"], sender=em["sender"], body_text=em["body_text"]
            )
            if slm_res:
                valor = float(slm_res.valor_total)
                if slm_res.tipo_evento in ["COMPRA", "TRANSFERENCIA"] and valor > 0:
                    valor = -valor

                tx_dto = CanonicalTransactionDTO(
                    descricao=slm_res.estabelecimento_ou_instituicao or "Compra E-mail",
                    valor=valor,
                    categoria_sugerida="Outros",
                    origem="EMAIL_SLM",
                    meio_pagamento=slm_res.meio_pagamento or "PIX",
                    parcelas=slm_res.parcelas or 1,
                    historico_raw=f"[Histórico IMAP] {em['subject']} | {em['sender']}",
                )
                canonical_txs.append(tx_dto)

        if canonical_txs:
            cashflow_service.create_bulk_movimentacoes(db, canonical_txs, username)

    except Exception as e:
        logger.error(f"Erro na sincronização histórica: {e}")
    finally:
        db.close()


def process_heavy_document_async(
    task_id: str, file_content: bytes, filename: str, username: str
):
    """
    Executa a extração de documentos pesados em background de forma isolada,
    gerenciando a própria sessão com o Banco de Dados.
    """
    TASK_STATUS_STORE[task_id] = {
        "status": "PROCESSING",
        "progress": "Iniciando parsing...",
    }
    db: Session = SessionLocal()

    try:
        TASK_STATUS_STORE[task_id]["progress"] = "Extraindo transações do documento..."
        canonical_txs = document_parser.process_file_preview(file_content, filename)

        if not canonical_txs:
            TASK_STATUS_STORE[task_id] = {
                "status": "COMPLETED",
                "result": "Nenhuma transação financeira encontrada.",
            }
            return

        TASK_STATUS_STORE[task_id][
            "progress"
        ] = "Executando categorização e salvando..."
        res = cashflow_service.create_bulk_movimentacoes(db, canonical_txs, username)

        TASK_STATUS_STORE[task_id] = {"status": "SUCCESS", "result": res}

    except Exception as e:
        logger.error(f"Erro na task assíncrona {task_id}: {e}")
        TASK_STATUS_STORE[task_id] = {"status": "FAILED", "error": str(e)}
    finally:
        db.close()
