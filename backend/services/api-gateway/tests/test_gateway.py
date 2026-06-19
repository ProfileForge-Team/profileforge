from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
import app.api.routes as routes


client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "api-gateway",
    }


def test_ready_returns_services_status(monkeypatch):
    async def fake_check_service_ready(service_url: str):
        if service_url == settings.auth_service_url:
            return {
                "status": "ok",
                "status_code": 200,
            }

        return {
            "status": "unavailable",
            "status_code": None,
        }

    monkeypatch.setattr(routes, "check_service_ready", fake_check_service_ready)

    response = client.get("/ready")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ready"
    assert data["service"] == "api-gateway"
    assert data["services"]["auth-service"]["status"] == "ok"
    assert data["services"]["profile-service"]["status"] == "unavailable"
    assert data["services"]["site-service"]["status"] == "unavailable"


def test_auth_register_is_proxied_to_auth_service_without_auth(monkeypatch):
    captured = {}

    async def fake_proxy_request(request, target_base_url, target_path, require_auth=False):
        captured["method"] = request.method
        captured["target_base_url"] = target_base_url
        captured["target_path"] = target_path
        captured["require_auth"] = require_auth
        captured["body"] = await request.json()

        return JSONResponse(
            status_code=201,
            content={
                "proxied": True,
            },
        )

    monkeypatch.setattr(routes, "proxy_request", fake_proxy_request)

    response = client.post(
        "/api/auth/register",
        json={
            "email": "test@example.com",
            "password": "12345678",
        },
    )

    assert response.status_code == 201
    assert response.json()["proxied"] is True

    assert captured["method"] == "POST"
    assert captured["target_base_url"] == settings.auth_service_url
    assert captured["target_path"] == "/auth/register"
    assert captured["require_auth"] is False
    assert captured["body"]["email"] == "test@example.com"


def test_auth_login_is_proxied_to_auth_service_without_auth(monkeypatch):
    captured = {}

    async def fake_proxy_request(request, target_base_url, target_path, require_auth=False):
        captured["method"] = request.method
        captured["target_base_url"] = target_base_url
        captured["target_path"] = target_path
        captured["require_auth"] = require_auth

        return JSONResponse(
            status_code=200,
            content={
                "access_token": "fake-token",
            },
        )

    monkeypatch.setattr(routes, "proxy_request", fake_proxy_request)

    response = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "12345678",
        },
    )

    assert response.status_code == 200
    assert response.json()["access_token"] == "fake-token"

    assert captured["method"] == "POST"
    assert captured["target_base_url"] == settings.auth_service_url
    assert captured["target_path"] == "/auth/login"
    assert captured["require_auth"] is False


def test_auth_me_is_proxied_to_auth_service_with_auth_required(monkeypatch):
    captured = {}

    async def fake_proxy_request(request, target_base_url, target_path, require_auth=False):
        captured["method"] = request.method
        captured["target_base_url"] = target_base_url
        captured["target_path"] = target_path
        captured["require_auth"] = require_auth
        captured["authorization"] = request.headers.get("authorization")

        return JSONResponse(
            status_code=200,
            content={
                "id": "user-id",
                "email": "test@example.com",
                "is_active": True,
            },
        )

    monkeypatch.setattr(routes, "proxy_request", fake_proxy_request)

    response = client.get(
        "/api/auth/me",
        headers={
            "Authorization": "Bearer fake-token",
        },
    )

    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"

    assert captured["method"] == "GET"
    assert captured["target_base_url"] == settings.auth_service_url
    assert captured["target_path"] == "/auth/me"
    assert captured["require_auth"] is True
    assert captured["authorization"] == "Bearer fake-token"


def test_profiles_me_is_proxied_to_profile_service_with_auth_required(monkeypatch):
    captured = {}

    async def fake_proxy_request(request, target_base_url, target_path, require_auth=False):
        captured["method"] = request.method
        captured["target_base_url"] = target_base_url
        captured["target_path"] = target_path
        captured["require_auth"] = require_auth

        return JSONResponse(
            status_code=200,
            content={
                "user_id": "user-id",
                "username": "test-user",
            },
        )

    monkeypatch.setattr(routes, "proxy_request", fake_proxy_request)

    response = client.get(
        "/api/profiles/me",
        headers={
            "Authorization": "Bearer fake-token",
        },
    )

    assert response.status_code == 200
    assert response.json()["username"] == "test-user"

    assert captured["method"] == "GET"
    assert captured["target_base_url"] == settings.profile_service_url
    assert captured["target_path"] == "/profiles/me"
    assert captured["require_auth"] is True


def test_sites_root_is_proxied_to_site_service_with_auth_required(monkeypatch):
    captured = {}

    async def fake_proxy_request(request, target_base_url, target_path, require_auth=False):
        captured["method"] = request.method
        captured["target_base_url"] = target_base_url
        captured["target_path"] = target_path
        captured["require_auth"] = require_auth
        captured["body"] = await request.json()

        return JSONResponse(
            status_code=201,
            content={
                "site_id": "site-id",
                "status": "draft",
            },
        )

    monkeypatch.setattr(routes, "proxy_request", fake_proxy_request)

    response = client.post(
        "/api/sites",
        headers={
            "Authorization": "Bearer fake-token",
        },
        json={
            "title": "My Portfolio",
            "slug": "my-portfolio",
            "template_id": "default",
        },
    )

    assert response.status_code == 201
    assert response.json()["site_id"] == "site-id"

    assert captured["method"] == "POST"
    assert captured["target_base_url"] == settings.site_service_url
    assert captured["target_path"] == "/sites"
    assert captured["require_auth"] is True
    assert captured["body"]["slug"] == "my-portfolio"


def test_public_page_is_proxied_to_site_service_without_auth(monkeypatch):
    captured = {}

    async def fake_proxy_request(request, target_base_url, target_path, require_auth=False):
        captured["method"] = request.method
        captured["target_base_url"] = target_base_url
        captured["target_path"] = target_path
        captured["require_auth"] = require_auth

        return JSONResponse(
            status_code=200,
            content={
                "slug": "ivan-dev",
                "status": "published",
            },
        )

    monkeypatch.setattr(routes, "proxy_request", fake_proxy_request)

    response = client.get("/api/public/ivan-dev")

    assert response.status_code == 200
    assert response.json()["slug"] == "ivan-dev"

    assert captured["method"] == "GET"
    assert captured["target_base_url"] == settings.site_service_url
    assert captured["target_path"] == "/public/ivan-dev"
    assert captured["require_auth"] is False
