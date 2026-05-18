import uuid
import os
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Boolean, Numeric, Integer,
    DateTime, Date, ForeignKey, CheckConstraint, UniqueConstraint
)
from sqlalchemy.orm import relationship
from database import Base


def gen_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id         = Column(String(36), primary_key=True, default=gen_uuid)
    name       = Column(String(255), nullable=False)
    email      = Column(String(255), unique=True, nullable=False, index=True)
    role       = Column(String(50), nullable=False)
    manager_id = Column(String(36), ForeignKey("users.id"), nullable=True)
    department = Column(String(255), default="General")
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("role IN ('employee', 'manager', 'admin')", name="chk_user_role"),
    )

    manager       = relationship("User", remote_side=[id], backref="direct_reports")
    goals         = relationship("Goal", back_populates="employee", foreign_keys="Goal.employee_id")


class GoalCycle(Base):
    __tablename__ = "goal_cycles"

    id           = Column(String(36), primary_key=True, default=gen_uuid)
    year         = Column(Integer, nullable=False)
    phase        = Column(String(100), nullable=False)
    window_open  = Column(Date, nullable=False)
    window_close = Column(Date, nullable=False)
    is_active    = Column(Boolean, default=False)
    created_at   = Column(DateTime, default=datetime.utcnow)

    goals = relationship("Goal", back_populates="cycle")


class Goal(Base):
    __tablename__ = "goals"

    id             = Column(String(36), primary_key=True, default=gen_uuid)
    employee_id    = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    cycle_id       = Column(String(36), ForeignKey("goal_cycles.id"), nullable=True)
    thrust_area    = Column(String(255), nullable=False)
    title          = Column(String(500), nullable=False)
    description    = Column(Text, default="")
    uom_type       = Column(String(50), nullable=False)
    target         = Column(Numeric, default=0)
    weightage      = Column(Numeric, nullable=False)
    status         = Column(String(50), nullable=False, default="draft")
    is_shared      = Column(Boolean, default=False)
    shared_from_id = Column(String(36), ForeignKey("goals.id"), nullable=True)
    locked         = Column(Boolean, default=False)
    return_comment = Column(Text, default="")
    created_at     = Column(DateTime, default=datetime.utcnow)
    updated_at     = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("uom_type IN ('min', 'max', 'timeline', 'zero')", name="chk_uom_type"),
        CheckConstraint("status IN ('draft', 'submitted', 'approved', 'returned')", name="chk_goal_status"),
        CheckConstraint("weightage >= 10 AND weightage <= 100", name="chk_weightage"),
    )

    employee         = relationship("User", back_populates="goals", foreign_keys=[employee_id])
    cycle            = relationship("GoalCycle", back_populates="goals")
    achievements     = relationship("Achievement", back_populates="goal", cascade="all, delete-orphan")
    checkin_comments = relationship("CheckinComment", back_populates="goal", cascade="all, delete-orphan")
    audit_logs       = relationship("AuditLog", back_populates="goal")
    shared_copies    = relationship("Goal", foreign_keys="Goal.shared_from_id")
    shared_from      = relationship("Goal", foreign_keys=[shared_from_id], remote_side=[id], overlaps="shared_copies")


class Achievement(Base):
    __tablename__ = "achievements"

    id              = Column(String(36), primary_key=True, default=gen_uuid)
    goal_id         = Column(String(36), ForeignKey("goals.id"), nullable=False, index=True)
    quarter         = Column(String(10), nullable=False)
    actual          = Column(Numeric, default=0)
    completion_date = Column(Date, nullable=True)
    status          = Column(String(50), nullable=False, default="not_started")
    score           = Column(Numeric, nullable=True)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("quarter IN ('Q1', 'Q2', 'Q3', 'Q4')", name="chk_quarter"),
        CheckConstraint("status IN ('not_started', 'on_track', 'completed')", name="chk_ach_status"),
        UniqueConstraint("goal_id", "quarter", name="uq_goal_quarter"),
    )

    goal = relationship("Goal", back_populates="achievements")


class CheckinComment(Base):
    __tablename__ = "checkin_comments"

    id         = Column(String(36), primary_key=True, default=gen_uuid)
    goal_id    = Column(String(36), ForeignKey("goals.id"), nullable=False, index=True)
    manager_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    quarter    = Column(String(10), nullable=False)
    comment    = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    goal    = relationship("Goal", back_populates="checkin_comments")
    manager = relationship("User", foreign_keys=[manager_id])


class AuditLog(Base):
    __tablename__ = "audit_log"

    id         = Column(String(36), primary_key=True, default=gen_uuid)
    goal_id    = Column(String(36), ForeignKey("goals.id"), nullable=True, index=True)
    changed_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    field      = Column(String(255), nullable=False)
    old_val    = Column(Text, nullable=True)
    new_val    = Column(Text, nullable=True)
    action     = Column(String(50), default="update")
    timestamp  = Column(DateTime, default=datetime.utcnow)

    goal    = relationship("Goal", back_populates="audit_logs")
    changer = relationship("User", foreign_keys=[changed_by])
