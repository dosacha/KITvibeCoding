from __future__ import annotations

from datetime import date, datetime
from enum import Enum

from sqlalchemy import (
    CheckConstraint,
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum as SqlEnum,
    Float,
    ForeignKey,
    Index,
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
    REVISE_REQUESTED = "revise_requested"
    APPROVED_LINKED = "approved_linked"
    APPROVED = "approved"
    ARCHIVED = "archived"
    RESET = "reset"


class WeeklyPlanStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class WeeklyPlanItemStatus(str, Enum):
    PLANNED = "planned"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    ROLLED_OVER = "rolled_over"


class AdmissionDirection(str, Enum):
    SUSI_FAVORED = "susi_favored"
    JEONGSI_FAVORED = "jeongsi_favored"
    BALANCED = "balanced"
    UNDETERMINED = "undetermined"


class ConfidenceLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class ReviewScope(str, Enum):
    AI_VARIANT = "ai_variant"
    STUDENT_WORKSPACE = "student_workspace"


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
    __table_args__ = (
        CheckConstraint("weekly_available_hours >= 0", name="ck_student_weekly_available_hours_non_negative"),
        CheckConstraint("weekday_available_hours >= 0", name="ck_student_weekday_available_hours_non_negative"),
        CheckConstraint("weekend_available_hours >= 0", name="ck_student_weekend_available_hours_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    class_group_id: Mapped[int | None] = mapped_column(ForeignKey("class_groups.id"))
    grade_level: Mapped[str] = mapped_column(String(30))
    enrollment_status: Mapped[EnrollmentStatus] = mapped_column(SqlEnum(EnrollmentStatus), default=EnrollmentStatus.ACTIVE)
    weekly_available_hours: Mapped[float] = mapped_column(Float, default=12.0)
    weekday_available_hours: Mapped[float] = mapped_column(Float, default=8.0)
    weekend_available_hours: Mapped[float] = mapped_column(Float, default=4.0)
    preferred_study_window: Mapped[str | None] = mapped_column(String(30))
    preferred_subjects: Mapped[list[str]] = mapped_column(JSONType, default=list)
    disliked_subjects: Mapped[list[str]] = mapped_column(JSONType, default=list)
    learning_style_preferences: Mapped[list[str]] = mapped_column(JSONType, default=list)
    study_style_notes: Mapped[str | None] = mapped_column(Text)
    student_goal_note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    last_self_updated_at: Mapped[datetime | None] = mapped_column(DateTime)

    user: Mapped[User] = relationship(back_populates="student_profile")
    class_group: Mapped[ClassGroup | None] = relationship(back_populates="students")
    habits: Mapped[list["LearningHabitSnapshot"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")
    goals: Mapped[list["TargetUniversityProfile"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")
    results: Mapped[list["StudentResult"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")
    diagnoses: Mapped[list["StudentDiagnosis"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")
    strategies: Mapped[list["StudentStrategy"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")
    strategy_workspaces: Mapped[list["StudentStrategyWorkspace"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")
    weekly_plans: Mapped[list["WeeklyPlan"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")
    admission_direction_snapshots: Mapped[list["AdmissionDirectionSnapshot"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")
    goal_readiness_snapshots: Mapped[list["GoalReadinessSnapshot"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")
    mastery_current_records: Mapped[list["UnitMasteryCurrent"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")
    mastery_history_records: Mapped[list["UnitMasteryHistory"]] = relationship(back_populates="student_profile", cascade="all, delete-orphan")


class LearningHabitSnapshot(Base):
    __tablename__ = "learning_habit_snapshots"
    __table_args__ = (
        CheckConstraint("self_study_ratio >= 0 AND self_study_ratio <= 1", name="ck_habit_self_study_ratio_range"),
        CheckConstraint("lecture_ratio >= 0 AND lecture_ratio <= 1", name="ck_habit_lecture_ratio_range"),
        CheckConstraint("error_note_ratio >= 0 AND error_note_ratio <= 1", name="ck_habit_error_note_ratio_range"),
        CheckConstraint("problem_solving_ratio >= 0 AND problem_solving_ratio <= 1", name="ck_habit_problem_solving_ratio_range"),
        CheckConstraint("review_habit_score >= 0 AND review_habit_score <= 100", name="ck_habit_review_score_range"),
        CheckConstraint("consistency_score >= 0 AND consistency_score <= 100", name="ck_habit_consistency_score_range"),
        CheckConstraint("planner_followthrough_score >= 0 AND planner_followthrough_score <= 100", name="ck_habit_planner_followthrough_range"),
        CheckConstraint("preferred_session_minutes >= 0", name="ck_habit_preferred_session_minutes_non_negative"),
    )

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
    preferred_session_minutes: Mapped[int] = mapped_column(Integer, default=35)
    preferred_study_slot: Mapped[str | None] = mapped_column(String(30))
    self_reported_obstacles_json: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    planner_followthrough_score: Mapped[float] = mapped_column(Float, default=50.0)
    last_reflection_excerpt: Mapped[str | None] = mapped_column(Text)
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
    strategies: Mapped[list["StudentStrategy"]] = relationship(
        back_populates="goal",
        foreign_keys="StudentStrategy.goal_id",
    )
    admission_direction_snapshots: Mapped[list["AdmissionDirectionSnapshot"]] = relationship(back_populates="basis_goal")
    goal_readiness_snapshots: Mapped[list["GoalReadinessSnapshot"]] = relationship(back_populates="target_university_profile")


class AdmissionDirectionSnapshot(Base):
    __tablename__ = "admission_direction_snapshots"
    __table_args__ = (
        CheckConstraint("susi_score >= 0 AND susi_score <= 100", name="ck_admission_direction_susi_score_range"),
        CheckConstraint("jeongsi_score >= 0 AND jeongsi_score <= 100", name="ck_admission_direction_jeongsi_score_range"),
        CheckConstraint("confidence >= 0 AND confidence <= 1", name="ck_admission_direction_confidence_range"),
        Index("ix_admission_direction_student_calculated", "student_profile_id", "calculated_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id"), index=True)
    basis_goal_id: Mapped[int | None] = mapped_column(ForeignKey("target_university_profiles.id"))
    direction: Mapped[AdmissionDirection] = mapped_column(SqlEnum(AdmissionDirection), default=AdmissionDirection.UNDETERMINED)
    susi_score: Mapped[float] = mapped_column(Float, default=0.0)
    jeongsi_score: Mapped[float] = mapped_column(Float, default=0.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    reasons_json: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    recommended_action: Mapped[str | None] = mapped_column(Text)
    calculated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    student_profile: Mapped[StudentProfile] = relationship(back_populates="admission_direction_snapshots")
    basis_goal: Mapped[TargetUniversityProfile | None] = relationship(back_populates="admission_direction_snapshots")


class GoalReadinessSnapshot(Base):
    __tablename__ = "goal_readiness_snapshots"
    __table_args__ = (
        CheckConstraint("readiness_score >= 0 AND readiness_score <= 100", name="ck_goal_readiness_score_range"),
        Index("ix_goal_readiness_student_calculated", "student_profile_id", "calculated_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id"), index=True)
    target_university_profile_id: Mapped[int] = mapped_column(ForeignKey("target_university_profiles.id"))
    readiness_score: Mapped[float] = mapped_column(Float, default=0.0)
    risk_band: Mapped[str] = mapped_column(String(60), default="undetermined")
    highest_leverage_subject_code: Mapped[str | None] = mapped_column(String(20))
    summary: Mapped[str | None] = mapped_column(Text)
    calculated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    student_profile: Mapped[StudentProfile] = relationship(back_populates="goal_readiness_snapshots")
    target_university_profile: Mapped[TargetUniversityProfile] = relationship(back_populates="goal_readiness_snapshots")
    subject_details: Mapped[list["GoalGapSubjectDetail"]] = relationship(back_populates="snapshot", cascade="all, delete-orphan")


class GoalGapSubjectDetail(Base):
    __tablename__ = "goal_gap_subject_details"
    __table_args__ = (
        CheckConstraint("current_score >= 0 AND current_score <= 100", name="ck_goal_gap_current_score_range"),
        CheckConstraint("target_score >= 0 AND target_score <= 100", name="ck_goal_gap_target_score_range"),
        CheckConstraint("gap_score >= 0", name="ck_goal_gap_score_non_negative"),
        CheckConstraint("admission_weight >= 0", name="ck_goal_gap_admission_weight_non_negative"),
        CheckConstraint("confidence >= 0 AND confidence <= 1", name="ck_goal_gap_confidence_range"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    snapshot_id: Mapped[int] = mapped_column(ForeignKey("goal_readiness_snapshots.id"), index=True)
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id"))
    subject_code: Mapped[str] = mapped_column(String(20))
    subject_name: Mapped[str] = mapped_column(String(60))
    current_score: Mapped[float] = mapped_column(Float, default=0.0)
    target_score: Mapped[float] = mapped_column(Float, default=0.0)
    gap_score: Mapped[float] = mapped_column(Float, default=0.0)
    admission_weight: Mapped[float] = mapped_column(Float, default=0.0)
    growth_potential: Mapped[float] = mapped_column(Float, default=0.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    delta_vs_last: Mapped[float | None] = mapped_column(Float)

    snapshot: Mapped[GoalReadinessSnapshot] = relationship(back_populates="subject_details")
    subject: Mapped[Subject | None] = relationship()


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
    __table_args__ = (
        UniqueConstraint("student_profile_id", "exam_id", name="uq_student_exam_result"),
        CheckConstraint("raw_score >= 0", name="ck_student_result_raw_score_non_negative"),
        CheckConstraint("percentile IS NULL OR (percentile >= 0 AND percentile <= 100)", name="ck_student_result_percentile_range"),
        Index("ix_student_result_student_created", "student_profile_id", "created_at"),
    )

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
    __table_args__ = (
        Index("ix_unit_mastery_history_student_snapshot", "student_profile_id", "snapshot_at"),
    )

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
    __table_args__ = (
        CheckConstraint("confidence_score >= 0 AND confidence_score <= 1", name="ck_student_diagnosis_confidence_range"),
        Index("ix_student_diagnosis_student_computed", "student_profile_id", "computed_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id"))
    admission_direction_snapshot_id: Mapped[int | None] = mapped_column(ForeignKey("admission_direction_snapshots.id"))
    goal_readiness_snapshot_id: Mapped[int | None] = mapped_column(ForeignKey("goal_readiness_snapshots.id"))
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    primary_weakness_type: Mapped[WeaknessType] = mapped_column(SqlEnum(WeaknessType))
    weakness_scores: Mapped[dict] = mapped_column(JSONType, default=dict)
    weak_subjects: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    weak_units: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    evidence: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    feature_snapshot: Mapped[dict] = mapped_column(JSONType, default=dict)
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    confidence_level: Mapped[ConfidenceLevel] = mapped_column(SqlEnum(ConfidenceLevel), default=ConfidenceLevel.MEDIUM)
    low_confidence_flag: Mapped[bool] = mapped_column(Boolean, default=False)
    low_confidence_reason_json: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    coaching_summary: Mapped[str | None] = mapped_column(Text)
    coaching_message: Mapped[str] = mapped_column(Text)
    instructor_summary: Mapped[str] = mapped_column(Text)

    student_profile: Mapped[StudentProfile] = relationship(back_populates="diagnoses")
    admission_direction_snapshot: Mapped[AdmissionDirectionSnapshot | None] = relationship()
    goal_readiness_snapshot: Mapped[GoalReadinessSnapshot | None] = relationship()
    signals: Mapped[list["DiagnosisSignal"]] = relationship(back_populates="diagnosis", cascade="all, delete-orphan")
    strategies: Mapped[list["StudentStrategy"]] = relationship(back_populates="diagnosis")


class DiagnosisSignal(Base):
    __tablename__ = "diagnosis_signals"
    __table_args__ = (
        CheckConstraint("importance_rank >= 1", name="ck_diagnosis_signal_importance_rank_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    diagnosis_id: Mapped[int] = mapped_column(ForeignKey("student_diagnoses.id"), index=True)
    signal_group: Mapped[str] = mapped_column(String(60))
    signal_code: Mapped[str] = mapped_column(String(80))
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id"))
    unit_id: Mapped[int | None] = mapped_column(ForeignKey("units.id"))
    metric_key: Mapped[str | None] = mapped_column(String(80))
    numeric_value: Mapped[float | None] = mapped_column(Float)
    text_value: Mapped[str | None] = mapped_column(Text)
    message: Mapped[str] = mapped_column(Text)
    importance_rank: Mapped[int] = mapped_column(Integer, default=1)

    diagnosis: Mapped[StudentDiagnosis] = relationship(back_populates="signals")
    subject: Mapped[Subject | None] = relationship()
    unit: Mapped[Unit | None] = relationship()


class StudyRecipeTemplate(Base):
    __tablename__ = "study_recipe_templates"
    __table_args__ = (
        CheckConstraint("session_length_minutes >= 0", name="ck_study_recipe_session_length_non_negative"),
        CheckConstraint("display_order >= 0", name="ck_study_recipe_display_order_non_negative"),
        CheckConstraint("version >= 1", name="ck_study_recipe_version_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    weakness_type: Mapped[WeaknessType] = mapped_column(SqlEnum(WeaknessType), index=True)
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id"))
    unit_id: Mapped[int | None] = mapped_column(ForeignKey("units.id"))
    title: Mapped[str] = mapped_column(String(160))
    recommended_methods_json: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    anti_patterns_json: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    session_length_minutes: Mapped[int] = mapped_column(Integer, default=35)
    checkpoints_json: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    version: Mapped[int] = mapped_column(Integer, default=1)

    subject: Mapped[Subject | None] = relationship()
    unit: Mapped[Unit | None] = relationship()


class StudentStrategy(Base):
    __tablename__ = "student_strategies"
    __table_args__ = (
        CheckConstraint("plan_schema_version >= 1", name="ck_student_strategy_plan_schema_version_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id"))
    diagnosis_id: Mapped[int | None] = mapped_column(ForeignKey("student_diagnoses.id"))
    goal_id: Mapped[int | None] = mapped_column(ForeignKey("target_university_profiles.id"))
    source_goal_id: Mapped[int | None] = mapped_column(ForeignKey("target_university_profiles.id"))
    variant: Mapped[str] = mapped_column(String(30), default="basic")
    status: Mapped[StrategyStatus] = mapped_column(SqlEnum(StrategyStatus), default=StrategyStatus.PENDING_REVIEW)
    plan_schema_version: Mapped[int] = mapped_column(Integer, default=2)
    structured_plan: Mapped[dict] = mapped_column(JSONType, default=dict)
    natural_language_summary: Mapped[str] = mapped_column(Text)
    rationale: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    risk_factors: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    instructor_explanation: Mapped[str] = mapped_column(Text)
    student_coaching: Mapped[str] = mapped_column(Text)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    student_profile: Mapped[StudentProfile] = relationship(back_populates="strategies")
    diagnosis: Mapped[StudentDiagnosis | None] = relationship(back_populates="strategies")
    goal: Mapped[TargetUniversityProfile | None] = relationship(back_populates="strategies", foreign_keys=[goal_id])
    source_goal: Mapped[TargetUniversityProfile | None] = relationship(foreign_keys=[source_goal_id])
    reviews: Mapped[list["StrategyReview"]] = relationship(back_populates="strategy", cascade="all, delete-orphan")


class StrategyReview(Base):
    __tablename__ = "strategy_reviews"

    id: Mapped[int] = mapped_column(primary_key=True)
    strategy_id: Mapped[int] = mapped_column(ForeignKey("student_strategies.id"))
    workspace_id: Mapped[int | None] = mapped_column(ForeignKey("student_strategy_workspaces.id"))
    reviewer_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    decision: Mapped[ReviewDecision] = mapped_column(SqlEnum(ReviewDecision))
    review_scope: Mapped[ReviewScope] = mapped_column(SqlEnum(ReviewScope), default=ReviewScope.AI_VARIANT)
    reason: Mapped[str] = mapped_column(Text)
    diff: Mapped[dict] = mapped_column(JSONType, default=dict)
    diff_summary_json: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    edited_plan: Mapped[dict | None] = mapped_column(JSONType)
    edited_summary: Mapped[str | None] = mapped_column(Text)
    student_visible_message: Mapped[str | None] = mapped_column(Text)
    instructor_private_note: Mapped[str | None] = mapped_column(Text)
    visible_to_student: Mapped[bool] = mapped_column(Boolean, default=True)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    strategy: Mapped[StudentStrategy] = relationship(back_populates="reviews")
    workspace: Mapped["StudentStrategyWorkspace | None"] = relationship(back_populates="reviews")
    reviewer: Mapped[User] = relationship()


class StudentStrategyWorkspace(Base):
    __tablename__ = "student_strategy_workspaces"
    __table_args__ = (
        CheckConstraint("version_no >= 1", name="ck_strategy_workspace_version_positive"),
        CheckConstraint("weekly_total_hours >= 0", name="ck_strategy_workspace_total_hours_non_negative"),
        CheckConstraint("weekday_hours >= 0", name="ck_strategy_workspace_weekday_hours_non_negative"),
        CheckConstraint("weekend_hours >= 0", name="ck_strategy_workspace_weekend_hours_non_negative"),
        Index("ix_strategy_workspace_student_current", "student_profile_id", "is_current", "updated_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id"), index=True)
    base_strategy_id: Mapped[int | None] = mapped_column(ForeignKey("student_strategies.id"))
    source_strategy_id: Mapped[int | None] = mapped_column(ForeignKey("student_strategies.id"))
    base_goal_id: Mapped[int | None] = mapped_column(ForeignKey("target_university_profiles.id"))
    selected_variant: Mapped[str | None] = mapped_column(String(30))
    status: Mapped[StrategyWorkspaceStatus] = mapped_column(
        SqlEnum(StrategyWorkspaceStatus),
        default=StrategyWorkspaceStatus.DRAFT,
        index=True,
    )
    version_no: Mapped[int] = mapped_column(Integer, default=1)
    is_current: Mapped[bool] = mapped_column(Boolean, default=True)
    weekly_total_hours: Mapped[float | None] = mapped_column(Float)
    weekday_hours: Mapped[float | None] = mapped_column(Float)
    weekend_hours: Mapped[float | None] = mapped_column(Float)
    overrides: Mapped[dict] = mapped_column(JSONType, default=dict)
    override_payload_json: Mapped[dict] = mapped_column(JSONType, default=dict)
    constraint_payload_json: Mapped[dict] = mapped_column(JSONType, default=dict)
    student_note: Mapped[str | None] = mapped_column(Text)
    instructor_message: Mapped[str | None] = mapped_column(Text)
    instructor_private_note: Mapped[str | None] = mapped_column(Text)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime)
    approved_strategy_id: Mapped[int | None] = mapped_column(ForeignKey("student_strategies.id"))
    created_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    updated_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    student_profile: Mapped[StudentProfile] = relationship(back_populates="strategy_workspaces")
    base_strategy: Mapped[StudentStrategy | None] = relationship(foreign_keys=[base_strategy_id])
    source_strategy: Mapped[StudentStrategy | None] = relationship(foreign_keys=[source_strategy_id])
    base_goal: Mapped[TargetUniversityProfile | None] = relationship()
    approved_strategy: Mapped[StudentStrategy | None] = relationship(foreign_keys=[approved_strategy_id])
    created_by: Mapped[User | None] = relationship(foreign_keys=[created_by_user_id])
    updated_by: Mapped[User | None] = relationship(foreign_keys=[updated_by_user_id])
    reviews: Mapped[list[StrategyReview]] = relationship(back_populates="workspace")


class WeeklyPlan(Base):
    __tablename__ = "weekly_plans"
    __table_args__ = (
        UniqueConstraint("student_profile_id", "week_start", name="uq_student_weekly_plan"),
        CheckConstraint("planned_total_minutes >= 0", name="ck_weekly_plan_planned_total_non_negative"),
        CheckConstraint("completed_total_minutes >= 0", name="ck_weekly_plan_completed_total_non_negative"),
        CheckConstraint("completion_rate_cached >= 0 AND completion_rate_cached <= 1", name="ck_weekly_plan_completion_rate_range"),
        Index("ix_weekly_plan_student_week", "student_profile_id", "week_start"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id"), index=True)
    source_strategy_id: Mapped[int | None] = mapped_column(ForeignKey("student_strategies.id"))
    workspace_id: Mapped[int | None] = mapped_column(ForeignKey("student_strategy_workspaces.id"))
    week_start: Mapped[date] = mapped_column(Date, index=True)
    week_end: Mapped[date | None] = mapped_column(Date)
    generation_source: Mapped[str] = mapped_column(String(40), default="approved_strategy")
    planned_total_minutes: Mapped[int] = mapped_column(Integer, default=0)
    completed_total_minutes: Mapped[int] = mapped_column(Integer, default=0)
    completion_rate_cached: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[WeeklyPlanStatus] = mapped_column(SqlEnum(WeeklyPlanStatus), default=WeeklyPlanStatus.ACTIVE)
    carry_over_summary_json: Mapped[dict] = mapped_column(JSONType, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    student_profile: Mapped[StudentProfile] = relationship(back_populates="weekly_plans")
    source_strategy: Mapped[StudentStrategy | None] = relationship()
    workspace: Mapped[StudentStrategyWorkspace | None] = relationship()
    items: Mapped[list["WeeklyPlanItem"]] = relationship(
        back_populates="plan",
        cascade="all, delete-orphan",
        foreign_keys="WeeklyPlanItem.plan_id",
    )
    reflections: Mapped[list["WeeklyPlanReflection"]] = relationship(
        back_populates="plan",
        cascade="all, delete-orphan",
        foreign_keys="WeeklyPlanReflection.plan_id",
    )


class WeeklyPlanItem(Base):
    __tablename__ = "weekly_plan_items"
    __table_args__ = (
        CheckConstraint("planned_minutes >= 0", name="ck_weekly_plan_item_planned_minutes_non_negative"),
        CheckConstraint("completed_minutes >= 0", name="ck_weekly_plan_item_completed_minutes_non_negative"),
        CheckConstraint("priority >= 1", name="ck_weekly_plan_item_priority_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("weekly_plans.id"), index=True)
    weekly_plan_id: Mapped[int | None] = mapped_column(ForeignKey("weekly_plans.id"))
    day_of_week: Mapped[str | None] = mapped_column(String(10))
    subject_id: Mapped[int | None] = mapped_column(ForeignKey("subjects.id"))
    subject_code: Mapped[str] = mapped_column(String(20))
    subject_name: Mapped[str] = mapped_column(String(60))
    unit_id: Mapped[int | None] = mapped_column(ForeignKey("units.id"))
    unit_name: Mapped[str | None] = mapped_column(String(120))
    task_type: Mapped[str] = mapped_column(String(40), default="study")
    title: Mapped[str | None] = mapped_column(String(160))
    instruction: Mapped[str | None] = mapped_column(Text)
    planned_minutes: Mapped[int] = mapped_column(Integer, default=0)
    completed_minutes: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[WeeklyPlanItemStatus] = mapped_column(SqlEnum(WeeklyPlanItemStatus), default=WeeklyPlanItemStatus.PLANNED)
    day_bucket: Mapped[str] = mapped_column(String(20), default="weekday")
    priority: Mapped[int] = mapped_column(Integer, default=1)
    priority_order: Mapped[int] = mapped_column(Integer, default=1)
    rollover_allowed: Mapped[bool] = mapped_column(Boolean, default=True)
    rollover_from_item_id: Mapped[int | None] = mapped_column(ForeignKey("weekly_plan_items.id"))
    generated_from_signal_code: Mapped[str | None] = mapped_column(String(80))
    is_checked: Mapped[bool] = mapped_column(Boolean, default=False)
    student_note: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

    plan: Mapped[WeeklyPlan] = relationship(back_populates="items", foreign_keys=[plan_id])
    subject: Mapped[Subject | None] = relationship()
    unit: Mapped[Unit | None] = relationship()
    rollover_from_item: Mapped["WeeklyPlanItem | None"] = relationship(remote_side=[id])


class WeeklyPlanReflection(Base):
    __tablename__ = "weekly_plan_reflections"

    id: Mapped[int] = mapped_column(primary_key=True)
    plan_id: Mapped[int] = mapped_column(ForeignKey("weekly_plans.id"), index=True)
    weekly_plan_id: Mapped[int | None] = mapped_column(ForeignKey("weekly_plans.id"))
    student_profile_id: Mapped[int | None] = mapped_column(ForeignKey("student_profiles.id"))
    reflection_type: Mapped[str] = mapped_column(String(30), default="weekly")
    wins_text: Mapped[str | None] = mapped_column(Text)
    blocker_text: Mapped[str | None] = mapped_column(Text)
    good: Mapped[str | None] = mapped_column(Text)
    blocked: Mapped[str | None] = mapped_column(Text)
    failure_reason: Mapped[str | None] = mapped_column(Text)
    adjustment_note: Mapped[str | None] = mapped_column(Text)
    next_adjustment: Mapped[str | None] = mapped_column(Text)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    instructor_comment: Mapped[str | None] = mapped_column(Text)
    used_in_replan: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    plan: Mapped[WeeklyPlan] = relationship(back_populates="reflections", foreign_keys=[plan_id])
    student_profile: Mapped[StudentProfile | None] = relationship()


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
