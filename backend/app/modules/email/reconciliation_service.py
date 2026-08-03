import logging
from datetime import datetime, timedelta
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.modules.email import models as email_models
from app.modules.cashflow import service as cashflow_service
from app.modules.cashflow import schemas as cashflow_schemas

logger = logging.getLogger(__name__)

# Janelas de tolerância em minutos
TIME_WINDOW_MINUTES_LOJA = 24 * 60  # ±24 Horas para e-commerce
TIME_WINDOW_MINUTES_BANCO = 15  # ±15 Minutos para extrato/notificação do banco


def run_reconciliation_process(db: Session, user_username: str):
    """
    Varre as transações do usuário em email_transactions com status PENDENTE
    e tenta encontrar o par exato de loja vs. banco.
    """
    pending_bancos = (
        db.query(email_models.EmailTransactionDB)
        .filter(
            email_models.EmailTransactionDB.owner_id == user_username,
            email_models.EmailTransactionDB.status_reconciliacao == "PENDENTE",
            email_models.EmailTransactionDB.origem_categoria == "BANCO",
        )
        .all()
    )

    pending_lojas = (
        db.query(email_models.EmailTransactionDB)
        .filter(
            email_models.EmailTransactionDB.owner_id == user_username,
            email_models.EmailTransactionDB.status_reconciliacao == "PENDENTE",
            email_models.EmailTransactionDB.origem_categoria == "LOJA",
        )
        .all()
    )

    reconciled_count = 0

    # 1. Cruzamento BANCO ↔ LOJA
    for banco_tx in pending_bancos:
        match_found = None

        for loja_tx in pending_lojas:
            # Tolerância de valor exato (R$ 0,01 de margem para arredondamento)
            if abs(banco_tx.valor_total - loja_tx.valor_total) > 0.01:
                continue

            # Tolerância temporal (até 24 horas)
            diff_minutes = (
                abs((banco_tx.data_hora - loja_tx.data_hora).total_seconds()) / 60.0
            )
            if diff_minutes <= TIME_WINDOW_MINUTES_LOJA:
                match_found = loja_tx
                break

        if match_found:
            reconcile_pair(db, user_username, banco_tx, match_found)
            pending_lojas.remove(match_found)
            reconciled_count += 1

    # 2. Tratamento de Transações de BANCO Isoladas (Sem e-mail de loja após 48h)
    # Ex: Um PIX enviado para uma pessoa física ou pagamento de conta de luz
    cutoff_time = datetime.now() - timedelta(hours=48)
    isolated_bancos = (
        db.query(email_models.EmailTransactionDB)
        .filter(
            email_models.EmailTransactionDB.owner_id == user_username,
            email_models.EmailTransactionDB.status_reconciliacao == "PENDENTE",
            email_models.EmailTransactionDB.origem_categoria == "BANCO",
            email_models.EmailTransactionDB.data_hora <= cutoff_time,
        )
        .all()
    )

    for iso_tx in isolated_bancos:
        convert_email_to_movimentacao_and_parcelas(db, user_username, iso_tx)
        iso_tx.status_reconciliacao = "ISOLADO"
        db.add(iso_tx)

    db.commit()
    logger.info(
        f"Reconciliação concluída para {user_username}: {reconciled_count} pares combinados."
    )
    return {"reconciled_pairs": reconciled_count}


def reconcile_pair(
    db: Session,
    user_username: str,
    banco_tx: email_models.EmailTransactionDB,
    loja_tx: email_models.EmailTransactionDB = None,
):
    """
    Unifica a transação do banco com a da loja e insere no Cashflow principal.
    """
    nome_estabelecimento = (
        loja_tx.estabelecimento_ou_instituicao
        if loja_tx
        else banco_tx.estabelecimento_ou_instituicao
    )

    descricao_final = (
        f"{nome_estabelecimento} ({banco_tx.estabelecimento_ou_instituicao})"
    )

    convert_email_to_movimentacao_and_parcelas(
        db, user_username, banco_tx, descricao_override=descricao_final
    )

    banco_tx.status_reconciliacao = "RECONCILIADO"
    db.add(banco_tx)

    if loja_tx:
        loja_tx.status_reconciliacao = "RECONCILIADO"
        db.add(loja_tx)


def convert_email_to_movimentacao_and_parcelas(
    db: Session,
    user_username: str,
    email_tx: email_models.EmailTransactionDB,
    descricao_override: str = None,
):
    """
    Lança o registro no fluxo de caixa e calcula a projeção de parcelas caso seja parcelado.
    """
    valor = email_tx.valor_total
    if email_tx.tipo_evento in ["COMPRA", "TRANSFERENCIA"] and valor > 0:
        valor = -valor

    descricao = descricao_override or email_tx.estabelecimento_ou_instituicao
    historico_obs = f"Importado via E-mail ({email_tx.meio_pagamento or 'PIX'})"

    if email_tx.parcelas > 1:
        historico_obs += f" - Parcelado em {email_tx.parcelas}x"

    mov_in = cashflow_schemas.MovimentacaoCreate(
        descricao=descricao,
        valor=valor,
        data=email_tx.data_hora,
        categoria="Outros",
        origem="EMAIL_AUTOMATION",
        conciliado=True,
        historico=historico_obs,
    )
    cashflow_service.create_movimentacao(db, mov_in, user_username)

    # 2. PROJEÇÃO DE PARCELAS FUTURAS (para compras no Cartão de Crédito com N > 1)
    if email_tx.parcelas > 1:
        valor_parcela = round(abs(email_tx.valor_total) / email_tx.parcelas, 2)
        data_base = email_tx.data_hora or datetime.now()

        for i in range(1, email_tx.parcelas + 1):
            # Projeta o vencimento para os meses subsequentes (YYYY-MM)
            mes_calculado = data_base + timedelta(days=30 * (i - 1))
            mes_vencimento_str = mes_calculado.strftime("%Y-%m")

            parcela_db = email_models.ParcelaFaturaDB(
                email_transaction_id=email_tx.id,
                owner_id=user_username,
                numero_parcela=i,
                total_parcelas=email_tx.parcelas,
                mes_vencimento=mes_vencimento_str,
                valor_parcela=valor_parcela,
                status_pago=1 if i == 1 else 0,
            )
            db.add(parcela_db)


def get_future_invoices_summary(db: Session, user_username: str, limit_months: int = 6):
    """
    Retorna o total de parcelas a vencer agrupadas por mês (YYYY-MM).
    """
    results = (
        db.query(
            email_models.ParcelaFaturaDB.mes_vencimento,
            func.sum(email_models.ParcelaFaturaDB.valor_parcela).label("total_fatura"),
            func.count(email_models.ParcelaFaturaDB.id).label("qtd_parcelas"),
        )
        .filter(
            email_models.ParcelaFaturaDB.owner_id == user_username,
            email_models.ParcelaFaturaDB.status_pago == 0,
        )
        .group_by(email_models.ParcelaFaturaDB.mes_vencimento)
        .order_by(email_models.ParcelaFaturaDB.mes_vencimento.asc())
        .limit(limit_months)
        .all()
    )

    return [
        {
            "mes": r.mes_vencimento,
            "total_fatura": round(r.total_fatura, 2),
            "qtd_parcelas": r.qtd_parcelas,
        }
        for r in results
    ]
