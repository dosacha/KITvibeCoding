from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from ..models import RecalculationTrigger, Role, TargetUniversityProfile, UniversityScorePolicy, User
from ..schemas import UniversityPolicyCreate, UniversityPolicyUpdate
from .analytics import process_recalculation_job
from .audit import queue_recalculation, record_audit, record_changes


def list_policies(db: Session, *, current_user: User) -> list[UniversityScorePolicy]:
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can view university policies.")
    return db.query(UniversityScorePolicy).order_by(UniversityScorePolicy.university_name.asc(), UniversityScorePolicy.academic_year.desc()).all()


def create_policy(db: Session, *, payload: UniversityPolicyCreate, current_user: User) -> UniversityScorePolicy:
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can create university policies.")
    policy = UniversityScorePolicy(**payload.model_dump())
    db.add(policy)
    db.flush()
    record_audit(db, actor_user_id=current_user.id, entity_type="university_score_policies", entity_id=policy.id, action="create", payload=payload.model_dump(mode="json"))
    db.commit()
    db.refresh(policy)
    return policy


def update_policy(db: Session, *, policy_id: int, payload: UniversityPolicyUpdate, current_user: User) -> tuple[UniversityScorePolicy, list[int]]:
    if current_user.role != Role.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can update university policies.")
    policy = (
        db.query(UniversityScorePolicy)
        .options(joinedload(UniversityScorePolicy.target_profiles))
        .filter(UniversityScorePolicy.id == policy_id)
        .one_or_none()
    )
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="University policy not found.")
    before = {
        "academic_year": policy.academic_year,
        "university_name": policy.university_name,
        "admission_type": policy.admission_type,
        "subject_weights": policy.subject_weights,
        "required_subjects": policy.required_subjects,
        "bonus_rules": policy.bonus_rules,
        "grade_conversion_rules": policy.grade_conversion_rules,
        "target_score": policy.target_score,
        "notes": policy.notes,
    }
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(policy, key, value)
    db.flush()
    record_changes(db, actor_user_id=current_user.id, entity_type="university_score_policies", entity_id=policy.id, before=before, after={**before, **updates})
    record_audit(db, actor_user_id=current_user.id, entity_type="university_score_policies", entity_id=policy.id, action="update", payload=updates)
    affected_student_ids = sorted({target.student_profile_id for target in policy.target_profiles if target.is_active})
    if affected_student_ids:
        job = queue_recalculation(
            db,
            entity_type="university_score_policies",
            entity_id=policy.id,
            trigger=RecalculationTrigger.POLICY_CHANGED,
            scope={"student_ids": affected_student_ids, "policy_id": policy.id},
            requested_by_user_id=current_user.id,
        )
        db.flush()
        process_recalculation_job(db, job)
    db.commit()
    db.refresh(policy)
    return policy, affected_student_ids
