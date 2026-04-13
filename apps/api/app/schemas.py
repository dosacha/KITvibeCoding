from __future__ import annotations

from datetime import date, datetime

from .time_utils import current_utc_year
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from .models import (
    EnrollmentStatus,
    ReviewDecision,
    Role,
    StrategyStatus,
    SubmissionStatus,
    WeaknessType,
)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserRead"


class LoginRequest(BaseModel):
    email: str
    password: str


class UserRead(ORMModel):
    id: int
    email: str
    full_name: str
    role: Role
    academy_id: int | None = None
    is_active: bool


class LearningHabitSnapshotBase(BaseModel):
    recent_learning_mode: str = "mixed"
    self_study_ratio: float = Field(0.25, ge=0, le=1)
    lecture_ratio: float = Field(0.25, ge=0, le=1)
    error_note_ratio: float = Field(0.25, ge=0, le=1)
    problem_solving_ratio: float = Field(0.25, ge=0, le=1)
    review_habit_score: float = Field(50.0, ge=0, le=100)
    consistency_score: float = Field(50.0, ge=0, le=100)
    notes: str | None = None


class LearningHabitSnapshotCreate(LearningHabitSnapshotBase):
    captured_at: datetime | None = None


class LearningHabitSnapshotRead(ORMModel, LearningHabitSnapshotBase):
    id: int
    student_profile_id: int
    captured_at: datetime


class StudentGoalBase(BaseModel):
    policy_id: int
    target_department: str
    priority_order: int = Field(1, ge=1)
    is_active: bool = True
    notes: str | None = None


class StudentGoalCreate(StudentGoalBase):
    pass


class StudentGoalRead(ORMModel, StudentGoalBase):
    id: int
    student_profile_id: int
    created_at: datetime


class StudentProfileBase(BaseModel):
    class_group_id: int | None = None
    grade_level: str
    enrollment_status: EnrollmentStatus = EnrollmentStatus.ACTIVE
    weekly_available_hours: float = Field(12.0, ge=0)
    preferred_subjects: list[str] = Field(default_factory=list)
    disliked_subjects: list[str] = Field(default_factory=list)
    learning_style_preferences: list[str] = Field(default_factory=list)
    study_style_notes: str | None = None


class StudentProfileCreate(StudentProfileBase):
    user_id: int
    goals: list[StudentGoalCreate] = Field(default_factory=list)
    habits: list[LearningHabitSnapshotCreate] = Field(default_factory=list)


class StudentProfileUpdate(BaseModel):
    class_group_id: int | None = None
    grade_level: str | None = None
    enrollment_status: EnrollmentStatus | None = None
    weekly_available_hours: float | None = Field(default=None, ge=0)
    preferred_subjects: list[str] | None = None
    disliked_subjects: list[str] | None = None
    learning_style_preferences: list[str] | None = None
    study_style_notes: str | None = None


class StudentProfileRead(ORMModel, StudentProfileBase):
    id: int
    user_id: int
    created_at: datetime
    user: UserRead
    habits: list[LearningHabitSnapshotRead] = Field(default_factory=list)
    goals: list[StudentGoalRead] = Field(default_factory=list)


class SubjectRead(ORMModel):
    id: int
    name: str
    code: str


class UnitRead(ORMModel):
    id: int
    subject_id: int
    name: str
    code: str
    prerequisite_unit_id: int | None = None


class UniversityPolicyBase(BaseModel):
    academic_year: int = Field(default_factory=current_utc_year)
    university_name: str
    admission_type: str
    subject_weights: dict[str, float] = Field(default_factory=dict)
    required_subjects: list[str] = Field(default_factory=list)
    bonus_rules: list[dict[str, Any]] = Field(default_factory=list)
    grade_conversion_rules: dict[str, Any] = Field(default_factory=dict)
    target_score: float = Field(85.0, ge=0)
    notes: str | None = None


class UniversityPolicyCreate(UniversityPolicyBase):
    pass


class UniversityPolicyUpdate(BaseModel):
    academic_year: int | None = None
    university_name: str | None = None
    admission_type: str | None = None
    subject_weights: dict[str, float] | None = None
    required_subjects: list[str] | None = None
    bonus_rules: list[dict[str, Any]] | None = None
    grade_conversion_rules: dict[str, Any] | None = None
    target_score: float | None = Field(default=None, ge=0)
    notes: str | None = None


class UniversityPolicyRead(ORMModel, UniversityPolicyBase):
    id: int


class ClassGroupRead(ORMModel):
    id: int
    academy_id: int
    instructor_id: int | None = None
    name: str
    grade_level: str


class ExamBase(BaseModel):
    academy_id: int
    subject_id: int
    class_group_id: int | None = None
    name: str
    exam_date: date
    total_score: float = Field(..., gt=0)
    time_limit_minutes: int = Field(60, gt=0)
    is_retake: bool = False


class ExamCreate(ExamBase):
    pass


class ExamUpdate(BaseModel):
    subject_id: int | None = None
    class_group_id: int | None = None
    name: str | None = None
    exam_date: date | None = None
    total_score: float | None = Field(default=None, gt=0)
    time_limit_minutes: int | None = Field(default=None, gt=0)
    is_retake: bool | None = None


class ExamRead(ORMModel, ExamBase):
    id: int


class QuestionUnitMappingInput(BaseModel):
    unit_id: int
    weight: float = Field(1.0, gt=0)


class QuestionUnitMappingRead(ORMModel):
    id: int
    question_id: int
    unit_id: int
    weight: float


class QuestionBase(BaseModel):
    exam_id: int
    number: int = Field(..., ge=1)
    teacher_difficulty: int = Field(3, ge=1, le=5)
    answer_key: str | None = None
    points: float = Field(..., gt=0)
    question_type: str
    problem_style: str = "mixed"
    estimated_seconds: int = Field(90, gt=0)
    unit_mappings: list[QuestionUnitMappingInput] = Field(default_factory=list)


class QuestionCreate(QuestionBase):
    pass


class QuestionUpdate(BaseModel):
    number: int | None = Field(default=None, ge=1)
    teacher_difficulty: int | None = Field(default=None, ge=1, le=5)
    answer_key: str | None = None
    points: float | None = Field(default=None, gt=0)
    question_type: str | None = None
    problem_style: str | None = None
    estimated_seconds: int | None = Field(default=None, gt=0)
    unit_mappings: list[QuestionUnitMappingInput] | None = None


class QuestionRead(ORMModel):
    id: int
    exam_id: int
    number: int
    teacher_difficulty: int
    answer_key: str | None = None
    points: float
    question_type: str
    problem_style: str
    estimated_seconds: int
    unit_mappings: list[QuestionUnitMappingRead] = Field(default_factory=list)


class StudentQuestionResponseInput(BaseModel):
    question_id: int
    selected_answer: str | None = None
    response_status: SubmissionStatus = SubmissionStatus.SUBMITTED
    time_spent_seconds: int | None = Field(default=None, ge=0)


class StudentQuestionResponseRead(ORMModel):
    id: int
    student_result_id: int
    question_id: int
    selected_answer: str | None = None
    is_correct: bool | None = None
    response_status: SubmissionStatus
    time_spent_seconds: int | None = None


class StudentResultBase(BaseModel):
    student_profile_id: int
    exam_id: int
    subject_id: int | None = None
    raw_score: float | None = Field(default=None, ge=0)
    percentile: float | None = Field(default=None, ge=0, le=100)
    grade: int | None = Field(default=None, ge=1)
    completed_in_seconds: int | None = Field(default=None, ge=0)
    result_status: SubmissionStatus = SubmissionStatus.SUBMITTED
    question_breakdown: dict[str, Any] = Field(default_factory=dict)
    result_metadata: dict[str, Any] = Field(default_factory=dict)
    responses: list[StudentQuestionResponseInput] = Field(default_factory=list)


class StudentResultCreate(StudentResultBase):
    pass


class StudentResultRead(ORMModel):
    id: int
    student_profile_id: int
    exam_id: int
    subject_id: int
    raw_score: float
    percentile: float | None = None
    grade: int | None = None
    completed_in_seconds: int | None = None
    result_status: SubmissionStatus
    question_breakdown: dict[str, Any]
    result_metadata: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    responses: list[StudentQuestionResponseRead] = Field(default_factory=list)


class QuestionStatisticsSnapshotRead(ORMModel):
    id: int
    question_id: int
    exam_id: int
    snapshot_at: datetime
    error_rate: float
    valid_response_count: int
    empirical_difficulty: float
    confidence: float
    final_difficulty: float


class UnitMasteryRead(ORMModel):
    id: int
    student_profile_id: int
    unit_id: int
    subject_id: int
    mastery_current: float
    recent_mastery: float
    effective_mastery: float
    unit_confidence: float
    attempt_count: int
    last_exam_date: date | None = None
    updated_at: datetime | None = None


class DiagnosisRead(ORMModel):
    id: int
    student_profile_id: int
    computed_at: datetime
    primary_weakness_type: WeaknessType
    weakness_scores: dict[str, float]
    weak_subjects: list[dict[str, Any]]
    weak_units: list[dict[str, Any]]
    evidence: list[dict[str, Any]]
    feature_snapshot: dict[str, Any]
    confidence_score: float
    low_confidence_flag: bool
    coaching_message: str
    instructor_summary: str


class StrategyRead(ORMModel):
    id: int
    student_profile_id: int
    diagnosis_id: int | None = None
    goal_id: int | None = None
    variant: str
    status: StrategyStatus
    structured_plan: dict[str, Any]
    natural_language_summary: str
    rationale: list[dict[str, Any]]
    risk_factors: list[dict[str, Any]]
    instructor_explanation: str
    student_coaching: str
    rationale_bullets: list[dict[str, Any]] = Field(default_factory=list)
    risk_translation: list[dict[str, Any]] = Field(default_factory=list)
    next_check_in_message: str | None = None
    explanation_source: str = "deterministic_fallback"
    explanation_model: str | None = None
    explanation_generated_at: str | None = None
    generated_at: datetime


class StrategyReviewRequest(BaseModel):
    decision: ReviewDecision
    reason: str
    edited_plan: dict[str, Any] | None = None
    edited_summary: str | None = None


class StrategyReviewRead(ORMModel):
    id: int
    strategy_id: int
    reviewer_user_id: int
    decision: ReviewDecision
    reason: str
    diff: dict[str, Any]
    edited_plan: dict[str, Any] | None = None
    edited_summary: str | None = None
    reviewed_at: datetime


class AuditLogRead(ORMModel):
    id: int
    actor_user_id: int | None = None
    entity_type: str
    entity_id: int | None = None
    action: str
    payload: dict[str, Any]
    created_at: datetime
    display_entity: str | None = None
    display_action: str | None = None
    summary: str | None = None
    impact_student_count: int = 0


class ChangeHistoryRead(ORMModel):
    id: int
    entity_type: str
    entity_id: int
    field_name: str
    old_value: str | None = None
    new_value: str | None = None
    changed_by_user_id: int | None = None
    changed_at: datetime
    display_entity: str | None = None
    display_field_name: str | None = None
    summary: str | None = None


class RecalculationJobRead(ORMModel):
    id: int
    entity_type: str
    entity_id: int | None = None
    trigger: str
    scope: dict[str, Any]
    status: str
    requested_by_user_id: int | None = None
    created_at: datetime
    executed_at: datetime | None = None
    details: dict[str, Any]
    display_entity: str | None = None
    trigger_label: str | None = None
    summary: str | None = None
    impact_student_count: int = 0


class StudentSummaryRead(BaseModel):
    id: int
    full_name: str
    class_group_name: str | None = None
    primary_goal: str | None = None
    latest_weakness: str | None = None
    latest_strategy_status: str | None = None
    low_confidence_flag: bool = False


class ViewerCapabilitiesRead(BaseModel):
    id: int
    role: str
    role_label: str
    can_manage_policies: bool = False
    can_view_audit: bool = False
    can_manage_exams: bool = False
    can_review_strategies: bool = False


class MetadataRead(BaseModel):
    viewer: ViewerCapabilitiesRead | None = None
    subjects: list[SubjectRead]
    units: list[UnitRead]
    class_groups: list[ClassGroupRead]
    universities: list[UniversityPolicyRead]


class DashboardRead(BaseModel):
    data: dict[str, Any]


# ---------------------------------------------------------------------------
# Frontend adapter aggregated payloads (additive — slice 1)
# ---------------------------------------------------------------------------


class ExamDetailQuestionUnitMapping(BaseModel):
    unit_id: int
    unit_name: str | None = None
    subject_id: int | None = None
    weight: float


class ExamDetailQuestion(BaseModel):
    id: int
    number: int
    teacher_difficulty: int
    answer_key: str | None = None
    points: float
    question_type: str
    problem_style: str
    estimated_seconds: int
    unit_mappings: list[ExamDetailQuestionUnitMapping] = Field(default_factory=list)


class ExamDetailStudentResponse(BaseModel):
    question_id: int
    selected_answer: str | None = None
    is_correct: bool | None = None
    response_status: SubmissionStatus
    time_spent_seconds: int | None = None


class ExamDetailStudentResult(BaseModel):
    id: int
    student_profile_id: int
    raw_score: float | None = None
    percentile: float | None = None
    grade: int | None = None
    completed_in_seconds: int | None = None
    result_status: SubmissionStatus
    question_breakdown: dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime | None = None
    responses: list[ExamDetailStudentResponse] = Field(default_factory=list)


class ExamDetailRosterEntry(BaseModel):
    student_profile_id: int
    full_name: str
    class_group_id: int | None = None
    class_group_name: str | None = None
    enrollment_status: str
    has_result: bool = False
    result_status: SubmissionStatus | None = None


class ExamDetailMeta(BaseModel):
    id: int
    academy_id: int
    subject_id: int
    subject_name: str
    class_group_id: int | None = None
    class_group_name: str | None = None
    name: str
    exam_date: date
    total_score: float
    time_limit_minutes: int
    is_retake: bool


class ExamDetailRead(BaseModel):
    exam: ExamDetailMeta
    questions: list[ExamDetailQuestion] = Field(default_factory=list)
    roster: list[ExamDetailRosterEntry] = Field(default_factory=list)
    results: list[ExamDetailStudentResult] = Field(default_factory=list)


class CsvTemplateRead(BaseModel):
    filename: str
    headers: list[str]
    sample_rows: list[list[str]] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    csv_text: str


class CsvImportErrorRowRead(BaseModel):
    row: int
    student_profile_id: int | None = None
    student_email: str | None = None
    message: str


class CsvImportResultRead(BaseModel):
    exam_id: int
    rows: int
    imported: int
    created: int = 0
    updated: int = 0
    failed: int = 0
    errors: list[str] = Field(default_factory=list)
    error_rows: list[CsvImportErrorRowRead] = Field(default_factory=list)
    accepted_columns: list[str] = Field(default_factory=list)
    question_columns: list[str] = Field(default_factory=list)
    processed_student_ids: list[int] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Slice 2 — strategy options aggregated payload
# ---------------------------------------------------------------------------


class StrategyOptionVariant(BaseModel):
    """One variant (``basic`` or ``conservative``) inside a generated set."""

    id: int
    variant: str
    status: StrategyStatus
    natural_language_summary: str
    structured_plan: dict[str, Any] = Field(default_factory=dict)
    rationale: list[dict[str, Any]] = Field(default_factory=list)
    risk_factors: list[dict[str, Any]] = Field(default_factory=list)
    instructor_explanation: str
    student_coaching: str
    rationale_bullets: list[dict[str, Any]] = Field(default_factory=list)
    risk_translation: list[dict[str, Any]] = Field(default_factory=list)
    next_check_in_message: str | None = None
    explanation_source: str = "deterministic_fallback"
    explanation_model: str | None = None
    explanation_generated_at: str | None = None
    generated_at: datetime
    is_approved: bool = False
    is_student_visible: bool = False


class StrategyOptionSet(BaseModel):
    """A latest "batch" of generated strategies sharing one diagnosis."""

    diagnosis_id: int | None = None
    generated_at: datetime | None = None
    variants: list[StrategyOptionVariant] = Field(default_factory=list)


class StrategyDiagnosisSummary(BaseModel):
    id: int
    computed_at: datetime
    primary_weakness_type: WeaknessType
    confidence_score: float
    low_confidence_flag: bool
    coaching_message: str
    instructor_summary: str
    weak_subjects: list[dict[str, Any]] = Field(default_factory=list)
    weak_units: list[dict[str, Any]] = Field(default_factory=list)
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    weakness_scores: dict[str, float] = Field(default_factory=dict)


class StrategyReviewHistoryEntry(BaseModel):
    id: int
    strategy_id: int
    variant: str
    decision: ReviewDecision
    reason: str
    reviewed_at: datetime
    reviewer_user_id: int | None = None
    diff: dict[str, Any] = Field(default_factory=dict)
    edited_summary: str | None = None
    edited_plan: dict[str, Any] | None = None


class StrategyOptionsRead(BaseModel):
    """Aggregated payload powering the strategy comparison UI.

    Cleanly separates:
      * ``latest_set`` — the most recently generated batch (basic + conservative)
      * ``approved`` — the strategy actually shown to the student
      * ``pending`` — anything still waiting on review (latest set or carried over)
      * ``diagnosis`` — the structured signals the strategies are anchored to
      * ``review_history`` — the full audit trail across the latest set
    """

    student_id: int
    latest_set: StrategyOptionSet
    approved: StrategyOptionVariant | None = None
    pending: list[StrategyOptionVariant] = Field(default_factory=list)
    diagnosis: StrategyDiagnosisSummary | None = None
    review_history: list[StrategyReviewHistoryEntry] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Slice 5 — frontend adapter for university policy admin list
# ---------------------------------------------------------------------------


class UniversityPolicyWithUsageRead(BaseModel):
    id: int
    academic_year: int
    university_name: str
    admission_type: str
    subject_weights: dict[str, float] = Field(default_factory=dict)
    required_subjects: list[str] = Field(default_factory=list)
    bonus_rules: list[dict[str, Any]] = Field(default_factory=list)
    grade_conversion_rules: dict[str, Any] = Field(default_factory=dict)
    target_score: float
    notes: str | None = None
    student_count: int = 0


TokenResponse.model_rebuild()
