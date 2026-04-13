from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0005_strategy_schema_v2"
down_revision = "0004_strategy_workspace"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("student_strategies") as batch_op:
        batch_op.add_column(sa.Column("plan_schema_version", sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column("source_goal_id", sa.Integer(), sa.ForeignKey("target_university_profiles.id", name="fk_student_strategies_source_goal_id"), nullable=True))
        batch_op.create_check_constraint("ck_student_strategy_plan_schema_version_positive", "plan_schema_version IS NULL OR plan_schema_version >= 1")
    op.execute("UPDATE student_strategies SET plan_schema_version = 2 WHERE plan_schema_version IS NULL")


def downgrade() -> None:
    with op.batch_alter_table("student_strategies") as batch_op:
        batch_op.drop_constraint("ck_student_strategy_plan_schema_version_positive", type_="check")
        batch_op.drop_column("source_goal_id")
        batch_op.drop_column("plan_schema_version")
