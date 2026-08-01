from datetime import date, datetime, timedelta
import io
import csv

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.modules.auth.models import User
from app.modules.email.models import EmailAccount
from app.modules.history.models import Snapshot
from app.modules.investments.models import Ativo, Parcela, Passivo, Transacao
from app.modules.couple.service import calculate_settlement
from app.modules.reports import models, schemas
from app.modules.reports.schemas import CustomReportFilterInput
from app.modules.cashflow.models import BudgetLimitDB, Movimentacao

from app.modules.reports.services.pdf_service import convert_html_to_pdf
from app.core.templating import render_template
from app.modules.reports.services.excel_service import (
    generate_annual_excel,
    generate_custom_excel,
)


def generate_annual_excel_report(
    db: Session, user_username: str, year: int = None
) -> bytes:
    data = get_annual_report_data(db, user_username, year)
    return generate_annual_excel(data)


def generate_custom_excel_report(db: Session, user_username: str, filters) -> bytes:
    data = get_custom_report_data(db, user_username, filters)
    return generate_custom_excel(data)


def generate_monthly_pdf(
    db: Session, user_username: str, month: int = None, year: int = None
) -> bytes:
    data = get_monthly_report_data(db, user_username, month, year)
    html = render_template("reports/monthly_report.html", {"data": data})
    return convert_html_to_pdf(html)


def generate_annual_pdf(db: Session, user_username: str, year: int = None) -> bytes:
    data = get_annual_report_data(db, user_username, year)
    html = render_template("reports/annual_report.html", {"data": data})
    return convert_html_to_pdf(html)


def generate_custom_pdf(db: Session, user_username: str, filters) -> bytes:
    data = get_custom_report_data(db, user_username, filters)
    html = render_template("reports/custom_report.html", {"data": data})
    return convert_html_to_pdf(html)


def get_or_create_preferences(db: Session, username: str) -> models.ReportPreference:
    """Retorna as preferências de relatório ou cria o padrão com o e-mail da conta vinculada."""
    pref = (
        db.query(models.ReportPreference)
        .filter(models.ReportPreference.owner_id == username)
        .first()
    )

    if not pref:
        email_acc = (
            db.query(EmailAccount)
            .filter(EmailAccount.owner_id == username, EmailAccount.is_active == True)
            .first()
        )

        default_email = email_acc.email if email_acc else None

        pref = models.ReportPreference(
            owner_id=username,
            contact_email=default_email,
            daily_enabled=True,
            daily_time="08:00",
        )
        db.add(pref)
        db.commit()
        db.refresh(pref)

    return pref


def update_preferences(
    db: Session, username: str, pref_in: schemas.ReportPreferenceUpdate
):
    pref = get_or_create_preferences(db, username)
    update_data = pref_in.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        setattr(pref, key, value)

    db.add(pref)
    db.commit()
    db.refresh(pref)
    return pref


def get_daily_checkup_data(db: Session, user_username: str) -> dict:
    """
    Coleta o resumo financeiro do dia anterior para o Check-up Diário.
    """
    today = date.today()
    yesterday = today - timedelta(days=1)

    # 1. Movimentações do dia anterior (Entradas e Saídas)
    movs_yesterday = (
        db.query(Movimentacao)
        .filter(
            Movimentacao.owner_id == user_username,
            func.date(Movimentacao.data) == yesterday,
        )
        .all()
    )

    total_saidas_ontem = sum(abs(m.valor) for m in movs_yesterday if m.valor < 0)
    total_entradas_ontem = sum(m.valor for m in movs_yesterday if m.valor > 0)

    # Agrupamento de gastos por categoria no dia anterior
    gastos_por_categoria = {}
    for m in movs_yesterday:
        if m.valor < 0:
            cat = m.categoria or "Outros"
            gastos_por_categoria[cat] = gastos_por_categoria.get(cat, 0.0) + abs(
                m.valor
            )

    # 2. Contas / Parcelas de Dívidas vencendo Hoje ou Amanhã
    tomorrow = today + timedelta(days=1)
    parcelas_vencendo = (
        db.query(Parcela)
        .join(Passivo)
        .filter(
            Passivo.owner_id == user_username,
            Parcela.status == "Pendente",
            func.date(Parcela.data_vencimento).in_([today, tomorrow]),
        )
        .all()
    )

    contas_alerta = [
        {
            "nome": f"{p.passivo.nome} (Parc. {p.numero})",
            "valor": p.valor,
            "vencimento": p.data_vencimento.strftime("%d/%m/%Y"),
            "is_hoje": p.data_vencimento.date() == today,
        }
        for p in parcelas_vencendo
    ]

    # 3. Balanço do Casal nas últimas 24h (se houver parceiro vinculado)
    from app.modules.auth.models import User

    user = db.query(User).filter(User.username == user_username).first()
    casal_summary = None

    if user and user.partner_id:
        partner = db.query(User).filter(User.username == user.partner_id).first()
        if partner and partner.partner_id == user_username:
            # Gastos compartilhados do mês atual para ambos
            user_shared = (
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
            partner_shared = (
                db.query(func.sum(Movimentacao.valor))
                .filter(
                    Movimentacao.owner_id == partner.username,
                    Movimentacao.shared == True,
                    Movimentacao.valor < 0,
                    extract("month", Movimentacao.data) == today.month,
                    extract("year", Movimentacao.data) == today.year,
                )
                .scalar()
                or 0.0
            )
            casal_summary = calculate_settlement(user_shared, partner_shared)
            casal_summary["partner_username"] = partner.username

    LIMITES_ORCAMENTO_PADRAO = {
        "Alimentação": 1500.0,
        "Lazer & Assinaturas": 500.0,
        "Transporte": 800.0,
        "Compras": 1000.0,
    }

    db_budgets = (
        db.query(BudgetLimitDB).filter(BudgetLimitDB.owner_id == user_username).all()
    )
    user_budgets_map = {b.categoria: b.limite_mensal for b in db_budgets}

    alertas_orcamento = []
    for cat, valor_ontem in gastos_por_categoria.items():
        limite = user_budgets_map.get(cat, LIMITES_ORCAMENTO_PADRAO.get(cat))

        if limite:
            total_mes = (
                db.query(func.sum(Movimentacao.valor))
                .filter(
                    Movimentacao.owner_id == user_username,
                    Movimentacao.categoria == cat,
                    Movimentacao.valor < 0,
                    extract("month", Movimentacao.data) == today.month,
                    extract("year", Movimentacao.data) == today.year,
                )
                .scalar()
                or 0.0
            )
            gastado_total = abs(total_mes)
            porcentagem = (gastado_total / limite) * 100
            if porcentagem >= 80:
                alertas_orcamento.append(
                    {
                        "categoria": cat,
                        "gastado": round(gastado_total, 2),
                        "limite": limite,
                        "porcentagem": round(porcentagem, 1),
                        "is_estourado": porcentagem >= 100,
                    }
                )
    return {
        "user_username": user_username,
        "data_referencia": yesterday.strftime("%d/%m/%Y"),
        "total_saidas_ontem": round(total_saidas_ontem, 2),
        "total_entradas_ontem": round(total_entradas_ontem, 2),
        "gastos_por_categoria": gastos_por_categoria,
        "qtd_lancamentos_ontem": len(movs_yesterday),
        "contas_vencendo": contas_alerta,
        "alertas_orcamento": alertas_orcamento,
        "casal_summary": casal_summary,
    }


def get_weekly_report_data(db: Session, user_username: str) -> dict:
    """
    Coleta os dados dos últimos 7 dias completos para o Relatório Semanal.
    """
    today = date.today()
    start_date = today - timedelta(days=7)
    end_date = today - timedelta(days=1)

    movs_week = (
        db.query(Movimentacao)
        .filter(
            Movimentacao.owner_id == user_username,
            func.date(Movimentacao.data) >= start_date,
            func.date(Movimentacao.data) <= end_date,
        )
        .all()
    )

    total_entradas = sum(m.valor for m in movs_week if m.valor > 0)
    total_saidas = sum(abs(m.valor) for m in movs_week if m.valor < 0)

    # 1. Agrupamento por Dia (com flag de Fim de Semana)
    # Mapeamento: Python weekday: 0=Segunda, 5=Sábado, 6=Domingo
    dias_semana_nome = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    gastos_por_dia = []
    total_fds = 0.0
    total_semana = 0.0

    for i in range(7):
        current_dt = start_date + timedelta(days=i)
        movs_dia = [m for m in movs_week if m.data.date() == current_dt]
        gasto_dia = sum(abs(m.valor) for m in movs_dia if m.valor < 0)

        is_weekend = current_dt.weekday() >= 5
        if is_weekend:
            total_fds += gasto_dia
        else:
            total_semana += gasto_dia

        gastos_por_dia.append(
            {
                "data": current_dt.strftime("%d/%m"),
                "dia_nome": dias_semana_nome[current_dt.weekday()],
                "gasto": round(gasto_dia, 2),
                "is_weekend": is_weekend,
            }
        )

    # 2. Top 3 Categorias de Consumo
    cat_totals = {}
    for m in movs_week:
        if m.valor < 0:
            cat = m.categoria or "Outros"
            cat_totals[cat] = cat_totals.get(cat, 0.0) + abs(m.valor)

    sorted_cats = sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)
    top_3_categorias = [
        {"categoria": cat, "valor": round(val, 2)} for cat, val in sorted_cats[:3]
    ]

    # 3. Insights Automáticos de Comportamento
    insights = []

    # Insight 1: Concentração de gastos no Fim de Semana
    if total_saidas > 0:
        pct_fds = (total_fds / total_saidas) * 100
        if pct_fds >= 40:
            insights.append(
                {
                    "tipo": "warning",
                    "texto": f"<strong>Fim de semana pesado:</strong> {pct_fds:.0f}% dos seus gastos da semana concentraram-se no sábado e domingo (R$ {total_fds:.2f}).",
                }
            )

    # Insight 2: Destaque da Categoria Campeã
    if top_3_categorias:
        top_cat = top_3_categorias[0]
        if total_saidas > 0:
            pct_top = (top_cat["valor"] / total_saidas) * 100
            if pct_top >= 35:
                insights.append(
                    {
                        "tipo": "info",
                        "texto": f"A categoria <strong>{top_cat['categoria']}</strong> representou {pct_top:.0f}% de todas as suas despesas na semana.",
                    }
                )

    # Insight 3: Alta em Alimentação/Delivery/Lazer
    gasto_alimentacao = cat_totals.get("Alimentação", 0.0) + cat_totals.get(
        "Lazer & Assinaturas", 0.0
    )
    if total_saidas > 0 and (gasto_alimentacao / total_saidas) >= 0.30:
        insights.append(
            {
                "tipo": "warning",
                "texto": f"<strong>Alerta de Consumo:</strong> Alimentação e Lazer somaram R$ {gasto_alimentacao:.2f} nesta semana. Vale a pena revisar pedir menos delivery!",
            }
        )

    if not insights:
        insights.append(
            {
                "tipo": "success",
                "texto": "<strong>Excelente ritmo!</strong> Seus gastos foram equilibrados ao longo dos dias nesta semana.",
            }
        )

    # 4. Saldo Parcial do Acerto de Contas (Casal/Solteiro)
    from app.modules.auth.models import User

    user = db.query(User).filter(User.username == user_username).first()
    casal_summary = None

    if user and user.partner_id:
        partner = db.query(User).filter(User.username == user.partner_id).first()
        if partner and partner.partner_id == user_username:
            user_shared = (
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
            partner_shared = (
                db.query(func.sum(Movimentacao.valor))
                .filter(
                    Movimentacao.owner_id == partner.username,
                    Movimentacao.shared == True,
                    Movimentacao.valor < 0,
                    extract("month", Movimentacao.data) == today.month,
                    extract("year", Movimentacao.data) == today.year,
                )
                .scalar()
                or 0.0
            )
            casal_summary = calculate_settlement(user_shared, partner_shared)
            casal_summary["partner_username"] = partner.username

    return {
        "user_username": user_username,
        "periodo_texto": f"{start_date.strftime('%d/%m')} a {end_date.strftime('%d/%m/%Y')}",
        "total_saidas_semana": round(total_saidas, 2),
        "total_entradas_semana": round(total_entradas, 2),
        "gastos_por_dia": gastos_por_dia,
        "top_3_categorias": top_3_categorias,
        "insights": insights,
        "casal_summary": casal_summary,
    }


def get_monthly_report_data(
    db: Session, user_username: str, month: int = None, year: int = None
) -> dict:
    today = date.today()
    if not month or not year:
        first_day_this_month = today.replace(day=1)
        last_month_date = first_day_this_month - timedelta(days=1)
        month = last_month_date.month
        year = last_month_date.year

    receitas = (
        db.query(func.sum(Movimentacao.valor))
        .filter(
            Movimentacao.owner_id == user_username,
            Movimentacao.valor > 0,
            extract("month", Movimentacao.data) == month,
            extract("year", Movimentacao.data) == year,
        )
        .scalar()
        or 0.0
    )

    despesas = (
        db.query(func.sum(Movimentacao.valor))
        .filter(
            Movimentacao.owner_id == user_username,
            Movimentacao.valor < 0,
            extract("month", Movimentacao.data) == month,
            extract("year", Movimentacao.data) == year,
        )
        .scalar()
        or 0.0
    )
    despesas = abs(despesas)

    total_aportes_mes = (
        db.query(func.sum(Transacao.valor))
        .join(Ativo)
        .filter(
            Ativo.owner_id == user_username,
            Transacao.tipo == "Aporte",
            extract("month", Transacao.timestamp) == month,
            extract("year", Transacao.timestamp) == year,
        )
        .scalar()
        or 0.0
    )

    total_saques_mes = (
        db.query(func.sum(Transacao.valor))
        .join(Ativo)
        .filter(
            Ativo.owner_id == user_username,
            Transacao.tipo == "Saque",
            extract("month", Transacao.timestamp) == month,
            extract("year", Transacao.timestamp) == year,
        )
        .scalar()
        or 0.0
    )

    saldo_livre = receitas - despesas - total_aportes_mes

    snap_fim = (
        db.query(Snapshot)
        .filter(
            Snapshot.owner_id == user_username,
            extract("month", Snapshot.timestamp) == month,
            extract("year", Snapshot.timestamp) == year,
        )
        .order_by(Snapshot.timestamp.desc())
        .first()
    )

    prev_month = 12 if month == 1 else month - 1
    prev_year = year - 1 if month == 1 else year
    snap_inicio = (
        db.query(Snapshot)
        .filter(
            Snapshot.owner_id == user_username,
            extract("month", Snapshot.timestamp) == prev_month,
            extract("year", Snapshot.timestamp) == prev_year,
        )
        .order_by(Snapshot.timestamp.desc())
        .first()
    )

    patrimonio_inicial = snap_inicio.valor_total_bruto if snap_inicio else 0.0
    patrimonio_final = snap_fim.valor_total_bruto if snap_fim else 0.0
    variacao_patrimonio = patrimonio_final - patrimonio_inicial
    variacao_pct = (
        ((variacao_patrimonio / patrimonio_inicial) * 100)
        if patrimonio_inicial > 0
        else 0.0
    )

    user = db.query(User).filter(User.username == user_username).first()
    casal_summary = None
    if user and user.partner_id:
        partner = db.query(User).filter(User.username == user.partner_id).first()
        if partner and partner.partner_id == user_username:
            user_shared = (
                db.query(func.sum(Movimentacao.valor))
                .filter(
                    Movimentacao.owner_id == user_username,
                    Movimentacao.shared == True,
                    Movimentacao.valor < 0,
                    extract("month", Movimentacao.data) == month,
                    extract("year", Movimentacao.data) == year,
                )
                .scalar()
                or 0.0
            )

            partner_shared = (
                db.query(func.sum(Movimentacao.valor))
                .filter(
                    Movimentacao.owner_id == partner.username,
                    Movimentacao.shared == True,
                    Movimentacao.valor < 0,
                    extract("month", Movimentacao.data) == month,
                    extract("year", Movimentacao.data) == year,
                )
                .scalar()
                or 0.0
            )

            casal_summary = calculate_settlement(user_shared, partner_shared)
            casal_summary["partner_username"] = partner.username
    ativos = db.query(Ativo).filter(Ativo.owner_id == user_username).all()
    total_bruto_atual = sum(a.valor_atual_bruto for a in ativos)
    total_liquido_atual = sum(a.valor_liquido_estimado for a in ativos)
    total_investido = sum(
        a.valor_atual_bruto - (a.valor_atual_bruto - a.valor_liquido_estimado)
        for a in ativos
    )

    lucro_bruto = (
        patrimonio_final - patrimonio_inicial - (total_aportes_mes - total_saques_mes)
    )
    rentabilidade_bruta_pct = (
        (lucro_bruto / patrimonio_inicial * 100) if patrimonio_inicial > 0 else 0.0
    )

    # Estimativa Líquida
    total_imposto_estimado = sum(a.imposto_estimado for a in ativos)
    rentabilidade_liquida_pct = (
        ((lucro_bruto - total_imposto_estimado) / patrimonio_inicial * 100)
        if patrimonio_inicial > 0
        else 0.0
    )

    return {
        "periodo": f"{month:02d}/{year}",
        "fluxo_caixa": {
            "receitas": round(receitas, 2),
            "despesas": round(despesas, 2),
            "aportes": round(total_aportes_mes, 2),
            "saques": round(total_saques_mes, 2),
            "saldo_livre": round(saldo_livre, 2),
        },
        "patrimonio": {
            "inicial": round(patrimonio_inicial, 2),
            "final": round(patrimonio_final, 2),
            "variacao_absoluta": round(variacao_patrimonio, 2),
            "variacao_percentual": round(variacao_pct, 2),
        },
        "casal": casal_summary,
        "investimentos": {
            "patrimonio_bruto": round(total_bruto_atual, 2),
            "patrimonio_liquido_estimado": round(total_liquido_atual, 2),
            "rentabilidade_bruta_pct": round(rentabilidade_bruta_pct, 2),
            "rentabilidade_liquida_pct": round(rentabilidade_liquida_pct, 2),
        },
    }


def get_annual_report_data(db: Session, user_username: str, year: int = None) -> dict:
    if not year:
        year = (
            date.today().year - 1
        )  # Por padrão, pega o ano que fechou (ex: ano anterior para IRPF)

    receitas_totais = (
        db.query(func.sum(Movimentacao.valor))
        .filter(
            Movimentacao.owner_id == user_username,
            Movimentacao.valor > 0,
            extract("year", Movimentacao.data) == year,
        )
        .scalar()
        or 0.0
    )

    despesas_totais = (
        db.query(func.sum(Movimentacao.valor))
        .filter(
            Movimentacao.owner_id == user_username,
            Movimentacao.valor < 0,
            extract("year", Movimentacao.data) == year,
        )
        .scalar()
        or 0.0
    )
    despesas_totais = abs(despesas_totais)

    media_gastos_mensal = round(despesas_totais / 12, 2)
    total_economizado = round(receitas_totais - despesas_totais, 2)
    taxa_poupanca_pct = (
        round((total_economizado / receitas_totais * 100), 2)
        if receitas_totais > 0
        else 0.0
    )

    evolucao_patrimonial = []
    for mes in range(1, 13):
        last_snap = (
            db.query(Snapshot)
            .filter(
                Snapshot.owner_id == user_username,
                extract("month", Snapshot.timestamp) == mes,
                extract("year", Snapshot.timestamp) == year,
            )
            .order_by(Snapshot.timestamp.desc())
            .first()
        )

        evolucao_patrimonial.append(
            {
                "mes": mes,
                "patrimonio_bruto": (
                    round(last_snap.valor_total_bruto, 2) if last_snap else 0.0
                ),
                "patrimonio_investido": (
                    round(last_snap.valor_total_investido, 2)
                    if (last_snap and last_snap.valor_total_investido)
                    else 0.0
                ),
            }
        )

    ativos = db.query(Ativo).filter(Ativo.owner_id == user_username).all()
    saldos_irpf = []

    for a in ativos:

        txs_ate_fim_ano = [
            t for t in a.transacoes if t.timestamp <= datetime(year, 12, 31, 23, 59, 59)
        ]

        custo_acumulado = sum(
            t.valor for t in txs_ate_fim_ano if t.tipo == "Aporte"
        ) - sum(t.valor for t in txs_ate_fim_ano if t.tipo == "Saque")

        if custo_acumulado > 0:
            saldos_irpf.append(
                {
                    "nome": a.nome,
                    "ticker": a.ticker,
                    "categoria": a.categoria,
                    "tipo_indexador": a.tipo_indexador,
                    "saldo_31_12": round(max(0.0, custo_acumulado), 2),
                }
            )

    transacoes_ano = (
        db.query(Transacao)
        .join(Ativo)
        .filter(
            Ativo.owner_id == user_username,
            extract("year", Transacao.timestamp) == year,
        )
        .all()
    )

    rendimento_realizado_total = sum(
        t.rendimento_realizado or 0.0 for t in transacoes_ano
    )
    ir_pago_total = sum(t.ir_pago or 0.0 for t in transacoes_ano)
    iof_pago_total = sum(t.iof_pago or 0.0 for t in transacoes_ano)

    return {
        "ano": year,
        "retrospectiva": {
            "receitas_totais": round(receitas_totais, 2),
            "despesas_totais": round(despesas_totais, 2),
            "media_gastos_mensal": media_gastos_mensal,
            "total_economizado": total_economizado,
            "taxa_poupanca_pct": taxa_poupanca_pct,
        },
        "evolucao_patrimonial": evolucao_patrimonial,
        "irpf": {
            "saldos_31_12": saldos_irpf,
            "rendimento_realizado_total": round(rendimento_realizado_total, 2),
            "ir_pago_total": round(ir_pago_total, 2),
            "iof_pago_total": round(iof_pago_total, 2),
        },
    }


def get_custom_report_data(
    db: Session, user_username: str, filters: CustomReportFilterInput
) -> dict:
    dt_inicio = datetime.combine(filters.data_inicio, datetime.min.time())
    dt_fim = datetime.combine(filters.data_fim, datetime.max.time())

    query = db.query(Movimentacao).filter(
        Movimentacao.owner_id == user_username,
        Movimentacao.data >= dt_inicio,
        Movimentacao.data <= dt_fim,
    )

    if filters.categorias:
        query = query.filter(Movimentacao.categoria.in_(filters.categorias))

    if filters.origens:
        query = query.filter(Movimentacao.origem.in_(filters.origens))

    if filters.apenas_compartilhadas is not None:
        query = query.filter(Movimentacao.shared == filters.apenas_compartilhadas)

    transacoes = query.order_by(Movimentacao.data.asc()).all()

    receitas = sum(m.valor for m in transacoes if m.valor > 0)
    despesas = abs(sum(m.valor for m in transacoes if m.valor < 0))
    saldo_periodo = receitas - despesas

    categorias_breakdown = {}
    for m in transacoes:
        if m.valor < 0:
            cat = m.categoria or "Outros"
            categorias_breakdown[cat] = categorias_breakdown.get(cat, 0.0) + abs(
                m.valor
            )

    sorted_categorias = [
        {"categoria": k, "valor": round(v, 2)}
        for k, v in sorted(
            categorias_breakdown.items(), key=lambda x: x[1], reverse=True
        )
    ]

    lista_transacoes = [
        {
            "id": m.id,
            "data": m.data.strftime("%Y-%m-%d %H:%M:%S"),
            "descricao": m.descricao,
            "valor": round(m.valor, 2),
            "categoria": m.categoria,
            "origem": m.origem,
            "shared": m.shared,
        }
        for m in transacoes
    ]

    return {
        "periodo": {
            "inicio": filters.data_inicio.strftime("%d/%m/%Y"),
            "fim": filters.data_fim.strftime("%d/%m/%Y"),
        },
        "resumo": {
            "total_entradas": round(receitas, 2),
            "total_saidas": round(despesas, 2),
            "saldo_periodo": round(saldo_periodo, 2),
            "qtd_transacoes": len(transacoes),
        },
        "categorias": sorted_categorias,
        "transacoes": lista_transacoes,
    }


def generate_custom_csv_report(report_data: dict) -> str:
    """Gera um arquivo CSV em texto para download simples no frontend."""
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")

    writer.writerow(
        ["Data", "Descrição", "Valor (R$)", "Categoria", "Origem", "Compartilhado"]
    )

    for tx in report_data["transacoes"]:
        writer.writerow(
            [
                tx["data"],
                tx["descricao"],
                f"{tx['valor']:.2f}".replace(".", ","),
                tx["categoria"],
                tx["origem"],
                "Sim" if tx["shared"] else "Não",
            ]
        )

    return output.getvalue()
