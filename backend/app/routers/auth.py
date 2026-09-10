from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    UserResponse,
    RegisterResponse,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=RegisterResponse)
async def register_user(
    request: RegisterRequest,
    db: Session = Depends(get_db),
) -> RegisterResponse:
    """Register a new user and return a 201 Created with the new user id."""
    try:
        email = request.email.lower().strip()
        password = request.password.strip()

        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists.",
            )

        user = User(
            email=email,
            full_name=request.full_name.strip(),
            password_hash=hash_password(password),
            is_active=True,
            role=request.role,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        return RegisterResponse(message="User registered successfully", id=str(user.id))
    except OperationalError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database unavailable: {exc}",
        ) from exc


@router.post("/login", response_model=LoginResponse)
async def login_user(
    request: LoginRequest,
    db: Session = Depends(get_db),
) -> LoginResponse:
    """Authenticate a user and return a JWT."""
    try:
        email = request.email.lower().strip()
        password = request.password.strip()
        user = db.query(User).filter(User.email == email).first()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        if not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials",
            )

        role = user.role if user.role in {"admin", "user"} else "user"
        token = create_access_token({"sub": str(user.id), "role": role})
        return LoginResponse(
            access_token=token,
            token_type="bearer",
            role=role,
            user=UserResponse(
                user_id=str(user.id),
                email=user.email,
                full_name=user.full_name,
                role=role,
            ),
        )
    except OperationalError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database unavailable: {exc}",
        ) from exc


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> UserResponse:
    """Get the authenticated user's details."""
    return UserResponse(
        user_id=current_user["user_id"],
        email=current_user["email"],
        full_name=current_user.get("full_name"),
        role=current_user.get("role", "user"),
    )


@router.post("/logout")
async def logout_user(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> JSONResponse:
    """Logout endpoint for token-based auth."""
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": "Logged out successfully",
            "user_id": current_user["user_id"],
        },
    )
