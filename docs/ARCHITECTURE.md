# 🏗️ Arquitetura do Sistema

Este documento descreve a arquitetura técnica do **Personal Finance Manager**, incluindo suas escolhas tecnológicas, estrutura de dados e fluxos principais.

## Visão Geral

O sistema é construído como uma aplicação monolítica modularizada (**Backend**) servindo uma SPA (Single Page Application) no **Frontend**.

## Tech Stack

| Camada       | Tecnologia            | Detalhes                                                |
| :----------- | :-------------------- | :------------------------------------------------------ |
| **Backend**  | Python 3.12 + FastAPI | Alta performance, tipagem forte e suporte assíncrono.   |
| **Database** | SQLite + SQLAlchemy   | Simplicidade de deploy (arquivo único) com ORM robusto. |
| **Frontend** | React 19 + Vite       | Interface reativa moderna e build rápido.               |
| **Styling**  | Tailwind CSS          | Estilização utilitária e responsiva (Mobile-First).     |
| **Tasks**    | APScheduler           | Jobs em background (atualização de cotações, CDI).      |
| **Bot**      | Python-Telegram-Bot   | Interface de chat para registro rápido de despesas.     |

---

## 🔧 Backend (API)

O backend segue uma arquitetura modular baseada em domínios, localizada em `backend/app/modules/`.

### Módulos Principais

- **Auth (`/auth`)**:

  - Gerencia usuários, login (JWT) e segurança.
  - Lógica de vínculo de parceiros (Casal) e dispositivos Telegram.

- **Investments (`/investments`)**:

  - Core do sistema. Gerencia Ativos, Passivos e Transações.
  - Implementa a lógica **FIFO** (_First-In, First-Out_) para cálculo de lucro real e impostos (Renda Variável e Fixa).
  - Serviço de preços (`price_service.py`) integra com Yahoo Finance e CoinGecko.

- **Cashflow (`/cashflow`)**:

  - Gerencia **Movimentações** (Receitas/Despesas).
  - Contém o algoritmo de **Auto-Categorização** (`categorizer.py`) baseado em palavras-chave.
  - Processa uploads de arquivos (OFX, PDF) e mensagens do Telegram.

- **Calculator (`/calculator`)**:

  - Motores de cálculo financeiro (Juros Compostos, Independência Financeira, Comparadores).
  - Busca índices econômicos (Selic/CDI) diretamente do Banco Central.

- **Gamification (`/gamification`)**:
  - Engine de regras que analisa o perfil do usuário e concede Medalhas (Badges).
  - Calcula a "Batalha Mensal" de economia entre casais.

### Fluxo de Dados (Casal)

A funcionalidade de casal não duplica dados. Ela realiza agregações em tempo de leitura:

1.  Verifica se **User A** tem `partner_id` = **User B**.
2.  Verifica se **User B** tem `partner_id` = **User A** (Vínculo Mútuo).
3.  O endpoint `/couple/summary` busca ativos de A e B, soma e retorna o objeto `combined`.
4.  O "Acerto de Contas" calcula despesas marcadas como `shared=True` no mês atual.

---

## 💻 Frontend (Client)

A aplicação React utiliza Context API para gerenciamento de estado global de autenticação (`AuthContext`).

### Estrutura de Pastas

- `src/pages/`: Componentes de página (rotas).
- `src/components/`: Componentes reutilizáveis (embora muitos estejam inline nas páginas para simplicidade neste estágio).
- `src/services/`: Camada de comunicação com a API (Axios).
- `src/context/`: Estados globais.

### Responsividade

O layout utiliza classes do Tailwind (`md:`, `lg:`) para adaptar grids e flexboxes:

- **Desktop**: Sidebar lateral ou Menu Topo expandido, Gráficos lado a lado.
- **Mobile**: Menu colapsado/ícones, Gráficos empilhados, Tabelas com scroll horizontal.

---

## 🤖 Automação & Jobs

O arquivo `backend/app/main.py` inicia um `AsyncIOScheduler`.

- **Trigger**: Diariamente às 09:00 e 18:00.
- **Ações**:
  - Busca nova meta Selic no BCB.
  - Atualiza cotações de Renda Variável (B3/Cripto).
  - Recalcula a curva de juros de todos os CDBs/LCIs.
  - Gera um novo **Snapshot** histórico para cada usuário.

---

## 🗄️ Modelo de Dados (Simplificado)

- **User**: `username`, `password`, `partner_id`, `is_admin`.
- **Ativo**: Pertence a um `User`. Possui transações (Aportes/Saques).
- **Movimentacao**: Registro de fluxo de caixa. Pode ser `shared` (Casal).
- **Passivo**: Dívidas. Possui parcelas.
- **Goal**: Metas financeiras.
- **Achievement**: Medalhas conquistadas pelo usuário.
- **Snapshot**: Foto diária do patrimônio para histórico.
