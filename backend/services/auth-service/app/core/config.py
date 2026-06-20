from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    service_name: str = "auth-service"

    database_url: str = "postgresql+psycopg2://auth_user:auth_password@auth-db:5432/auth_db"

    secret_key: str = "CHANGE_ME_IN_PRODUCTION"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    rabbitmq_url: str = "amqp://profileforge:profileforge@rabbitmq:5672/"
    rabbitmq_exchange_name: str = "profileforge.events"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )


settings = Settings()
