from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator
import re

SLUG_PATTERN = re.compile(r"^[a-z0-9-]{3,50}$")

BlockType = Literal[
    "about", "skills", "experience", "projects", "education", "achievements", "contacts"
]
SiteStatus = Literal["draft", "published", "publish_failed", "archived"]


# ---------- Site ----------

class SiteCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    slug: str
    template_id: str = Field(default="default", max_length=50)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        if not SLUG_PATTERN.match(v):
            raise ValueError(
                "slug должен быть 3-50 символов: латиница в нижнем регистре, цифры, дефис"
            )
        return v


class SiteUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    template_id: str | None = Field(default=None, max_length=50)


class SiteOut(BaseModel):
    id: str
    owner_user_id: str
    title: str
    slug: str
    status: SiteStatus
    template_id: str
    public_url: str | None
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None

    model_config = {"from_attributes": True}


class SitePublishOut(BaseModel):
    site_id: str
    status: SiteStatus
    public_url: str | None


class TemplateOut(BaseModel):
    id: str
    name: str
    description: str
    preview_image: str | None = None


# ---------- SiteBlock ----------

class SiteBlockCreate(BaseModel):
    type: BlockType
    position: int = Field(ge=0)
    content: dict[str, Any]


class SiteBlockUpdate(BaseModel):
    position: int | None = Field(default=None, ge=0)
    content: dict[str, Any] | None = None


class SiteBlockOut(BaseModel):
    id: str
    site_id: str
    type: BlockType
    position: int
    content: dict[str, Any] = Field(serialization_alias="content")
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}


class SitePreviewOut(BaseModel):
    site: SiteOut
    blocks: list[SiteBlockOut]


class DashboardSummaryOut(BaseModel):
    has_site: bool
    site: SiteOut | None = None
    blocks_count: int = 0
    is_published: bool = False
    public_url: str | None = None
    missing_required_blocks: list[BlockType] = []


# ---------- Public site ----------

class PublicSiteBlockOut(BaseModel):
    type: BlockType
    position: int
    content: dict[str, Any]


class PublicSiteOut(BaseModel):
    site_id: str
    title: str
    slug: str
    status: SiteStatus
    template_id: str
    blocks: list[PublicSiteBlockOut]


# ---------- Errors (единый формат, см. п. 9 ТЗ) ----------

class ErrorDetail(BaseModel):
    field: str | None = None


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict[str, Any] | None = None


class ErrorResponse(BaseModel):
    error: ErrorBody
