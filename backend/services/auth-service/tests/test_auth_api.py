import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.models.outbox_event import OutboxEvent


client = TestClient(app)


def unique_email(prefix: str = "test") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:12]}@example.com"


def test_health_returns_ok():
    response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "auth-service"


def test_ready_returns_ok():
    response = client.get("/ready")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["service"] == "auth-service"
    assert data["db"] == "ok"


def test_register_login_me_and_outbox_event():
    email = unique_email("full-flow")
    password = "12345678"

    register_response = client.post(
        "/auth/register",
        json={"email": email, "password": password},
    )

    assert register_response.status_code == 200
    register_data = register_response.json()

    assert register_data["message"] == "User registered successfully"
    assert register_data["user"]["email"] == email
    assert register_data["user"]["is_active"] is True

    user_id = register_data["user"]["id"]

    login_response = client.post(
        "/auth/login",
        json={"email": email, "password": password},
    )

    assert login_response.status_code == 200
    login_data = login_response.json()

    assert "access_token" in login_data
    assert login_data["access_token"]

    token = login_data["access_token"]

    me_response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert me_response.status_code == 200
    me_data = me_response.json()

    assert me_data["id"] == user_id
    assert me_data["email"] == email
    assert me_data["is_active"] is True

    db = SessionLocal()
    try:
        event = (
            db.query(OutboxEvent)
            .filter(
                OutboxEvent.event_type == "user.registered",
                OutboxEvent.aggregate_id == user_id,
            )
            .first()
        )

        assert event is not None
        assert event.status in {"pending", "published"}
        assert event.retry_count == 0
    finally:
        db.close()


def test_duplicate_registration_is_rejected():
    email = unique_email("duplicate")
    password = "12345678"

    first_response = client.post(
        "/auth/register",
        json={"email": email, "password": password},
    )

    assert first_response.status_code == 200

    second_response = client.post(
        "/auth/register",
        json={"email": email, "password": password},
    )

    assert second_response.status_code in {400, 409}


def test_login_with_wrong_password_is_rejected():
    email = unique_email("wrong-password")

    register_response = client.post(
        "/auth/register",
        json={"email": email, "password": "12345678"},
    )

    assert register_response.status_code == 200

    login_response = client.post(
        "/auth/login",
        json={"email": email, "password": "wrong-password"},
    )

    assert login_response.status_code in {400, 401}


def test_me_without_token_is_rejected():
    response = client.get("/auth/me")

    assert response.status_code in {401, 403}