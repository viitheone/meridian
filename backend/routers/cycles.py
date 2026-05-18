from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

import models, schemas
from database import get_db
from auth import get_current_user, require_role

router = APIRouter()


@router.get("/", response_model=List[schemas.CycleOut])
def list_cycles(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.GoalCycle).order_by(models.GoalCycle.window_open.desc()).all()


@router.get("/active", response_model=Optional[schemas.CycleOut])
def get_active_cycle(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(models.GoalCycle).filter(models.GoalCycle.is_active == True).first()


@router.post("/", response_model=schemas.CycleOut)
def create_cycle(
    payload: schemas.CycleCreate,
    current_user: models.User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    cycle = models.GoalCycle(**payload.model_dump())
    db.add(cycle)
    db.commit()
    db.refresh(cycle)
    return cycle


@router.put("/{cycle_id}/activate", response_model=schemas.CycleOut)
def activate_cycle(
    cycle_id: str,
    current_user: models.User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    """Sets one cycle as active and deactivates all others. Only one active cycle at a time."""
    db.query(models.GoalCycle).update({"is_active": False})
    cycle = db.query(models.GoalCycle).filter(models.GoalCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(404, "Cycle not found")
    cycle.is_active = True
    db.commit()
    db.refresh(cycle)
    return cycle


@router.get("/{cycle_id}", response_model=schemas.CycleOut)
def get_cycle(
    cycle_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    cycle = db.query(models.GoalCycle).filter(models.GoalCycle.id == cycle_id).first()
    if not cycle:
        raise HTTPException(404, "Cycle not found")
    return cycle
