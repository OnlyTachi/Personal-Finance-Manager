<div align="center">

# 💰 Personal Finance Manager

**Um sistema completo para gestão de patrimônio pessoal, focado no cálculo real de rentabilidade, controle de dívidas e fluxo de caixa inteligente.**

![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.95+-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![TailwindCSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

</div>

---

## 📚 Documentação

Antes de começar, confira os guias detalhados do sistema:

- 📖 **[Guia do Usuário](docs/USER_GUIDE.md)**: Como usar o Dashboard, Bot Telegram e Recursos de Casal.
- 🏗️ **[Arquitetura do Sistema](docs/ARCHITECTURE.md)**: Detalhes técnicos, stack e modelagem de dados.
- 📡 **[Referência da API](docs/API_REFERENCE.md)**: Visão geral dos endpoints do Backend.
- 🏠 **[Configuração HomeLab](docs/DEPLOY_HOMELAB.md)**: Detalhes específicos sobre o deploy no Acer i3 com Tailscale.

---

## 📖 Sobre o Projeto

Diferente de planilhas comuns, este sistema utiliza **lógica FIFO** para cálculo preciso de impostos em Renda Fixa e integrações com APIs externas para Renda Variável. O objetivo é oferecer uma visão clara de **Ativos vs. Passivos** para calcular o Patrimônio Líquido real, além de automatizar o registro de despesas diárias.

### 📸 Screenshots

<div align="center">
<img src="assets/dashboard.png" alt="Dashboard Preview" width="100%">
</div>

---

## ✨ Funcionalidades Principais

### 💸 Fluxo de Caixa Inteligente

- **Bot Telegram Integrado:** Registre gastos em tempo real enviando uma mensagem simples (ex: `15.50 Almoço`). O sistema identifica valor, descrição e categoriza automaticamente.
- **Importação de OFX,CSV e PDF:** Carregue extratos bancários e deixe a IA simples categorizar (ex: "McDonalds" -> "Alimentação").
- **Auto-Categorização:** Algoritmo que aprende com descrições passadas para organizar suas finanças sem intervenção manual.

### ❤️ Finanças de Casal

- **Visão Combinada:** Visualize a soma dos patrimônios.
- **Acerto de Contas:** Marque despesas como "Compartilhadas" e o sistema calcula automaticamente a divisão justa (Splitwise integrado), mostrando quem deve a quem no final do mês.
- **Gráficos de Contribuição:** Veja quem investiu mais proporcionalmente no período.

<div align="center">
<img src="assets/couple.gif" alt="Dashboard Preview" width="100%">
</div>

### 💼 Gestão de Investimentos & Gamificação

- **Renda Fixa:** Cálculo automático de impostos regressivos e atualização diária pelo CDI.
- **Renda Variável:** Cotações automáticas de Ações, FIIs e Criptomoedas (CoinGecko/Yahoo Finance).
- **Gamificação:** Ganhe medalhas (Badges) e suba de nível ("Novato" a "Lenda dos Dividendos") conforme melhora sua saúde financeira e poupa mais.

<div align="center">
<img src="assets/idk.gif" alt="Dashboard Preview" width="100%">
</div>

### 🤖 Automação de Backend

- **Engine de IA Híbrida:**
  1. _Tier 1 (Nuvem):_ Gemini 2.5 Flash para visão OCR de notas/comprovantes.
  2. _Tier 2 (Worker Remoto):_ Ollama (`qwen2.5:3b`) para tarefas de texto complexas.
  3. _Tier 3 (Local):_ Ollama (`phi3.5:latest`) para execução autônoma offline.
- **Scheduler Integrado:** Atualização diária de mercado (09:00 e 18:00) e disparo automatizado de relatórios diários, semanais e mensais.

### 🧮 Calculadoras Financeiras

- Juros Compostos vs. Simples.
- Comparador CDB vs LCI/LCA (Isento de IR).
- Projeção de Independência Financeira.

---

## 🚀 Tecnologias Utilizadas

### Backend

| Tech                       | Descrição                                                       |
| :------------------------- | :-------------------------------------------------------------- |
| **Python 3.11+ / FastAPI** | API RESTful assíncrona com validação Pydantic v2.               |
| **Gemini / Ollama**        | Engine de Inteligência Artificial Híbrida (Vision OCR + SLMs).  |
| **SQLAlchemy / Alembic**   | ORM relacional (SQLite / PostgreSQL) com controle de migrações. |
| **APScheduler**            | Agendador de tarefas de mercado e envio de e-mails/webhooks.    |
| **WeasyPrint / OpenPyXL**  | Geradores de relatórios em PDF e planilhas IRPF.                |

### Frontend

| Tech                | Descrição                                        |
| :------------------ | :----------------------------------------------- |
| **React 19 + Vite** | Interface reativa, rápida e moderna.             |
| **TailwindCSS**     | Estilização responsiva com **Dark Mode** nativo. |
| **Recharts**        | Biblioteca de gráficos customizáveis.            |

---

## 🛠️ Como Rodar o Projeto

### Pré-requisitos

- [Docker](https://www.docker.com/) e Docker Compose instalados.

### 🐳 Rodando com Docker (Recomendado)

1.  **Clone o repositório:**

    ```bash
    git clone https://github.com/OnlyTachi/personal-finance-manager.git
    cd personal-finance-manager
    ```

2. **Prepare o Ambiente:**
   ```bash
   # Crie o arquivo de ambiente do backend
   cp backend/.env.example backend/.env
   
   # Configure o Gateway (Caddy)
   cp Caddyfile.example Caddyfile
    ```

3.  **Execute o container:**

    ```bash
    docker-compose up --build
    ```

4.  **Acesse a aplicação:**
    - 📱 Site: `http://localhost:8080`

### Instalação Manual (Dev)

#### Backend

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate | Linux/Mac: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🛡️ Segurança

> [!WARNING]
> Atenção: Este projeto foi desenvolvido para uso pessoal local.

A chave de criptografia (`SECRET_KEY`) presente nos arquivos de configuração padrão deve ser alterada imediatamente caso você pretenda fazer o deploy em um ambiente de produção ou exposto à internet.

---

## 📝 Licença

Este projeto está sob a licença MIT. Consulte o arquivo [LICENSE](./LICENSE) para mais detalhes.

<div align="center">
Feito com 💜 por OnlyTachi
</div>
