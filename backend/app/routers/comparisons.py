from __future__ import annotations

import json
import hashlib
import math
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database import get_db
from app.models.comparison import Comparison, ComparisonStatus
from app.models.invoice import Invoice
from app.models.purchase_order import PurchaseOrder
from app.services.ai_service import generate_discrepancy_resolution

router = APIRouter(prefix="/api/comparisons", tags=["comparisons"])
SAVED_DOCUMENTS = Path(__file__).resolve().parents[2] / "saved_docs"
MAX_SAVE_FILE_SIZE = 10 * 1024 * 1024


class ComparisonRequest(BaseModel):
    purchase_order_id: str
    invoice_id: str


def _number(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _first_number(data: dict[str, Any], *keys: str) -> float | None:
    for key in keys:
        number = _number(data.get(key))
        if number is not None:
            return number
    return None


def _rule_based_discrepancies(
    po_data: dict[str, Any], invoice_data: dict[str, Any], rows: list[Any]
) -> list[dict[str, Any]]:
    """Enrich existing line items with deterministic variances."""
    detected = [dict(row) for row in rows if isinstance(row, dict)]

    po_total = _first_number(po_data, "total_amount", "total", "po_total")
    invoice_total = _first_number(invoice_data, "total_amount", "total", "invoice_total")
    if po_total is not None and invoice_total is not None and not math.isclose(po_total, invoice_total, abs_tol=0.01):
        if not any(row.get("field") == "Document total" for row in detected):
            detected.append({
                "field": "Document total",
                "po_value": po_total,
                "invoice_value": invoice_total,
                "variance": round(invoice_total - po_total, 2),
                "severity": "HIGH",
                "status": "DISCREPANCY",
                "recommendation": "Verify tax, shipping, credits, and invoice line extensions before approval.",
            })

    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            continue
        label = row.get("item_name") or row.get("field") or f"Line item {index + 1}"
        checks = (
            ("quantity", ("po_qty", "po_quantity"), ("inv_qty", "invoice_qty")),
            ("unit price", ("po_rate", "po_unit_price"), ("inv_rate", "invoice_rate")),
        )
        for name, po_keys, invoice_keys in checks:
            po_value = _first_number(row, *po_keys)
            invoice_value = _first_number(row, *invoice_keys)
            if po_value is not None and invoice_value is not None and not math.isclose(po_value, invoice_value, abs_tol=0.01):
                row["status"] = "DISCREPANCY"
                reason = f"Confirm the invoiced {name} against the approved purchase order."
                existing_reason = str(row.get("variance_reason") or row.get("recommendation") or "")
                row["variance_reason"] = "; ".join(
                    part for part in (existing_reason, reason) if part and reason not in part
                )
    return detected


def _save_optional_resolution(db: Session, result: Comparison, recommendation: str) -> None:
    """Use a dedicated column when an older/newer deployment has added it."""
    bind = db.get_bind()
    if bind is None:
        return
    columns = {column["name"] for column in inspect(bind).get_columns("comparisons")}
    if "resolution_suggestion" in columns:
        db.execute(
            text("UPDATE comparisons SET resolution_suggestion = :recommendation WHERE id = :id"),
            {"recommendation": recommendation, "id": result.id},
        )


def _record_response(record: Comparison, db: Session) -> dict[str, Any]:
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == record.purchase_order_id).first()
    invoice = db.query(Invoice).filter(Invoice.id == record.invoice_id).first()
    details = json.loads(record.discrepancy_details) if record.discrepancy_details else {}
    ai_recommendation = getattr(record, "resolution_suggestion", None) or details.get("ai_recommendation", "")
    return {
        "comparison_id": str(record.id), "run_number": record.run_number,
        "match_status": record.status.value if hasattr(record.status, "value") else record.status,
        "summary": record.ai_summary or "",
        "discrepancies": details.get("discrepancies", []),
        "po_extracted": po.extracted_data if po and po.extracted_data else {},
        "invoice_extracted": invoice.extracted_data if invoice and invoice.extracted_data else {},
        "ai_recommendation": ai_recommendation,
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
    po_path: Path | None = None
    invoice_path: Path | None = None
    try:
        payload = json.loads(comparison_result)
        if not isinstance(payload, dict):
            raise ValueError("comparison_result must be a JSON object.")
        summary = payload.get("summary") if isinstance(payload.get("summary"), dict) else {}
        source_status = str(
            payload.get("match_status")
            or summary.get("overall_status", "")
        ).upper()
        match_status = {
            "MATCH": "EXACT_MATCH",
            "MATCHED": "EXACT_MATCH",
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
        po_extracted = payload.get("po_extracted") if isinstance(payload.get("po_extracted"), dict) else {}
        invoice_extracted = payload.get("invoice_extracted") if isinstance(payload.get("invoice_extracted"), dict) else {}
        po.vendor = po_extracted.get("vendor") or summary.get("vendor_name")
        po.po_number = po_extracted.get("po_number") or summary.get("po_number")
        po.total_amount = po_extracted.get("total_amount") or summary.get("po_total")
        po.extracted_data = po_extracted or summary

        invoice = db.query(Invoice).filter(Invoice.user_id == user_id, Invoice.file_hash == invoice_hash).first()
        if invoice is None:
            invoice = Invoice(user_id=user_id, file_name=invoice_file.filename or "invoice.pdf")
            db.add(invoice)
        invoice.file_path = str(invoice_path)
        invoice.file_hash = invoice_hash
        invoice.vendor = invoice_extracted.get("vendor") or summary.get("vendor_name")
        invoice.invoice_number = invoice_extracted.get("invoice_number") or summary.get("invoice_number")
        invoice.total_amount = invoice_extracted.get("total_amount") or summary.get("invoice_total")
        invoice.extracted_data = invoice_extracted or summary
        db.flush()
        previous_runs = db.query(Comparison).filter(Comparison.user_id == user_id, Comparison.purchase_order_id == po.id, Comparison.invoice_id == invoice.id).count()
        status_value = {
            "EXACT_MATCH": ComparisonStatus.MATCHED,
            "PARTIAL_MATCH": ComparisonStatus.PARTIAL_MATCH,
            "DISCREPANCY_FOUND": ComparisonStatus.MISMATCH,
        }[match_status]
        rows = payload.get("discrepancies")
        if not isinstance(rows, list):
            rows = payload.get("line_items", [])
        if not isinstance(rows, list):
            rows = []
        rows = _rule_based_discrepancies(po_extracted, invoice_extracted, rows)
        ai_recommendation = str(payload.get("ai_recommendation") or "")
        if not ai_recommendation and rows:
            ai_recommendation = generate_discrepancy_resolution(po_extracted, invoice_extracted, rows)
        payload["discrepancies"] = rows
        payload["ai_recommendation"] = ai_recommendation
        summary_text = payload.get("summary") if isinstance(payload.get("summary"), str) else summary.get("overall_status", "")
        result = Comparison(
            user_id=user_id,
            purchase_order_id=po.id,
            invoice_id=invoice.id,
            run_number=previous_runs + 1,
            status=status_value,
            ai_summary=summary_text,
            matched_fields=json.dumps([row for row in rows if isinstance(row, dict) and row.get("status") == "MATCH"]),
            mismatched_fields=json.dumps([row for row in rows if isinstance(row, dict) and row.get("status") == "DISCREPANCY"]),
            discrepancy_details=json.dumps(payload),
        )
        db.add(result)
        db.flush()
        _save_optional_resolution(db, result, ai_recommendation)
        db.commit()
        db.refresh(result)
        return {"comparison_id": str(result.id), "po_id": str(po.id), "invoice_id": str(invoice.id), "run_number": result.run_number, "status": result.status.value}
    except ValueError as exc:
        db.rollback()
        if po_path:
            po_path.unlink(missing_ok=True)
        if invoice_path:
            invoice_path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        if po_path:
            po_path.unlink(missing_ok=True)
        if invoice_path:
            invoice_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Comparison save failed [{type(exc).__name__}]: {exc}") from exc


@router.post("")
async def create_comparison(request: ComparisonRequest, current_user: dict[str, Any] = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    try:
        po_id, invoice_id = UUID(request.purchase_order_id), UUID(request.invoice_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid document identifier.") from exc
    record = (db.query(Comparison).filter(Comparison.purchase_order_id == po_id, Comparison.invoice_id == invoice_id).order_by(Comparison.created_at.desc()).first())
    if record is None:
        raise HTTPException(status_code=404, detail="No comparison exists for these documents. Use the matching upload endpoint.")
    return _record_response(record, db)


@router.get("/{comparison_id}")
async def get_comparison(comparison_id: str, current_user: dict[str, Any] = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    try:
        record_id = UUID(comparison_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid comparison identifier.") from exc
    record = db.query(Comparison).filter(Comparison.id == record_id).first()
    if record is None:
        raise HTTPException(status_code=404, detail="Comparison not found.")
    return _record_response(record, db)


@router.delete("/{comparison_id}", status_code=204)
async def delete_comparison(
    comparison_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    try:
        record_id = UUID(comparison_id)
        user_id = UUID(str(current_user["user_id"]))
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=400, detail="Invalid comparison identifier.") from exc

    record = db.query(Comparison).filter(
        Comparison.id == record_id,
        Comparison.user_id == user_id,
    ).first()
    if record is None:
        raise HTTPException(status_code=404, detail="Comparison not found.")

    db.delete(record)
    db.commit()


@router.get("")
async def get_comparison_history(current_user: dict[str, Any] = Depends(get_current_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    records = db.query(Comparison).order_by(Comparison.created_at.desc()).all()
    return {"comparisons": [_record_response(record, db) for record in records]}
