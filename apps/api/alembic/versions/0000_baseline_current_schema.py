from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0000_baseline_current_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "academies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("academy_id", sa.Integer(), sa.ForeignKey("academies.id"), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("preferred_subject_ids", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_role", "users", ["role"])

    op.create_table(
        "class_groups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("academy_id", sa.Integer(), sa.ForeignKey("academies.id"), nullable=False),
        sa.Column("instructor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("grade_level", sa.String(length=30), nullable=False),
    )

    op.create_table(
        "subjects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("academy_id", sa.Integer(), sa.ForeignKey("academies.id"), nullable=True),
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("code", sa.String(length=20), nullable=False),
        sa.UniqueConstraint("code"),
    )

    op.create_table(
        "units",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("prerequisite_unit_id", sa.Integer(), sa.ForeignKey("units.id"), nullable=True),
        sa.UniqueConstraint("code"),
    )

    op.create_table(
        "student_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("class_group_id", sa.Integer(), sa.ForeignKey("class_groups.id"), nullable=True),
        sa.Column("grade_level", sa.String(length=30), nullable=False),
        sa.Column("enrollment_status", sa.String(length=30), nullable=False, server_default="active"),
        sa.Column("weekly_available_hours", sa.Float(), nullable=False, server_default="12"),
        sa.Column("preferred_subjects", sa.JSON(), nullable=True),
        sa.Column("disliked_subjects", sa.JSON(), nullable=True),
        sa.Column("learning_style_preferences", sa.JSON(), nullable=True),
        sa.Column("study_style_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.CheckConstraint("weekly_available_hours >= 0", name="ck_student_weekly_available_hours_non_negative"),
        sa.UniqueConstraint("user_id"),
    )

    op.create_table(
        "learning_habit_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_profile_id", sa.Integer(), sa.ForeignKey("student_profiles.id"), nullable=False),
        sa.Column("captured_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("recent_learning_mode", sa.String(length=60), nullable=False, server_default="mixed"),
        sa.Column("self_study_ratio", sa.Float(), nullable=False, server_default="0.25"),
        sa.Column("lecture_ratio", sa.Float(), nullable=False, server_default="0.25"),
        sa.Column("error_note_ratio", sa.Float(), nullable=False, server_default="0.25"),
        sa.Column("problem_solving_ratio", sa.Float(), nullable=False, server_default="0.25"),
        sa.Column("review_habit_score", sa.Float(), nullable=False, server_default="50"),
        sa.Column("consistency_score", sa.Float(), nullable=False, server_default="50"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.CheckConstraint("self_study_ratio >= 0 AND self_study_ratio <= 1", name="ck_habit_self_study_ratio_range"),
        sa.CheckConstraint("lecture_ratio >= 0 AND lecture_ratio <= 1", name="ck_habit_lecture_ratio_range"),
        sa.CheckConstraint("error_note_ratio >= 0 AND error_note_ratio <= 1", name="ck_habit_error_note_ratio_range"),
        sa.CheckConstraint("problem_solving_ratio >= 0 AND problem_solving_ratio <= 1", name="ck_habit_problem_solving_ratio_range"),
        sa.CheckConstraint("review_habit_score >= 0 AND review_habit_score <= 100", name="ck_habit_review_score_range"),
        sa.CheckConstraint("consistency_score >= 0 AND consistency_score <= 100", name="ck_habit_consistency_score_range"),
    )

    op.create_table(
        "university_score_policies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("academic_year", sa.Integer(), nullable=False),
        sa.Column("university_name", sa.String(length=120), nullable=False),
        sa.Column("admission_type", sa.String(length=60), nullable=False),
        sa.Column("subject_weights", sa.JSON(), nullable=True),
        sa.Column("required_subjects", sa.JSON(), nullable=True),
        sa.Column("bonus_rules", sa.JSON(), nullable=True),
        sa.Column("grade_conversion_rules", sa.JSON(), nullable=True),
        sa.Column("target_score", sa.Float(), nullable=False, server_default="85"),
        sa.Column("notes", sa.Text(), nullable=True),
    )
    op.create_index("ix_university_score_policies_university_name", "university_score_policies", ["university_name"])

    op.create_table(
        "target_university_profiles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_profile_id", sa.Integer(), sa.ForeignKey("student_profiles.id"), nullable=False),
        sa.Column("policy_id", sa.Integer(), sa.ForeignKey("university_score_policies.id"), nullable=False),
        sa.Column("target_department", sa.String(length=120), nullable=False),
        sa.Column("priority_order", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
    )

    op.create_table(
        "exams",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("academy_id", sa.Integer(), sa.ForeignKey("academies.id"), nullable=False),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("class_group_id", sa.Integer(), sa.ForeignKey("class_groups.id"), nullable=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("exam_date", sa.Date(), nullable=False),
        sa.Column("total_score", sa.Float(), nullable=False),
        sa.Column("time_limit_minutes", sa.Integer(), nullable=False, server_default="60"),
        sa.Column("is_retake", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    op.create_table(
        "questions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("number", sa.Integer(), nullable=False),
        sa.Column("teacher_difficulty", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("answer_key", sa.String(length=30), nullable=True),
        sa.Column("points", sa.Float(), nullable=False),
        sa.Column("question_type", sa.String(length=60), nullable=False),
        sa.Column("problem_style", sa.String(length=60), nullable=False, server_default="mixed"),
        sa.Column("estimated_seconds", sa.Integer(), nullable=False, server_default="90"),
        sa.UniqueConstraint("exam_id", "number", name="uq_question_exam_number"),
    )

    op.create_table(
        "question_unit_mappings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("questions.id"), nullable=False),
        sa.Column("unit_id", sa.Integer(), sa.ForeignKey("units.id"), nullable=False),
        sa.Column("weight", sa.Float(), nullable=False, server_default="1"),
    )

    op.create_table(
        "student_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_profile_id", sa.Integer(), sa.ForeignKey("student_profiles.id"), nullable=False),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("raw_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("percentile", sa.Float(), nullable=True),
        sa.Column("grade", sa.Integer(), nullable=True),
        sa.Column("completed_in_seconds", sa.Integer(), nullable=True),
        sa.Column("result_status", sa.String(length=30), nullable=False, server_default="submitted"),
        sa.Column("question_breakdown", sa.JSON(), nullable=True),
        sa.Column("result_metadata", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.CheckConstraint("raw_score >= 0", name="ck_student_result_raw_score_non_negative"),
        sa.CheckConstraint("percentile IS NULL OR (percentile >= 0 AND percentile <= 100)", name="ck_student_result_percentile_range"),
        sa.UniqueConstraint("student_profile_id", "exam_id", name="uq_student_exam_result"),
    )

    op.create_table(
        "student_question_responses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_result_id", sa.Integer(), sa.ForeignKey("student_results.id"), nullable=False),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("questions.id"), nullable=False),
        sa.Column("selected_answer", sa.String(length=30), nullable=True),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.Column("response_status", sa.String(length=30), nullable=False, server_default="submitted"),
        sa.Column("time_spent_seconds", sa.Integer(), nullable=True),
        sa.UniqueConstraint("student_result_id", "question_id", name="uq_result_question_response"),
    )

    op.create_table(
        "question_statistics_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("questions.id"), nullable=False),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id"), nullable=False),
        sa.Column("snapshot_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("error_rate", sa.Float(), nullable=False, server_default="0"),
        sa.Column("valid_response_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("empirical_difficulty", sa.Float(), nullable=False, server_default="1"),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0"),
        sa.Column("final_difficulty", sa.Float(), nullable=False, server_default="1"),
    )

    op.create_table(
        "unit_mastery_current",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_profile_id", sa.Integer(), sa.ForeignKey("student_profiles.id"), nullable=False),
        sa.Column("unit_id", sa.Integer(), sa.ForeignKey("units.id"), nullable=False),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("mastery_current", sa.Float(), nullable=False, server_default="0"),
        sa.Column("recent_mastery", sa.Float(), nullable=False, server_default="0"),
        sa.Column("effective_mastery", sa.Float(), nullable=False, server_default="0"),
        sa.Column("unit_confidence", sa.Float(), nullable=False, server_default="0"),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_exam_date", sa.Date(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("student_profile_id", "unit_id", name="uq_student_unit_mastery_current"),
    )

    op.create_table(
        "unit_mastery_history",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_profile_id", sa.Integer(), sa.ForeignKey("student_profiles.id"), nullable=False),
        sa.Column("unit_id", sa.Integer(), sa.ForeignKey("units.id"), nullable=False),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id"), nullable=False),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.id"), nullable=True),
        sa.Column("snapshot_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("mastery_current", sa.Float(), nullable=False, server_default="0"),
        sa.Column("recent_mastery", sa.Float(), nullable=False, server_default="0"),
        sa.Column("effective_mastery", sa.Float(), nullable=False, server_default="0"),
        sa.Column("unit_confidence", sa.Float(), nullable=False, server_default="0"),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "student_diagnoses",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_profile_id", sa.Integer(), sa.ForeignKey("student_profiles.id"), nullable=False),
        sa.Column("computed_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("primary_weakness_type", sa.String(length=40), nullable=False),
        sa.Column("weakness_scores", sa.JSON(), nullable=True),
        sa.Column("weak_subjects", sa.JSON(), nullable=True),
        sa.Column("weak_units", sa.JSON(), nullable=True),
        sa.Column("evidence", sa.JSON(), nullable=True),
        sa.Column("feature_snapshot", sa.JSON(), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("low_confidence_flag", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("coaching_message", sa.Text(), nullable=False),
        sa.Column("instructor_summary", sa.Text(), nullable=False),
        sa.CheckConstraint("confidence_score >= 0 AND confidence_score <= 1", name="ck_student_diagnosis_confidence_range"),
    )

    op.create_table(
        "student_strategies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_profile_id", sa.Integer(), sa.ForeignKey("student_profiles.id"), nullable=False),
        sa.Column("diagnosis_id", sa.Integer(), sa.ForeignKey("student_diagnoses.id"), nullable=True),
        sa.Column("goal_id", sa.Integer(), sa.ForeignKey("target_university_profiles.id"), nullable=True),
        sa.Column("variant", sa.String(length=30), nullable=False, server_default="basic"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="pending_review"),
        sa.Column("structured_plan", sa.JSON(), nullable=True),
        sa.Column("natural_language_summary", sa.Text(), nullable=False),
        sa.Column("rationale", sa.JSON(), nullable=True),
        sa.Column("risk_factors", sa.JSON(), nullable=True),
        sa.Column("instructor_explanation", sa.Text(), nullable=False),
        sa.Column("student_coaching", sa.Text(), nullable=False),
        sa.Column("generated_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
    )

    op.create_table(
        "strategy_reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("strategy_id", sa.Integer(), sa.ForeignKey("student_strategies.id"), nullable=False),
        sa.Column("reviewer_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("decision", sa.String(length=30), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("diff", sa.JSON(), nullable=True),
        sa.Column("edited_plan", sa.JSON(), nullable=True),
        sa.Column("edited_summary", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
    )

    op.create_table(
        "change_histories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("field_name", sa.String(length=80), nullable=False),
        sa.Column("old_value", sa.Text(), nullable=True),
        sa.Column("new_value", sa.Text(), nullable=True),
        sa.Column("changed_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("changed_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
    )

    op.create_table(
        "recalculation_jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("trigger", sa.String(length=40), nullable=False),
        sa.Column("scope", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="queued"),
        sa.Column("requested_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("executed_at", sa.DateTime(), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("recalculation_jobs")
    op.drop_table("change_histories")
    op.drop_table("audit_logs")
    op.drop_table("strategy_reviews")
    op.drop_table("student_strategies")
    op.drop_table("student_diagnoses")
    op.drop_table("unit_mastery_history")
    op.drop_table("unit_mastery_current")
    op.drop_table("question_statistics_snapshots")
    op.drop_table("student_question_responses")
    op.drop_table("student_results")
    op.drop_table("question_unit_mappings")
    op.drop_table("questions")
    op.drop_table("exams")
    op.drop_table("target_university_profiles")
    op.drop_index("ix_university_score_policies_university_name", table_name="university_score_policies")
    op.drop_table("university_score_policies")
    op.drop_table("learning_habit_snapshots")
    op.drop_table("student_profiles")
    op.drop_table("units")
    op.drop_table("subjects")
    op.drop_table("class_groups")
    op.drop_index("ix_users_role", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.drop_table("academies")
