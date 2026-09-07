"""Add repeat-run tracking to the existing comparisons table.

Revision ID: 20260905_comparison_run_number
Revises: 20260905_document_hashes
"""

from alembic import op
import sqlalchemy as sa

revision = "20260905_comparison_run_number"
down_revision = "20260905_document_hashes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("comparisons", sa.Column("run_number", sa.Integer(), nullable=False, server_default="1"))


def downgrade() -> None:
    op.drop_column("comparisons", "run_number")
