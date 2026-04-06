from __future__ import annotations

from sqlalchemy.orm import Session

from ..engines.diagnosis import diagnose_student
from ..engines.explanation import render_strategy_summary
from ..engines.features import build_student_features
from ..engines.strategy import build_strategy
from ..models import StudentDiagnosis, StudentProfile, StudentStrategy, StrategyStatus
from .audit import log_audit


def recalculate_student_analysis(db: Session, student_profile: StudentProfile, actor_user_id: int | None = None) -> tuple[StudentDiagnosis, StudentStrategy]:
    feature_snapshot = build_student_features(db, student_profile)
    diagnosis_payload = diagnose_student(feature_snapshot)
    diagnosis = StudentDiagnosis(
        student_profile_id=student_profile.id,
        primary_weakness_type=diagnosis_payload["primary_weakness_type"],
        weakness_scores=diagnosis_payload["weakness_scores"],
        weak_subjects=diagnosis_payload["weak_subjects"],
        weak_units=diagnosis_payload["weak_units"],
        evidence=diagnosis_payload["evidence"],
        feature_snapshot=diagnosis_payload["feature_snapshot"],
    )
    db.add(diagnosis)
    db.flush()
    structured_plan = build_strategy(diagnosis_payload)
    strategy = StudentStrategy(
        student_profile_id=student_profile.id,
        diagnosis_id=diagnosis.id,
        status=StrategyStatus.ACTIVE,
        structured_plan=structured_plan,
        natural_language_summary=render_strategy_summary(structured_plan, diagnosis_payload, feature_snapshot.get("target_gap", {})),
        rationale=structured_plan["rationale"],
    )
    db.add(strategy)
    log_audit(
        db,
        actor_user_id=actor_user_id,
        entity_type="student_profile",
        entity_id=student_profile.id,
        action="recalculate_analysis",
        payload={"diagnosis_id": diagnosis.id, "strategy_summary": strategy.natural_language_summary},
    )
    db.commit()
    db.refresh(diagnosis)
    db.refresh(strategy)
    return diagnosis, strategy


def get_latest_diagnosis(db: Session, student_profile_id: int) -> StudentDiagnosis | None:
    return db.query(StudentDiagnosis).filter(StudentDiagnosis.student_profile_id == student_profile_id).order_by(StudentDiagnosis.computed_at.desc()).first()


def get_latest_strategy(db: Session, student_profile_id: int) -> StudentStrategy | None:
    return db.query(StudentStrategy).filter(StudentStrategy.student_profile_id == student_profile_id).order_by(StudentStrategy.generated_at.desc()).first()
