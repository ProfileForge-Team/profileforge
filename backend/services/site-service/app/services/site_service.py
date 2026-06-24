from app.core.config import settings
from app.core.exceptions import (
    ForbiddenError,
    NotFoundError,
    SlugAlreadyExistsError,
    ValidationAppError,
)
from app.models.site import Site, SiteBlock
from app.repositories.outbox_repository import OutboxRepository
from app.repositories.site_repository import SiteRepository
from app.schemas.site import SiteBlockCreate, SiteBlockUpdate, SiteCreate, SiteUpdate

# Минимальный набор блоков, без которых нельзя публиковать сайт (см. п. 7.7 ТЗ)
REQUIRED_BLOCK_TYPES = {"about"}

AVAILABLE_TEMPLATES = [
    {
        "id": "default",
        "name": "Default",
        "description": "Universal portfolio layout for MVP profiles.",
        "preview_image": None,
    },
    {
        "id": "dark-developer",
        "name": "Dark Developer",
        "description": "High-contrast dark layout for developer portfolios.",
        "preview_image": None,
    },
    {
        "id": "minimal-resume",
        "name": "Minimal Resume",
        "description": "Clean resume-first layout with restrained visual styling.",
        "preview_image": None,
    },
    {
        "id": "cyber-showcase",
        "name": "Cyber Showcase",
        "description": "Expressive portfolio layout for project-heavy pages.",
        "preview_image": None,
    },
]


class SiteService:
    def __init__(self, db, sites: SiteRepository, outbox: OutboxRepository):
        self.db = db
        self.sites = sites
        self.outbox = outbox

    async def create_site(self, owner_user_id: str, data: SiteCreate) -> Site:
        existing_for_owner = await self.sites.get_by_owner(owner_user_id)
        if existing_for_owner is not None:
            # MVP-режим: один пользователь = один сайт (п. 7.6 ТЗ)
            raise ValidationAppError(
                "У пользователя уже есть сайт. Один пользователь = один сайт.",
                field="owner_user_id",
            )

        existing_slug = await self.sites.get_by_slug(data.slug)
        if existing_slug is not None:
            raise SlugAlreadyExistsError("Slug уже занят", field="slug")

        site = Site(
            owner_user_id=owner_user_id,
            title=data.title,
            slug=data.slug,
            template_id=data.template_id,
            status="draft",
        )
        await self.sites.create(site)
        await self.db.commit()
        await self.db.refresh(site)
        return site

    async def get_my_site(self, owner_user_id: str) -> Site:
        site = await self.sites.get_by_owner(owner_user_id)
        if site is None:
            raise NotFoundError("Сайт не найден")
        return site

    async def list_templates(self) -> list[dict]:
        return AVAILABLE_TEMPLATES

    async def get_dashboard_summary(self, owner_user_id: str) -> dict:
        site = await self.sites.get_by_owner(owner_user_id)
        if site is None:
            return {
                "has_site": False,
                "site": None,
                "blocks_count": 0,
                "is_published": False,
                "public_url": None,
                "missing_required_blocks": sorted(REQUIRED_BLOCK_TYPES),
            }

        blocks = await self.sites.list_blocks(site.id)
        block_types = {block.type for block in blocks}
        missing_required_blocks = sorted(REQUIRED_BLOCK_TYPES - block_types)

        return {
            "has_site": True,
            "site": site,
            "blocks_count": len(blocks),
            "is_published": site.status == "published",
            "public_url": site.public_url,
            "missing_required_blocks": missing_required_blocks,
        }

    async def update_site(
        self, site_id: str, owner_user_id: str, data: SiteUpdate
    ) -> Site:
        site = await self._get_owned_site(site_id, owner_user_id)

        if data.title is not None:
            site.title = data.title
        if data.template_id is not None:
            site.template_id = data.template_id

        await self.db.commit()
        await self.db.refresh(site)
        return site

    async def add_block(
        self, site_id: str, owner_user_id: str, data: SiteBlockCreate
    ) -> SiteBlock:
        await self._get_owned_site(site_id, owner_user_id)

        block = SiteBlock(
            site_id=site_id,
            type=data.type,
            position=data.position,
            content_json=data.content,
        )
        await self.sites.add_block(block)
        await self.db.commit()
        await self.db.refresh(block)
        return block

    async def list_blocks(self, site_id: str, owner_user_id: str) -> list[SiteBlock]:
        await self._get_owned_site(site_id, owner_user_id)
        return await self.sites.list_blocks(site_id)

    async def get_preview(
        self, site_id: str, owner_user_id: str
    ) -> tuple[Site, list[SiteBlock]]:
        site = await self._get_owned_site(site_id, owner_user_id)
        blocks = await self.sites.list_blocks(site_id)
        return site, blocks

    async def update_block(
        self, site_id: str, block_id: str, owner_user_id: str, data: SiteBlockUpdate
    ) -> SiteBlock:
        await self._get_owned_site(site_id, owner_user_id)
        block = await self.sites.get_block(site_id, block_id)
        if block is None:
            raise NotFoundError("Блок не найден")

        if data.position is not None:
            block.position = data.position
        if data.content is not None:
            block.content_json = data.content

        await self.db.commit()
        await self.db.refresh(block)
        return block

    async def delete_block(self, site_id: str, block_id: str, owner_user_id: str) -> None:
        await self._get_owned_site(site_id, owner_user_id)
        block = await self.sites.get_block(site_id, block_id)
        if block is None:
            raise NotFoundError("Блок не найден")

        await self.sites.delete_block(block)
        await self.db.commit()

    async def publish_site(self, site_id: str, owner_user_id: str) -> Site:
        site = await self._get_owned_site(site_id, owner_user_id)
        blocks = await self.sites.list_blocks(site_id)
        block_types = {b.type for b in blocks}

        if not REQUIRED_BLOCK_TYPES.issubset(block_types):
            site.status = "publish_failed"
            await self.db.commit()
            raise ValidationAppError(
                f"Нельзя опубликовать сайт без обязательных блоков: {REQUIRED_BLOCK_TYPES}",
                field="blocks",
            )

        from datetime import datetime

        site.status = "published"
        site.published_at = datetime.utcnow()
        site.public_url = f"{settings.PUBLIC_SITE_BASE_URL}/{site.slug}"

        await self.outbox.add_event(
            event_type="site.published",
            aggregate_id=site.id,
            payload={
                "site_id": site.id,
                "owner_user_id": site.owner_user_id,
                "public_url": site.public_url,
            },
        )

        await self.db.commit()
        await self.db.refresh(site)
        return site

    async def get_public_site(self, slug: str) -> tuple[Site, list[SiteBlock]]:
        site = await self.sites.get_by_slug(slug)
        if site is None or site.status != "published":
            raise NotFoundError("Сайт не найден")

        blocks = await self.sites.list_blocks(site.id)
        return site, blocks

    async def _get_owned_site(self, site_id: str, owner_user_id: str) -> Site:
        site = await self.sites.get_by_id(site_id)
        if site is None:
            raise NotFoundError("Сайт не найден")
        if site.owner_user_id != owner_user_id:
            raise ForbiddenError("Нельзя редактировать чужой сайт")
        return site
