import io
import re
import os
import uuid
import logging
import pandas as pd
import pdfplumber
from datetime import datetime, timedelta, date
from sqlalchemy.orm import Session
from sqlalchemy import extract, func, or_
from ofxparse import OfxParser

# Imports da aplicação
from app.modules.cashflow import models, schemas
from app.modules.cashflow.ai_service import categorize_transaction_ai
from app.modules.cashflow.categorizer import predict_category as rule_based_predict

logger = logging.getLogger(__name__)

# --- CONFIGURAÇÃO ---
TEMP_UPLOAD_DIR = "/tmp/finance_uploads"
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)

# Categorias que consideramos "Genéricas" e que merecem uma segunda opinião da IA ou do Histórico
SOFT_CATEGORIES = ["Outros", "Transferências", "Salário & Renda", "Serviços Financeiros"]

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
    keywords = ["data", "lançamento", "histórico", "descrição", "valor", "saldo", "date", "amount", "compra", "loja", "category"]
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

def get_movimentacoes(db: Session, user_username: str, skip: int = 0, limit: int = 100, month: int = None, year: int = None):
    query = db.query(models.Movimentacao).filter(models.Movimentacao.owner_id == user_username)
    if month and year:
        query = query.filter(extract("month", models.Movimentacao.data) == month, extract("year", models.Movimentacao.data) == year)
    return query.order_by(models.Movimentacao.data.desc()).offset(skip).limit(limit).all()


def create_movimentacao(db: Session, mov_in: schemas.MovimentacaoCreate, user_username: str):
    categoria_final = "Outros"
    
    # 1. Prioridade: Se o usuário mandou categoria manual específica
    if mov_in.categoria and mov_in.categoria != "Outros":
        categoria_final = mov_in.categoria
    else:
        # 2. Tenta Regras em CAMADAS (Descrição vs Histórico)
        cat_desc = rule_based_predict(mov_in.descricao)
        cat_hist = rule_based_predict(mov_in.historico) if mov_in.historico else "Outros"
        
        # Lógica de Desempate:
        # Se o histórico tem uma categoria FORTE (ex: Steam -> Lazer) e a descrição é FRACA (ex: Pix -> Transferência),
        # o histórico ganha.
        if cat_hist not in SOFT_CATEGORIES:
            categoria_final = cat_hist
        elif cat_desc not in SOFT_CATEGORIES:
            categoria_final = cat_desc
        else:
            # Se ambos são genéricos, fica com o da descrição por enquanto (ex: Pix enviado)
            categoria_final = cat_desc if cat_desc != "Outros" else "Outros"

        # 3. Refinamento com IA (Se o resultado final for "Mole" / Genérico)
        # Isso garante que "Pix enviado" (Transferências) ainda passe pela IA para ver se é "Aluguel" ou "Mesada"
        if categoria_final in SOFT_CATEGORIES:
            ai_cat = categorize_transaction_ai(
                db, 
                user_username, 
                mov_in.descricao, 
                mov_in.valor, 
                additional_context=mov_in.historico
            )
            if ai_cat:
                categoria_final = ai_cat

    # Exclui 'historico' do dump pois não existe no Model (mapeia para observacao)
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
    return db_mov


def update_movimentacao(db: Session, mov_id: str, mov_update: schemas.MovimentacaoUpdate, user_username: str):
    mov = db.query(models.Movimentacao).filter(models.Movimentacao.id == mov_id, models.Movimentacao.owner_id == user_username).first()
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
    mov = db.query(models.Movimentacao).filter(models.Movimentacao.id == mov_id, models.Movimentacao.owner_id == user_username).first()
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
    query = db.query(models.Movimentacao).filter(models.Movimentacao.owner_id == user_username)
    
    # 1. Filtro de Data
    today = date.today()
    date_filter = filters.get("date_filter", "current_month")
    
    if date_filter == "current_month":
        query = query.filter(extract('month', models.Movimentacao.data) == today.month, extract('year', models.Movimentacao.data) == today.year)
    elif date_filter == "last_month":
        # Lógica simples para pegar mês anterior
        first_of_this_month = today.replace(day=1)
        last_month = first_of_this_month - timedelta(days=1)
        query = query.filter(extract('month', models.Movimentacao.data) == last_month.month, extract('year', models.Movimentacao.data) == last_month.year)
    elif date_filter == "today":
        query = query.filter(func.date(models.Movimentacao.data) == today)
    # "all_time" não aplica filtro de data
    
    # 2. Filtro de Palavras-Chave
    keywords = filters.get("keywords", [])
    if keywords:
        search_clauses = []
        for word in keywords:
            term = f"%{word}%"
            # Busca na descrição, categoria e observação
            search_clauses.append(models.Movimentacao.descricao.ilike(term))
            search_clauses.append(models.Movimentacao.categoria.ilike(term))
            search_clauses.append(models.Movimentacao.observacao.ilike(term))
        
        # OR entre os termos (qualquer um serve)
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
        "transactions": transactions
    }


# --- IMPORTAÇÃO EM LOTE (CSV/PDF/OFX) ---

def create_bulk_movimentacoes(db: Session, transactions: list[schemas.TransactionPreview], user_username: str):
    if not transactions:
        return {"message": "Nenhuma transação para importar."}
    dates = []
    valid_transactions = []
    for t in transactions:
        try:
            dt = datetime.strptime(t.data_temp, "%Y-%m-%d")
            dates.append(dt)
            valid_transactions.append((t, dt))
        except Exception:
            continue
    if not dates:
        return {"message": "Não foi possível ler as datas das transações."}
    min_date = min(dates) - timedelta(days=3)
    max_date = max(dates) + timedelta(days=3)
    existing_movs = db.query(models.Movimentacao).filter(
        models.Movimentacao.owner_id == user_username,
        models.Movimentacao.data >= min_date,
        models.Movimentacao.data <= max_date,
    ).all()
    available_db_movs = list(existing_movs)
    count_imported = 0
    count_duplicated = 0
    for t, dt_new in valid_transactions:
        try:
            match_found = None
            for db_mov in available_db_movs:
                if abs(db_mov.valor - t.valor) > 0.01:
                    continue
                db_date = db_mov.data.date() if isinstance(db_mov.data, datetime) else db_mov.data
                new_date = dt_new.date()
                if abs((db_date - new_date).days) > 1:
                    continue
                match_found = db_mov
                break
            if match_found:
                available_db_movs.remove(match_found)
                count_duplicated += 1
            else:
                cat_final = t.categoria_sugerida
                
                # MUDANÇA: Se a categoria sugerida no Preview for genérica (ex: "Transferências" por causa de Pix),
                # forçamos a IA a olhar novamente com o contexto completo antes de salvar.
                if not cat_final or cat_final in SOFT_CATEGORIES:
                    ai_cat = categorize_transaction_ai(
                        db, 
                        user_username, 
                        t.descricao, 
                        t.valor,
                        additional_context=t.historico
                    )
                    if ai_cat:
                        cat_final = ai_cat
                    # Se IA falhar, mantém a sugerida (ex: Transferências)
                        
                new_mov = models.Movimentacao(
                    owner_id=user_username,
                    descricao=t.descricao,
                    valor=t.valor,
                    data=dt_new,
                    categoria=cat_final,
                    origem="IMPORT",
                    conciliado=True,
                    observacao=t.historico,
                )
                db.add(new_mov)
                count_imported += 1
        except Exception as e:
            logger.error(f"Erro ao salvar transação {t}: {e}")
            continue
    db.commit()
    msg = f"{count_imported} importadas com sucesso."
    if count_duplicated > 0:
        msg += f" ({count_duplicated} duplicatas ignoradas)."
    return {"message": msg}


def analyze_csv_headers(file_content: bytes, filename: str):
    token = str(uuid.uuid4())
    filepath = os.path.join(TEMP_UPLOAD_DIR, f"{token}_{filename}")
    with open(filepath, "wb") as f:
        f.write(file_content)
    df = None
    try:
        if filename.lower().endswith((".csv", ".txt")):
            try:
                text_snippet = file_content[:2048].decode("utf-8", errors="ignore")
            except:
                text_snippet = file_content[:2048].decode("latin-1", errors="ignore")
            lines = text_snippet.splitlines()
            sep_counts = {";": 0, ",": 0, "\t": 0}
            for line in lines[:15]:
                if not line.strip(): continue
                sep_counts[";"] += line.count(";")
                sep_counts[","] += line.count(",")
            sep = max(sep_counts, key=sep_counts.get)
            if sep_counts[sep] == 0: sep = ","
            start_row = detect_header_row(filepath)
            df = pd.read_csv(filepath, sep=sep, nrows=10, skiprows=start_row, engine="python", on_bad_lines="skip")
        else:
            df = pd.read_excel(filepath, nrows=10)
    except Exception as e:
        logger.error(f"Erro headers: {e}")
        try: os.remove(filepath)
        except: pass
        raise Exception("Formato inválido.")
    headers = [str(c).strip() for c in df.columns.tolist()]
    valid_indices = [i for i, h in enumerate(headers) if "unnamed" not in h.lower()]
    headers = [headers[i] for i in valid_indices]
    full_sample = df.fillna("").astype(str).values.tolist()
    sample_rows = [[row[i] for i in valid_indices] for row in full_sample]
    return {"file_token": token, "headers": headers, "sample_rows": sample_rows}


def apply_csv_mapping(file_token: str, mapping: schemas.ColumnMapping):
    found_file = None
    for f in os.listdir(TEMP_UPLOAD_DIR):
        if f.startswith(file_token):
            found_file = os.path.join(TEMP_UPLOAD_DIR, f)
            break
    if not found_file:
        raise Exception("Arquivo expirado.")
    try:
        if found_file.lower().endswith((".csv", ".txt")):
            with open(found_file, "r", encoding="utf-8", errors="ignore") as f:
                snippet = f.read(1024)
                sep = ";" if snippet.count(";") > snippet.count(",") else ","
            start_row = detect_header_row(found_file)
            df = pd.read_csv(found_file, sep=sep, skiprows=start_row, engine="python", on_bad_lines="skip")
        else:
            df = pd.read_excel(found_file)
    except Exception as e:
        raise Exception(f"Erro processamento: {str(e)}")
    results = []
    df.columns = [str(c).strip() for c in df.columns]
    col_date = mapping.date_col
    col_val = mapping.amount_col
    col_desc = mapping.description_col
    col_hist = mapping.history_col or mapping.memo_col
    for _, row in df.iterrows():
        try:
            if col_date not in row: continue
            raw_date = str(row[col_date])
            dt = None
            formats = ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d", "%d.%m.%Y", "%d/%m/%y"]
            date_str_clean = raw_date.split()[0].strip()
            for fmt in formats:
                try:
                    dt = datetime.strptime(date_str_clean, fmt)
                    break
                except: pass
            if not dt: continue
            if col_val not in row: continue
            val = clean_currency(row[col_val])
            if val == 0: continue
            desc = str(row[col_desc]).strip() if col_desc and col_desc in row else "Sem descrição"
            hist = str(row[col_hist]).strip() if col_hist and col_hist in row else ""
            if desc.lower() == "nan": desc = "Sem descrição"
            if hist.lower() == "nan": hist = ""
            
            # --- MUDANÇA NA PRÉ-CATEGORIZAÇÃO ---
            # Antes: se 'desc' tinha Pix, parava em Transferência.
            # Agora: verifica histórico e descrição. Histórico específico vence.
            
            cat_desc = rule_based_predict(desc)
            cat_hist = rule_based_predict(hist) if hist else "Outros"
            
            final_cat = "Outros"
            
            # Se o histórico der uma categoria específica (Ex: Steam -> Lazer), ele vence a descrição genérica (Pix -> Transferências)
            if cat_hist not in SOFT_CATEGORIES:
                final_cat = cat_hist
            elif cat_desc not in SOFT_CATEGORIES:
                final_cat = cat_desc
            else:
                # Se ambos forem genéricos (ex: Pix enviado e Jose), usa a descrição
                final_cat = cat_desc if cat_desc != "Outros" else "Outros"
            
            results.append({
                "data_temp": dt.strftime("%Y-%m-%d"),
                "descricao": desc[:100],
                "valor": val,
                "categoria_sugerida": final_cat,
                "hash_id": str(uuid.uuid4()),
                "historico": hist[:255] if hist else None,
            })
        except Exception: continue
    try: os.remove(found_file)
    except: pass
    return results


def process_file_preview(file_content: bytes, filename: str):
    ext = filename.lower()
    if ext.endswith(".pdf"): return parse_pdf_file(file_content)
    if ext.endswith(".ofx"): return parse_ofx_file(file_content)
    return []


def parse_ofx_file(file_content):
    try:
        try: content_str = file_content.decode("utf-8")
        except: content_str = file_content.decode("latin-1")
        fileobj = io.StringIO(content_str)
        ofx = OfxParser.parse(fileobj)
        results = []
        if ofx.account and ofx.account.statement:
            for t in ofx.account.statement.transactions:
                desc = t.memo if t.memo else t.payee
                cat = rule_based_predict(desc)
                results.append({
                    "data_temp": t.date.strftime("%Y-%m-%d"),
                    "descricao": desc,
                    "valor": float(t.amount),
                    "categoria_sugerida": cat,
                    "hash_id": str(uuid.uuid4()),
                    "historico": t.checknum,
                })
        return results
    except Exception as e:
        logger.error(f"Erro OFX: {e}")
        return []


def parse_pdf_file(file_content: bytes):
    results = []
    MONTH_MAP = {"janeiro": 1, "fevereiro": 2, "março": 3, "abril": 4, "maio": 5, "junho": 6, "julho": 7, "agosto": 8, "setembro": 9, "outubro": 10, "novembro": 11, "dezembro": 12, "jan": 1, "fev": 2, "mar": 3, "abr": 4, "mai": 5, "jun": 6, "jul": 7, "ago": 8, "set": 9, "out": 10, "nov": 11, "dez": 12}
    OUTFLOW_KEYWORDS = ["compra", "pagamento", "envio", "debito", "débito", "saque", "tarifa", "iof", "transf", "transferência", "aplicacao"]
    INFLOW_KEYWORDS = ["recebido", "estorno", "resgate", "credito", "crédito", "deposito", "depósito", "salário"]
    try:
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            current_date = None
            for page in pdf.pages:
                text = page.extract_text()
                if not text: continue
                lines = text.split("\n")
                for line in lines:
                    line_clean = line.strip()
                    if not line_clean: continue
                    line_lower = line_clean.lower()
                    header_match = re.search(r"(\d{1,2})\s+de\s+([A-Za-zç]+)\s+de\s+(\d{4})", line_clean, re.IGNORECASE)
                    if header_match:
                        try:
                            d, m, y = header_match.groups()
                            mnum = MONTH_MAP.get(m.lower())
                            if mnum: current_date = datetime(int(y), mnum, int(d))
                        except: pass
                    vals = re.findall(r"(?:R\$\s*)?(-?[\d\.]+,\d{2})", line_clean)
                    date_match = re.search(r"(\d{2}/\d{2}(?:/\d{4})?)", line_clean)
                    val = 0.0
                    dt = current_date
                    desc = ""
                    if date_match and vals:
                        try:
                            d_str = date_match.group(1)
                            if len(d_str) <= 5: d_str += f"/{datetime.now().year}"
                            dt = datetime.strptime(d_str, "%d/%m/%Y")
                            val = clean_currency(vals[0])
                            desc = line_clean.replace(date_match.group(0), "").replace(vals[0], "").strip()
                            desc = re.sub(r"R\$", "", desc).strip()
                        except: continue
                    elif current_date and vals:
                        val = clean_currency(vals[0])
                        desc = line_clean.replace(vals[0], "").replace("R$", "").strip()
                    else: continue
                    if val == 0 or "saldo" in desc.lower() or "total" in desc.lower(): continue
                    val = abs(val)
                    if any(k in line_lower for k in OUTFLOW_KEYWORDS): val = -val
                    elif any(k in line_lower for k in INFLOW_KEYWORDS): val = val
                    elif "pix" in line_lower:
                        if "recebido" not in line_lower and "credito" not in line_lower: val = -val
                    results.append({
                        "data_temp": dt.strftime("%Y-%m-%d"),
                        "descricao": desc,
                        "valor": val,
                        "categoria_sugerida": rule_based_predict(desc),
                        "hash_id": str(uuid.uuid4()),
                    })
        return results
    except Exception as e:
        logger.error(f"PDF Error: {e}")
        return []