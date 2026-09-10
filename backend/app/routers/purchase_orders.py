from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from uuid import uuid4

from app.core.security import get_current_user, require_admin
from app.database import get_db
from app.models.purchase_order import PurchaseOrder
from app.services.supabase_storage import SupabaseStorage

router = APIRouter(
    prefix="/api/purchase-orders",
    tags=["purchase_orders"],
    dependencies=[Depends(require_admin)],
)


@router.post("/upload")
async def upload_purchase_order(
    file: UploadFile = File(...),
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is required.")

    storage = SupabaseStorage()
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
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    records = db.query(PurchaseOrder).filter(PurchaseOrder.user_id == current_user["user_id"]).all()
    return {
        "purchase_orders": [
            {
                "id": str(item.id),
                "file_name": item.file_name,
                "po_number": item.po_number,
                "vendor": item.vendor,
                "total_amount": item.total_amount,
                "status": item.status.value if hasattr(item.status, "value") else item.status,
            }
            for item in records
        ]
    }
