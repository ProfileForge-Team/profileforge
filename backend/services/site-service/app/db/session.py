from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    """Базовый класс для всех моделей SQLAlchemy."""
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
    """Dependency для FastAPI: выдаёт сессию БД на запрос."""
    async with AsyncSessionLocal() as session:
        yield session


async def check_db_connection() -> bool:
    """Используется в /ready — проверяет, что БД доступна."""
    try:
        async with engine.connect() as conn:
            await conn.run_sync(lambda _: None)
        return True
    except Exception:
        return False
