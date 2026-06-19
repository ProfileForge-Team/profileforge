import pytest


async def _create_site(client, headers, slug="ivan-dev"):
    response = await client.post(
        "/sites", json={"title": "Test Site", "slug": slug}, headers=headers
    )
    return response.json()["id"]


async def test_add_block_success(client, auth_headers):
    site_id = await _create_site(client, auth_headers)

    response = await client.post(
        f"/sites/{site_id}/blocks",
        json={
            "type": "about",
            "position": 1,
            "content": {"text": "Backend developer на FastAPI"},
        },
        headers=auth_headers,
    )

    assert response.status_code == 201
    body = response.json()
    assert body["type"] == "about"
    assert body["content"]["text"] == "Backend developer на FastAPI"


async def test_update_block_success(client, auth_headers):
    site_id = await _create_site(client, auth_headers)
    add_resp = await client.post(
        f"/sites/{site_id}/blocks",
        json={"type": "skills", "position": 1, "content": {"items": ["Python"]}},
        headers=auth_headers,
    )
    block_id = add_resp.json()["id"]

    response = await client.patch(
        f"/sites/{site_id}/blocks/{block_id}",
        json={"content": {"items": ["Python", "FastAPI"]}},
        headers=auth_headers,
    )

    assert response.status_code == 200
    assert response.json()["content"]["items"] == ["Python", "FastAPI"]


async def test_cannot_edit_block_of_foreign_site(
    client, auth_headers, other_auth_headers
):
    site_id = await _create_site(client, auth_headers)
    add_resp = await client.post(
        f"/sites/{site_id}/blocks",
        json={"type": "about", "position": 1, "content": {"text": "hi"}},
        headers=auth_headers,
    )
    block_id = add_resp.json()["id"]

    response = await client.patch(
        f"/sites/{site_id}/blocks/{block_id}",
        json={"content": {"text": "hacked"}},
        headers=other_auth_headers,
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN"
