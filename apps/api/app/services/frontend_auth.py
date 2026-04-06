from __future__ import annotations

from sqlalchemy.orm import Session

from ..models import User
from .auth import authenticate_user


FRONTEND_DEMO_PASSWORD = "demo1234"
FRONTEND_ALLOWED_EMAILS = {
    "admin@unitflow.ai",
    "instructor@unitflow.ai",
    "student@unitflow.ai",
}


def authenticate_frontend_user(db: Session, email: str, password: str) -> User | None:
    user = authenticate_user(db, email, password)
    if user:
        return user

    if password != FRONTEND_DEMO_PASSWORD:
        return None
    if email not in FRONTEND_ALLOWED_EMAILS:
        return None

    return db.query(User).filter(User.email == email).first()
