from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

is_sqlite = "sqlite" in settings.DATABASE_URL.lower()

if is_sqlite:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={
            "check_same_thread": False,
            "timeout": 30,
        },
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

else:
    engine = create_engine(
        settings.SQLALCHEMY_DATABASE_URI,
        pool_size=20,
        max_overflow=30,
        pool_timeout=60,
        pool_pre_ping=True,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    Dependência do FastAPI para injetar a sessão do banco.
    Garante abertura e fechamento limpos por requisição.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
