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
from app.models.purchase_order import PurchaseOrder
from app.services.supabase_storage import SupabaseStorage

router = APIRouter(
    prefix="/api/purchase-orders",
    tags=["purchase_orders"],
    dependencies=[Depends(require_admin)],
)


def _file_url(storage: SupabaseStorage | None, file_path: str | None, request: Request, document_id: str) -> str | None:
    if not file_path:
        return None
    if Path(file_path).is_file():
        return str(request.url_for("serve_purchase_order_file", purchase_order_id=document_id))
    if storage is None:
        return file_path
    try:
        return storage.get_public_url(file_path)
    except Exception:
        return file_path


def _comparison_data(db: Session, item: PurchaseOrder) -> dict[str, Any]:
    comparison = db.query(Comparison).filter(
        Comparison.purchase_order_id == item.id,
    ).order_by(Comparison.created_at.desc()).first()
    if not comparison or not comparison.discrepancy_details:
        return item.extracted_data or {}
    try:
        details = json.loads(comparison.discrepancy_details)
    except (TypeError, json.JSONDecodeError):
        return item.extracted_data or {}
    line_items = details.get("line_items") or details.get("discrepancies") or []
    return {
        "po_number": item.po_number or details.get("po_number") or next(
            (row.get("po_value") for row in details.get("matched_headers", []) if row.get("field", "").lower() == "po number"),
            None,
        ),
        "vendor": item.vendor or next(
            (row.get("po_value") for row in details.get("matched_headers", []) if "vendor" in row.get("field", "").lower()),
            None,
        ),
        "total_amount": item.total_amount or next(
            (row.get("po_value") for row in details.get("matched_headers", []) if "total" in row.get("field", "").lower()),
            None,
        ),
        "line_items": [
            {
                "item_name": row.get("item_name") or row.get("field"),
                "quantity": row.get("po_qty"),
                "unit_price": row.get("po_rate"),
                "total": row.get("po_total"),
            }
            for row in line_items if isinstance(row, dict)
        ],
        "matched_headers": details.get("matched_headers", []),
        "comparison_status": details.get("match_status") or comparison.status.value,
    }
@router.post("/upload")
async def upload_purchase_order(
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
    stored_path = storage.upload_file(file_name=file_name, file_bytes=file_bytes, folder="purchase-orders")

    po = PurchaseOrder(
        user_id=current_user["user_id"],
        file_name=file.filename,
        file_path=stored_path,
        status="Uploaded",
    )
    db.add(po)
    db.commit()
    db.refresh(po)

    return {
        "purchase_order_id": str(po.id),
        "file_name": file.filename,
        "file_path": stored_path,
        "status": "Uploaded",
    }


@router.get("")
async def get_all_purchase_orders(
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = db.query(PurchaseOrder).all()
    try:
        storage = SupabaseStorage()
    except ValueError:
        storage = None
    return {
        "purchase_orders": [
            ({
                "id": str(item.id),
                "file_name": item.file_name,
                "po_number": (data := _comparison_data(db, item)).get("po_number") or item.po_number,
                "vendor": data.get("vendor") or item.vendor,
                "total_amount": data.get("total_amount") or item.total_amount,
                "status": item.status.value if hasattr(item.status, "value") else item.status,
                "comparison_status": data.get("comparison_status"),
                "file_path": item.file_path,
                "file_url": _file_url(storage, item.file_path, request, str(item.id)),
                "created_at": item.created_at,
                "extracted_data": data,
            }
            )
            for item in records
        ]
    }


@router.get("/{purchase_order_id}/file", name="serve_purchase_order_file")
async def serve_purchase_order_file(
    purchase_order_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        document_id = UUID(purchase_order_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid purchase order identifier.") from exc
    item = db.query(PurchaseOrder).filter(
        PurchaseOrder.id == document_id,
        PurchaseOrder.user_id == current_user["user_id"],
    ).first()
    if not item or not item.file_path or not Path(item.file_path).is_file():
        raise HTTPException(status_code=404, detail="Purchase order file not found.")
    return FileResponse(item.file_path, media_type="application/pdf", filename=item.file_name)
