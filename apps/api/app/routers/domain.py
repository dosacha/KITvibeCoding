from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..dependencies import get_current_user, require_roles
from ..models import Exam, Role
from ..schemas import CurrentUserResponse, ExamCreate, ExamRead, StudentListItem
from ..services.domain import create_exam, list_student_profiles


router = APIRouter(tags=["domain"])


@router.get("/auth/me", response_model=CurrentUserResponse)
def me(current_user=Depends(get_current_user)) -> CurrentUserResponse:
    return CurrentUserResponse(user=current_user)


@router.post("/exams", response_model=ExamRead)
def create_exam_endpoint(
    payload: ExamCreate,
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> ExamRead:
    exam = create_exam(db, payload, actor_user_id=current_user.id)
    return ExamRead.model_validate(exam)


@router.get("/exams", response_model=list[ExamRead])
def list_exams(
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> list[ExamRead]:
    exams = db.query(Exam).order_by(Exam.exam_date.desc()).all()
    return [ExamRead.model_validate(exam) for exam in exams]


@router.get("/students", response_model=list[StudentListItem])
def list_students(
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> list[StudentListItem]:
    students = list_student_profiles(db)
    return [
        StudentListItem(
            student_profile_id=student.id,
            user_id=student.user_id,
            student_name=student.user.full_name,
            grade_level=student.grade_level,
            class_group_id=student.class_group_id,
            target_university_profile_id=student.target_university_profile_id,
        )
        for student in students
    ]

