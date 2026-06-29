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


async def test_dashboard_summary_without_site(client, auth_headers):
    response = await client.get("/sites/dashboard/summary", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["has_site"] is False
    assert body["site"] is None
    assert body["blocks_count"] == 0
    assert body["is_published"] is False
    assert body["missing_required_blocks"] == ["about"]


async def test_dashboard_summary_with_draft_site(client, auth_headers):
    create_response = await client.post(
        "/sites",
        json={"title": "Dashboard Site", "slug": "dashboard-site"},
        headers=auth_headers,
    )
    site_id = create_response.json()["id"]
    await client.post(
        f"/sites/{site_id}/blocks",
        json={"type": "about", "position": 1, "content": {"text": "hi"}},
        headers=auth_headers,
    )

    response = await client.get("/sites/dashboard/summary", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["has_site"] is True
    assert body["site"]["slug"] == "dashboard-site"
    assert body["blocks_count"] == 1
    assert body["is_published"] is False
    assert body["public_url"] is None
    assert body["missing_required_blocks"] == []


async def test_update_site_slug(client, auth_headers):
    create_response = await client.post(
        "/sites",
        json={"title": "Old Site", "slug": "old-site"},
        headers=auth_headers,
    )
    site_id = create_response.json()["id"]

    response = await client.patch(
        f"/sites/{site_id}",
        json={"slug": "alex-react-dev"},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["slug"] == "alex-react-dev"


async def test_update_site_slug_conflict(client, auth_headers, other_auth_headers):
    await client.post(
        "/sites",
        json={"title": "Taken Site", "slug": "taken-slug"},
        headers=other_auth_headers,
    )
    create_response = await client.post(
        "/sites",
        json={"title": "My Site", "slug": "my-site"},
        headers=auth_headers,
    )
    site_id = create_response.json()["id"]

    response = await client.patch(
        f"/sites/{site_id}",
        json={"slug": "taken-slug"},
        headers=auth_headers,
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "SLUG_ALREADY_EXISTS"
