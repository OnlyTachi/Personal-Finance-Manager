import json
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.modules.investments import models as inv_models
from app.modules.cashflow import models as cashflow_models
from app.modules.email import reconciliation_service


def build_user_financial_snapshot(db: Session, user_username: str) -> dict:
    """Gera um resumo JSON enxuto para alimentar o System Prompt do LLM."""
    now = datetime.now()

    ativos = (
        db.query(inv_models.Ativo)
        .filter(inv_models.Ativo.owner_id == user_username)
        .all()
    )
    total_investido_bruto = sum(a.valor_atual_bruto for a in ativos)
    posicao_fiis = sum(
        a.valor_atual_bruto for a in ativos if "FII" in (a.categoria or "").upper()
    )
    posicao_cripto = sum(
        a.valor_atual_bruto
        for a in ativos
        if a.tipo_indexador == "CRYPTO" or "CRIPTO" in (a.categoria or "").upper()
    )

    passivos = (
        db.query(inv_models.Passivo)
        .filter(inv_models.Passivo.owner_id == user_username)
        .all()
    )
    total_dividas = sum(p.saldo_devedor for p in passivos)

    faturas = reconciliation_service.get_future_invoices_summary(
        db, user_username, limit_months=3
    )

    incomes = (
        db.query(func.sum(cashflow_models.Movimentacao.valor))
        .filter(
            cashflow_models.Movimentacao.owner_id == user_username,
            cashflow_models.Movimentacao.valor > 0,
            extract("month", cashflow_models.Movimentacao.data) == now.month,
            extract("year", cashflow_models.Movimentacao.data) == now.year,
        )
        .scalar()
        or 0.0
    )

    expenses = (
        db.query(func.sum(cashflow_models.Movimentacao.valor))
        .filter(
            cashflow_models.Movimentacao.owner_id == user_username,
            cashflow_models.Movimentacao.valor < 0,
            extract("month", cashflow_models.Movimentacao.data) == now.month,
            extract("year", cashflow_models.Movimentacao.data) == now.year,
        )
        .scalar()
        or 0.0
    )

    return {
        "data_hoje": now.strftime("%Y-%m-%d"),
        "patrimonio": {
            "total_ativos": round(total_investido_bruto, 2),
            "total_dividas": round(total_dividas, 2),
            "patrimonio_liquido": round(total_investido_bruto - total_dividas, 2),
            "destaque_fiis": round(posicao_fiis, 2),
            "destaque_cripto": round(posicao_cripto, 2),
        },
        "mes_atual": {
            "receitas": round(incomes, 2),
            "despesas": round(abs(expenses), 2),
            "saldo_parcial": round(incomes + expenses, 2),
        },
        "projecao_faturas": faturas,
    }


def buscar_historico_estabelecimento(
    db: Session, user_username: str, estabelecimento: str
) -> dict:
    term = f"%{estabelecimento}%"
    records = (
        db.query(cashflow_models.Movimentacao)
        .filter(
            cashflow_models.Movimentacao.owner_id == user_username,
            cashflow_models.Movimentacao.descricao.ilike(term),
        )
        .order_by(cashflow_models.Movimentacao.data.desc())
        .limit(10)
        .all()
    )
    total_gasto = sum(abs(r.valor) for r in records if r.valor < 0)

    return {
        "estabelecimento": estabelecimento,
        "total_encontrado": round(total_gasto, 2),
        "qtd_transacoes": len(records),
        "transacoes": [
            {
                "data": r.data.strftime("%Y-%m-%d"),
                "descricao": r.descricao,
                "valor": r.valor,
                "categoria": r.categoria,
            }
            for r in records
        ],
    }


def detalhar_posicao_ativo(db: Session, user_username: str, ticker: str) -> dict:
    term = f"%{ticker.upper().strip()}%"
    ativo = (
        db.query(inv_models.Ativo)
        .filter(
            inv_models.Ativo.owner_id == user_username,
            inv_models.Ativo.ticker.ilike(term),
        )
        .first()
    )
    if not ativo:
        return {"error": f"Ticker '{ticker}' não encontrado."}

    return {
        "nome": ativo.nome,
        "ticker": ativo.ticker,
        "categoria": ativo.categoria,
        "valor_atual_bruto": ativo.valor_atual_bruto,
        "valor_liquido_estimado": ativo.valor_liquido_estimado,
    }


AVAILABLE_TOOLS = {
    "buscar_historico_estabelecimento": buscar_historico_estabelecimento,
    "detalhar_posicao_ativo": detalhar_posicao_ativo,
}

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "buscar_historico_estabelecimento",
            "description": "Busca compras efetuadas em uma loja específica (ex: Shopee, Amazon, Uber).",
            "parameters": {
                "type": "object",
                "properties": {
                    "estabelecimento": {
                        "type": "string",
                        "description": "Nome da loja ou banco.",
                    }
                },
                "required": ["estabelecimento"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "detalhar_posicao_ativo",
            "description": "Retorna o saldo e posição de um investimento pelo ticker (ex: MXRF11, BTC).",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {"type": "string", "description": "Código do ativo."}
                },
                "required": ["ticker"],
            },
        },
    },
]
