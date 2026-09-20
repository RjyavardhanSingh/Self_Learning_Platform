"""FastAPI application factory."""

from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI

from api.routes import contexts, materials, questions, sessions

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    app = FastAPI(
        title="Adaptive Oral Learning Platform",
        version="0.1.0",
        lifespan=lifespan,
        openapi_tags=[
            {"name": "Upload", "description": "Step 1 — Add study material"},
            {"name": "Goal", "description": "Step 2 — Define goal → context"},
            {"name": "Preparing", "description": "Step 3 — Generate practice set"},
            {"name": "Practice", "description": "Step 4 — Answer one at a time"},
            {"name": "Results", "description": "Step 5 — Readiness + weak areas"},
            {"name": "Retest", "description": "Step 6 — One-tap weak-area retest"},
        ],
    )

    app.include_router(materials.router)
    app.include_router(contexts.router)
    app.include_router(questions.router)
    app.include_router(sessions.router)

    @app.get("/health", tags=["health"])
    async def health():
        return {"status": "ok"}

    return app


app = create_app()
