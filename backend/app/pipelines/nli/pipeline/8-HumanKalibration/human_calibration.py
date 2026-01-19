from __future__ import annotations
import json
import sys
from datetime import UTC, datetime
import argparse
from pathlib import Path
from typing import Any, Dict

BASE_DIR = Path(__file__).resolve().parent

PIPELINE_ROOT = BASE_DIR.parent

if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))

from paths import PipelinePaths

PATHS = PipelinePaths.from_file(Path(__file__))

INTERVALS_FILE = PATHS.workdir / "7-scoring" / "out" / "score_intervals.json"

OUTPUT_DIR = PATHS.workdir / "8-HumanKalibration" / "out"

OUTPUT_FILE = OUTPUT_DIR / "score_human_calibrated.json"

ALPHA_ALIGNMENT = 0.5

MIN_CONF_SCALE = 0.0

MAX_CONF_SCALE = 1.5

MIN_EFFECTIVE_WIDTH = 0.08

MAX_ALIGNMENT_ADJUSTMENT = 0.4


def _ts() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _load_intervals() -> Dict[str, Any]:
    if not INTERVALS_FILE.exists():
        raise FileNotFoundError(f"score_intervals.json missing at {INTERVALS_FILE}")
    return json.loads(INTERVALS_FILE.read_text(encoding="utf-8"))


def _extract_interval(data: Dict[str, Any], key: str) -> Dict[str, Any]:
    intervals = data.get("intervals") or {}
    interval = intervals.get(key)
    if not interval:
        raise ValueError(f"Interval '{key}' missing in {INTERVALS_FILE}")
    return interval


def _calibrate_dimension(
    interval: Dict[str, Any], alignment_human: float, confidence_human: float
) -> Dict[str, float]:
    mean_ai = float(interval.get("mean") or 0.0)
    lower_ai_raw = interval.get("lower")
    upper_ai_raw = interval.get("upper")
    if lower_ai_raw is None or upper_ai_raw is None:
        lower_ai = mean_ai
        upper_ai = mean_ai
    else:
        lower_ai = float(lower_ai_raw)
        upper_ai = float(upper_ai_raw)
    width_ai = max(0.0, upper_ai - lower_ai)
    width_ai_pct_raw = interval.get("width_percent")
    width_ai_pct = (
        float(width_ai_pct_raw) if width_ai_pct_raw is not None else width_ai * 100
    )
    if abs(alignment_human - 0.5) < 1e-9 and abs(confidence_human - 0.5) < 1e-9:
        return {
            "mean": _clamp01(mean_ai),
            "lower": _clamp01(lower_ai),
            "upper": _clamp01(upper_ai),
            "width": width_ai,
            "width_percent": width_ai_pct if width_ai_pct > 0 else width_ai * 100,
        }
    delta = (
        max(-1.0, min(1.0, (alignment_human - 0.5) / 0.5)) * MAX_ALIGNMENT_ADJUSTMENT
    )
    mean_cal = _clamp01(mean_ai * (1.0 + delta))
    scale = MAX_CONF_SCALE - confidence_human * (MAX_CONF_SCALE - MIN_CONF_SCALE)
    width_ai_effective = width_ai
    if confidence_human < 0.5 and width_ai < MIN_EFFECTIVE_WIDTH:
        widen_ratio = (0.5 - confidence_human) / 0.5
        target_width = MIN_EFFECTIVE_WIDTH
        width_ai_effective = width_ai + (target_width - width_ai) * widen_ratio
    width_cal = width_ai_effective * scale
    lower_cal = max(0.0, mean_cal - width_cal / 2)
    upper_cal = min(1.0, mean_cal + width_cal / 2)
    width_final = max(0.0, upper_cal - lower_cal)
    return {
        "mean": mean_cal,
        "lower": lower_cal,
        "upper": upper_cal,
        "width": width_final,
        "width_percent": width_final * 100,
    }


def apply_human_calibration(
    forecast_alignment: float,
    risk_alignment: float,
    forecast_confidence: float,
    risk_confidence: float,
) -> None:
    forecast_alignment = _clamp01(forecast_alignment)
    risk_alignment = _clamp01(risk_alignment)
    forecast_confidence = _clamp01(forecast_confidence)
    risk_confidence = _clamp01(risk_confidence)
    intervals_data = _load_intervals()
    ai_forecast = _extract_interval(intervals_data, "forecast")
    ai_risk = _extract_interval(intervals_data, "risk")
    calibrated_forecast = _calibrate_dimension(
        ai_forecast, forecast_alignment, forecast_confidence
    )
    calibrated_risk = _calibrate_dimension(ai_risk, risk_alignment, risk_confidence)
    payload = {
        "generated_at": _ts(),
        "source_files": {
            "score_intervals": str(INTERVALS_FILE),
        },
        "human_factors": {
            "forecast_alignment": forecast_alignment,
            "risk_alignment": risk_alignment,
            "forecast_confidence": forecast_confidence,
            "risk_confidence": risk_confidence,
        },
        "ai": {
            "forecast": ai_forecast,
            "risk": ai_risk,
        },
        "calibrated": {
            "forecast": calibrated_forecast,
            "risk": calibrated_risk,
        },
    }
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"✅ Human calibration saved → {OUTPUT_FILE}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Apply human calibration to score intervals."
    )
    parser.add_argument("--forecast-alignment", type=float, default=0.5)
    parser.add_argument("--risk-alignment", type=float, default=0.5)
    parser.add_argument("--forecast-confidence", type=float, default=0.5)
    parser.add_argument("--risk-confidence", type=float, default=0.5)
    args = parser.parse_args()
    apply_human_calibration(
        forecast_alignment=args.forecast_alignment,
        risk_alignment=args.risk_alignment,
        forecast_confidence=args.forecast_confidence,
        risk_confidence=args.risk_confidence,
    )


if __name__ == "__main__":
    main()
