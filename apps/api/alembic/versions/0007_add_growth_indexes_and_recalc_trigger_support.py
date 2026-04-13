from __future__ import annotations

from alembic import op


revision = "0007_indexes_recalc"
down_revision = "0006_weekly_planner"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("ix_student_result_student_created", "student_results", ["student_profile_id", "created_at"])
    op.create_index("ix_unit_mastery_history_student_snapshot", "unit_mastery_history", ["student_profile_id", "snapshot_at"])


def downgrade() -> None:
    op.drop_index("ix_unit_mastery_history_student_snapshot", table_name="unit_mastery_history")
    op.drop_index("ix_student_result_student_created", table_name="student_results")
