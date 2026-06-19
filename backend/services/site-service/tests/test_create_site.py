import pytest


async def test_create_site_success(client, auth_headers):
    response = await client.post(
        "/sites",
        json={"title": "Ivan Ivanov - Backend Developer", "slug": "ivan-dev"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["slug"] == "ivan-dev"
    assert body["status"] == "draft"


async def test_create_site_with_taken_slug_fails(client, auth_headers, other_auth_headers):
    await client.post(
        "/sites",
        json={"title": "First site", "slug": "taken-slug"},
        headers=auth_headers,
    )

    response = await client.post(
        "/sites",
        json={"title": "Second site", "slug": "taken-slug"},
        headers=other_auth_headers,
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "SLUG_ALREADY_EXISTS"


async def test_create_second_site_for_same_user_fails(client, auth_headers):
    await client.post(
        "/sites",
        json={"title": "First", "slug": "first-slug"},
        headers=auth_headers,
    )

    response = await client.post(
        "/sites",
        json={"title": "Second", "slug": "second-slug"},
        headers=auth_headers,
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
