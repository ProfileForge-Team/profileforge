import sys
import os
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from main import app, ensure_profile_schema
from profile_app.db.database import engine, Base
import profile_app.models.profile
import profile_app.models.events

Base.metadata.create_all(bind=engine)
ensure_profile_schema()

client = TestClient(app)


def test_get_profile_creates_empty():
    user_id = "test-get-empty"
    response = client.get("/profiles/me", headers={"X-User-ID": user_id})
    assert response.status_code == 200

    data = response.json()

    assert data["user_id"] == user_id
    assert data["username"] is None
    assert data["social_links"] == []
    assert data["skills"] == []


def test_update_profile():
    user_id = "test-update-user"

    client.get("/profiles/me", headers={"X-User-ID": user_id})

    response = client.patch(
        "/profiles/me",
        headers={"X-User-ID": user_id},
        json={
            "username": "update_user",
            "display_name": "Maxim",
            "headline": "Backend Developer",
            "bio": "Learning microservices",
            "location": "Moscow",
            "skills": ["Python", "FastAPI", "Docker"],
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["username"] == "update_user"
    assert data["display_name"] == "Maxim"
    assert data["skills"] == ["Python", "FastAPI", "Docker"]


def test_project_crud():
    user_id = f"test-project-user-{uuid.uuid4().hex}"
    headers = {"X-User-ID": user_id}

    client.get("/profiles/me", headers=headers)

    first_response = client.post(
        "/profiles/me/projects",
        headers=headers,
        json={
            "title": "API Gateway",
            "description": "FastAPI gateway for ProfileForge",
            "url": "https://example.com",
            "repository_url": "https://github.com/ProfileForge-Team/profileforge",
            "tags": ["FastAPI", "Docker"],
            "position": 2,
        },
    )

    second_response = client.post(
        "/profiles/me/projects",
        headers=headers,
        json={
            "title": "Portfolio Builder",
            "tags": ["React"],
            "position": 1,
        },
    )

    assert first_response.status_code == 201
    assert second_response.status_code == 201

    list_response = client.get("/profiles/me/projects", headers=headers)

    assert list_response.status_code == 200

    projects = list_response.json()

    assert [project["title"] for project in projects] == [
        "Portfolio Builder",
        "API Gateway",
    ]

    project_id = first_response.json()["id"]

    update_response = client.patch(
        f"/profiles/me/projects/{project_id}",
        headers=headers,
        json={
            "position": 0,
            "tags": ["FastAPI", "RabbitMQ"],
        },
    )

    assert update_response.status_code == 200
    assert update_response.json()["tags"] == ["FastAPI", "RabbitMQ"]

    delete_response = client.delete(
        f"/profiles/me/projects/{project_id}",
        headers=headers,
    )

    assert delete_response.status_code == 204

    final_response = client.get("/profiles/me/projects", headers=headers)

    assert [project["title"] for project in final_response.json()] == [
        "Portfolio Builder",
    ]


def test_username_already_taken():
    user_a = "user-a"

    client.get("/profiles/me", headers={"X-User-ID": user_a})
    client.patch(
        "/profiles/me",
        headers={"X-User-ID": user_a},
        json={"username": "shared_user"},
    )

    user_b = "user-b"

    client.get("/profiles/me", headers={"X-User-ID": user_b})

    response = client.patch(
        "/profiles/me",
        headers={"X-User-ID": user_b},
        json={"username": "shared_user"},
    )

    assert response.status_code == 409


def test_check_username():
    response = client.get("/profiles/check-username/shared_user")

    assert response.status_code == 200
    assert response.json()["available"] is False

    response = client.get("/profiles/check-username/free_user")

    assert response.status_code == 200
    assert response.json()["available"] is True


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
