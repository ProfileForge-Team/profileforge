import pytest


async def _create_site(client, headers, slug="ivan-dev"):
    response = await client.post(
        "/sites", json={"title": "Test Site", "slug": slug}, headers=headers
    )
    return response.json()["id"]


async def test_publish_site_success(client, auth_headers):
    site_id = await _create_site(client, auth_headers)
    await client.post(
        f"/sites/{site_id}/blocks",
        json={"type": "about", "position": 1, "content": {"text": "hi"}},
        headers=auth_headers,
    )

    response = await client.post(
        f"/sites/{site_id}/publish", headers=auth_headers
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "published"
    assert body["public_url"] is not None


async def test_publish_site_without_required_blocks_fails(client, auth_headers):
    site_id = await _create_site(client, auth_headers)

    response = await client.post(
        f"/sites/{site_id}/publish", headers=auth_headers
    )

    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


async def test_publish_creates_outbox_event(client, auth_headers, db_session):
    from sqlalchemy import select
    from app.models.outbox import OutboxEvent

    site_id = await _create_site(client, auth_headers)
    await client.post(
        f"/sites/{site_id}/blocks",
        json={"type": "about", "position": 1, "content": {"text": "hi"}},
        headers=auth_headers,
    )
    await client.post(f"/sites/{site_id}/publish", headers=auth_headers)

    result = await db_session.execute(
        select(OutboxEvent).where(OutboxEvent.event_type == "site.published")
    )
    event = result.scalar_one_or_none()

    assert event is not None
    assert event.status == "pending"
    assert event.payload_json["site_id"] == site_id
