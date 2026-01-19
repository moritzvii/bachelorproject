from __future__ import annotations
from pathlib import Path
from typing import Any
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    OPENAI_API_KEY: str | None = None
    EMBED_PROVIDER: str = "openai"
    EMBED_MODEL: str = "text-embedding-3-small"
    EMBED_MODEL_DIM: int = 1536
    INDEX_DIM: int = 1536
    CORPUS_NAME: str = "aapl_10k_2015_2025"
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    JWT_SECRET: str = "change-me"
    JWT_ISS: str = "hi-dss"
    SESSION_TTL_MIN: int = 120
    REFRESH_TTL_DAYS: int = 7
    COOKIE_DOMAIN: str | None = None
    FRONTEND_ORIGINS: list[str] = [
        "http://localhost:5173",
        "https://hybridintelligence.dev",
    ]
    APP_ENV: str = "dev"
    model_config = SettingsConfigDict(env_file=BASE.parent / ".env", extra="ignore")

    @field_validator("FRONTEND_ORIGINS", mode="before")
    @classmethod
    def _split_origins(cls, value: Any) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        if isinstance(value, (list, tuple)):
            return [str(origin).strip() for origin in value if str(origin).strip()]
        raise TypeError(
            "FRONTEND_ORIGINS must be provided as a comma separated string or list."
        )


settings = Settings()

__all__ = ["Settings", "settings"]
