import asyncio
import json
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from profile_app.db.database import SessionLocal
from profile_app.models.events import OutboxEvent
from profile_app.events.rabbitmq import rabbitmq

logger = logging.getLogger("profile-service.outbox_publisher")

async def process_outbox():
    while True:
        db = SessionLocal()
        try:
            events = db.query(OutboxEvent).filter(
                OutboxEvent.status == "pending"
            ).limit(10).all()
            for event in events:
                try:
                    await rabbitmq.publish(
                        routing_key=event.event_type,
                        message=json.loads(event.payload_json)
                    )
                    event.status = "published"
                    event.published_at = datetime.now(timezone.utc)
                except Exception as e:
                    event.retry_count += 1
                    event.last_error = str(e)
                    if event.retry_count >= 3:
                        event.status = "failed"
                    db.commit()
                    logger.error(f"Failed to publish {event.event_id}: {e}")
            db.commit()
        except Exception as e:
            logger.error(f"Outbox processing error: {e}")
        finally:
            db.close()
        await asyncio.sleep(5)  # проверяем каждые 5 секунд