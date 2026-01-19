from __future__ import annotations
import json
from fastapi import APIRouter, HTTPException, status
from app.modules.hybrid.services.pairs import load_accepted_pairs, load_merged_pairs
from app.infrastructure.paths import get_paths
from app.modules.hybrid.services.workflow_state import (
    get_pair_statuses,
    update_pair_status,
)
from app.modules.hybrid.schemas.pairs import MergedPairsResponse, PairStatusUpdate

router = APIRouter()
paths = get_paths()


@router.get("/pairs/merged", response_model=MergedPairsResponse)
def get_merged_pairs() -> MergedPairsResponse:
    data = load_merged_pairs(paths)
    return MergedPairsResponse(**data)


@router.patch("/pairs/status")
def update_pair_status_endpoint(payload: PairStatusUpdate):
    try:
        return update_pair_status(paths, payload.pair_id, payload.status)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update pair status: {exc!s}",
        ) from exc


@router.get("/pairs/accepted", response_model=MergedPairsResponse)
def get_accepted_pairs() -> MergedPairsResponse:
    data = load_accepted_pairs(paths)
    return MergedPairsResponse(**data)


@router.get("/pairs/status")
def get_pair_statuses_endpoint() -> list[dict]:
    try:
        return get_pair_statuses(paths)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse pair status file",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read pair status file: {exc!s}",
        ) from exc
