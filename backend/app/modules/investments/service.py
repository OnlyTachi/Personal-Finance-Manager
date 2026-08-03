from sqlalchemy import func, extract
from sqlalchemy.orm import Session
from app.modules.investments import models, schemas
from app.modules.investments import price_service
from app.modules.history.models import Snapshot
from app.modules.cashflow.models import Movimentacao
from datetime import date, datetime, timedelta
import math
import logging
from app.core import market_data

# Configuração de Logger
logger = logging.getLogger(__name__)

TABELA_IOF = {
    0: 100,
    1: 96,
    2: 93,
    3: 90,
    4: 86,
    5: 83,
    6: 80,
    7: 76,
    8: 73,
    9: 70,
    10: 66,
    11: 63,
    12: 60,
    13: 56,
    14: 53,
    15: 50,
    16: 46,
    17: 43,
    18: 40,
    19: 36,
    20: 33,
    21: 30,
    22: 26,
    23: 23,
    24: 20,
    25: 16,
    26: 13,
    27: 10,
    28: 6,
    29: 3,
}


def get_aliquota_ir(dias: int) -> float:
    if dias <= 180:
        return 0.225
    elif dias <= 360:
        return 0.20
    elif dias <= 720:
        return 0.175
    else:
        return 0.15


def get_asset_by_id(db: Session, asset_id: str):
    return db.query(models.Ativo).filter(models.Ativo.id == asset_id).first()


def calculate_future_value(
    valor_original: float,
    data_original: datetime,
    taxa_anual_efetiva: float,
    data_referencia: datetime = None,
) -> float:
    if data_referencia is None:
        data_referencia = datetime.now()
    if taxa_anual_efetiva <= 0 or valor_original <= 0:
        return valor_original
    dias_corridos = (data_referencia - data_original).days
    if dias_corridos <= 0:
        return valor_original
    dias_uteis = int(dias_corridos * (5 / 7))
    taxa_diaria = (1 + taxa_anual_efetiva / 100) ** (1 / 252) - 1
    fator = (1 + taxa_diaria) ** dias_uteis
    return valor_original * fator


def update_asset_balance(db: Session, asset: models.Ativo):
    if asset.tipo_indexador in ["B3", "CRYPTO", "USA"]:
        return

    taxa_efetiva = asset.valor_taxa
    if asset.tipo_indexador == "CDI":
        taxa_efetiva = market_data.get_current_cdi() * (asset.valor_taxa / 100.0)

    transacoes = (
        db.query(models.Transacao)
        .filter(models.Transacao.ativo_id == asset.id)
        .order_by(models.Transacao.timestamp.asc())
        .all()
    )

    lotes = []
    data_hoje = datetime.now()

    for t in transacoes:
        if t.tipo == "Aporte":
            val_atualizado = calculate_future_value(
                t.valor, t.timestamp, taxa_efetiva, data_hoje
            )
            lotes.append(
                {
                    "data": t.timestamp,
                    "principal_restante": t.valor,
                    "valor_atual": val_atualizado,
                }
            )
        elif t.tipo == "Saque":
            valor_a_deduzir = t.valor
            for lote in lotes:
                if valor_a_deduzir <= 0.001:
                    break
                if lote["valor_atual"] <= 0.001:
                    continue
                if valor_a_deduzir >= lote["valor_atual"]:
                    valor_a_deduzir -= lote["valor_atual"]
                    lote["valor_atual"] = 0.0
                    lote["principal_restante"] = 0.0
                else:
                    pct_removido = valor_a_deduzir / lote["valor_atual"]
                    lote["valor_atual"] -= valor_a_deduzir
                    lote["principal_restante"] -= (
                        lote["principal_restante"] * pct_removido
                    )
                    valor_a_deduzir = 0.0

    saldo_bruto = 0.0
    imposto_total = 0.0
    is_isento = (
        "LCI" in str(asset.nome).upper()
        or "LCA" in str(asset.nome).upper()
        or "ISENTO" in str(asset.nome).upper()
    )

    for lote in lotes:
        if lote["valor_atual"] > 0.01:
            saldo_bruto += lote["valor_atual"]
            lucro = lote["valor_atual"] - lote["principal_restante"]
            if lucro > 0:
                dias = (data_hoje - lote["data"]).days
                aliq_iof = TABELA_IOF.get(dias, 0) / 100.0 if dias < 30 else 0.0
                val_iof = lucro * aliq_iof
                base_ir = lucro - val_iof
                aliq_ir = 0.0 if is_isento else get_aliquota_ir(dias)
                val_ir = base_ir * aliq_ir
                imposto_total += val_iof + val_ir

    asset.valor_atual_bruto = round(saldo_bruto, 2)
    asset.imposto_estimado = round(imposto_total, 2)
    asset.valor_liquido_estimado = round(saldo_bruto - imposto_total, 2)
    db.add(asset)
    db.commit()


def create_transaction(db: Session, transaction_in: schemas.TransacaoCreate):
    transaction = models.Transacao(**transaction_in.model_dump())
    db.add(transaction)
    asset = get_asset_by_id(db, transaction_in.ativo_id)
    if asset:
        if asset.tipo_indexador in ["B3", "CRYPTO", "USA"]:
            if transaction_in.tipo == "Aporte":
                asset.valor_atual_bruto += transaction_in.valor
                asset.valor_liquido_estimado += transaction_in.valor
            elif transaction_in.tipo == "Saque":
                asset.valor_atual_bruto -= transaction_in.valor
                val_liq = (
                    transaction_in.valor_liquido
                    if transaction_in.valor_liquido
                    else transaction_in.valor
                )
                asset.valor_liquido_estimado -= val_liq
            db.add(asset)
            db.commit()
        else:
            db.commit()
            update_asset_balance(db, asset)
    db.refresh(transaction)
    return transaction


def delete_transaction(db: Session, transaction_id: str):
    t = db.query(models.Transacao).filter(models.Transacao.id == transaction_id).first()
    if not t:
        raise Exception("Transação não encontrada")
    asset_id = t.ativo_id
    db.delete(t)
    db.commit()
    asset = get_asset_by_id(db, asset_id)
    if asset:
        update_asset_balance(db, asset)
    return {"message": "Transação excluída."}


def delete_asset(db: Session, asset_id: str):
    asset = get_asset_by_id(db, asset_id)
    if not asset:
        raise Exception("Ativo não encontrado")
    db.delete(asset)
    db.commit()
    return {"message": "Ativo excluído."}


def calculate_asset_quantity(db: Session, asset_id: str) -> float:
    transacoes = (
        db.query(models.Transacao).filter(models.Transacao.ativo_id == asset_id).all()
    )
    qtd = 0.0
    for t in transacoes:
        if t.tipo == "Aporte":
            qtd += t.quantidade or 0.0
        elif t.tipo == "Saque":
            qtd -= t.quantidade or 0.0
    return max(0.0, qtd)


def simulate_withdrawal_fifo(
    db: Session, asset_id: str, valor_saque_bruto: float
) -> schemas.SimulacaoSaque:
    asset = get_asset_by_id(db, asset_id)
    if not asset:
        raise Exception("Ativo não encontrado")

    taxa_efetiva = asset.valor_taxa
    if asset.tipo_indexador == "CDI":
        taxa_efetiva = market_data.get_current_cdi() * (asset.valor_taxa / 100.0)

    transacoes = (
        db.query(models.Transacao)
        .filter(models.Transacao.ativo_id == asset.id)
        .order_by(models.Transacao.timestamp.asc())
        .all()
    )
    lotes = []
    data_hoje = datetime.now()

    for t in transacoes:
        if t.tipo == "Aporte":
            val_atual = calculate_future_value(
                t.valor, t.timestamp, taxa_efetiva, data_hoje
            )
            fator_crescimento = val_atual / t.valor if t.valor > 0 else 1.0
            lotes.append(
                {
                    "id": t.id,
                    "data": t.timestamp,
                    "principal_restante": t.valor,
                    "fator_crescimento": fator_crescimento,
                }
            )
        elif t.tipo == "Saque":
            valor_a_deduzir = t.valor
            for lote in lotes:
                if valor_a_deduzir <= 0.001:
                    break
                valor_bruto_lote = (
                    lote["principal_restante"] * lote["fator_crescimento"]
                )
                if valor_bruto_lote <= 0.001:
                    continue
                if valor_a_deduzir >= valor_bruto_lote:
                    valor_a_deduzir -= valor_bruto_lote
                    lote["principal_restante"] = 0.0
                else:
                    principal_consumido = valor_a_deduzir / lote["fator_crescimento"]
                    lote["principal_restante"] -= principal_consumido
                    valor_a_deduzir = 0.0

    valor_restante_saque = valor_saque_bruto
    total_iof = 0.0
    total_ir = 0.0
    total_lucro = 0.0
    detalhes = []
    is_isento = (
        "LCI" in str(asset.nome).upper()
        or "LCA" in str(asset.nome).upper()
        or "ISENTO" in str(asset.nome).upper()
    )

    for lote in lotes:
        if valor_restante_saque <= 0.001:
            break
        if lote["principal_restante"] <= 0.001:
            continue
        valor_bruto_lote = lote["principal_restante"] * lote["fator_crescimento"]
        if valor_restante_saque >= valor_bruto_lote:
            qtd_sacada = valor_bruto_lote
            principal_sacado = lote["principal_restante"]
        else:
            qtd_sacada = valor_restante_saque
            principal_sacado = qtd_sacada / lote["fator_crescimento"]

        lucro = qtd_sacada - principal_sacado
        if lucro < 0:
            lucro = 0
        dias = (data_hoje - lote["data"]).days
        aliq_iof = TABELA_IOF.get(dias, 0) / 100.0 if dias < 30 else 0.0
        val_iof = lucro * aliq_iof
        base_ir = lucro - val_iof
        aliq_ir = 0.0 if is_isento else get_aliquota_ir(dias)
        val_ir = base_ir * aliq_ir
        total_iof += val_iof
        total_ir += val_ir
        total_lucro += lucro
        valor_restante_saque -= qtd_sacada
        detalhes.append(
            f"Lote {lote['data'].strftime('%d/%m/%Y')}: Sacado R$ {qtd_sacada:.2f} (Lucro R$ {lucro:.2f}, IR: {aliq_ir*100:.1f}%)"
        )

    return schemas.SimulacaoSaque(
        valor_bruto=valor_saque_bruto,
        valor_liquido=round(valor_saque_bruto - total_iof - total_ir, 2),
        total_imposto=round(total_iof + total_ir, 2),
        iof=round(total_iof, 2),
        ir=round(total_ir, 2),
        lucro_realizado=round(total_lucro, 2),
        detalhes=detalhes,
    )


def refresh_all_assets_prices(db: Session):
    assets = db.query(models.Ativo).all()
    count = 0
    for asset in assets:
        if asset.tipo_indexador in ["B3", "CRYPTO", "USA"] and asset.ticker:
            preco = price_service.get_price(asset.ticker, asset.tipo_indexador)
            if preco > 0:
                qtd = calculate_asset_quantity(db, asset.id)
                asset.valor_atual_bruto = round(qtd * preco, 2)
                asset.valor_liquido_estimado = asset.valor_atual_bruto
                db.add(asset)
                count += 1
        elif asset.tipo_indexador in ["CDI", "PRE", "IPCA"]:
            update_asset_balance(db, asset)
            count += 1
    db.commit()
    return {"message": f"Atualizados: {count}"}


def create_passivo_with_installments(
    db: Session, passivo_in: schemas.PassivoCreate, user_id: str
):
    passivo_data = passivo_in.model_dump()
    passivo = models.Passivo(**passivo_data, owner_id=user_id)

    # Gera parcelas automaticamente se houver prazo e valor
    if passivo.prazo_meses > 0 and passivo.valor_parcela > 0:
        data_base = passivo.data_inicio or datetime.now()
        for i in range(1, passivo.prazo_meses + 1):
            vencimento = data_base + timedelta(days=30 * i)
            parcela = models.Parcela(
                numero=i,
                data_vencimento=vencimento,
                valor=passivo.valor_parcela,
                status="Pendente",
            )
            passivo.parcelas.append(parcela)

    db.add(passivo)
    db.commit()
    db.refresh(passivo)
    return passivo


def toggle_parcela_payment(db: Session, passivo_id: str, parcela_id: str, user_id: str):
    passivo = (
        db.query(models.Passivo)
        .filter(models.Passivo.id == passivo_id, models.Passivo.owner_id == user_id)
        .first()
    )
    if not passivo:
        raise Exception("Passivo não encontrado")

    parcela = (
        db.query(models.Parcela)
        .filter(
            models.Parcela.id == parcela_id, models.Parcela.passivo_id == passivo_id
        )
        .first()
    )
    if not parcela:
        raise Exception("Parcela não encontrada")

    if parcela.status == "Pendente":
        parcela.status = "Pago"
        parcela.data_pagamento = datetime.now()
        passivo.saldo_devedor -= parcela.valor
    else:
        parcela.status = "Pendente"
        parcela.data_pagamento = None
        passivo.saldo_devedor += parcela.valor

    if passivo.saldo_devedor < 0:
        passivo.saldo_devedor = 0

    db.commit()
    db.refresh(passivo)
    return passivo


# --- Lógica de Goals (Metas) ---


def create_goal(db: Session, goal_in: schemas.GoalCreate, user_id: str):
    goal = models.Goal(**goal_in.model_dump(), owner_id=user_id)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


def update_goal(db: Session, goal_id: str, goal_in: schemas.GoalUpdate, user_id: str):
    goal = (
        db.query(models.Goal)
        .filter(models.Goal.id == goal_id, models.Goal.owner_id == user_id)
        .first()
    )
    if not goal:
        raise Exception("Meta não encontrada")

    from app.modules.notifications import service as notif_service

    if goal.valor_atual >= goal.valor_alvo:
        notif_service.check_goal_reached_alerts(db, user_id, goal.nome, goal.valor_alvo)

    update_data = goal_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(goal, key, value)

    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


def delete_goal(db: Session, goal_id: str, user_id: str):
    goal = (
        db.query(models.Goal)
        .filter(models.Goal.id == goal_id, models.Goal.owner_id == user_id)
        .first()
    )
    if not goal:
        raise Exception("Meta não encontrada")
    db.delete(goal)
    db.commit()
    return {"message": "Meta excluída"}


def update_asset(db: Session, asset_id: str, asset_in: schemas.AtivoUpdate):
    asset = get_asset_by_id(db, asset_id)
    if not asset:
        raise Exception("Ativo não encontrado")

    update_data = asset_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(asset, key, value)

    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def update_transaction(
    db: Session, transaction_id: str, tx_in: schemas.TransacaoUpdate
):
    t = db.query(models.Transacao).filter(models.Transacao.id == transaction_id).first()
    if not t:
        raise Exception("Transação não encontrada")

    update_data = tx_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(t, key, value)

    db.add(t)
    db.commit()

    asset = get_asset_by_id(db, t.ativo_id)
    if asset:
        update_asset_balance(db, asset)

    db.refresh(t)
    return t
