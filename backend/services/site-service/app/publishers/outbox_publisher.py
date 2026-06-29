import asyncio
import json
import logging
from datetime import datetime, timezone

import aio_pika
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.rabbitmq import get_events_exchange, get_rabbitmq_connection
from app.db.session import AsyncSessionLocal
from app.models.outbox import OutboxEvent

logger = logging.getLogger(settings.SERVICE_NAME)

POLL_INTERVAL_SECONDS = 2
MAX_RETRY_COUNT = 5
BATCH_SIZE = 20


def build_event_envelope(event: OutboxEvent) -> dict:
    """Build the shared event envelope published to RabbitMQ."""
    return {
        "event_id": event.event_id,
        "event_type": event.event_type,
        "producer": settings.SERVICE_NAME,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "payload": event.payload_json,
    }


async def publish_pending_events(db: AsyncSession) -> int:
    """Publish pending outbox events and mark them as published or failed."""
    result = await db.execute(
        select(OutboxEvent)
        .where(OutboxEvent.status == "pending")
        .order_by(OutboxEvent.created_at)
        .limit(BATCH_SIZE)
    )
    pending_events = list(result.scalars().all())

    if not pending_events:
        return 0

    connection = await get_rabbitmq_connection()
    published_count = 0

    async with connection.channel() as channel:
        exchange = await get_events_exchange(channel)

        for event in pending_events:
            try:
                envelope = build_event_envelope(event)
                routing_key = event.event_type

                message = aio_pika.Message(
                    body=json.dumps(envelope).encode("utf-8"),
                    message_id=event.event_id,
                    content_type="application/json",
                    delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                )

                await exchange.publish(message, routing_key=routing_key)

                event.status = "published"
                event.published_at = datetime.utcnow()
                event.last_error = None
                logger.info(
                    f"Published event {event.event_id} ({event.event_type})"
                )
                published_count += 1

            except Exception as exc:
                event.retry_count += 1
                event.last_error = str(exc)[:1000]
                if event.retry_count >= MAX_RETRY_COUNT:
                    event.status = "failed"
                    logger.error(
                        f"Event {event.event_id} moved to failed after "
                        f"{event.retry_count} retries: {exc}"
                    )
                else:
                    logger.warning(
                        f"Failed to publish event {event.event_id}, "
                        f"retry {event.retry_count}/{MAX_RETRY_COUNT}: {exc}"
                    )

        await db.commit()

    return published_count


async def outbox_publisher_loop() -> None:
    """Continuously poll the outbox table and publish accumulated events."""
    logger.info("Outbox publisher loop started")
    while True:
        try:
            async with AsyncSessionLocal() as db:
                count = await publish_pending_events(db)
                if count:
                    logger.info(f"Outbox publisher: published {count} event(s)")
        except Exception as exc:
            logger.error(f"Outbox publisher loop error: {exc}")

        await asyncio.sleep(POLL_INTERVAL_SECONDS)
