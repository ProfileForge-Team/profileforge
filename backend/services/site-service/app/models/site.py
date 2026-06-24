import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Integer, String, JSON, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Site(Base):
    """
    Сайт-резюме пользователя.
    Для MVP: один пользователь = один сайт (см. п. 7.6 ТЗ).
    """

    __tablename__ = "sites"
    __table_args__ = (
        UniqueConstraint("slug", name="uq_sites_slug"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    owner_user_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # draft | published | publish_failed | archived
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")

    template_id: Mapped[str] = mapped_column(String(50), nullable=False, default="default")
    public_url: Mapped[str | None] = mapped_column(String(300), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    blocks: Mapped[list["SiteBlock"]] = relationship(
        "SiteBlock", back_populates="site", cascade="all, delete-orphan"
    )


class SiteBlock(Base):
    """
    Блок резюме (about, skills, experience, projects, education, achievements, contacts).
    Контент хранится как JSON (в SQLite — через TEXT-сериализацию, см. п. 7.3 ТЗ).
    """

    __tablename__ = "site_blocks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    site_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sites.id", ondelete="CASCADE"), nullable=False, index=True
    )

    type: Mapped[str] = mapped_column(String(30), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    content_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    site: Mapped["Site"] = relationship("Site", back_populates="blocks")
