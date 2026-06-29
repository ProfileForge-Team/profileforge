import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from profile_app.models.profile import Profile, Project, SocialLink
from profile_app.models.events import OutboxEvent
from profile_app.schemas.profile import ProfileUpdate, ProjectCreate, ProjectUpdate
import uuid


def get_profile_by_user_id(db: Session, user_id: str) -> Profile | None:
    """Load a profile by auth user id with relationships ready for serialization."""
    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    if profile:
        _ = profile.social_links  # подгружаем соцсети, пока сессия открыта
        _ = profile.projects
    return profile


def create_profile(db: Session, user_id: str) -> Profile:
    """Create the empty profile used immediately after registration."""
    profile = Profile(
        id=str(uuid.uuid4()),
        user_id=user_id
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    _ = profile.social_links
    _ = profile.projects
    return profile


def update_profile(db: Session, profile: Profile, update_data: ProfileUpdate) -> Profile:
    """Update profile fields, replace social links, and enqueue profile.updated."""
    data = update_data.model_dump(exclude_unset=True, exclude={"social_links"})
    for key, value in data.items():
        setattr(profile, key, value)

    if update_data.social_links is not None:
        db.query(SocialLink).filter(SocialLink.profile_id == profile.id).delete()
        for link in update_data.social_links:
            new_link = SocialLink(
                id=str(uuid.uuid4()),
                profile_id=profile.id,
                type=link.type,
                url=link.url
            )
            db.add(new_link)

    db.commit()
    db.refresh(profile)
    _ = profile.social_links  # подгружаем соцсети после обновления

    # Создаём outbox-событие profile.updated
    event_id = str(uuid.uuid4())
    outbox_event = OutboxEvent(
        event_id=event_id,
        event_type="profile.updated",
        aggregate_id=profile.user_id,
        payload_json=json.dumps({
            "event_id": event_id,
            "event_type": "profile.updated",
            "producer": "profile-service",
            "occurred_at": datetime.now(timezone.utc).isoformat(),
            "payload": {
                "user_id": profile.user_id,
                "username": profile.username,
                "display_name": profile.display_name,
                "headline": profile.headline,
                "skills": profile.skills or [],
            }
        })
    )
    db.add(outbox_event)
    db.commit()  # сохраняем outbox-событие

    return profile


def get_profile_by_username(db: Session, username: str) -> Profile | None:
    """Load a public profile by username with relationships ready for output."""
    profile = db.query(Profile).filter(Profile.username == username).first()
    if profile:
        _ = profile.social_links
        _ = profile.projects
    return profile


def is_username_taken(db: Session, username: str, exclude_user_id: str | None = None) -> bool:
    """Check username uniqueness, optionally ignoring the current user."""
    query = db.query(Profile).filter(Profile.username == username)
    if exclude_user_id:
        query = query.filter(Profile.user_id != exclude_user_id)
    return query.first() is not None


def list_projects(db: Session, profile: Profile) -> list[Project]:
    """List projects in the order expected by the portfolio UI."""
    return (
        db.query(Project)
        .filter(Project.profile_id == profile.id)
        .order_by(Project.position, Project.created_at)
        .all()
    )


def get_project(db: Session, profile: Profile, project_id: str) -> Project | None:
    """Load one project only if it belongs to the given profile."""
    return (
        db.query(Project)
        .filter(Project.id == project_id, Project.profile_id == profile.id)
        .first()
    )


def create_project(db: Session, profile: Profile, project_data: ProjectCreate) -> Project:
    """Persist a new project for the given profile."""
    data = project_data.model_dump()
    project = Project(
        id=str(uuid.uuid4()),
        profile_id=profile.id,
        tags=data.pop("tags") or [],
        **data,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def update_project(
    db: Session, project: Project, project_data: ProjectUpdate
) -> Project:
    """Patch project fields while normalizing missing tag lists."""
    data = project_data.model_dump(exclude_unset=True)
    if "tags" in data and data["tags"] is None:
        data["tags"] = []

    for key, value in data.items():
        setattr(project, key, value)

    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project: Project) -> None:
    """Remove a project from the profile."""
    db.delete(project)
    db.commit()
