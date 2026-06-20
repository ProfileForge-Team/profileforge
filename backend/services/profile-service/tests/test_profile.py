import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from main import app
from profile_app.db.database import engine, Base
import profile_app.models.profile
import profile_app.models.events

# Создаём таблицы перед тестами
Base.metadata.create_all(bind=engine)

client = TestClient(app)


def test_get_profile_creates_empty():
    user_id = "test-get-empty"
    response = client.get("/profiles/me", headers={"X-User-ID": user_id})
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == user_id
    assert data["username"] is None
    assert data["social_links"] == []


def test_update_profile():
    user_id = "test-update-user"
    # Создаём пустой профиль
    client.get("/profiles/me", headers={"X-User-ID": user_id})
    response = client.patch(
        "/profiles/me",
        headers={"X-User-ID": user_id},
        json={
            "username": "update_user",
            "display_name": "Максим",
            "headline": "Backend Developer",
            "bio": "Учусь делать микросервисы",
            "location": "Москва"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "update_user"
    assert data["display_name"] == "Максим"


def test_username_already_taken():
    # Первый пользователь занимает username "shared_user"
    user_a = "user-a"
    client.get("/profiles/me", headers={"X-User-ID": user_a})
    client.patch(
        "/profiles/me",
        headers={"X-User-ID": user_a},
        json={"username": "shared_user"}
    )

    # Второй пользователь пытается занять тот же username
    user_b = "user-b"
    client.get("/profiles/me", headers={"X-User-ID": user_b})
    response = client.patch(
        "/profiles/me",
        headers={"X-User-ID": user_b},
        json={"username": "shared_user"}
    )
    assert response.status_code == 409


def test_check_username():
    # username "shared_user" уже занят
    response = client.get("/profiles/check-username/shared_user")
    assert response.status_code == 200
    assert response.json()["available"] == False

    response = client.get("/profiles/check-username/free_user")
    assert response.status_code == 200
    assert response.json()["available"] == True


def test_check_invalid_username():
    response = client.get("/profiles/check-username/iv@n")
    assert response.status_code == 422


def test_get_public_profile():
    response = client.get("/profiles/by-username/shared_user")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "shared_user"


def test_public_profile_not_found():
    response = client.get("/profiles/by-username/nonexistent")
    assert response.status_code == 404