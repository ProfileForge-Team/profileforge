import asyncio
import logging

from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.sites import router as sites_router
from app.core.config import settings
from app.core.exceptions import AppError, app_error_handler
from app.core.rabbitmq import close_rabbitmq_connection
from app.publishers.outbox_publisher import outbox_publisher_loop

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(settings.SERVICE_NAME)

app = FastAPI(title="Site Service", version="0.1.0")

app.add_exception_handler(AppError, app_error_handler)

app.include_router(health_router)
app.include_router(sites_router)

_publisher_task: asyncio.Task | None = None


@app.on_event("startup")
async def on_startup():
    global _publisher_task
    logger.info(f"{settings.SERVICE_NAME} starting up")
    _publisher_task = asyncio.create_task(outbox_publisher_loop())


@app.on_event("shutdown")
async def on_shutdown():
    global _publisher_task
    logger.info(f"{settings.SERVICE_NAME} shutting down")
    if _publisher_task is not None:
        _publisher_task.cancel()
    await close_rabbitmq_connection()
