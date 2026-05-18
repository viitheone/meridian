from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from database import engine, Base
from routers import goals, achievements, checkins, cycles, users, reports


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Meridian - Goal Setting & Tracking Portal",
    description="Role-based goal lifecycle management: creation, approval, quarterly check-ins, and reporting.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router,        prefix="/api/users",        tags=["Users"])
app.include_router(goals.router,        prefix="/api/goals",        tags=["Goals"])
app.include_router(achievements.router, prefix="/api/achievements", tags=["Achievements"])
app.include_router(checkins.router,     prefix="/api/checkins",     tags=["Check-ins"])
app.include_router(cycles.router,       prefix="/api/cycles",       tags=["Cycles"])
app.include_router(reports.router,      prefix="/api/reports",      tags=["Reports"])


@app.get("/", tags=["Health"])
def health():
    return {"status": "ok", "app": "Meridian Goal Portal", "version": "1.0.0"}


@app.get("/api/health", tags=["Health"])
def api_health():
    return {"status": "ok"}
