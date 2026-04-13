from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0003_extend_diag"
down_revision = "0002_direction_goal_snapshots"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("student_diagnoses") as batch_op:
        batch_op.add_column(sa.Column("admission_direction_snapshot_id", sa.Integer(), sa.ForeignKey("admission_direction_snapshots.id", name="fk_student_diagnoses_admission_direction_snapshot_id"), nullable=True))
        batch_op.add_column(sa.Column("goal_readiness_snapshot_id", sa.Integer(), sa.ForeignKey("goal_readiness_snapshots.id", name="fk_student_diagnoses_goal_readiness_snapshot_id"), nullable=True))
        batch_op.add_column(sa.Column("confidence_level", sa.String(length=20), nullable=True))
        batch_op.add_column(sa.Column("coaching_summary", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("low_confidence_reason_json", sa.JSON(), nullable=True))
        batch_op.create_index("ix_student_diagnosis_student_computed", ["student_profile_id", "computed_at"])

    op.create_table(
        "diagnosis_signals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("diagnosis_id", sa.Integer(), sa.ForeignKey("student_diagnoses.id"), nullable=False),
        sa.Column("signal_group", sa.String(length=60), nullable=False),
        sa.Column("signal_code", sa.String(length=80), nullable=False),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id"), nullable=True),
        sa.Column("unit_id", sa.Integer(), sa.ForeignKey("units.id"), nullable=True),
        sa.Column("metric_key", sa.String(length=80), nullable=True),
        sa.Column("numeric_value", sa.Float(), nullable=True),
        sa.Column("text_value", sa.Text(), nullable=True),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("importance_rank", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_index("ix_diagnosis_signal_diagnosis", "diagnosis_signals", ["diagnosis_id"])

    op.create_table(
        "study_recipe_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("weakness_type", sa.String(length=40), nullable=False),
        sa.Column("subject_id", sa.Integer(), sa.ForeignKey("subjects.id"), nullable=True),
        sa.Column("unit_id", sa.Integer(), sa.ForeignKey("units.id"), nullable=True),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("recommended_methods_json", sa.JSON(), nullable=True),
        sa.Column("anti_patterns_json", sa.JSON(), nullable=True),
        sa.Column("session_length_minutes", sa.Integer(), nullable=False, server_default="35"),
        sa.Column("checkpoints_json", sa.JSON(), nullable=True),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_index("ix_study_recipe_weakness_type", "study_recipe_templates", ["weakness_type"])


def downgrade() -> None:
    op.drop_index("ix_study_recipe_weakness_type", table_name="study_recipe_templates")
    op.drop_table("study_recipe_templates")
    op.drop_index("ix_diagnosis_signal_diagnosis", table_name="diagnosis_signals")
    op.drop_table("diagnosis_signals")
    with op.batch_alter_table("student_diagnoses") as batch_op:
        batch_op.drop_index("ix_student_diagnosis_student_computed")
        batch_op.drop_column("low_confidence_reason_json")
        batch_op.drop_column("coaching_summary")
        batch_op.drop_column("confidence_level")
        batch_op.drop_column("goal_readiness_snapshot_id")
        batch_op.drop_column("admission_direction_snapshot_id")
