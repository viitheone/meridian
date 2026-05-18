import sys
import os

# Add backend directory to Python path so imports like `from database import engine` work
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from main import app  # noqa: F401, E402 — re-export FastAPI app for Vercel
