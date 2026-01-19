from __future__ import annotations
from fastapi import APIRouter
from app.api.v1.endpoints import auth, hybrid

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(hybrid.router)

__all__ = ["api_router"]
