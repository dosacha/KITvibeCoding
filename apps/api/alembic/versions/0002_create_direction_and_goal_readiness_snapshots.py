from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0002_direction_goal_snapshot"
down_revision = "0001_expand_profiles_and_habits"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "admission_direction_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_profile_id", sa.Integer(), sa.ForeignKey("student_profiles.id"), nullable=False),
        sa.Column("basis_goal_id", sa.Integer(), sa.ForeignKey("target_university_profiles.id"), nullable=True),
        sa.Column("direction", sa.String(length=40), nullable=False, server_default="undetermined"),
        sa.Column("susi_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("jeongsi_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0"),
        sa.Column("reasons_json", sa.JSON(), nullable=True),
        sa.Column("recommended_action", sa.Text(), nullable=True),
        sa.Column("calculated_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
    )
    op.create_index("ix_admission_direction_student_calculated", "admission_direction_snapshots", ["student_profile_id", "calculated_at"])

    op.create_table(
        "goal_readiness_snapshots",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("student_profile_id", sa.Integer(), sa.ForeignKey("student_profiles.id"), nullable=False),
        sa.Column("target_university_profile_id", sa.Integer(), sa.ForeignKey("target_university_profiles.id"), nullable=False),
        sa.Column("readiness_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("risk_band", sa.String(length=60), nullable=False, server_default="undetermined"),
        sa.Column("highest_leverage_subject_code", sa.String(length=20), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("calculated_at", sa.DateTime(), nullable=False, server_default=sa.func.current_timestamp()),
    )
    op.create_index("ix_goal_readiness_student_calculated", "goal_readiness_snapshots", ["student_profile_id", "calculated_at"])
    op.create_index("ix_goal_readiness_goal_calculated", "goal_readiness_snapshots", ["target_university_profile_id", "calculated_at"])

    op.create_table(
        "goal_gap_subject_details",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("snapshot_id", sa.Integer(), sa.ForeignKey("goal_readiness_snapshots.id"), nullable=False),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id"), nullable=True),
        sa.Column("subject_code", sa.String(length=20), nullable=False),
        sa.Column("subject_name", sa.String(length=60), nullable=False),
        sa.Column("current_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("target_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("gap_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("admission_weight", sa.Float(), nullable=False, server_default="0"),
        sa.Column("growth_potential", sa.Float(), nullable=False, server_default="0"),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0"),
        sa.Column("delta_vs_last", sa.Float(), nullable=True),
    )
    op.create_index("ix_goal_gap_subject_snapshot", "goal_gap_subject_details", ["snapshot_id"])


def downgrade() -> None:
    op.drop_index("ix_goal_gap_subject_snapshot", table_name="goal_gap_subject_details")
    op.drop_table("goal_gap_subject_details")
    op.drop_index("ix_goal_readiness_goal_calculated", table_name="goal_readiness_snapshots")
    op.drop_index("ix_goal_readiness_student_calculated", table_name="goal_readiness_snapshots")
    op.drop_table("goal_readiness_snapshots")
    op.drop_index("ix_admission_direction_student_calculated", table_name="admission_direction_snapshots")
    op.drop_table("admission_direction_snapshots")
