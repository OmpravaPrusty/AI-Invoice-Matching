"""add user roles

Revision ID: 20260907_user_roles
Revises: 20260905_comparison_run_number
"""

from alembic import op
import sqlalchemy as sa


revision = "20260907_user_roles"
down_revision = "20260905_comparison_run_number"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("role", sa.String(), nullable=False, server_default="user"),
    )
    op.alter_column("users", "role", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "role")