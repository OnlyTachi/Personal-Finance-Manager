from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.modules.gamification import models, schemas
from app.modules.investments.models import Ativo, Passivo, Transacao
from app.modules.cashflow.models import Movimentacao
from app.modules.auth.models import User
from datetime import datetime, date

# Definição das Medalhas Disponíveis (Mantido)
BADGES_DEF = {
    "FIRST_STEP": {
        "name": "Primeiro Passo",
        "description": "Cadastrou o primeiro investimento.",
        "icon": "Footprints",
        "color": "text-blue-400",
    },
    "PATRIMONIO_10K": {
        "name": "Clube dos 10k",
        "description": "Atingiu R$ 10.000,00 em patrimônio líquido.",
        "icon": "Trophy",
        "color": "text-yellow-400",
    },
    "PATRIMONIO_50K": {
        "name": "Meio Caminho",
        "description": "Atingiu R$ 50.000,00 em patrimônio líquido.",
        "icon": "Crown",
        "color": "text-purple-400",
    },
    "PATRIMONIO_100K": {
        "name": "O Primeiro 100k",
        "description": "Patrimônio líquido superou R$ 100.000,00.",
        "icon": "Diamond",
        "color": "text-cyan-400",
    },
    "DIVIDA_ZERO": {
        "name": "Nome Limpo",
        "description": "Não possui nenhuma dívida ativa cadastrada.",
        "icon": "ShieldCheck",
        "color": "text-green-400",
    },
    "DIVERSIFICADOR": {
        "name": "Diversificador",
        "description": "Possui ativos em pelo menos 3 categorias diferentes.",
        "icon": "PieChart",
        "color": "text-pink-400",
    },
    "CASAL_UNIDO": {
        "name": "Casal Unido",
        "description": "Conectou a conta com um parceiro(a).",
        "icon": "Heart",
        "color": "text-red-500",
    },
    "CRYPTO_BRO": {
        "name": "Crypto Bro",
        "description": "Possui algum investimento em Criptomoedas.",
        "icon": "Bitcoin",
        "color": "text-orange-500",
    },
}


def check_and_award_badges(db: Session, user_username: str):
    """
    Roda todas as verificações e salva novas medalhas no banco.
    """
    # 1. Carrega dados do usuário
    user = db.query(User).filter(User.username == user_username).first()
    ativos = db.query(Ativo).filter(Ativo.owner_id == user_username).all()
    passivos = db.query(Passivo).filter(Passivo.owner_id == user_username).all()

    total_ativos = sum(a.valor_atual_bruto for a in ativos)
    total_passivos = sum(p.saldo_devedor for p in passivos)
    patrimonio_liquido = total_ativos - total_passivos

    categorias = set(a.categoria for a in ativos)

    # 2. Lista de códigos conquistados nesta verificação
    earned_codes = []

    # --- REGRAS ---

    if len(ativos) > 0:
        earned_codes.append("FIRST_STEP")

    if patrimonio_liquido >= 10000:
        earned_codes.append("PATRIMONIO_10K")

    if patrimonio_liquido >= 50000:
        earned_codes.append("PATRIMONIO_50K")

    if patrimonio_liquido >= 100000:
        earned_codes.append("PATRIMONIO_100K")

    if len(passivos) == 0 and len(ativos) > 0:
        earned_codes.append("DIVIDA_ZERO")

    if len(categorias) >= 3:
        earned_codes.append("DIVERSIFICADOR")

    if user.partner_id:
        earned_codes.append("CASAL_UNIDO")

    if any(a.tipo_indexador == "CRYPTO" or "Cripto" in a.categoria for a in ativos):
        earned_codes.append("CRYPTO_BRO")

    # 3. Salva no banco (apenas se ainda não tiver)
    existing_badges = (
        db.query(models.Achievement)
        .filter(models.Achievement.user_id == user_username)
        .all()
    )
    existing_codes = [b.badge_code for b in existing_badges]

    new_badges = []
    for code in earned_codes:
        if code not in existing_codes:
            new_ach = models.Achievement(user_id=user_username, badge_code=code)
            db.add(new_ach)
            new_badges.append(code)

    if new_badges:
        db.commit()

    return earned_codes


def get_user_gamification_status(
    db: Session, user_username: str
) -> schemas.GamificationStatus:
    # Garante que as medalhas estão atualizadas antes de retornar
    check_and_award_badges(db, user_username)

    # Busca do banco
    my_achievements = (
        db.query(models.Achievement)
        .filter(models.Achievement.user_id == user_username)
        .all()
    )
    my_codes_map = {ach.badge_code: ach.earned_at for ach in my_achievements}

    badge_list = []
    for code, info in BADGES_DEF.items():
        is_earned = code in my_codes_map
        badge_list.append(
            schemas.Badge(
                code=code,
                name=info["name"],
                description=info["description"],
                icon=info["icon"],
                color=info["color"],
                earned=is_earned,
                earned_at=my_codes_map.get(code),
            )
        )

    # Calcula Nível
    earned_count = len(my_achievements)
    if earned_count == 0:
        level = "Novato Financeiro"
    elif earned_count <= 2:
        level = "Poupador Aprendiz"
    elif earned_count <= 5:
        level = "Investidor Focado"
    elif earned_count <= 7:
        level = "Mestre da Alocação"
    else:
        level = "Lenda dos Dividendos 🚀"

    return schemas.GamificationStatus(
        total_badges=len(BADGES_DEF),
        earned_count=earned_count,
        badges=badge_list,
        level=level,
    )


# --- BATALHA MENSAL ---


def calculate_stats(
    db: Session, username: str, month: int, year: int
) -> schemas.BattleStats:
    # 1. Fluxo de Caixa (Income vs Expenses)
    incomes = (
        db.query(func.sum(Movimentacao.valor))
        .filter(
            Movimentacao.owner_id == username,
            Movimentacao.valor > 0,
            extract("month", Movimentacao.data) == month,
            extract("year", Movimentacao.data) == year,
        )
        .scalar()
        or 0.0
    )

    expenses = (
        db.query(func.sum(Movimentacao.valor))
        .filter(
            Movimentacao.owner_id == username,
            Movimentacao.valor < 0,
            extract("month", Movimentacao.data) == month,
            extract("year", Movimentacao.data) == year,
        )
        .scalar()
        or 0.0
    )

    expenses = abs(expenses)
    saved = incomes - expenses
    savings_rate = (saved / incomes * 100) if incomes > 0 else 0.0

    # 2. Investimentos (Aportes no Mês)
    # Precisamos fazer join com Ativo para filtrar pelo owner_id
    invested = (
        db.query(func.sum(Transacao.valor))
        .join(Ativo)
        .filter(
            Ativo.owner_id == username,
            Transacao.tipo == "Aporte",
            extract("month", Transacao.timestamp) == month,
            extract("year", Transacao.timestamp) == year,
        )
        .scalar()
        or 0.0
    )

    return schemas.BattleStats(
        username=username,
        income=round(incomes, 2),
        expenses=round(expenses, 2),
        saved=round(saved, 2),
        savings_rate=round(savings_rate, 2),
        invested=round(invested, 2),
    )


def get_monthly_battle(db: Session, user_username: str) -> schemas.MonthlyBattle:
    today = date.today()
    month = today.month
    year = today.year

    # Busca usuário e parceiro
    user = db.query(User).filter(User.username == user_username).first()

    # Stats do Usuário
    u_stats = calculate_stats(db, user_username, month, year)

    p_stats = None
    saver_winner = None
    investor_winner = None
    msg = "Continue focado nos seus objetivos!"

    if user.partner_id:
        partner = db.query(User).filter(User.username == user.partner_id).first()
        if partner and partner.partner_id == user_username:  # Vínculo confirmado
            p_stats = calculate_stats(db, partner.username, month, year)

            # Define Vencedores
            if u_stats.savings_rate > p_stats.savings_rate:
                saver_winner = u_stats.username
            elif p_stats.savings_rate > u_stats.savings_rate:
                saver_winner = p_stats.username

            if u_stats.invested > p_stats.invested:
                investor_winner = u_stats.username
            elif p_stats.invested > u_stats.invested:
                investor_winner = p_stats.username

            # Mensagem da Recompensa
            winner_saved = max(u_stats.saved, p_stats.saved)
            if winner_saved > 0:
                if saver_winner == user_username:
                    msg = "Você está ganhando! Se continuar assim, você escolhe o filme do fim de semana! 🎬"
                elif saver_winner == partner.username:
                    msg = f"{partner.username} está na frente! Corra atrás ou vai ter que pagar o jantar! 🍕"
                else:
                    msg = "Empate técnico! Os dois estão de parabéns (ou os dois gastaram demais... 👀)"
            else:
                msg = "Ninguém poupou nada este mês ainda... vamos lá, equipe! 💪"

    return schemas.MonthlyBattle(
        month=month,
        year=year,
        user=u_stats,
        partner=p_stats,
        saver_winner=saver_winner,
        investor_winner=investor_winner,
        reward_message=msg,
    )
