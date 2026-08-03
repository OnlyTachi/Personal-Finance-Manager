# Estrutura Geral do Backend

## 1. Visão Geral

O backend do Gerenciador Financeiro Pessoal foi construída sobre o framework **FastAPI**. Ele integra processamento assíncrono para tarefas pesadas, suporte a banco de dados relacional com **SQLAlchemy**, controle de migrações com **Alembic**, além de automação de inteligência artificial híbrida (Gemini na nuvem + SLMs locais/remotos via Ollama) e agentes de mensagem (Telegram e Discord).

- **Framework Principal:** FastAPI (Python 3.11+)
- **Servidor ASGI:** Uvicorn
- **Banco de Dados & ORM:** SQLite / PostgreSQL via SQLAlchemy
- **Autenticação:** JWT (`python-jose`) + Hashing com `bcrypt`
- **Motores de IA:** Google Gemini 2.5 Flash + Ollama (`qwen2.5:3b`, `phi3.5:latest`)
- **Extratores de Documentos:** `pdfplumber`, `ofxparse`, `pandas`, `BeautifulSoup4`, `pytesseract`
- **Bots Integrados:** `python-telegram-bot`, `discord.py`
- **Exportação de Relatórios:** `weasyprint` (HTML para PDF), `openpyxl`/`pandas` (Excel), `jinja2` (Templates HTML)

---

## 2. Árvore de Diretórios (`app/`)

```text
backend/
├── alembic/                 # Controle de versões de migração do banco de dados
├── alembic.ini              # Configuração do ambiente Alembic
├── Dockerfile               # Configuração do container Docker
├── requirements.txt         # Dependências do projeto Python
├── .env.example             # Modelo de variáveis de ambiente do servidor
├── investimentos.db         # Banco de dados SQLite padrão (em ambiente de dev)
└── app/
    ├── main.py              # Ponto de entrada FastAPI, middlewares e rotas
    ├── core/                # Configurações globais e utilitários centrais
    │   ├── config.py        # Configurações da aplicação via Pydantic BaseSettings
    │   ├── security.py      # Funções de hash (bcrypt) e tokens JWT (Jose)
    │   ├── market_data.py   # Cache e busca em tempo real das taxas do Banco Central
    │   ├── templating.py    # Renderizador de e-mails/HTML com Jinja2
    │   ├── utils.py         # Gerador de UUIDs v4 e utilitários globais
    │   └── ai/              # Arquitetura Híbrida de Inteligência Artificial
    │       ├── tools.py     # Function Calling (RAG) para LLMs
    │       ├── gemini/      # Cliente para a API Google Gemini (OCR e leitura visual)
    │       └── llm/         # Cliente Ollama
    ├── db/                  # Configuração do SQLAlchemy (engine, sessões e modelo base)
    ├── templates/           # Templates HTML/Jinja2 para e-mails e relatórios PDF
    └── modules/             # Arquitetura Modular por Domínios de Negócio
        ├── admin/           # Gestão administrativa de usuários e auditoria
        ├── auth/            # Autenticação
        ├── bots/            # Controladores dos bots do Telegram e Discord
        ├── calculator/      # Motores de simulação
        ├── cashflow/        # Lançamentos, categorização, orçamentos e filtros
        ├── couple/          # Finanças para casais e dashboard combinado
        ├── data_pipeline/   # Ingestão de arquivos (CSV/PDF/OFX) e IMAP histórico
        ├── email/           # Leitura inteligente de e-mails e conciliação bancária
        ├── gamification/    # Sistema de conquistas, badges e rankings
        ├── history/         # Reconstrução de histórico temporal e Snapshots
        ├── investments/     # Ativos, lançamentos, FIFO de tributação e cotações
        ├── notifications/   # Notificações internas, alertas de fatura e anomalias
        └── reports/         # Geração de relatórios, informe do IRPF e mailer SMTP
```

---

## 3. Mapeamento de Módulos e Endpoints REST (`app/main.py`)

Todos os módulos registram seus roteadores no arquivo principal sob o prefixo `/api/v1`.

| Prefix HTTP                | Módulo / Tags        | Descrição das Funcionalidades                                                                                                        |
| :------------------------- | :------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| `/api/v1/auth`             | **Auth**             | Registro, login (`/token`), usuário atual (`/me`), vínculo de casal e geração de códigos de pareamento (Telegram/Discord).           |
| `/api/v1/admin`            | **Admin**            | Gerenciamento exclusivo de contas (`is_admin=True`), resets de senha e análise detalhada de usuários.                                |
| `/api/v1/investments`      | **Investments**      | CRUD de Ativos/Passivos/Metas, lançamentos, simulador de saque FIFO, baixa de parcelas e atualização de cotações.                    |
| `/api/v1/calculator`       | **Calculadoras**     | Simulações dinâmicas de Juros Compostos/Simples, Primeiro Milhão, Reserva de Emergência, CDB vs LCI e busca de taxas do BCB.         |
| `/api/v1/history`          | **History**          | Consulta de snapshots diários e reconstrução completa de histórico via `rebuild_user_history`.                                       |
| `/api/v1/cashflow`         | **Cashflow**         | Movimentações financeiras, conciliação manual, limites orçamentários e resumos mensais.                                              |
| `/api/v1/gamification`     | **Gamification**     | Status do nível de investidor, verificação e emissão de conquistas e cálculo da Batalha do Mês (Casal).                              |
| `/api/v1/email-automation` | **Email Automation** | Contas IMAP conectadas, gatilhos de varredura e caixa de conciliação de comprovantes com extrato bancário.                           |
| `/api/v1/reports`          | **Reports**          | Previews HTML, geração binária para download (PDF/Excel), disparo imediato e agendamentos periódicos.                                |
| `/api/v1/notifications`    | **Notifications**    | Listagem de alertas internos do usuário e marcação de mensagens lidas.                                                               |
| `/api/v1/couple`           | **Couple**           | Resumo patrimonial combinado, cálculo de acerto de contas (_settlement_), histórico e metas do casal.                                |
| `/api/v1/bots`             | **Bots**             | Endpoints de apoio e rotas internas para comandos executados pelos bots de Telegram e Discord.                                       |
| `/api/v1/pipeline`         | **Data Pipeline**    | Upload e processamento assíncrono de arquivos pesados (CSV/PDF/OFX), análise de cabeçalhos, mapeamento e Webhooks de e-mail Inbound. |

---

## 4. Agendadores e Automações em Background (`APScheduler`)

O servidor utiliza o `APScheduler` para executar rotinas automáticas recorrentes sem bloquear a API:

1. **Atualização do Mercado (`scheduled_market_update`):**
   - **Frequência:** Diariamente às **09:00** e **18:00** (`CronTrigger(hour="9,18", minute="0")`).
   - **Ação:** Atualiza as taxas vigentes do Banco Central (Selic/CDI/IPCA), sincroniza cotações da B3 e Criptomoedas, e reconstrói o histórico patrimonial de todos os usuários (`rebuild_user_history`).
2. **Disparo de Relatórios Agendados (`check_and_send_scheduled_reports`):**
   - **Frequência:** Executado a cada **1 minuto** (`CronTrigger(minute="*")`).
   - **Ação:** Verifica as preferências dos usuários no banco de dados e dispara e-mails HTML e webhooks no Discord nos horários e dias programados (Diário, Semanal ou Mensal).
3. **Tarefas de Ingestão Assíncrona (`BackgroundTasks`):**
   - Processamento assíncrono de leitura de extratos/PDFs longos e varreduras históricas no IMAP sem estourar o timeout da requisição HTTP do usuário.
