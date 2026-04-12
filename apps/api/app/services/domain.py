from __future__ import annotations

import csv
import io
from collections import Counter
from typing import Any

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from ..models import (
    ClassGroup,
    Exam,
    LearningHabitSnapshot,
    Question,
    QuestionUnitMapping,
    RecalculationTrigger,
    ReviewDecision,
    Role,
    Subject,
    StudentProfile,
    StudentQuestionResponse,
    StudentResult,
    StudentStrategy,
    StrategyReview,
    StrategyStatus,
    SubmissionStatus,
    TargetUniversityProfile,
    UniversityScorePolicy,
    Unit,
    UnitMasteryCurrent,
    User,
)
from ..schemas import (
    ExamCreate,
    ExamUpdate,
    LearningHabitSnapshotCreate,
    QuestionCreate,
    QuestionUpdate,
    StrategyReviewRequest,
    StudentGoalCreate,
    StudentProfileUpdate,
    StudentResultCreate,
)
from .analytics import process_recalculation_job, recalculate_student_bundle
from .audit import queue_recalculation, record_audit, record_changes


def _ensure_same_academy(current_user: User, academy_id: int | None) -> None:
    if current_user.role == Role.ADMIN and current_user.academy_id == academy_id:
        return
    if current_user.role == Role.INSTRUCTOR and current_user.academy_id == academy_id:
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-academy access is not allowed.")


def _get_subject_for_write(db: Session, *, subject_id: int, academy_id: int) -> Subject:
    subject = db.get(Subject, subject_id)
    if not subject or subject.academy_id != academy_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Subject is not available in this academy.")
    return subject


def _get_class_group_for_write(
    db: Session,
    *,
    class_group_id: int | None,
    academy_id: int,
    current_user: User,
) -> ClassGroup | None:
    if class_group_id is None:
        return None
    class_group = db.get(ClassGroup, class_group_id)
    if not class_group or class_group.academy_id != academy_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Class group is not available in this academy.")
    if current_user.role == Role.INSTRUCTOR and class_group.instructor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Instructors can only manage exams for their assigned class groups.",
        )
    return class_group


def _ensure_exam_write_access(current_user: User, exam: Exam) -> None:
    _ensure_same_academy(current_user, exam.academy_id)
    if current_user.role == Role.INSTRUCTOR and exam.class_group is not None and exam.class_group.instructor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Instructors can only manage exams for their assigned class groups.",
        )


def _get_exam_for_write(
    db: Session,
    *,
    exam_id: int,
    current_user: User,
    include_questions: bool = False,
    include_results: bool = False,
) -> Exam:
    options = [joinedload(Exam.class_group), joinedload(Exam.subject)]
    if include_questions:
        options.append(joinedload(Exam.questions).joinedload(Question.unit_mappings))
    if include_results:
        options.append(joinedload(Exam.results))
    exam = db.query(Exam).options(*options).filter(Exam.id == exam_id).one_or_none()
    if not exam:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found.")
    _ensure_exam_write_access(current_user, exam)
    return exam


def _validate_question_unit_mappings(db: Session, *, exam: Exam, mappings: list[dict[str, Any]]) -> None:
    if not mappings:
        return
    unit_ids = {mapping["unit_id"] for mapping in mappings}
    units = db.query(Unit).filter(Unit.id.in_(unit_ids)).all()
    if len(units) != len(unit_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="One or more mapped units do not exist.")
    invalid = [unit.id for unit in units if unit.subject_id != exam.subject_id]
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All mapped units must belong to the same subject as the exam.",
        )


def get_visible_students_query(db: Session, current_user: User):
    query = db.query(StudentProfile).options(
        joinedload(StudentProfile.user),
        joinedload(StudentProfile.class_group),
        joinedload(StudentProfile.goals).joinedload(TargetUniversityProfile.policy),
        joinedload(StudentProfile.diagnoses),
        joinedload(StudentProfile.strategies).joinedload(StudentStrategy.reviews),
    )
    if current_user.role == Role.ADMIN:
        return query.join(StudentProfile.user).filter(User.academy_id == current_user.academy_id)
    if current_user.role == Role.INSTRUCTOR:
        return query.join(StudentProfile.class_group).filter(ClassGroup.instructor_id == current_user.id)
    return query.filter(StudentProfile.user_id == current_user.id)


def get_student_for_user(db: Session, *, student_id: int, current_user: User) -> StudentProfile:
    student = (
        db.query(StudentProfile)
        .options(
            joinedload(StudentProfile.user),
            joinedload(StudentProfile.class_group),
            joinedload(StudentProfile.habits),
            joinedload(StudentProfile.goals).joinedload(TargetUniversityProfile.policy),
            joinedload(StudentProfile.diagnoses),
            joinedload(StudentProfile.strategies).joinedload(StudentStrategy.reviews),
            joinedload(StudentProfile.mastery_current_records).joinedload(UnitMasteryCurrent.unit),
        )
        .filter(StudentProfile.id == student_id)
        .one_or_none()
    )
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")
    if current_user.role == Role.STUDENT and student.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students can only view their own record.")
    if current_user.role == Role.INSTRUCTOR:
        if not student.class_group or student.class_group.instructor_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the assigned instructor can view this student.")
    if current_user.role == Role.ADMIN and student.user.academy_id != current_user.academy_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cross-academy access is not allowed.")
    return student


def list_exams(db: Session, *, current_user: User) -> list[Exam]:
    query = db.query(Exam).options(joinedload(Exam.subject), joinedload(Exam.class_group)).filter(Exam.academy_id == current_user.academy_id)
    if current_user.role == Role.INSTRUCTOR:
        query = query.filter((Exam.class_group_id.is_(None)) | (Exam.class_group.has(ClassGroup.instructor_id == current_user.id)))
    return query.order_by(Exam.exam_date.desc(), Exam.id.desc()).all()


def create_exam(db: Session, *, payload: ExamCreate, current_user: User) -> Exam:
    _ensure_same_academy(current_user, payload.academy_id)
    _get_subject_for_write(db, subject_id=payload.subject_id, academy_id=payload.academy_id)
    _get_class_group_for_write(
        db,
        class_group_id=payload.class_group_id,
        academy_id=payload.academy_id,
        current_user=current_user,
    )
    exam = Exam(**payload.model_dump())
    db.add(exam)
    db.flush()
    record_audit(
        db,
        actor_user_id=current_user.id,
        entity_type="exams",
        entity_id=exam.id,
        action="create",
        payload=payload.model_dump(mode="json"),
    )
    db.commit()
    db.refresh(exam)
    return exam


def update_exam(db: Session, *, exam_id: int, payload: ExamUpdate, current_user: User) -> Exam:
    exam = _get_exam_for_write(db, exam_id=exam_id, current_user=current_user)
    before = {
        "subject_id": exam.subject_id,
        "class_group_id": exam.class_group_id,
        "name": exam.name,
        "exam_date": exam.exam_date,
        "total_score": exam.total_score,
        "time_limit_minutes": exam.time_limit_minutes,
        "is_retake": exam.is_retake,
    }
    updates = payload.model_dump(exclude_unset=True)
    if "subject_id" in updates:
        _get_subject_for_write(db, subject_id=updates["subject_id"], academy_id=exam.academy_id)
    if "class_group_id" in updates:
        _get_class_group_for_write(
            db,
            class_group_id=updates["class_group_id"],
            academy_id=exam.academy_id,
            current_user=current_user,
        )
    for key, value in updates.items():
        setattr(exam, key, value)
    db.flush()
    record_changes(db, actor_user_id=current_user.id, entity_type="exams", entity_id=exam.id, before=before, after={**before, **updates})
    record_audit(db, actor_user_id=current_user.id, entity_type="exams", entity_id=exam.id, action="update", payload=updates)
    db.commit()
    db.refresh(exam)
    return exam


def list_exam_questions(db: Session, *, exam_id: int, current_user: User) -> list[Question]:
    _get_exam_for_write(db, exam_id=exam_id, current_user=current_user)
    return (
        db.query(Question)
        .options(joinedload(Question.unit_mappings))
        .filter(Question.exam_id == exam_id)
        .order_by(Question.number.asc())
        .all()
    )


def _sync_question_unit_mappings(db: Session, *, question: Question, mappings: list[dict[str, Any]]) -> None:
    question.unit_mappings.clear()
    db.flush()
    for mapping in mappings:
        question.unit_mappings.append(QuestionUnitMapping(unit_id=mapping["unit_id"], weight=mapping.get("weight", 1.0)))
    db.flush()


def create_question(db: Session, *, payload: QuestionCreate, current_user: User) -> Question:
    exam = _get_exam_for_write(db, exam_id=payload.exam_id, current_user=current_user)
    _validate_question_unit_mappings(db, exam=exam, mappings=[item.model_dump() for item in payload.unit_mappings])
    data = payload.model_dump(exclude={"unit_mappings"})
    question = Question(**data)
    db.add(question)
    db.flush()
    _sync_question_unit_mappings(db, question=question, mappings=[item.model_dump() for item in payload.unit_mappings])
    record_audit(db, actor_user_id=current_user.id, entity_type="questions", entity_id=question.id, action="create", payload=payload.model_dump(mode="json"))
    db.commit()
    db.refresh(question)
    return question


def update_question(db: Session, *, question_id: int, payload: QuestionUpdate, current_user: User) -> Question:
    question = (
        db.query(Question)
        .options(
            joinedload(Question.exam).joinedload(Exam.class_group),
            joinedload(Question.exam).joinedload(Exam.results),
            joinedload(Question.unit_mappings),
        )
        .filter(Question.id == question_id)
        .one_or_none()
    )
    if not question:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found.")
    _ensure_exam_write_access(current_user, question.exam)
    before = {
        "number": question.number,
        "teacher_difficulty": question.teacher_difficulty,
        "answer_key": question.answer_key,
        "points": question.points,
        "question_type": question.question_type,
        "problem_style": question.problem_style,
        "estimated_seconds": question.estimated_seconds,
        "unit_mappings": [{"unit_id": item.unit_id, "weight": item.weight} for item in question.unit_mappings],
    }
    updates = payload.model_dump(exclude_unset=True, exclude={"unit_mappings"})
    for key, value in updates.items():
        setattr(question, key, value)
    if payload.unit_mappings is not None:
        new_mappings = [item.model_dump() for item in payload.unit_mappings]
        _validate_question_unit_mappings(db, exam=question.exam, mappings=new_mappings)
        _sync_question_unit_mappings(db, question=question, mappings=new_mappings)
        student_ids = sorted({result.student_profile_id for result in question.exam.results})
        if student_ids:
            job = queue_recalculation(
                db,
                entity_type="questions",
                entity_id=question.id,
                trigger=RecalculationTrigger.QUESTION_TAG_CHANGED,
                scope={"student_ids": student_ids, "question_id": question.id},
                requested_by_user_id=current_user.id,
            )
            db.flush()
            process_recalculation_job(db, job)
    db.flush()
    record_changes(db, actor_user_id=current_user.id, entity_type="questions", entity_id=question.id, before=before, after={**before, **updates, "unit_mappings": payload.unit_mappings or before["unit_mappings"]})
    record_audit(db, actor_user_id=current_user.id, entity_type="questions", entity_id=question.id, action="update", payload=payload.model_dump(mode="json", exclude_unset=True))
    db.commit()
    db.refresh(question)
    return question


def update_student_profile(db: Session, *, student_id: int, payload: StudentProfileUpdate, current_user: User) -> StudentProfile:
    student = get_student_for_user(db, student_id=student_id, current_user=current_user)
    if current_user.role == Role.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students cannot edit profile metadata.")
    before = {
        "class_group_id": student.class_group_id,
        "grade_level": student.grade_level,
        "enrollment_status": student.enrollment_status.value,
        "weekly_available_hours": student.weekly_available_hours,
        "preferred_subjects": student.preferred_subjects,
        "disliked_subjects": student.disliked_subjects,
        "learning_style_preferences": student.learning_style_preferences,
        "study_style_notes": student.study_style_notes,
    }
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(student, key, value)
    db.flush()
    record_changes(db, actor_user_id=current_user.id, entity_type="student_profiles", entity_id=student.id, before=before, after={**before, **updates})
    record_audit(db, actor_user_id=current_user.id, entity_type="student_profiles", entity_id=student.id, action="update", payload=updates)
    db.commit()
    db.refresh(student)
    return student


def add_habit_snapshot(db: Session, *, student_id: int, payload: LearningHabitSnapshotCreate, current_user: User) -> LearningHabitSnapshot:
    student = get_student_for_user(db, student_id=student_id, current_user=current_user)
    if current_user.role == Role.STUDENT and student.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students can only edit their own habit snapshots.")
    data = payload.model_dump()
    if not data.get("captured_at"):
        data["captured_at"] = None
    habit = LearningHabitSnapshot(student_profile_id=student.id, **{k: v for k, v in data.items() if k != "captured_at"})
    if payload.captured_at:
        habit.captured_at = payload.captured_at
    db.add(habit)
    db.flush()
    record_audit(db, actor_user_id=current_user.id, entity_type="learning_habit_snapshots", entity_id=habit.id, action="create", payload=payload.model_dump(mode="json"))
    db.commit()
    db.refresh(habit)
    return habit


def replace_goals(db: Session, *, student_id: int, goals: list[StudentGoalCreate], current_user: User) -> list[TargetUniversityProfile]:
    student = get_student_for_user(db, student_id=student_id, current_user=current_user)
    if current_user.role == Role.STUDENT and student.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students can only edit their own goals.")
    before = [
        {
            "policy_id": goal.policy_id,
            "target_department": goal.target_department,
            "priority_order": goal.priority_order,
            "is_active": goal.is_active,
        }
        for goal in student.goals
    ]
    student.goals.clear()
    db.flush()
    created = []
    for goal_payload in sorted(goals, key=lambda item: item.priority_order):
        goal = TargetUniversityProfile(student_profile_id=student.id, **goal_payload.model_dump())
        db.add(goal)
        created.append(goal)
    db.flush()
    record_changes(db, actor_user_id=current_user.id, entity_type="student_profiles", entity_id=student.id, before={"goals": before}, after={"goals": [goal.model_dump(mode='json') for goal in goals]})
    record_audit(db, actor_user_id=current_user.id, entity_type="target_university_profiles", entity_id=student.id, action="replace", payload={"goals": [goal.model_dump(mode='json') for goal in goals]})
    db.commit()
    return created


def _determine_response_status(raw_value: str | None) -> SubmissionStatus:
    if raw_value is None:
        return SubmissionStatus.NOT_ENTERED
    normalized = str(raw_value).strip().upper()
    if normalized == "":
        return SubmissionStatus.NOT_ENTERED
    if normalized in {"NR", "UNANSWERED"}:
        return SubmissionStatus.UNANSWERED
    if normalized in {"ABSENT", "A"}:
        return SubmissionStatus.ABSENT
    return SubmissionStatus.SUBMITTED


def _build_responses_for_exam(exam: Exam, payload: StudentResultCreate) -> tuple[list[StudentQuestionResponse], float, dict[str, int]]:
    incoming_by_question_id = {response.question_id: response for response in payload.responses}
    response_models: list[StudentQuestionResponse] = []
    counts: Counter[str] = Counter()
    raw_score = 0.0

    for question in sorted(exam.questions, key=lambda item: item.number):
        incoming = incoming_by_question_id.get(question.id)
        if payload.result_status == SubmissionStatus.ABSENT:
            response_status = SubmissionStatus.ABSENT
            selected_answer = None
        elif incoming is None:
            response_status = SubmissionStatus.NOT_ENTERED
            selected_answer = None
        else:
            response_status = incoming.response_status
            selected_answer = incoming.selected_answer
        is_correct = None
        if response_status == SubmissionStatus.SUBMITTED:
            is_correct = selected_answer == question.answer_key if question.answer_key is not None else None
        elif response_status == SubmissionStatus.UNANSWERED:
            is_correct = False
        counts[response_status.value] += 1
        if is_correct:
            raw_score += question.points
        response_models.append(
            StudentQuestionResponse(
                question_id=question.id,
                selected_answer=selected_answer,
                is_correct=is_correct,
                response_status=response_status,
                time_spent_seconds=incoming.time_spent_seconds if incoming else None,
            )
        )
    return response_models, raw_score, dict(counts)


def save_student_result(db: Session, *, payload: StudentResultCreate, current_user: User) -> StudentResult:
    student = get_student_for_user(db, student_id=payload.student_profile_id, current_user=current_user if current_user.role != Role.STUDENT else current_user)
    if current_user.role == Role.STUDENT and student.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students can only submit their own results.")
    exam = _get_exam_for_write(
        db,
        exam_id=payload.exam_id,
        current_user=current_user,
        include_questions=True,
    )
    if exam.class_group_id is not None and student.class_group_id != exam.class_group_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student does not belong to this exam's class group.",
        )
    subject_id = payload.subject_id or exam.subject_id
    result = (
        db.query(StudentResult)
        .options(joinedload(StudentResult.responses))
        .filter(StudentResult.student_profile_id == payload.student_profile_id, StudentResult.exam_id == payload.exam_id)
        .one_or_none()
    )
    before = None
    if result is None:
        result = StudentResult(student_profile_id=payload.student_profile_id, exam_id=payload.exam_id, subject_id=subject_id)
        db.add(result)
        db.flush()
    else:
        before = {
            "raw_score": result.raw_score,
            "percentile": result.percentile,
            "grade": result.grade,
            "completed_in_seconds": result.completed_in_seconds,
            "result_status": result.result_status.value,
            "question_breakdown": result.question_breakdown,
        }
        result.responses.clear()
        db.flush()

    responses, computed_raw_score, counts = _build_responses_for_exam(exam, payload)
    result.subject_id = subject_id
    result.percentile = payload.percentile
    result.grade = payload.grade
    result.completed_in_seconds = payload.completed_in_seconds
    result.result_status = payload.result_status
    result.question_breakdown = {**payload.question_breakdown, **counts}
    result.result_metadata = payload.result_metadata
    result.raw_score = payload.raw_score if payload.raw_score is not None else computed_raw_score
    for response in responses:
        result.responses.append(response)
    db.flush()
    after = {
        "raw_score": result.raw_score,
        "percentile": result.percentile,
        "grade": result.grade,
        "completed_in_seconds": result.completed_in_seconds,
        "result_status": result.result_status.value,
        "question_breakdown": result.question_breakdown,
    }
    if before:
        record_changes(db, actor_user_id=current_user.id, entity_type="student_results", entity_id=result.id, before=before, after=after)
        action = "update"
    else:
        action = "create"
    record_audit(db, actor_user_id=current_user.id, entity_type="student_results", entity_id=result.id, action=action, payload=after)
    job = queue_recalculation(
        db,
        entity_type="student_profiles",
        entity_id=student.id,
        trigger=RecalculationTrigger.RESULT_CHANGED,
        scope={"student_ids": [student.id], "exam_id": exam.id},
        requested_by_user_id=current_user.id,
    )
    db.flush()
    process_recalculation_job(db, job)
    db.refresh(result)
    return result


def list_student_results(db: Session, *, student_id: int, current_user: User) -> list[StudentResult]:
    get_student_for_user(db, student_id=student_id, current_user=current_user)
    return (
        db.query(StudentResult)
        .options(joinedload(StudentResult.exam), joinedload(StudentResult.responses))
        .filter(StudentResult.student_profile_id == student_id)
        .order_by(StudentResult.created_at.desc())
        .all()
    )


def import_results_from_csv(db: Session, *, exam_id: int, file: UploadFile, current_user: User) -> dict[str, Any]:
    raw = file.file.read().decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(raw))
    exam = _get_exam_for_write(
        db,
        exam_id=exam_id,
        current_user=current_user,
        include_questions=True,
    )

    rows = 0
    imported = 0
    created = 0
    updated = 0
    errors: list[str] = []
    error_rows: list[dict[str, Any]] = []
    processed_student_ids: list[int] = []
    question_headers = [f"q{question.number}" for question in sorted(exam.questions, key=lambda item: item.number)]
    accepted_columns = [
        "student_email",
        "student_profile_id",
        "raw_score",
        "percentile",
        "grade",
        "completed_in_seconds",
        "result_status",
        *question_headers,
    ]

    if reader.fieldnames is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CSV header row is missing.")

    for row in reader:
        rows += 1
        row_number = rows
        student_email = (row.get("student_email") or "").strip() or None
        student_profile_id = None
        try:
            if row.get("student_profile_id"):
                student_profile_id = int(str(row["student_profile_id"]).strip())
            elif student_email:
                student = (
                    db.query(StudentProfile)
                    .join(StudentProfile.user)
                    .filter(User.email == student_email)
                    .one_or_none()
                )
                if student is None:
                    raise ValueError("student_email에 해당하는 학생을 찾을 수 없습니다.")
                student_profile_id = student.id

            if not student_profile_id:
                raise ValueError("student_profile_id 또는 student_email 중 하나는 반드시 입력해야 합니다.")

            existing = (
                db.query(StudentResult.id)
                .filter(
                    StudentResult.student_profile_id == student_profile_id,
                    StudentResult.exam_id == exam.id,
                )
                .one_or_none()
            )

            responses = []
            for question in sorted(exam.questions, key=lambda item: item.number):
                value = row.get(f"q{question.number}")
                status_value = _determine_response_status(value)
                responses.append(
                    {
                        "question_id": question.id,
                        "selected_answer": value if status_value == SubmissionStatus.SUBMITTED else None,
                        "response_status": status_value,
                    }
                )

            result_status_raw = (row.get("result_status") or SubmissionStatus.SUBMITTED.value).strip().lower()
            payload = StudentResultCreate(
                student_profile_id=student_profile_id,
                exam_id=exam.id,
                subject_id=exam.subject_id,
                raw_score=float(row["raw_score"]) if row.get("raw_score") else None,
                percentile=float(row["percentile"]) if row.get("percentile") else None,
                grade=int(row["grade"]) if row.get("grade") else None,
                completed_in_seconds=int(row["completed_in_seconds"]) if row.get("completed_in_seconds") else None,
                result_status=SubmissionStatus(result_status_raw),
                responses=responses,
            )
            save_student_result(db, payload=payload, current_user=current_user)
            imported += 1
            processed_student_ids.append(student_profile_id)
            if existing:
                updated += 1
            else:
                created += 1
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            message = f"row {row_number}: {exc}"
            errors.append(message)
            error_rows.append(
                {
                    "row": row_number,
                    "student_profile_id": student_profile_id,
                    "student_email": student_email,
                    "message": str(exc),
                }
            )

    return {
        "exam_id": exam.id,
        "rows": rows,
        "imported": imported,
        "created": created,
        "updated": updated,
        "failed": len(errors),
        "errors": errors,
        "error_rows": error_rows,
        "accepted_columns": accepted_columns,
        "question_columns": question_headers,
        "processed_student_ids": sorted(set(processed_student_ids)),
    }


def recalculate_student(db: Session, *, student_id: int, current_user: User) -> dict[str, Any]:
    get_student_for_user(db, student_id=student_id, current_user=current_user)
    return recalculate_student_bundle(db, student_id=student_id, actor_user_id=current_user.id, trigger="manual")


def review_strategy(db: Session, *, strategy_id: int, payload: StrategyReviewRequest, current_user: User) -> StrategyReview:
    strategy = (
        db.query(StudentStrategy)
        .options(joinedload(StudentStrategy.student_profile).joinedload(StudentProfile.user), joinedload(StudentStrategy.reviews))
        .filter(StudentStrategy.id == strategy_id)
        .one_or_none()
    )
    if not strategy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found.")
    student = get_student_for_user(db, student_id=strategy.student_profile_id, current_user=current_user)
    if current_user.role == Role.STUDENT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Students cannot review strategies.")

    before_plan = strategy.structured_plan
    before_summary = strategy.natural_language_summary
    diff: dict[str, Any] = {}
    if payload.decision == ReviewDecision.APPROVE:
        strategy.status = StrategyStatus.APPROVED
    elif payload.decision == ReviewDecision.HOLD:
        strategy.status = StrategyStatus.HELD
    else:
        if payload.edited_plan is not None and payload.edited_plan != before_plan:
            diff["structured_plan"] = {"before": before_plan, "after": payload.edited_plan}
            strategy.structured_plan = payload.edited_plan
        if payload.edited_summary is not None and payload.edited_summary != before_summary:
            diff["natural_language_summary"] = {"before": before_summary, "after": payload.edited_summary}
            strategy.natural_language_summary = payload.edited_summary
        strategy.status = StrategyStatus.APPROVED

    if strategy.status == StrategyStatus.APPROVED:
        other_approved_ids = [
            item.id
            for item in db.query(StudentStrategy)
            .filter(
                StudentStrategy.student_profile_id == strategy.student_profile_id,
                StudentStrategy.id != strategy.id,
                StudentStrategy.status == StrategyStatus.APPROVED,
            )
            .all()
        ]
        if other_approved_ids:
            diff["archived_previous_approved"] = {
                "strategy_ids": other_approved_ids,
                "reason": "새 승인본을 현재 학생 노출 전략으로 승격하면서 이전 승인본을 보관 처리했습니다.",
            }
            (
                db.query(StudentStrategy)
                .filter(StudentStrategy.id.in_(other_approved_ids))
                .update({StudentStrategy.status: StrategyStatus.ARCHIVED}, synchronize_session=False)
            )

        sibling_archive_ids: list[int] = []
        if strategy.diagnosis_id is not None:
            sibling_archive_ids = [
                item.id
                for item in db.query(StudentStrategy)
                .filter(
                    StudentStrategy.student_profile_id == strategy.student_profile_id,
                    StudentStrategy.diagnosis_id == strategy.diagnosis_id,
                    StudentStrategy.id != strategy.id,
                    StudentStrategy.status.in_(
                        [StrategyStatus.DRAFT, StrategyStatus.PENDING_REVIEW, StrategyStatus.HELD]
                    ),
                )
                .all()
            ]
            if sibling_archive_ids:
                diff["archived_alternative_variants"] = {
                    "strategy_ids": sibling_archive_ids,
                    "reason": "동일 진단 배치의 대안 전략은 검토 종료 후 보관 처리했습니다.",
                }
                (
                    db.query(StudentStrategy)
                    .filter(StudentStrategy.id.in_(sibling_archive_ids))
                    .update({StudentStrategy.status: StrategyStatus.ARCHIVED}, synchronize_session=False)
                )

    review = StrategyReview(
        strategy_id=strategy.id,
        reviewer_user_id=current_user.id,
        decision=payload.decision,
        reason=payload.reason,
        diff=diff,
        edited_plan=payload.edited_plan,
        edited_summary=payload.edited_summary,
    )
    db.add(review)
    db.flush()
    record_audit(
        db,
        actor_user_id=current_user.id,
        entity_type="student_strategies",
        entity_id=strategy.id,
        action=f"review:{payload.decision.value}",
        payload={"reason": payload.reason, "diff": diff, "student_id": student.id},
    )
    db.commit()
    db.refresh(review)
    return review


def list_strategy_reviews(db: Session, *, strategy_id: int, current_user: User) -> list[StrategyReview]:
    strategy = db.get(StudentStrategy, strategy_id)
    if not strategy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Strategy not found.")
    get_student_for_user(db, student_id=strategy.student_profile_id, current_user=current_user)
    return db.query(StrategyReview).filter(StrategyReview.strategy_id == strategy_id).order_by(StrategyReview.reviewed_at.desc()).all()
