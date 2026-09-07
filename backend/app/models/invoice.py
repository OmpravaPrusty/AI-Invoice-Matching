import enum
import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Float, JSON, String
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class InvoiceStatus(str, enum.Enum):
    UPLOADED = "Uploaded"
    PROCESSING = "Processing"
    EXTRACTED = "Extracted"
    FAILED = "Failed"


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_hash = Column(String(64), nullable=True, index=True)
    file_path = Column(String(500), nullable=True)
    invoice_number = Column(String(100), nullable=True, index=True)
    vendor = Column(String(255), nullable=True)
    total_amount = Column(Float, nullable=True)
    status = Column(Enum(InvoiceStatus), default=InvoiceStatus.UPLOADED)
    extracted_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<Invoice {self.invoice_number}>"
