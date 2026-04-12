from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..dependencies import require_roles
from ..models import RecalculationJob, Role
from ..schemas import RecalculationJobRead
from ..services.analytics import process_queued_jobs

router = APIRouter(tags=["analytics"])


@router.post("/recalculations/process-queue", response_model=list[RecalculationJobRead])
def process_queue(limit: int = 20, db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR))):
    jobs = process_queued_jobs(db, limit=limit)
    return [RecalculationJobRead.model_validate(job) for job in jobs]
