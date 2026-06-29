from fastapi import Request, status
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base application exception converted into the shared API error shape."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    code: str = "VALIDATION_ERROR"

    def __init__(self, message: str, field: str | None = None):
        self.message = message
        self.field = field
        super().__init__(message)


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "NOT_FOUND"


class ForbiddenError(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    code = "FORBIDDEN"


class UnauthorizedError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    code = "UNAUTHORIZED"


class SlugAlreadyExistsError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "SLUG_ALREADY_EXISTS"


class ValidationAppError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    code = "VALIDATION_ERROR"


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """Convert domain exceptions into normalized JSON API errors."""
    details = {"field": exc.field} if exc.field else None
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": details,
            }
        },
    )
