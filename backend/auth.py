import os
from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from database import get_db
import models

security = HTTPBearer(auto_error=False)

JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-jwt-key-for-demo")
ALGORITHM = "HS256"


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM], options={"verify_exp": False})
        return payload
    except JWTError:
        supabase_secret = os.getenv("SUPABASE_JWT_SECRET", JWT_SECRET)
        try:
            payload = jwt.decode(token, supabase_secret, algorithms=[ALGORITHM], options={"verify_exp": False})
            return payload
        except JWTError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_user_id: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> models.User:
    """
    Resolves the current user from a Bearer JWT or the X-User-Id header.
    X-User-Id is a convenience for demo mode - the frontend passes the user's DB id directly.
    """
    user_id = None

    if credentials:
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub") or payload.get("user_id")

    if not user_id and x_user_id:
        user_id = x_user_id

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_role(*roles: str):
    """Dependency factory - raises 403 if the current user's role is not in the allowed list."""
    def checker(current_user: models.User = Depends(get_current_user)) -> models.User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(roles)}",
            )
        return current_user
    return checker


def create_demo_token(user_id: str) -> str:
    payload = {"sub": user_id, "user_id": user_id}
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)
