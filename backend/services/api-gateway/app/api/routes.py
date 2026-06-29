from fastapi import APIRouter, Request

from app.clients.proxy import check_service_ready, proxy_request, request_json
from app.core.config import settings


router = APIRouter()


def _is_profile_completed(profile: dict) -> bool:
    return all(
        profile.get(field)
        for field in ("username", "display_name", "headline")
    )


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

    gateway_ready = all(
        service["status"] == "ok"
        for service in (auth, profile, site)
    )

    return {
        "status": "ready" if gateway_ready else "degraded",
        "service": settings.service_name,
        "services": {
            "auth-service": auth,
            "profile-service": profile,
            "site-service": site,
        },
    }


@router.get("/api/dashboard/summary")
async def dashboard_summary(request: Request):
    profile = await request_json(
        request=request,
        target_base_url=settings.profile_service_url,
        target_path="/profiles/me",
        require_auth=True,
    )
    projects = await request_json(
        request=request,
        target_base_url=settings.profile_service_url,
        target_path="/profiles/me/projects",
        require_auth=True,
    )
    site_summary = await request_json(
        request=request,
        target_base_url=settings.site_service_url,
        target_path="/sites/dashboard/summary",
        require_auth=True,
    )

    site = site_summary.get("site")

    return {
        "profile_completed": _is_profile_completed(profile),
        "profile": {
            "username": profile.get("username"),
            "display_name": profile.get("display_name"),
            "headline": profile.get("headline"),
            "skills_count": len(profile.get("skills") or []),
        },
        "projects_count": len(projects) if isinstance(projects, list) else 0,
        "has_site": site_summary.get("has_site", False),
        "site": site,
        "site_status": site.get("status") if site else None,
        "site_published": site_summary.get("is_published", False),
        "public_url": site_summary.get("public_url"),
        "blocks_count": site_summary.get("blocks_count", 0),
        "missing_required_blocks": site_summary.get("missing_required_blocks", []),
    }


@router.api_route(
    "/api/auth/{path:path}",
    methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
)
async def proxy_auth(path: str, request: Request):
    require_auth = path not in {"register", "login", "refresh"}

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
    "/api/sites/templates",
    methods=["GET"],
)
async def proxy_site_templates(request: Request):
    return await proxy_request(
        request=request,
        target_base_url=settings.site_service_url,
        target_path="/sites/templates",
        require_auth=False,
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
