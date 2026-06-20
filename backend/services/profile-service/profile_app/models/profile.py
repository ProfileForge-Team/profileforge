from sqlalchemy import Column, String, Text, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from profile_app.db.database import Base
import uuid

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), unique=True, nullable=False, index=True)
    username = Column(String(30), unique=True, nullable=True)
    display_name = Column(String(100), nullable=True)
    headline = Column(String(150), nullable=True)
    bio = Column(Text, nullable=True)
    location = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    social_links = relationship("SocialLink", back_populates="profile", cascade="all, delete-orphan")


class SocialLink(Base):
    __tablename__ = "social_links"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    profile_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)
    url = Column(String(500), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    profile = relationship("Profile", back_populates="social_links")

    __table_args__ = (
        UniqueConstraint("profile_id", "type", name="uq_social_link_profile_type"),
    )