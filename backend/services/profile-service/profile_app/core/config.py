import os

DATABASE_URL = os.getenv(
    "PROFILE_DATABASE_URL",
    "sqlite:///./profile.db"
)