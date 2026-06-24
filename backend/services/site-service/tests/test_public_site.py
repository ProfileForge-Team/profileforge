import pytest


async def test_templates_are_public(client):
    response = await client.get("/sites/templates")

    assert response.status_code == 200
    body = response.json()
    template_ids = {template["id"] for template in body}
    assert {
        "default",
        "dark-developer",
        "minimal-resume",
        "cyber-showcase",
    } <= template_ids


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


async def test_preview_returns_owned_draft_site_with_blocks(client, auth_headers):
    create_resp = await client.post(
        "/sites",
        json={"title": "Preview Site", "slug": "preview-site"},
        headers=auth_headers,
    )
    site_id = create_resp.json()["id"]
    await client.post(
        f"/sites/{site_id}/blocks",
        json={"type": "about", "position": 1, "content": {"text": "draft"}},
        headers=auth_headers,
    )

    response = await client.get(f"/sites/{site_id}/preview", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["site"]["slug"] == "preview-site"
    assert body["site"]["status"] == "draft"
    assert body["blocks"][0]["type"] == "about"
    assert body["blocks"][0]["content"]["text"] == "draft"


async def test_cannot_preview_foreign_site(
    client, auth_headers, other_auth_headers
):
    create_resp = await client.post(
        "/sites",
        json={"title": "Private Site", "slug": "private-site"},
        headers=auth_headers,
    )
    site_id = create_resp.json()["id"]

    response = await client.get(
        f"/sites/{site_id}/preview", headers=other_auth_headers
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"


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
