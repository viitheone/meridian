from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum


class UserRole(str, Enum):
    employee = "employee"
    manager = "manager"
    admin = "admin"


class UoMType(str, Enum):
    min = "min"           # Higher actual is better (e.g. sales revenue)
    max = "max"           # Lower actual is better (e.g. TAT, cost)
    timeline = "timeline" # Success = completing by the target date
    zero = "zero"         # Zero incidents = 100% score


class GoalStatus(str, Enum):
    draft = "draft"
    submitted = "submitted"
    approved = "approved"
    returned = "returned"


class AchievementStatus(str, Enum):
    not_started = "not_started"
    on_track = "on_track"
    completed = "completed"


class Quarter(str, Enum):
    Q1 = "Q1"
    Q2 = "Q2"
    Q3 = "Q3"
    Q4 = "Q4"


class UserBase(BaseModel):
    name: str
    email: str
    role: UserRole
    department: Optional[str] = "General"


class UserCreate(UserBase):
    manager_id: Optional[str] = None


class UserOut(UserBase):
    id: str
    manager_id: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserWithManager(UserOut):
    manager: Optional[UserOut] = None

    model_config = {"from_attributes": True}


class CycleBase(BaseModel):
    year: int
    phase: str
    window_open: date
    window_close: date
    is_active: bool = False


class CycleCreate(CycleBase):
    pass


class CycleOut(CycleBase):
    id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class GoalBase(BaseModel):
    thrust_area: str
    title: str
    description: Optional[str] = ""
    uom_type: UoMType
    target: float = 0
    weightage: float = Field(..., ge=10, le=100)


class GoalCreate(GoalBase):
    cycle_id: Optional[str] = None


class GoalUpdate(BaseModel):
    thrust_area: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    uom_type: Optional[UoMType] = None
    target: Optional[float] = None
    weightage: Optional[float] = Field(None, ge=10, le=100)


class GoalManagerUpdate(BaseModel):
    target: Optional[float] = None
    weightage: Optional[float] = Field(None, ge=10, le=100)
    return_comment: Optional[str] = None


class GoalApprovalAction(BaseModel):
    action: str  # "approve" or "return"
    return_comment: Optional[str] = None
    target: Optional[float] = None
    weightage: Optional[float] = None


class GoalOut(GoalBase):
    id: str
    employee_id: str
    cycle_id: Optional[str] = None
    status: GoalStatus
    is_shared: bool
    shared_from_id: Optional[str] = None
    locked: bool
    return_comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GoalWithEmployee(GoalOut):
    employee: Optional[UserOut] = None

    model_config = {"from_attributes": True}


class SharedGoalPush(BaseModel):
    """Pushes a shared KPI goal to a list of employees. Title and target become read-only for recipients."""
    thrust_area: str
    title: str
    description: Optional[str] = ""
    uom_type: UoMType
    target: float
    employee_ids: List[str]
    default_weightage: float = Field(10, ge=10, le=100)
    cycle_id: Optional[str] = None


class AchievementBase(BaseModel):
    actual: float = 0
    status: AchievementStatus
    completion_date: Optional[date] = None


class AchievementCreate(AchievementBase):
    quarter: Quarter


class AchievementUpdate(AchievementBase):
    pass


class AchievementOut(AchievementBase):
    id: str
    goal_id: str
    quarter: str
    updated_at: datetime
    score: Optional[float] = None

    model_config = {"from_attributes": True}


class CheckinCreate(BaseModel):
    goal_id: str
    quarter: Quarter
    comment: str


class CheckinOut(BaseModel):
    id: str
    goal_id: str
    manager_id: str
    quarter: str
    comment: str
    created_at: datetime
    manager: Optional[UserOut] = None

    model_config = {"from_attributes": True}


class AuditLogOut(BaseModel):
    id: str
    goal_id: Optional[str] = None
    changed_by: Optional[str] = None
    field: str
    old_val: Optional[str] = None
    new_val: Optional[str] = None
    action: str
    timestamp: datetime
    changer: Optional[UserOut] = None

    model_config = {"from_attributes": True}


class GoalReportRow(BaseModel):
    employee_name: str
    employee_email: str
    department: str
    goal_title: str
    thrust_area: str
    uom_type: str
    target: float
    weightage: float
    quarter: str
    actual: Optional[float] = None
    status: Optional[str] = None
    score: Optional[float] = None


class DashboardStats(BaseModel):
    total_employees: int
    goals_submitted: int
    goals_approved: int
    goals_pending: int
    checkins_completed: int
    avg_completion_rate: float


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenUser(BaseModel):
    id: str
    email: str
    role: str
    name: str
