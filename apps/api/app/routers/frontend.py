from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..db import get_db
from ..dependencies import get_current_user, require_roles
from ..models import Role
from ..schemas import (
    CsvTemplateRead,
    DashboardRead,
    ExamDetailRead,
    MetadataRead,
    StrategyOptionsRead,
    StudentSummaryRead,
    UniversityPolicyWithUsageRead,
)
from ..services import frontend_adapter

router = APIRouter(prefix="/frontend", tags=["frontend"])


@router.get("/dashboard/instructor", response_model=DashboardRead)
def instructor_dashboard(db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR))):
    return DashboardRead(data=frontend_adapter.build_instructor_dashboard(db, current_user=current_user))


@router.get("/dashboard/student", response_model=DashboardRead)
def student_dashboard(db: Session = Depends(get_db), current_user=Depends(require_roles(Role.STUDENT))):
    return DashboardRead(data=frontend_adapter.build_student_dashboard(db, current_user=current_user))


@router.get("/students", response_model=list[StudentSummaryRead])
def list_students(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    data = frontend_adapter.build_student_list(db, current_user=current_user)
    return [StudentSummaryRead.model_validate(item) for item in data]


@router.get("/students/{student_id}")
def student_detail(student_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return frontend_adapter.build_student_detail(db, student_id=student_id, current_user=current_user)


@router.get("/students/{student_id}/strategy-options", response_model=StrategyOptionsRead)
def student_strategy_options(
    student_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Aggregated strategy comparison payload (slice 2).

    Returns the latest generated set (basic + conservative side by side), the
    currently approved version that the student actually sees, any pending
    items still in review, the structured diagnosis the strategies are anchored
    to, and the recent review history. The frontend uses this to render the
    StudentDetailPage strategy comparison without doing extra joins itself.
    """
    payload = frontend_adapter.build_student_strategy_options(
        db, student_id=student_id, current_user=current_user
    )
    return StrategyOptionsRead.model_validate(payload)


@router.get("/exams")
def frontend_exams(db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR))):
    return frontend_adapter.build_frontend_exams(db, current_user=current_user)


@router.get("/exams/{exam_id}", response_model=ExamDetailRead)
def frontend_exam_detail(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
):
    """Aggregated payload for the operational ExamsPage tabs.

    Returns the exam metadata, every question (with multi-weight unit
    mappings), the visible student roster, and any existing results so the
    frontend can pre-fill the result entry table without doing N+1 fetches.
    """
    payload = frontend_adapter.build_exam_detail(db, exam_id=exam_id, current_user=current_user)
    return ExamDetailRead.model_validate(payload)


@router.get("/exams/{exam_id}/csv-template", response_model=CsvTemplateRead)
def frontend_exam_csv_template(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
):
    """Return a CSV template that lines up with ``POST /student-results/upload-csv``.

    The frontend uses ``csv_text`` for an in-place download button and renders
    ``headers`` / ``sample_rows`` / ``notes`` as inline guidance.
    """
    payload = frontend_adapter.build_csv_template(db, exam_id=exam_id, current_user=current_user)
    return CsvTemplateRead.model_validate(payload)


@router.get("/exams/{exam_id}/csv-template.csv")
def frontend_exam_csv_template_download(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
):
    """Same template as the JSON endpoint, served as a ``text/csv`` download."""
    from urllib.parse import quote

    payload = frontend_adapter.build_csv_template(db, exam_id=exam_id, current_user=current_user)
    # Content-Disposition headers must be latin-1 encodable. Korean exam names
    # break that rule, so we ship an ASCII fallback plus an RFC 5987-encoded
    # ``filename*`` parameter that browsers prefer when present.
    ascii_fallback = f"exam_{exam_id}_template.csv"
    encoded = quote(payload["filename"], safe="")
    disposition = (
        f'attachment; filename="{ascii_fallback}"; filename*=UTF-8\'\'{encoded}'
    )
    return Response(
        content=payload["csv_text"],
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": disposition},
    )


@router.get("/exams/{exam_id}/result-entry", response_model=ExamDetailRead)
def frontend_exam_result_entry(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
):
    """Aggregated payload named after the original spec's ``result-entry`` endpoint.

    Functionally an alias of ``GET /frontend/exams/{exam_id}`` — both return the
    exam meta, questions, roster, and existing results in a single call. The
    dedicated name is kept because the original spec names it explicitly, and
    the operational input UI uses it as a semantic hint that the payload is
    meant for the "학생 결과 입력" tab.
    """
    payload = frontend_adapter.build_exam_result_entry(
        db, exam_id=exam_id, current_user=current_user
    )
    return ExamDetailRead.model_validate(payload)


@router.get("/universities/policies", response_model=list[UniversityPolicyWithUsageRead])
def frontend_university_policies(
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(Role.ADMIN)),
):
    """Policy list enriched with per-policy student count.

    Used by the admin university policies page so the UI can warn about the
    impact radius before a policy save (""이 정책 저장 시 N명 재계산"").
    """
    payload = frontend_adapter.build_university_policies(db, current_user=current_user)
    return [UniversityPolicyWithUsageRead.model_validate(item) for item in payload]


@router.get("/metadata", response_model=MetadataRead)
def frontend_metadata(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return MetadataRead.model_validate(frontend_adapter.build_metadata(db, current_user=current_user))
