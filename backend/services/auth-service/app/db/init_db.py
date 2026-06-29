from app.models.base import Base
from app.models.user import User
from app.models.outbox_event import OutboxEvent
from app.db.session import engine


def init_db():
    """Create auth-service tables for local MVP startup."""
    Base.metadata.create_all(bind=engine)
