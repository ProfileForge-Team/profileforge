from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings


password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plain password before it is stored in the database."""
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Compare a plain password with the stored bcrypt hash."""
    return password_context.verify(password, password_hash)


def create_access_token(subject: str) -> str:
    """Create a short-lived JWT used to authorize protected API requests."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )

    payload = {
        "sub": subject,
        "exp": expire,
        "type": "access",
    }

    return jwt.encode(
        payload,
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def create_refresh_token(subject: str) -> str:
    """Create a longer-lived JWT used only to refresh access tokens."""
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.refresh_token_expire_days
    )

    payload = {
        "sub": subject,
        "exp": expire,
        "type": "refresh",
    }

    return jwt.encode(
        payload,
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def decode_access_token(token: str) -> dict:
    """Decode and validate that the JWT is an access token."""
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )

        if payload.get("type") != "access":
            raise JWTError("Invalid token type")

        return payload

    except JWTError as error:
        raise error


def decode_refresh_token(token: str) -> dict:
    """Decode and validate that the JWT is a refresh token."""
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )

        if payload.get("type") != "refresh":
            raise JWTError("Invalid token type")

        return payload

    except JWTError as error:
        raise error
