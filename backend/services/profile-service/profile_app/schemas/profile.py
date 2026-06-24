from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
import re
from datetime import datetime
class SocialLinkBase(BaseModel):
    type: str = Field(..., description="Тип соцсети, например github, telegram")
    url: str = Field(..., description="URL ссылки")

class SocialLinkCreate(SocialLinkBase):
    pass

class SocialLinkOut(SocialLinkBase):
    id: str
    profile_id: str

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    description: Optional[str] = Field(None, max_length=1000)
    url: Optional[str] = Field(None, max_length=500)
    repository_url: Optional[str] = Field(None, max_length=500)
    image_url: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = None
    position: int = Field(default=0, ge=0)

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=120)
    description: Optional[str] = Field(None, max_length=1000)
    url: Optional[str] = Field(None, max_length=500)
    repository_url: Optional[str] = Field(None, max_length=500)
    image_url: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = None
    position: Optional[int] = Field(None, ge=0)

class ProjectOut(ProjectBase):
    id: str
    profile_id: str
    created_at: datetime
    updated_at: datetime
    tags: List[str] = []

    class Config:
        from_attributes = True

class ProfileBase(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=30)
    display_name: Optional[str] = Field(None, max_length=100)
    headline: Optional[str] = Field(None, max_length=150)
    bio: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = Field(None, max_length=100)
    skills: Optional[List[str]] = None

    @field_validator("username")
    @classmethod
    def validate_username_format(cls, v):
        if v is not None:
            if not re.match(r'^[a-zA-Z0-9_-]+$', v):
                raise ValueError("Username может содержать только латинские буквы, цифры, дефис и подчёркивание")
        return v

class ProfileUpdate(ProfileBase):
    social_links: Optional[List[SocialLinkCreate]] = None

class ProfileOut(ProfileBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    skills: List[str] = []
    social_links: List[SocialLinkOut] = []
    projects: List[ProjectOut] = []

    class Config:
        from_attributes = True

class CheckUsernameResponse(BaseModel):
    available: bool

class ErrorResponse(BaseModel):
    error: dict
