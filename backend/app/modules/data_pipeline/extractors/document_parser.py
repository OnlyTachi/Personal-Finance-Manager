import io
import os
import re
import logging
import pandas as pd
import pdfplumber
from bs4 import BeautifulSoup
from datetime import datetime
from ofxparse import OfxParser
from app.core.utils import generate_uuid
from app.modules.cashflow.categorizer import predict_category as rule_based_predict
from app.modules.cashflow import schemas
from app.modules.data_pipeline.schemas import CanonicalTransactionDTO
from app.modules.data_pipeline import schemas
from typing import List

logger = logging.getLogger(__name__)

TEMP_UPLOAD_DIR = "/tmp/finance_uploads"
os.makedirs(TEMP_UPLOAD_DIR, exist_ok=True)

SOFT_CATEGORIES = [
    "Outros",
    "Transferências",
    "Salário & Renda",
    "Serviços Financeiros",
]


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


def analyze_csv_headers(file_content: bytes, filename: str):
    token = str(generate_uuid())
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
                if not line.strip():
                    continue
                sep_counts[";"] += line.count(";")
                sep_counts[","] += line.count(",")
            sep = max(sep_counts, key=sep_counts.get)
            if sep_counts[sep] == 0:
                sep = ","
            start_row = detect_header_row(filepath)
            df = pd.read_csv(
                filepath,
                sep=sep,
                nrows=10,
                skiprows=start_row,
                engine="python",
                on_bad_lines="skip",
            )
        else:
            df = pd.read_excel(filepath, nrows=10)
    except Exception as e:
        logger.error(f"Erro headers: {e}")
        try:
            os.remove(filepath)
        except:
            pass
        raise Exception("Formato inválido.")
    headers = [str(c).strip() for c in df.columns.tolist()]
    valid_indices = [i for i, h in enumerate(headers) if "unnamed" not in h.lower()]
    headers = [headers[i] for i in valid_indices]
    full_sample = df.fillna("").astype(str).values.tolist()
    sample_rows = [[row[i] for i in valid_indices] for row in full_sample]
    return {"file_token": token, "headers": headers, "sample_rows": sample_rows}


def apply_csv_mapping(
    file_token: str, mapping: schemas.ColumnMapping
) -> list[CanonicalTransactionDTO]:
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
            df = pd.read_csv(
                found_file,
                sep=sep,
                skiprows=start_row,
                engine="python",
                on_bad_lines="skip",
            )
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
            if col_date not in row:
                continue
            raw_date = str(row[col_date])
            dt = None
            formats = [
                "%d/%m/%Y",
                "%Y-%m-%d",
                "%d-%m-%Y",
                "%Y/%m/%d",
                "%d.%m.%Y",
                "%d/%m/%y",
            ]
            date_str_clean = raw_date.split()[0].strip()
            for fmt in formats:
                try:
                    dt = datetime.strptime(date_str_clean, fmt)
                    break
                except:
                    pass
            if not dt:
                continue
            if col_val not in row:
                continue
            val = clean_currency(row[col_val])
            if val == 0:
                continue
            desc = (
                str(row[col_desc]).strip()
                if col_desc and col_desc in row
                else "Sem descrição"
            )
            hist = str(row[col_hist]).strip() if col_hist and col_hist in row else ""
            if desc.lower() == "nan":
                desc = "Sem descrição"
            if hist.lower() == "nan":
                hist = ""

            cat_desc = rule_based_predict(desc)
            cat_hist = rule_based_predict(hist) if hist else "Outros"

            final_cat = "Outros"

            if cat_hist not in SOFT_CATEGORIES:
                final_cat = cat_hist
            elif cat_desc not in SOFT_CATEGORIES:
                final_cat = cat_desc
            else:
                final_cat = cat_desc if cat_desc != "Outros" else "Outros"

            results.append(
                schemas.CanonicalTransactionDTO(
                    data=dt,
                    descricao=desc[:100],
                    valor=val,
                    categoria_sugerida=final_cat,
                    origem="CSV",
                    historico_raw=hist[:255] if hist else None,
                )
            )
        except Exception:
            continue
    try:
        os.remove(found_file)
    except:
        pass
    return results


def process_file_preview(
    file_content: bytes, filename: str
) -> list[CanonicalTransactionDTO]:
    ext = filename.lower()
    if ext.endswith(".pdf"):
        return parse_pdf_file(file_content)
    if ext.endswith(".ofx"):
        return parse_ofx_file(file_content)
    return []


def parse_pdf_file(file_content: bytes) -> list[CanonicalTransactionDTO]:
    results = []
    MONTH_MAP = {
        "janeiro": 1,
        "fevereiro": 2,
        "março": 3,
        "abril": 4,
        "maio": 5,
        "junho": 6,
        "julho": 7,
        "agosto": 8,
        "setembro": 9,
        "outubro": 10,
        "novembro": 11,
        "dezembro": 12,
        "jan": 1,
        "fev": 2,
        "mar": 3,
        "abr": 4,
        "mai": 5,
        "jun": 6,
        "jul": 7,
        "ago": 8,
        "set": 9,
        "out": 10,
        "nov": 11,
        "dez": 12,
    }
    OUTFLOW_KEYWORDS = [
        "compra",
        "pagamento",
        "envio",
        "debito",
        "débito",
        "saque",
        "tarifa",
        "iof",
        "transf",
        "transferência",
        "aplicacao",
    ]
    INFLOW_KEYWORDS = [
        "recebido",
        "estorno",
        "resgate",
        "credito",
        "crédito",
        "deposito",
        "depósito",
        "salário",
    ]
    try:
        with pdfplumber.open(io.BytesIO(file_content)) as pdf:
            current_date = None
            for page in pdf.pages:
                text = page.extract_text()
                if not text:
                    continue
                lines = text.split("\n")
                for line in lines:
                    line_clean = line.strip()
                    if not line_clean:
                        continue
                    line_lower = line_clean.lower()
                    header_match = re.search(
                        r"(\d{1,2})\s+de\s+([A-Za-zç]+)\s+de\s+(\d{4})",
                        line_clean,
                        re.IGNORECASE,
                    )
                    if header_match:
                        try:
                            d, m, y = header_match.groups()
                            mnum = MONTH_MAP.get(m.lower())
                            if mnum:
                                current_date = datetime(int(y), mnum, int(d))
                        except:
                            pass
                    vals = re.findall(r"(?:R\$\s*)?(-?[\d\.]+,\d{2})", line_clean)
                    date_match = re.search(r"(\d{2}/\d{2}(?:/\d{4})?)", line_clean)
                    val = 0.0
                    dt = current_date
                    desc = ""
                    if date_match and vals:
                        try:
                            d_str = date_match.group(1)
                            if len(d_str) <= 5:
                                d_str += f"/{datetime.now().year}"
                            dt = datetime.strptime(d_str, "%d/%m/%Y")
                            val = clean_currency(vals[0])
                            desc = (
                                line_clean.replace(date_match.group(0), "")
                                .replace(vals[0], "")
                                .strip()
                            )
                            desc = re.sub(r"R\$", "", desc).strip()
                        except:
                            continue
                    elif current_date and vals:
                        val = clean_currency(vals[0])
                        desc = line_clean.replace(vals[0], "").replace("R$", "").strip()
                    else:
                        continue
                    if val == 0 or "saldo" in desc.lower() or "total" in desc.lower():
                        continue
                    val = abs(val)
                    if any(k in line_lower for k in OUTFLOW_KEYWORDS):
                        val = -val
                    elif any(k in line_lower for k in INFLOW_KEYWORDS):
                        val = val
                    elif "pix" in line_lower:
                        if "recebido" not in line_lower and "credito" not in line_lower:
                            val = -val
                    results.append(
                        schemas.CanonicalTransactionDTO(
                            data=dt,
                            descricao=desc,
                            valor=val,
                            categoria_sugerida=rule_based_predict(desc),
                            origem="PDF",
                        )
                    )
        return results
    except Exception as e:
        logger.error(f"PDF Error: {e}")
        return []


def _sanitize_date_string(raw_val: str) -> str:
    """
    Corrige strings de data OFX numéricas com tamanho incorreto ou caracteres extras.
    Ex: '2024010' -> '20240101'
    Ex: '20240105120000[-3:BRT]' -> '20240105120000[-3:BRT]'
    """
    val = raw_val.strip()
    if not val:
        return val

    match = re.match(r"^(\d+)(.*)$", val)
    if not match:
        return val

    digits, rest = match.groups()

    if 0 < len(digits) < 8:
        digits = digits.ljust(8, "0")

    return f"{digits}{rest}"


def _fix_ofx_dates(content: str) -> str:
    """
    Higieniza QUALQUER tag de data no OFX (DTPOSTED, DTSTART, DTEND, DTASOF, etc.)
    suportando tags inline ou com quebras de linha.
    """

    def replacer(match):
        open_tag = match.group(1)
        date_content = match.group(2)
        close_tag = match.group(3) or ""
        return f"{open_tag}{_sanitize_date_string(date_content)}{close_tag}"

    pattern = re.compile(
        r"(<(?:DT[A-Z0-9_]+)[^>]*>)([^<\r\n]+)(</(?:DT[A-Z0-9_]+)>)?", re.IGNORECASE
    )
    return pattern.sub(replacer, content)


def _fix_sgml_tags(content: str) -> str:
    """Garante fechamento correto de tags SGML para OFX 1.x"""
    if content.strip().startswith("<?xml"):
        return content

    def replace_tag(match):
        tag_name = match.group(1)
        value = match.group(2).strip()
        if value.startswith("<"):
            return match.group(0)
        return f"<{tag_name}>{value}</{tag_name}>"

    pattern = re.compile(r"<([A-Za-z0-9_]+)>([^<\r\n]+)(?!\s*</\1>)")
    return pattern.sub(replace_tag, content)


def _decode_bytes(file_content: bytes) -> str:
    """Decodifica os bytes do arquivo com múltiplos encodings e fallback."""
    encodings = ["utf-8", "cp1252", "latin-1", "iso-8859-1"]

    header_match = re.search(rb"ENCODING:([A-Za-z0-9\-]+)", file_content)
    if header_match:
        enc_declared = header_match.group(1).decode("ascii", errors="ignore").lower()
        if "1252" in enc_declared or "ansi" in enc_declared:
            encodings.insert(0, "cp1252")
        elif "utf" in enc_declared:
            encodings.insert(0, "utf-8")

    for enc in encodings:
        try:
            return file_content.decode(enc)
        except (UnicodeDecodeError, LookupError):
            continue

    return file_content.decode("utf-8", errors="replace")


def _parse_date_safe(date_str: str) -> datetime:
    """
    Converte strings de data OFX corrompidas para um datetime Python válido.
    Garante que o Pydantic/FastAPI consiga serializar sem enviar 'Invalid Date' ao frontend.
    """
    if not date_str:
        return datetime.now()

    clean_digits = re.sub(r"\D", "", date_str)

    if 0 < len(clean_digits) < 8:
        clean_digits = clean_digits.ljust(8, "0")

    if len(clean_digits) >= 8:
        try:
            year = int(clean_digits[:4])
            month = int(clean_digits[4:6])
            day = int(clean_digits[6:8])

            month = max(1, min(12, month))
            day = max(1, min(28, day))

            return datetime(year, month, day)
        except Exception:
            pass

    return datetime.now()


def _fallback_parse_with_bs4(content_str: str) -> List[schemas.CanonicalTransactionDTO]:
    """Fallback via BeautifulSoup quando o OfxParser padrão quebrar."""
    results = []
    soup = BeautifulSoup(content_str, "html.parser")

    transactions = soup.find_all("stmttrn")
    for t in transactions:
        try:
            dtposted = t.find("dtposted")
            trnamt = t.find("trnamt")
            fitid = t.find("fitid")
            memo = t.find("memo")
            payee = t.find("name") or t.find("payee")
            checknum = t.find("checknum")

            if not trnamt:
                continue

            amt_val = float(trnamt.text.replace(",", ".").strip())
            date_val = _parse_date_safe(dtposted.text if dtposted else "")

            memo_txt = memo.text.strip() if memo else ""
            payee_txt = payee.text.strip() if payee else ""
            raw_desc = f"{payee_txt} - {memo_txt}".strip(" -") or "Transação OFX"

            fitid_txt = (
                fitid.text.strip()
                if fitid
                else (
                    checknum.text.strip()
                    if checknum
                    else f"{date_val.strftime('%Y%m%d')}_{amt_val}_{hash(raw_desc)}"
                )
            )

            cat = rule_based_predict(raw_desc)

            results.append(
                schemas.CanonicalTransactionDTO(
                    data=date_val,
                    descricao=raw_desc,
                    valor=amt_val,
                    categoria_sugerida=cat,
                    origem="OFX",
                    fitid=str(fitid_txt),
                    historico_raw=raw_desc,
                )
            )
        except Exception as err:
            logger.warning(f"Erro ao processar item individual no fallback BS4: {err}")
            continue

    return results


def parse_ofx_file(file_content: bytes) -> List[schemas.CanonicalTransactionDTO]:
    results = []

    content_str = _decode_bytes(file_content)

    sanitized_content = _fix_ofx_dates(content_str)
    sanitized_content = _fix_sgml_tags(sanitized_content)

    try:
        fileobj = io.StringIO(sanitized_content)
        ofx = OfxParser.parse(fileobj)

        accounts = []
        if getattr(ofx, "accounts", None):
            accounts.extend(ofx.accounts)
        elif getattr(ofx, "account", None):
            accounts.append(ofx.account)

        for acc in accounts:
            statement = getattr(acc, "statement", None)
            if not statement or not getattr(statement, "transactions", None):
                continue

            for t in statement.transactions:
                payee = getattr(t, "payee", "") or ""
                memo = getattr(t, "memo", "") or ""

                raw_desc_parts = [p.strip() for p in [payee, memo] if p and p.strip()]
                raw_desc = " - ".join(dict.fromkeys(raw_desc_parts))
                desc = raw_desc if raw_desc else "Transação OFX"

                tx_date = (
                    t.date
                    if isinstance(t.date, datetime)
                    else _parse_date_safe(str(getattr(t, "date", "")))
                )

                fitid = (
                    getattr(t, "fitid", None)
                    or getattr(t, "id", None)
                    or getattr(t, "checknum", None)
                    or f"{tx_date.strftime('%Y%m%d')}_{t.amount}_{hash(desc)}"
                )

                cat = rule_based_predict(desc)

                results.append(
                    schemas.CanonicalTransactionDTO(
                        data=tx_date,
                        descricao=desc,
                        valor=float(t.amount),
                        categoria_sugerida=cat,
                        origem="OFX",
                        fitid=str(fitid).strip(),
                        historico_raw=getattr(t, "checknum", None) or raw_desc,
                    )
                )
        return results

    except Exception as e:
        logger.warning(
            f"OfxParser falhou ({e}). Executando Fallback de extração via BeautifulSoup..."
        )
        try:
            return _fallback_parse_with_bs4(sanitized_content)
        except Exception as fallback_err:
            logger.error(
                f"Erro crítico: Ambos os parsers OFX falharam. Detalhe: {fallback_err}",
                exc_info=True,
            )
            return []
