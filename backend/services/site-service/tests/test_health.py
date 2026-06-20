import pytest


async def test_health_returns_200(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


async def test_ready_returns_200_when_db_available(client):
    response = await client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"
