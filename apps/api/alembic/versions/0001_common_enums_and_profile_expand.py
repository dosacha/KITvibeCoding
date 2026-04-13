from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0001_profile_expand"
down_revision = "0000_baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("student_profiles", sa.Column("weekday_available_hours", sa.Float(), nullable=True))
    op.add_column("student_profiles", sa.Column("weekend_available_hours", sa.Float(), nullable=True))
    op.add_column("student_profiles", sa.Column("preferred_study_window", sa.String(length=30), nullable=True))
    op.add_column("student_profiles", sa.Column("student_goal_note", sa.Text(), nullable=True))
    op.add_column("student_profiles", sa.Column("last_self_updated_at", sa.DateTime(), nullable=True))

    op.add_column("learning_habit_snapshots", sa.Column("preferred_session_minutes", sa.Integer(), nullable=True))
    op.add_column("learning_habit_snapshots", sa.Column("preferred_study_slot", sa.String(length=30), nullable=True))
    op.add_column("learning_habit_snapshots", sa.Column("self_reported_obstacles_json", sa.JSON(), nullable=True))
    op.add_column("learning_habit_snapshots", sa.Column("planner_followthrough_score", sa.Float(), nullable=True))
    op.add_column("learning_habit_snapshots", sa.Column("last_reflection_excerpt", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("learning_habit_snapshots", "last_reflection_excerpt")
    op.drop_column("learning_habit_snapshots", "planner_followthrough_score")
    op.drop_column("learning_habit_snapshots", "self_reported_obstacles_json")
    op.drop_column("learning_habit_snapshots", "preferred_study_slot")
    op.drop_column("learning_habit_snapshots", "preferred_session_minutes")

    op.drop_column("student_profiles", "last_self_updated_at")
    op.drop_column("student_profiles", "student_goal_note")
    op.drop_column("student_profiles", "preferred_study_window")
    op.drop_column("student_profiles", "weekend_available_hours")
    op.drop_column("student_profiles", "weekday_available_hours")
