#!/usr/bin/env python3
"""
Quick-start script for Meridian demo.
Run: python start_demo.py

Creates a SQLite-based demo (no Postgres needed) using SQLite via DATABASE_URL override.
"""
import os
import subprocess
import sys

# For a quick local demo with SQLite
os.environ.setdefault("DATABASE_URL", "sqlite:///./meridian_demo.db")
os.environ.setdefault("JWT_SECRET", "meridian-demo-secret-key-2026")

print("🚀 Meridian Demo Startup")
print("=" * 40)
print("  DB: SQLite (./backend/meridian_demo.db)")
print("  API: http://localhost:8000")
print("  Docs: http://localhost:8000/docs")
print()

# Run seeder
print("📦 Running seeder...")
result = subprocess.run(
    [sys.executable, "seed.py"],
    cwd=os.path.join(os.path.dirname(__file__), "backend"),
    env={**os.environ},
)
if result.returncode != 0:
    print("Seeder encountered an issue — check output above")
else:
    print()
    print("✅ Ready! Starting API server...")
    print()

# Start uvicorn
subprocess.run(
    [sys.executable, "-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
    cwd=os.path.join(os.path.dirname(__file__), "backend"),
    env={**os.environ},
)
