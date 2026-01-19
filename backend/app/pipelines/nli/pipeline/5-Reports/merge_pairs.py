from __future__ import annotations
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple, Optional

BASE_DIR = Path(__file__).resolve().parent

PIPELINE_ROOT = BASE_DIR.parent

sys.path.insert(0, str(PIPELINE_ROOT))

from paths import PipelinePaths

PATHS = PipelinePaths.from_file(Path(__file__))

FORECAST_FILES = [
    PATHS.forecast_reports_out_dir / "premise_hypothesis_pairs.json",
    PATHS.forecast_reports_out_dir / "forecast_pairs.json",
]

EVENT_FILE = PATHS.event_reports_out_dir / "event_premise_hypothesis_pairs.json"

RISK_FILES = [
    PATHS.risk_reports_out_dir / "risk_pairs_nli_simple.json",
    PATHS.risk_reports_out_dir / "risk_hybrid_pairs.json",
]

OUTPUT_DIR = PATHS.reports_out_dir

OUTPUT_FILE = OUTPUT_DIR / "merged_pairs.json"


def _ts() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _pick_first_existing(
    paths: List[Path], label: str, optional: bool = False
) -> Path | None:
    for path in paths:
        if path.exists():
            return path
    if optional:
        print(
            f"ℹ️ {label} pairs not found (optional): {', '.join(str(p) for p in paths)}"
        )
        return None
    raise FileNotFoundError(
        f"{label} pairs missing: tried {', '.join(str(p) for p in paths)}"
    )


def _load_results(
    path: Path, label: str, optional: bool = False
) -> Tuple[Dict[str, Any], List[Dict[str, Any]]] | None:
    if path is None:
        return None
    if not path.exists():
        if optional:
            print(f"ℹ️ {label} pairs not found (optional): {path}")
            return None
        raise FileNotFoundError(f"{label} pairs missing: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    results = data.get("results")
    if not isinstance(results, list):
        results = data.get("pairs")
    if not isinstance(results, list):
        raise ValueError(
            f"{label} pairs file malformed: 'results' missing or not a list"
        )
    return data, results


def _load_all_results(
    paths: List[Path], label: str, optional: bool = False
) -> List[Tuple[Path, Dict[str, Any], List[Dict[str, Any]]]]:
    loaded: List[Tuple[Path, Dict[str, Any], List[Dict[str, Any]]]] = []
    for path in paths:
        result = _load_results(path, label, optional=True)
        if result is None:
            continue
        meta, pairs = result
        loaded.append((path, meta, pairs))
    if not loaded:
        if optional:
            print(
                f"ℹ️ {label} pairs not found (optional): {', '.join(str(p) for p in paths)}"
            )
            return []
        raise FileNotFoundError(
            f"No {label} pairs found in: {', '.join(str(p) for p in paths)}"
        )
    return loaded


def _tag_pairs(pairs: List[Dict[str, Any]], label: str) -> List[Dict[str, Any]]:
    tagged: List[Dict[str, Any]] = []
    for pair in pairs:
        if "pair_source" not in pair:
            pair["pair_source"] = label
        tagged.append(pair)
    return tagged


def _pair_score(pair: Dict[str, Any]) -> float:
    score = pair.get("combined_score")
    if isinstance(score, (int, float)):
        return float(score)
    for field in ("similarity", "nli_score", "entailment", "score"):
        value = pair.get(field)
        if isinstance(value, (int, float)):
            return float(value)
    return 0.0


def _pair_source(pair: Dict[str, Any]) -> str:
    for field in ("pdf_name", "source"):
        value = pair.get(field)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return "unknown"


def _filter_by_score(
    pairs: List[Dict[str, Any]], threshold: float = 0.3
) -> List[Dict[str, Any]]:
    filtered: List[Dict[str, Any]] = []
    for pair in pairs:
        ent = pair.get("entailment")
        con = pair.get("contradiction")
        try:
            ent_val = float(ent) if ent is not None else 0.0
        except (TypeError, ValueError):
            ent_val = 0.0
        try:
            con_val = float(con) if con is not None else 0.0
        except (TypeError, ValueError):
            con_val = 0.0
        if ent_val >= threshold or con_val >= threshold:
            filtered.append(pair)
    return filtered


def _filter_region_mismatch(pairs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    def _normalize(region: str) -> str:
        normalized = region.strip().lower()
        aliases = {
            "eu": "europe",
            "emea": "europe",
            "european union": "europe",
            "apac": "apac",
            "asia pacific": "apac",
            "rest of asia pacific": "apac",
            "china": "greater china",
            "prc": "greater china",
            "greater china": "greater china",
            "hong kong": "greater china",
            "taiwan": "greater china",
            "macau": "greater china",
            "usa": "americas",
            "us": "americas",
            "united states": "americas",
            "north america": "americas",
            "america": "americas",
            "americas": "americas",
            "all": "any",
            "global": "any",
            "world": "any",
            "worldwide": "any",
        }
        return aliases.get(normalized, normalized)

    filtered: List[Dict[str, Any]] = []
    for pair in pairs:
        strategy_region = pair.get("strategy_region")
        pair_region = pair.get("region")
        if isinstance(strategy_region, str) and isinstance(pair_region, str):
            g_norm = _normalize(strategy_region)
            p_norm = _normalize(pair_region)
            if p_norm != "any" and g_norm != "any" and g_norm != p_norm:
                continue
        filtered.append(pair)
    return filtered


def _limit_per_source(
    pairs: List[Dict[str, Any]], per_source: int = 2
) -> List[Dict[str, Any]]:
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for pair in pairs:
        src = _pair_source(pair)
        grouped.setdefault(src, []).append(pair)
    limited: List[Dict[str, Any]] = []
    for bucket in grouped.values():
        top = sorted(bucket, key=_pair_score, reverse=True)[:per_source]
        limited.extend(top)
    return limited


def _dedupe_by_pair_id(pairs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    best: Dict[str, Dict[str, Any]] = {}
    for pair in pairs:
        pair_id = pair.get("pair_id")
        if not isinstance(pair_id, str):
            continue
        current_best = best.get(pair_id)
        if current_best is None or _pair_score(pair) > _pair_score(current_best):
            best[pair_id] = pair
    return list(best.values())


def _dedupe_by_premise(pairs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    best: Dict[str, Dict[str, Any]] = {}
    for pair in pairs:
        premise_id = pair.get("premise_id")
        if not isinstance(premise_id, str) or not premise_id:
            premise_id = pair.get("pair_id")
        if not isinstance(premise_id, str):
            continue
        current_best = best.get(premise_id)
        if current_best is None or _pair_score(pair) > _pair_score(current_best):
            best[premise_id] = pair
    return list(best.values())


def _dedupe_by_quote(pairs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    best: Dict[str, Dict[str, Any]] = {}
    for pair in pairs:
        quote = pair.get("quote") or pair.get("premise_text") or ""
        key = quote.strip().lower()
        if not key:
            key = f"id::{pair.get('pair_id')}"
        current = best.get(key)
        if current is None or _pair_score(pair) > _pair_score(current):
            best[key] = pair
    return list(best.values())


ESSENTIAL_FIELDS = {
    "pair_id",
    "pair_type",
    "pair_source",
    "hypothesis",
    "strategy_title",
    "strategy_segment",
    "strategy_region",
    "strategy_focus",
    "strategy_direction",
    "premise_id",
    "premise_text",
    "quote",
    "segment",
    "region",
    "year",
    "combined_score",
    "entailment",
    "contradiction",
    "neutral",
    "retrieval_similarity",
    "risk_name",
    "risk_type",
    "pdf_name",
    "page",
    "source",
    "status",
}

META_FIELDS_TO_SKIP = {"results", "pairs"}


def _prune_fields(pair: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in pair.items() if k in ESSENTIAL_FIELDS}


def _filter_segment_mismatch(pairs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    def _normalize(segment: str) -> str:
        normalized = segment.strip().lower()
        aliases = {
            "iphone": "iphone",
            "smartphones": "smartphones",
            "smartphone": "smartphones",
            "tablet": "tablet",
            "tablets": "tablet",
            "mac": "mac",
            "pc": "mac",
            "watch": "watch",
            "wearables": "wearables",
            "services": "services",
            "appstore": "services",
            "app store": "services",
            "all": "any",
            "any": "any",
        }
        return aliases.get(normalized, normalized)

    filtered: List[Dict[str, Any]] = []
    for pair in pairs:
        strategy_segment = pair.get("strategy_segment")
        pair_segment = pair.get("segment")
        if isinstance(strategy_segment, str) and isinstance(pair_segment, str):
            g_norm = _normalize(strategy_segment)
            p_norm = _normalize(pair_segment)
            if p_norm != "any" and g_norm != "any" and g_norm != p_norm:
                continue
        filtered.append(pair)
    return filtered


def merge_pairs() -> None:
    forecast_results = _load_all_results(FORECAST_FILES, "forecast", optional=True)
    risk_file = _pick_first_existing(RISK_FILES, "risk")
    event_result = _load_results(EVENT_FILE, "event", optional=True)
    risk_result = _load_results(risk_file, "risk")
    forecast_pairs: List[Dict[str, Any]] = []
    forecast_meta_map: Dict[str, Dict[str, Any]] = {}
    forecast_source_files: List[str] = []
    for path, meta, pairs in forecast_results:
        forecast_pairs.extend(pairs)
        forecast_meta_map[path.name] = {
            k: v for k, v in meta.items() if k not in META_FIELDS_TO_SKIP
        }
        forecast_source_files.append(str(path))
    risk_meta, risk_pairs = risk_result
    if event_result is not None:
        event_meta, event_pairs = event_result
    else:
        event_meta, event_pairs = {}, []
    filtered_pairs: Dict[str, List[Dict[str, Any]]] = {}
    combined: List[Dict[str, Any]] = []
    for label, pairs in (
        ("forecast", forecast_pairs),
        ("event", event_pairs),
        ("risk", risk_pairs),
    ):
        tagged = _tag_pairs(pairs, label)
        threshold = 0.15
        scored = _filter_by_score(tagged, threshold=threshold)
        region_matched = _filter_region_mismatch(scored)
        deduped_premise = _dedupe_by_premise(region_matched)
        limited = _limit_per_source(deduped_premise, per_source=2)
        deduped = _dedupe_by_pair_id(limited)
        filtered_pairs[label] = [_prune_fields(pair) for pair in deduped]
        combined.extend(filtered_pairs[label])
    source_files = {
        "forecast": forecast_source_files,
        "risk": str(risk_file),
    }
    if event_result is not None:
        source_files["event"] = str(EVENT_FILE)
    payload = {
        "generated_at": _ts(),
        "source_files": source_files,
        "counts": {
            "forecast": len(filtered_pairs["forecast"]),
            "event": len(filtered_pairs["event"]),
            "risk": len(filtered_pairs["risk"]),
            "total_pairs": len(combined),
        },
        "metadata": {
            "forecast": forecast_meta_map,
            "event": {
                k: v for k, v in event_meta.items() if k not in META_FIELDS_TO_SKIP
            },
            "risk": {
                k: v for k, v in risk_meta.items() if k not in META_FIELDS_TO_SKIP
            },
        },
        "combined_pairs": combined,
    }
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"✅ {len(combined)} pairs consolidated → {OUTPUT_FILE}")


def main() -> None:
    try:
        merge_pairs()
    except Exception as exc:
        print(f"⚠️ Failed to merge pairs: {exc}")
        raise


if __name__ == "__main__":
    main()
