from fastapi import Header

from app.core.exceptions import UnauthorizedError


async def get_current_user_id(x_user_id: str | None = Header(default=None)) -> str:
    """Read the user id injected by API Gateway for protected site routes."""
    if not x_user_id:
        raise UnauthorizedError("X-User-Id header is required")
    return x_user_id
