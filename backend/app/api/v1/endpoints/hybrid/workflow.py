from __future__ import annotations
from fastapi import APIRouter, HTTPException, status
from app.infrastructure.paths import get_paths
from app.modules.hybrid.services.scoring import run_calibration_script
from app.modules.hybrid.services.workflow_state import (
    get_matrix_adjustments,
    get_human_factors,
    get_strategy_distribution,
    save_matrix_adjustments,
    save_human_factors,
    save_strategy_distribution,
)
from app.modules.hybrid.schemas.workflow import (
    MatrixAdjustmentsPayload,
    HumanFactorsPayload,
    StrategyDistributionPayload,
)

router = APIRouter()
paths = get_paths()


@router.post("/human-factors")
def save_human_factors_endpoint(payload: HumanFactorsPayload):
    try:
        save_human_factors(paths, payload.model_dump())
        try:
            run_calibration_script(
                paths,
                payload.forecast_alignment,
                payload.risk_alignment,
                payload.forecast_confidence,
                payload.risk_confidence,
            )
        except Exception:
            pass
        return {"message": "Human factors saved successfully"}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save human factors: {exc!s}",
        ) from exc


@router.get("/human-factors")
def get_human_factors_endpoint():
    if not paths.human_factors_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No human factors saved yet",
        )
    try:
        return get_human_factors(paths)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load human factors: {exc!s}",
        ) from exc


@router.post("/matrix-adjustments")
def save_matrix_adjustments_endpoint(payload: MatrixAdjustmentsPayload):
    try:
        save_matrix_adjustments(paths, payload.model_dump())
        return {"message": "Matrix adjustments saved successfully"}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save matrix adjustments: {exc!s}",
        ) from exc


@router.get("/matrix-adjustments")
def get_matrix_adjustments_endpoint():
    if not paths.matrix_adjustments_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No matrix adjustments saved yet",
        )
    try:
        return get_matrix_adjustments(paths)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load matrix adjustments: {exc!s}",
        ) from exc


@router.post("/strategy-distribution")
def save_strategy_distribution_endpoint(payload: StrategyDistributionPayload):
    try:
        save_strategy_distribution(paths, payload.model_dump())
        return {"message": "Strategy distribution saved successfully"}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save strategy distribution: {exc!s}",
        ) from exc


@router.get("/strategy-distribution")
def get_strategy_distribution_state_endpoint():
    if not paths.strategy_distribution_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No strategy distribution saved yet",
        )
    try:
        return get_strategy_distribution(paths)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load strategy distribution: {exc!s}",
        ) from exc
