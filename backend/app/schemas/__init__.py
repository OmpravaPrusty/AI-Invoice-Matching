from app.schemas.auth import LoginRequest, LoginResponse, RegisterRequest, UserResponse
from app.schemas.document import DocumentUploadResponse, ExtractRequest
from app.schemas.comparison import ComparisonRequest, ComparisonResponse
from app.schemas.dashboard import DashboardStats

__all__ = [
    "LoginRequest",
    "LoginResponse",
    "RegisterRequest",
    "UserResponse",
    "DocumentUploadResponse",
    "ExtractRequest",
    "ComparisonRequest",
    "ComparisonResponse",
    "DashboardStats",
]
