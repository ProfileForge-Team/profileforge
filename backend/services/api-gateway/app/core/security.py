from jose import JWTError, jwt

from app.core.config import settings
from app.core.errors import gateway_error


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
    except JWTError:
        raise gateway_error(
            status_code=401,
            code="UNAUTHORIZED",
            message="Invalid or expired access token",
        )


def extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise gateway_error(
            status_code=401,
            code="UNAUTHORIZED",
            message="Authorization header is required",
        )

    scheme, _, token = authorization.partition(" ")

    if scheme.lower() != "bearer" or not token:
        raise gateway_error(
            status_code=401,
            code="UNAUTHORIZED",
            message="Bearer token is required",
        )

    return token
