import os

DATABASE_URL = os.getenv(
    "PROFILE_DATABASE_URL",
    "sqlite:///./profile.db",
)

RABBITMQ_URL = os.getenv(
    "RABBITMQ_URL",
    "amqp://guest:guest@localhost:5672/",
)

RABBITMQ_EXCHANGE_NAME = os.getenv(
    "RABBITMQ_EXCHANGE_NAME",
    "profileforge.events",
)