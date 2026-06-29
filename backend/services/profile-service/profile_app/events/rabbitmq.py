import asyncio
import json
import logging
from typing import Awaitable, Callable

import aio_pika
from aio_pika import ExchangeType

from profile_app.core.config import RABBITMQ_EXCHANGE_NAME, RABBITMQ_URL

logger = logging.getLogger("profile-service.rabbitmq")

MessageHandler = Callable[[dict], Awaitable[None]]


class RabbitMQManager:
    def __init__(self, url: str, exchange_name: str):
        self.url = url
        self.exchange_name = exchange_name
        self.connection = None
        self.channel = None

    async def connect(self) -> None:
        max_attempts = 30

        for attempt in range(1, max_attempts + 1):
            try:
                self.connection = await aio_pika.connect_robust(self.url)
                self.channel = await self.connection.channel()
                await self.channel.set_qos(prefetch_count=10)

                logger.info("Connected to RabbitMQ")
                return

            except Exception as error:
                logger.warning(
                    "RabbitMQ is not ready, attempt %s/%s: %s",
                    attempt,
                    max_attempts,
                    error,
                )

                if attempt == max_attempts:
                    raise

                await asyncio.sleep(2)

    async def close(self) -> None:
        if self.connection:
            await self.connection.close()

    async def get_exchange(self):
        if not self.channel:
            raise RuntimeError("RabbitMQ channel is not initialized")

        return await self.channel.declare_exchange(
            self.exchange_name,
            ExchangeType.TOPIC,
            durable=True,
        )

    async def publish(self, routing_key: str, message: dict) -> None:
        exchange = await self.get_exchange()

        await exchange.publish(
            aio_pika.Message(
                body=json.dumps(message).encode("utf-8"),
                content_type="application/json",
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
                message_id=message.get("event_id"),
            ),
            routing_key=routing_key,
        )

    async def subscribe(
        self,
        queue_name: str,
        routing_key: str,
        callback: MessageHandler,
    ) -> None:
        if not self.channel:
            raise RuntimeError("RabbitMQ channel is not initialized")

        exchange = await self.get_exchange()

        queue = await self.channel.declare_queue(
            queue_name,
            durable=True,
        )

        await queue.bind(exchange, routing_key=routing_key)

        async def on_message(message: aio_pika.IncomingMessage) -> None:
            await self._on_message(message, callback)

        await queue.consume(on_message)

        logger.info(
            "Subscribed to queue %s with routing key %s",
            queue_name,
            routing_key,
        )

    async def _on_message(
        self,
        message: aio_pika.IncomingMessage,
        callback: MessageHandler,
    ) -> None:
        async with message.process():
            body = json.loads(message.body.decode("utf-8"))
            await callback(body)


rabbitmq = RabbitMQManager(
    url=RABBITMQ_URL,
    exchange_name=RABBITMQ_EXCHANGE_NAME,
)