#!/usr/bin/env python3
import os
import sys
import platform
import subprocess
import shutil
import secrets

IS_WIN = platform.system() == "Windows"

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = (
    os.path.join(ROOT_DIR, "backend")
    if os.path.exists(os.path.join(ROOT_DIR, "backend"))
    else ROOT_DIR
)
FRONTEND_DIR = (
    os.path.join(ROOT_DIR, "frontend")
    if os.path.exists(os.path.join(ROOT_DIR, "frontend"))
    else ROOT_DIR
)
ENV_PATH = os.path.join(ROOT_DIR, ".env")

VENV_DIR = os.path.join(BACKEND_DIR, "venv")
VENV_BIN = os.path.join(VENV_DIR, "Scripts" if IS_WIN else "bin")
PYTHON_EXEC = os.path.join(VENV_BIN, "python.exe" if IS_WIN else "python")
UVICORN_EXEC = os.path.join(VENV_BIN, "uvicorn.exe" if IS_WIN else "uvicorn")


def clear_screen():
    os.system("cls" if IS_WIN else "clear")


def print_header(title):
    print("=" * 60)
    print(f"   {title}")
    print("=" * 60)


def read_current_env():
    env_vars = {}
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    env_vars[key.strip()] = val.strip().strip('"').strip("'")
    return env_vars


def configure_env():
    clear_screen()
    print_header("⚙️ CONFIGURAÇÃO DO ARQUIVO .ENV")

    current_env = read_current_env()

    print("Este assistente ajudará você a criar/atualizar seu arquivo .env.")
    print("👉 Pressione [ENTER] sem digitar nada para pular/manter o valor padrão.\n")

    mode = (
        input("Deseja configurar apenas as variáveis ESSENCIAIS? (S/n): ")
        .strip()
        .lower()
    )
    only_essential = mode != "n"

    fields = [
        (
            "PROJECT_NAME",
            "Nome do Projeto",
            current_env.get("PROJECT_NAME", "Personal Finance Manager"),
            True,
            "Nome exibido na API e logs.",
        ),
        (
            "SECRET_KEY",
            "Chave Secreta de Segurança (JWT)",
            current_env.get("SECRET_KEY", secrets.token_hex(32)),
            True,
            "Usada para criptografar tokens. Se deixado em branco, geraremos uma aleatória.",
        ),
        (
            "ALGORITHM",
            "Algoritmo JWT",
            current_env.get("ALGORITHM", "HS256"),
            False,
            "Algoritmo padrão de criptografia.",
        ),
        (
            "ACCESS_TOKEN_EXPIRE_MINUTES",
            "Validade do Token (Minutos)",
            current_env.get("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"),
            False,
            "Ex: 10080 = 7 dias.",
        ),
        (
            "DATABASE_URL",
            "URL do Banco de Dados",
            current_env.get("DATABASE_URL", "sqlite:///./investimentos.db"),
            False,
            "Deixe padrão para SQLite local.",
        ),
        (
            "TELEGRAM_BOT_TOKEN",
            "Token do Bot no Telegram",
            current_env.get("TELEGRAM_BOT_TOKEN", ""),
            False,
            "Obtido via @BotFather.",
        ),
        (
            "DISCORD_BOT_TOKEN",
            "Token do Bot no Discord",
            current_env.get("DISCORD_BOT_TOKEN", ""),
            False,
            "Obtido no Discord Developer Portal.",
        ),
        (
            "WEBHOOK_DOMAIN",
            "Domínio para Webhooks (HTTPS)",
            current_env.get("WEBHOOK_DOMAIN", ""),
            False,
            "Ex: https://meusite.com (apenas em produção).",
        ),
        (
            "SMTP_SERVER",
            "Servidor SMTP",
            current_env.get("SMTP_SERVER", "smtp.gmail.com"),
            False,
            "Para envio de e-mails.",
        ),
        (
            "SMTP_PORT",
            "Porta SMTP",
            current_env.get("SMTP_PORT", "587"),
            False,
            "Geralmente 587 para TLS ou 465 para SSL.",
        ),
        (
            "SMTP_USER",
            "E-mail de Envio (SMTP)",
            current_env.get("SMTP_USER", ""),
            False,
            "Ex: seu_email@gmail.com.",
        ),
        (
            "SMTP_PASSWORD",
            "Senha de App (SMTP)",
            current_env.get("SMTP_PASSWORD", ""),
            False,
            "Senha de aplicativo de 16 dígitos gerada no Google.",
        ),
        (
            "GEMINI_API_KEY",
            "Chave API do Google Gemini",
            current_env.get("GEMINI_API_KEY", ""),
            False,
            "Necessário para leitura OCR de comprovantes e recibos.",
        ),
        (
            "OLLAMA_WORKER_URL",
            "URL do Worker Ollama (Remoto)",
            current_env.get("OLLAMA_WORKER_URL", ""),
            False,
            "Ex: http://192.168.1.100:11434",
        ),
        (
            "OLLAMA_WORKER_MODEL",
            "Modelo do Worker Ollama",
            current_env.get("OLLAMA_WORKER_MODEL", "qwen2.5:3b"),
            False,
            "Ex: qwen2.5:3b, llama3:8b.",
        ),
        (
            "OLLAMA_LOCAL_URL",
            "URL do Ollama (Local)",
            current_env.get("OLLAMA_LOCAL_URL", "http://localhost:11434"),
            False,
            "Servidor de fallback na mesma máquina.",
        ),
        (
            "OLLAMA_LOCAL_MODEL",
            "Modelo do Ollama (Local)",
            current_env.get("OLLAMA_LOCAL_MODEL", "qwen2.5:3b"),
            False,
            "Modelo para o servidor local.",
        ),
    ]

    new_env = {}

    for key, label, default_val, is_essential, help_txt in fields:
        if only_essential and not is_essential:
            new_env[key] = default_val
            continue

        print(f"\n🔹 {label} ({key})")
        print(f"   💡 {help_txt}")
        val = input(f"   Valor atual/padrão [{default_val}]: ").strip()

        if not val:
            val = default_val

        new_env[key] = val

    env_content = f"""# ==========================================
# CONFIGURAÇÕES GERAIS
# ==========================================
PROJECT_NAME="{new_env.get('PROJECT_NAME')}"
SECRET_KEY="{new_env.get('SECRET_KEY')}"
ALGORITHM="{new_env.get('ALGORITHM')}"
ACCESS_TOKEN_EXPIRE_MINUTES={new_env.get('ACCESS_TOKEN_EXPIRE_MINUTES')}

# ==========================================
# BANCO DE DADOS
# ==========================================
DATABASE_URL="{new_env.get('DATABASE_URL')}"

# ==========================================
# BOTS (TELEGRAM & DISCORD)
# ==========================================
TELEGRAM_BOT_TOKEN="{new_env.get('TELEGRAM_BOT_TOKEN')}"
DISCORD_BOT_TOKEN="{new_env.get('DISCORD_BOT_TOKEN')}"
WEBHOOK_DOMAIN="{new_env.get('WEBHOOK_DOMAIN')}"

# ==========================================
# SMTP (ENVIO DE RELATÓRIOS POR E-MAIL)
# ==========================================
SMTP_SERVER="{new_env.get('SMTP_SERVER')}"
SMTP_PORT={new_env.get('SMTP_PORT')}
SMTP_USER="{new_env.get('SMTP_USER')}"
SMTP_PASSWORD="{new_env.get('SMTP_PASSWORD')}"

# ==========================================
# INTELIGÊNCIA ARTIFICIAL (IA / SLM / LLM)
# ==========================================
GEMINI_API_KEY="{new_env.get('GEMINI_API_KEY')}"
OLLAMA_WORKER_URL="{new_env.get('OLLAMA_WORKER_URL')}"
OLLAMA_WORKER_MODEL="{new_env.get('OLLAMA_WORKER_MODEL')}"
OLLAMA_LOCAL_URL="{new_env.get('OLLAMA_LOCAL_URL')}"
OLLAMA_LOCAL_MODEL="{new_env.get('OLLAMA_LOCAL_MODEL')}"
"""

    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.write(env_content)

    print("\n[✔] Arquivo .env gerado/atualizado com sucesso!")
    input("\nPressione ENTER para voltar ao menu...")


# --- MENU DE AJUDA "?" ---
def show_help():
    clear_screen()
    print_header("❓ CENTRAL DE AJUDA E DOCUMENTAÇÃO DO LAUNCHER")

    help_text = """
1. 🚀 INICIAR SISTEMA:
   • Modo Nativo:
     - Cria automaticamente o ambiente virtual Python (venv) no backend.
     - Instala as dependências via pip (requirements.txt).
     - Instala as dependências do frontend (npm install se necessário).
     - Sobe o backend (Uvicorn em http://localhost:8000) e o frontend (Vite em http://localhost:5173).
   • Modo Docker:
     - Executa o docker-compose para construir e rodar o banco, backend e frontend em containers isolados.

2. ⚙️ CONFIGURAR .ENV:
   - Permite preencher as variáveis do sistema interativamente.
   - Opção "Apenas Essenciais": Pula integrações secundárias (SMTP, Bots) e define valores padrão seguros.
   - Gera uma SECRET_KEY criptograficamente segura se nenhuma for informada.

3. 📜 VISUALIZAR LOGS:
   - Acompanha o output em tempo real do servidor FastAPI local ou dos containers do Docker (docker compose logs -f).

4. 🧹 LIMPAR CACHE:
   - Varre o projeto e apaga pastas __pycache__, arquivos temporários de upload (/tmp/finance_uploads),
     cache do Vite (.vite) e pasta de build (dist).
   - Permite opcionalmente rodar 'docker system prune' para liberar espaço em disco.
    """
    print(help_text)
    input("\nPressione ENTER para voltar ao menu principal...")


# --- MENU 1: INICIAR ---
def run_native():
    print_header("Iniciando Modo Nativo (Local)")

    # Verifica se .env existe
    if not os.path.exists(ENV_PATH):
        print(
            "\n[!] Arquivo .env não encontrado. Redirecionando para configuração inicial..."
        )
        configure_env()

    # 1. Configurar Backend (Python)
    print("\n[1/2] Configurando Backend (Python)...")
    if not os.path.exists(VENV_DIR):
        print("  -> Criando ambiente virtual (venv)...")
        subprocess.run([sys.executable, "-m", "venv", VENV_DIR], check=True)

    req_file = os.path.join(BACKEND_DIR, "requirements.txt")
    if os.path.exists(req_file):
        print("  -> Instalando/Atualizando dependências do Python...")
        subprocess.run(
            [PYTHON_EXEC, "-m", "pip", "install", "--upgrade", "pip"], check=True
        )
        subprocess.run(
            [PYTHON_EXEC, "-m", "pip", "install", "-r", req_file], check=True
        )

    # 2. Configurar Frontend (Node)
    print("\n[2/2] Configurando Frontend (Node.js)...")
    npm_cmd = "npm.cmd" if IS_WIN else "npm"
    node_modules = os.path.join(FRONTEND_DIR, "node_modules")

    if not os.path.exists(node_modules):
        print("  -> Instalando dependências do Node (npm install)...")
        subprocess.run([npm_cmd, "install"], cwd=FRONTEND_DIR, check=True)

    # 3. Subir Processos em Paralelo
    print("\n[3/3] Subindo serviços...")
    print("  -> Backend rodando em: http://localhost:8000")
    print("  -> Frontend rodando em: http://localhost:5173")
    print("\nPressione CTRL+C para encerrar ambos os serviços.\n")

    try:
        backend_process = subprocess.Popen(
            [
                UVICORN_EXEC,
                "app.main:app",
                "--host",
                "0.0.0.0",
                "--port",
                "8000",
                "--reload",
            ],
            cwd=BACKEND_DIR,
        )
        frontend_process = subprocess.Popen([npm_cmd, "run", "dev"], cwd=FRONTEND_DIR)
        backend_process.wait()
        frontend_process.wait()
    except KeyboardInterrupt:
        print("\n\nEncerrando serviços nativos...")
        backend_process.terminate()
        frontend_process.terminate()


def run_docker():
    print_header("Iniciando Modo Docker")
    print("1. Subir/Construir containers (docker compose up --build)")
    print("2. Apenas subir containers existentes (docker compose up -d)")
    print("3. Parar containers (docker compose down)")
    print("0. Voltar")
    opt = input("\nEscolha uma opção: ")

    if opt == "1":
        subprocess.run(["docker compose", "up", "--build"])
    elif opt == "2":
        subprocess.run(["docker compose", "up", "-d"])
        print("\nContainers iniciados em segundo plano!")
    elif opt == "3":
        subprocess.run(["docker compose", "down"])


# --- MENU 2: LOGS ---
def view_logs():
    print_header("Visualizador de Logs")
    print("1. Logs do Backend Nativo (logs/backend.log)")
    print("2. Logs do Docker (docker compose logs -f)")
    print("0. Voltar")
    opt = input("\nEscolha uma opção: ")

    if opt == "1":
        log_path = os.path.join(BACKEND_DIR, "logs", "backend.log")
        if os.path.exists(log_path):
            if IS_WIN:
                subprocess.run(
                    [
                        "powershell",
                        "Get-Content",
                        "-Path",
                        log_path,
                        "-Wait",
                        "-Tail",
                        "50",
                    ]
                )
            else:
                subprocess.run(["tail", "-f", "-n", "50", log_path])
        else:
            print(f"\n[!] Arquivo de log não encontrado em: {log_path}")
            input("Pressione ENTER para voltar...")
    elif opt == "2":
        subprocess.run(["docker-compose", "logs", "-f"])


# --- MENU 3: CACHE CLEAN ---
def clean_cache():
    print_header("Limpeza de Cache e Temp")
    print("Removendo caches Python, arquivos temporários e compilações...\n")

    # 1. Caches do Python (__pycache__, .pytest_cache)
    removed_pycache = 0
    for root, dirs, files in os.walk(ROOT_DIR):
        for d in dirs:
            if d in ["__pycache__", ".pytest_cache", ".mypy_cache"]:
                full_path = os.path.join(root, d)
                shutil.rmtree(full_path, ignore_errors=True)
                removed_pycache += 1

    # 2. Diretores Temporários da Ingestão
    tmp_uploads = (
        "/tmp/finance_uploads"
        if not IS_WIN
        else os.path.join(os.environ.get("TEMP", "C:\\Temp"), "finance_uploads")
    )
    if os.path.exists(tmp_uploads):
        shutil.rmtree(tmp_uploads, ignore_errors=True)
        print(f" -> Pasta temporária limpa: {tmp_uploads}")

    # 3. Builds do Frontend (.vite, dist)
    vite_cache = os.path.join(FRONTEND_DIR, "node_modules", ".vite")
    dist_dir = os.path.join(FRONTEND_DIR, "dist")
    if os.path.exists(vite_cache):
        shutil.rmtree(vite_cache, ignore_errors=True)
        print(" -> Cache do Vite limpo!")
    if os.path.exists(dist_dir):
        shutil.rmtree(dist_dir, ignore_errors=True)
        print(" -> Pasta /dist do frontend limpa!")

    # 4. Prune Docker (opcional)
    print(f" -> {removed_pycache} pastas __pycache__ removidas.")

    docker_clean = input(
        "\nDeseja executar limpezas de imagens/containers órfãos no Docker? (s/N): "
    ).lower()
    if docker_clean == "s":
        subprocess.run(["docker", "system", "prune", "-f"])

    print("\n[✔] Limpeza concluída com sucesso!")
    input("\nPressione ENTER para voltar ao menu...")


# --- MENU PRINCIPAL ---
def main_menu():
    while True:
        clear_screen()
        print_header("PERSONAL FINANCE MANAGER - LAUNCHER")
        print("1. 🚀 Iniciar Sistema")
        print("2. ⚙️ Configurar Variáveis de Ambiente")
        print("3. 📜 Visualizar Logs")
        print("4. 🧹 Limpar Caches")
        print("?. ❓ Ajuda / Instruções")
        print("0. ❌ Sair")

        choice = input("\nEscolha uma opção: ").strip()

        if choice == "1":
            clear_screen()
            print_header("MODO DE EXECUÇÃO")
            print("1. Iniciar Nativo ")
            print("2. Iniciar via Docker")
            print("0. Voltar")
            sub_choice = input("\nOpção: ")
            if sub_choice == "1":
                run_native()
            elif sub_choice == "2":
                run_docker()
        elif choice == "2":
            configure_env()
        elif choice == "3":
            view_logs()
        elif choice == "4":
            clean_cache()
        elif choice == "?":
            show_help()
        elif choice == "0":
            print("\nSaindo...")
            sys.exit(0)


if __name__ == "__main__":
    main_menu()
