import os, tempfile, pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from src.main import app
from src.db import Base, get_db

@pytest.fixture
def client():
    """
    Provide an isolated TestClient + fresh SQLite DB per test.
    """
    # create temp sqlite file
    fd, path = tempfile.mkstemp(prefix="test_db_", suffix=".sqlite3")
    os.close(fd)
    db_url = f"sqlite:///{path}"

    # build engine & schema
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)

    # override FastAPI dependency
    def _override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    app.dependency_overrides[get_db] = _override_get_db

    try:
        with TestClient(app) as c:
            yield c
    finally:
        app.dependency_overrides.clear()
        try: os.remove(path)
        except FileNotFoundError: pass
