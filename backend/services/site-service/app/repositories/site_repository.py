from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.site import Site, SiteBlock


class SiteRepository:
    def __init__(self, db: AsyncSession):
        """Store the request-scoped async database session."""
        self.db = db

    async def get_by_id(self, site_id: str) -> Site | None:
        """Find a site by primary id."""
        result = await self.db.execute(select(Site).where(Site.id == site_id))
        return result.scalar_one_or_none()

    async def get_by_owner(self, owner_user_id: str) -> Site | None:
        """Find the single MVP site owned by a user."""
        result = await self.db.execute(
            select(Site).where(Site.owner_user_id == owner_user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Site | None:
        """Find a site by public slug."""
        result = await self.db.execute(select(Site).where(Site.slug == slug))
        return result.scalar_one_or_none()

    async def create(self, site: Site) -> Site:
        """Add a new site to the current unit of work."""
        self.db.add(site)
        await self.db.flush()
        return site

    async def get_block(self, site_id: str, block_id: str) -> SiteBlock | None:
        """Find a block only within the requested site."""
        result = await self.db.execute(
            select(SiteBlock).where(
                SiteBlock.id == block_id, SiteBlock.site_id == site_id
            )
        )
        return result.scalar_one_or_none()

    async def list_blocks(self, site_id: str) -> list[SiteBlock]:
        """Return all blocks for a site in render order."""
        result = await self.db.execute(
            select(SiteBlock)
            .where(SiteBlock.site_id == site_id)
            .order_by(SiteBlock.position)
        )
        return list(result.scalars().all())

    async def add_block(self, block: SiteBlock) -> SiteBlock:
        """Add a block to the current unit of work."""
        self.db.add(block)
        await self.db.flush()
        return block

    async def delete_block(self, block: SiteBlock) -> None:
        """Delete a block from the current unit of work."""
        await self.db.delete(block)
