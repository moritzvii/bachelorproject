from __future__ import annotations
import json
from fastapi import APIRouter, HTTPException, status
from app.infrastructure.paths import get_paths
from app.modules.hybrid.services.pipeline import clean_workdir_out_dirs, run_pipeline
from app.modules.hybrid.schemas.pipeline import (
    PipelineCurrentStatus,
    PipelineStatusResponse,
    WorkdirCleanResponse,
)

router = APIRouter()
paths = get_paths()


@router.post("/pipeline/clean", response_model=WorkdirCleanResponse)
def clean_pipeline_workdir() -> WorkdirCleanResponse:
    try:
        cleaned = clean_workdir_out_dirs(paths)
        return WorkdirCleanResponse(**cleaned)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clean pipeline workdir: {exc!s}",
        ) from exc


@router.post("/pipeline/run", response_model=PipelineStatusResponse)
def run_pipeline_endpoint() -> PipelineStatusResponse:
    payload = run_pipeline(paths)
    return PipelineStatusResponse(**payload)


@router.get("/pipeline/status", response_model=PipelineCurrentStatus)
def get_pipeline_status() -> PipelineCurrentStatus:
    if not paths.pipeline_status_file.exists():
        return PipelineCurrentStatus(
            status="idle",
            current_stage="none",
            stage_name="No pipeline running",
            timestamp="",
            progress=0.0,
            estimated_seconds_remaining=0,
        )
    try:
        with open(paths.pipeline_status_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        return PipelineCurrentStatus(**data)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse pipeline status",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read pipeline status: {exc!s}",
        ) from exc
