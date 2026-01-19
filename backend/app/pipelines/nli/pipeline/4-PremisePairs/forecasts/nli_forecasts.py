from __future__ import annotations
import json
import sys
from os import getenv
from pathlib import Path
from typing import Dict, Iterable, List
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from openai import OpenAI

BASE_DIR = Path(__file__).resolve().parent

PIPELINE_STAGE_DIR = BASE_DIR.parent

PIPELINE_ROOT = PIPELINE_STAGE_DIR.parent

if str(PIPELINE_STAGE_DIR) not in sys.path:
    sys.path.insert(0, str(PIPELINE_STAGE_DIR))

if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))

from pair_schema import PairReport, create_forecast_pair
from paths import PipelinePaths
from shared import NliScorer, get_nli_scorer, ts_utc

PATHS = PipelinePaths.from_file(Path(__file__))

FORECASTS_PARQUET = PATHS.forecasts_parquet

STRATEGY_WITH_HYPOTHESES = PATHS.hypotheses_file

OUTPUT_DIR = PATHS.forecast_reports_out_dir

OUTPUT_FILE = OUTPUT_DIR / "forecast_pairs.json"

EMBEDDING_MODEL = "text-embedding-3-small"

DEFAULT_PAGE = 1

load_dotenv()

client = OpenAI(api_key=getenv("OPENAI_API_KEY"))


def _embed_texts(texts: List[str], batch_size: int = 64) -> np.ndarray:
    vectors: List[np.ndarray] = []
    for start in range(0, len(texts), batch_size):
        end = start + batch_size
        batch = texts[start:end]
        resp = client.embeddings.create(model=EMBEDDING_MODEL, input=batch)
        for item in resp.data:
            vectors.append(np.array(item.embedding, dtype="float32"))
    emb = np.vstack(vectors)
    norms = np.linalg.norm(emb, axis=1, keepdims=True) + 1e-12
    return emb / norms


def load_forecasts() -> pd.DataFrame:
    if not FORECASTS_PARQUET.exists():
        raise FileNotFoundError(f"Curated forecasts missing: {FORECASTS_PARQUET}")
    df = pd.read_parquet(FORECASTS_PARQUET)
    if df.empty:
        raise ValueError(f"{FORECASTS_PARQUET} is empty.")
    if "nli" not in df.columns:
        raise ValueError(f"{FORECASTS_PARQUET} needs an 'nli' column.")
    df["premise_text"] = df["nli"].astype(str)
    base_ids = (
        df["forecast_id"]
        if "forecast_id" in df.columns
        else pd.Series([None] * len(df), index=df.index)
    )
    risk_names = (
        df["risk_name"]
        if "risk_name" in df.columns
        else pd.Series([None] * len(df), index=df.index)
    )
    fallback_ids = pd.Series(range(len(df)), index=df.index).map(
        lambda i: f"forecast_{i}"
    )
    df["premise_id"] = base_ids.fillna(risk_names).fillna(fallback_ids)
    df = df[df["premise_text"].str.strip() != ""]
    if df.empty:
        raise ValueError(f"{FORECASTS_PARQUET} contains no usable premise_text values.")
    return df.reset_index(drop=True)


def load_strategy_data() -> dict:
    if not STRATEGY_WITH_HYPOTHESES.exists():
        raise FileNotFoundError(f"Hypotheses file missing: {STRATEGY_WITH_HYPOTHESES}")
    payload = json.loads(STRATEGY_WITH_HYPOTHESES.read_text(encoding="utf-8"))
    if not payload.get("hypotheses"):
        raise ValueError("Strategy payload contains no hypotheses.")
    return payload


def compute_similarity_matrix(hypotheses: List[str], premises: List[str]) -> np.ndarray:
    if not hypotheses or not premises:
        return np.zeros((len(hypotheses), len(premises)), dtype="float32")
    if not getenv("OPENAI_API_KEY"):
        print(
            "⚠️ OPENAI_API_KEY missing for forecast similarity embeddings; using zeros."
        )
        return np.zeros((len(hypotheses), len(premises)), dtype="float32")
    try:
        hyp_emb = _embed_texts(hypotheses, batch_size=32)
        prem_emb = _embed_texts(premises, batch_size=32)
        return hyp_emb @ prem_emb.T
    except Exception as exc:
        print(f"⚠️ Embedding similarity failed ({exc}); using zeros.")
        return np.zeros((len(hypotheses), len(premises)), dtype="float32")


def build_pairs(
    hypotheses: Iterable[str],
    premises: pd.DataFrame,
    nli_scorer: NliScorer,
    similarity_matrix: np.ndarray,
    strategy_data: dict,
) -> List[dict]:
    rows: List[dict] = []
    strategy_title = strategy_data.get("strategy_title")
    strategy_segment = strategy_data.get("segment")
    strategy_region = strategy_data.get("region")
    strategy_focus = strategy_data.get("focus")
    strategy_direction = strategy_data.get("direction")
    for hyp_idx, hypothesis in enumerate(hypotheses):
        if not str(hypothesis).strip():
            continue
        for prem_idx, (_, row) in enumerate(premises.iterrows()):
            premise_text = str(row["premise_text"])
            scores = nli_scorer.score(premise_text, hypothesis)
            ent = float(scores.get("ENTAILMENT", 0.0))
            con = float(scores.get("CONTRADICTION", 0.0))
            neu = float(scores.get("NEUTRAL", 0.0))
            verdict = max(
                [("ENTAIL", ent), ("CONTRADICT", con), ("NEUTRAL", neu)],
                key=lambda pair: pair[1],
            )[0]
            similarity = float(similarity_matrix[hyp_idx, prem_idx])
            combined_score = ent
            pair = create_forecast_pair(
                hypothesis=hypothesis,
                premise_id=str(row.get("premise_id", "")),
                premise_text=premise_text,
                quote=row.get("risk_text_quote") or row.get("quote"),
                segment=row.get("segment"),
                region=row.get("region"),
                year=None,
                source=row.get("pdf_filename") or row.get("source"),
                kind=row.get("risk_type") or "forecast",
                nli_target=None,
                entailment=ent,
                contradiction=con,
                neutral=neu,
                verdict=verdict,
                similarity=similarity,
                combined_score=combined_score,
                pdf_name=row.get("pdf_filename"),
                page=(
                    int(row.get("page_start"))
                    if not pd.isna(row.get("page_start"))
                    else DEFAULT_PAGE
                ),
                strategy_title=strategy_title,
                strategy_segment=strategy_segment,
                strategy_region=strategy_region,
                strategy_focus=strategy_focus,
                strategy_direction=strategy_direction,
                model_name=nli_scorer.model_name,
            )
            rows.append(pair.to_dict())
    return rows


def main() -> None:
    print(f"➡️ Lade Hypothesen aus {STRATEGY_WITH_HYPOTHESES}")
    strategy_data = load_strategy_data()
    hypotheses: List[str] = [
        str(h).strip() for h in strategy_data.get("hypotheses", []) if str(h).strip()
    ]
    print(f"✅ {len(hypotheses)} Hypothesen geladen.")
    print(f"➡️ Lade curated forecasts aus {FORECASTS_PARQUET}")
    forecasts = load_forecasts()
    print(f"✅ {len(forecasts)} Forecast-Zeilen geladen.")
    print("➡️ Berechne Embedding-Ähnlichkeiten (Hypothese ↔ Forecast)")
    premise_texts = forecasts["premise_text"].astype(str).tolist()
    sim_matrix = compute_similarity_matrix(hypotheses, premise_texts)
    nli_scorer = get_nli_scorer()
    print(f"➡️ NLI Backend: {nli_scorer.backend} ({nli_scorer.model_name})")
    print("➡️ Scoring Hypothesis/Premise Kombinationen …")
    pairs = build_pairs(hypotheses, forecasts, nli_scorer, sim_matrix, strategy_data)
    if not pairs:
        print("⚠️ Keine Forecast-Paare erzeugt.")
        return
    unique_per_premise: Dict[str, dict] = {}
    for row in pairs:
        pid = row.get("premise_id", "")
        if (
            pid not in unique_per_premise
            or row["entailment"] > unique_per_premise[pid]["entailment"]
        ):
            unique_per_premise[pid] = row
    rows_sorted = sorted(
        unique_per_premise.values(),
        key=lambda r: r.get("combined_score", 0.0),
        reverse=True,
    )
    report = PairReport(
        report_type="forecast",
        created_at=ts_utc(),
        model_name=nli_scorer.model_name,
        hypothesis_count=len(hypotheses),
        premise_count=len(forecasts),
        pair_count=len(rows_sorted),
        pairs=rows_sorted,
        metadata={
            "source": str(FORECASTS_PARQUET),
            "embedding_model": EMBEDDING_MODEL,
        },
    )
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(report.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"✅ {len(rows_sorted)} Forecast-Paare gespeichert → {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
