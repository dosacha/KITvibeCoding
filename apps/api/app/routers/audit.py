from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..dependencies import require_roles
from ..models import AuditLog, ChangeHistory, RecalculationJob, Role
from ..schemas import AuditLogRead, ChangeHistoryRead, RecalculationJobRead
from ..services.audit import serialize_audit_log, serialize_change_history, serialize_recalculation_job

router = APIRouter(tags=["audit"])


@router.get("/audit-logs", response_model=list[AuditLogRead])
def list_audit_logs(db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN))):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(200).all()
    return [AuditLogRead.model_validate(serialize_audit_log(item)) for item in logs]


@router.get("/change-history", response_model=list[ChangeHistoryRead])
def list_change_history(db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN))):
    changes = db.query(ChangeHistory).order_by(ChangeHistory.changed_at.desc()).limit(200).all()
    return [ChangeHistoryRead.model_validate(serialize_change_history(item)) for item in changes]


@router.get("/recalculation-jobs", response_model=list[RecalculationJobRead])
def list_recalculation_jobs(db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN))):
    jobs = db.query(RecalculationJob).order_by(RecalculationJob.created_at.desc()).limit(200).all()
    return [RecalculationJobRead.model_validate(serialize_recalculation_job(item)) for item in jobs]
