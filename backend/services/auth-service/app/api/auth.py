from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import AuthService


router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=RegisterResponse)
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    """Register a new user and return the created user without logging in yet."""
    user = AuthService.register_user(
        db=db,
        email=request.email,
        password=request.password,
    )

    return RegisterResponse(
        message="User registered successfully",
        user=UserResponse(
            id=user.id,
            email=user.email,
            is_active=user.is_active,
        ),
    )


@router.post("/login", response_model=TokenResponse)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    """Exchange valid credentials for an access/refresh token pair."""
    tokens = AuthService.login_user(
        db=db,
        email=request.email,
        password=request.password,
    )

    return TokenResponse(**tokens)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """Exchange a refresh token for a new access/refresh token pair."""
    tokens = AuthService.refresh_tokens(
        db=db,
        refresh_token=request.refresh_token,
    )

    return TokenResponse(**tokens)


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user),
):
    """Return the user represented by the current access token."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        is_active=current_user.is_active,
    )
