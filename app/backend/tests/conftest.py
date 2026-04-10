import atexit
import os
import tempfile

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Bootstrap DATABASE_URL before importing app/db modules.
# This ensures src.db can initialize without falling back to any local dev DB.
_fd, _bootstrap_path = tempfile.mkstemp(prefix="bootstrap_db_", suffix=".sqlite3")
os.close(_fd)
os.environ["DATABASE_URL"] = f"sqlite:///{_bootstrap_path}"


def _cleanup_bootstrap_db() -> None:
    """Remove the bootstrap SQLite file created for module import safety."""
    try:
        os.remove(_bootstrap_path)
    except FileNotFoundError:
        pass


atexit.register(_cleanup_bootstrap_db)

from src.db import Base, get_db  # noqa: E402
from src.main import app  # noqa: E402


@pytest.fixture
def client():
    """
    Provide an isolated TestClient and a fresh SQLite database for each test.
    """
    # Create a temporary SQLite file for this specific test.
    fd, path = tempfile.mkstemp(prefix="test_db_", suffix=".sqlite3")
    os.close(fd)
    db_url = f"sqlite:///{path}"

    # Create a dedicated engine/session factory for the test database.
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    # Create schema in the test database.
    Base.metadata.create_all(bind=engine)

    # Override the app DB dependency so requests use the test database.
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
        engine.dispose()
        try:
            os.remove(path)
        except FileNotFoundError:
            pass