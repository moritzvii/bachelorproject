from pathlib import Path
import sys
from typing import Any, Dict, List
from math import isnan

BASE_DIR = Path(__file__).resolve().parent

PIPELINE_STAGE_DIR = BASE_DIR.parent

PIPELINE_ROOT = PIPELINE_STAGE_DIR.parent

if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

if str(PIPELINE_STAGE_DIR) not in sys.path:
    sys.path.insert(0, str(PIPELINE_STAGE_DIR))

from paths import PipelinePaths
from pair_schema import create_risk_pair
from shared import NliScorer, get_nli_scorer


def normalize_region(value: object) -> str:
    if not isinstance(value, str):
        return "ANY"
    key = value.strip().lower()
    aliases = {
        "emea": "EUROPE",
        "eu": "EUROPE",
        "european union": "EUROPE",
        "europe": "EUROPE",
        "apac": "APAC",
        "asia pacific": "APAC",
        "rest of asia pacific": "APAC",
        "all except china": "APAC",
        "china": "GREATER CHINA",
        "prc": "GREATER CHINA",
        "greater china": "GREATER CHINA",
        "hong kong": "GREATER CHINA",
        "taiwan": "GREATER CHINA",
        "macau": "GREATER CHINA",
        "usa": "AMERICAS",
        "us": "AMERICAS",
        "united states": "AMERICAS",
        "north america": "AMERICAS",
        "america": "AMERICAS",
        "americas": "AMERICAS",
        "japan": "JAPAN",
        "jp": "JAPAN",
        "global": "ANY",
        "world": "ANY",
        "worldwide": "ANY",
        "all": "ANY",
    }
    return aliases.get(key, value.strip().upper() or "ANY")


import json
import pandas as pd


def load_strategy_payload(paths: PipelinePaths) -> dict:
    strategy_file = paths.hypotheses_file
    if not strategy_file.exists():
        raise FileNotFoundError(f"Strategy with hypotheses missing: {strategy_file}")
    data = json.loads(strategy_file.read_text(encoding="utf-8"))
    if not data.get("valid"):
        raise ValueError("Strategy payload is invalid or was rejected upstream.")
    hypotheses = [
        h.strip()
        for h in data.get("hypotheses", [])
        if isinstance(h, str) and h.strip()
    ]
    if not hypotheses:
        raise ValueError("Strategy payload does not contain any hypotheses.")
    data["hypotheses"] = hypotheses
    return data


def build_strategy_variants(data: dict) -> List[dict]:
    base_name = (
        str(
            data.get("strategy_title")
            or data.get("title")
            or data.get("raw")
            or "User Strategy"
        ).strip()
        or "User Strategy"
    )
    segment = str(data.get("segment", "")).strip()
    region = normalize_region(data.get("region", ""))
    variants: List[dict] = []
    for idx, hypothesis in enumerate(data["hypotheses"], start=1):
        variants.append(
            {
                "id": f"strategy_h{idx}",
                "name": base_name,
                "segment": segment.upper() or "ALL",
                "region": region or "ANY",
                "hypothesis": hypothesis,
                "raw_strategy": data.get("raw"),
                "strategy_title": base_name,
                "strategy_focus": data.get("focus"),
                "strategy_direction": data.get("direction"),
                "variant_index": idx,
            }
        )
    return variants


def load_risks_from_parquet(
    paths: PipelinePaths, min_candidates: int = 50
) -> List[Dict[str, str]]:
    risk_candidates_file = (
        paths.embeddings_risk_retrieve_out_dir / "risk_candidates.parquet"
    )
    risks_parquet = paths.risks_parquet
    df = None
    if risk_candidates_file.exists():
        df = pd.read_parquet(risk_candidates_file)
        if df.empty or len(df) < min_candidates:
            print(
                f"ℹ️ Risk candidates too small ({len(df)}); using full catalog instead."
            )
            df = None
    if df is None:
        if not risks_parquet.exists():
            raise FileNotFoundError(f"Risks parquet not found at {risks_parquet}")
        df = pd.read_parquet(risks_parquet)
        print(f"ℹ️ Loaded full risk catalog: {len(df)} rows.")
    else:
        print(f"ℹ️ Loaded risk candidates: {len(df)} rows.")
    records = []
    for entry in df.to_dict("records"):
        name = str(
            entry.get("risk_name") or entry.get("risk_id") or "Unnamed Risk"
        ).strip()
        premise = str(entry.get("nli") or entry.get("risk_text_quote") or name).strip()
        segment = str(entry.get("segment") or "ALL").strip().upper()
        region = normalize_region(entry.get("region"))
        pdf_name = entry.get("pdf_name") or entry.get("pdf_filename")
        page = entry.get("page") or entry.get("page_start")
        records.append(
            {
                "name": name,
                "premise": premise,
                "segment": segment or "ALL",
                "region": region or "GLOBAL",
                "risk_type": str(entry.get("risk_type") or "OTHER").strip().upper(),
                "similarity": float(entry.get("similarity", 0.0)),
                "pdf_name": pdf_name,
                "page": page,
                "quote": entry.get("risk_text_quote") or entry.get("nli"),
            }
        )
    if not records:
        raise ValueError("No risks loaded from parquet files")
    return records


PATHS = PipelinePaths.from_file(Path(__file__))

OUTPUT_DIR = PATHS.risk_reports_out_dir


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        val = float(value)
        return default if isnan(val) else val
    except Exception:
        return default


def rank_risks_for_strategy(
    strategy: Dict,
    risks: List[Dict],
    nli_scorer: NliScorer,
) -> List[Dict]:
    pairs: List[Dict] = []
    g_seg = strategy["segment"]
    g_reg = strategy["region"]
    hyp = strategy["hypothesis"]
    strategy_title = strategy.get("strategy_title")
    strategy_focus = strategy.get("strategy_focus")
    strategy_direction = strategy.get("strategy_direction")
    for risk in risks:
        r_name = risk["name"]
        r_premise = risk["premise"]
        r_seg = risk["segment"]
        r_reg = risk["region"]
        r_type = risk["risk_type"]
        r_similarity = _to_float(risk.get("similarity", 0.0), 0.0)
        probs = nli_scorer.score(premise=r_premise, hypothesis=hyp)
        p_con = probs["CONTRADICTION"]
        p_ent = probs.get("ENTAILMENT", 0.0)
        p_neu = probs.get("NEUTRAL", 0.0)
        nli_score = p_con
        combined_score = nli_score
        verdict = max(
            [("CONTRADICT", p_con), ("ENTAIL", p_ent), ("NEUTRAL", p_neu)],
            key=lambda x: x[1],
        )[0]
        pdf_name = risk.get("pdf_name") or f"{r_seg}-{r_reg}.pdf"
        page = risk.get("page") or 1
        pair = create_risk_pair(
            hypothesis=hyp,
            risk_id=r_name,
            risk_name=r_name,
            risk_text=r_premise,
            segment=r_seg,
            region=r_reg,
            risk_type=r_type,
            entailment=p_ent,
            contradiction=p_con,
            neutral=p_neu,
            verdict=verdict,
            nli_score=nli_score,
            segment_region_weight=None,
            factor_conflict=0.0,
            combined_score=combined_score,
            conflict_factors={},
            retrieval_similarity=r_similarity,
            pdf_name=pdf_name,
            page=page,
            quote=risk.get("quote"),
            strategy_title=strategy_title,
            strategy_segment=g_seg,
            strategy_region=g_reg,
            strategy_focus=strategy_focus,
            strategy_direction=strategy_direction,
            model_name=nli_scorer.model_name,
        )
        pairs.append(pair.to_dict())
    pairs.sort(key=lambda item: item["combined_score"], reverse=True)
    return pairs


def main() -> None:
    nli_scorer = get_nli_scorer()
    print(f"➡️ NLI Backend: {nli_scorer.backend} ({nli_scorer.model_name})")
    print("➡️ Step 1: Load Strategy + Hypotheses")
    try:
        strategy_payload = load_strategy_payload(PATHS)
    except Exception as exc:
        print(f"⚠️ {exc}")
        return
    strategy_variants = build_strategy_variants(strategy_payload)
    print(f"➡️ Using {len(strategy_variants)} hypothesis variants.")
    if not strategy_variants:
        print("⚠️ No hypotheses found for risk analysis.")
        return
    print("➡️ Step 2: Load Risks")
    risks = load_risks_from_parquet(PATHS)
    print(f"ℹ️ Loaded {len(risks)} risks")
    print("➡️ Step 3: NLI-based Risk Ranking")
    all_pairs = []
    for strategy in strategy_variants:
        pairs = rank_risks_for_strategy(strategy, risks, nli_scorer)
        all_pairs.extend(pairs)
    print("➡️ Step 4: Save Report")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    import json

    output_file = OUTPUT_DIR / "risk_pairs_nli_simple.json"
    with output_file.open("w", encoding="utf-8") as f:
        json.dump(
            {
                "pairs": all_pairs,
                "metadata": {
                    "model": nli_scorer.model_name,
                    "hypothesis_count": len(strategy_variants),
                    "risk_count": len(risks),
                    "method": "NLI + Retrieval only",
                },
            },
            f,
            indent=2,
            ensure_ascii=False,
        )
    print(f"✅ Saved {len(all_pairs)} risk pairs to {output_file}")
    print("✅ Simple NLI-based Risk Mapping completed.")


if __name__ == "__main__":
    main()
