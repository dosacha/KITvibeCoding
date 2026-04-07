from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..dependencies import require_roles
from ..models import Exam, Question, Role, StudentProfile, Subject, Unit
from ..schemas import (
    ExamCreate,
    ExamRead,
    ExamUpdate,
    QuestionCreate,
    QuestionRead,
    QuestionUpdate,
    RecalculateResponse,
    StudentDetailItem,
    StudentListItem,
    StudentResultListItem,
    StudentResultRead,
    StudentResultUpsert,
    UnitListItem,
)
from ..services.analytics import recalculate_student_analysis
from ..services.domain import (
    create_exam,
    create_question,
    get_student_profile_detail,
    list_exam_questions,
    list_exams,
    list_student_profiles,
    list_student_results,
    list_units_by_subject,
    update_exam,
    update_question,
    upsert_student_result,
)


router = APIRouter(tags=["domain"])


@router.post("/exams", response_model=ExamRead)
def create_exam_endpoint(
    payload: ExamCreate,
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> ExamRead:
    _ensure_subject_exists(db, payload.subject_id)
    exam = create_exam(db, payload, actor_user_id=current_user.id)
    return ExamRead.model_validate(exam)


@router.get("/exams", response_model=list[ExamRead])
def list_exams_endpoint(
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> list[ExamRead]:
    exams = list_exams(db)
    return [ExamRead.model_validate(exam) for exam in exams]


@router.put("/exams/{exam_id}", response_model=ExamRead)
def update_exam_endpoint(
    exam_id: int,
    payload: ExamUpdate,
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> ExamRead:
    exam = db.get(Exam, exam_id)
    if exam is None:
        raise HTTPException(status_code=404, detail="시험 정보를 찾지 못했어.")
    updated_exam = update_exam(db, exam, payload, actor_user_id=current_user.id)
    return ExamRead.model_validate(updated_exam)


@router.get("/exams/{exam_id}/questions", response_model=list[QuestionRead])
def list_exam_questions_endpoint(
    exam_id: int,
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> list[QuestionRead]:
    exam = db.get(Exam, exam_id)
    if exam is None:
        raise HTTPException(status_code=404, detail="시험 정보를 찾지 못했어.")
    questions = list_exam_questions(db, exam_id)
    return [QuestionRead.model_validate(question) for question in questions]


@router.post("/questions", response_model=QuestionRead)
def create_question_endpoint(
    payload: QuestionCreate,
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> QuestionRead:
    _ensure_exam_exists(db, payload.exam_id)
    _ensure_units_exist(db, [mapping.unit_id for mapping in payload.unit_mappings])
    question = create_question(db, payload, actor_user_id=current_user.id)
    return QuestionRead.model_validate(question)


@router.put("/questions/{question_id}", response_model=QuestionRead)
def update_question_endpoint(
    question_id: int,
    payload: QuestionUpdate,
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> QuestionRead:
    question = db.get(Question, question_id)
    if question is None:
        raise HTTPException(status_code=404, detail="문항 정보를 찾지 못했어.")
    if payload.unit_mappings is not None:
        _ensure_units_exist(db, [mapping.unit_id for mapping in payload.unit_mappings])
    updated_question = update_question(db, question, payload, actor_user_id=current_user.id)
    return QuestionRead.model_validate(updated_question)


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


@router.get("/students/{student_profile_id}", response_model=StudentDetailItem)
def get_student_detail(
    student_profile_id: int,
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> StudentDetailItem:
    student = get_student_profile_detail(db, student_profile_id)
    if student is None:
        raise HTTPException(status_code=404, detail="학생 정보를 찾지 못했어.")
    return StudentDetailItem(
        student_profile_id=student.id,
        user_id=student.user_id,
        student_name=student.user.full_name,
        grade_level=student.grade_level,
        class_group_id=student.class_group_id,
        class_group_name=getattr(getattr(student, "class_group", None), "name", None),
        target_university_profile_id=student.target_university_profile_id,
        study_style_notes=student.study_style_notes,
    )


@router.get("/students/{student_profile_id}/results", response_model=list[StudentResultListItem])
def list_student_results_endpoint(
    student_profile_id: int,
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> list[StudentResultListItem]:
    student = db.get(StudentProfile, student_profile_id)
    if student is None:
        raise HTTPException(status_code=404, detail="학생 정보를 찾지 못했어.")
    results = list_student_results(db, student_profile_id)
    subject_name_map = {subject.id: subject.name for subject in db.query(Subject).all()}
    exam_name_map = {exam.id: exam.name for exam in db.query(Exam).all()}
    return [
        StudentResultListItem(
            id=result.id,
            exam_id=result.exam_id,
            exam_name=exam_name_map.get(result.exam_id, f"시험 {result.exam_id}"),
            subject_id=result.subject_id,
            subject_name=subject_name_map.get(result.subject_id, f"과목 {result.subject_id}"),
            raw_score=result.raw_score,
            percentile=result.percentile,
            grade=result.grade,
            completed_in_seconds=result.completed_in_seconds,
            question_breakdown=result.question_breakdown or {},
            result_metadata=result.result_metadata or {},
            created_at=result.created_at,
        )
        for result in results
    ]


@router.get("/subjects/{subject_id}/units", response_model=list[UnitListItem])
def list_subject_units_endpoint(
    subject_id: int,
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> list[UnitListItem]:
    _ensure_subject_exists(db, subject_id)
    units = list_units_by_subject(db, subject_id)
    return [UnitListItem.model_validate(unit) for unit in units]


@router.post("/student-results", response_model=StudentResultRead)
def upsert_student_result_endpoint(
    payload: StudentResultUpsert,
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> StudentResultRead:
    if db.get(StudentProfile, payload.student_profile_id) is None:
        raise HTTPException(status_code=404, detail="학생 정보를 찾지 못했어.")
    try:
        result = upsert_student_result(db, payload, actor_user_id=current_user.id, recalculate=True)
    except ValueError as exc:
        if str(exc) == "exam_not_found":
            raise HTTPException(status_code=404, detail="시험 정보를 찾지 못했어.") from exc
        raise
    return StudentResultRead.model_validate(result)


@router.post("/students/{student_profile_id}/recalculate", response_model=RecalculateResponse)
def recalculate_student_endpoint(
    student_profile_id: int,
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> RecalculateResponse:
    student = db.get(StudentProfile, student_profile_id)
    if student is None:
        raise HTTPException(status_code=404, detail="학생 정보를 찾지 못했어.")
    diagnosis, strategy = recalculate_student_analysis(db, student, actor_user_id=current_user.id)
    return RecalculateResponse(
        student_profile_id=student_profile_id,
        diagnosis_id=diagnosis.id,
        strategy_id=strategy.id,
        recalculated_at=diagnosis.computed_at,
    )


def _ensure_exam_exists(db: Session, exam_id: int) -> None:
    if db.get(Exam, exam_id) is None:
        raise HTTPException(status_code=404, detail="시험 정보를 찾지 못했어.")


def _ensure_subject_exists(db: Session, subject_id: int) -> None:
    if db.get(Subject, subject_id) is None:
        raise HTTPException(status_code=404, detail="과목 정보를 찾지 못했어.")


def _ensure_units_exist(db: Session, unit_ids: list[int]) -> None:
    if not unit_ids:
        return
    existing_ids = {unit.id for unit in db.query(Unit).filter(Unit.id.in_(unit_ids)).all()}
    missing_ids = [unit_id for unit_id in unit_ids if unit_id not in existing_ids]
    if missing_ids:
        raise HTTPException(status_code=404, detail=f"단원 정보를 찾지 못했어: {', '.join(str(unit_id) for unit_id in missing_ids)}")
