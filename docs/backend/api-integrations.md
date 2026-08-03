# Integrações de APIs (Internas e Externas)

## 1. Visão Geral

O ecossistema do **Personal Finance Manager** conecta a API interna com múltiplos serviços externos e protocolos de comunicação. Isso permite a atualização automática de cotações de mercado, automação de leitura de e-mails/extratos via IMAP e comunicação proativa com os usuários através de Bots de mensageria (Telegram e Discord).

---

## 2. APIs e Serviços Externos

```text
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                         BACKEND (FastAPI - Python)                          │
 └──────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────┘
        │              │              │              │              │
        ▼              ▼              ▼              ▼              ▼
 ┌─────────────┐ ┌───────────┐ ┌─────────────┐ ┌───────────┐ ┌──────────────┐
 │ BCB SGS API │ │ Yahoo Fin │ │ CoinGecko   │ │ IMAP /    │ │ Telegram &   │
 │ (Selic/CDI) │ │ (Ações B3)│ │ (Cripto)    │ │ SMTP Mail │ │ Discord Bots │
 └─────────────┘ └───────────┘ └─────────────┘ └───────────┘ └──────────────┘
```

### 2.1. Banco Central do Brasil (SGS API)

- **Finalidade:** Consulta automática diária dos indicadores econômicos oficiais do Brasil (Taxa Selic, CDI e IPCA acumulado).
- **Módulo Responsável:** `app/core/market_data.py`
- **Endpoints Utilizados:**
  - Serie `432` (Selic Meta % a.a.): `https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json`
  - Serie `4389` (Taxa CDI acumulada): `https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json`
  - Serie `13522` (IPCA 12 Meses): `https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json`
- **Lógica de Cache:** Estrutura em memória (`MarketDataCache`) com tempo de expiração (TTL) de 24 horas para evitar chamadas excessivas.

### 2.2. Yahoo Finance (`yfinance`)

- **Finalidade:** Consulta de preços de fechamento/tempo real para ativos de Renda Variável (Ações da B3, FIIs, ETFs e Stocks americanas).
- **Módulo Responsável:** `app/modules/investments/price_service.py`
- **Tratamento de Tickers:** Adiciona automaticamente o sufixo `.SA` para papéis da bolsa brasileira (ex: `PETR4` transforma-se em `PETR4.SA`).

### 2.3. CoinGecko API

- **Finalidade:** Consulta de cotação de criptomoedas 24/7 convertida para Reais (BRL).
- **Módulo Responsável:** `app/modules/investments/price_service.py`
- **Endpoint Utilizado:** `https://api.coingecko.com/api/v3/simple/price?ids={clean_id}&vs_currencies=brl`
- **Formato do Ticker:** Requer o ID minúsculo da CoinGecko (ex: `bitcoin`, `ethereum`, `solana`).

### 2.4. Protocolo IMAP & Servidores de E-mail

- **Finalidade:** Leitura automatizada e histórica de caixas de entrada de e-mail para captura de comprovantes de PIX, faturas e notas fiscais.
- **Módulo Responsável:** `app/modules/email/engines/imap_engine.py` e `app/modules/email/service.py`
- **Portas e Segurança:** Conexão SSL via porta `993` utilizando Senha de Aplicativo (_App Password_) encriptada no banco de dados.

### 2.5. SMTP (Simple Mail Transfer Protocol)

- **Finalidade:** Disparo de e-mails em formato HTML com relatórios agendados (Check-up Diário, Semanal, Mensal) e notificações.
- **Módulo Responsável:** `app/modules/reports/mailer.py`
- **Porta:** `587` (TLS) ou `465` (SSL) enviando mensagens montadas pelo motor Jinja2 (`app/core/templating.py`).

### 2.6. Telegram Bot API

- **Finalidade:** Permite aos usuários cadastrar despesas via comandos no chat do Telegram (ex: `15.90 Padaria`) ou consulta de saldo.
- **Módulo Responsável:** `app/modules/bots/telegram/client.py`
- **Autenticação:** Pareamento via código único de 6 dígitos gerado pela API e enviado no comando `/start 123456`.

### 2.7. Discord Webhooks & Bot API

- **Finalidade:** Notificações instantâneas em canais do Discord sobre estouro de orçamentos, faturas vencendo e resumos diários.
- **Módulo Responsável:** `app/modules/reports/services/webhook_service.py` e `app/modules/bots/discord/client.py`
- **Formato de Envio:** Envio de mensagem estruturada no formato _Discord Embed_ com cores dinâmicas baseadas na gravidade do alerta (INFO = Azul, WARNING = Amarelo, ALERT = Vermelho).

---

## 3. Arquitetura de Endpoints da API Interna (`/api/v1`)

Resumo das rotas internas oferecidas pelo servidor FastAPI e consumidas pelo Frontend React:

### 3.1. Autenticação & Dispositivos (`/api/v1/auth`)

- `POST /auth/register`: Registro de novos usuários (atribui Admin se for a primeira conta criada no sistema).
- `POST /auth/token`: Login OAuth2 retornando o token JWT Bearer.
- `GET /auth/me`: Retorna dados do perfil autenticado.
- `POST /auth/partner/link`: Conecta a conta ao parceiro para o Modo Casal.
- `POST /auth/telegram/generate-code`: Gera código numérico temporário para parear o Telegram Bot.
- `POST /auth/discord/generate-code`: Gera código de pareamento para o Bot do Discord.

### 3.2. Investimentos & Dívidas (`/api/v1/investments`)

- `GET /investments/assets`: Lista todos os ativos do usuário com valores atualizados.
- `POST /investments/assets`: Cadastra novo investimento e gera aporte inicial automático.
- `POST /investments/transactions`: Registra novo aporte ou saque.
- `POST /investments/transactions/simulate-withdrawal`: Simula liquidação de saques calculando alíquotas de IR/IOF por lotes (FIFO).
- `POST /investments/assets/refresh`: Força a atualização imediata das cotações no Yahoo Finance e CoinGecko.
- `GET /investments/passivos` & `POST /investments/passivos`: Gestão de saldo devedor de empréstimos e parcelas.
- `POST /investments/passivos/{id}/parcelas/{parcela_id}/toggle`: Marca parcela de financiamento como paga ou pendente.

### 3.3. Fluxo de Caixa (`/api/v1/cashflow`)

- `GET /cashflow`: Lista lançamentos mensais com suporte a paginação e busca textual.
- `POST /cashflow/movimentacoes`: Registra novas entradas ou saídas (manuais ou compartilhadas com casal).
- `GET /cashflow/summary`: Retorna totais consolidados de receitas, despesas e taxa de poupança no mês.

### 3.4. Ingestão e Pipeline de Dados (`/api/v1/pipeline`)

- `POST /pipeline/upload/analyze`: Analisa arquivo CSV/Excel enviado e retorna cabeçalhos e amostragem para mapeamento.
- `POST /pipeline/upload/map`: Aplica o mapeamento do usuário e roda categorização pelas regras ou IA.
- `POST /pipeline/import/bulk`: Insere múltiplos lançamentos no banco de dados de uma só vez.
- `POST /pipeline/upload/async-process`: Processa arquivos pesados em segundo plano via `BackgroundTasks`.
- `POST /pipeline/imap/sync-history`: Dispara varredura retroativa de e-mails antigos (30, 90 ou 180 dias).

### 3.5. Relatórios & Exportações (`/api/v1/reports`)

- `GET /reports/monthly-report/pdf`: Gera e faz o stream direto de arquivo PDF do relatório mensal.
- `GET /reports/annual-report/excel`: Gera e transmite planilha `.xlsx` com o Informe IRPF em múltiplas abas.
- `POST /reports/preferences`: Atualiza horários de agendamento de e-mails e URL de Webhook do Discord.
