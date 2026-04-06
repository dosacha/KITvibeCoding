from __future__ import annotations

from sqlalchemy.orm import Session

from ..models import UniversityScorePolicy
from ..schemas import UniversityPolicyCreate, UniversityPolicyUpdate
from .audit import log_audit, log_change


def list_policies(db: Session) -> list[UniversityScorePolicy]:
    return db.query(UniversityScorePolicy).order_by(UniversityScorePolicy.university_name.asc(), UniversityScorePolicy.id.asc()).all()


def create_policy(db: Session, payload: UniversityPolicyCreate, actor_user_id: int | None) -> UniversityScorePolicy:
    policy = UniversityScorePolicy(**payload.model_dump())
    db.add(policy)
    db.flush()

    log_audit(
        db,
        actor_user_id=actor_user_id,
        entity_type="university_score_policy",
        entity_id=policy.id,
        action="create",
        payload={
            "university_name": policy.university_name,
            "admission_type": policy.admission_type,
            "target_score": policy.target_score,
        },
    )
    log_change(
        db,
        entity_type="university_score_policy",
        entity_id=policy.id,
        field_name="created",
        old_value=None,
        new_value=policy.university_name,
        changed_by_user_id=actor_user_id,
    )
    db.commit()
    db.refresh(policy)
    return policy


def update_policy(
    db: Session,
    policy: UniversityScorePolicy,
    payload: UniversityPolicyUpdate,
    actor_user_id: int | None,
) -> UniversityScorePolicy:
    changes: list[tuple[str, str | None, str | None]] = []

    for field_name, new_value in payload.model_dump(exclude_unset=True).items():
        old_value = getattr(policy, field_name)
        if old_value == new_value:
            continue
        setattr(policy, field_name, new_value)
        changes.append((field_name, _stringify(old_value), _stringify(new_value)))

    if changes:
        log_audit(
            db,
            actor_user_id=actor_user_id,
            entity_type="university_score_policy",
            entity_id=policy.id,
            action="update",
            payload={field_name: new_value for field_name, _, new_value in changes},
        )
        for field_name, old_value, new_value in changes:
            log_change(
                db,
                entity_type="university_score_policy",
                entity_id=policy.id,
                field_name=field_name,
                old_value=old_value,
                new_value=new_value,
                changed_by_user_id=actor_user_id,
            )

    db.commit()
    db.refresh(policy)
    return policy


def _stringify(value: object) -> str | None:
    if value is None:
        return None
    return str(value)
