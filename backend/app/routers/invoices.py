import json
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from uuid import uuid4
from uuid import UUID
from pathlib import Path

from app.core.security import get_current_user, require_admin
from app.database import get_db
from app.models.comparison import Comparison
from app.models.invoice import Invoice
from app.services.supabase_storage import SupabaseStorage

router = APIRouter(
    prefix="/api/invoices",
    tags=["invoices"],
    dependencies=[Depends(require_admin)],
)


def _file_url(storage: SupabaseStorage | None, file_path: str | None, request: Request, document_id: str) -> str | None:
    if not file_path:
        return None
    if Path(file_path).is_file():
        return str(request.url_for("serve_invoice_file", invoice_id=document_id))
    if storage is None:
        return file_path
    try:
        return storage.get_public_url(file_path)
    except Exception:
        return file_path


def _comparison_data(db: Session, item: Invoice) -> dict[str, Any]:
    comparison = db.query(Comparison).filter(
        Comparison.invoice_id == item.id,
    ).order_by(Comparison.created_at.desc()).first()
    if not comparison or not comparison.discrepancy_details:
        return item.extracted_data or {}
    try:
        details = json.loads(comparison.discrepancy_details)
    except (TypeError, json.JSONDecodeError):
        return item.extracted_data or {}
    line_items = details.get("line_items") or details.get("discrepancies") or []
    return {
        "invoice_number": item.invoice_number or details.get("invoice_number") or next(
            (row.get("invoice_value") for row in details.get("matched_headers", []) if "invoice" in row.get("field", "").lower() and "number" in row.get("field", "").lower()),
            None,
        ),
        "po_number": next(
            (row.get("invoice_value") for row in details.get("matched_headers", []) if row.get("field", "").lower() == "po number"),
            None,
        ),
        "vendor": item.vendor or next(
            (row.get("invoice_value") for row in details.get("matched_headers", []) if "vendor" in row.get("field", "").lower()),
            None,
        ),
        "total_amount": item.total_amount or next(
            (row.get("invoice_value") for row in details.get("matched_headers", []) if "total" in row.get("field", "").lower()),
            None,
        ),
        "line_items": [
            {
                "item_name": row.get("item_name") or row.get("field"),
                "quantity": row.get("inv_qty"),
                "unit_price": row.get("inv_rate"),
                "total": row.get("inv_total"),
            }
            for row in line_items if isinstance(row, dict)
        ],
        "matched_headers": details.get("matched_headers", []),
        "comparison_status": details.get("match_status") or comparison.status.value,
    }
@router.post("/upload")
async def upload_invoice(
    file: UploadFile = File(...),
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is required.")

    try:
        storage = SupabaseStorage()
    except ValueError:
        storage = None

    file_bytes = await file.read()

    file_id = str(uuid4())
    file_name = f"{file_id}_{file.filename}"
    stored_path = storage.upload_file(file_name=file_name, file_bytes=file_bytes, folder="invoices")

    invoice = Invoice(
        user_id=current_user["user_id"],
        file_name=file.filename,
        file_path=stored_path,
        status="Uploaded",
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    return {
        "invoice_id": str(invoice.id),
        "file_name": file.filename,
        "file_path": stored_path,
        "status": "Uploaded",
    }


@router.get("")
async def get_all_invoices(
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = db.query(Invoice).all()
    try:
        storage = SupabaseStorage()
    except ValueError:
        storage = None
    return {
        "invoices": [
            {
                "id": str(item.id),
                "file_name": item.file_name,
                "invoice_number": (data := _comparison_data(db, item)).get("invoice_number") or item.invoice_number,
                "po_number": data.get("po_number") or (item.extracted_data or {}).get("po_number"),
                "vendor": data.get("vendor") or item.vendor,
                "total_amount": data.get("total_amount") or item.total_amount,
                "status": item.status.value if hasattr(item.status, "value") else item.status,
                "comparison_status": data.get("comparison_status"),
                "file_path": item.file_path,
                "file_url": _file_url(storage, item.file_path, request, str(item.id)),
                "created_at": item.created_at,
                "extracted_data": data,
            }
            for item in records
        ]
    }


@router.get("/{invoice_id}/file", name="serve_invoice_file")
async def serve_invoice_file(
    invoice_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        document_id = UUID(invoice_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid invoice identifier.") from exc
    item = db.query(Invoice).filter(
        Invoice.id == document_id,
        Invoice.user_id == current_user["user_id"],
    ).first()
    if not item or not item.file_path or not Path(item.file_path).is_file():
        raise HTTPException(status_code=404, detail="Invoice file not found.")
    return FileResponse(item.file_path, media_type="application/pdf", filename=item.file_name)
