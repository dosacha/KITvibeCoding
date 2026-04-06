from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..dependencies import require_roles
from ..models import Role
from ..schemas import (
    FrontendExamCreate,
    FrontendExamItem,
    FrontendExamsResponse,
    FrontendInstructorDashboardResponse,
    FrontendMetadataResponse,
    FrontendStudentDetailResponse,
    FrontendStudentsResponse,
    FrontendUniversityPoliciesResponse,
)
from ..services.domain import create_exam
from ..services.frontend_adapter import (
    get_frontend_instructor_dashboard,
    get_frontend_metadata,
    get_frontend_student_detail,
    get_frontend_student_detail_by_user,
    list_frontend_exams,
    list_frontend_students,
    list_frontend_university_policies,
)


router = APIRouter(prefix="/frontend", tags=["frontend"])


@router.get("/students", response_model=FrontendStudentsResponse)
def get_frontend_students(
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> FrontendStudentsResponse:
    return FrontendStudentsResponse(students=list_frontend_students(db))


@router.get("/students/{student_id}", response_model=FrontendStudentDetailResponse)
def get_frontend_student(
    student_id: str,
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> FrontendStudentDetailResponse:
    student = get_frontend_student_detail(db, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="학생 정보를 찾지 못했어.")
    return FrontendStudentDetailResponse.model_validate(student)


@router.get("/exams", response_model=FrontendExamsResponse)
def get_frontend_exams(
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> FrontendExamsResponse:
    return FrontendExamsResponse(exams=list_frontend_exams(db))


@router.get("/metadata", response_model=FrontendMetadataResponse)
def get_frontend_metadata_route(
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> FrontendMetadataResponse:
    return FrontendMetadataResponse.model_validate(get_frontend_metadata(db))


@router.get("/dashboard/instructor", response_model=FrontendInstructorDashboardResponse)
def get_frontend_instructor_dashboard_route(
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> FrontendInstructorDashboardResponse:
    return FrontendInstructorDashboardResponse.model_validate(get_frontend_instructor_dashboard(db))


@router.get("/dashboard/student", response_model=FrontendStudentDetailResponse)
def get_frontend_student_dashboard_route(
    current_user=Depends(require_roles(Role.STUDENT)),
    db: Session = Depends(get_db),
) -> FrontendStudentDetailResponse:
    student = get_frontend_student_detail_by_user(db, current_user.id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="학생 대시보드 정보를 찾지 못했어.")
    return FrontendStudentDetailResponse.model_validate(student)


@router.get("/universities", response_model=FrontendUniversityPoliciesResponse)
def get_frontend_universities(
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> FrontendUniversityPoliciesResponse:
    return FrontendUniversityPoliciesResponse(universities=list_frontend_university_policies(db))


@router.post("/exams", response_model=FrontendExamItem)
def create_frontend_exam(
    payload: FrontendExamCreate,
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> FrontendExamItem:
    exam = create_exam(db, payload, actor_user_id=current_user.id)
    exams = list_frontend_exams(db)
    created = next((item for item in exams if item["id"] == f"e{exam.id}"), None)
    if created is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="시험 요약 정보를 만들지 못했어.")
    return FrontendExamItem.model_validate(created)
