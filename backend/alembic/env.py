# alembic/env.py
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

# 1. Importa as configurações do projeto e a Base do SQLAlchemy
from app.core.config import settings
from app.db.session import Base

# 2. Importa TODOS os modelos para garantir que o --autogenerate enxergue as tabelas
from app.modules.auth import models as auth_models
from app.modules.investments import models as inv_models
from app.modules.history import models as history_models
from app.modules.cashflow import models as cashflow_models
from app.modules.gamification import models as gamification_models
from app.modules.email import models as email_models
from app.modules.reports import models as reports_models
from app.modules.notifications import models as notification_models

# Configuração do Alembic
config = context.config

# Sobrescreve a opção sqlalchemy.url dinamicamente com a URL do projeto (.env / settings)
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,  # Habilita suporte a migrações em lote (essencial para SQLite)
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,  # Habilita suporte a migrações em lote (essencial para SQLite)
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
