import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class ComparisonStatus(str, enum.Enum):
    MATCHED = "Matched"
    PARTIAL_MATCH = "Partial Match"
    MISMATCH = "Mismatch"
    PENDING = "Pending"


class Comparison(Base):
    __tablename__ = "comparisons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    purchase_order_id = Column(UUID(as_uuid=True), nullable=False)
    invoice_id = Column(UUID(as_uuid=True), nullable=False)
    run_number = Column(Integer, nullable=False, default=1)
    status = Column(Enum(ComparisonStatus), default=ComparisonStatus.PENDING)
    ai_summary = Column(Text, nullable=True)
    matched_fields = Column(Text, nullable=True)
    mismatched_fields = Column(Text, nullable=True)
    discrepancy_details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Comparison {self.id}>"


class ComparisonRecord(Base):
    """Immutable audit record for every comparison attempt."""

    __tablename__ = "comparison_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id"), nullable=False, index=True)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=False, index=True)
    run_number = Column(Integer, nullable=False)
    match_status = Column(String(30), nullable=False)
    discrepancies = Column(JSON, nullable=False, default=list)
    summary = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self) -> str:
        return f"<ComparisonRecord {self.id} run={self.run_number}>"


class ComparisonResult(Base):
    __tablename__ = "comparison_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    po_id = Column(UUID(as_uuid=True), ForeignKey("purchase_orders.id"), nullable=True, index=True)
    invoice_id = Column(UUID(as_uuid=True), ForeignKey("invoices.id"), nullable=True, index=True)
    run_number = Column(Integer, nullable=False, default=1)
    match_status = Column(Enum("EXACT_MATCH", "PARTIAL_MATCH", "DISCREPANCY_FOUND", name="comparison_result_status"), nullable=False)
    discrepancy_summary = Column(Text, nullable=False)
    comparison_details = Column(JSON, nullable=False, default=dict)
    total_variance = Column(Numeric(14, 2), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
