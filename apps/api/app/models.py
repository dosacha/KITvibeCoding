from __future__ import annotations

from datetime import date, datetime
from enum import Enum

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum as SqlEnum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base
from .time_utils import current_utc_year, utc_now


JSONType = JSON


class Role(str, Enum):
    ADMIN = "admin"
    INSTRUCTOR = "instructor"
    STUDENT = "student"


class EnrollmentStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    LEAVE = "leave"
    GRADUATED = "graduated"
    TRIAL = "trial"


class SubmissionStatus(str, Enum):
    SUBMITTED = "submitted"
    ABSENT = "absent"
    UNANSWERED = "unanswered"
    NOT_ENTERED = "not_entered"


class WeaknessType(str, Enum):
    CONCEPT_GAP = "concept_gap"
    TRANSFER_WEAKNESS = "transfer_weakness"
    PRECISION_ACCURACY = "precision_accuracy"
    TIME_PRESSURE = "time_pressure"
    INSTABILITY = "instability"
    PERSISTENCE_RISK = "persistence_risk"


class StrategyStatus(str, Enum):
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    HELD = "held"
    ARCHIVED = "archived"


class ReviewDecision(str, Enum):
    APPROVE = "approve"
    HOLD = "hold"
    REVISE = "revise"


class RecalculationStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class RecalculationTrigger(str, Enum):
    RESULT_CHANGED = "result_changed"
    POLICY_CHANGED = "policy_changed"
    QUESTION_TAG_CHANGED = "question_tag_changed"
    GOAL_CHANGED = "goal_changed"
    HABIT_CHANGED = "habit_changed"
    WORKSPACE_SUBMITTED = "workspace_submitted"
    PLAN_PROGRESS_CHANGED = "plan_progress_changed"
    MANUAL = "manual"


class StrategyWorkspaceStatus(str, Enum):
    DRAFT = "draft"
    SUBMITTED_FOR_REVIEW = "submitted_for_review"
    REVIEWED = "reviewed"
    APPROVED = "approved"
    REVISE_REQUESTED = "revise_requested"
    RESET = "reset"


class WeeklyPlanStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class Academy(Base):
    __tablename__ = "academies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    class_groups: Mapped[list["ClassGroup"]] = relationship(back_populates="academy", cascade="all, delete-orphan")
    users: Mapped[list["User"]] = relationship(back_populates="academy", cascade="all, delete-orphan")
    subjects: Mapped[list["Subject"]] = relationship(back_populates="academy", cascade="all, delete-orphan")
    exams: Mapped[list["Exam"]] = relationship(back_populates="academy", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    academy_id: Mapped[int | None] = mapped_column(ForeignKey("academies.id"))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(SqlEnum(Role), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    preferred_subject_ids: Mapped[list[int]] = mapped_column(JSONType, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    academy: Mapped[Academy | None] = relationship(back_populates="users")
    student_profile: Mapped["StudentProfile | None"] = relationship(back_populates="user", uselist=False)
    instructed_class_groups: Mapped[list["ClassGroup"]] = relationship(
        back_populates="instructor",
        foreign_keys="ClassGroup.instructor_id",
    )


class ClassGroup(Base):
    __tablename__ = "class_groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    academy_id: Mapped[int] = mapped_column(ForeignKey("academies.id"))
    instructor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(120))
    grade_level: Mapped[str] = mapped_column(String(30))

    academy: Mapped[Academy] = relationship(back_populates="class_groups")
    instructor: Mapped[User | None] = relationship(back_populates="instructed_class_groups", foreign_keys=[instructor_id])
    students: Mapped[list["StudentProfile"]] = relationship(back_populates="class_group")
    exams: Mapped[list["Exam"]] = relationship(back_populates="class_group")


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True)
    academy_id: Mapped[int | None] = mapped_column(ForeignKey("academies.id"))
    name: Mapped[str] = mapped_column(String(60))
    code: Mapped[str] = mapped_column(String(20), unique=True)

    academy: Mapped[Academy | None] = relationship(back_populates="subjects")
    units: Mapped[list["Unit"]] = relationship(back_populates="subject", cascade="all, delete-orphan")
    exams: Mapped[list["Exam"]] = relationship(back_populates="subject")


class Unit(Base):
    __tablename__ = "units"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    name: Mapped[str] = mapped_column(String(120))
    code: Mapped[str] = mapped_column(String(40), unique=True)
    prerequisite_unit_id: Mapped[int | None] = mapped_column(ForeignKey("units.id"))

    subject: Mapped[Subject] = relationship(back_populates="units")
    prerequisite_unit: Mapped["Unit | None"] = relationship(remote_side=[id])
    question_mappings: Mapped[list["QuestionUnitMapping"]] = relationship(back_populates="unit")
    mastery_current_records: Mapped[list["UnitMasteryCurrent"]] = relationship(back_populates="unit")
    mastery_history_records: Mapped[list["UnitMasteryHistory"]] = relationship(back_populates="unit")


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    class_group_id: Mapped[int | None] = mapped_column(ForeignKey("class_groups.id"))
    grade_level: Mapped[str] = mapped_column(String(30))
    enrollment_status: Mapped[EnrollmentStatus] = mapped_column(SqlEnum(EnrollmentStatus), default=EnrollmentStatus.ACTIVE)
    weekly_available_hours: Mapped[float] = mapped_column(Float, default=12.0)
    preferred_subjects: Mapped[list[str]] = mapped_column(JSONType, default=list)
    disliked_subjects: Mapped[list[str]] = mapped_column(JSONType, default=list)
    learning_style_preferences: Mapped[list[str]] = mapped_column(JSONType, default=list)
    study_style_notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    user: Mapped[User] = relationship(back_populates="student_profile")
    class_group: Mapped[ClassGroup | None] = relationship(back_populates="students")
    habits: Mapped[list["LearningHabitSnapshot"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")
    goals: Mapped[list["TargetUniversityProfile"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")
    results: Mapped[list["StudentResult"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")
    diagnoses: Mapped[list["StudentDiagnosis"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")
    strategies: Mapped[list["StudentStrategy"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")
    strategy_workspaces: Mapped[list["StudentStrategyWorkspace"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")
    weekly_plans: Mapped[list["WeeklyPlan"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")
    mastery_current_records: Mapped[list["UnitMasteryCurrent"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")
    mastery_history_records: Mapped[list["UnitMasteryHistory"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")


class LearningHabitSnapshot(Base):
    __tablename__ = "learning_habit_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id"))
    captured_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    recent_learning_mode: Mapped[str] = mapped_column(String(60), default="mixed")
    self_study_ratio: Mapped[float] = mapped_column(Float, default=0.25)
    lecture_ratio: Mapped[float] = mapped_column(Float, default=0.25)
    error_note_ratio: Mapped[float] = mapped_column(Float, default=0.25)
    problem_solving_ratio: Mapped[float] = mapped_column(Float, default=0.25)
    review_habit_score: Mapped[float] = mapped_column(Float, default=50.0)
    consistency_score: Mapped[float] = mapped_column(Float, default=50.0)
    notes: Mapped[str | None] = mapped_column(Text)

    student_profile: Mapped[StudentProfile] = relationship(back_populates="habits")


class UniversityScorePolicy(Base):
    __tablename__ = "university_score_policies"

    id: Mapped[int] = mapped_column(primary_key=True)
    academic_year: Mapped[int] = mapped_column(Integer, default=current_utc_year)
    university_name: Mapped[str] = mapped_column(String(120), index=True)
    admission_type: Mapped[str] = mapped_column(String(60))
    subject_weights: Mapped[dict] = mapped_column(JSONType, default=dict)
    required_subjects: Mapped[list[str]] = mapped_column(JSONType, default=list)
    bonus_rules: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    grade_conversion_rules: Mapped[dict] = mapped_column(JSONType, default=dict)
    target_score: Mapped[float] = mapped_column(Float, default=85.0)
    notes: Mapped[str | None] = mapped_column(Text)

    target_profiles: Mapped[list["TargetUniversityProfile"]] = relationship(back_populates="policy")


class TargetUniversityProfile(Base):
    __tablename__ = "target_university_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id"))
    policy_id: Mapped[int] = mapped_column(ForeignKey("university_score_policies.id"))
    target_department: Mapped[str] = mapped_column(String(120))
    priority_order: Mapped[int] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    student_profile: Mapped[StudentProfile] = relationship(back_populates="goals")
    policy: Mapped[UniversityScorePolicy] = relationship(back_populates="target_profiles")
    strategies: Mapped[list["StudentStrategy"]] = relationship(back_populates="goal")


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[int] = mapped_column(primary_key=True)
    academy_id: Mapped[int] = mapped_column(ForeignKey("academies.id"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    class_group_id: Mapped[int | None] = mapped_column(ForeignKey("class_groups.id"))
    name: Mapped[str] = mapped_column(String(120))
    exam_date: Mapped[date] = mapped_column(Date)
    total_score: Mapped[float] = mapped_column(Float)
    time_limit_minutes: Mapped[int] = mapped_column(Integer, default=60)
    is_retake: Mapped[bool] = mapped_column(Boolean, default=False)

    academy: Mapped[Academy] = relationship(back_populates="exams")
    subject: Mapped[Subject] = relationship(back_populates="exams")
    class_group: Mapped[ClassGroup | None] = relationship(back_populates="exams")
    questions: Mapped[list["Question"]] = relationship(back_populates="exam", cascade="all, delete-orphan")
    results: Mapped[list["StudentResult"]] = relationship(back_populates="exam", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"
    __table_args__ = (UniqueConstraint("exam_id", "number", name="uq_question_exam_number"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id"))
    number: Mapped[int] = mapped_column(Integer)
    teacher_difficulty: Mapped[int] = mapped_column(Integer, default=3)
    answer_key: Mapped[str | None] = mapped_column(String(30))
    points: Mapped[float] = mapped_column(Float)
    question_type: Mapped[str] = mapped_column(String(60))
    problem_style: Mapped[str] = mapped_column(String(60), default="mixed")
    estimated_seconds: Mapped[int] = mapped_column(Integer, default=90)

    exam: Mapped[Exam] = relationship(back_populates="questions")
    unit_mappings: Mapped[list["QuestionUnitMapping"]] = relationship(back_populates="question", cascade="all, delete-orphan")
    responses: Mapped[list["StudentQuestionResponse"]] = relationship(back_populates="question")
    statistics_snapshots: Mapped[list["QuestionStatisticsSnapshot"]] = relationship(back_populates="question", cascade="all, delete-orphan")


class QuestionUnitMapping(Base):
    __tablename__ = "question_unit_mappings"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"))
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id"))
    weight: Mapped[float] = mapped_column(Float, default=1.0)

    question: Mapped[Question] = relationship(back_populates="unit_mappings")
    unit: Mapped[Unit] = relationship(back_populates="question_mappings")


class StudentResult(Base):
    __tablename__ = "student_results"
    __table_args__ = (UniqueConstraint("student_profile_id", "exam_id", name="uq_student_exam_result"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id"))
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    raw_score: Mapped[float] = mapped_column(Float, default=0.0)
    percentile: Mapped[float | None] = mapped_column(Float)
    grade: Mapped[int | None] = mapped_column(Integer)
    completed_in_seconds: Mapped[int | None] = mapped_column(Integer)
    result_status: Mapped[SubmissionStatus] = mapped_column(SqlEnum(SubmissionStatus), default=SubmissionStatus.SUBMITTED)
    question_breakdown: Mapped[dict] = mapped_column(JSONType, default=dict)
    result_metadata: Mapped[dict] = mapped_column(JSONType, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    student_profile: Mapped[StudentProfile] = relationship(back_populates="results")
    exam: Mapped[Exam] = relationship(back_populates="results")
    subject: Mapped[Subject] = relationship()
    responses: Mapped[list["StudentQuestionResponse"]] = relationship(back_populates="student_result", cascade="all, delete-orphan")


class StudentQuestionResponse(Base):
    __tablename__ = "student_question_responses"
    __table_args__ = (UniqueConstraint("student_result_id", "question_id", name="uq_result_question_response"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    student_result_id: Mapped[int] = mapped_column(ForeignKey("student_results.id"))
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"))
    selected_answer: Mapped[str | None] = mapped_column(String(30))
    is_correct: Mapped[bool | None] = mapped_column(Boolean)
    response_status: Mapped[SubmissionStatus] = mapped_column(SqlEnum(SubmissionStatus), default=SubmissionStatus.SUBMITTED)
    time_spent_seconds: Mapped[int | None] = mapped_column(Integer)

    student_result: Mapped[StudentResult] = relationship(back_populates="responses")
    question: Mapped[Question] = relationship(back_populates="responses")


class QuestionStatisticsSnapshot(Base):
    __tablename__ = "question_statistics_snapshots"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"))
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id"))
    snapshot_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    error_rate: Mapped[float] = mapped_column(Float, default=0.0)
    valid_response_count: Mapped[int] = mapped_column(Integer, default=0)
    empirical_difficulty: Mapped[float] = mapped_column(Float, default=1.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    final_difficulty: Mapped[float] = mapped_column(Float, default=1.0)

    question: Mapped[Question] = relationship(back_populates="statistics_snapshots")


class UnitMasteryCurrent(Base):
    __tablename__ = "unit_mastery_current"
    __table_args__ = (UniqueConstraint("student_profile_id", "unit_id", name="uq_student_unit_mastery_current"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id"))
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    mastery_current: Mapped[float] = mapped_column(Float, default=0.0)
    recent_mastery: Mapped[float] = mapped_column(Float, default=0.0)
    effective_mastery: Mapped[float] = mapped_column(Float, default=0.0)
    unit_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    last_exam_date: Mapped[date | None] = mapped_column(Date)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    student_profile: Mapped[StudentProfile] = relationship(back_populates="mastery_current_records")
    unit: Mapped[Unit] = relationship(back_populates="mastery_current_records")
    subject: Mapped[Subject] = relationship()


class UnitMasteryHistory(Base):
    __tablename__ = "unit_mastery_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id"))
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    exam_id: Mapped[int | None] = mapped_column(ForeignKey("exams.id"))
    snapshot_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    mastery_current: Mapped[float] = mapped_column(Float, default=0.0)
    recent_mastery: Mapped[float] = mapped_column(Float, default=0.0)
    effective_mastery: Mapped[float] = mapped_column(Float, default=0.0)
    unit_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)

    student_profile: Mapped[StudentProfile] = relationship(back_populates="mastery_history_records")
    unit: Mapped[Unit] = relationship(back_populates="mastery_history_records")
    subject: Mapped[Subject] = relationship()
    exam: Mapped[Exam | None] = relationship()


class StudentDiagnosis(Base):
    __tablename__ = "student_diagnoses"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id"))
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    primary_weakness_type: Mapped[WeaknessType] = mapped_column(SqlEnum(WeaknessType))
    weakness_scores: Mapped[dict] = mapped_column(JSONType, default=dict)
    weak_subjects: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    weak_units: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    evidence: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    feature_snapshot: Mapped[dict] = mapped_column(JSONType, default=dict)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    low_confidence_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    coaching_message: Mapped[str] = mapped_column(Text)
    instructor_summary: Mapped[str] = mapped_column(Text)

    student_profile: Mapped[StudentProfile] = relationship(back_populates="diagnoses")
    strategies: Mapped[list["StudentStrategy"]] = relationship(back_populates="diagnosis")


class StudentStrategy(Base):
    __tablename__ = "student_strategies"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id"))
    diagnosis_id: Mapped[int | None] = mapped_column(ForeignKey("student_diagnoses.id"))
    goal_id: Mapped[int | None] = mapped_column(ForeignKey("target_university_profiles.id"))
    variant: Mapped[str] = mapped_column(String(30), default="basic")
    status: Mapped[StrategyStatus] = mapped_column(SqlEnum(StrategyStatus), default=StrategyStatus.PENDING_REVIEW)
    structured_plan: Mapped[dict] = mapped_column(JSONType, default=dict)
    natural_language_summary: Mapped[str] = mapped_column(Text)
    rationale: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    risk_factors: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    instructor_explanation: Mapped[str] = mapped_column(Text)
    student_coaching: Mapped[str] = mapped_column(Text)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    student_profile: Mapped[StudentProfile] = relationship(back_populates="strategies")
    diagnosis: Mapped[StudentDiagnosis | None] = relationship(back_populates="strategies")
    goal: Mapped[TargetUniversityProfile | None] = relationship(back_populates="strategies")
    reviews: Mapped[list["StrategyReview"]] = relationship(back_populates="strategy", cascade="all, delete-orphan")


class StrategyReview(Base):
    __tablename__ = "strategy_reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    strategy_id: Mapped[int] = mapped_column(ForeignKey("student_strategies.id"))
    reviewer_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    decision: Mapped[ReviewDecision] = mapped_column(SqlEnum(ReviewDecision))
    reason: Mapped[str] = mapped_column(Text)
    diff: Mapped[dict] = mapped_column(JSONType, default=dict)
    edited_plan: Mapped[dict | None] = mapped_column(JSONType)
    edited_summary: Mapped[str | None] = mapped_column(Text)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    strategy: Mapped[StudentStrategy] = relationship(back_populates="reviews")
    reviewer: Mapped[User] = relationship()


class StudentStrategyWorkspace(Base):
    __tablename__ = "student_strategy_workspaces"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id"), index=True)
    base_strategy_id: Mapped[int | None] = mapped_column(ForeignKey("student_strategies.id"))
    status: Mapped[StrategyWorkspaceStatus] = mapped_column(
        SqlEnum(StrategyWorkspaceStatus),
        default=StrategyWorkspaceStatus.DRAFT,
        index=True,
    )
    overrides: Mapped[dict] = mapped_column(JSONType, default=dict)
    student_note: Mapped[str | None] = mapped_column(Text)
    instructor_message: Mapped[str | None] = mapped_column(Text)
    instructor_private_note: Mapped[str | None] = mapped_column(Text)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    student_profile: Mapped[StudentProfile] = relationship(back_populates="strategy_workspaces")
    base_strategy: Mapped[StudentStrategy | None] = relationship()


class WeeklyPlan(Base):
    __tablename__ = "weekly_plans"
    __table_args__ = (UniqueConstraint("student_profile_id", "week_start", name="uq_student_weekly_plan"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id"), index=True)
    source_strategy_id: Mapped[int | None] = mapped_column(ForeignKey("student_strategies.id"))
    workspace_id: Mapped[int | None] = mapped_column(ForeignKey("student_strategy_workspaces.id"))
    week_start: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[WeeklyPlanStatus] = mapped_column(SqlEnum(WeeklyPlanStatus), default=WeeklyPlanStatus.ACTIVE)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    student_profile: Mapped[StudentProfile] = relationship(back_populates="weekly_plans")
    source_strategy: Mapped[StudentStrategy | None] = relationship()
    workspace: Mapped[StudentStrategyWorkspace | None] = relationship()
    items: Mapped[list["WeeklyPlanItem"]] = relationship(back_populates="plan", cascade="all, delete-orphan")
    reflections: Mapped[list["WeeklyPlanReflection"]] = relationship(back_populates="plan", cascade="all, delete-orphan")


class WeeklyPlanItem(Base):
    __tablename__ = "weekly_plan_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("weekly_plans.id"), index=True)
    subject_code: Mapped[str] = mapped_column(String(20))
    subject_name: Mapped[str] = mapped_column(String(60))
    unit_id: Mapped[int | None] = mapped_column(ForeignKey("units.id"))
    unit_name: Mapped[str | None] = mapped_column(String(120))
    planned_minutes: Mapped[int] = mapped_column(Integer, default=0)
    completed_minutes: Mapped[int] = mapped_column(Integer, default=0)
    day_bucket: Mapped[str] = mapped_column(String(20), default="weekday")
    priority: Mapped[int] = mapped_column(Integer, default=1)
    rollover_allowed: Mapped[bool] = mapped_column(Boolean, default=True)
    is_checked: Mapped[bool] = mapped_column(Boolean, default=False)
    student_note: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    plan: Mapped[WeeklyPlan] = relationship(back_populates="items")
    unit: Mapped[Unit | None] = relationship()


class WeeklyPlanReflection(Base):
    __tablename__ = "weekly_plan_reflections"

    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("weekly_plans.id"), index=True)
    good: Mapped[str | None] = mapped_column(Text)
    blocked: Mapped[str | None] = mapped_column(Text)
    failure_reason: Mapped[str | None] = mapped_column(Text)
    next_adjustment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    plan: Mapped[WeeklyPlan] = relationship(back_populates="reflections")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    entity_type: Mapped[str] = mapped_column(String(80))
    entity_id: Mapped[int | None] = mapped_column(Integer)
    action: Mapped[str] = mapped_column(String(80))
    payload: Mapped[dict] = mapped_column(JSONType, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    actor: Mapped[User | None] = relationship()


class ChangeHistory(Base):
    __tablename__ = "change_histories"

    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(80))
    entity_id: Mapped[int] = mapped_column(Integer)
    field_name: Mapped[str] = mapped_column(String(80))
    old_value: Mapped[str | None] = mapped_column(Text)
    new_value: Mapped[str | None] = mapped_column(Text)
    changed_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    changed_by: Mapped[User | None] = relationship()


class RecalculationJob(Base):
    __tablename__ = "recalculation_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(80))
    entity_id: Mapped[int | None] = mapped_column(Integer)
    trigger: Mapped[RecalculationTrigger] = mapped_column(SqlEnum(RecalculationTrigger))
    scope: Mapped[dict] = mapped_column(JSONType, default=dict)
    status: Mapped[RecalculationStatus] = mapped_column(SqlEnum(RecalculationStatus), default=RecalculationStatus.QUEUED)
    requested_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    executed_at: Mapped[datetime | None] = mapped_column(DateTime)
    details: Mapped[dict] = mapped_column(JSONType, default=dict)

    requested_by: Mapped[User | None] = relationship()
