from __future__ import annotations
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Dict, List
from math import isnan

BASE_DIR = Path(__file__).resolve().parent

PIPELINE_ROOT = BASE_DIR.parent

if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))

from paths import PipelinePaths

PATHS = PipelinePaths.from_file(Path(__file__))

MERGED_PAIRS_FILE = PATHS.reports_out_dir / "merged_pairs.json"

PAIR_STATUS_FILE = PATHS.user_review_out_dir / "pair_status.json"

OUTPUT_DIR = PATHS.workdir / "7-scoring" / "out"

OUTPUT_FILE = OUTPUT_DIR / "score_summary.json"


def _ts() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _to_float(value: Any) -> float | None:
    try:
        v = float(value)
        if isnan(v):
            return None
        return v
    except Exception:
        return None


def _load_status_map() -> Dict[str, str]:
    if not PAIR_STATUS_FILE.exists():
        return {}
    try:
        data = json.loads(PAIR_STATUS_FILE.read_text(encoding="utf-8"))
        return {
            str(item.get("pair_id")): str(item.get("status"))
            for item in data
            if item.get("pair_id") is not None
        }
    except Exception:
        return {}


def _stats(values: List[float]) -> Dict[str, Any]:
    if not values:
        return {"count": 0, "mean": None, "variance": None}
    n = len(values)
    mean = sum(values) / n
    variance = sum((v - mean) ** 2 for v in values) / n
    return {"count": n, "mean": mean, "variance": variance}


def score_summary() -> None:
    if not MERGED_PAIRS_FILE.exists():
        raise FileNotFoundError(
            f"merged_pairs.json missing at {MERGED_PAIRS_FILE}. Run merge_pairs.py first."
        )
    merged = json.loads(MERGED_PAIRS_FILE.read_text(encoding="utf-8"))
    combined_pairs = merged.get("combined_pairs", [])
    if not isinstance(combined_pairs, list):
        raise ValueError(
            "merged_pairs.json malformed: combined_pairs missing or not a list."
        )
    status_map = _load_status_map()
    forecast_scores: List[float] = []
    risk_scores: List[float] = []
    accepted_total = 0
    for pair in combined_pairs:
        pid = pair.get("pair_id")
        if not isinstance(pid, str):
            continue
        status = status_map.get(pid, "pending")
        if status != "accepted":
            continue
        score = _to_float(pair.get("combined_score"))
        if score is None:
            continue
        accepted_total += 1
        ptype = (pair.get("pair_type") or pair.get("pair_source") or "").lower()
        if ptype == "risk":
            risk_scores.append(score)
        else:
            forecast_scores.append(score)
    payload = {
        "generated_at": _ts(),
        "source_files": {
            "merged_pairs": str(MERGED_PAIRS_FILE),
            "pair_status": str(PAIR_STATUS_FILE) if PAIR_STATUS_FILE.exists() else None,
        },
        "counts": {
            "accepted_total": accepted_total,
            "accepted_forecast": len(forecast_scores),
            "accepted_risk": len(risk_scores),
            "all_pairs": len(combined_pairs),
        },
        "stats": {
            "forecast": _stats(forecast_scores),
            "risk": _stats(risk_scores),
        },
        "scores": {
            "forecast": forecast_scores,
            "risk": risk_scores,
        },
    }
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"✅ Scoring summary saved → {OUTPUT_FILE}")


def main() -> None:
    try:
        score_summary()
    except Exception as exc:
        print(f"⚠️ Failed to compute scoring summary: {exc}")
        raise


if __name__ == "__main__":
    main()
