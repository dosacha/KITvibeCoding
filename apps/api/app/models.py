from __future__ import annotations

from datetime import date, datetime
from enum import Enum

from sqlalchemy import Boolean, Date, DateTime, Enum as SqlEnum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


JSONType = SQLiteJSON


class Role(str, Enum):
    ADMIN = "admin"
    INSTRUCTOR = "instructor"
    STUDENT = "student"


class WeaknessType(str, Enum):
    CONCEPT_GAP = "concept_gap"
    CALCULATION_MISTAKE = "calculation_mistake"
    TIME_PRESSURE = "time_pressure"
    PREREQUISITE_GAP = "prerequisite_gap"
    TYPE_BIAS = "type_bias"
    HIGH_VARIABILITY = "high_variability"


class StrategyStatus(str, Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"


class Academy(Base):
    __tablename__ = "academies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    class_groups: Mapped[list["ClassGroup"]] = relationship(back_populates="academy")
    users: Mapped[list["User"]] = relationship(back_populates="academy")
    subjects: Mapped[list["Subject"]] = relationship(back_populates="academy")
    exams: Mapped[list["Exam"]] = relationship(back_populates="academy")


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
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    academy: Mapped[Academy | None] = relationship(back_populates="users")
    student_profile: Mapped["StudentProfile | None"] = relationship(back_populates="user", uselist=False)


class ClassGroup(Base):
    __tablename__ = "class_groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    academy_id: Mapped[int] = mapped_column(ForeignKey("academies.id"))
    instructor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(120))
    grade_level: Mapped[str] = mapped_column(String(30))

    academy: Mapped[Academy] = relationship(back_populates="class_groups")


class Subject(Base):
    __tablename__ = "subjects"

    id: Mapped[int] = mapped_column(primary_key=True)
    academy_id: Mapped[int | None] = mapped_column(ForeignKey("academies.id"))
    name: Mapped[str] = mapped_column(String(60))
    code: Mapped[str] = mapped_column(String(20), unique=True)

    academy: Mapped[Academy | None] = relationship(back_populates="subjects")
    units: Mapped[list["Unit"]] = relationship(back_populates="subject")


class Unit(Base):
    __tablename__ = "units"

    id: Mapped[int] = mapped_column(primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    name: Mapped[str] = mapped_column(String(120))
    code: Mapped[str] = mapped_column(String(40), unique=True)
    prerequisite_unit_id: Mapped[int | None] = mapped_column(ForeignKey("units.id"))

    subject: Mapped[Subject] = relationship(back_populates="units")


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    class_group_id: Mapped[int | None] = mapped_column(ForeignKey("class_groups.id"))
    target_university_profile_id: Mapped[int | None] = mapped_column(ForeignKey("target_university_profiles.id"))
    grade_level: Mapped[str] = mapped_column(String(30))
    study_style_notes: Mapped[str | None] = mapped_column(Text)

    user: Mapped[User] = relationship(back_populates="student_profile")
    results: Mapped[list["StudentResult"]] = relationship(back_populates="student_profile")
    diagnoses: Mapped[list["StudentDiagnosis"]] = relationship(back_populates="student_profile")
    strategies: Mapped[list["StudentStrategy"]] = relationship(back_populates="student_profile")


class Exam(Base):
    __tablename__ = "exams"

    id: Mapped[int] = mapped_column(primary_key=True)
    academy_id: Mapped[int] = mapped_column(ForeignKey("academies.id"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    name: Mapped[str] = mapped_column(String(120))
    exam_date: Mapped[date] = mapped_column(Date)
    total_score: Mapped[float] = mapped_column(Float)

    academy: Mapped[Academy] = relationship(back_populates="exams")
    questions: Mapped[list["Question"]] = relationship(back_populates="exam")


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id"))
    number: Mapped[int] = mapped_column(Integer)
    difficulty: Mapped[int] = mapped_column(Integer)
    points: Mapped[float] = mapped_column(Float)
    question_type: Mapped[str] = mapped_column(String(60))
    estimated_seconds: Mapped[int] = mapped_column(Integer, default=90)

    exam: Mapped[Exam] = relationship(back_populates="questions")
    unit_mappings: Mapped[list["QuestionUnitMapping"]] = relationship(back_populates="question")


class QuestionUnitMapping(Base):
    __tablename__ = "question_unit_mappings"

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id"))
    unit_id: Mapped[int] = mapped_column(ForeignKey("units.id"))
    weight: Mapped[float] = mapped_column(Float, default=1.0)

    question: Mapped[Question] = relationship(back_populates="unit_mappings")


class StudentResult(Base):
    __tablename__ = "student_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id"))
    exam_id: Mapped[int] = mapped_column(ForeignKey("exams.id"))
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id"))
    raw_score: Mapped[float] = mapped_column(Float)
    percentile: Mapped[float | None] = mapped_column(Float)
    grade: Mapped[int | None] = mapped_column(Integer)
    completed_in_seconds: Mapped[int | None] = mapped_column(Integer)
    question_breakdown: Mapped[dict] = mapped_column(JSONType, default=dict)
    result_metadata: Mapped[dict] = mapped_column(JSONType, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    student_profile: Mapped[StudentProfile] = relationship(back_populates="results")


class UniversityScorePolicy(Base):
    __tablename__ = "university_score_policies"

    id: Mapped[int] = mapped_column(primary_key=True)
    university_name: Mapped[str] = mapped_column(String(120))
    admission_type: Mapped[str] = mapped_column(String(60))
    subject_weights: Mapped[dict] = mapped_column(JSONType, default=dict)
    required_subjects: Mapped[list[str]] = mapped_column(JSONType, default=list)
    bonus_rules: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    grade_conversion_rules: Mapped[dict] = mapped_column(JSONType, default=dict)
    target_score: Mapped[float] = mapped_column(Float, default=85.0)
    notes: Mapped[str | None] = mapped_column(Text)


class TargetUniversityProfile(Base):
    __tablename__ = "target_university_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int | None] = mapped_column(ForeignKey("student_profiles.id"))
    policy_id: Mapped[int] = mapped_column(ForeignKey("university_score_policies.id"))
    target_department: Mapped[str] = mapped_column(String(120))
    priority_order: Mapped[int] = mapped_column(Integer, default=1)


class StudentDiagnosis(Base):
    __tablename__ = "student_diagnoses"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id"))
    computed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    primary_weakness_type: Mapped[WeaknessType] = mapped_column(SqlEnum(WeaknessType))
    weakness_scores: Mapped[dict] = mapped_column(JSONType, default=dict)
    weak_subjects: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    weak_units: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    evidence: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    feature_snapshot: Mapped[dict] = mapped_column(JSONType, default=dict)

    student_profile: Mapped[StudentProfile] = relationship(back_populates="diagnoses")


class StudentStrategy(Base):
    __tablename__ = "student_strategies"

    id: Mapped[int] = mapped_column(primary_key=True)
    student_profile_id: Mapped[int] = mapped_column(ForeignKey("student_profiles.id"))
    diagnosis_id: Mapped[int | None] = mapped_column(ForeignKey("student_diagnoses.id"))
    status: Mapped[StrategyStatus] = mapped_column(SqlEnum(StrategyStatus), default=StrategyStatus.ACTIVE)
    structured_plan: Mapped[dict] = mapped_column(JSONType, default=dict)
    natural_language_summary: Mapped[str] = mapped_column(Text)
    rationale: Mapped[list[dict]] = mapped_column(JSONType, default=list)
    generated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    student_profile: Mapped[StudentProfile] = relationship(back_populates="strategies")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    entity_type: Mapped[str] = mapped_column(String(80))
    entity_id: Mapped[int | None] = mapped_column(Integer)
    action: Mapped[str] = mapped_column(String(80))
    payload: Mapped[dict] = mapped_column(JSONType, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ChangeHistory(Base):
    __tablename__ = "change_histories"

    id: Mapped[int] = mapped_column(primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(80))
    entity_id: Mapped[int] = mapped_column(Integer)
    field_name: Mapped[str] = mapped_column(String(80))
    old_value: Mapped[str | None] = mapped_column(Text)
    new_value: Mapped[str | None] = mapped_column(Text)
    changed_by_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

