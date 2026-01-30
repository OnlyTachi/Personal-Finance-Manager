from sqlalchemy.orm import Session
from sqlalchemy import func
from app.modules.history import models as history_models
from app.modules.investments import models as inv_models
from app.modules.investments.service import calculate_future_value, CURRENT_CDI_RATE
from datetime import timedelta, date, datetime


def rebuild_user_history(db: Session, user_username: str):
    """
    Reconstrói completamente o histórico do usuário baseado nas transações.
    """
    try:
        # 1. Limpa histórico antigo
        db.query(history_models.Snapshot).filter(
            history_models.Snapshot.owner_id == user_username
        ).delete()

        # 2. Busca todas as transações
        transacoes = (
            db.query(inv_models.Transacao)
            .join(inv_models.Ativo)
            .filter(inv_models.Ativo.owner_id == user_username)
            .order_by(inv_models.Transacao.timestamp.asc())
            .all()
        )

        if not transacoes:
            snap = history_models.Snapshot(
                owner_id=user_username,
                timestamp=datetime.now(),
                valor_total_bruto=0.0,
                valor_total_investido=0.0,
                total_aportes=0.0,
                total_saques=0.0,
            )
            db.add(snap)
            db.commit()
            return

        # 3. Datas únicas
        datas_relevantes = set(t.timestamp.date() for t in transacoes)
        datas_relevantes.add(date.today())
        sorted_dates = sorted(list(datas_relevantes))

        ativos = (
            db.query(inv_models.Ativo)
            .filter(inv_models.Ativo.owner_id == user_username)
            .all()
        )

        # 4. Loop de reconstrução
        for data_alvo in sorted_dates:
            data_referencia = datetime(
                data_alvo.year, data_alvo.month, data_alvo.day, 23, 59, 59
            )

            valor_total_bruto = 0.0
            valor_total_investido = 0.0

            # Fluxo do dia (Apenas transações que aconteceram EXATAMENTE nesta data)
            fluxo_aportes = 0.0
            fluxo_saques = 0.0

            # Calcula fluxo do dia globalmente antes de entrar nos ativos (mais eficiente)
            for t in transacoes:
                if t.timestamp.date() == data_alvo:
                    if t.tipo == "Aporte":
                        fluxo_aportes += t.valor
                    elif t.tipo == "Saque":
                        fluxo_saques += t.valor

            # Calcula Saldos Acumulados
            for ativo in ativos:
                txs_ate_data = [
                    t for t in ativo.transacoes if t.timestamp <= data_referencia
                ]
                if not txs_ate_data:
                    continue

                # Renda Fixa
                if ativo.tipo_indexador not in ["B3", "CRYPTO", "USA"]:
                    taxa_efetiva = ativo.valor_taxa
                    if ativo.tipo_indexador == "CDI":
                        taxa_efetiva = CURRENT_CDI_RATE * (ativo.valor_taxa / 100.0)

                    lotes = []
                    investido_ativo = 0.0
                    for t in txs_ate_data:
                        if t.tipo == "Aporte":
                            val_futuro = calculate_future_value(
                                t.valor, t.timestamp, taxa_efetiva, data_referencia
                            )
                            lotes.append({"val": val_futuro, "principal": t.valor})
                            investido_ativo += t.valor
                        elif t.tipo == "Saque":
                            saldo_momento = sum(l["val"] for l in lotes)
                            if saldo_momento > 0:
                                ratio = 1 - (t.valor / saldo_momento)
                                for l in lotes:
                                    l["val"] *= ratio
                                    l["principal"] *= ratio
                                investido_ativo -= t.valor

                    valor_total_bruto += sum(l["val"] for l in lotes)
                    valor_total_investido += max(0, investido_ativo)

                # Renda Variável
                else:
                    custo_acumulado = 0.0
                    for t in txs_ate_data:
                        if t.tipo == "Aporte":
                            custo_acumulado += t.valor
                        elif t.tipo == "Saque":
                            custo_acumulado -= t.valor

                    if data_alvo == date.today() and ativo.valor_atual_bruto > 0:
                        valor_total_bruto += ativo.valor_atual_bruto
                    else:
                        valor_total_bruto += max(0, custo_acumulado)

                    valor_total_investido += max(0, custo_acumulado)

            # Salva Snapshot
            snap = history_models.Snapshot(
                owner_id=user_username,
                timestamp=data_referencia,
                valor_total_bruto=round(valor_total_bruto, 2),
                valor_total_investido=round(valor_total_investido, 2),
                total_aportes=round(fluxo_aportes, 2),
                total_saques=round(fluxo_saques, 2),
            )
            db.add(snap)

        db.commit()

    except Exception as e:
        db.rollback()
        print(f"Erro ao reconstruir histórico: {e}")


def get_history(db: Session, user_username: str):
    return (
        db.query(history_models.Snapshot)
        .filter(history_models.Snapshot.owner_id == user_username)
        .order_by(history_models.Snapshot.timestamp.asc())
        .all()
    )
