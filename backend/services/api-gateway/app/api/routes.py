from fastapi import APIRouter, Request

from app.clients.proxy import check_service_ready, proxy_request
from app.core.config import settings


router = APIRouter()


@router.get("/health")
async def health():
    return {
        "status": "ok",
        "service": settings.service_name,
    }


@router.get("/ready")
async def ready():
    auth = await check_service_ready(settings.auth_service_url)
    profile = await check_service_ready(settings.profile_service_url)
    site = await check_service_ready(settings.site_service_url)

    gateway_ready = auth["status"] == "ok"

    return {
        "status": "ready" if gateway_ready else "degraded",
        "service": settings.service_name,
        "services": {
            "auth-service": auth,
            "profile-service": profile,
            "site-service": site,
        },
    }


@router.api_route(
    "/api/auth/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
)
async def proxy_auth(path: str, request: Request):
    require_auth = path not in {"register", "login"}

    return await proxy_request(
        request=request,
        target_base_url=settings.auth_service_url,
        target_path=f"/auth/{path}",
        require_auth=require_auth,
    )


@router.api_route(
    "/api/profiles/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
)
async def proxy_profiles(path: str, request: Request):
    return await proxy_request(
        request=request,
        target_base_url=settings.profile_service_url,
        target_path=f"/profiles/{path}",
        require_auth=True,
    )


@router.api_route(
    "/api/sites/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
)
async def proxy_sites(path: str, request: Request):
    return await proxy_request(
        request=request,
        target_base_url=settings.site_service_url,
        target_path=f"/sites/{path}",
        require_auth=True,
    )


@router.api_route(
    "/api/sites",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
)
async def proxy_sites_root(request: Request):
    return await proxy_request(
        request=request,
        target_base_url=settings.site_service_url,
        target_path="/sites",
        require_auth=True,
    )


@router.api_route(
    "/api/public/{path:path}",
    methods=["GET"],
)
async def proxy_public(path: str, request: Request):
    return await proxy_request(
        request=request,
        target_base_url=settings.site_service_url,
        target_path=f"/public/{path}",
        require_auth=False,
    )
