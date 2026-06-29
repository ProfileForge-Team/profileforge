import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


def generate_uuid() -> str:
    """Generate string UUID primary keys for SQLite-friendly models."""
    return str(uuid.uuid4())


class OutboxEvent(Base):
    """Transactional outbox event waiting to be published to RabbitMQ."""

    __tablename__ = "outbox_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    event_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True, default=generate_uuid)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    aggregate_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    payload_json: Mapped[dict] = mapped_column(JSON, nullable=False)

    # pending | published | failed
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_error: Mapped[str | None] = mapped_column(String(1000), nullable=True)


class ProcessedEvent(Base):
    """Inbox record used to keep event consumers idempotent."""

    __tablename__ = "processed_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    event_id: Mapped[str] = mapped_column(String(36), nullable=False, unique=True, index=True)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    processed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
