from __future__ import annotations
import json
import sys
from datetime import UTC, datetime
from math import isnan, sqrt
from pathlib import Path
from typing import Any, Dict, Optional

BASE_DIR = Path(__file__).resolve().parent

PIPELINE_ROOT = BASE_DIR.parent

if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))

from paths import PipelinePaths

PATHS = PipelinePaths.from_file(Path(__file__))

SCORE_SUMMARY_FILE = PATHS.workdir / "7-scoring" / "out" / "score_summary.json"

OUTPUT_DIR = PATHS.workdir / "7-scoring" / "out"

OUTPUT_FILE = OUTPUT_DIR / "score_intervals.json"


def _ts() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _to_float(value: Any) -> Optional[float]:
    try:
        v = float(value)
        if isnan(v):
            return None
        return v
    except Exception:
        return None


def _build_interval(
    *,
    count: int,
    mean: Optional[float],
    variance: Optional[float],
    z: float = 1.96,
    fallback_half_width: float = 0.05,
) -> Dict[str, Any]:
    if not count or mean is None:
        return {
            "count": count,
            "mean": mean,
            "variance": variance,
            "stddev": None,
            "stderr": None,
            "z": z,
            "half_width": None,
            "lower": None,
            "upper": None,
        }
    if count == 1 or variance is None:
        lower = max(0.0, mean - fallback_half_width)
        upper = min(1.0, mean + fallback_half_width)
        return {
            "count": count,
            "mean": mean,
            "variance": variance,
            "stddev": None,
            "stderr": None,
            "z": None,
            "half_width": fallback_half_width,
            "lower": lower,
            "upper": upper,
            "width": upper - lower if lower is not None and upper is not None else None,
            "width_percent": (
                ((upper - lower) * 100)
                if (lower is not None and upper is not None)
                else None
            ),
        }
    stddev = sqrt(variance)
    stderr = stddev / sqrt(count)
    half_width = z * stderr
    lower = max(0.0, mean - half_width)
    upper = min(1.0, mean + half_width)
    return {
        "count": count,
        "mean": mean,
        "variance": variance,
        "stddev": stddev,
        "stderr": stderr,
        "z": z,
        "half_width": half_width,
        "lower": lower,
        "upper": upper,
        "width": upper - lower if lower is not None and upper is not None else None,
        "width_percent": (
            ((upper - lower) * 100)
            if (lower is not None and upper is not None)
            else None
        ),
    }


def build_intervals() -> None:
    if not SCORE_SUMMARY_FILE.exists():
        raise FileNotFoundError(
            f"score_summary.json missing at {SCORE_SUMMARY_FILE}. "
            "Run score_summary.py first."
        )
    summary = json.loads(SCORE_SUMMARY_FILE.read_text(encoding="utf-8"))
    stats = summary.get("stats", {})
    forecast_stats = stats.get("forecast") or {}
    risk_stats = stats.get("risk") or {}
    forecast_interval = _build_interval(
        count=int(forecast_stats.get("count") or 0),
        mean=_to_float(forecast_stats.get("mean")),
        variance=_to_float(forecast_stats.get("variance")),
        z=1.96,
        fallback_half_width=0.2,
    )
    risk_interval = _build_interval(
        count=int(risk_stats.get("count") or 0),
        mean=_to_float(risk_stats.get("mean")),
        variance=_to_float(risk_stats.get("variance")),
        z=1.96,
        fallback_half_width=0.2,
    )
    payload = {
        "generated_at": _ts(),
        "source_files": {
            "score_summary": str(SCORE_SUMMARY_FILE),
        },
        "intervals": {
            "forecast": forecast_interval,
            "risk": risk_interval,
        },
    }
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"✅ Score intervals saved → {OUTPUT_FILE}")


def main() -> None:
    try:
        build_intervals()
    except Exception as exc:
        print(f"⚠️ Failed to compute score intervals: {exc}")
        raise


if __name__ == "__main__":
    main()
