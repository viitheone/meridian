from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

import models, schemas
from database import get_db
from auth import get_current_user
from utils.scoring import compute_score

router = APIRouter()


def _get_goal_and_check(db: Session, goal_id: str, user: models.User) -> models.Goal:
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")
    if goal.status != "approved":
        raise HTTPException(400, "Can only log achievements for approved goals")
    if user.role == "employee" and str(goal.employee_id) != str(user.id):
        raise HTTPException(403, "Not authorized")
    return goal


def _enrich_with_score(achievement: models.Achievement, goal: models.Goal) -> schemas.AchievementOut:
    """Runs the UoM scoring formula against the achievement and attaches the result as a percentage."""
    deadline = None
    if goal.uom_type == "timeline" and goal.target:
        try:
            deadline = date.fromisoformat(str(goal.target))
        except (ValueError, TypeError):
            deadline = None

    score = compute_score(
        uom_type=goal.uom_type,
        target=float(goal.target),
        achievement=float(achievement.actual),
        completion_date=achievement.completion_date,
        deadline=deadline,
    )
    out = schemas.AchievementOut.model_validate(achievement)
    out.score = round(score * 100, 1)
    return out


@router.post("/", response_model=schemas.AchievementOut, status_code=status.HTTP_201_CREATED)
def log_achievement(
    payload: schemas.AchievementCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    raise HTTPException(422, "Use /goals/{goal_id}/achievements endpoint")


@router.post("/goal/{goal_id}", response_model=schemas.AchievementOut, status_code=status.HTTP_201_CREATED)
def log_achievement_for_goal(
    goal_id: str,
    payload: schemas.AchievementCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = _get_goal_and_check(db, goal_id, current_user)

    existing = db.query(models.Achievement).filter(
        models.Achievement.goal_id == goal_id,
        models.Achievement.quarter == payload.quarter,
    ).first()

    if existing:
        existing.actual = payload.actual
        existing.status = payload.status
        existing.completion_date = payload.completion_date
        db.commit()
        db.refresh(existing)
        return _enrich_with_score(existing, goal)

    achievement = models.Achievement(
        goal_id=goal_id,
        quarter=payload.quarter,
        actual=payload.actual,
        status=payload.status,
        completion_date=payload.completion_date,
    )
    db.add(achievement)

    # When a shared goal gets an achievement, sync to all sibling copies from the same source
    if goal.shared_from_id:
        siblings = db.query(models.Goal).filter(
            models.Goal.shared_from_id == goal.shared_from_id,
            models.Goal.id != goal_id,
        ).all()
        for sibling in siblings:
            sib_ach = db.query(models.Achievement).filter(
                models.Achievement.goal_id == sibling.id,
                models.Achievement.quarter == payload.quarter,
            ).first()
            if sib_ach:
                sib_ach.actual = payload.actual
                sib_ach.status = payload.status
                sib_ach.completion_date = payload.completion_date
            else:
                db.add(models.Achievement(
                    goal_id=sibling.id,
                    quarter=payload.quarter,
                    actual=payload.actual,
                    status=payload.status,
                    completion_date=payload.completion_date,
                ))

    db.commit()
    db.refresh(achievement)
    return _enrich_with_score(achievement, goal)


@router.put("/goal/{goal_id}/{quarter}", response_model=schemas.AchievementOut)
def update_achievement(
    goal_id: str,
    quarter: str,
    payload: schemas.AchievementUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = _get_goal_and_check(db, goal_id, current_user)
    achievement = db.query(models.Achievement).filter(
        models.Achievement.goal_id == goal_id,
        models.Achievement.quarter == quarter,
    ).first()

    if not achievement:
        raise HTTPException(404, f"No achievement record for {quarter}")

    achievement.actual = payload.actual
    achievement.status = payload.status
    achievement.completion_date = payload.completion_date
    db.commit()
    db.refresh(achievement)
    return _enrich_with_score(achievement, goal)


@router.get("/goal/{goal_id}", response_model=List[schemas.AchievementOut])
def get_goal_achievements(
    goal_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")

    achievements = db.query(models.Achievement).filter(
        models.Achievement.goal_id == goal_id
    ).all()

    return [_enrich_with_score(a, goal) for a in achievements]
