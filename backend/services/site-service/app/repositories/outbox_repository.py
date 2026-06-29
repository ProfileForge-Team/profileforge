from sqlalchemy.ext.asyncio import AsyncSession

from app.models.outbox import OutboxEvent


class OutboxRepository:
    def __init__(self, db: AsyncSession):
        """Store the request-scoped async database session."""
        self.db = db

    async def add_event(
        self, event_type: str, aggregate_id: str, payload: dict
    ) -> OutboxEvent:
        """Add an event to the transactional outbox in the current unit of work."""
        event = OutboxEvent(
            event_type=event_type,
            aggregate_id=aggregate_id,
            payload_json=payload,
            status="pending",
        )
        self.db.add(event)
        await self.db.flush()
        return event
