from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.db.session import get_db
from app.repositories.outbox_repository import OutboxRepository
from app.repositories.site_repository import SiteRepository
from app.services.site_service import SiteService


def get_site_service(db: AsyncSession = Depends(get_db)) -> SiteService:
    """Build the SiteService dependency with request-scoped repositories."""
    sites = SiteRepository(db)
    outbox = OutboxRepository(db)
    return SiteService(db, sites, outbox)
