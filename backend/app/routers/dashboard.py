from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.security import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


class DashboardStats(BaseModel):
    purchase_orders: int
    invoices: int
    comparisons: int
    matched: int
    mismatched: int


@router.get("", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Get dashboard summary statistics."""
    return DashboardStats(
        purchase_orders=25,
        invoices=30,
        comparisons=22,
        matched=18,
        mismatched=4
    )
