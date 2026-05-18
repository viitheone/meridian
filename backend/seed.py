# -*- coding: utf-8 -*-
"""
Demo Data Seeder -- Meridian Goal Portal
Run: python seed.py

Creates demo users + a complete goal cycle with realistic data so judges
can immediately explore all features without manual setup.
"""
import os
import sys

load_env = True
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from datetime import date
from database import SessionLocal, engine, Base
import models

# Create all tables
Base.metadata.create_all(bind=engine)

# Fixed UUIDs for reproducibility
ADMIN_ID   = "00000000-0000-0000-0000-000000000001"
MANAGER_ID = "00000000-0000-0000-0000-000000000002"
ALICE_ID   = "00000000-0000-0000-0000-000000000003"
BOB_ID     = "00000000-0000-0000-0000-000000000004"
DIANA_ID   = "00000000-0000-0000-0000-000000000005"
CYCLE_ID   = "00000000-0000-0000-0000-000000000010"

A_G1 = "00000000-0000-0000-0000-000000000100"
A_G2 = "00000000-0000-0000-0000-000000000101"
A_G3 = "00000000-0000-0000-0000-000000000102"
A_G4 = "00000000-0000-0000-0000-000000000103"

B_G1 = "00000000-0000-0000-0000-000000000200"
B_G2 = "00000000-0000-0000-0000-000000000201"
B_G3 = "00000000-0000-0000-0000-000000000202"


def seed():
    db = SessionLocal()
    try:
        print("[SEED] Seeding Meridian demo data...")

        # -- Users --------------------------------------------------------
        def upsert_user(id, name, email, role, dept, manager_id=None):
            existing = db.query(models.User).filter(models.User.id == id).first()
            if not existing:
                db.add(models.User(id=id, name=name, email=email, role=role,
                                   department=dept, manager_id=manager_id))
                print(f"  [+] User created: {name} ({role})")
            else:
                print(f"  [~] User exists:  {name}")

        upsert_user(ADMIN_ID,   "Admin HR",     "admin@meridian.demo",  "admin",    "HR")
        upsert_user(MANAGER_ID, "Carol Singh",  "carol@meridian.demo",  "manager",  "Engineering")
        upsert_user(ALICE_ID,   "Alice Patel",  "alice@meridian.demo",  "employee", "Engineering", MANAGER_ID)
        upsert_user(BOB_ID,     "Bob Kumar",    "bob@meridian.demo",    "employee", "Engineering", MANAGER_ID)
        upsert_user(DIANA_ID,   "Diana Mehta",  "diana@meridian.demo",  "employee", "Engineering", MANAGER_ID)
        db.commit()

        # -- Cycle --------------------------------------------------------
        if not db.query(models.GoalCycle).filter(models.GoalCycle.id == CYCLE_ID).first():
            db.add(models.GoalCycle(
                id=CYCLE_ID, year=2026, phase="Goal Setting",
                window_open=date(2026, 5, 1), window_close=date(2026, 6, 30),
                is_active=True,
            ))
            print("  [+] Goal cycle FY2026 created")
        db.commit()

        # -- Alice's goals (approved + locked) ----------------------------
        alice_goals = [
            dict(id=A_G1, thrust_area="Revenue Growth",
                 title="Increase Q2 Sales Revenue",
                 description="Achieve Rs.50L in Q2 FY2026 through new client acquisition and upsells.",
                 uom_type="min", target=50, weightage=30),
            dict(id=A_G2, thrust_area="Customer Experience",
                 title="Reduce Customer TAT",
                 description="Cut average resolution time from 48h to 24h via SLA enforcement.",
                 uom_type="max", target=24, weightage=25),
            dict(id=A_G3, thrust_area="Safety & Compliance",
                 title="Zero Safety Incidents",
                 description="Maintain zero workplace safety incidents throughout FY2026.",
                 uom_type="zero", target=0, weightage=20),
            dict(id=A_G4, thrust_area="Digital Transformation",
                 title="Complete ERP Migration",
                 description="Complete full migration to SAP S/4HANA by Q3 end.",
                 uom_type="timeline", target=0, weightage=25),
        ]
        for g in alice_goals:
            if not db.query(models.Goal).filter(models.Goal.id == g["id"]).first():
                db.add(models.Goal(
                    **g, employee_id=ALICE_ID, cycle_id=CYCLE_ID,
                    status="approved", locked=True,
                ))
                print(f"  [+] Alice goal: {g['title']}")
        db.commit()

        # -- Bob's goals (submitted -- pending approval) ------------------
        bob_goals = [
            dict(id=B_G1, thrust_area="Revenue Growth",
                 title="New Client Acquisition",
                 description="Acquire 15 new enterprise clients in FY2026.",
                 uom_type="min", target=15, weightage=40),
            dict(id=B_G2, thrust_area="Process Excellence",
                 title="Reduce Operational Cost",
                 description="Reduce operational costs by 15% through process improvements.",
                 uom_type="max", target=85, weightage=35),
            dict(id=B_G3, thrust_area="People Development",
                 title="Team Training Completion",
                 description="100% team training completion by Q2 end.",
                 uom_type="timeline", target=0, weightage=25),
        ]
        for g in bob_goals:
            if not db.query(models.Goal).filter(models.Goal.id == g["id"]).first():
                db.add(models.Goal(
                    **g, employee_id=BOB_ID, cycle_id=CYCLE_ID,
                    status="submitted", locked=False,
                ))
                print(f"  [+] Bob goal: {g['title']}")
        db.commit()

        # -- Alice Q1 + Q2 achievements -----------------------------------
        ach_data = [
            (A_G1, "Q1", 38, "on_track",    None),
            (A_G1, "Q2", 47, "on_track",    None),
            (A_G2, "Q1", 30, "on_track",    None),
            (A_G3, "Q1", 0,  "completed",   None),
            (A_G3, "Q2", 0,  "completed",   None),
            (A_G4, "Q1", 0,  "not_started", None),
        ]
        for goal_id, quarter, actual, status, comp_date in ach_data:
            if not db.query(models.Achievement).filter(
                models.Achievement.goal_id == goal_id,
                models.Achievement.quarter == quarter,
            ).first():
                db.add(models.Achievement(
                    goal_id=goal_id, quarter=quarter,
                    actual=actual, status=status,
                    completion_date=comp_date,
                ))
        db.commit()
        print("  [+] Alice achievements seeded")

        # -- Manager check-in comments ------------------------------------
        if not db.query(models.CheckinComment).filter(
            models.CheckinComment.goal_id == A_G1,
            models.CheckinComment.quarter == "Q1",
        ).first():
            db.add(models.CheckinComment(
                goal_id=A_G1, manager_id=MANAGER_ID, quarter="Q1",
                comment=(
                    "Alice is making solid progress on revenue -- Rs.38L vs Rs.50L target. "
                    "3 deals in advanced negotiation expected to close in Q2. "
                    "Keep focus on the pipeline; review BD strategy in mid-June sync."
                ),
            ))
            db.add(models.CheckinComment(
                goal_id=A_G2, manager_id=MANAGER_ID, quarter="Q1",
                comment=(
                    "TAT has improved from 48h to 30h -- good progress. "
                    "Need to hit 24h by Q3. Recommended implementing auto-routing tickets."
                ),
            ))
        db.commit()
        print("  [+] Manager check-in comments seeded")

        # -- Audit log entries --------------------------------------------
        if not db.query(models.AuditLog).filter(models.AuditLog.goal_id == A_G1).first():
            db.add(models.AuditLog(
                goal_id=A_G1, changed_by=MANAGER_ID,
                field="weightage", old_val="25", new_val="30",
                action="update",
            ))
            db.add(models.AuditLog(
                goal_id=A_G1, changed_by=MANAGER_ID,
                field="status", old_val="submitted", new_val="approved",
                action="approve",
            ))
            db.add(models.AuditLog(
                goal_id=B_G1, changed_by=MANAGER_ID,
                field="target", old_val="12", new_val="15",
                action="update",
            ))
        db.commit()
        print("  [+] Audit log entries seeded")

        print("\n[OK] Seed complete! Demo data ready.")
        print("\nDemo logins (password: demo1234):")
        print("  Employee : alice@meridian.demo")
        print("  Employee : bob@meridian.demo")
        print("  Manager  : carol@meridian.demo")
        print("  Admin/HR : admin@meridian.demo")

    except Exception as e:
        db.rollback()
        print(f"\n[FAIL] Seed failed: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
