import csv
import io
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional

import models, schemas
from database import get_db
from auth import require_role
from utils.scoring import compute_score

router = APIRouter()


def _compute_score_for(goal: models.Goal, achievement: models.Achievement) -> float:
    try:
        return compute_score(
            uom_type=goal.uom_type,
            target=float(goal.target),
            achievement=float(achievement.actual),
            completion_date=achievement.completion_date,
        ) * 100
    except Exception:
        return 0.0


@router.get("/achievement", response_model=List[schemas.GoalReportRow])
def achievement_report(
    quarter: Optional[str] = None,
    department: Optional[str] = None,
    current_user: models.User = Depends(require_role("manager", "admin")),
    db: Session = Depends(get_db),
):
    query = db.query(models.Goal).filter(models.Goal.status == "approved")

    if current_user.role == "manager":
        sub_ids = [str(u.id) for u in current_user.direct_reports]
        query = query.filter(models.Goal.employee_id.in_(sub_ids))

    goals = query.all()
    rows = []
    for goal in goals:
        employee = goal.employee
        if department and employee.department != department:
            continue

        ach_query = db.query(models.Achievement).filter(models.Achievement.goal_id == goal.id)
        if quarter:
            ach_query = ach_query.filter(models.Achievement.quarter == quarter)
        achievements = ach_query.all()

        if not achievements:
            rows.append(schemas.GoalReportRow(
                employee_name=employee.name,
                employee_email=employee.email,
                department=employee.department or "General",
                goal_title=goal.title,
                thrust_area=goal.thrust_area,
                uom_type=goal.uom_type,
                target=float(goal.target),
                weightage=float(goal.weightage),
                quarter=quarter or "All",
                actual=None,
                status="not_started",
                score=None,
            ))
        else:
            for ach in achievements:
                rows.append(schemas.GoalReportRow(
                    employee_name=employee.name,
                    employee_email=employee.email,
                    department=employee.department or "General",
                    goal_title=goal.title,
                    thrust_area=goal.thrust_area,
                    uom_type=goal.uom_type,
                    target=float(goal.target),
                    weightage=float(goal.weightage),
                    quarter=ach.quarter,
                    actual=float(ach.actual),
                    status=ach.status,
                    score=round(_compute_score_for(goal, ach), 1),
                ))
    return rows


@router.get("/export")
def export_csv(
    quarter: Optional[str] = None,
    department: Optional[str] = None,
    current_user: models.User = Depends(require_role("manager", "admin")),
    db: Session = Depends(get_db),
):
    query = db.query(models.Goal).filter(models.Goal.status == "approved")

    if current_user.role == "manager":
        sub_ids = [str(u.id) for u in current_user.direct_reports]
        query = query.filter(models.Goal.employee_id.in_(sub_ids))

    goals = query.all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Employee Name", "Email", "Department", "Thrust Area", "Goal Title",
        "UoM Type", "Target", "Weightage (%)", "Quarter",
        "Actual Achievement", "Status", "Score (%)"
    ])

    for goal in goals:
        employee = goal.employee
        if department and employee.department != department:
            continue

        ach_query = db.query(models.Achievement).filter(models.Achievement.goal_id == goal.id)
        if quarter:
            ach_query = ach_query.filter(models.Achievement.quarter == quarter)
        achievements = ach_query.all()

        if not achievements:
            writer.writerow([
                employee.name, employee.email, employee.department or "General",
                goal.thrust_area, goal.title, goal.uom_type,
                float(goal.target), float(goal.weightage),
                quarter or "N/A", "N/A", "Not Started", "N/A"
            ])
        else:
            for ach in achievements:
                score = _compute_score_for(goal, ach)
                writer.writerow([
                    employee.name, employee.email, employee.department or "General",
                    goal.thrust_area, goal.title, goal.uom_type,
                    float(goal.target), float(goal.weightage),
                    ach.quarter, float(ach.actual), ach.status, f"{score:.1f}%"
                ])

    output.seek(0)
    filename = f"meridian_achievement_report_{quarter or 'all'}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/completion", response_model=List[dict])
def completion_dashboard(
    quarter: Optional[str] = "Q1",
    current_user: models.User = Depends(require_role("manager", "admin")),
    db: Session = Depends(get_db),
):
    if current_user.role == "manager":
        employees = current_user.direct_reports
    else:
        employees = db.query(models.User).filter(models.User.role == "employee").all()

    results = []
    for emp in employees:
        approved_goals = db.query(models.Goal).filter(
            models.Goal.employee_id == emp.id,
            models.Goal.status == "approved",
        ).all()

        total_goals = len(approved_goals)
        goal_ids = [g.id for g in approved_goals]

        ach_count = db.query(models.Achievement).filter(
            models.Achievement.goal_id.in_(goal_ids),
            models.Achievement.quarter == quarter,
        ).count() if goal_ids else 0

        checkin_count = db.query(models.CheckinComment).filter(
            models.CheckinComment.goal_id.in_(goal_ids),
            models.CheckinComment.quarter == quarter,
        ).count() if goal_ids else 0

        results.append({
            "employee_id": str(emp.id),
            "employee_name": emp.name,
            "department": emp.department,
            "manager_name": emp.manager.name if emp.manager else None,
            "total_goals": total_goals,
            "achievements_logged": ach_count,
            "checkins_logged": checkin_count,
            "achievement_rate": round((ach_count / total_goals * 100) if total_goals else 0, 1),
            "checkin_complete": checkin_count > 0,
        })
    return results


@router.get("/audit", response_model=List[schemas.AuditLogOut])
def get_audit_trail(
    goal_id: Optional[str] = None,
    limit: int = 100,
    current_user: models.User = Depends(require_role("admin", "manager")),
    db: Session = Depends(get_db),
):
    query = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc())
    if goal_id:
        query = query.filter(models.AuditLog.goal_id == goal_id)
    return query.limit(limit).all()


@router.get("/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(
    current_user: models.User = Depends(require_role("admin", "manager")),
    db: Session = Depends(get_db),
):
    total_employees = db.query(models.User).filter(models.User.role == "employee").count()
    goals_submitted = db.query(models.Goal).filter(models.Goal.status == "submitted").count()
    goals_approved  = db.query(models.Goal).filter(models.Goal.status == "approved").count()
    goals_pending   = goals_submitted

    checkins_completed = db.query(models.Achievement).filter(
        models.Achievement.quarter == "Q1",
        models.Achievement.status != "not_started",
    ).count()

    total_goals = db.query(models.Goal).filter(models.Goal.status == "approved").count()
    avg_rate = round((goals_approved / max(total_goals + goals_submitted, 1)) * 100, 1)

    return schemas.DashboardStats(
        total_employees=total_employees,
        goals_submitted=goals_submitted,
        goals_approved=goals_approved,
        goals_pending=goals_pending,
        checkins_completed=checkins_completed,
        avg_completion_rate=avg_rate,
    )
