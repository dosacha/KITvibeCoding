from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0004_strategy_workspace"
down_revision = "0003_extend_diag"
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

    with op.batch_alter_table("strategy_reviews") as batch_op:
        batch_op.add_column(sa.Column("workspace_id", sa.Integer(), sa.ForeignKey("student_strategy_workspaces.id", name="fk_strategy_reviews_workspace_id"), nullable=True))
        batch_op.add_column(sa.Column("review_scope", sa.String(length=40), nullable=True))
        batch_op.add_column(sa.Column("student_visible_message", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("instructor_private_note", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("diff_summary_json", sa.JSON(), nullable=True))
        batch_op.add_column(sa.Column("visible_to_student", sa.Boolean(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("strategy_reviews") as batch_op:
        batch_op.drop_column("visible_to_student")
        batch_op.drop_column("diff_summary_json")
        batch_op.drop_column("instructor_private_note")
        batch_op.drop_column("student_visible_message")
        batch_op.drop_column("review_scope")
        batch_op.drop_column("workspace_id")
    op.drop_index("ix_strategy_workspace_student_current", table_name="student_strategy_workspaces")
    op.drop_table("student_strategy_workspaces")
