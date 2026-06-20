from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Настройки Site Service.
    Загружаются из переменных окружения / .env файла.
    """

    SERVICE_NAME: str = "site-service"

    # SQLite вместо PostgreSQL (см. договорённость по проекту)
    DATABASE_URL: str = "sqlite+aiosqlite:///./site_service.db"

    # RabbitMQ
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"
    PUBLIC_SITE_BASE_URL: str = "http://localhost:8000/public"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
