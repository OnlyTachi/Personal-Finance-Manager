import io
import re
import os
import logging
import pandas as pd
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from sqlalchemy import extract, func, or_

# Imports da aplicação
from app.modules.cashflow import models, schemas
from app.modules.cashflow.ai_service import categorize_transaction_ai
from app.modules.cashflow.categorizer import predict_category as rule_based_predict
from app.modules.notifications import service as notif_service
from app.modules.auth.models import User
from app.core.utils import generate_uuid
from app.modules.data_pipeline.schemas import CanonicalTransactionDTO
from app.modules.cashflow.models import BudgetLimitDB

logger = logging.getLogger(__name__)

# --- CONFIGURAÇÃO ---
TEMP_UPLOAD_DIR = "/tmp/finance_uploads"
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)

SOFT_CATEGORIES = [
    "Outros",
    "Transferências",
    "Salário & Renda",
    "Serviços Financeiros",
]

# --- FUNÇÕES AUXILIARES ---


def clean_currency(val):
    if isinstance(val, (int, float)):
        return float(val)
    val = str(val).strip()
    if not val:
        return 0.0
    is_negative = "-" in val or "(" in val
    val_clean = re.sub(r"[^\d.,]", "", val)
    if "," in val_clean:
        if "." in val_clean:
            last_dot = val_clean.rfind(".")
            last_comma = val_clean.rfind(",")
            if last_comma > last_dot:
                val_clean = val_clean.replace(".", "").replace(",", ".")
            else:
                val_clean = val_clean.replace(",", "")
        else:
            val_clean = val_clean.replace(",", ".")
    try:
        float_val = float(val_clean)
        return -float_val if is_negative else float_val
    except ValueError:
        return 0.0


def detect_header_row(file_path: str) -> int:
    keywords = [
        "data",
        "lançamento",
        "histórico",
        "descrição",
        "valor",
        "saldo",
        "date",
        "amount",
        "compra",
        "loja",
        "category",
    ]
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            lines = [f.readline() for _ in range(30)]
        for i, line in enumerate(lines):
            line_lower = line.lower()
            matches = sum(1 for k in keywords if k in line_lower)
            if matches >= 2:
                return i
    except Exception:
        pass
    return 0


# --- CRUD BÁSICO ---


def get_movimentacoes(
    db: Session,
    user_username: str,
    skip: int = 0,
    limit: int = 100,
    month: int = None,
    year: int = None,
):
    query = db.query(models.Movimentacao).filter(
        models.Movimentacao.owner_id == user_username
    )
    if month and year:
        query = query.filter(
            extract("month", models.Movimentacao.data) == month,
            extract("year", models.Movimentacao.data) == year,
        )
    return (
        query.order_by(models.Movimentacao.data.desc()).offset(skip).limit(limit).all()
    )


def create_movimentacao(
    db: Session, mov_in: schemas.MovimentacaoCreate, user_username: str
):
    categoria_final = "Outros"

    if mov_in.categoria and mov_in.categoria != "Outros":
        categoria_final = mov_in.categoria
    else:
        cat_desc = rule_based_predict(mov_in.descricao)
        cat_hist = (
            rule_based_predict(mov_in.historico) if mov_in.historico else "Outros"
        )

        if cat_hist not in SOFT_CATEGORIES:
            categoria_final = cat_hist
        elif cat_desc not in SOFT_CATEGORIES:
            categoria_final = cat_desc
        else:
            categoria_final = cat_desc if cat_desc != "Outros" else "Outros"

        if categoria_final in SOFT_CATEGORIES:
            ai_cat = categorize_transaction_ai(
                db,
                user_username,
                mov_in.descricao,
                mov_in.valor,
                additional_context=mov_in.historico,
            )
            if ai_cat:
                categoria_final = ai_cat

    mov_data = mov_in.model_dump(exclude={"categoria", "historico"})
    if mov_in.historico and not mov_data.get("observacao"):
        mov_data["observacao"] = mov_in.historico

    db_mov = models.Movimentacao(
        **mov_data,
        categoria=categoria_final,
        owner_id=user_username,
    )
    if not db_mov.data:
        db_mov.data = datetime.now()

    db.add(db_mov)
    db.commit()
    db.refresh(db_mov)

    try:
        from app.modules.notifications import service as notif_service
        from app.modules.auth.models import User

        if db_mov.shared:
            user = db.query(User).filter(User.username == user_username).first()
            if user and user.partner_id:
                notif_service.notify_partner_new_shared_expense(
                    db,
                    autor_username=user_username,
                    partner_username=user.partner_id,
                    descricao=db_mov.descricao,
                    valor=db_mov.valor,
                )

        if db_mov.valor < 0:
            media_cat = (
                db.query(func.avg(models.Movimentacao.valor))
                .filter(
                    models.Movimentacao.owner_id == user_username,
                    models.Movimentacao.categoria == db_mov.categoria,
                    models.Movimentacao.valor < 0,
                )
                .scalar()
                or 0.0
            )

            if abs(media_cat) > 0 and abs(db_mov.valor) >= (abs(media_cat) * 3):
                notif_service.check_anomaly_expense_alert(
                    db, user_username, db_mov.descricao, db_mov.valor, abs(media_cat)
                )
    except Exception as e:
        logger.error(f"Erro ao processar alertas de notificação: {e}")

    return db_mov


def update_movimentacao(
    db: Session, mov_id: str, mov_update: schemas.MovimentacaoUpdate, user_username: str
):
    mov = (
        db.query(models.Movimentacao)
        .filter(
            models.Movimentacao.id == mov_id,
            models.Movimentacao.owner_id == user_username,
        )
        .first()
    )
    if not mov:
        return None
    update_data = mov_update.model_dump(exclude_unset=True, exclude={"historico"})
    if mov_update.historico and not update_data.get("observacao"):
        update_data["observacao"] = mov_update.historico
    for key, value in update_data.items():
        setattr(mov, key, value)
    db.add(mov)
    db.commit()
    db.refresh(mov)
    return mov


def delete_movimentacao(db: Session, mov_id: str, user_username: str):
    mov = (
        db.query(models.Movimentacao)
        .filter(
            models.Movimentacao.id == mov_id,
            models.Movimentacao.owner_id == user_username,
        )
        .first()
    )
    if mov:
        db.delete(mov)
        db.commit()
    return mov


def get_monthly_summary(db: Session, user_username: str, month: int, year: int):
    query = db.query(func.sum(models.Movimentacao.valor)).filter(
        models.Movimentacao.owner_id == user_username,
        extract("month", models.Movimentacao.data) == month,
        extract("year", models.Movimentacao.data) == year,
    )
    entradas = query.filter(models.Movimentacao.valor > 0).scalar() or 0.0
    saidas = query.filter(models.Movimentacao.valor < 0).scalar() or 0.0
    return {"entradas": entradas, "saidas": saidas, "saldo": entradas + saidas}


# --- BUSCA INTELIGENTE (CHATBOT) ---


def search_smart_transactions(db: Session, user_username: str, filters: dict):
    query = db.query(models.Movimentacao).filter(
        models.Movimentacao.owner_id == user_username
    )

    # 1. Filtro de Data
    today = date.today()
    date_filter = filters.get("date_filter", "current_month")

    if date_filter == "current_month":
        query = query.filter(
            extract("month", models.Movimentacao.data) == today.month,
            extract("year", models.Movimentacao.data) == today.year,
        )
    elif date_filter == "last_month":
        first_of_this_month = today.replace(day=1)
        last_month = first_of_this_month - timedelta(days=1)
        query = query.filter(
            extract("month", models.Movimentacao.data) == last_month.month,
            extract("year", models.Movimentacao.data) == last_month.year,
        )
    elif date_filter == "today":
        query = query.filter(func.date(models.Movimentacao.data) == today)

    # 2. Filtro de Palavras-Chave
    keywords = filters.get("keywords", [])
    if keywords:
        search_clauses = []
        for word in keywords:
            term = f"%{word}%"
            search_clauses.append(models.Movimentacao.descricao.ilike(term))
            search_clauses.append(models.Movimentacao.categoria.ilike(term))
            search_clauses.append(models.Movimentacao.observacao.ilike(term))

        query = query.filter(or_(*search_clauses))

    transactions = query.all()

    # Sumarização dos resultados
    total = sum(t.valor for t in transactions)

    # Top Locais
    names = [t.descricao for t in transactions]
    top_places_set = list(set(names))[:3]
    top_places = ", ".join(top_places_set)

    return {
        "total": total,
        "count": len(transactions),
        "top_places": top_places,
        "transactions": transactions,
    }


# --- IMPORTAÇÃO EM LOTE (PERSISTÊNCIA) ---

from app.modules.data_pipeline.schemas import CanonicalTransactionDTO


def create_bulk_movimentacoes(
    db: Session, transactions: list[CanonicalTransactionDTO], user_username: str
):
    if not transactions:
        return {"message": "Nenhuma transação para importar."}

    dates = [t.data for t in transactions if t.data]
    if not dates:
        return {"message": "Não foi possível ler as datas das transações."}

    min_date = min(dates) - timedelta(days=3)
    max_date = max(dates) + timedelta(days=3)

    existing_movs = (
        db.query(models.Movimentacao)
        .filter(
            models.Movimentacao.owner_id == user_username,
            models.Movimentacao.data >= min_date,
            models.Movimentacao.data <= max_date,
        )
        .all()
    )

    available_db_movs = list(existing_movs)
    count_imported = 0
    count_duplicated = 0

    for t in transactions:
        try:
            match_found = None
            for db_mov in available_db_movs:
                if abs(db_mov.valor - t.valor) > 0.01:
                    continue

                db_date = (
                    db_mov.data.date()
                    if isinstance(db_mov.data, datetime)
                    else db_mov.data
                )
                new_date = t.data.date()
                if abs((db_date - new_date).days) > 1:
                    continue

                match_found = db_mov
                break

            if match_found:
                available_db_movs.remove(match_found)
                count_duplicated += 1
            else:
                cat_final = t.categoria_sugerida
                if not cat_final or cat_final in SOFT_CATEGORIES:
                    ai_cat = categorize_transaction_ai(
                        db,
                        user_username,
                        t.descricao,
                        t.valor,
                        additional_context=t.historico_raw,
                    )
                    if ai_cat:
                        cat_final = ai_cat

                new_mov = models.Movimentacao(
                    owner_id=user_username,
                    descricao=t.descricao,
                    valor=t.valor,
                    data=t.data,
                    categoria=cat_final,
                    origem=t.origem,
                    conciliado=True,
                    observacao=t.historico_raw,
                )
                db.add(new_mov)
                count_imported += 1
        except Exception as e:
            logger.error(f"Erro ao salvar transação {t.descricao}: {e}")
            continue

    db.commit()

    msg = f"{count_imported} importadas com sucesso."
    if count_duplicated > 0:
        msg += f" ({count_duplicated} duplicatas ignoradas)."
    return {"message": msg}


# --- CRUD DE TETO ORÇAMENTÁRIO (BUDGETS) ---


def get_user_budgets(db: Session, user_username: str) -> list[BudgetLimitDB]:
    return (
        db.query(BudgetLimitDB)
        .filter(BudgetLimitDB.owner_id == user_username)
        .order_by(BudgetLimitDB.categoria.asc())
        .all()
    )


def upsert_user_budget(
    db: Session, user_username: str, budget_in: schemas.BudgetLimitCreate
) -> BudgetLimitDB:
    budget = (
        db.query(BudgetLimitDB)
        .filter(
            BudgetLimitDB.owner_id == user_username,
            BudgetLimitDB.categoria == budget_in.categoria,
        )
        .first()
    )
    if budget:
        budget.limite_mensal = budget_in.limite_mensal
    else:
        budget = BudgetLimitDB(
            owner_id=user_username,
            categoria=budget_in.categoria,
            limite_mensal=budget_in.limite_mensal,
        )
        db.add(budget)

    db.commit()
    db.refresh(budget)
    return budget


def delete_user_budget(db: Session, user_username: str, budget_id: str) -> bool:
    budget = (
        db.query(BudgetLimitDB)
        .filter(
            BudgetLimitDB.id == budget_id,
            BudgetLimitDB.owner_id == user_username,
        )
        .first()
    )
    if not budget:
        return False
    db.delete(budget)
    db.commit()
    return True
