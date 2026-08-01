# Modelagem de Banco de Dados e Schemas Pydantic

## 1. Visão Geral

O banco de dados do sistema foi estruturado utilizando o ORM **SQLAlchemy** sobre o banco de dados relacional (SQLite em ambiente de desenvolvimento e PostgreSQL em produção).

A validação de entrada e saída de dados na camada HTTP da API FastAPI é feita através dos schemas **Pydantic** (v2), garantindo forte tipagem, conversão automática de formatos (ex: strings ISO para objetos `datetime` do Python) e respostas padronizadas nos contratos JSON.

---

## 2. Dicionário de Tabelas e Modelos ORM (`app/modules/*/models.py`)

Abaixo está o detalhamento das tabelas do banco de dados, seus relacionamentos e campos principais.

### 2.1. Usuários e Dispositivos (`app/modules/auth/models.py`)

- **`users` (`User`):**
  - `username` (VARCHAR, PK, Index): Identificador único do usuário.
  - `hashed_password` (VARCHAR, Nullable=False): Senha criptografada com `bcrypt`.
  - `is_admin` (BOOLEAN): Flag que define permissões de superusuário.
  - `created_at` (DATETIME): Data e hora do cadastro.
  - `last_login` (DATETIME, Nullable=True): Registro da última autenticação.
  - `partner_id` (VARCHAR, FK -> `users.username`, Nullable=True): Vínculo com a conta do parceiro para o Modo Casal.
  - _Relacionamentos:_ `ativos`, `passivos`, `telegram_devices`, `discord_devices`, `partner`.

- **`telegram_devices` (`TelegramDevice`) / `discord_devices` (`DiscordDevice`):**
  - `id` (INTEGER, PK, Index): Identificador do vínculo.
  - `user_id` (VARCHAR, FK -> `users.username`): Dono do dispositivo.
  - `telegram_id` / `discord_id` (VARCHAR, Unique, Index): ID numérico das contas nas plataformas.
  - `device_name` (VARCHAR): Nome descritivo da conta pareada.

- **`user_preferences` (`UserPreference`):**
  - Armazena pares chave-valor arbitrários (ex: `telegram_link_code`, `discord_link_code`).

---

### 2.2. Ativos e Transações de Investimento (`app/modules/investments/models.py`)

- **`ativos` (`Ativo`):**
  - `id` (VARCHAR, PK, default=UUID): Identificador único do investimento.
  - `owner_id` (VARCHAR, FK -> `users.username`): Proprietário do ativo.
  - `nome` (VARCHAR, Nullable=False): Nome descritivo (ex: "CDB Banco Inter 100% CDI", "Petrobras PN").
  - `categoria` (VARCHAR): Categoria ("Renda Fixa", "Ações", "FIIs", "Cripto", "Caixinha", "Outros").
  - `tipo_indexador` (VARCHAR): Indexador ("CDI", "IPCA", "PRE", "B3", "CRYPTO", "MANUAL").
  - `valor_taxa` (FLOAT): Porcentagem do indexador (ex: `100.0` para 100% do CDI).
  - `ticker` (VARCHAR, Nullable=True): Código de negociação (ex: `PETR4.SA`, `bitcoin`).
  - `status` (VARCHAR): Estado do ativo ("Ativo" ou "Inativo").
  - `valor_atual_bruto` (FLOAT): Saldo bruto calculado com juros/cotação atualizada.
  - `imposto_estimado` (FLOAT): Estimativa de deduções (IR + IOF) baseada no cálculo por lotes (FIFO).
  - `valor_liquido_estimado` (FLOAT): Saldo do ativo disponível para resgate imediato pós-impostos.
  - _Relacionamento:_ `transacoes` (cascade="all, delete-orphan").

- **`transacoes` (`Transacao`):**
  - `id` (VARCHAR, PK, default=UUID): Identificador da movimentação.
  - `ativo_id` (VARCHAR, FK -> `ativos.id`): Ativo associado.
  - `timestamp` (DATETIME): Data e hora da operação.
  - `tipo` (VARCHAR): "Aporte" ou "Saque".
  - `valor` (FLOAT): Valor bruto aportado ou sacado.
  - `quantidade` (FLOAT): Número de cotas/moedas movimentadas (relevante para Renda Variável/Cripto).
  - `rendimento_realizado` / `iof_pago` / `ir_pago` / `valor_liquido` (FLOAT): Dados contábeis registrados nos saques efetuados.

---

### 2.3. Passivos, Financiamentos e Dívidas (`app/modules/investments/models.py`)

- **`passivos` (`Passivo`):**
  - `id` (VARCHAR, PK, default=UUID): Identificador do passivo.
  - `owner_id` (VARCHAR, FK -> `users.username`): Devedor responsável.
  - `nome` (VARCHAR): Nome da dívida (ex: "Financiamento Imobiliário Caixa").
  - `tipo` (VARCHAR): Categoria do empréstimo/cartão.
  - `valor_original` (FLOAT): Montante total do contrato inicial.
  - `saldo_devedor` (FLOAT): Saldo restante a ser amortizado.
  - `taxa_juros_anual` (FLOAT) / `prazo_meses` (INT) / `valor_parcela` (FLOAT).
  - _Relacionamento:_ `parcelas` (cascade="all, delete-orphan").

- **`parcelas` (`Parcela`):**
  - `id` (VARCHAR, PK, default=UUID): Identificador da parcela.
  - `passivo_id` (VARCHAR, FK -> `passivos.id`).
  - `numero` (INT): Número de ordem da parcela (1, 2, 3...).
  - `data_vencimento` (DATETIME): Data de vencimento programada.
  - `valor` (FLOAT): Valor da prestação.
  - `status` (VARCHAR): "Pendente" ou "Pago".
  - `data_pagamento` (DATETIME, Nullable=True): Data de quitação efetiva.

---

### 2.4. Fluxo de Caixa e Orçamentos (`app/modules/cashflow/models.py`)

- **`movimentacoes` (`Movimentacao`):**
  - `id` (VARCHAR, PK, default=UUID).
  - `owner_id` (VARCHAR, FK -> `users.username`).
  - `descricao` (VARCHAR, Nullable=False): Título curto da compra/receita.
  - `valor` (FLOAT, Nullable=False): Positivo para receitas, negativo para despesas.
  - `data` (DATETIME): Data do lançamento.
  - `categoria` (VARCHAR): Categoria da despesa (Alimentação, Transporte, Moradia, etc.).
  - `origem` (VARCHAR): "MANUAL", "CSV", "PDF", "OFX", "TELEGRAM", "EMAIL_SLM", "OCR".
  - `fitid` (VARCHAR, Unique, Nullable=True): Identificador único de conciliação do extrato bancário para prevenção de duplicatas.
  - `shared` (BOOLEAN): Marcação de gasto dividido 50/50 com o parceiro no Modo Casal.
  - `observacao` / `historico` (VARCHAR, Nullable=True): Detalhamento estendido do extrato bancário.

- **`budget_limits` (`BudgetLimitDB`):**
  - Define o limite de gastos mensal por categoria para disparar alertas preventivos de orçamento estourado.

---

### 2.5. Automação de E-mails e Conciliação (`app/modules/email/models.py`)

- **`email_accounts` (`EmailAccount`):**
  - `id` (INT, PK).
  - `owner_id` (VARCHAR, FK -> `users.username`).
  - `email` (VARCHAR, Nullable=False): Conta de e-mail monitorada.
  - `imap_server` / `imap_port` (ex: `imap.gmail.com`, 993).
  - `encrypted_password` (VARCHAR): Senha de aplicativo criptografada.
  - `is_active` (BOOLEAN): Status do monitoramento da conta.

- **`email_transactions` (`EmailTransaction`):**
  - Registra as notas fiscais e comprovantes capturados na caixa de entrada pelo SLM antes de vincular ao extrato bancário.

---

### 2.6. Histórico Patrimonial, Metas e Gamificação

- **`snapshots` (`Snapshot` - `app/modules/history/models.py`):**
  - Gravação diária e histórica da fotografia financeira: `valor_total_bruto`, `valor_total_investido`, `total_aportes` e `total_saques`.
- **`goals` (`Goal` - `app/modules/investments/models.py`):**
  - Objetivos e metas em grupo ou individuais: `nome`, `valor_alvo`, `valor_atual`, `data_limite`, `cor`.
- **`achievements` (`Achievement` - `app/modules/gamification/models.py`):**
  - Histórico de conquistas e medalhas desbloqueadas pelo usuário (`badge_code`, `earned_at`).

---

## 3. Schemas Pydantic (`app/modules/*/schemas.py`)

Os schemas controlam a validação dos dados de entrada (Requests) e formato dos JSONs de resposta (Responses).

### Exemplo de Herança de Schemas (Padrão do Projeto):

```python
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Schema Base com campos comuns
class AtivoBase(BaseModel):
    nome: str
    categoria: str
    tipo_indexador: str
    valor_taxa: Optional[float] = 0.0
    ticker: Optional[str] = None
    status: Optional[str] = "Ativo"

# Schema para criação (Recebe dados no POST)
class AtivoCreate(AtivoBase):
    valor_inicial: float
    data_inicio: Optional[datetime] = None

# Schema para resposta completa (Retorna no GET HTTP)
class Ativo(AtivoBase):
    id: str
    valor_atual_bruto: float
    imposto_estimado: float
    valor_liquido_estimado: float
    transacoes: List[Transacao] = []

    class Config:
        from_attributes = True  # Permite mapeamento direto dos objetos ORM do SQLAlchemy
```

### Contrato Único do Pipeline (`CanonicalTransactionDTO`):

Definido em `app/modules/data_pipeline/schemas.py`, padroniza qualquer dado financeiro vindo de fontes heterogêneas (CSV, PDF, OFX, E-mail SLM ou Visão OCR) para uma mesma estrutura antes de salvar no banco de dados.
