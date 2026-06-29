from fastapi import APIRouter, Depends, status

from app.api.deps import get_site_service
from app.core.security import get_current_user_id
from app.schemas.site import (
    DashboardSummaryOut,
    PublicSiteBlockOut,
    PublicSiteOut,
    SiteBlockCreate,
    SiteBlockOut,
    SiteBlockUpdate,
    SiteCreate,
    SiteOut,
    SitePublishOut,
    SitePreviewOut,
    SiteUpdate,
    TemplateOut,
)
from app.services.site_service import SiteService

router = APIRouter(tags=["sites"])


def _block_to_out(block) -> SiteBlockOut:
    """Convert a SQLAlchemy block model into the API response schema."""
    return SiteBlockOut(
        id=block.id,
        site_id=block.site_id,
        type=block.type,
        position=block.position,
        content=block.content_json,
        created_at=block.created_at,
        updated_at=block.updated_at,
    )


@router.post("/sites", response_model=SiteOut, status_code=status.HTTP_201_CREATED)
async def create_site(
    data: SiteCreate,
    user_id: str = Depends(get_current_user_id),
    service: SiteService = Depends(get_site_service),
):
    """Create the authenticated user's editable portfolio site."""
    site = await service.create_site(user_id, data)
    return SiteOut.model_validate(site)


@router.get("/sites/me", response_model=SiteOut)
async def get_my_site(
    user_id: str = Depends(get_current_user_id),
    service: SiteService = Depends(get_site_service),
):
    """Return the authenticated user's current site."""
    site = await service.get_my_site(user_id)
    return SiteOut.model_validate(site)


@router.patch("/sites/{site_id}", response_model=SiteOut)
async def update_site(
    site_id: str,
    data: SiteUpdate,
    user_id: str = Depends(get_current_user_id),
    service: SiteService = Depends(get_site_service),
):
    """Update title, slug, or selected template for an owned site."""
    site = await service.update_site(site_id, user_id, data)
    return SiteOut.model_validate(site)


@router.get("/sites/templates", response_model=list[TemplateOut])
async def list_templates(
    service: SiteService = Depends(get_site_service),
):
    """Return all templates available to the frontend."""
    return await service.list_templates()


@router.get("/sites/dashboard/summary", response_model=DashboardSummaryOut)
async def get_dashboard_summary(
    user_id: str = Depends(get_current_user_id),
    service: SiteService = Depends(get_site_service),
):
    """Return site readiness details for dashboard aggregation."""
    return await service.get_dashboard_summary(user_id)


@router.post(
    "/sites/{site_id}/blocks",
    response_model=SiteBlockOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_block(
    site_id: str,
    data: SiteBlockCreate,
    user_id: str = Depends(get_current_user_id),
    service: SiteService = Depends(get_site_service),
):
    """Add a content block to an owned site."""
    block = await service.add_block(site_id, user_id, data)
    return _block_to_out(block)


@router.get("/sites/{site_id}/blocks", response_model=list[SiteBlockOut])
async def list_blocks(
    site_id: str,
    user_id: str = Depends(get_current_user_id),
    service: SiteService = Depends(get_site_service),
):
    """List content blocks for an owned site."""
    blocks = await service.list_blocks(site_id, user_id)
    return [_block_to_out(block) for block in blocks]


@router.get("/sites/{site_id}/preview", response_model=SitePreviewOut)
async def get_site_preview(
    site_id: str,
    user_id: str = Depends(get_current_user_id),
    service: SiteService = Depends(get_site_service),
):
    """Return draft site data for the owner preview screen."""
    site, blocks = await service.get_preview(site_id, user_id)
    return SitePreviewOut(
        site=SiteOut.model_validate(site),
        blocks=[_block_to_out(block) for block in blocks],
    )


@router.patch("/sites/{site_id}/blocks/{block_id}", response_model=SiteBlockOut)
async def update_block(
    site_id: str,
    block_id: str,
    data: SiteBlockUpdate,
    user_id: str = Depends(get_current_user_id),
    service: SiteService = Depends(get_site_service),
):
    """Patch a block on an owned site."""
    block = await service.update_block(site_id, block_id, user_id, data)
    return _block_to_out(block)


@router.delete(
    "/sites/{site_id}/blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_block(
    site_id: str,
    block_id: str,
    user_id: str = Depends(get_current_user_id),
    service: SiteService = Depends(get_site_service),
):
    """Delete a block on an owned site."""
    await service.delete_block(site_id, block_id, user_id)


@router.post("/sites/{site_id}/publish", response_model=SitePublishOut)
async def publish_site(
    site_id: str,
    user_id: str = Depends(get_current_user_id),
    service: SiteService = Depends(get_site_service),
):
    """Publish an owned site and return the public URL metadata."""
    site = await service.publish_site(site_id, user_id)
    return SitePublishOut(
        site_id=site.id, status=site.status, public_url=site.public_url
    )


@router.get("/public/{slug}", response_model=PublicSiteOut)
async def get_public_site(
    slug: str,
    service: SiteService = Depends(get_site_service),
):
    """Return published site data by slug without requiring authentication."""
    site, blocks = await service.get_public_site(slug)
    return PublicSiteOut(
        site_id=site.id,
        title=site.title,
        slug=site.slug,
        status=site.status,
        template_id=site.template_id,
        blocks=[
            PublicSiteBlockOut(type=b.type, position=b.position, content=b.content_json)
            for b in blocks
        ],
    )
