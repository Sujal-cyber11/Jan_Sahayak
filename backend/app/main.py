"""FastAPI entrypoint. Creates tables + seeds DB on first startup."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import SessionLocal
from app.models import Scheme
from app.routers import router
from app.seed import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # create tables; seed if empty
    yield


app = FastAPI(title="JanSahayak AI API", lifespan=lifespan)
app.include_router(router)

# Dev-only CORS: the Vite dev server on localhost:5173.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    """Basic health check used by the frontend to test connectivity."""
    with SessionLocal() as db:
        count = db.query(Scheme).count()
    return {
        "status": "ok",
        "schemes": count,
        # Frontend uses this to show a friendly note when the AI
        # assistant is not configured yet.
        "groq_configured": bool(settings.groq_api_key),
    }
