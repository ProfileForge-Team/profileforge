from typing import Any

import httpx
from fastapi import Request, Response

from app.core.config import settings
from app.core.errors import gateway_error
from app.core.security import decode_access_token, extract_bearer_token


HOP_BY_HOP_HEADERS = {
    "host",
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    "content-length",
}


def _build_headers(request: Request, require_auth: bool) -> dict[str, str]:
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() not in HOP_BY_HOP_HEADERS
    }

    if require_auth:
        token = extract_bearer_token(headers.get("authorization"))
        payload = decode_access_token(token)

        user_id = payload.get("sub")
        email = payload.get("email")

        if user_id:
            headers["X-User-Id"] = str(user_id)

        if email:
            headers["X-User-Email"] = str(email)

    return headers


async def proxy_request(
    request: Request,
    target_base_url: str,
    target_path: str,
    require_auth: bool = False,
) -> Response:
    url = f"{target_base_url.rstrip('/')}/{target_path.lstrip('/')}"

    headers = _build_headers(request, require_auth=require_auth)
    body = await request.body()

    try:
        async with httpx.AsyncClient(timeout=settings.request_timeout_seconds) as client:
            upstream_response = await client.request(
                method=request.method,
                url=url,
                params=request.query_params,
                content=body,
                headers=headers,
            )
    except httpx.ConnectError:
        raise gateway_error(
            status_code=503,
            code="SERVICE_UNAVAILABLE",
            message=f"Service is unavailable: {target_base_url}",
        )
    except httpx.TimeoutException:
        raise gateway_error(
            status_code=504,
            code="SERVICE_TIMEOUT",
            message=f"Service timeout: {target_base_url}",
        )
    except httpx.HTTPError as exc:
        raise gateway_error(
            status_code=502,
            code="BAD_GATEWAY",
            message="Gateway failed to proxy request",
            details={"error": str(exc)},
        )

    response_headers = {
        key: value
        for key, value in upstream_response.headers.items()
        if key.lower() not in HOP_BY_HOP_HEADERS
    }

    return Response(
        content=upstream_response.content,
        status_code=upstream_response.status_code,
        headers=response_headers,
        media_type=upstream_response.headers.get("content-type"),
    )


async def check_service_ready(service_url: str) -> dict[str, Any]:
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(f"{service_url.rstrip('/')}/ready")
            return {
                "status": "ok" if response.status_code == 200 else "error",
                "status_code": response.status_code,
            }
    except httpx.HTTPError:
        return {
            "status": "unavailable",
            "status_code": None,
        }
