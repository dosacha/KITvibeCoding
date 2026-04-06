from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..dependencies import get_current_user, require_roles
from ..engines.features import build_student_features
from ..models import Role, StudentProfile
from ..schemas import RecalculateResponse, StudentAnalyticsRead, StudentDiagnosisRead, StudentStrategyRead
from ..services.analytics import get_latest_diagnosis, get_latest_strategy, recalculate_student_analysis


router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("/recalculate/student/{student_profile_id}", response_model=RecalculateResponse)
def recalculate_student(student_profile_id: int, current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)), db: Session = Depends(get_db)) -> RecalculateResponse:
    student_profile = db.get(StudentProfile, student_profile_id)
    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    diagnosis, strategy = recalculate_student_analysis(db, student_profile, actor_user_id=current_user.id)
    return RecalculateResponse(student_profile_id=student_profile.id, diagnosis_id=diagnosis.id, strategy_id=strategy.id, recalculated_at=diagnosis.computed_at)


@router.get("/student/{student_profile_id}", response_model=StudentAnalyticsRead)
def get_student_analytics(student_profile_id: int, current_user=Depends(get_current_user), db: Session = Depends(get_db)) -> StudentAnalyticsRead:
    student_profile = db.get(StudentProfile, student_profile_id)
    if not student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    if current_user.role == Role.STUDENT and current_user.id != student_profile.user_id:
        raise HTTPException(status_code=403, detail="Students can only access their own data")
    features = build_student_features(db, student_profile)
    diagnosis = get_latest_diagnosis(db, student_profile_id)
    strategy = get_latest_strategy(db, student_profile_id)
    return StudentAnalyticsRead(
        student_profile_id=student_profile.id,
        latest_scores=features["latest_scores"],
        score_trends=features["score_trends"],
        growth_rates=features["growth_rates"],
        unit_mastery=features["unit_mastery"],
        stability_index=features["stability_index"],
        question_error_rates=features["question_error_rates"],
        target_gap=features["target_gap"],
        diagnosis=StudentDiagnosisRead.model_validate(diagnosis) if diagnosis else None,
        strategy=StudentStrategyRead.model_validate(strategy) if strategy else None,
    )

