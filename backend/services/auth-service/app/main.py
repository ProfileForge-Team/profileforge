from fastapi import FastAPI

from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.core.config import settings
from app.db.init_db import init_db


app = FastAPI(
    title="ProfileForge Auth Service",
    version="0.1.0",
)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(health_router)
app.include_router(auth_router)