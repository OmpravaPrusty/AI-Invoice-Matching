from __future__ import annotations

import json
import hashlib
import logging
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database import get_db
from app.models.comparison import ComparisonRecord
from app.models.invoice import Invoice, InvoiceStatus
from app.models.purchase_order import POStatus, PurchaseOrder
from app.services.matching_service import GeminiServiceError, process_invoice_matching

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/matching", tags=["matching"])
UPLOAD_DIRECTORY = Path(__file__).resolve().parents[2] / "uploaded_docs"
MAX_FILE_SIZE = 25 * 1024 * 1024


def _validate_pdf(file: UploadFile) -> None:
    if not file.filename or file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files with a valid filename are supported.")


def _safe_filename(filename: str) -> str:
    return Path(filename).name.replace(" ", "_")


async def _save_upload(file: UploadFile, target: Path) -> bytes:
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail=f"Uploaded file {file.filename} is empty.")
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Each document must be smaller than 25 MB.")
    target.write_bytes(data)
    return data


def _content_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


@router.post("/process-and-compare")
async def process_and_compare(
    po_file: UploadFile = File(...),
    invoice_file: UploadFile = File(...),
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    _validate_pdf(po_file)
    _validate_pdf(invoice_file)
    pair_id = uuid4()
    po_path = UPLOAD_DIRECTORY / f"{pair_id}_po_{_safe_filename(po_file.filename or 'po.pdf')}"
    invoice_path = UPLOAD_DIRECTORY / f"{pair_id}_invoice_{_safe_filename(invoice_file.filename or 'invoice.pdf')}"
    UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)

    try:
        po_bytes = await _save_upload(po_file, po_path)
        invoice_bytes = await _save_upload(invoice_file, invoice_path)
        ai_result = await process_invoice_matching(po_path, invoice_path)
        match_status = ai_result.get("match_status", "MISMATCH")
        if match_status not in {"MATCH", "PARTIAL_MATCH", "MISMATCH"}:
            raise ValueError("Gemini returned an unsupported match status.")

        user_id = UUID(str(current_user["user_id"]))
        po_hash = _content_hash(po_bytes)
        invoice_hash = _content_hash(invoice_bytes)
        po = db.query(PurchaseOrder).filter(PurchaseOrder.user_id == user_id, PurchaseOrder.file_hash == po_hash).first()
        if po is None:
            po = PurchaseOrder(user_id=user_id, file_name=po_file.filename, file_path=str(po_path))
            db.add(po)
        po.file_path = str(po_path)
        po.file_hash = po_hash
        po.status = POStatus.EXTRACTED
        po.extracted_data = ai_result.get("po_extracted", {})

        invoice = db.query(Invoice).filter(Invoice.user_id == user_id, Invoice.file_hash == invoice_hash).first()
        if invoice is None:
            invoice = Invoice(user_id=user_id, file_name=invoice_file.filename, file_path=str(invoice_path))
            db.add(invoice)
        invoice.file_path = str(invoice_path)
        invoice.file_hash = invoice_hash
        invoice.status = InvoiceStatus.EXTRACTED
        invoice.extracted_data = ai_result.get("invoice_extracted", {})
        db.flush()
        existing_runs = db.query(ComparisonRecord).filter(ComparisonRecord.po_id == po.id, ComparisonRecord.invoice_id == invoice.id).count()
        record = ComparisonRecord(po_id=po.id, invoice_id=invoice.id, run_number=existing_runs + 1, match_status=match_status, discrepancies=ai_result.get("discrepancies", []), summary=ai_result["summary"])
        db.add(record)
        db.commit()
        db.refresh(record)
        return {
            "comparison_id": str(record.id), "run_number": record.run_number,
            "match_status": record.match_status, "summary": record.summary,
            "discrepancies": record.discrepancies,
            "po_extracted": ai_result.get("po_extracted", {}),
            "invoice_extracted": ai_result.get("invoice_extracted", {}),
            "manual_review_recommended": bool(ai_result.get("manual_review_recommended", True)),
        }
    except HTTPException:
        raise
    except GeminiServiceError as exc:
        db.rollback()
        logger.exception("Gemini service unavailable: %s", exc)
        response_status = 503 if exc.status_code == 503 else 502
        detail = "Gemini service is temporarily unavailable. Please retry." if response_status == 503 else str(exc)
        raise HTTPException(status_code=response_status, detail=detail) from exc
    except ValueError as exc:
        db.rollback()
        logger.exception("Document matching failed: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        logger.exception("Unexpected document matching failure")
        raise HTTPException(status_code=500, detail="Document matching could not be completed.") from exc
