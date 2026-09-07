"""Add document content hashes for repeat comparison saves.

Revision ID: 20260905_document_hashes
Revises: 20260903_deferred_comparison
"""

from alembic import op
import sqlalchemy as sa

revision = "20260905_document_hashes"
down_revision = "20260903_deferred_comparison"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("purchase_orders", sa.Column("file_hash", sa.String(length=64), nullable=True))
    op.create_index("ix_purchase_orders_file_hash", "purchase_orders", ["file_hash"])
    op.add_column("invoices", sa.Column("file_hash", sa.String(length=64), nullable=True))
    op.create_index("ix_invoices_file_hash", "invoices", ["file_hash"])


def downgrade() -> None:
    op.drop_index("ix_invoices_file_hash", table_name="invoices")
    op.drop_column("invoices", "file_hash")
    op.drop_index("ix_purchase_orders_file_hash", table_name="purchase_orders")
    op.drop_column("purchase_orders", "file_hash")
