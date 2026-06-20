import pytest


async def _create_and_publish_site(client, headers, slug="ivan-dev"):
    create_resp = await client.post(
        "/sites", json={"title": "Test Site", "slug": slug}, headers=headers
    )
    site_id = create_resp.json()["id"]

    await client.post(
        f"/sites/{site_id}/blocks",
        json={"type": "about", "position": 1, "content": {"text": "hi"}},
        headers=headers,
    )
    await client.post(f"/sites/{site_id}/publish", headers=headers)
    return site_id


async def test_published_site_available_via_public_endpoint(client, auth_headers):
    await _create_and_publish_site(client, auth_headers, slug="public-ivan")

    response = await client.get("/public/public-ivan")

    assert response.status_code == 200
    body = response.json()
    assert body["slug"] == "public-ivan"
    assert body["status"] == "published"
    assert len(body["blocks"]) == 1


async def test_draft_site_not_available_via_public_endpoint(client, auth_headers):
    await client.post(
        "/sites",
        json={"title": "Draft Site", "slug": "draft-site"},
        headers=auth_headers,
    )

    response = await client.get("/public/draft-site")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


async def test_nonexistent_slug_returns_404(client):
    response = await client.get("/public/does-not-exist")

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"
