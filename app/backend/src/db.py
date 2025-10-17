import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from dotenv import load_dotenv

# Load environment variables from .env (for dev and local runs)
load_dotenv()

# Database connection URL (SQLite by default, can override via .env)
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./tinytasks.db")

# Create SQLAlchemy engine (with pre-ping and SQLite thread fix)
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    pool_pre_ping=True,
    future=True,  # enable SQLAlchemy 2.x style
)

# Factory for database sessions (commit/rollback controlled manually)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)

# Base class for all ORM models (tables inherit from this)
class Base(DeclarativeBase):
    pass

# FastAPI dependency: provide a DB session per request
def get_db() -> Session:
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Simple DB health check (executes SELECT 1)
def check_db() -> bool:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return True

# Optional: create tables defined by ORM models (for dev only)
def init_db_schema() -> None:
    # In production, Alembic should handle migrations instead of this
    Base.metadata.create_all(bind=engine)
