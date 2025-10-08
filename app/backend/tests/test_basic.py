def test_healthz(client):
    # Send GET request to /healthz
    response = client.get("/healthz")

    # Assert: response should be 200 OK
    assert response.status_code == 200

    # Assert: response body should match expected JSON
    assert response.json() == {"status": "ok"}

def test_create_task_success(client):
    # Send valid payload to create a new task
    payload = {"title": "Buy milk"}
    response = client.post("/api/tasks", json=payload)

    # Assert: should return 200 OK (FastAPI default)
    assert response.status_code == 200

    data = response.json()

    # Assert: response should include id, title, done=false, timestamps
    assert "id" in data
    assert data["title"] == "Buy milk"
    assert data["done"] is False
    assert "created_at" in data
    assert "updated_at" in data


def test_create_task_invalid(client):
    # Send invalid payload (empty title after strip)
    payload = {"title": "   "}
    response = client.post("/api/tasks", json=payload)

    # Assert: should return 422 Unprocessable Entity
    assert response.status_code == 422

    data = response.json()
    assert data["detail"][0]["msg"].startswith("Value error")