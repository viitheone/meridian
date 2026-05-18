from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

import models, schemas
from database import get_db
from auth import get_current_user, require_role

router = APIRouter()

MAX_GOALS = 8
MIN_WEIGHTAGE = 10
TOTAL_WEIGHTAGE = 100


def _check_weightage(
    db: Session,
    employee_id: str,
    cycle_id: Optional[str],
    exclude_id: Optional[str] = None,
    new_weightage: float = 0,
) -> float:
    """Returns the total weightage that would exist after adding new_weightage, excluding one goal by ID."""
    query = db.query(models.Goal).filter(
        models.Goal.employee_id == employee_id,
        models.Goal.status != "returned",
    )
    if cycle_id:
        query = query.filter(models.Goal.cycle_id == cycle_id)
    if exclude_id:
        query = query.filter(models.Goal.id != exclude_id)
    total = sum(float(g.weightage) for g in query.all())
    return total + new_weightage


def _log_audit(db: Session, goal_id: str, changed_by: str, field: str, old_val, new_val, action: str = "update"):
    db.add(models.AuditLog(
        goal_id=goal_id,
        changed_by=changed_by,
        field=field,
        old_val=str(old_val) if old_val is not None else None,
        new_val=str(new_val) if new_val is not None else None,
        action=action,
    ))


@router.post("/", response_model=schemas.GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: schemas.GoalCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in ("employee", "admin"):
        raise HTTPException(403, "Only employees can create goals")

    existing_count = db.query(models.Goal).filter(
        models.Goal.employee_id == current_user.id,
        models.Goal.status != "returned",
    ).count()
    if existing_count >= MAX_GOALS:
        raise HTTPException(400, f"Maximum {MAX_GOALS} goals allowed per employee")

    total_after = _check_weightage(db, current_user.id, payload.cycle_id, new_weightage=float(payload.weightage))
    if total_after > TOTAL_WEIGHTAGE:
        raise HTTPException(400, f"Total weightage would be {total_after}%. Cannot exceed 100%")

    goal = models.Goal(
        employee_id=current_user.id,
        cycle_id=payload.cycle_id,
        thrust_area=payload.thrust_area,
        title=payload.title,
        description=payload.description,
        uom_type=payload.uom_type,
        target=payload.target,
        weightage=payload.weightage,
        status="draft",
        locked=False,
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.get("/my", response_model=List[schemas.GoalOut])
def get_my_goals(
    cycle_id: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.Goal).filter(models.Goal.employee_id == current_user.id)
    if cycle_id:
        query = query.filter(models.Goal.cycle_id == cycle_id)
    return query.order_by(models.Goal.created_at.desc()).all()


@router.put("/{goal_id}", response_model=schemas.GoalOut)
def update_goal(
    goal_id: str,
    payload: schemas.GoalUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")
    if goal.locked:
        raise HTTPException(403, "Goal is locked. Contact admin to unlock.")
    if goal.employee_id != current_user.id and current_user.role not in ("manager", "admin"):
        raise HTTPException(403, "Not authorized to edit this goal")
    if goal.status not in ("draft", "returned") and current_user.role == "employee":
        raise HTTPException(400, "Cannot edit a submitted or approved goal")

    if goal.is_shared and current_user.role == "employee":
        if any([payload.title, payload.description, payload.target, payload.thrust_area, payload.uom_type]):
            raise HTTPException(403, "Only weightage can be modified on shared goals")

    if payload.weightage and float(payload.weightage) != float(goal.weightage):
        new_total = _check_weightage(
            db, goal.employee_id, str(goal.cycle_id),
            exclude_id=goal_id, new_weightage=float(payload.weightage)
        )
        if new_total > TOTAL_WEIGHTAGE:
            raise HTTPException(400, f"Total weightage would be {new_total}%. Cannot exceed 100%")
        goal.weightage = payload.weightage

    if payload.title and not goal.is_shared:
        goal.title = payload.title
    if payload.description and not goal.is_shared:
        goal.description = payload.description
    if payload.target is not None and not goal.is_shared:
        goal.target = payload.target
    if payload.uom_type and not goal.is_shared:
        goal.uom_type = payload.uom_type
    if payload.thrust_area and not goal.is_shared:
        goal.thrust_area = payload.thrust_area

    db.commit()
    db.refresh(goal)
    return goal


@router.post("/submit", response_model=dict)
def submit_goals(
    cycle_id: Optional[str] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(models.Goal).filter(
        models.Goal.employee_id == current_user.id,
        models.Goal.status == "draft",
    )
    if cycle_id:
        query = query.filter(models.Goal.cycle_id == cycle_id)
    draft_goals = query.all()

    if not draft_goals:
        raise HTTPException(400, "No draft goals to submit")

    all_active = db.query(models.Goal).filter(
        models.Goal.employee_id == current_user.id,
        models.Goal.status.in_(["draft", "submitted"]),
    )
    if cycle_id:
        all_active = all_active.filter(models.Goal.cycle_id == cycle_id)
    total_weight = sum(float(g.weightage) for g in all_active.all())

    if abs(total_weight - TOTAL_WEIGHTAGE) > 0.01:
        raise HTTPException(400, f"Total weightage must equal 100%. Current total: {total_weight}%")

    for goal in draft_goals:
        goal.status = "submitted"

    db.commit()
    return {"message": f"Submitted {len(draft_goals)} goal(s) successfully", "total_weightage": total_weight}


@router.get("/team", response_model=List[schemas.GoalWithEmployee])
def get_team_goals(
    employee_id: Optional[str] = None,
    cycle_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    current_user: models.User = Depends(require_role("manager", "admin")),
    db: Session = Depends(get_db),
):
    query = db.query(models.Goal)

    if current_user.role == "manager":
        subordinate_ids = [u.id for u in current_user.direct_reports]
        if not subordinate_ids:
            return []
        query = query.filter(models.Goal.employee_id.in_(subordinate_ids))

    if employee_id:
        query = query.filter(models.Goal.employee_id == employee_id)
    if cycle_id:
        query = query.filter(models.Goal.cycle_id == cycle_id)
    if status_filter:
        query = query.filter(models.Goal.status == status_filter)

    return query.order_by(models.Goal.updated_at.desc()).all()


@router.post("/{goal_id}/review", response_model=schemas.GoalOut)
def review_goal(
    goal_id: str,
    action: schemas.GoalApprovalAction,
    current_user: models.User = Depends(require_role("manager", "admin")),
    db: Session = Depends(get_db),
):
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")
    if goal.status != "submitted":
        raise HTTPException(400, f"Goal is in '{goal.status}' state. Can only review submitted goals.")

    if action.target is not None and float(action.target) != float(goal.target):
        _log_audit(db, goal_id, current_user.id, "target", goal.target, action.target)
        goal.target = action.target

    if action.weightage is not None and float(action.weightage) != float(goal.weightage):
        new_total = _check_weightage(
            db, str(goal.employee_id), str(goal.cycle_id),
            exclude_id=goal_id, new_weightage=float(action.weightage)
        )
        if new_total > TOTAL_WEIGHTAGE:
            raise HTTPException(400, f"Total weightage would be {new_total}%. Cannot exceed 100%")
        _log_audit(db, goal_id, current_user.id, "weightage", goal.weightage, action.weightage)
        goal.weightage = action.weightage

    if action.action == "approve":
        goal.status = "approved"
        goal.locked = True
        goal.return_comment = ""
        _log_audit(db, goal_id, current_user.id, "status", "submitted", "approved", action="approve")

        # When a shared goal's source is approved, auto-approve all linked copies
        if goal.is_shared or goal.shared_copies:
            for copy in goal.shared_copies:
                if action.target is not None:
                    copy.target = action.target
                copy.status = "approved"
                copy.locked = True

    elif action.action == "return":
        goal.status = "returned"
        goal.locked = False
        goal.return_comment = action.return_comment or ""
        _log_audit(db, goal_id, current_user.id, "status", "submitted", "returned", action="return")
    else:
        raise HTTPException(400, "action must be 'approve' or 'return'")

    db.commit()
    db.refresh(goal)
    return goal


@router.post("/{goal_id}/unlock", response_model=schemas.GoalOut)
def unlock_goal(
    goal_id: str,
    current_user: models.User = Depends(require_role("admin")),
    db: Session = Depends(get_db),
):
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")

    _log_audit(db, goal_id, current_user.id, "locked", True, False, action="admin_unlock")
    goal.locked = False
    db.commit()
    db.refresh(goal)
    return goal


@router.post("/shared", response_model=List[schemas.GoalOut], status_code=status.HTTP_201_CREATED)
def push_shared_goal(
    payload: schemas.SharedGoalPush,
    current_user: models.User = Depends(require_role("admin", "manager")),
    db: Session = Depends(get_db),
):
    source_goal = models.Goal(
        employee_id=current_user.id,
        cycle_id=payload.cycle_id,
        thrust_area=payload.thrust_area,
        title=payload.title,
        description=payload.description,
        uom_type=payload.uom_type,
        target=payload.target,
        weightage=payload.default_weightage,
        status="approved",
        is_shared=True,
        locked=True,
    )
    db.add(source_goal)
    db.flush()

    created = []
    for emp_id in payload.employee_ids:
        count = db.query(models.Goal).filter(
            models.Goal.employee_id == emp_id,
            models.Goal.status != "returned",
        ).count()
        if count >= MAX_GOALS:
            continue

        employee_goal = models.Goal(
            employee_id=emp_id,
            cycle_id=payload.cycle_id,
            thrust_area=payload.thrust_area,
            title=payload.title,
            description=payload.description,
            uom_type=payload.uom_type,
            target=payload.target,
            weightage=payload.default_weightage,
            status="approved",
            is_shared=True,
            shared_from_id=source_goal.id,
            locked=True,
        )
        db.add(employee_goal)
        created.append(employee_goal)

    db.commit()
    for g in created:
        db.refresh(g)
    return created


@router.get("/{goal_id}", response_model=schemas.GoalWithEmployee)
def get_goal(
    goal_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(
    goal_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")
    if goal.employee_id != current_user.id and current_user.role != "admin":
        raise HTTPException(403, "Not authorized")
    if goal.status not in ("draft", "returned"):
        raise HTTPException(400, "Can only delete draft or returned goals")
    if goal.locked:
        raise HTTPException(403, "Goal is locked")
    db.delete(goal)
    db.commit()
