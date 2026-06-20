import os
import sqlite3
import time
import uuid

import httpx


BASE_URL = os.getenv("INTEGRATION_BASE_URL", "http://api-gateway:8000")
PROFILE_DB_PATH = os.getenv("PROFILE_DB_PATH", "/data/profile.db")

PUBLIC_SITE_BASE_URL = os.getenv(
    "PUBLIC_SITE_BASE_URL",
    "http://localhost:18000/api/public",
)

def count_user_registered_events() -> int:
    connection = sqlite3.connect(PROFILE_DB_PATH)

    try:
        return connection.execute(
            """
            SELECT COUNT(*)
            FROM processed_events
            WHERE event_type = ?
            """,
            ("user.registered",),
        ).fetchone()[0]
    finally:
        connection.close()


def wait_for_profile_created_by_event(
    user_id: str,
    event_count_before: int,
) -> tuple[str, str | None]:
    deadline = time.time() + 20

    while time.time() < deadline:
        connection = sqlite3.connect(PROFILE_DB_PATH)

        try:
            profile = connection.execute(
                """
                SELECT user_id, username
                FROM profiles
                WHERE user_id = ?
                """,
                (user_id,),
            ).fetchone()

            event_count_after = connection.execute(
                """
                SELECT COUNT(*)
                FROM processed_events
                WHERE event_type = ?
                """,
                ("user.registered",),
            ).fetchone()[0]
        finally:
            connection.close()

        if profile is not None and event_count_after > event_count_before:
            return profile

        time.sleep(0.5)

    raise AssertionError(
        "Profile was not created after user.registered event within 20 seconds"
    )


def test_full_profileforge_user_journey():
    suffix = uuid.uuid4().hex[:12]
    email = f"e2e-{suffix}@example.com"
    password = "ProfileForge!123"
    username = f"e2e-{suffix}"
    slug = f"resume-{suffix}"

    event_count_before = count_user_registered_events()

    with httpx.Client(base_url=BASE_URL, timeout=15.0) as client:
        ready_response = client.get("/ready")
        assert ready_response.status_code == 200, ready_response.text

        register_response = client.post(
            "/api/auth/register",
            json={
                "email": email,
                "password": password,
            },
        )

        assert register_response.status_code in (200, 201), register_response.text

        user_id = register_response.json()["user"]["id"]

        profile_row = wait_for_profile_created_by_event(
            user_id=user_id,
            event_count_before=event_count_before,
        )

        assert profile_row[0] == user_id
        assert profile_row[1] is None

        login_response = client.post(
            "/api/auth/login",
            json={
                "email": email,
                "password": password,
            },
        )

        assert login_response.status_code == 200, login_response.text

        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        profile_response = client.patch(
            "/api/profiles/me",
            headers=headers,
            json={
                "username": username,
                "display_name": "E2E Test User",
                "headline": "Backend Developer",
                "bio": "Automated integration test",
                "location": "Moscow",
                "social_links": [
                    {
                        "type": "github",
                        "url": "https://github.com/NemezisCoder",
                    }
                ],
            },
        )

        assert profile_response.status_code == 200, profile_response.text
        assert profile_response.json()["username"] == username

        site_response = client.post(
            "/api/sites",
            headers=headers,
            json={
                "title": "E2E Integration Resume",
                "slug": slug,
                "template_id": "default",
            },
        )

        assert site_response.status_code == 201, site_response.text

        site_id = site_response.json()["id"]

        block_response = client.post(
            f"/api/sites/{site_id}/blocks",
            headers=headers,
            json={
                "type": "about",
                "position": 0,
                "content": {
                    "text": "Backend developer. Automated E2E portfolio.",
                },
            },
        )

        assert block_response.status_code == 201, block_response.text
        assert block_response.json()["type"] == "about"

        publish_response = client.post(
            f"/api/sites/{site_id}/publish",
            headers=headers,
        )

        assert publish_response.status_code == 200, publish_response.text
        assert publish_response.json()["status"] == "published"
        assert (
    publish_response.json()["public_url"]
    == f"{PUBLIC_SITE_BASE_URL}/{slug}"
)

        public_response = client.get(f"/api/public/{slug}")

        assert public_response.status_code == 200, public_response.text

        public_site = public_response.json()

        assert public_site["status"] == "published"
        assert public_site["slug"] == slug
        assert any(
            block["type"] == "about"
            and block["content"]["text"]
            == "Backend developer. Automated E2E portfolio."
            for block in public_site["blocks"]
        )
