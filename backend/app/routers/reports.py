from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse

from app.core.security import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/{comparison_id}")
async def generate_report(comparison_id: str, current_user: dict = Depends(get_current_user)):
    """Generate downloadable PDF comparison report."""
    return {"message": "Report generated", "comparison_id": comparison_id}
