from __future__ import annotations
from fastapi import APIRouter, HTTPException, status
from app.modules.hybrid.services.strategy_input import process_strategy
from app.infrastructure.paths import get_paths
from app.modules.hybrid.services.workflow_state import (
    load_selected_strategy,
    save_selected_strategy,
)
from app.modules.hybrid.schemas.strategies import (
    StrategyInputPayload,
    StrategyParseResponse,
    SelectedStrategyPayload,
)

router = APIRouter()
paths = get_paths()


@router.post("/strategies", response_model=StrategyParseResponse)
def parse_strategy(payload: StrategyInputPayload) -> StrategyParseResponse:
    strategy_text = payload.strategy.strip()
    if not strategy_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Strategy cannot be empty.",
        )
    try:
        data, pipeline_triggered, pipeline_error = process_strategy(
            strategy_text,
            run_hypotheses=False,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Strategy parsing failed.",
        ) from exc
    timestamp = data.get("timestamp")
    if not timestamp:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Strategy parser returned no timestamp.",
        )
    return StrategyParseResponse(
        valid=bool(data.get("valid")),
        raw=data.get("raw", strategy_text),
        timestamp=timestamp,
        title=data.get("title"),
        paraphrased_strategy=data.get("paraphrased_strategy"),
        segment=data.get("segment"),
        region=data.get("region"),
        focus=data.get("focus"),
        direction=data.get("direction"),
        error=data.get("error"),
        pipeline_triggered=pipeline_triggered,
        pipeline_error=pipeline_error,
    )


@router.post("/strategy/select")
def save_selected_strategy_endpoint(payload: SelectedStrategyPayload):
    try:
        save_selected_strategy(paths, payload.model_dump())
        return {
            "message": "Strategy saved successfully",
            "strategy_id": payload.strategy_id,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save strategy: {exc!s}",
        ) from exc


@router.get("/strategy/selected")
def get_selected_strategy_endpoint():
    if not paths.selected_strategy_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No strategy selected yet",
        )
    try:
        return load_selected_strategy(paths)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load strategy: {exc!s}",
        ) from exc
