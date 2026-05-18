-- Meridian Goal Setting & Tracking Portal
-- Full Schema + Seed Data for Demo
-- Run this in Supabase SQL editor

-- ========================================================
-- EXTENSIONS
-- ========================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================================
-- TABLES
-- ========================================================

-- Users table (mirrors Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('employee', 'manager', 'admin')),
    manager_id UUID REFERENCES public.users(id),
    department TEXT DEFAULT 'General',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal cycles (fiscal periods)
CREATE TABLE IF NOT EXISTS public.goal_cycles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INT NOT NULL,
    phase TEXT NOT NULL,
    window_open DATE NOT NULL,
    window_close DATE NOT NULL,
    is_active BOOL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    cycle_id UUID REFERENCES public.goal_cycles(id),
    thrust_area TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    uom_type TEXT NOT NULL CHECK (uom_type IN ('min', 'max', 'timeline', 'zero')),
    target NUMERIC DEFAULT 0,
    weightage NUMERIC NOT NULL CHECK (weightage >= 10 AND weightage <= 100),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'returned')),
    is_shared BOOL DEFAULT false,
    shared_from_id UUID REFERENCES public.goals(id),
    locked BOOL DEFAULT false,
    return_comment TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievement tracking (quarterly)
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    quarter TEXT NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
    actual NUMERIC DEFAULT 0,
    completion_date DATE,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'on_track', 'completed')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(goal_id, quarter)
);

-- Manager check-in comments
CREATE TABLE IF NOT EXISTS public.checkin_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES public.users(id),
    quarter TEXT NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log (changes after lock)
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID REFERENCES public.goals(id),
    changed_by UUID REFERENCES public.users(id),
    field TEXT NOT NULL,
    old_val TEXT,
    new_val TEXT,
    action TEXT NOT NULL DEFAULT 'update',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- INDEXES
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_goals_employee ON public.goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);
CREATE INDEX IF NOT EXISTS idx_achievements_goal ON public.achievements(goal_id);
CREATE INDEX IF NOT EXISTS idx_audit_goal ON public.audit_log(goal_id);
CREATE INDEX IF NOT EXISTS idx_checkin_goal ON public.checkin_comments(goal_id);

-- ========================================================
-- FUNCTIONS & TRIGGERS
-- ========================================================

-- Auto-update updated_at on goals
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER achievements_updated_at
    BEFORE UPDATE ON public.achievements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================================================
-- DEMO DATA SEED
-- ========================================================

-- Admin user
INSERT INTO public.users (id, name, email, role, department)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Admin HR',
    'admin@meridian.demo',
    'admin',
    'HR'
) ON CONFLICT (email) DO NOTHING;

-- Manager
INSERT INTO public.users (id, name, email, role, department)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Carol Singh',
    'carol@meridian.demo',
    'manager',
    'Engineering'
) ON CONFLICT (email) DO NOTHING;

-- Employees
INSERT INTO public.users (id, name, email, role, manager_id, department)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'Alice Patel',
    'alice@meridian.demo',
    'employee',
    '00000000-0000-0000-0000-000000000002',
    'Engineering'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, name, email, role, manager_id, department)
VALUES (
    '00000000-0000-0000-0000-000000000004',
    'Bob Kumar',
    'bob@meridian.demo',
    'employee',
    '00000000-0000-0000-0000-000000000002',
    'Engineering'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO public.users (id, name, email, role, manager_id, department)
VALUES (
    '00000000-0000-0000-0000-000000000005',
    'Diana Mehta',
    'diana@meridian.demo',
    'employee',
    '00000000-0000-0000-0000-000000000002',
    'Engineering'
) ON CONFLICT (email) DO NOTHING;

-- Active goal cycle
INSERT INTO public.goal_cycles (id, year, phase, window_open, window_close, is_active)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    2026,
    'Goal Setting',
    '2026-05-01',
    '2026-06-30',
    true
) ON CONFLICT DO NOTHING;

-- Alice's goals (approved + locked - demo data)
INSERT INTO public.goals (id, employee_id, cycle_id, thrust_area, title, description, uom_type, target, weightage, status, locked)
VALUES (
    '00000000-0000-0000-0000-000000000100',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000010',
    'Revenue Growth',
    'Increase Q2 Sales Revenue',
    'Achieve sales revenue of ₹50L in Q2 FY2026',
    'min',
    50,
    30,
    'approved',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.goals (id, employee_id, cycle_id, thrust_area, title, description, uom_type, target, weightage, status, locked)
VALUES (
    '00000000-0000-0000-0000-000000000101',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000010',
    'Customer Experience',
    'Reduce Customer TAT',
    'Reduce average resolution time from 48h to 24h',
    'max',
    24,
    25,
    'approved',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.goals (id, employee_id, cycle_id, thrust_area, title, description, uom_type, target, weightage, status, locked)
VALUES (
    '00000000-0000-0000-0000-000000000102',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000010',
    'Safety & Compliance',
    'Zero Safety Incidents',
    'Maintain zero workplace safety incidents throughout FY2026',
    'zero',
    0,
    20,
    'approved',
    true
) ON CONFLICT DO NOTHING;

INSERT INTO public.goals (id, employee_id, cycle_id, thrust_area, title, description, uom_type, target, weightage, status, locked)
VALUES (
    '00000000-0000-0000-0000-000000000103',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000010',
    'Digital Transformation',
    'Complete ERP Migration',
    'Complete migration to new ERP system by Q3',
    'timeline',
    0,
    25,
    'approved',
    true
) ON CONFLICT DO NOTHING;

-- Bob's goals (submitted, pending approval)
INSERT INTO public.goals (id, employee_id, cycle_id, thrust_area, title, description, uom_type, target, weightage, status, locked)
VALUES (
    '00000000-0000-0000-0000-000000000200',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000010',
    'Revenue Growth',
    'New Client Acquisition',
    'Acquire 15 new enterprise clients in FY2026',
    'min',
    15,
    40,
    'submitted',
    false
) ON CONFLICT DO NOTHING;

INSERT INTO public.goals (id, employee_id, cycle_id, thrust_area, title, description, uom_type, target, weightage, status, locked)
VALUES (
    '00000000-0000-0000-0000-000000000201',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000010',
    'Process Excellence',
    'Reduce Operational Cost',
    'Reduce operational costs by 15% through process improvements',
    'max',
    85,
    35,
    'submitted',
    false
) ON CONFLICT DO NOTHING;

INSERT INTO public.goals (id, employee_id, cycle_id, thrust_area, title, description, uom_type, target, weightage, status, locked)
VALUES (
    '00000000-0000-0000-0000-000000000202',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000010',
    'People Development',
    'Team Training Completion',
    'Ensure 100% team training completion by Q2',
    'timeline',
    0,
    25,
    'submitted',
    false
) ON CONFLICT DO NOTHING;

-- Alice's Q1 achievements (demo)
INSERT INTO public.achievements (goal_id, quarter, actual, status)
VALUES ('00000000-0000-0000-0000-000000000100', 'Q1', 38, 'on_track') ON CONFLICT (goal_id, quarter) DO NOTHING;
INSERT INTO public.achievements (goal_id, quarter, actual, status)
VALUES ('00000000-0000-0000-0000-000000000101', 'Q1', 30, 'on_track') ON CONFLICT (goal_id, quarter) DO NOTHING;
INSERT INTO public.achievements (goal_id, quarter, actual, status)
VALUES ('00000000-0000-0000-0000-000000000102', 'Q1', 0, 'completed') ON CONFLICT (goal_id, quarter) DO NOTHING;
INSERT INTO public.achievements (goal_id, quarter, actual, status)
VALUES ('00000000-0000-0000-0000-000000000103', 'Q1', 0, 'not_started') ON CONFLICT (goal_id, quarter) DO NOTHING;

-- Manager check-in comment
INSERT INTO public.checkin_comments (goal_id, manager_id, quarter, comment)
VALUES (
    '00000000-0000-0000-0000-000000000100',
    '00000000-0000-0000-0000-000000000002',
    'Q1',
    'Alice is making solid progress on revenue. Discussed pipeline health — 3 deals expected to close in Q2. Keep up the momentum.'
) ON CONFLICT DO NOTHING;

-- Sample audit log entry
INSERT INTO public.audit_log (goal_id, changed_by, field, old_val, new_val, action)
VALUES (
    '00000000-0000-0000-0000-000000000100',
    '00000000-0000-0000-0000-000000000002',
    'weightage',
    '25',
    '30',
    'update'
) ON CONFLICT DO NOTHING;
