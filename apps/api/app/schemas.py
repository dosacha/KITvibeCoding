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


class UniversityPolicyCreate(BaseModel):
    university_name: str = Field(min_length=1, max_length=120)
    admission_type: str = Field(min_length=1, max_length=60)
    subject_weights: dict[str, float] = Field(default_factory=dict)
    required_subjects: list[str] = Field(default_factory=list)
    bonus_rules: list[dict[str, Any]] = Field(default_factory=list)
    grade_conversion_rules: dict[str, Any] = Field(default_factory=dict)
    target_score: float = Field(gt=0, le=1000)
    notes: str | None = None


class UniversityPolicyUpdate(BaseModel):
    university_name: str | None = Field(default=None, min_length=1, max_length=120)
    admission_type: str | None = Field(default=None, min_length=1, max_length=60)
    subject_weights: dict[str, float] | None = None
    required_subjects: list[str] | None = None
    bonus_rules: list[dict[str, Any]] | None = None
    grade_conversion_rules: dict[str, Any] | None = None
    target_score: float | None = Field(default=None, gt=0, le=1000)
    notes: str | None = None


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


class ExamUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    exam_date: date | None = None
    total_score: float | None = Field(default=None, gt=0, le=1000)


class StudentListItem(BaseModel):
    student_profile_id: int
    user_id: int
    student_name: str
    grade_level: str
    class_group_id: int | None = None
    target_university_profile_id: int | None = None


class CurrentUserResponse(BaseModel):
    user: UserRead


class QuestionUnitMappingPayload(BaseModel):
    unit_id: int = Field(gt=0)
    weight: float = Field(default=1.0, gt=0, le=1)


class QuestionCreate(BaseModel):
    exam_id: int = Field(gt=0)
    number: int = Field(gt=0)
    difficulty: int = Field(ge=1, le=5)
    points: float = Field(gt=0, le=100)
    question_type: str = Field(min_length=1, max_length=60)
    estimated_seconds: int = Field(default=90, ge=10, le=7200)
    unit_mappings: list[QuestionUnitMappingPayload] = Field(default_factory=list)


class QuestionUpdate(BaseModel):
    number: int | None = Field(default=None, gt=0)
    difficulty: int | None = Field(default=None, ge=1, le=5)
    points: float | None = Field(default=None, gt=0, le=100)
    question_type: str | None = Field(default=None, min_length=1, max_length=60)
    estimated_seconds: int | None = Field(default=None, ge=10, le=7200)
    unit_mappings: list[QuestionUnitMappingPayload] | None = None


class QuestionUnitMappingRead(BaseModel):
    id: int
    unit_id: int
    weight: float

    model_config = ConfigDict(from_attributes=True)


class QuestionRead(BaseModel):
    id: int
    exam_id: int
    number: int
    difficulty: int
    points: float
    question_type: str
    estimated_seconds: int
    unit_mappings: list[QuestionUnitMappingRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class StudentResultUpsert(BaseModel):
    student_profile_id: int = Field(gt=0)
    exam_id: int = Field(gt=0)
    raw_score: float = Field(ge=0, le=1000)
    percentile: float | None = Field(default=None, ge=0, le=100)
    grade: int | None = Field(default=None, ge=1, le=9)
    completed_in_seconds: int | None = Field(default=None, ge=1, le=28800)
    question_breakdown: dict[str, Any] = Field(default_factory=dict)
    result_metadata: dict[str, Any] = Field(default_factory=dict)


class StudentResultRead(BaseModel):
    id: int
    student_profile_id: int
    exam_id: int
    subject_id: int
    raw_score: float
    percentile: float | None = None
    grade: int | None = None
    completed_in_seconds: int | None = None
    question_breakdown: dict[str, Any] = Field(default_factory=dict)
    result_metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentResultListItem(BaseModel):
    id: int
    exam_id: int
    exam_name: str
    subject_id: int
    subject_name: str
    raw_score: float
    percentile: float | None = None
    grade: int | None = None
    completed_in_seconds: int | None = None
    question_breakdown: dict[str, Any] = Field(default_factory=dict)
    result_metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class StudentDetailItem(BaseModel):
    student_profile_id: int
    user_id: int
    student_name: str
    grade_level: str
    class_group_id: int | None = None
    class_group_name: str | None = None
    target_university_profile_id: int | None = None
    study_style_notes: str | None = None


class UnitListItem(BaseModel):
    id: int
    subject_id: int
    name: str
    code: str

    model_config = ConfigDict(from_attributes=True)


class FrontendStudentExamItem(BaseModel):
    id: str
    name: str
    date: str
    totalScore: float
    maxScore: float


class FrontendStudentListItem(BaseModel):
    id: str
    name: str
    grade: str
    classGroup: str | None = None
    targetUniv: str | None = None
    weaknessTypes: list[str] = Field(default_factory=list)
    recentExams: list[FrontendStudentExamItem] = Field(default_factory=list)
    consultPriority: str
    gapScore: float


class FrontendExamItem(BaseModel):
    id: str
    name: str
    date: str
    status: str
    subject: str
    questionCount: int
    avgScore: float | None = None
    participantCount: int


class FrontendExamCreate(BaseModel):
    academy_id: int = Field(gt=0)
    subject_id: int = Field(gt=0)
    name: str = Field(min_length=1, max_length=120)
    exam_date: date
    total_score: float = Field(gt=0, le=1000)


class FrontendStudentsResponse(BaseModel):
    students: list[FrontendStudentListItem]


class FrontendExamsResponse(BaseModel):
    exams: list[FrontendExamItem]


class FrontendMetadataAcademyItem(BaseModel):
    id: int
    name: str


class FrontendMetadataSubjectItem(BaseModel):
    id: int
    code: str
    name: str


class FrontendMetadataResponse(BaseModel):
    academies: list[FrontendMetadataAcademyItem]
    subjects: list[FrontendMetadataSubjectItem]


class FrontendDashboardStat(BaseModel):
    label: str
    value: str
    sub: str | None = None


class FrontendWeaknessDistributionItem(BaseModel):
    weaknessTypeId: str
    label: str
    count: int


class FrontendExamTrendPoint(BaseModel):
    name: str
    averageScore: float


class FrontendWeakUnitItem(BaseModel):
    unitId: int
    unitName: str
    subjectCode: str
    mastery: float


class FrontendRecentStrategyItem(BaseModel):
    studentId: str
    studentName: str
    consultPriority: str
    weaknessTypes: list[str] = Field(default_factory=list)
    summary: str


class FrontendInstructorDashboardResponse(BaseModel):
    stats: list[FrontendDashboardStat]
    consultPriorityStudents: list[FrontendStudentListItem]
    weaknessDistribution: list[FrontendWeaknessDistributionItem]
    examTrend: list[FrontendExamTrendPoint]
    weakUnits: list[FrontendWeakUnitItem]
    recentStrategies: list[FrontendRecentStrategyItem]


class FrontendStudentSubjectItem(BaseModel):
    subjectId: str
    subjectCode: str
    subjectName: str
    currentScore: float
    targetScore: float
    trend: list[float] = Field(default_factory=list)
    stability: float
    universityWeight: float
    isPreferred: bool = False


class FrontendStudentDiagnosisSummary(BaseModel):
    primaryWeaknessType: str | None = None
    weaknessTypes: list[str] = Field(default_factory=list)
    evidence: list[dict[str, Any]] = Field(default_factory=list)


class FrontendStudentStrategySummary(BaseModel):
    summary: str
    studentSummary: str = ""
    instructorSummary: str = ""
    confidenceLevel: str = ""
    confidenceMessage: str = ""
    dataSufficiency: dict[str, Any] = Field(default_factory=dict)
    prioritySubjects: list[dict[str, Any]] = Field(default_factory=list)
    priorityUnits: list[dict[str, Any]] = Field(default_factory=list)
    timeAllocation: list[dict[str, Any]] = Field(default_factory=list)
    coachingPoints: list[str] = Field(default_factory=list)
    antiPatterns: list[str] = Field(default_factory=list)


class FrontendStudentDetailResponse(BaseModel):
    student: FrontendStudentListItem
    subjects: list[FrontendStudentSubjectItem]
    diagnosis: FrontendStudentDiagnosisSummary
    strategy: FrontendStudentStrategySummary
    weakUnits: list[FrontendWeakUnitItem]
    targetGap: dict[str, Any]


class FrontendUniversityPolicyItem(BaseModel):
    id: int
    universityName: str
    admissionType: str
    subjectWeights: dict[str, float]
    requiredSubjects: list[str] = Field(default_factory=list)
    bonusRules: list[dict[str, Any]] = Field(default_factory=list)
    targetScore: float
    notes: str | None = None


class FrontendUniversityPoliciesResponse(BaseModel):
    universities: list[FrontendUniversityPolicyItem]


class FrontendLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=4)


class FrontendSessionUser(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: Role


class FrontendLoginResponse(BaseModel):
    accessToken: str
    user: FrontendSessionUser


class FrontendMeResponse(BaseModel):
    user: FrontendSessionUser


class RecalculateResponse(BaseModel):
    student_profile_id: int
    diagnosis_id: int
    strategy_id: int
    recalculated_at: datetime
