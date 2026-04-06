from __future__ import annotations

from sqlalchemy.orm import Session

from ..models import AuditLog, ChangeHistory


def log_audit(
    db: Session,
    *,
    actor_user_id: int | None,
    entity_type: str,
    entity_id: int | None,
    action: str,
    payload: dict | None = None,
) -> AuditLog:
    audit_log = AuditLog(
        actor_user_id=actor_user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        payload=payload or {},
    )
    db.add(audit_log)
    return audit_log


def log_change(
    db: Session,
    *,
    entity_type: str,
    entity_id: int,
    field_name: str,
    old_value: str | None,
    new_value: str | None,
    changed_by_user_id: int | None,
) -> ChangeHistory:
    change = ChangeHistory(
        entity_type=entity_type,
        entity_id=entity_id,
        field_name=field_name,
        old_value=old_value,
        new_value=new_value,
        changed_by_user_id=changed_by_user_id,
    )
    db.add(change)
    return change

