# Arquitetura do Sistema

Este documento descreve a arquitetura técnica do **Personal Finance Manager**, incluindo suas escolhas tecnológicas, pipeline de Inteligência, estrutura de dados e fluxos principais.

## Visão Geral

O sistema é construído como uma aplicação monolítica modularizada (**Backend FastAPI**) servindo uma SPA (Single Page Application) em **Frontend React 19**. Ele conta com um motor de **IA Híbrida de 3 Tiers** para OCR/NLP, bots integrados para Telegram e Discord, e suporte a sincronização via protocolo IMAP.

## Tech Stack

| Camada             | Tecnologia                       | Detalhes                                                            |
| :----------------- | :------------------------------- | :------------------------------------------------------------------ |
| **Backend**        | Python 3.11+ / FastAPI           | Async framework de alta performance com tipagem via Pydantic v2.    |
| **Database**       | SQLite / PostgreSQL              | ORM SQLAlchemy com suporte a migrações via Alembic.                 |
| **Frontend**       | React 19 + Vite                  | SPA reativa rápida com React Router Dom e Context API.              |
| **Styling**        | Tailwind CSS                     | Estilização utilitária e responsiva (Mobile-First / Dark Theme).    |
| **Data Viz**       | Recharts + Lucide                | Gráficos dinâmicos de rosca, área e barras com iconografia moderna. |
| **AI Engine**      | Gemini 2.5 Flash + Ollama        | Arquitetura híbrida (Nuvem OCR + SLMs `qwen2.5:3b` / `phi3.5`).     |
| **Doc Processing** | WeasyPrint, OpenPyXL, pdfplumber | Geração de PDFs nativos HTML, planilhas IRPF e parsers de OFX/PDF.  |
| **Bots / Alert**   | Telegram Bot & Discord Webhooks  | Interface de chat instantânea e alertas dinâmicos (Embeds).         |

---

## Backend (API & Módulos)

O backend é organizado de forma modular em `backend/app/modules/`:

### Módulos Principais

- **`auth` (`/auth`)**: Login JWT (OAuth2), controle de permissões (`is_admin`), vínculo conjugal e pareamento de dispositivos (Telegram/Discord).
- **`investments` (`/investments`)**: Core de investimentos e dívidas. Gerencia Ativos, Passivos, Parcelas e Metas. Implementa o algoritmo **FIFO** (_First-In, First-Out_) para deduções de IR/IOF. Integra cotações com Yahoo Finance, CoinGecko e Banco Central.
- **`cashflow` (`/cashflow`)**: Movimentações financeiras (Receitas/Despesas), orçamentos (`BudgetLimitDB`) e auto-categorização via IA.
- **`data_pipeline` (`/pipeline`)**: Processamento assíncrono de arquivos pesados (CSV, OFX, PDF), análise visual/colunas, mapeamento dinâmico e sync retroativo de e-mails.
- **`email` (`/email-automation`)**: Integração IMAP, leitura inteligente de notas/comprovantes por IA e conciliação bancária.
- **`calculator` (`/calculator`)**: Simuladores de Juros Compostos, Reserva de Emergência, Comparador CDB vs LCI e busca em tempo real da Selic/CDI/IPCA.
- **`reports` (`/reports`)**: Motor de relatórios agendados (Jinja2 + WeasyPrint/OpenPyXL) enviados por e-mail (SMTP) ou Discord.
- **`gamification` (`/gamification`)**: Engine de regras de conquistas, badges de investidor e a **Batalha Mensal** de economia do casal.
- **`history` (`/history`)**: Registros diários (`Snapshot`) e reconstrução histórica temporal.
- **`notifications` (`/notifications`)**: Alertas do sistema e avisos de faturas/orçamentos.

## Arquitetura de IA (Engine Híbrida de 3 Tiers)

Para garantir autonomia e performance, a IA utiliza um pipeline com fallback automático:

1. **Tier 1 (Nuvem):** `Google Gemini 2.5 Flash` - Utilizado para processamento multimodal (OCR de recibos, notas fiscais e comprovantes via imagem/PDF).
2. **Tier 2 (Worker Remoto):** `Ollama (qwen2.5:3b)` - Servidor GPU remoto dedicado para NLP e Few-Shot categorização com timeout agressivo (`0.5s`).
3. **Tier 3 (Local):** `Ollama Local (phi3.5:latest)` - Fallback autônomo em CPU que roda no próprio servidor sem dependência externa.

O sistema disponibiliza chamadas **RAG / Function Calling** (`app/core/ai/tools.py`) permitindo que a IA consulte históricos de estabelecimentos e posições de ativos do usuário em tempo real.

## Automação & Jobs (`APScheduler`)

O arquivo `backend/app/main.py` roda dois schedulers em segundo plano:

- **Atualização de Mercado (Diário às 09:00 e 18:00):** Sincroniza taxas Selic/CDI/IPCA (BCB), cotações B3/Cripto e reprocessa snapshots históricos (`rebuild_user_history`).
- **Verificação de Relatórios (A cada 1 minuto):** Avalia preferências de disparo de e-mails e Webhooks cadastrados para acionar os relatórios (Diários, Semanais ou Mensais).

## Modelo de Dados

- **`User`**: `username`, `hashed_password`, `is_admin`, `partner_id`.
- **`Ativo` / `Transacao`**: Posições de investimentos, ticker, indexador e histórico de aportes/saques com cálculo FIFO.
- **`Passivo` / `Parcela`**: Controle de financiamentos, taxas de juros, amortização e baixa de parcelas.
- **`Movimentacao`**: Lançamentos financeiros com flag `shared` (Casal), origem (`CSV`, `OFX`, `EMAIL_SLM`, `OCR`) e `fitid` anti-duplicata.
- **`EmailAccount` / `EmailTransaction`**: Contas IMAP pareadas e comprovantes extraídos pendentes de conciliação.
- **`Goal` / `Achievement`**: Metas financeiras e conquistas desbloqueadas.
- **`Snapshot`**: Posição patrimonial histórica diária.
