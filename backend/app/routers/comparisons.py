from __future__ import annotations

import json
import hashlib
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database import get_db
from app.models.comparison import Comparison, ComparisonRecord, ComparisonStatus
from app.models.invoice import Invoice
from app.models.purchase_order import PurchaseOrder

router = APIRouter(prefix="/api/comparisons", tags=["comparisons"])
SAVED_DOCUMENTS = Path(__file__).resolve().parents[2] / "saved_docs"
MAX_SAVE_FILE_SIZE = 10 * 1024 * 1024


class ComparisonRequest(BaseModel):
    purchase_order_id: str
    invoice_id: str


def _record_response(record: Comparison, db: Session) -> dict[str, Any]:
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == record.purchase_order_id).first()
    invoice = db.query(Invoice).filter(Invoice.id == record.invoice_id).first()
    details = json.loads(record.discrepancy_details) if record.discrepancy_details else {}
    return {
        "comparison_id": str(record.id), "run_number": record.run_number,
        "match_status": record.status.value if hasattr(record.status, "value") else record.status,
        "summary": record.ai_summary or "",
        "discrepancies": details.get("discrepancies", []),
        "po_extracted": po.extracted_data if po and po.extracted_data else {},
        "invoice_extracted": invoice.extracted_data if invoice and invoice.extracted_data else {},
        "created_at": record.created_at,
    }


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


@router.post("/save")
async def save_comparison(
    comparison_result: str = Form(...),
    po_file: UploadFile = File(...),
    invoice_file: UploadFile = File(...),
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Persist a previously computed direct comparison atomically."""
    try:
        payload = json.loads(comparison_result)
        if not isinstance(payload, dict):
            raise ValueError("comparison_result must be a JSON object.")
        source_status = payload.get("match_status")
        match_status = {
            "MATCH": "EXACT_MATCH",
            "EXACT_MATCH": "EXACT_MATCH",
            "PARTIAL_MATCH": "PARTIAL_MATCH",
            "MISMATCH": "DISCREPANCY_FOUND",
            "DISCREPANCY_FOUND": "DISCREPANCY_FOUND",
        }.get(source_status)
        if match_status is None:
            raise ValueError("comparison_result.match_status is invalid.")
        po_bytes = await po_file.read()
        invoice_bytes = await invoice_file.read()
        if not po_bytes or not invoice_bytes or len(po_bytes) >= MAX_SAVE_FILE_SIZE or len(invoice_bytes) >= MAX_SAVE_FILE_SIZE:
            raise ValueError("Both files are required and must be smaller than 10 MB.")
        user_id = UUID(str(current_user["user_id"]))
        save_id = uuid4()
        SAVED_DOCUMENTS.mkdir(parents=True, exist_ok=True)
        po_path = SAVED_DOCUMENTS / f"{save_id}_po_{Path(po_file.filename or 'po.pdf').name}"
        invoice_path = SAVED_DOCUMENTS / f"{save_id}_invoice_{Path(invoice_file.filename or 'invoice.pdf').name}"
        po_path.write_bytes(po_bytes)
        invoice_path.write_bytes(invoice_bytes)
        po_hash = _sha256(po_bytes)
        invoice_hash = _sha256(invoice_bytes)
        po = db.query(PurchaseOrder).filter(PurchaseOrder.user_id == user_id, PurchaseOrder.file_hash == po_hash).first()
        if po is None:
            po = PurchaseOrder(user_id=user_id, file_name=po_file.filename or "purchase-order.pdf")
            db.add(po)
        po.file_path = str(po_path)
        po.file_hash = po_hash
        po.vendor = payload.get("po_extracted", {}).get("vendor")
        po.extracted_data = payload.get("po_extracted", {})

        invoice = db.query(Invoice).filter(Invoice.user_id == user_id, Invoice.file_hash == invoice_hash).first()
        if invoice is None:
            invoice = Invoice(user_id=user_id, file_name=invoice_file.filename or "invoice.pdf")
            db.add(invoice)
        invoice.file_path = str(invoice_path)
        invoice.file_hash = invoice_hash
        invoice.vendor = payload.get("invoice_extracted", {}).get("vendor")
        invoice.extracted_data = payload.get("invoice_extracted", {})
        db.flush()
        previous_runs = db.query(Comparison).filter(Comparison.user_id == user_id, Comparison.purchase_order_id == po.id, Comparison.invoice_id == invoice.id).count()
        status_value = {
            "EXACT_MATCH": ComparisonStatus.MATCHED,
            "PARTIAL_MATCH": ComparisonStatus.PARTIAL_MATCH,
            "DISCREPANCY_FOUND": ComparisonStatus.MISMATCH,
        }[match_status]
        result = Comparison(
            user_id=user_id,
            purchase_order_id=po.id,
            invoice_id=invoice.id,
            run_number=previous_runs + 1,
            status=status_value,
            ai_summary=payload.get("summary", ""),
            matched_fields=json.dumps([row for row in payload.get("discrepancies", []) if row.get("status") == "MATCH"]),
            mismatched_fields=json.dumps([row for row in payload.get("discrepancies", []) if row.get("status") == "DISCREPANCY"]),
            discrepancy_details=json.dumps(payload),
        )
        db.add(result)
        db.flush()
        db.commit()
        db.refresh(result)
        return {"comparison_id": str(result.id), "po_id": str(po.id), "invoice_id": str(invoice.id), "run_number": result.run_number, "status": result.status.value}
    except ValueError as exc:
        db.rollback()
        po_path.unlink(missing_ok=True)
        invoice_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        po_path.unlink(missing_ok=True)
        invoice_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Comparison save failed [{type(exc).__name__}]: {exc}") from exc


@router.post("")
async def create_comparison(request: ComparisonRequest, current_user: dict[str, Any] = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    try:
        po_id, invoice_id, user_id = UUID(request.purchase_order_id), UUID(request.invoice_id), UUID(str(current_user["user_id"]))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid document identifier.") from exc
    record = (db.query(Comparison).filter(Comparison.user_id == user_id, Comparison.purchase_order_id == po_id, Comparison.invoice_id == invoice_id).order_by(Comparison.created_at.desc()).first())
    if record is None:
        raise HTTPException(status_code=404, detail="No comparison exists for these documents. Use the matching upload endpoint.")
    return _record_response(record, db)


@router.get("/{comparison_id}")
async def get_comparison(comparison_id: str, current_user: dict[str, Any] = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    try:
        record_id, user_id = UUID(comparison_id), UUID(str(current_user["user_id"]))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid comparison identifier.") from exc
    record = db.query(Comparison).filter(Comparison.id == record_id, Comparison.user_id == user_id).first()
    if record is None:
        raise HTTPException(status_code=404, detail="Comparison not found.")
    return _record_response(record, db)


@router.get("")
async def get_comparison_history(current_user: dict[str, Any] = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    user_id = UUID(str(current_user["user_id"]))
    records = db.query(Comparison).filter(Comparison.user_id == user_id).order_by(Comparison.created_at.desc()).all()
    return {"comparisons": [_record_response(record, db) for record in records]}
