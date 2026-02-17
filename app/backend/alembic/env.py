from __future__ import annotations
import os
import sys
from pathlib import Path
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool, create_engine
from alembic import context
from dotenv import load_dotenv 

load_dotenv()  

# --- Make sure src/ is importable (so Alembic can see our models) ---
BASE_DIR = Path(__file__).resolve().parents[1]
SRC_DIR = BASE_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

# --- Import SQLAlchemy Base metadata from our project models ---
from src.db import Base  # noqa
from src import models # noqa

# Alembic Config object provides access to the .ini file values
config = context.config

# Setup logging configuration (from alembic.ini)
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Define metadata for 'autogenerate' feature
target_metadata = Base.metadata

# Database URL: read from environment or fallback to local SQLite
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tinytasks.db")


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.
    This configures the context with just a URL, without an Engine.
    Useful for generating SQL scripts without DB connection.
    """
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,  # detect type changes in autogenerate
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.
    This connects to the database and runs the migration directly.
    """
    connectable = create_engine(DATABASE_URL, pool_pre_ping=True)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
