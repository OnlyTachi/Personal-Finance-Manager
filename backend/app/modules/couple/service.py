from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import datetime
from app.modules.cashflow.models import Movimentacao
from app.modules.history.models import Snapshot
from app.modules.investments.models import Ativo, Passivo, Goal
from app.modules.auth.models import User


def calculate_settlement(user_spent: float, partner_spent: float) -> dict:
    """Calcula quem deve a quem baseado nos gastos compartilhados (Splitwise)."""
    val_u = abs(user_spent)
    val_p = abs(partner_spent)
    total_shared = val_u + val_p
    fair_share = total_shared / 2
    balance = val_u - fair_share

    return {
        "total_paid_by_user": val_u,
        "total_paid_by_partner": val_p,
        "total_shared_expenses": total_shared,
        "fair_share_per_person": fair_share,
        "value": balance,  # Positivo = Recebe, Negativo = Deve
    }


def get_couple_dashboard_data(db: Session, user_username: str, partner_username: str):
    """Agrega dados do usuário E do parceiro para o dashboard compartilhado."""
    user_assets = db.query(Ativo).filter(Ativo.owner_id == user_username).all()
    user_passivos = db.query(Passivo).filter(Passivo.owner_id == user_username).all()

    partner_assets = db.query(Ativo).filter(Ativo.owner_id == partner_username).all()
    partner_passivos = (
        db.query(Passivo).filter(Passivo.owner_id == partner_username).all()
    )

    u_total_assets = sum(a.valor_atual_bruto for a in user_assets)
    u_total_liabilities = sum(p.saldo_devedor for p in user_passivos)

    p_total_assets = sum(a.valor_atual_bruto for a in partner_assets)
    p_total_liabilities = sum(p.saldo_devedor for p in partner_passivos)

    combined_allocation = {}
    for asset in user_assets + partner_assets:
        cat = (asset.categoria or "Outros").title().strip()
        combined_allocation[cat] = (
            combined_allocation.get(cat, 0.0) + asset.valor_atual_bruto
        )

    today = datetime.now()
    user_shared_spent = (
        db.query(func.sum(Movimentacao.valor))
        .filter(
            Movimentacao.owner_id == user_username,
            Movimentacao.shared == True,
            Movimentacao.valor < 0,
            extract("month", Movimentacao.data) == today.month,
            extract("year", Movimentacao.data) == today.year,
        )
        .scalar()
        or 0.0
    )

    partner_shared_spent = (
        db.query(func.sum(Movimentacao.valor))
        .filter(
            Movimentacao.owner_id == partner_username,
            Movimentacao.shared == True,
            Movimentacao.valor < 0,
            extract("month", Movimentacao.data) == today.month,
            extract("year", Movimentacao.data) == today.year,
        )
        .scalar()
        or 0.0
    )

    settlement_data = calculate_settlement(user_shared_spent, partner_shared_spent)

    return {
        "user": {
            "username": user_username,
            "total_assets": u_total_assets,
            "total_liabilities": u_total_liabilities,
            "net_worth": u_total_assets - u_total_liabilities,
        },
        "partner": {
            "username": partner_username,
            "total_assets": p_total_assets,
            "total_liabilities": p_total_liabilities,
            "net_worth": p_total_assets - p_total_liabilities,
        },
        "combined": {
            "total_assets": u_total_assets + p_total_assets,
            "total_liabilities": u_total_liabilities + p_total_liabilities,
            "net_worth": (u_total_assets + p_total_assets)
            - (u_total_liabilities + p_total_liabilities),
            "allocation": combined_allocation,
        },
        "settlement": settlement_data,
    }


def get_couple_history_data(db: Session, user_username: str, partner_username: str):
    """Combina o histórico diário (snapshots) de dois usuários."""
    hist_u = db.query(Snapshot).filter(Snapshot.owner_id == user_username).all()
    hist_p = db.query(Snapshot).filter(Snapshot.owner_id == partner_username).all()

    merged = {}

    def process(hist_list):
        for snap in hist_list:
            d = snap.timestamp.date()
            if d not in merged:
                merged[d] = {"bruto": 0.0, "investido": 0.0}
            merged[d]["bruto"] += snap.valor_total_bruto
            merged[d]["investido"] += snap.valor_total_investido or 0.0

    process(hist_u)
    process(hist_p)

    result = []
    for d in sorted(merged.keys()):
        result.append(
            {
                "timestamp": d.strftime("%Y-%m-%dT%H:%M:%S"),
                "valor_total_bruto": round(merged[d]["bruto"], 2),
                "valor_total_investido": round(merged[d]["investido"], 2),
            }
        )
    return result


def get_couple_goals(db: Session, user_username: str, partner_username: str = None):
    owners = [user_username]
    if partner_username:
        owners.append(partner_username)
    return db.query(Goal).filter(Goal.owner_id.in_(owners)).all()
