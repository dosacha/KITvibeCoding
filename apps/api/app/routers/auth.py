from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..dependencies import get_current_user
from ..schemas import LoginRequest, TokenResponse, UserRead
from ..services.auth import authenticate_user, issue_token_response

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = authenticate_user(db, payload.email, payload.password)
    return issue_token_response(user)


@router.get("/me", response_model=UserRead)
def me(current_user=Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current_user)
