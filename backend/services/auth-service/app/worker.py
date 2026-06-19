import asyncio
import json
from datetime import datetime, timezone

import aio_pika

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.outbox_event import OutboxEvent


def utc_now():
    return datetime.now(timezone.utc)


async def publish_event_to_rabbitmq(exchange, event: OutboxEvent):
    message_body = {
        "event_id": event.event_id,
        "event_type": event.event_type,
        "producer": settings.service_name,
        "occurred_at": event.created_at.isoformat(),
        "payload": event.payload_json,
    }

    message = aio_pika.Message(
        body=json.dumps(message_body).encode("utf-8"),
        content_type="application/json",
        delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
    )

    await exchange.publish(
        message,
        routing_key=event.event_type,
    )


async def process_outbox_batch():
    db = SessionLocal()

    connection = None

    try:
        pending_events = (
            db.query(OutboxEvent)
            .filter(OutboxEvent.status == "pending")
            .order_by(OutboxEvent.created_at.asc())
            .limit(20)
            .all()
        )

        if not pending_events:
            return

        connection = await aio_pika.connect_robust(settings.rabbitmq_url)
        channel = await connection.channel()

        exchange = await channel.declare_exchange(
            settings.rabbitmq_exchange_name,
            aio_pika.ExchangeType.TOPIC,
            durable=True,
        )

        for event in pending_events:
            try:
                await publish_event_to_rabbitmq(exchange, event)

                event.status = "published"
                event.published_at = utc_now()
                event.last_error = None

                db.commit()

                print(f"Published event {event.event_type} {event.event_id}")

            except Exception as error:
                db.rollback()

                event.retry_count += 1
                event.last_error = str(error)

                if event.retry_count >= 5:
                    event.status = "failed"

                db.commit()

                print(f"Failed to publish event {event.event_id}: {error}")

    finally:
        db.close()

        if connection:
            await connection.close()


async def run_worker():
    print("Auth outbox worker started")

    while True:
        try:
            await process_outbox_batch()

        except Exception as error:
            print(f"Worker error: {error}")

        await asyncio.sleep(3)


if __name__ == "__main__":
    asyncio.run(run_worker())