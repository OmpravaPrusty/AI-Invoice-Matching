
from app.routers.ai import router as ai_router
from app.routers.auth import router as auth_router
from app.routers.comparisons import router as comparisons_router
from app.routers.dashboard import router as dashboard_router
from app.routers.invoices import router as invoices_router
from app.routers.purchase_orders import router as purchase_orders_router
from app.routers.reports import router as reports_router
from app.routers.matching import router as matching_router

__all__ = [
    "ai_router",
    "auth_router",
    "comparisons_router",
    "dashboard_router",
    "invoices_router",
    "purchase_orders_router",
    "reports_router",
    "matching_router",
]
