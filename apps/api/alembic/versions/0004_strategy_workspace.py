from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0004_strategy_workspace"
down_revision = "0003_diagnosis_recipe"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "student_strategy_workspaces",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_profile_id", sa.Integer(), sa.ForeignKey("student_profiles.id"), nullable=False),
        sa.Column("base_strategy_id", sa.Integer(), sa.ForeignKey("student_strategies.id"), nullable=True),
        sa.Column("source_strategy_id", sa.Integer(), sa.ForeignKey("student_strategies.id"), nullable=True),
        sa.Column("base_goal_id", sa.Integer(), sa.ForeignKey("target_university_profiles.id"), nullable=True),
        sa.Column("selected_variant", sa.String(length=30), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="draft"),
        sa.Column("version_no", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("weekly_total_hours", sa.Float(), nullable=True),
        sa.Column("weekday_hours", sa.Float(), nullable=True),
        sa.Column("weekend_hours", sa.Float(), nullable=True),
        sa.Column("overrides", sa.JSON(), nullable=True),
        sa.Column("override_payload_json", sa.JSON(), nullable=True),
        sa.Column("constraint_payload_json", sa.JSON(), nullable=True),
        sa.Column("student_note", sa.Text(), nullable=True),
        sa.Column("instructor_message", sa.Text(), nullable=True),
        sa.Column("instructor_private_note", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("last_reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("approved_strategy_id", sa.Integer(), sa.ForeignKey("student_strategies.id"), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("updated_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
    )
    op.create_index("ix_strategy_workspace_student_current", "student_strategy_workspaces", ["student_profile_id", "is_current", "updated_at"])

    op.add_column("strategy_reviews", sa.Column("workspace_id", sa.Integer(), sa.ForeignKey("student_strategy_workspaces.id"), nullable=True))
    op.add_column("strategy_reviews", sa.Column("review_scope", sa.String(length=40), nullable=True))
    op.add_column("strategy_reviews", sa.Column("student_visible_message", sa.Text(), nullable=True))
    op.add_column("strategy_reviews", sa.Column("instructor_private_note", sa.Text(), nullable=True))
    op.add_column("strategy_reviews", sa.Column("diff_summary_json", sa.JSON(), nullable=True))
    op.add_column("strategy_reviews", sa.Column("visible_to_student", sa.Boolean(), nullable=True))


def downgrade() -> None:
    op.drop_column("strategy_reviews", "visible_to_student")
    op.drop_column("strategy_reviews", "diff_summary_json")
    op.drop_column("strategy_reviews", "instructor_private_note")
    op.drop_column("strategy_reviews", "student_visible_message")
    op.drop_column("strategy_reviews", "review_scope")
    op.drop_column("strategy_reviews", "workspace_id")
    op.drop_index("ix_strategy_workspace_student_current", table_name="student_strategy_workspaces")
    op.drop_table("student_strategy_workspaces")
