from __future__ import annotations
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.config.settings import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title="HI Decision Support API",
        version="1.0.0",
        description="Surface helper pipeline insights to the frontend.",
    )
    _configure_cors(app)
    _register_routes(app)
    _register_healthcheck(app)
    return app


def _configure_cors(app: FastAPI) -> None:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.FRONTEND_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def _register_routes(app: FastAPI) -> None:
    app.include_router(api_router)


def _register_healthcheck(app: FastAPI) -> None:
    @app.get("/health", tags=["system"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ready", tags=["system"])
    def ready() -> dict[str, str]:
        return {"status": "ready"}


app = create_app()
