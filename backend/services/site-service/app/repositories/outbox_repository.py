from sqlalchemy.ext.asyncio import AsyncSession

from app.models.outbox import OutboxEvent


class OutboxRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def add_event(
        self, event_type: str, aggregate_id: str, payload: dict
    ) -> OutboxEvent:
        """
        Пишет событие в outbox в РАМКАХ ТЕКУЩЕЙ транзакции
        (та же сессия, что и основная операция — см. п. 4.1 ТЗ).
        Публикация в RabbitMQ происходит отдельным publisher'ом.
        """
        event = OutboxEvent(
            event_type=event_type,
            aggregate_id=aggregate_id,
            payload_json=payload,
            status="pending",
        )
        self.db.add(event)
        await self.db.flush()
        return event
