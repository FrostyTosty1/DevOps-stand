import pytest
from fastapi.testclient import TestClient
from src.main import app

# Fixture that provides a reusable FastAPI TestClient
# Used in all tests to simulate HTTP requests
@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c