from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Configuração específica para SQLite (check_same_thread=False é necessário)
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=(
        {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
    ),
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# Dependência (Dependency) para injetar a sessão do DB nas rotas
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
