import pytest
from fastapi.testclient import TestClient

from app.main import app, services

client = TestClient(app)
VALID = {"name": "billing-api", "owner": "platform-team", "description": "Billing"}


@pytest.fixture(autouse=True)
def clean_state():
    services.clear()
    yield
    services.clear()


def test_list_is_empty_at_start():
    assert client.get("/services").json() == []


def test_create_returns_201_and_the_service():
    response = client.post("/services", json=VALID)
    assert response.status_code == 201
    assert response.json()["name"] == "billing-api"
    assert response.json()["status"] == "registered"


def test_create_duplicate_returns_409():
    client.post("/services", json=VALID)
    assert client.post("/services", json=VALID).status_code == 409


def test_create_invalid_name_returns_422():
    assert client.post("/services", json={**VALID, "name": "Mi_Servicio"}).status_code == 422


def test_get_returns_the_service():
    client.post("/services", json=VALID)
    assert client.get("/services/billing-api").json()["owner"] == "platform-team"


def test_get_unknown_returns_404():
    assert client.get("/services/nope").status_code == 404


def test_delete_removes_the_service():
    client.post("/services", json=VALID)
    assert client.delete("/services/billing-api").status_code == 204
    assert client.get("/services/billing-api").status_code == 404


def test_delete_unknown_returns_404():
    assert client.delete("/services/nope").status_code == 404


def test_status_returns_registered():
    client.post("/services", json=VALID)
    assert client.get("/services/billing-api/status").json() == {"name": "billing-api", "status": "registered"}


def test_status_unknown_returns_404():
    assert client.get("/services/nope/status").status_code == 404
