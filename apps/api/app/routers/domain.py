from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from ..db import get_db
from ..dependencies import get_current_user, require_roles
from ..models import Role
from ..schemas import (
    CsvImportResultRead,
    ExamCreate,
    ExamRead,
    ExamUpdate,
    LearningHabitSnapshotCreate,
    LearningHabitSnapshotRead,
    QuestionCreate,
    QuestionRead,
    QuestionUpdate,
    StrategyReviewRead,
    StrategyReviewRequest,
    StudentGoalCreate,
    StudentGoalRead,
    StudentProfileRead,
    StudentProfileUpdate,
    StudentResultCreate,
    StudentResultRead,
)
from ..services import domain as domain_service

router = APIRouter(tags=["domain"])


@router.get("/exams", response_model=list[ExamRead])
def list_exams(db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR))):
    return domain_service.list_exams(db, current_user=current_user)


@router.post("/exams", response_model=ExamRead)
def create_exam(payload: ExamCreate, db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR))):
    return domain_service.create_exam(db, payload=payload, current_user=current_user)


@router.put("/exams/{exam_id}", response_model=ExamRead)
def update_exam(exam_id: int, payload: ExamUpdate, db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR))):
    return domain_service.update_exam(db, exam_id=exam_id, payload=payload, current_user=current_user)


@router.get("/exams/{exam_id}/questions", response_model=list[QuestionRead])
def list_exam_questions(exam_id: int, db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR))):
    return domain_service.list_exam_questions(db, exam_id=exam_id, current_user=current_user)


@router.post("/questions", response_model=QuestionRead)
def create_question(payload: QuestionCreate, db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR))):
    return domain_service.create_question(db, payload=payload, current_user=current_user)


@router.put("/questions/{question_id}", response_model=QuestionRead)
def update_question(question_id: int, payload: QuestionUpdate, db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR))):
    return domain_service.update_question(db, question_id=question_id, payload=payload, current_user=current_user)


@router.get("/students/{student_profile_id}/results", response_model=list[StudentResultRead])
def list_student_results(student_profile_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return domain_service.list_student_results(db, student_id=student_profile_id, current_user=current_user)


@router.post("/student-results", response_model=StudentResultRead)
def save_student_result(payload: StudentResultCreate, db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR))):
    return domain_service.save_student_result(db, payload=payload, current_user=current_user)


@router.post("/student-results/upload-csv", response_model=CsvImportResultRead)
def upload_student_results_csv(exam_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR))):
    return domain_service.import_results_from_csv(db, exam_id=exam_id, file=file, current_user=current_user)


@router.post("/students/{student_profile_id}/recalculate")
def recalculate_student(student_profile_id: int, db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR))):
    result = domain_service.recalculate_student(db, student_id=student_profile_id, current_user=current_user)
    return {
        "diagnosis_id": result["diagnosis"].id,
        "strategy_ids": [strategy.id for strategy in result["strategies"]],
    }


@router.put("/students/{student_profile_id}/profile", response_model=StudentProfileRead)
def update_student_profile(student_profile_id: int, payload: StudentProfileUpdate, db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR))):
    return domain_service.update_student_profile(db, student_id=student_profile_id, payload=payload, current_user=current_user)


@router.post("/students/{student_profile_id}/habits", response_model=LearningHabitSnapshotRead)
def add_habit_snapshot(student_profile_id: int, payload: LearningHabitSnapshotCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return domain_service.add_habit_snapshot(db, student_id=student_profile_id, payload=payload, current_user=current_user)


@router.put("/students/{student_profile_id}/goals", response_model=list[StudentGoalRead])
def replace_goals(student_profile_id: int, payload: list[StudentGoalCreate], db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return domain_service.replace_goals(db, student_id=student_profile_id, goals=payload, current_user=current_user)


@router.post("/strategies/{strategy_id}/reviews", response_model=StrategyReviewRead)
def review_strategy(strategy_id: int, payload: StrategyReviewRequest, db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR))):
    return domain_service.review_strategy(db, strategy_id=strategy_id, payload=payload, current_user=current_user)


@router.get("/strategies/{strategy_id}/reviews", response_model=list[StrategyReviewRead])
def list_strategy_reviews(strategy_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return domain_service.list_strategy_reviews(db, strategy_id=strategy_id, current_user=current_user)
