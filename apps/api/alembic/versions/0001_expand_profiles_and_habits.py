from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_expand_profiles_and_habits"
down_revision = "0000_baseline_current_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("student_profiles") as batch_op:
        batch_op.add_column(sa.Column("weekday_available_hours", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("weekend_available_hours", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("preferred_study_window", sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column("student_goal_note", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("last_self_updated_at", sa.DateTime(), nullable=True))
        batch_op.create_check_constraint("ck_student_weekday_available_hours_non_negative", "weekday_available_hours IS NULL OR weekday_available_hours >= 0")
        batch_op.create_check_constraint("ck_student_weekend_available_hours_non_negative", "weekend_available_hours IS NULL OR weekend_available_hours >= 0")

    with op.batch_alter_table("learning_habit_snapshots") as batch_op:
        batch_op.add_column(sa.Column("preferred_session_minutes", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("preferred_study_slot", sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column("self_reported_obstacles_json", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("planner_followthrough_score", sa.Float(), nullable=True))
        batch_op.add_column(sa.Column("last_reflection_excerpt", sa.Text(), nullable=True))
        batch_op.create_check_constraint("ck_habit_preferred_session_minutes_non_negative", "preferred_session_minutes IS NULL OR preferred_session_minutes >= 0")
        batch_op.create_check_constraint("ck_habit_planner_followthrough_range", "planner_followthrough_score IS NULL OR (planner_followthrough_score >= 0 AND planner_followthrough_score <= 100)")


def downgrade() -> None:
    with op.batch_alter_table("learning_habit_snapshots") as batch_op:
        batch_op.drop_constraint("ck_habit_planner_followthrough_range", type_="check")
        batch_op.drop_constraint("ck_habit_preferred_session_minutes_non_negative", type_="check")
        batch_op.drop_column("last_reflection_excerpt")
        batch_op.drop_column("planner_followthrough_score")
        batch_op.drop_column("self_reported_obstacles_json")
        batch_op.drop_column("preferred_study_slot")
        batch_op.drop_column("preferred_session_minutes")

    with op.batch_alter_table("student_profiles") as batch_op:
        batch_op.drop_constraint("ck_student_weekend_available_hours_non_negative", type_="check")
        batch_op.drop_constraint("ck_student_weekday_available_hours_non_negative", type_="check")
        batch_op.drop_column("last_self_updated_at")
        batch_op.drop_column("student_goal_note")
        batch_op.drop_column("preferred_study_window")
        batch_op.drop_column("weekend_available_hours")
        batch_op.drop_column("weekday_available_hours")
