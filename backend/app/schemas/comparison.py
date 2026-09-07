from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ComparisonRequest(BaseModel):
    purchase_order_id: str
    invoice_id: str


class ComparisonResponse(BaseModel):
    comparison_id: str
    status: str
    matched_fields: List[str] = []
    mismatched_fields: List[str] = []
    ai_summary: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
