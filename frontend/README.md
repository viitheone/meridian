# Meridian | Goal Setting & Tracking Portal

A full-stack, role-based goal management system supporting the complete goal lifecycle: creation, approval, quarterly check-ins, and performance reporting.

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (or SQLite for local dev)

### Backend

```bash
cd backend
pip install -r requirements.txt

# Seed demo data (creates a local SQLite DB automatically if no .env is set)
python seed.py

# Start API
python -m uvicorn main:app --reload --port 8000
```

API docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Employee (Alice) | alice@meridian.demo | demo1234 |
| Employee (Bob) | bob@meridian.demo | demo1234 |
| Manager (Carol) | carol@meridian.demo | demo1234 |
| Admin / HR | admin@meridian.demo | demo1234 |

## Architecture

```
Browser (React + Vite)
    -> REST API (axios)
FastAPI (Python) - /api/*
    -> SQLAlchemy ORM
PostgreSQL / SQLite
```

## Features

**Goal Creation & Approval**
- Employee goal form with Thrust Area, UoM type, Target, Weightage
- Live weightage counter (green at 100%, red if over)
- Validation enforced on both frontend and backend: total = 100%, min 10% per goal, max 8 goals
- Manager approval workflow with inline target/weightage editing
- Approve locks the goal; Return sends it back with a comment
- Admin can push shared departmental KPIs to multiple employees

**Achievement Tracking**
- Quarterly check-in form (Q1-Q4) per goal
- Live score preview as you type
- Four UoM scoring formulas:
  - `min`: Achievement / Target (higher is better)
  - `max`: Target / Achievement (lower is better)
  - `timeline`: 100% if on time, penalised by days late
  - `zero`: 0 incidents = 100%, anything else = 0%
- Manager check-in: planned vs actual view with comment logging

**Reports & Governance**
- Achievement report in JSON and CSV export
- Real-time completion dashboard per employee
- Full audit trail of all post-lock changes

## Validation Rules

| Rule | Frontend | Backend |
|------|----------|---------|
| Total weightage = 100% | Live counter + blocks submit | 400 on submit |
| Min weightage = 10% | Input validation | Pydantic + DB constraint |
| Max 8 goals | Goal count indicator | 400 on create |
| Goals locked after approval | Disabled fields | 403 on PUT |
| Shared goals: title/target read-only | Disabled inputs | 403 on field update |

## Project Structure

```
meridian/
├── backend/
│   ├── main.py
│   ├── models.py       SQLAlchemy ORM models
│   ├── schemas.py      Pydantic request/response schemas
│   ├── auth.py         JWT auth + demo header mode
│   ├── seed.py         Demo data seeder
│   ├── utils/
│   │   └── scoring.py  UoM score computation
│   └── routers/
│       ├── goals.py
│       ├── achievements.py
│       ├── checkins.py
│       ├── cycles.py
│       ├── users.py
│       └── reports.py
└── frontend/
    └── src/
        ├── pages/
        │   ├── Login.tsx
        │   ├── Dashboard.tsx
        │   ├── employee/
        │   ├── manager/
        │   ├── admin/
        │   └── Reports.tsx
        ├── components/
        └── lib/
```
