from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.outbox_event import OutboxEvent
from app.models.user import User


class AuthService:
    @staticmethod
    def register_user(db: Session, email: str, password: str) -> User:
        existing_user = db.query(User).filter(User.email == email).first()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": {
                        "code": "EMAIL_ALREADY_EXISTS",
                        "message": "User with this email already exists",
                        "details": {
                            "field": "email",
                        },
                    }
                },
            )

        user = User(
            email=email,
            password_hash=hash_password(password),
        )

        try:
            db.add(user)
            db.flush()

            event = OutboxEvent(
                event_type="user.registered",
                aggregate_id=user.id,
                payload_json={
                    "user_id": user.id,
                    "email": user.email,
                },
            )

            db.add(event)

            db.commit()
            db.refresh(user)

            return user

        except IntegrityError:
            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "error": {
                        "code": "EMAIL_ALREADY_EXISTS",
                        "message": "User with this email already exists",
                        "details": {
                            "field": "email",
                        },
                    }
                },
            )

        except Exception:
            db.rollback()

            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={
                    "error": {
                        "code": "INTERNAL_ERROR",
                        "message": "Could not register user",
                    }
                },
            )

    @staticmethod
    def login_user(db: Session, email: str, password: str) -> str:
        user = db.query(User).filter(User.email == email).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "INVALID_CREDENTIALS",
                        "message": "Invalid email or password",
                    }
                },
            )

        if not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={
                    "error": {
                        "code": "INVALID_CREDENTIALS",
                        "message": "Invalid email or password",
                    }
                },
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": {
                        "code": "FORBIDDEN",
                        "message": "User is inactive",
                    }
                },
            )

        return create_access_token(subject=user.id)