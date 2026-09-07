from pydantic import BaseModel


class DashboardStats(BaseModel):
    purchase_orders: int
    invoices: int
    comparisons: int
    matched: int
    mismatched: int
