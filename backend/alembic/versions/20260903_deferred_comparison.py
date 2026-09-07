"""Add deferred comparison result storage and document JSON fields.

Revision ID: 20260903_deferred_comparison
Revises:
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260903_deferred_comparison"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("purchase_orders", "extracted_data", type_=postgresql.JSON(astext_type=sa.Text()), postgresql_using="CASE WHEN extracted_data IS NULL OR extracted_data = '' THEN NULL ELSE extracted_data::json END")
    op.alter_column("invoices", "extracted_data", type_=postgresql.JSON(astext_type=sa.Text()), postgresql_using="CASE WHEN extracted_data IS NULL OR extracted_data = '' THEN NULL ELSE extracted_data::json END")
    op.create_table(
        "comparison_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("po_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("purchase_orders.id"), nullable=True),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("invoices.id"), nullable=True),
        sa.Column("run_number", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("match_status", sa.Enum("EXACT_MATCH", "PARTIAL_MATCH", "DISCREPANCY_FOUND", name="comparison_result_status"), nullable=False),
        sa.Column("discrepancy_summary", sa.Text(), nullable=False),
        sa.Column("comparison_details", postgresql.JSON(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("total_variance", sa.Numeric(14, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_comparison_results_po_id", "comparison_results", ["po_id"])
    op.create_index("ix_comparison_results_invoice_id", "comparison_results", ["invoice_id"])


def downgrade() -> None:
    op.drop_index("ix_comparison_results_invoice_id", table_name="comparison_results")
    op.drop_index("ix_comparison_results_po_id", table_name="comparison_results")
    op.drop_table("comparison_results")
    op.execute("DROP TYPE IF EXISTS comparison_result_status")
    op.alter_column("purchase_orders", "extracted_data", type_=sa.Text(), postgresql_using="extracted_data::text")
    op.alter_column("invoices", "extracted_data", type_=sa.Text(), postgresql_using="extracted_data::text")
