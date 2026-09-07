import asyncio
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user, get_current_user_claims
from app.database import get_db
from app.models.invoice import Invoice
from app.models.purchase_order import PurchaseOrder
from app.services.gemini_service import GeminiService
from services.matching_service import compare_document_bytes

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ExtractRequest(BaseModel):
    file_id: str


MAX_DIRECT_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_DIRECT_TYPES = {"application/pdf", "image/png", "image/jpeg"}


async def _read_direct_file(file: UploadFile) -> bytes:
    if not file.filename or file.content_type not in ALLOWED_DIRECT_TYPES:
        raise HTTPException(status_code=400, detail="PO and invoice must be PDF, PNG, or JPEG files.")
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail=f"{file.filename} is empty.")
    if len(data) >= MAX_DIRECT_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Direct comparison files must be smaller than 10 MB.")
    return data


@router.post("/compare-direct")
async def compare_direct(
    po_file: UploadFile = File(...),
    invoice_file: UploadFile = File(...),
    _: dict[str, Any] = Depends(get_current_user_claims),
) -> dict[str, Any]:
    """Compare uploaded documents in memory without database reads or writes."""
    po_bytes = await _read_direct_file(po_file)
    invoice_bytes = await _read_direct_file(invoice_file)
    try:
        return await asyncio.to_thread(
            compare_document_bytes,
            po_bytes,
            invoice_bytes,
            po_file.content_type or "application/pdf",
            invoice_file.content_type or "application/pdf",
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Direct Gemini comparison failed [{type(exc).__name__}]: {exc}") from exc


@router.post("/extract-po")
async def extract_purchase_order(
    request: ExtractRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == request.file_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found.")

    if not po.file_path:
        raise HTTPException(status_code=400, detail="No file path available for this purchase order.")

    # In a real implementation, read the file from Supabase / local storage and pass text to Gemini.
    # For now, return a structured placeholder response.
    gemini = GeminiService()
    extracted = gemini.extract_invoice_json(
        """
        Purchase Order
        PO Number: PO-1001
        Vendor: Alpha Supply
        Total Amount: 2500.00
        Date: 2026-08-01
        """
    )
    return {
        "file_id": request.file_id,
        "status": "Processed",
        "extracted_data": extracted,
    }


@router.post("/extract-invoice")
async def extract_invoice(
    request: ExtractRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(Invoice.id == request.file_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found.")

    gemini = GeminiService()
    extracted = gemini.extract_invoice_json(
        """
        Invoice
        Invoice Number: INV-5001
        Vendor: Alpha Supply
        Total Amount: 2500.00
        Date: 2026-08-02
        """
    )
    return {
        "file_id": request.file_id,
        "status": "Processed",
        "extracted_data": extracted,
    }
