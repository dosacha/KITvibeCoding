from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..dependencies import get_current_user, require_roles
from ..models import Role
from ..schemas import (
    FrontendExamCreate,
    FrontendExamItem,
    FrontendExamsResponse,
    FrontendLoginRequest,
    FrontendLoginResponse,
    FrontendMeResponse,
    FrontendSessionUser,
    FrontendStudentsResponse,
)
from ..security import create_access_token
from ..services.domain import create_exam
from ..services.frontend_auth import authenticate_frontend_user
from ..services.frontend_adapter import list_frontend_exams, list_frontend_students


router = APIRouter(prefix="/frontend", tags=["frontend"])


def _to_frontend_session_user(user) -> FrontendSessionUser:
    return FrontendSessionUser(
        id=user.id,
        name=user.full_name,
        email=user.email,
        role=user.role,
    )


@router.post("/login", response_model=FrontendLoginResponse)
def frontend_login(payload: FrontendLoginRequest, db: Session = Depends(get_db)) -> FrontendLoginResponse:
    user = authenticate_frontend_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid frontend credentials")
    return FrontendLoginResponse(
        accessToken=create_access_token(str(user.id)),
        user=_to_frontend_session_user(user),
    )


@router.get("/me", response_model=FrontendMeResponse)
def frontend_me(current_user=Depends(get_current_user)) -> FrontendMeResponse:
    return FrontendMeResponse(user=_to_frontend_session_user(current_user))


@router.get("/students", response_model=FrontendStudentsResponse)
def get_frontend_students(
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> FrontendStudentsResponse:
    return FrontendStudentsResponse(students=list_frontend_students(db))


@router.get("/exams", response_model=FrontendExamsResponse)
def get_frontend_exams(
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> FrontendExamsResponse:
    return FrontendExamsResponse(exams=list_frontend_exams(db))


@router.post("/exams", response_model=FrontendExamItem)
def create_frontend_exam(
    payload: FrontendExamCreate,
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> FrontendExamItem:
    exam = create_exam(db, payload, actor_user_id=current_user.id)
    exams = list_frontend_exams(db)
    created = next((item for item in exams if item["id"] == f"e{exam.id}"), None)
    return FrontendExamItem.model_validate(created)
