import logging

import aio_pika
from aio_pika import ExchangeType
from aio_pika.abc import AbstractRobustConnection

from app.core.config import settings

logger = logging.getLogger(settings.SERVICE_NAME)

EXCHANGE_NAME = settings.RABBITMQ_EXCHANGE_NAME

_connection: AbstractRobustConnection | None = None


async def get_rabbitmq_connection() -> AbstractRobustConnection:
    """Return a cached robust RabbitMQ connection, creating it on first use."""
    global _connection
    if _connection is None or _connection.is_closed:
        logger.info("Connecting to RabbitMQ")
        _connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
    return _connection


async def get_events_exchange(channel: aio_pika.abc.AbstractChannel):
    """Declare the topic exchange used by service event publishers."""
    return await channel.declare_exchange(
        EXCHANGE_NAME, ExchangeType.TOPIC, durable=True
    )


async def close_rabbitmq_connection() -> None:
    """Close the cached RabbitMQ connection during application shutdown."""
    global _connection
    if _connection is not None and not _connection.is_closed:
        await _connection.close()
        _connection = None
