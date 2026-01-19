from __future__ import annotations
from pydantic import BaseModel, Field


class PremisePair(BaseModel):
    pair_id: str
    pair_type: str
    pair_source: str | None = None
    hypothesis: str | None = None
    strategy_title: str | None = None
    strategy_segment: str | None = None
    strategy_region: str | None = None
    strategy_focus: str | None = None
    strategy_direction: str | None = None
    premise_id: str | None = None
    premise_text: str | None = None
    segment: str | None = None
    region: str | None = None
    source: str | None = None
    verdict: str | None = None
    combined_score: float | None = None
    entailment: float | None = None
    contradiction: float | None = None
    neutral: float | None = None
    year: int | None = None
    risk_name: str | None = None
    risk_type: str | None = None
    retrieval_similarity: float | None = None
    pdf_name: str | None = None
    page: int | None = None
    status: str = "pending"

    class Config:
        extra = "allow"


class MergedPairsResponse(BaseModel):
    generated_at: str
    counts: dict
    metadata: dict
    combined_pairs: list[PremisePair]


class PairStatusUpdate(BaseModel):
    pair_id: str
    status: str = Field(..., pattern="^(accepted|declined|pending)$")
