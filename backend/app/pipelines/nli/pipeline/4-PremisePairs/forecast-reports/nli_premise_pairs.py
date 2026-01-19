from __future__ import annotations
import json
import sys
from pathlib import Path
from typing import Iterable
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent

PIPELINE_STAGE_DIR = BASE_DIR.parent

PIPELINE_ROOT = BASE_DIR.parent.parent

if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))

if str(PIPELINE_STAGE_DIR) not in sys.path:
    sys.path.insert(0, str(PIPELINE_STAGE_DIR))

from pair_schema import create_forecast_pair, PairReport
from paths import PipelinePaths
from shared import NliScorer, get_nli_scorer, ts_utc

PATHS = PipelinePaths.from_file(Path(__file__))

CANDIDATE_PREMISES = PATHS.forecast_retrieve_out_dir / "premise_candidates.parquet"

STRATEGY_WITH_HYPOTHESES = PATHS.hypotheses_file

OUTPUT_DIR = PATHS.forecast_reports_out_dir

ALL_RESULTS_FILE = OUTPUT_DIR / "premise_hypothesis_pairs.json"

TOP_RESULTS_FILE = OUTPUT_DIR / "premise_hypothesis_top5.json"


def _default_pdf_name(segment: str | None, region: str | None) -> str:
    seg = (segment or "unknown").strip().replace(" ", "")
    reg = (region or "unknown").strip().replace(" ", "")
    return f"{seg}-{reg}.pdf"


def _to_float(value, default: float = 0.0) -> float:
    try:
        val = float(value)
        if pd.isna(val):
            return default
        return val
    except Exception:
        return default


def load_premises(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(
            f"Premise file missing: {path}. "
            "Stelle sicher, dass preprocessing/merge_premises.py und "
            "3-Embeddings/Forecast-Retrieve/retrieve_candidates.py gelaufen sind."
        )
    df = pd.read_parquet(path)
    if "premise_text" not in df.columns:
        raise ValueError("Premises parquet needs a 'premise_text' column.")
    if df.empty:
        print(f"⚠️ {path.name} enthält keine Premises – bitte Forecast-Retrieve prüfen.")
    return df


def load_strategy_data() -> dict:
    if not STRATEGY_WITH_HYPOTHESES.exists():
        raise FileNotFoundError(f"Hypotheses file missing: {STRATEGY_WITH_HYPOTHESES}")
    return json.loads(STRATEGY_WITH_HYPOTHESES.read_text(encoding="utf-8"))


def select_premise_source() -> Path:
    return CANDIDATE_PREMISES


def build_rows(
    hypotheses: Iterable[str],
    premises: pd.DataFrame,
    nli_scorer: NliScorer,
    strategy_data: dict,
) -> list[dict]:
    rows: list[dict] = []
    strategy_title = strategy_data.get("strategy_title")
    strategy_segment = strategy_data.get("segment")
    strategy_region = strategy_data.get("region")
    strategy_focus = strategy_data.get("focus")
    strategy_direction = strategy_data.get("direction")
    for hypothesis in hypotheses:
        if not hypothesis.strip():
            continue
        for _, row in premises.iterrows():
            premise_text = str(row["premise_text"])
            scores = nli_scorer.score(premise_text, hypothesis)
            ent = float(scores.get("ENTAILMENT", 0.0))
            con = float(scores.get("CONTRADICTION", 0.0))
            neu = float(scores.get("NEUTRAL", 0.0))
            verdict = max(
                [("ENTAIL", ent), ("CONTRADICT", con), ("NEUTRAL", neu)],
                key=lambda pair: pair[1],
            )[0]
            retrieval_sim = _to_float(row.get("similarity"), 0.0)
            combined_score = ent
            pair = create_forecast_pair(
                hypothesis=hypothesis,
                premise_id=str(row.get("premise_id", "")),
                premise_text=premise_text,
                segment=row.get("segment"),
                region=row.get("region"),
                year=int(row["year"]) if not pd.isna(row["year"]) else None,
                source=row.get("source"),
                kind=row.get("kind"),
                nli_target=row.get("nli_target"),
                entailment=ent,
                contradiction=con,
                neutral=neu,
                verdict=verdict,
                quote=row.get("quote") or row.get("risk_text_quote"),
                similarity=retrieval_sim,
                combined_score=combined_score,
                strategy_title=strategy_title,
                strategy_segment=strategy_segment,
                strategy_region=strategy_region,
                strategy_focus=strategy_focus,
                strategy_direction=strategy_direction,
                model_name=nli_scorer.model_name,
                pdf_name=row.get("pdf_name")
                or _default_pdf_name(row.get("segment"), row.get("region")),
                page=row.get("page") or 1,
            )
            rows.append(pair.to_dict())
    return rows


def main() -> None:
    print(f"➡️ Loading strategy data from {STRATEGY_WITH_HYPOTHESES}")
    try:
        strategy_data = load_strategy_data()
        hypotheses = strategy_data.get("hypotheses", [])
    except Exception as exc:
        print(f"⚠️ {exc}")
        return
    if not hypotheses:
        print("⚠️ Keine gültigen Hypothesen gefunden.")
        return
    premises_path = select_premise_source()
    print(f"➡️ Loading premises from {premises_path}")
    try:
        premises = load_premises(premises_path)
    except Exception as exc:
        print(f"⚠️ {exc}")
        return
    nli_scorer = get_nli_scorer()
    print(f"➡️ NLI Backend: {nli_scorer.backend} ({nli_scorer.model_name})")
    print("➡️ Scoring hypothesis/premise combinations (this may take a moment)…")
    rows = build_rows(hypotheses, premises, nli_scorer, strategy_data)
    unique_per_premise: dict[str, dict] = {}
    for row in rows:
        pid = row.get("premise_id")
        if (
            pid not in unique_per_premise
            or row["entailment"] > unique_per_premise[pid]["entailment"]
        ):
            unique_per_premise[pid] = row
    rows = list(unique_per_premise.values())
    if not rows:
        print("⚠️ Keine Kombinationen erzeugt (Hypothesen oder Premises evtl. leer).")
        return
    rows_sorted = sorted(rows, key=lambda r: r.get("combined_score", 0.0), reverse=True)
    top_entail = [r for r in rows_sorted if r.get("verdict") == "ENTAIL"][:5]
    top_contrad = sorted(
        [r for r in rows if r.get("verdict") == "CONTRADICT"],
        key=lambda r: r["contradiction"],
        reverse=True,
    )[:5]
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    report = PairReport(
        report_type="forecast",
        created_at=ts_utc(),
        model_name=nli_scorer.model_name,
        hypothesis_count=len(hypotheses),
        premise_count=len(premises),
        pair_count=len(rows_sorted),
        pairs=rows_sorted,
    )
    ALL_RESULTS_FILE.write_text(
        json.dumps(report.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8"
    )
    top_payload = {
        "model": nli_scorer.model_name,
        "created_at": ts_utc(),
        "entailments": top_entail,
        "contradictions": top_contrad,
    }
    TOP_RESULTS_FILE.write_text(
        json.dumps(top_payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"✅ {len(rows_sorted)} Kombinationen gespeichert → {ALL_RESULTS_FILE}")
    if top_contrad:
        print(f"✅ Top-{len(top_contrad)} Contradictions → {TOP_RESULTS_FILE}")
    if top_entail:
        print(f"✅ Top-{len(top_entail)} Entailments → {TOP_RESULTS_FILE}")
    if not top_contrad and not top_entail:
        print(
            "ℹ️ Keine Contradictions oder Entailments gefunden; Top-5-Datei enthält leere Listen."
        )


if __name__ == "__main__":
    main()
