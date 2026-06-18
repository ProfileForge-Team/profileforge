import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Integer, JSON, String, Text

from app.models.base import Base


def utc_now():
    return datetime.now(timezone.utc)


class OutboxEvent(Base):
    __tablename__ = "outbox_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))

    event_type = Column(String(100), nullable=False, index=True)
    aggregate_id = Column(String(36), nullable=False, index=True)

    payload_json = Column(JSON, nullable=False)

    status = Column(String(30), nullable=False, default="pending", index=True)
    retry_count = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), nullable=False, default=utc_now)
    published_at = Column(DateTime(timezone=True), nullable=True)

    last_error = Column(Text, nullable=True)
