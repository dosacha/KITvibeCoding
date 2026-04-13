from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0008_harden_after_backfill"
down_revision = "0007_indexes_recalc"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("UPDATE student_strategies SET plan_schema_version = 2 WHERE plan_schema_version IS NULL")
    with op.batch_alter_table("student_strategies") as batch_op:
        batch_op.alter_column(
            "plan_schema_version",
            existing_type=sa.Integer(),
            nullable=False,
            server_default="2",
        )

    op.create_index(
        "uq_strategy_workspace_current_student",
        "student_strategy_workspaces",
        ["student_profile_id"],
        unique=True,
        sqlite_where=sa.text("is_current = 1"),
        postgresql_where=sa.text("is_current = true"),
    )


def downgrade() -> None:
    op.drop_index("uq_strategy_workspace_current_student", table_name="student_strategy_workspaces")
    with op.batch_alter_table("student_strategies") as batch_op:
        batch_op.alter_column(
            "plan_schema_version",
            existing_type=sa.Integer(),
            nullable=True,
            server_default=None,
        )
