from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Header
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
)
from profile_app.schemas.profile import (
    ProfileOut,
    ProfileUpdate,
    CheckUsernameResponse,
)
from profile_app.events.rabbitmq import rabbitmq
from profile_app.events.outbox_publisher import process_outbox
from profile_app.events.consumer import handle_user_registered


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    await rabbitmq.connect()
    await rabbitmq.subscribe("profile-service.user-registered.queue", handle_user_registered)
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


@app.get("/profiles/check-username/{username}", response_model=CheckUsernameResponse)
async def check_username(username: str, db: Session = Depends(get_db)):
    if not re.match(r'^[a-zA-Z0-9_-]{3,30}$', username):
        raise HTTPException(status_code=422, detail="Invalid username format")
    available = not is_username_taken(db, username)
    return {"available": available}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)