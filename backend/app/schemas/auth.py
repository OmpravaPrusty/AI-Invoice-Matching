from typing import Literal

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: Literal["admin", "user"] = "user"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Literal["admin", "user"] = "user"
    user: "UserResponse | None" = None


class UserResponse(BaseModel):
    user_id: str
    email: str
    full_name: str | None = None
    role: Literal["admin", "user"] = "user"


class RegisterResponse(BaseModel):
    message: str
    id: str
