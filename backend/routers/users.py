"""
Users Router — User management + demo login (X-User-Id based)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

import models, schemas
from database import get_db
from auth import get_current_user, require_role, create_demo_token

router = APIRouter()


@router.get("/me", response_model=schemas.UserWithManager)
def get_me(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return current_user


@router.get("/", response_model=List[schemas.UserOut])
def list_users(
    role: Optional[str] = None,
    current_user: models.User = Depends(require_role("manager", "admin")),
    db: Session = Depends(get_db),
):
    query = db.query(models.User)
    if role:
        query = query.filter(models.User.role == role)
    return query.all()


@router.get("/team", response_model=List[schemas.UserOut])
def get_team(
    current_user: models.User = Depends(require_role("manager", "admin")),
    db: Session = Depends(get_db),
):
    """Get direct reports for a manager"""
    if current_user.role == "manager":
        return current_user.direct_reports
    # Admin sees all employees
    return db.query(models.User).filter(models.User.role == "employee").all()


@router.post("/", response_model=schemas.UserOut)
def create_user(
    payload: schemas.UserCreate,
    current_user: models.User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(400, "User with this email already exists")
    user = models.User(**payload.model_dump())
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ─── Demo Login (no real auth — just returns user + demo token) ───────────────

@router.post("/demo-login", response_model=dict)
def demo_login(
    payload: schemas.LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Demo login for hackathon judges.
    Password is always 'demo1234' for all demo users.
    """
    DEMO_PASSWORD = "demo1234"
    if payload.password != DEMO_PASSWORD:
        raise HTTPException(401, "Invalid credentials")

    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user:
        raise HTTPException(401, "User not found")

    token = create_demo_token(str(user.id))
    return {
        "user": schemas.UserOut.model_validate(user),
        "token": token,
        "user_id": str(user.id),
    }


@router.get("/{user_id}", response_model=schemas.UserOut)
def get_user(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user
