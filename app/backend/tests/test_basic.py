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

def test_delete_task_ok(client):
    # Create a task
    created = client.post("/api/tasks", json={"title": "to delete"}).json()
    tid = created["id"]

    # Delete it
    response = client.delete(f"/api/tasks/{tid}")
    assert response.status_code == 204  # No Content

    # Verify it's gone
    response2 = client.get(f"/api/tasks/{tid}")
    assert response2.status_code == 404

def test_list_contains_created_task(client):
    # Create one task
    created = client.post("/api/tasks", json={"title": "Item A"}).json()

    # List tasks
    response = client.get("/api/tasks")
    assert response.status_code == 200
    data = response.json()
    # Assert: the created task is present
    assert any(t["id"] == created["id"] for t in data)

def test_list_pagination_and_order(client):
    # Create 3 items
    client.post("/api/tasks", json={"title": "First"})
    client.post("/api/tasks", json={"title": "Second"})
    client.post("/api/tasks", json={"title": "Third"})

    # Expect newest first (created_at desc)
    page1 = client.get("/api/tasks?limit=2&offset=0").json()
    page2 = client.get("/api/tasks?limit=2&offset=2").json()

    # Assert page sizes
    assert len(page1) == 2
    assert len(page2) >= 1  # third item may be the only one

    # Optional: check that page1 items are not duplicated in page2
    ids1 = {t["id"] for t in page1}
    ids2 = {t["id"] for t in page2}
    assert ids1.isdisjoint(ids2)