from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models import User
from ..schemas import TokenResponse, UserRead
from ..security import create_access_token, verify_password


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = db.query(User).filter(User.email == email).one_or_none()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive.")
    return user


def issue_token_response(user: User) -> TokenResponse:
    token = create_access_token(subject=user.id, extra={"role": user.role.value})
    return TokenResponse(access_token=token, user=UserRead.model_validate(user))
