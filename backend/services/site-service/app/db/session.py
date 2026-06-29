from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models in site-service."""
    pass


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db():
    """Yield one async database session for the current FastAPI request."""
    async with AsyncSessionLocal() as session:
        yield session


async def check_db_connection() -> bool:
    """Return True when the database connection can be opened."""
    try:
        async with engine.connect() as conn:
            await conn.run_sync(lambda _: None)
        return True
    except Exception:
        return False
