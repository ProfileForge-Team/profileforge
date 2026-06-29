from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Header, status
from sqlalchemy import text
from sqlalchemy.orm import Session
import uvicorn
import re
import asyncio

from profile_app.db.database import engine, SessionLocal, Base
import profile_app.models.profile
import profile_app.models.events
from profile_app.repositories.profile import (
    get_profile_by_user_id,
    create_profile,
    update_profile,
    get_profile_by_username,
    is_username_taken,
    list_projects,
    get_project,
    create_project,
    update_project,
    delete_project,
)
from profile_app.schemas.profile import (
    ProfileOut,
    ProfileUpdate,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    CheckUsernameResponse,
)
from profile_app.events.rabbitmq import rabbitmq
from profile_app.events.outbox_publisher import process_outbox
from profile_app.events.consumer import handle_user_registered


def ensure_profile_schema():
    with engine.begin() as conn:
        columns = conn.execute(text("PRAGMA table_info(profiles)")).fetchall()
        column_names = {column[1] for column in columns}
        if "skills" not in column_names:
            conn.execute(
                text("ALTER TABLE profiles ADD COLUMN skills JSON DEFAULT '[]' NOT NULL")
            )


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_profile_schema()
    await rabbitmq.connect()
    await rabbitmq.subscribe(
    "profile-service.user-registered.queue",
    "user.registered",
    handle_user_registered,
)
    task = asyncio.create_task(process_outbox())
    yield
    task.cancel()
    await rabbitmq.close()


app = FastAPI(title="Profile Service", lifespan=lifespan)


def get_current_user_id(x_user_id: str = Header(..., alias="X-User-ID")) -> str:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User ID is required")
    return x_user_id


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/ready")
async def ready():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception:
        return {"status": "not ready", "error": "database unavailable"}


@app.get("/profiles/me", response_model=ProfileOut)
async def get_my_profile(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    profile = get_profile_by_user_id(db, user_id)
    if not profile:
        profile = create_profile(db, user_id)
    return profile


@app.patch("/profiles/me", response_model=ProfileOut)
async def update_my_profile(
    update_data: ProfileUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    profile = get_profile_by_user_id(db, user_id)
    if not profile:
        profile = create_profile(db, user_id)

    if update_data.username is not None and update_data.username != profile.username:
        if is_username_taken(db, update_data.username, exclude_user_id=user_id):
            raise HTTPException(
                status_code=409,
                detail={
                    "error": {
                        "code": "USERNAME_ALREADY_EXISTS",
                        "message": "Username is already taken",
                        "details": {"field": "username"},
                    }
                },
            )

    updated_profile = update_profile(db, profile, update_data)
    return updated_profile


@app.get("/profiles/by-username/{username}", response_model=ProfileOut)
async def get_public_profile(username: str, db: Session = Depends(get_db)):
    profile = get_profile_by_username(db, username)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@app.get("/profiles/me/projects", response_model=list[ProjectOut])
async def list_my_projects(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    profile = get_profile_by_user_id(db, user_id)
    if not profile:
        profile = create_profile(db, user_id)
    return list_projects(db, profile)


@app.post(
    "/profiles/me/projects",
    response_model=ProjectOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_my_project(
    project_data: ProjectCreate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    profile = get_profile_by_user_id(db, user_id)
    if not profile:
        profile = create_profile(db, user_id)
    return create_project(db, profile, project_data)


@app.patch("/profiles/me/projects/{project_id}", response_model=ProjectOut)
async def update_my_project(
    project_id: str,
    project_data: ProjectUpdate,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    profile = get_profile_by_user_id(db, user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    project = get_project(db, profile, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return update_project(db, project, project_data)


@app.delete(
    "/profiles/me/projects/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_my_project(
    project_id: str,
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    profile = get_profile_by_user_id(db, user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    project = get_project(db, profile, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    delete_project(db, project)


@app.get("/profiles/check-username/{username}", response_model=CheckUsernameResponse)
async def check_username(username: str, db: Session = Depends(get_db)):
    if not re.match(r'^[a-zA-Z0-9_-]{3,30}$', username):
        raise HTTPException(status_code=422, detail="Invalid username format")
    available = not is_username_taken(db, username)
    return {"available": available}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)
