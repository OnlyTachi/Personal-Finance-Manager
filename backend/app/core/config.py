from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Investimento API"
    API_V1_STR: str = "/api/v1"

    # Defaults se não houver no .env
    SECRET_KEY: str = "chave_padrao_insegura_troque_no_env"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    # Caminhos
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent

    # O Banco de Dados deve ser consistente com o .env ou default
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/investimentos.db"

    # Integrações
    TELEGRAM_BOT_TOKEN: Optional[str] = None

    # --- Configuração de IA Híbrida ---
    # Tier 1: Gemini (Nuvem - Opcional/Futuro)
    GEMINI_API_KEY: Optional[str] = None

    # Tier 2: Worker Remoto (PC Potente - GPU)
    # Use o IP do Tailscale ou IP fixo da LAN
    OLLAMA_WORKER_URL: Optional[str] = None
    OLLAMA_WORKER_MODEL: Optional[str] = None

    # Tier 3: Local Fallback (Notebook (server) - CPU)
    OLLAMA_LOCAL_URL: Optional[str] = None
    OLLAMA_LOCAL_MODEL: Optional[str] = None

    class Config:
        case_sensitive = True
        env_file = str(Path(__file__).resolve().parent.parent.parent / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore" 

    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        return self.DATABASE_URL


settings = Settings()
