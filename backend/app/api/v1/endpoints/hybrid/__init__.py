from __future__ import annotations
from fastapi import APIRouter
from . import strategies, pairs, pipeline, scoring, workflow

router = APIRouter(prefix="/hybrid", tags=["hybrid"])
router.include_router(strategies.router)
router.include_router(pipeline.router)
router.include_router(pairs.router)
router.include_router(scoring.router)
router.include_router(workflow.router)

__all__ = ["router"]
