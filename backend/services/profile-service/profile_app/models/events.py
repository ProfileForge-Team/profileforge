from sqlalchemy import Column, String, Text, DateTime, Integer
from sqlalchemy.sql import func
from profile_app.db.database import Base
import uuid

class OutboxEvent(Base):
    __tablename__ = "outbox_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), unique=True, nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    aggregate_id = Column(String(36), nullable=False)
    payload_json = Column(Text, nullable=False)
    status = Column(String(20), default="pending")  # pending, published, failed
    retry_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    published_at = Column(DateTime(timezone=True), nullable=True)
    last_error = Column(Text, nullable=True)

class ProcessedEvent(Base):
    __tablename__ = "processed_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    event_id = Column(String(36), unique=True, nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    processed_at = Column(DateTime(timezone=True), server_default=func.now())