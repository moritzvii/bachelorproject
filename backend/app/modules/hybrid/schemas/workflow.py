from __future__ import annotations
from pydantic import BaseModel


class HumanFactorsPayload(BaseModel):
    forecast_alignment: float
    risk_alignment: float
    forecast_confidence: float
    risk_confidence: float


class MatrixAdjustmentsPayload(BaseModel):
    forecast: dict
    risk: dict


class StrategyDistributionPayload(BaseModel):
    distribution: list[dict]
