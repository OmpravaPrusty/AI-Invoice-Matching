from __future__ import annotations

import json
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database import get_db
from app.models.comparison import Comparison, ComparisonStatus
from app.models.invoice import Invoice
from app.models.purchase_order import PurchaseOrder

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


class DashboardStats(BaseModel):
    purchase_orders: int
    invoices: int
    comparisons: int
    matched: int
    mismatched: int


class DashboardMetrics(BaseModel):
    total_purchase_orders: int
    total_invoices: int
    total_comparisons: int
    matched_rate_percentage: float
    discrepancies_count: int
    po_growth_percentage: float
    invoice_growth_percentage: float


class RecentComparisonRun(BaseModel):
    run_id: str
    po_reference: str
    invoice_reference: str
    vendor_name: str
    match_rate: float
    status: str
    created_at: datetime


class DashboardOverview(BaseModel):
    metrics: DashboardMetrics
    recent_runs: list[RecentComparisonRun]


STATUS_FILTERS = {
    "matched": ComparisonStatus.MATCHED,
    "partial": ComparisonStatus.PARTIAL_MATCH,
    "mismatch": ComparisonStatus.MISMATCH,
}


def _comparison_rows(record: Comparison) -> list[dict[str, Any]]:
    for raw in (record.discrepancy_details, record.matched_fields, record.mismatched_fields):
        if not raw:
            continue
        try:
            decoded = json.loads(raw)
        except (TypeError, json.JSONDecodeError):
            continue
        if isinstance(decoded, dict):
            rows = decoded.get("line_items") or decoded.get("discrepancies") or decoded.get("discrepancyMatrix")
        else:
            rows = decoded
        if isinstance(rows, list):
            return [row for row in rows if isinstance(row, dict)]
    return []


def _match_rate(record: Comparison) -> float:
    rows = _comparison_rows(record)
    if rows:
        matched = sum(
            1
            for row in rows
            if str(row.get("status", "")).upper()
            in {"MATCH", "MATCHED", "EXACT_MATCH"}
        )
        return round(matched * 100 / len(rows), 1)
    if record.status == ComparisonStatus.MATCHED:
        return 100.0
    return 0.0


def _matched_item_counts(records: list[Comparison]) -> tuple[int, int]:
    matched = 0
    total = 0
    for record in records:
        rows = _comparison_rows(record)
        if rows:
            total += len(rows)
            matched += sum(
                1
                for row in rows
                if str(row.get("status", "")).upper()
                in {"MATCH", "MATCHED", "EXACT_MATCH"}
            )
        elif record.status == ComparisonStatus.MATCHED:
            matched += 1
            total += 1
        elif record.status in {
            ComparisonStatus.PARTIAL_MATCH,
            ComparisonStatus.MISMATCH,
        }:
            total += 1
    return matched, total


def _growth_percentage(current: int, previous: int) -> float:
    if previous == 0:
        return 100.0 if current else 0.0
    return round((current - previous) * 100 / previous, 1)


def _month_window() -> tuple[datetime, datetime, datetime]:
    now = datetime.utcnow()
    current_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    previous_start = (current_start - timedelta(days=1)).replace(day=1)
    return now, current_start, previous_start


@router.get("/overview", response_model=DashboardOverview)
async def get_dashboard_overview(
    status: str = Query("all", pattern="^(all|matched|partial|mismatch)$"),
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardOverview:
    now, current_start, previous_start = _month_window()

    po_query = db.query(func.count(func.distinct(PurchaseOrder.id)))
    invoice_query = db.query(func.count(func.distinct(Invoice.id)))
    comparison_query = db.query(Comparison).filter(
        Comparison.status != ComparisonStatus.PENDING,
    )
    total_purchase_orders = int(po_query.scalar() or 0)
    total_invoices = int(invoice_query.scalar() or 0)
    completed_comparisons = comparison_query.all()
    total_comparisons = len(completed_comparisons)
    matched_items, compared_items = _matched_item_counts(completed_comparisons)
    discrepancies_count = sum(1 for record in completed_comparisons if record.status == ComparisonStatus.MISMATCH)

    current_pos = int(po_query.filter(PurchaseOrder.created_at >= current_start, PurchaseOrder.created_at <= now).scalar() or 0)
    previous_pos = int(po_query.filter(PurchaseOrder.created_at >= previous_start, PurchaseOrder.created_at < current_start).scalar() or 0)
    current_invoices = int(invoice_query.filter(Invoice.created_at >= current_start, Invoice.created_at <= now).scalar() or 0)
    previous_invoices = int(invoice_query.filter(Invoice.created_at >= previous_start, Invoice.created_at < current_start).scalar() or 0)

    recent_query = comparison_query.order_by(Comparison.created_at.desc())
    if status != "all":
        recent_query = recent_query.filter(Comparison.status == STATUS_FILTERS[status])

    recent_runs = []
    for record in recent_query.limit(10).all():
        po = db.query(PurchaseOrder).filter(PurchaseOrder.id == record.purchase_order_id).first()
        invoice = db.query(Invoice).filter(Invoice.id == record.invoice_id).first()
        recent_runs.append(RecentComparisonRun(
            run_id=f"RUN-{record.created_at:%Y%m%d}-{record.run_number:03d}",
            po_reference=(po.po_number if po and po.po_number else po.file_name if po else "Not detected"),
            invoice_reference=(invoice.invoice_number if invoice and invoice.invoice_number else invoice.file_name if invoice else "Not detected"),
            vendor_name=(po.vendor if po and po.vendor else invoice.vendor if invoice and invoice.vendor else "Not detected"),
            match_rate=_match_rate(record),
            status=record.status.value,
            created_at=record.created_at,
        ))

    return DashboardOverview(
        metrics=DashboardMetrics(
            total_purchase_orders=total_purchase_orders,
            total_invoices=total_invoices,
            total_comparisons=total_comparisons,
            matched_rate_percentage=round(matched_items * 100 / compared_items, 1) if compared_items else 0.0,
            discrepancies_count=discrepancies_count,
            po_growth_percentage=_growth_percentage(current_pos, previous_pos),
            invoice_growth_percentage=_growth_percentage(current_invoices, previous_invoices),
        ),
        recent_runs=recent_runs,
    )


@router.get("", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: dict[str, Any] = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> DashboardStats:
    """Keep the legacy dashboard response available for existing clients."""
    overview = await get_dashboard_overview("all", current_user, db)
    matched = round(
        overview.metrics.total_comparisons
        * overview.metrics.matched_rate_percentage
        / 100,
    )
    return DashboardStats(
        purchase_orders=overview.metrics.total_purchase_orders,
        invoices=overview.metrics.total_invoices,
        comparisons=overview.metrics.total_comparisons,
        matched=matched,
        mismatched=overview.metrics.discrepancies_count,
    )

