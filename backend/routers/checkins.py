from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

import models, schemas
from database import get_db
from auth import get_current_user, require_role

router = APIRouter()


@router.post("/", response_model=schemas.CheckinOut)
def add_checkin_comment(
    payload: schemas.CheckinCreate,
    current_user: models.User = Depends(require_role("manager", "admin")),
    db: Session = Depends(get_db),
):
    goal = db.query(models.Goal).filter(models.Goal.id == payload.goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")

    if current_user.role == "manager":
        employee = db.query(models.User).filter(models.User.id == goal.employee_id).first()
        if not employee or str(employee.manager_id) != str(current_user.id):
            raise HTTPException(403, "Not your direct report")

    comment = models.CheckinComment(
        goal_id=payload.goal_id,
        manager_id=current_user.id,
        quarter=payload.quarter,
        comment=payload.comment,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.get("/goal/{goal_id}", response_model=List[schemas.CheckinOut])
def get_goal_checkins(
    goal_id: str,
    quarter: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.CheckinComment).filter(models.CheckinComment.goal_id == goal_id)
    if quarter:
        query = query.filter(models.CheckinComment.quarter == quarter)
    return query.order_by(models.CheckinComment.created_at.desc()).all()


@router.get("/team", response_model=List[dict])
def get_team_checkin_summary(
    quarter: Optional[str] = None,
    current_user: models.User = Depends(require_role("manager", "admin")),
    db: Session = Depends(get_db),
):
    if current_user.role == "manager":
        subordinate_ids = [str(u.id) for u in current_user.direct_reports]
    else:
        subordinate_ids = [str(u.id) for u in db.query(models.User).filter(models.User.role == "employee").all()]

    results = []
    for emp_id in subordinate_ids:
        employee = db.query(models.User).filter(models.User.id == emp_id).first()
        if not employee:
            continue

        goals = db.query(models.Goal).filter(
            models.Goal.employee_id == emp_id,
            models.Goal.status == "approved",
        ).all()

        goal_ids = [g.id for g in goals]
        checkin_query = db.query(models.CheckinComment).filter(
            models.CheckinComment.goal_id.in_(goal_ids)
        )
        if quarter:
            checkin_query = checkin_query.filter(models.CheckinComment.quarter == quarter)

        checkin_count = checkin_query.count()
        results.append({
            "employee_id": emp_id,
            "employee_name": employee.name,
            "department": employee.department,
            "total_goals": len(goals),
            "checkins_logged": checkin_count,
            "checkin_complete": checkin_count >= len(goals) if goals else False,
        })

    return results
