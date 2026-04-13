from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0005_strategy_schema_v2"
down_revision = "0004_strategy_workspace"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("student_strategies", sa.Column("plan_schema_version", sa.Integer(), nullable=True))
    op.add_column("student_strategies", sa.Column("source_goal_id", sa.Integer(), sa.ForeignKey("target_university_profiles.id"), nullable=True))
    op.execute("UPDATE student_strategies SET plan_schema_version = 2 WHERE plan_schema_version IS NULL")


def downgrade() -> None:
    op.drop_column("student_strategies", "source_goal_id")
    op.drop_column("student_strategies", "plan_schema_version")
