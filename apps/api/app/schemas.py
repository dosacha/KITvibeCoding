from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import Role, WeaknessType


class UserRead(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: Role
    academy_id: int | None = None
    preferred_subject_ids: list[int] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class StudentDiagnosisRead(BaseModel):
    id: int
    student_profile_id: int
    computed_at: datetime
    primary_weakness_type: WeaknessType
    weakness_scores: dict[str, float]
    weak_subjects: list[dict[str, Any]]
    weak_units: list[dict[str, Any]]
    evidence: list[dict[str, Any]]
    feature_snapshot: dict[str, Any]

    model_config = ConfigDict(from_attributes=True)


class StudentStrategyRead(BaseModel):
    id: int
    student_profile_id: int
    structured_plan: dict[str, Any]
    natural_language_summary: str
    rationale: list[dict[str, Any]]
    generated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UniversityPolicyRead(BaseModel):
    id: int
    university_name: str
    admission_type: str
    subject_weights: dict[str, float]
    required_subjects: list[str]
    bonus_rules: list[dict[str, Any]]
    grade_conversion_rules: dict[str, Any]
    target_score: float
    notes: str | None = None

    model_config = ConfigDict(from_attributes=True)


class StudentAnalyticsRead(BaseModel):
    student_profile_id: int
    latest_scores: dict[str, float]
    score_trends: dict[str, list[float]]
    growth_rates: dict[str, float]
    unit_mastery: list[dict[str, Any]]
    stability_index: float
    question_error_rates: list[dict[str, Any]]
    target_gap: dict[str, Any]
    diagnosis: StudentDiagnosisRead | None = None
    strategy: StudentStrategyRead | None = None


class InstructorOverviewItem(BaseModel):
    student_name: str
    student_profile_id: int
    primary_weakness_type: WeaknessType | None = None
    weak_subjects: list[dict[str, Any]] = Field(default_factory=list)
    target_gap: float | None = None
    coaching_points: list[str] = Field(default_factory=list)


class InstructorOverviewResponse(BaseModel):
    generated_at: datetime
    students: list[InstructorOverviewItem]


class StudentDashboardResponse(BaseModel):
    student_name: str
    diagnosis: StudentDiagnosisRead | None = None
    strategy: StudentStrategyRead | None = None
    target_gap: dict[str, Any]
    current_position_summary: str


class ExamCreate(BaseModel):
    academy_id: int
    subject_id: int
    name: str
    exam_date: date
    total_score: float


class ExamRead(BaseModel):
    id: int
    academy_id: int
    subject_id: int
    name: str
    exam_date: date
    total_score: float

    model_config = ConfigDict(from_attributes=True)


class StudentListItem(BaseModel):
    student_profile_id: int
    user_id: int
    student_name: str
    grade_level: str
    class_group_id: int | None = None
    target_university_profile_id: int | None = None


class CurrentUserResponse(BaseModel):
    user: UserRead


class RecalculateResponse(BaseModel):
    student_profile_id: int
    diagnosis_id: int
    strategy_id: int
    recalculated_at: datetime
