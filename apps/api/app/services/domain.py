from __future__ import annotations

from sqlalchemy.orm import Session

from ..models import Exam, StudentProfile
from ..schemas import ExamCreate
from .audit import log_audit, log_change


def create_exam(db: Session, payload: ExamCreate, actor_user_id: int | None) -> Exam:
    exam = Exam(
        academy_id=payload.academy_id,
        subject_id=payload.subject_id,
        name=payload.name,
        exam_date=payload.exam_date,
        total_score=payload.total_score,
    )
    db.add(exam)
    db.flush()

    log_audit(
        db,
        actor_user_id=actor_user_id,
        entity_type="exam",
        entity_id=exam.id,
        action="create",
        payload={
            "name": exam.name,
            "exam_date": exam.exam_date.isoformat(),
            "subject_id": exam.subject_id,
            "total_score": exam.total_score,
        },
    )
    log_change(
        db,
        entity_type="exam",
        entity_id=exam.id,
        field_name="created",
        old_value=None,
        new_value=exam.name,
        changed_by_user_id=actor_user_id,
    )
    db.commit()
    db.refresh(exam)
    return exam


def list_student_profiles(db: Session) -> list[StudentProfile]:
    return db.query(StudentProfile).all()

