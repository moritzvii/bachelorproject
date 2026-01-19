from __future__ import annotations
import json
import sys
from pathlib import Path
from typing import List, Set, Dict, Any
from os import getenv
import faiss
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=getenv("OPENAI_API_KEY"), timeout=10)

BASE_DIR = Path(__file__).resolve().parent

STAGE_DIR = BASE_DIR.parent

PIPELINE_ROOT = STAGE_DIR.parent

sys.path.insert(0, str(PIPELINE_ROOT))

from paths import PipelinePaths

PATHS = PipelinePaths.from_file(Path(__file__))

STRATEGY_WITH_HYPOTHESES = PATHS.hypotheses_file

MERGED_PREMISES = PATHS.merged_premises_file

INDEX_DIR = PATHS.embeddings_index_dir

INDEX_FILE = INDEX_DIR / "premises.faiss"

META_FILE = INDEX_DIR / "premises_meta.parquet"

OUTPUT_DIR = PATHS.forecast_retrieve_out_dir

RETRIEVAL_PARQUET = OUTPUT_DIR / "retrieval_candidates.parquet"

RETRIEVAL_JSONL = OUTPUT_DIR / "retrieval_candidates.jsonl"

CANDIDATE_PREMISES_FILE = OUTPUT_DIR / "premise_candidates.parquet"

TEXT_COL = "premise_text"

ID_COL = "premise_id"

EMBEDDING_MODEL = "text-embedding-3-small"

TOP_K = 5

EMPTY_COLUMNS = [
    ID_COL,
    TEXT_COL,
    "segment",
    "region",
    "year",
    "source",
    "kind",
    "nli_target",
    "pdf_name",
    "page",
    "similarity",
]


def load_strategy_payload(path: Path) -> Dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(
            f"Hypothesen-File fehlt: {path}. " "Lauf zuerst pipeline/2-Hypothesen/…"
        )
    payload = json.loads(path.read_text(encoding="utf-8"))
    hyps = payload.get("hypotheses", [])
    if not hyps:
        raise ValueError("Strategy-Objekt enthält keine Hypothesen.")
    return payload


def load_index() -> tuple[faiss.Index, pd.DataFrame]:
    if not INDEX_FILE.exists() or not META_FILE.exists():
        raise FileNotFoundError(
            "Index oder Meta fehlen. Lauf zuerst preprocessing/embeddings/build_forecast_index.py."
        )
    index = faiss.read_index(str(INDEX_FILE))
    meta = pd.read_parquet(META_FILE)
    if ID_COL not in meta.columns or TEXT_COL not in meta.columns:
        raise ValueError(
            f"Meta-Datei {META_FILE} braucht Spalten '{ID_COL}' und '{TEXT_COL}'."
        )
    meta[ID_COL] = meta[ID_COL].astype(str)
    return index, meta


def embed_query(text: str) -> np.ndarray:
    try:
        resp = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=text,
        )
    except Exception as exc:
        raise RuntimeError(f"OpenAI embedding request failed: {exc}") from exc
    vec = np.array(resp.data[0].embedding, dtype="float32")
    vec = vec / (np.linalg.norm(vec) + 1e-12)
    return vec.reshape(1, -1)


def _write_empty_outputs(meta: pd.DataFrame | None, reason: str) -> None:
    cols = list(meta.columns) if meta is not None else EMPTY_COLUMNS
    empty_df = pd.DataFrame(columns=cols)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    empty_df.to_parquet(RETRIEVAL_PARQUET, index=False)
    empty_df.to_parquet(CANDIDATE_PREMISES_FILE, index=False)
    RETRIEVAL_JSONL.write_text("", encoding="utf-8")
    print(f"⚠️ Retrieval skipped ({reason}); wrote empty outputs to {OUTPUT_DIR}")


def main() -> None:
    if not getenv("OPENAI_API_KEY"):
        _write_empty_outputs(meta=None, reason="OPENAI_API_KEY missing")
        return
    print(f"➡️ Lade Strategy + Hypothesen aus {STRATEGY_WITH_HYPOTHESES}")
    strategy_payload = load_strategy_payload(STRATEGY_WITH_HYPOTHESES)
    hypotheses: List[str] = [
        str(h).strip() for h in strategy_payload.get("hypotheses", []) if str(h).strip()
    ]
    print(f"✅ {len(hypotheses)} Hypothesen gefunden.")
    strategy_raw = strategy_payload.get("raw", "")
    strategy_title = strategy_payload.get("strategy_title", "")
    print("➡️ Lade Embedding-Index …")
    index, meta = load_index()
    all_ids: Set[str] = set()
    records: List[Dict[str, Any]] = []
    similarity_by_id: Dict[str, float] = {}
    try:
        for hyp_idx, hyp in enumerate(hypotheses):
            if not hyp:
                continue
            print(f"➡️ Embedding & Suche für Hypothese {hyp_idx}: {hyp!r}")
            q_emb = embed_query(hyp)
            scores, idx = index.search(q_emb, TOP_K)
            scores = scores[0]
            idx = idx[0]
            order = np.argsort(scores)[::-1]
            for rank_pos, pos in enumerate(order, start=1):
                row_idx = idx[pos]
                if row_idx < 0:
                    continue
                score = float(scores[pos])
                meta_row = meta.iloc[row_idx]
                pid = str(meta_row[ID_COL])
                all_ids.add(pid)
                similarity_by_id[pid] = max(similarity_by_id.get(pid, 0.0), score)
                records.append(
                    {
                        "strategy_raw": strategy_raw,
                        "strategy_title": strategy_title,
                        "hypothesis_index": hyp_idx,
                        "hypothesis": hyp,
                        "premise_id": pid,
                        "premise_text": str(meta_row[TEXT_COL]),
                        "similarity": score,
                        "rank": rank_pos,
                    }
                )
    except Exception as exc:
        _write_empty_outputs(meta, reason=str(exc))
        return
    if not records:
        print(
            "⚠️ Keine Kandidaten-Premises gefunden; premises.parquet bleibt unverändert."
        )
        return
    print(f"✅ Insgesamt {len(all_ids)} eindeutige Kandidaten-Premises.")
    print(f"✅ {len(records)} Hypothese–Premise-Retrieval-Treffer.")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    df_retrieval = pd.DataFrame(records)
    df_retrieval.to_parquet(RETRIEVAL_PARQUET, index=False)
    with open(RETRIEVAL_JSONL, "w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"➡️ Retrieval-Kandidaten gespeichert → {RETRIEVAL_PARQUET}")
    print(f"➡️ JSONL-Export → {RETRIEVAL_JSONL}")
    if not MERGED_PREMISES.exists():
        raise FileNotFoundError(
            f"{MERGED_PREMISES} nicht gefunden. "
            "Stelle sicher, dass preprocessing/merge_premises.py gelaufen ist (app/pipelines/nli/preprocessing)."
        )
    df_full = pd.read_parquet(MERGED_PREMISES)
    df_full[ID_COL] = df_full[ID_COL].astype(str)
    if ID_COL not in df_full.columns:
        raise ValueError(
            f"Premises-Parquet {MERGED_PREMISES} hat keine Spalte '{ID_COL}'. "
            "Lauf build_forecast_index.py, damit IDs erzeugt werden."
        )
    df_filtered = df_full[df_full[ID_COL].isin(all_ids)].reset_index(drop=True)
    df_filtered = df_filtered.copy()
    df_filtered["similarity"] = (
        df_filtered[ID_COL].map(similarity_by_id).fillna(0.0).astype(float)
    )
    print(
        f"➡️ Schreibe {len(df_filtered)} gefilterte Kandidaten-Premises → {CANDIDATE_PREMISES_FILE}"
    )
    df_filtered.to_parquet(CANDIDATE_PREMISES_FILE, index=False)
    print("✅ Premise-Kandidaten erfolgreich gefiltert und gespeichert.")
    print(f"ℹ️ Original-Premises bleiben unter {MERGED_PREMISES} unverändert.")


if __name__ == "__main__":
    main()
