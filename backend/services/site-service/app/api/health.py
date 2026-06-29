from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.db.session import check_db_connection

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    """Return site-service liveness without checking external dependencies."""
    return {"status": "ok"}


@router.get("/ready")
async def ready():
    """Check whether site-service can reach its database."""
    db_ok = await check_db_connection()

    checks = {
        "database": "ok" if db_ok else "unavailable",
    }

    if not db_ok:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "checks": checks},
        )

    return {"status": "ready", "checks": checks}
