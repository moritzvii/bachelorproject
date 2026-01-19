from __future__ import annotations
from pydantic import BaseModel, Field


class StrategyInputPayload(BaseModel):
    strategy: str = Field(
        ..., min_length=1, description="Raw user strategy description."
    )


class StrategyParseResponse(BaseModel):
    valid: bool
    raw: str
    timestamp: str
    title: str | None = None
    paraphrased_strategy: str | None = None
    segment: str | None = None
    region: str | None = None
    focus: str | None = None
    direction: str | None = None
    error: str | None = None
    pipeline_triggered: bool
    pipeline_error: str | None = None


class SelectedStrategyPayload(BaseModel):
    strategy_id: str
    strategy_name: str
    strategy_info: str
    strategy_data: dict = {}
