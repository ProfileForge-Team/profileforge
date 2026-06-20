import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from profile_app.db.database import SessionLocal
from profile_app.models.events import ProcessedEvent
from profile_app.repositories.profile import create_profile

logger = logging.getLogger("profile-service.consumer")

async def handle_user_registered(message: dict):
    event_id = message.get("event_id")
    payload = message.get("payload", {})
    user_id = payload.get("user_id")

    if not event_id or not user_id:
        logger.warning(f"Invalid message: {message}")
        return

    db = SessionLocal()
    try:
        # Проверяем, не обработано ли уже это событие
        existing = db.query(ProcessedEvent).filter_by(event_id=event_id).first()
        if existing:
            logger.info(f"Event {event_id} already processed, skipping")
            return

        # Создаём профиль
        create_profile(db, user_id)

        # Записываем событие как обработанное
        processed = ProcessedEvent(
            event_id=event_id,
            event_type=message.get("event_type", "user.registered"),
            processed_at=datetime.now(timezone.utc)
        )
        db.add(processed)
        db.commit()
        logger.info(f"Profile created for user {user_id} (event {event_id})")
    except Exception as e:
        db.rollback()
        logger.error(f"Error processing user.registered: {e}")
    finally:
        db.close()