from __future__ import annotations
import json
from datetime import UTC, datetime
from fastapi import APIRouter, HTTPException, status
from app.infrastructure.paths import get_paths
from app.modules.hybrid.services.scoring import (
    load_calibration_payload,
    load_score_summary_payload,
    load_strategy_payload,
    run_calibration_script,
    run_scoring_script,
    run_strategy_script,
)
from app.modules.hybrid.services.workflow_state import load_human_factors
from app.modules.hybrid.schemas.scoring import (
    CalibrationOverridePayload,
    CalibrationPayload,
    ScoreSummaryResponse,
)

router = APIRouter()
paths = get_paths()


@router.get("/scores/summary", response_model=ScoreSummaryResponse)
def get_score_summary() -> ScoreSummaryResponse:
    return ScoreSummaryResponse(**load_score_summary_payload(paths))


@router.post("/scores/recompute", response_model=ScoreSummaryResponse)
def recompute_score_summary() -> ScoreSummaryResponse:
    if not paths.merged_pairs_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merged pairs file not found. Run the pipeline first.",
        )
    scoring_stages = [
        ("7-Scoring", "score_summary.py", "score summary"),
        ("7-Scoring", "intervall.py", "score intervals"),
    ]
    for stage_dir, script_name, stage_label in scoring_stages:
        run_scoring_script(paths, stage_dir, script_name, stage_label)
    fa, ra, fc, rc = load_human_factors(paths)
    try:
        run_calibration_script(paths, fa, ra, fc, rc)
    except Exception:
        pass
    try:
        run_strategy_script(paths)
    except Exception:
        pass
    return ScoreSummaryResponse(**load_score_summary_payload(paths))


@router.post("/scores/calibrate")
def calibrate_scores(payload: CalibrationPayload):
    run_calibration_script(
        paths,
        payload.forecast_alignment,
        payload.risk_alignment,
        payload.forecast_confidence,
        payload.risk_confidence,
    )
    return load_calibration_payload(paths)


@router.get("/scores/calibrated")
def get_calibrated_scores():
    return load_calibration_payload(paths)


@router.post("/scores/calibrated/override")
def override_calibrated_scores(payload: CalibrationOverridePayload):
    base: dict = {}
    try:
        if paths.calibration_out_file.exists():
            with open(paths.calibration_out_file, "r", encoding="utf-8") as f:
                base = json.load(f)
    except Exception:
        base = {}

    def _build_interval(mean: float, width_percent: float) -> dict:
        mean_clamped = max(0.0, min(1.0, mean))
        width = max(0.0, width_percent) / 100.0
        half = width / 2
        lower = max(0.0, mean_clamped - half)
        upper = min(1.0, mean_clamped + half)
        width_final = upper - lower
        return {
            "mean": mean_clamped,
            "lower": lower,
            "upper": upper,
            "width": width_final,
            "width_percent": width_final * 100,
        }

    calibrated_block = {
        "forecast": _build_interval(
            payload.forecast_mean, payload.forecast_width_percent
        ),
        "risk": _build_interval(payload.risk_mean, payload.risk_width_percent),
    }
    base["calibrated"] = calibrated_block
    base.setdefault("source_files", {})
    base["generated_at"] = datetime.now(UTC).isoformat()
    paths.calibration_out_dir.mkdir(parents=True, exist_ok=True)
    with open(paths.calibration_out_file, "w", encoding="utf-8") as f:
        json.dump(base, f, ensure_ascii=False, indent=2)
    return base


@router.get("/strategy/distribution")
def get_strategy_distribution_output():
    return load_strategy_payload(paths)


@router.post("/strategy/distribution/run")
def run_strategy_distribution():
    run_strategy_script(paths)
    return load_strategy_payload(paths)
