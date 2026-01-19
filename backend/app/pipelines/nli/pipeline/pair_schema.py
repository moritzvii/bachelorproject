from __future__ import annotations
from dataclasses import dataclass, asdict, field
from datetime import datetime, UTC
import hashlib
from typing import Dict, List, Any, Optional


@dataclass
class PairMetadata:
    pair_id: str
    pair_type: str
    created_at: str
    model_name: Optional[str] = None


@dataclass
class StrategyInfo:
    hypothesis: str
    strategy_title: Optional[str] = None
    strategy_segment: Optional[str] = None
    strategy_region: Optional[str] = None
    strategy_focus: Optional[str] = None
    strategy_direction: Optional[str] = None


@dataclass
class PremiseInfo:
    premise_id: str
    premise_text: str
    premise_type: str
    segment: Optional[str] = None
    region: Optional[str] = None
    year: Optional[int] = None
    source: Optional[str] = None
    pdf_name: Optional[str] = None
    page: Optional[int] = None


@dataclass
class NLIScores:
    entailment: float
    contradiction: float
    neutral: float
    verdict: str


@dataclass
class PairScores:
    nli: NLIScores
    combined_score: float
    retrieval_similarity: Optional[float] = None
    segment_region_weight: Optional[float] = None
    factor_conflict: Optional[float] = None


@dataclass
class UnifiedPair:
    metadata: PairMetadata
    strategy: StrategyInfo
    premise: PremiseInfo
    scores: PairScores
    extensions: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        result = {
            "pair_id": self.metadata.pair_id,
            "pair_type": self.metadata.pair_type,
            "created_at": self.metadata.created_at,
            "model_name": self.metadata.model_name,
            "hypothesis": self.strategy.hypothesis,
            "strategy_title": self.strategy.strategy_title,
            "strategy_segment": self.strategy.strategy_segment,
            "strategy_region": self.strategy.strategy_region,
            "strategy_focus": self.strategy.strategy_focus,
            "strategy_direction": self.strategy.strategy_direction,
            "premise_id": self.premise.premise_id,
            "premise_text": self.premise.premise_text,
            "segment": self.premise.segment,
            "region": self.premise.region,
            "year": self.premise.year,
            "source": self.premise.source,
            "pdf_name": self.premise.pdf_name,
            "page": self.premise.page,
            "entailment": self.scores.nli.entailment,
            "contradiction": self.scores.nli.contradiction,
            "neutral": self.scores.nli.neutral,
            "verdict": self.scores.nli.verdict,
            "combined_score": self.scores.combined_score,
            "retrieval_similarity": self.scores.retrieval_similarity,
        }
        filtered_extensions = {
            k: v for k, v in self.extensions.items() if k not in ["nli_score"]
        }
        result.update(filtered_extensions)
        return {k: v for k, v in result.items() if v is not None}


@dataclass
class PairReport:
    report_type: str
    created_at: str
    model_name: str
    hypothesis_count: int
    premise_count: int
    pair_count: int
    pairs: List[Dict[str, Any]]
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "report_type": self.report_type,
            "created_at": self.created_at,
            "model": self.model_name,
            "hypothesis_count": self.hypothesis_count,
            "premise_count": self.premise_count,
            "pair_count": self.pair_count,
            "results": self.pairs,
            **self.metadata,
        }


def create_forecast_pair(
    hypothesis: str,
    premise_id: str,
    premise_text: str,
    segment: Optional[str],
    region: Optional[str],
    year: Optional[int],
    source: Optional[str],
    kind: Optional[str],
    nli_target: Optional[str],
    entailment: float,
    contradiction: float,
    neutral: float,
    verdict: str,
    quote: Optional[str] = None,
    similarity: Optional[float] = None,
    combined_score: Optional[float] = None,
    pdf_name: Optional[str] = None,
    page: Optional[int] = None,
    strategy_title: Optional[str] = None,
    strategy_segment: Optional[str] = None,
    strategy_region: Optional[str] = None,
    strategy_focus: Optional[str] = None,
    strategy_direction: Optional[str] = None,
    model_name: str = "microsoft/deberta-large-mnli",
) -> UnifiedPair:
    hyp_digest = hashlib.sha256(hypothesis.encode("utf-8")).hexdigest()[:8]
    pair_id = f"forecast_{premise_id}_{hyp_digest}"
    return UnifiedPair(
        metadata=PairMetadata(
            pair_id=pair_id,
            pair_type="forecast",
            created_at=datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            model_name=model_name,
        ),
        strategy=StrategyInfo(
            hypothesis=hypothesis,
            strategy_title=strategy_title,
            strategy_segment=strategy_segment,
            strategy_region=strategy_region,
            strategy_focus=strategy_focus,
            strategy_direction=strategy_direction,
        ),
        premise=PremiseInfo(
            premise_id=premise_id,
            premise_text=premise_text,
            premise_type="forecast",
            segment=segment,
            region=region,
            year=year,
            source=source,
            pdf_name=pdf_name,
            page=page,
        ),
        scores=PairScores(
            nli=NLIScores(
                entailment=entailment,
                contradiction=contradiction,
                neutral=neutral,
                verdict=verdict,
            ),
            combined_score=combined_score if combined_score is not None else entailment,
            retrieval_similarity=similarity,
        ),
        extensions={
            "kind": kind,
            "quote": quote,
        },
    )


def create_risk_pair(
    hypothesis: str,
    risk_id: str,
    risk_name: str,
    risk_text: str,
    segment: Optional[str],
    region: Optional[str],
    risk_type: str,
    entailment: float,
    contradiction: float,
    neutral: float,
    verdict: str,
    nli_score: float,
    segment_region_weight: float,
    factor_conflict: float,
    combined_score: float,
    conflict_factors: List[str],
    retrieval_similarity: float = 0.0,
    pdf_name: Optional[str] = None,
    page: Optional[int] = None,
    quote: Optional[str] = None,
    strategy_title: Optional[str] = None,
    strategy_segment: Optional[str] = None,
    strategy_region: Optional[str] = None,
    strategy_focus: Optional[str] = None,
    strategy_direction: Optional[str] = None,
    model_name: str = "microsoft/deberta-large-mnli",
) -> UnifiedPair:
    hyp_digest = hashlib.sha256(hypothesis.encode("utf-8")).hexdigest()[:8]
    pair_id = f"risk_{risk_id}_{hyp_digest}"
    return UnifiedPair(
        metadata=PairMetadata(
            pair_id=pair_id,
            pair_type="risk",
            created_at=datetime.now(UTC).isoformat().replace("+00:00", "Z"),
            model_name=model_name,
        ),
        strategy=StrategyInfo(
            hypothesis=hypothesis,
            strategy_title=strategy_title,
            strategy_segment=strategy_segment,
            strategy_region=strategy_region,
            strategy_focus=strategy_focus,
            strategy_direction=strategy_direction,
        ),
        premise=PremiseInfo(
            premise_id=risk_id,
            premise_text=risk_text,
            premise_type="risk",
            segment=segment,
            region=region,
            year=None,
            source="risk_catalog",
            pdf_name=pdf_name,
            page=page,
        ),
        scores=PairScores(
            nli=NLIScores(
                entailment=entailment,
                contradiction=contradiction,
                neutral=neutral,
                verdict=verdict,
            ),
            combined_score=combined_score,
            retrieval_similarity=retrieval_similarity,
            segment_region_weight=segment_region_weight,
            factor_conflict=factor_conflict,
        ),
        extensions={
            "risk_name": risk_name,
            "risk_type": risk_type,
            "nli_score": nli_score,
            "conflict_factors": conflict_factors,
            "quote": quote,
        },
    )


def ts_utc() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


__all__ = [
    "PairMetadata",
    "StrategyInfo",
    "PremiseInfo",
    "NLIScores",
    "PairScores",
    "UnifiedPair",
    "PairReport",
    "create_forecast_pair",
    "create_risk_pair",
    "ts_utc",
]
