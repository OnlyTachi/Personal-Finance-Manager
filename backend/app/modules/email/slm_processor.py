# app/modules/email/slm_processor.py
import json
import logging
import re
from typing import Optional
from app.core.ai.llm.service import OllamaClient
from app.modules.email.schemas import ExtracaoSLM

logger = logging.getLogger(__name__)

PROMPT_EXTRACTION = """
Você é um sistema automatizado de extração de dados financeiros de e-mails transacionais do Brasil.
INSTRUÇÕES E REGRAS ESTRITAS:
1. Retorne EXCLUSIVAMENTE um objeto JSON válido.
2. Não inclua conversas, explicações ou tags de markdown (como ```json).
3. Classifique o 'tipo_evento' como:
   - "COMPRA": Gastos no cartão, débito, boleto pago ou notas de e-commerce (Shopee, Amazon, Mercado Livre).
   - "TRANSFERENCIA": PIX ou TED enviado/recebido entre contas.
   - "INVESTIMENTO": Aportes em CDB, compra/venda de FIIs (ex: MXRF11, GARE11, CPTS11) ou ações.
   - "RECEITA": Salário, reembolso, proventos/dividendos recebidos.
4. 'valor_total': Número float positivo.
5. 'parcelas': Quantidade de parcelas se for compra parcelada (padrão 1).
ESQUEMA ESPERADO:
{
  "tipo_evento": "COMPRA",
  "estabelecimento_ou_instituicao": "Nome do Banco ou Loja",
  "valor_total": 0.00,
  "data_hora": "YYYY-MM-DDTHH:MM:SS",
  "meio_pagamento": "PIX / Cartão de Crédito / Saldo",
  "parcelas": 1,
  "destino": null,
  "ticker_ativo": null,
  "quantidade_cotas": null,
  "preco_unitario": null
}
DADOS DO E-MAIL:
Assunto: {subject}
Remetente: {sender}
Corpo: {body_text}
"""


def extract_transaction_from_email(
    subject: str, sender: str, body_text: str, max_retries: int = 2
) -> Optional[ExtracaoSLM]:
    """
    Processa o e-mail no Ollama com retries em caso de erro de validação do Pydantic.
    """
    prompt = PROMPT_EXTRACTION.format(
        subject=subject, sender=sender, body_text=body_text
    )

    for attempt in range(1, max_retries + 1):
        try:
            temperature = 0.1 if attempt == 1 else 0.0
            response = OllamaClient.generate(prompt=prompt, temperature=temperature)

            if isinstance(response, str):
                cleaned_str = response.strip()
                if cleaned_str.startswith("```"):
                    cleaned_str = re.sub(r"^```(?:json)?\s*", "", cleaned_str)
                    cleaned_str = re.sub(r"\s*```$", "", cleaned_str)
                data_dict = json.loads(cleaned_str.strip())
            elif isinstance(response, dict):
                data_dict = response
            else:
                raise ValueError(
                    f"Tipo de resposta inesperado do Ollama: {type(response)}"
                )

            validated_data = ExtracaoSLM(**data_dict)

            logger.info(
                f"  [SLM Success] E-mail '{subject}' -> {validated_data.tipo_evento} - R$ {validated_data.valor_total}"
            )
            return validated_data

        except (json.JSONDecodeError, ValueError, TypeError) as val_err:
            logger.warning(
                f"  [SLM Retry {attempt}/{max_retries}] Erro de parsing/validação para '{subject}': {val_err}"
            )
        except Exception as e:
            logger.error(f"  [SLM Error] Falha de comunicação com a IA: {e}")
            break

    return None
