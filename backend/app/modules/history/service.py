from sqlalchemy.orm import Session
from collections import defaultdict
from app.modules.history import models as history_models
from app.modules.investments import models as inv_models
from app.modules.investments.service import calculate_future_value
from app.core.market_data import get_current_cdi
from datetime import date, datetime


def rebuild_user_history(db: Session, user_username: str):
    """
    Reconstrói completamente o histórico do usuário usando deltas (State Machine)
    para performance O(N) e bulk insert.
    """
    try:
        db.query(history_models.Snapshot).filter(
            history_models.Snapshot.owner_id == user_username
        ).delete()

        ativos = (
            db.query(inv_models.Ativo)
            .filter(inv_models.Ativo.owner_id == user_username)
            .all()
        )
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

        transacoes_por_dia = defaultdict(list)
        datas_relevantes = set()

        for t in transacoes:
            d = t.timestamp.date()
            transacoes_por_dia[d].append(t)
            datas_relevantes.add(d)

        datas_relevantes.add(date.today())
        sorted_dates = sorted(list(datas_relevantes))

        carteira_state = {
            a.id: {
                "ativo": a,
                "lotes": [],  # Guarda dicionários {"principal": X, "data_aporte": Y}
                "investido_ativo": 0.0,
                "rv_custo_acumulado": 0.0,
            }
            for a in ativos
        }

        snapshots_to_insert = []
        cdi_atual = get_current_cdi()

        for data_alvo in sorted_dates:
            data_referencia = datetime(
                data_alvo.year, data_alvo.month, data_alvo.day, 23, 59, 59
            )

            fluxo_aportes = 0.0
            fluxo_saques = 0.0

            for t in transacoes_por_dia[data_alvo]:
                state = carteira_state.get(t.ativo_id)
                if not state:
                    continue

                ativo = state["ativo"]

                if t.tipo == "Aporte":
                    fluxo_aportes += t.valor
                    if ativo.tipo_indexador not in ["B3", "CRYPTO", "USA"]:
                        state["lotes"].append(
                            {"principal": t.valor, "data_aporte": t.timestamp}
                        )
                        state["investido_ativo"] += t.valor
                    else:
                        state["rv_custo_acumulado"] += t.valor

                elif t.tipo == "Saque":
                    fluxo_saques += t.valor
                    if ativo.tipo_indexador not in ["B3", "CRYPTO", "USA"]:
                        taxa_efetiva = ativo.valor_taxa
                        if ativo.tipo_indexador == "CDI":
                            taxa_efetiva = cdi_atual * (ativo.valor_taxa / 100.0)

                        saldo_momento = 0.0
                        for lote in state["lotes"]:
                            saldo_momento += calculate_future_value(
                                lote["principal"],
                                lote["data_aporte"],
                                taxa_efetiva,
                                t.timestamp,
                            )

                        if saldo_momento > 0:
                            ratio = 1 - (t.valor / saldo_momento)
                            for lote in state["lotes"]:
                                lote["principal"] *= ratio
                            state["investido_ativo"] -= t.valor
                    else:
                        state["rv_custo_acumulado"] -= t.valor

            valor_total_bruto = 0.0
            valor_total_investido = 0.0

            for state in carteira_state.values():
                ativo = state["ativo"]

                if ativo.tipo_indexador not in ["B3", "CRYPTO", "USA"]:
                    taxa_efetiva = ativo.valor_taxa
                    if ativo.tipo_indexador == "CDI":
                        taxa_efetiva = cdi_atual * (ativo.valor_taxa / 100.0)

                    for lote in state["lotes"]:
                        valor_total_bruto += calculate_future_value(
                            lote["principal"],
                            lote["data_aporte"],
                            taxa_efetiva,
                            data_referencia,
                        )
                    valor_total_investido += max(0, state["investido_ativo"])
                else:
                    if data_alvo == date.today() and ativo.valor_atual_bruto > 0:
                        valor_total_bruto += ativo.valor_atual_bruto
                    else:
                        valor_total_bruto += max(0, state["rv_custo_acumulado"])
                    valor_total_investido += max(0, state["rv_custo_acumulado"])

            snapshots_to_insert.append(
                history_models.Snapshot(
                    owner_id=user_username,
                    timestamp=data_referencia,
                    valor_total_bruto=round(valor_total_bruto, 2),
                    valor_total_investido=round(valor_total_investido, 2),
                    total_aportes=round(fluxo_aportes, 2),
                    total_saques=round(fluxo_saques, 2),
                )
            )

        db.bulk_save_objects(snapshots_to_insert)
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
