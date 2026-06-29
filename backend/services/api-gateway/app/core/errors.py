from fastapi import HTTPException


def gateway_error(status_code: int, code: str, message: str, details: dict | None = None) -> HTTPException:
    """Create the normalized error shape returned by API Gateway."""
    return HTTPException(
        status_code=status_code,
        detail={
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
            }
        },
    )
