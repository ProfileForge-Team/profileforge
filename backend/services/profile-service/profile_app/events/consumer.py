import logging
from datetime import datetime, timezone

from profile_app.db.database import SessionLocal
from profile_app.models.events import ProcessedEvent
from profile_app.repositories.profile import get_profile_by_user_id
from profile_app.models.profile import Profile
import uuid

logger = logging.getLogger("profile-service.consumer")


async def handle_user_registered(message: dict) -> None:
    """Create an empty profile once for each valid user.registered event."""
    event_id = message.get("event_id")
    event_type = message.get("event_type")
    payload = message.get("payload", {})
    user_id = payload.get("user_id")

    if event_type != "user.registered" or not event_id or not user_id:
        logger.warning("Invalid user.registered message: %s", message)
        return

    db = SessionLocal()

    try:
        already_processed = (
            db.query(ProcessedEvent)
            .filter(ProcessedEvent.event_id == event_id)
            .first()
        )

        if already_processed:
            logger.info("Event %s already processed", event_id)
            return

        profile = get_profile_by_user_id(db, user_id)

        if profile is None:
            profile = Profile(
                id=str(uuid.uuid4()),
                user_id=user_id,
            )
            db.add(profile)

        db.add(
            ProcessedEvent(
                id=str(uuid.uuid4()),
                event_id=event_id,
                event_type=event_type,
                processed_at=datetime.now(timezone.utc),
            )
        )

        db.commit()

        logger.info(
            "Processed user.registered for user %s, event %s",
            user_id,
            event_id,
        )

    except Exception:
        db.rollback()
        logger.exception(
            "Failed to process user.registered event %s",
            event_id,
        )
        raise

    finally:
        db.close()
