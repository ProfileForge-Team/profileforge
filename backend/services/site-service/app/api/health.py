from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.db.session import check_db_connection

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    """
    Проверка, что сервис жив (процесс запущен и отвечает).
    Не проверяет зависимости (БД, RabbitMQ) — это задача /ready.
    """
    return {"status": "ok"}


@router.get("/ready")
async def ready():
    """
    Проверка готовности сервиса: подключение к БД (и в перспективе RabbitMQ).
    """
    db_ok = await check_db_connection()

    # TODO: добавить проверку RabbitMQ, когда появится publisher/consumer
    checks = {
        "database": "ok" if db_ok else "unavailable",
    }

    if not db_ok:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "checks": checks},
        )

    return {"status": "ready", "checks": checks}
