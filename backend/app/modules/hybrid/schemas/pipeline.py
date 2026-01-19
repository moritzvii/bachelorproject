from __future__ import annotations
from pydantic import BaseModel


class PipelineStatusResponse(BaseModel):
    status: str
    message: str
    error: str | None = None


class WorkdirCleanResponse(BaseModel):
    removed: list[str]
    skipped: list[str]
    errors: list[str] = []


class PipelineCurrentStatus(BaseModel):
    status: str
    current_stage: str
    stage_name: str
    timestamp: str
    progress: float = 0.0
    estimated_seconds_remaining: int = 0
