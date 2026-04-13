from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0006_weekly_planner"
down_revision = "0005_strategy_schema_v2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "weekly_plans",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_profile_id", sa.Integer(), sa.ForeignKey("student_profiles.id"), nullable=False),
        sa.Column("source_strategy_id", sa.Integer(), sa.ForeignKey("student_strategies.id"), nullable=True),
        sa.Column("workspace_id", sa.Integer(), sa.ForeignKey("student_strategy_workspaces.id"), nullable=True),
        sa.Column("week_start", sa.Date(), nullable=False),
        sa.Column("week_end", sa.Date(), nullable=True),
        sa.Column("generation_source", sa.String(length=40), nullable=False, server_default="approved_strategy"),
        sa.Column("planned_total_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed_total_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completion_rate_cached", sa.Float(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="active"),
        sa.Column("carry_over_summary_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.UniqueConstraint("student_profile_id", "week_start", name="uq_student_weekly_plan"),
    )
    op.create_index("ix_weekly_plan_student_week", "weekly_plans", ["student_profile_id", "week_start"])

    op.create_table(
        "weekly_plan_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("plan_id", sa.Integer(), sa.ForeignKey("weekly_plans.id"), nullable=False),
        sa.Column("weekly_plan_id", sa.Integer(), sa.ForeignKey("weekly_plans.id"), nullable=True),
        sa.Column("day_of_week", sa.String(length=10), nullable=True),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id"), nullable=True),
        sa.Column("subject_code", sa.String(length=20), nullable=False),
        sa.Column("subject_name", sa.String(length=60), nullable=False),
        sa.Column("unit_id", sa.Integer(), sa.ForeignKey("units.id"), nullable=True),
        sa.Column("unit_name", sa.String(length=120), nullable=True),
        sa.Column("task_type", sa.String(length=40), nullable=False, server_default="study"),
        sa.Column("title", sa.String(length=160), nullable=True),
        sa.Column("instruction", sa.Text(), nullable=True),
        sa.Column("planned_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("completed_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=30), nullable=False, server_default="planned"),
        sa.Column("day_bucket", sa.String(length=20), nullable=False, server_default="weekday"),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("priority_order", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("rollover_allowed", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("rollover_from_item_id", sa.Integer(), sa.ForeignKey("weekly_plan_items.id"), nullable=True),
        sa.Column("generated_from_signal_code", sa.String(length=80), nullable=True),
        sa.Column("is_checked", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("student_note", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
    )
    op.create_index("ix_weekly_plan_item_plan_day_priority", "weekly_plan_items", ["plan_id", "day_of_week", "priority_order"])

    op.create_table(
        "weekly_plan_reflections",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("plan_id", sa.Integer(), sa.ForeignKey("weekly_plans.id"), nullable=False),
        sa.Column("weekly_plan_id", sa.Integer(), sa.ForeignKey("weekly_plans.id"), nullable=True),
        sa.Column("student_profile_id", sa.Integer(), sa.ForeignKey("student_profiles.id"), nullable=True),
        sa.Column("reflection_type", sa.String(length=30), nullable=False, server_default="weekly"),
        sa.Column("wins_text", sa.Text(), nullable=True),
        sa.Column("blocker_text", sa.Text(), nullable=True),
        sa.Column("good", sa.Text(), nullable=True),
        sa.Column("blocked", sa.Text(), nullable=True),
        sa.Column("failure_reason", sa.Text(), nullable=True),
        sa.Column("adjustment_note", sa.Text(), nullable=True),
        sa.Column("next_adjustment", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
        sa.Column("instructor_comment", sa.Text(), nullable=True),
        sa.Column("used_in_replan", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
    )


def downgrade() -> None:
    op.drop_table("weekly_plan_reflections")
    op.drop_index("ix_weekly_plan_item_plan_day_priority", table_name="weekly_plan_items")
    op.drop_table("weekly_plan_items")
    op.drop_index("ix_weekly_plan_student_week", table_name="weekly_plans")
    op.drop_table("weekly_plans")
