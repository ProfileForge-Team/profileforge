import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.db.session import Base, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db_session():
    """
    Каждый тест получает свежую in-memory БД со всеми таблицами,
    чтобы тесты были изолированы друг от друга.
    """
    engine = create_async_engine(TEST_DATABASE_URL, future=True)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    TestSessionLocal = async_sessionmaker(
        bind=engine, class_=AsyncSession, expire_on_commit=False
    )

    async with TestSessionLocal() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session):
    """AsyncClient с переопределённой зависимостью get_db на тестовую сессию."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers():
    """Заглушка авторизации (см. app/core/security.py)."""
    return {"X-User-Id": "11111111-1111-1111-1111-111111111111"}


@pytest.fixture
def other_auth_headers():
    """Второй пользователь — для проверки чужих сайтов/блоков."""
    return {"X-User-Id": "22222222-2222-2222-2222-222222222222"}
