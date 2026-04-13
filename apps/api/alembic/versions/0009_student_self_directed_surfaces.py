from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0009_student_self_directed_surfaces"
down_revision = "0008_harden_after_backfill"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "student_today_focus_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_profile_id", sa.Integer(), sa.ForeignKey("student_profiles.id"), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=30), nullable=False, server_default="student"),
        sa.Column("is_done", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("position", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_student_today_focus_items_student_profile_id", "student_today_focus_items", ["student_profile_id"])
    op.create_index(
        "ix_today_focus_student_active",
        "student_today_focus_items",
        ["student_profile_id", "is_active", "position"],
    )

    op.create_table(
        "strategy_conversation_threads",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_profile_id", sa.Integer(), sa.ForeignKey("student_profiles.id"), nullable=False),
        sa.Column("workspace_id", sa.Integer(), sa.ForeignKey("student_strategy_workspaces.id"), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("title", sa.String(length=160), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_strategy_conversation_threads_student_profile_id", "strategy_conversation_threads", ["student_profile_id"])
    op.create_index(
        "ix_strategy_thread_student_active",
        "strategy_conversation_threads",
        ["student_profile_id", "is_deleted", "updated_at"],
    )

    op.create_table(
        "strategy_conversation_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("thread_id", sa.Integer(), sa.ForeignKey("strategy_conversation_threads.id"), nullable=False),
        sa.Column("author_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("role", sa.String(length=30), nullable=False),
        sa.Column("recipient", sa.String(length=30), nullable=False, server_default="instructor"),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("source", sa.String(length=30), nullable=False, server_default="user"),
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_strategy_conversation_messages_thread_id", "strategy_conversation_messages", ["thread_id"])
    op.create_index(
        "ix_strategy_message_thread_created",
        "strategy_conversation_messages",
        ["thread_id", "created_at"],
    )

    op.create_table(
        "community_exams",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("created_by_student_profile_id", sa.Integer(), sa.ForeignKey("student_profiles.id"), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("subject_name", sa.String(length=80), nullable=False),
        sa.Column("source_kind", sa.String(length=40), nullable=False, server_default="other"),
        sa.Column("exam_date", sa.Date(), nullable=True),
        sa.Column("question_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("choice_count", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.CheckConstraint("question_count >= 1", name="ck_community_exam_question_count_positive"),
        sa.CheckConstraint("choice_count >= 2", name="ck_community_exam_choice_count_min"),
    )
    op.create_index("ix_community_exams_created_by_student_profile_id", "community_exams", ["created_by_student_profile_id"])
    op.create_index("ix_community_exams_title", "community_exams", ["title"])
    op.create_index("ix_community_exams_subject_name", "community_exams", ["subject_name"])
    op.create_index("ix_community_exam_subject_created", "community_exams", ["subject_name", "created_at"])

    op.create_table(
        "community_exam_questions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("community_exams.id"), nullable=False),
        sa.Column("question_number", sa.Integer(), nullable=False),
        sa.Column("answer_key", sa.String(length=20), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default="{}"),
        sa.CheckConstraint("question_number >= 1", name="ck_community_exam_question_number_positive"),
        sa.UniqueConstraint("exam_id", "question_number", name="uq_community_exam_question_number"),
    )
    op.create_index("ix_community_exam_questions_exam_id", "community_exam_questions", ["exam_id"])

    op.create_table(
        "community_exam_submissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("community_exams.id"), nullable=False),
        sa.Column("student_profile_id", sa.Integer(), sa.ForeignKey("student_profiles.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("exam_id", "student_profile_id", name="uq_community_exam_student_submission"),
    )
    op.create_index("ix_community_exam_submissions_exam_id", "community_exam_submissions", ["exam_id"])
    op.create_index("ix_community_exam_submissions_student_profile_id", "community_exam_submissions", ["student_profile_id"])
    op.create_index("ix_community_submission_exam_created", "community_exam_submissions", ["exam_id", "created_at"])

    op.create_table(
        "community_exam_answers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("submission_id", sa.Integer(), sa.ForeignKey("community_exam_submissions.id"), nullable=False),
        sa.Column("question_number", sa.Integer(), nullable=False),
        sa.Column("selected_choice", sa.String(length=20), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=True),
        sa.CheckConstraint("question_number >= 1", name="ck_community_answer_question_number_positive"),
        sa.UniqueConstraint("submission_id", "question_number", name="uq_community_submission_question"),
    )
    op.create_index("ix_community_exam_answers_submission_id", "community_exam_answers", ["submission_id"])


def downgrade() -> None:
    op.drop_index("ix_community_exam_answers_submission_id", table_name="community_exam_answers")
    op.drop_table("community_exam_answers")
    op.drop_index("ix_community_submission_exam_created", table_name="community_exam_submissions")
    op.drop_index("ix_community_exam_submissions_student_profile_id", table_name="community_exam_submissions")
    op.drop_index("ix_community_exam_submissions_exam_id", table_name="community_exam_submissions")
    op.drop_table("community_exam_submissions")
    op.drop_index("ix_community_exam_questions_exam_id", table_name="community_exam_questions")
    op.drop_table("community_exam_questions")
    op.drop_index("ix_community_exam_subject_created", table_name="community_exams")
    op.drop_index("ix_community_exams_subject_name", table_name="community_exams")
    op.drop_index("ix_community_exams_title", table_name="community_exams")
    op.drop_index("ix_community_exams_created_by_student_profile_id", table_name="community_exams")
    op.drop_table("community_exams")
    op.drop_index("ix_strategy_message_thread_created", table_name="strategy_conversation_messages")
    op.drop_index("ix_strategy_conversation_messages_thread_id", table_name="strategy_conversation_messages")
    op.drop_table("strategy_conversation_messages")
    op.drop_index("ix_strategy_thread_student_active", table_name="strategy_conversation_threads")
    op.drop_index("ix_strategy_conversation_threads_student_profile_id", table_name="strategy_conversation_threads")
    op.drop_table("strategy_conversation_threads")
    op.drop_index("ix_today_focus_student_active", table_name="student_today_focus_items")
    op.drop_index("ix_student_today_focus_items_student_profile_id", table_name="student_today_focus_items")
    op.drop_table("student_today_focus_items")
