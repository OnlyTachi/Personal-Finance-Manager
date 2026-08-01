# Guia de Configuração

Este documento descreve os pré-requisitos, variáveis de ambiente, passos de instalação, configuração do banco de dados, migrações com Alembic e execução da API FastAPI localmente ou via Docker.

---

## 1. Pré-requisitos Nativos

Antes de começar, certifique-se de ter as seguintes ferramentas instaladas no seu ambiente de desenvolvimento:

- **Python:** Versão 3.11 ou superior.
- **Pip:** Gerenciador de pacotes do Python.
- **Virtualenv / venv:** Módulo de ambiente virtual (nativo do Python 3).
- **Docker & Docker Compose:** (Opcional) Para execução em containers isolados.
- **WeasyPrint Dependencies:** Bibliotecas de sistema necessárias para geração de PDFs (`libpango`, `libcairo`, `libgdk-pixbuf`).

---

## 2. Variáveis de Ambiente (`.env`)

Crie um arquivo `.env` na raiz do projeto backend (baseado no `.env.example`). O arquivo configura o banco de dados, chaves de autenticação, bots e servidores de Inteligência Artificial:

```env
# ==========================================
# CONFIGURAÇÕES GERAIS DA API
# ==========================================
PROJECT_NAME="Personal Finance Manager"
API_V1_STR="/api/v1"
SECRET_KEY="sua_chave_secreta_super_segura_aqui"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=10080  # 7 dias

# ==========================================
# BANCO DE DADOS
# ==========================================
# SQLite local (padrão de dev):
DATABASE_URL="sqlite:///./investimentos.db"

# PostgreSQL (exemplo para produção/Docker):
# DATABASE_URL="postgresql://usuario:senha@localhost:5432/investimentos"

# ==========================================
# BOTS (TELEGRAM & DISCORD)
# ==========================================
TELEGRAM_BOT_TOKEN="8283566381:AAFWNJTYDqlz8073hq4RcZfhbxUgAZp2-gA"
DISCORD_BOT_TOKEN="seu_token_do_discord_developer_portal"
WEBHOOK_DOMAIN=""

# ==========================================
# SMTP (ENVIO DE RELATÓRIOS E-MAIL)
# ==========================================
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="seu_email@gmail.com"
SMTP_PASSWORD="sua_senha_de_aplicativo_google"

# ==========================================
# INTELIGÊNCIA ARTIFICIAL (IA HÍBRIDA)
# ==========================================
# Tier 1: Gemini (Nuvem - Leitura visual OCR)
GEMINI_API_KEY="sua_chave_google_gemini"

# Tier 2: Ollama Remoto (Worker com GPU)
OLLAMA_WORKER_URL="http://100.90.164.94:11434/api/generate"
OLLAMA_WORKER_MODEL="qwen2.5:3b"

# Tier 3: Ollama Local (Fallback no próprio servidor)
OLLAMA_LOCAL_URL="http://localhost:11434/api/generate"
OLLAMA_LOCAL_MODEL="phi3.5:latest"
```

---

## 3. Instalação e Execução Local (Sem Docker)

### Passo 1: Criar e Ativar o Ambiente Virtual

No terminal, navegue até a pasta do backend e crie o ambiente virtual:

```bash
# Criação do venv
python3 -m venv .venv

# Ativação no Linux/macOS:
source .venv/bin/activate

# Ativação no Windows (PowerShell):
# .\.venv\Scripts\Activate.ps1
```

### Passo 2: Instalar Dependências do Sistema (Para WeasyPrint PDF)

Se estiver utilizando Linux (Ubuntu/Debian), instale os pacotes gráficos necessários para a geração de relatórios PDF:

```bash
sudo apt-get update && sudo apt-get install -y     python3-cffi python3-brotli libpango-1.0-0     pango1.0-tools libpangoft2-1.0-0 libcairo2 libgdk-pixbuf-2.0-0
```

### Passo 3: Instalar as Dependências do Python

Com o `.venv` ativo, instale as bibliotecas contidas no `requirements.txt`:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

## 4. Banco de Dados e Migrações (Alembic)

O projeto utiliza **SQLAlchemy** e **Alembic** para gerenciar a criação de tabelas e versionamento do banco de dados.

### Criar Tabelas / Aplicar Migrações

Para executar as migrações e deixar a estrutura de tabelas atualizada:

```bash
# Executa todas as migrações pendentes até a versão mais recente
alembic upgrade head
```

### Gerar uma Nova Migração (Após alterar modelos em `app/modules/*/models.py`):

```bash
alembic revision --autogenerate -m "descricao_das_alteracoes"
```

> **Nota:** No carregamento da aplicação (`lifespan` em `app/main.py`), o comando `Base.metadata.create_all(bind=engine)` é executado automaticamente, garantindo a criação inicial caso o banco ainda não exista.

---

## 5. Execução do Servidor FastAPI

### Executar em Modo de Desenvolvimento (com Reload Automático)

Para iniciar a API com hot-reload ativo durante o desenvolvimento:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Acesse no seu navegador ou cliente de API:

- **API Base:** `http://localhost:8000/`
- **Documentação Swagger UI Interativa:** `http://localhost:8000/docs`
- **Documentação Redoc:** `http://localhost:8000/redoc`

---

## 6. Execução via Docker

Se optar por executar toda a aplicação isolada em container Docker:

### Construir a Imagem Docker

```bash
docker build -t finance-backend .
```

### Rodar o Container

```bash
docker run -d   --name finance_backend_app   -p 8000:8000   --env-file .env   -v $(pwd)/investimentos.db:/app/investimentos.db   finance-backend
```

---

## 7. Estrutura do Dockerfile Explicada

O `Dockerfile` é baseado em `python:3.11-slim` e já inclui a instalação das bibliotecas de sistema C/Cairo/Pango exigidas pelo WeasyPrint para renderização nativa de PDF:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends     python3-pip     python3-cffi     python3-brotli     libpango-1.0-0     pango1.0-tools     libpangoft2-1.0-0     libcairo2     libgdk-pixbuf-2.0-0     shared-mime-info     && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip &&     pip install --no-cache-dir -r requirements.txt

COPY . /app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```
