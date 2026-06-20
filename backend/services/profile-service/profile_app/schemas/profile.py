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

class ProfileBase(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=30)
    display_name: Optional[str] = Field(None, max_length=100)
    headline: Optional[str] = Field(None, max_length=150)
    bio: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = Field(None, max_length=100)

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
    social_links: List[SocialLinkOut] = []

    class Config:
        from_attributes = True

class CheckUsernameResponse(BaseModel):
    available: bool

class ErrorResponse(BaseModel):
    error: dict
