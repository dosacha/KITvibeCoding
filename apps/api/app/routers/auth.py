from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..dependencies import get_current_user
from ..schemas import CurrentUserResponse, LoginRequest, TokenResponse, UserRead
from ..security import create_access_token
from ..services.auth import authenticate_user


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="이메일 또는 비밀번호가 맞지 않아.")
    return TokenResponse(access_token=create_access_token(str(user.id)), user=UserRead.model_validate(user))


@router.get("/me", response_model=CurrentUserResponse)
def me(current_user=Depends(get_current_user)) -> CurrentUserResponse:
    return CurrentUserResponse(user=UserRead.model_validate(current_user))
