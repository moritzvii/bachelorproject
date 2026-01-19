from __future__ import annotations
from pydantic import BaseModel


class ScoreStats(BaseModel):
    count: int = 0
    mean: float | None = None
    variance: float | None = None


class ScoreInterval(BaseModel):
    count: int
    mean: float | None = None
    variance: float | None = None
    stddev: float | None = None
    stderr: float | None = None
    z: float | None = None
    half_width: float | None = None
    lower: float | None = None
    upper: float | None = None
    width: float | None = None
    width_percent: float | None = None


class ScoreSummaryResponse(BaseModel):
    generated_at: str | None = None
    counts: dict = {}
    stats: dict[str, ScoreStats] = {}
    intervals: dict[str, ScoreInterval] | None = None
    scores: dict[str, list[float]] | None = None


class CalibrationPayload(BaseModel):
    forecast_alignment: float
    risk_alignment: float
    forecast_confidence: float
    risk_confidence: float


class CalibrationOverridePayload(BaseModel):
    risk_mean: float
    risk_width_percent: float
    forecast_mean: float
    forecast_width_percent: float
