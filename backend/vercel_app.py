"""
Vercel serverless entry point for FastAPI.
Vercel expects a WSGI/ASGI app exported as `app` from this file.
"""
from main import app  # noqa: F401 – re-export for Vercel
