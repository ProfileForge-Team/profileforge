import asyncio
import json
import logging
from typing import Callable
import aio_pika

logger = logging.getLogger("profile-service.rabbitmq")

class RabbitMQManager:
    def __init__(self, url: str = "amqp://guest:guest@localhost/"):
        self.url = url
        self.connection = None
        self.channel = None
        self._consumers = []

    async def connect(self):
        try:
            self.connection = await aio_pika.connect_robust(self.url)
            self.channel = await self.connection.channel()
            logger.info("Connected to RabbitMQ")
        except Exception as e:
            logger.warning(f"RabbitMQ not available: {e}. Running without broker.")
            self.connection = None
            self.channel = None

    async def close(self):
        if self.connection:
            await self.connection.close()

    async def publish(self, routing_key: str, message: dict):
        if not self.channel:
            logger.info(f"Would publish to {routing_key}: {message}")
            return
        exchange = await self.channel.get_exchange("profile-forge", ensure=False)
        await exchange.publish(
            aio_pika.Message(body=json.dumps(message).encode()),
            routing_key=routing_key,
        )

    async def subscribe(self, queue_name: str, callback: Callable):
        if not self.channel:
            logger.info(f"Subscribing to {queue_name} (noop)")
            return
        queue = await self.channel.declare_queue(queue_name, durable=True)
        await queue.consume(lambda msg: asyncio.create_task(self._on_message(msg, callback)))

    async def _on_message(self, message: aio_pika.IncomingMessage, callback: Callable):
        async with message.process():
            body = json.loads(message.body.decode())
            await callback(body)

rabbitmq = RabbitMQManager()