from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.db.session import SessionLocal


router = APIRouter(tags=["Health"])


@router.get("/health")
def health():
    """Return auth-service liveness without checking dependencies."""
    return {
        "status": "ok",
        "service": settings.service_name,
    }


@router.get("/ready")
def ready():
    """Check auth-service database readiness."""
    db_status = "error"

    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()

        db_status = "ok"

    except Exception:
        db_status = "error"

    status = "ready" if db_status == "ok" else "not_ready"

    return {
        "status": status,
        "service": settings.service_name,
        "db": db_status,
    }
