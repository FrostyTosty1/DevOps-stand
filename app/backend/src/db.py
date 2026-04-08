from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from src.config import get_database_url

DATABASE_URL = get_database_url()

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args=connect_args,
)

# Session factory; request handlers manage commit/rollback explicitly.
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False, future=True)

class Base(DeclarativeBase):
    pass

# FastAPI dependency that provides one DB session per request.
def get_db() -> Session:
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Minimal connectivity check used by /db/healthz.
def check_db() -> bool:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return True

# Create tables directly from ORM metadata for local SQLite runs only.
def init_db_schema() -> None:
    # Postgres environments should use Alembic migrations instead.
    Base.metadata.create_all(bind=engine)
