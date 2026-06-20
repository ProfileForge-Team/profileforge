import pytest


async def test_get_my_site_returns_own_site(client, auth_headers):
    await client.post(
        "/sites",
        json={"title": "My Site", "slug": "my-site"},
        headers=auth_headers,
    )

    response = await client.get("/sites/me", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["slug"] == "my-site"


async def test_get_my_site_not_found_when_no_site(client, auth_headers):
    response = await client.get("/sites/me", headers=auth_headers)

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"
