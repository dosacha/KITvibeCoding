from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..dependencies import require_roles
from ..engines.features import build_student_features
from ..models import Role, StudentProfile
from ..schemas import InstructorOverviewItem, InstructorOverviewResponse, StudentDashboardResponse, StudentDiagnosisRead, StudentStrategyRead
from ..services.analytics import get_latest_diagnosis, get_latest_strategy


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/instructor/overview", response_model=InstructorOverviewResponse)
def instructor_overview(current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)), db: Session = Depends(get_db)) -> InstructorOverviewResponse:
    items = []
    for student_profile in db.query(StudentProfile).all():
        diagnosis = get_latest_diagnosis(db, student_profile.id)
        strategy = get_latest_strategy(db, student_profile.id)
        features = build_student_features(db, student_profile)
        items.append(
            InstructorOverviewItem(
                student_name=student_profile.user.full_name,
                student_profile_id=student_profile.id,
                primary_weakness_type=diagnosis.primary_weakness_type if diagnosis else None,
                weak_subjects=diagnosis.weak_subjects[:2] if diagnosis else [],
                target_gap=features.get("target_gap", {}).get("gap"),
                coaching_points=(strategy.structured_plan.get("coaching_points", [])[:2] if strategy else []),
            )
        )
    return InstructorOverviewResponse(generated_at=datetime.utcnow(), students=items)


@router.get("/student/me", response_model=StudentDashboardResponse)
def student_me(current_user=Depends(require_roles(Role.STUDENT)), db: Session = Depends(get_db)) -> StudentDashboardResponse:
    student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    features = build_student_features(db, student_profile)
    diagnosis = get_latest_diagnosis(db, student_profile.id)
    strategy = get_latest_strategy(db, student_profile.id)
    target_gap = features.get("target_gap", {})
    return StudentDashboardResponse(
        student_name=current_user.full_name,
        diagnosis=StudentDiagnosisRead.model_validate(diagnosis) if diagnosis else None,
        strategy=StudentStrategyRead.model_validate(strategy) if strategy else None,
        target_gap=target_gap,
        current_position_summary=f"{target_gap.get('university_name', '목표 대학')} 기준 가중 환산 점수는 {target_gap.get('weighted_score', 0)}점이며 목표와의 격차는 {target_gap.get('gap', 0)}점입니다.",
    )


@router.get("/demo/student", response_model=StudentDashboardResponse)
def demo_student_dashboard(db: Session = Depends(get_db)) -> StudentDashboardResponse:
    student_profile = db.query(StudentProfile).first()
    if not student_profile:
        raise HTTPException(status_code=404, detail="Demo student not found")
    features = build_student_features(db, student_profile)
    diagnosis = get_latest_diagnosis(db, student_profile.id)
    strategy = get_latest_strategy(db, student_profile.id)
    target_gap = features.get("target_gap", {})
    return StudentDashboardResponse(
        student_name=student_profile.user.full_name,
        diagnosis=StudentDiagnosisRead.model_validate(diagnosis) if diagnosis else None,
        strategy=StudentStrategyRead.model_validate(strategy) if strategy else None,
        target_gap=target_gap,
        current_position_summary=f"{target_gap.get('university_name', '목표 대학')} 기준 가중 환산 점수는 {target_gap.get('weighted_score', 0)}점이며 목표와의 격차는 {target_gap.get('gap', 0)}점입니다.",
    )


@router.get("/demo/instructor", response_model=InstructorOverviewResponse)
def demo_instructor_dashboard(db: Session = Depends(get_db)) -> InstructorOverviewResponse:
    items = []
    for student_profile in db.query(StudentProfile).all():
        diagnosis = get_latest_diagnosis(db, student_profile.id)
        strategy = get_latest_strategy(db, student_profile.id)
        features = build_student_features(db, student_profile)
        items.append(
            InstructorOverviewItem(
                student_name=student_profile.user.full_name,
                student_profile_id=student_profile.id,
                primary_weakness_type=diagnosis.primary_weakness_type if diagnosis else None,
                weak_subjects=diagnosis.weak_subjects[:2] if diagnosis else [],
                target_gap=features.get("target_gap", {}).get("gap"),
                coaching_points=(strategy.structured_plan.get("coaching_points", [])[:2] if strategy else []),
            )
        )
    return InstructorOverviewResponse(generated_at=datetime.utcnow(), students=items)
