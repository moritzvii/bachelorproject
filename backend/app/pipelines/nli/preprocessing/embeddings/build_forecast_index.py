from __future__ import annotations
from pathlib import Path
from os import getenv
import sys
from typing import List
import faiss
import numpy as np
import pandas as pd
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=getenv("OPENAI_API_KEY"))

BASE_DIR = Path(__file__).resolve().parent


def _resolve_nli_root(current: Path) -> Path:
    for parent in current.resolve().parents:
        if parent.name == "nli" and parent.parent.name in {
            "pipelines",
            "core",
            "helpers",
        }:
            return parent
    raise RuntimeError(
        "Unable to resolve nli root directory (expected pipelines/nli or helpers/nli)."
    )


NLI_ROOT = _resolve_nli_root(BASE_DIR)

PIPELINE_ROOT = NLI_ROOT / "pipeline"

if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))

from paths import PipelinePaths

PATHS = PipelinePaths.from_file(Path(__file__))

MERGED_PREMISES = PATHS.merged_premises_file

CURATED_FORECASTS = PATHS.forecasts_parquet

INDEX_DIR = PATHS.embeddings_index_dir

INDEX_FILE = INDEX_DIR / "premises.faiss"

META_FILE = INDEX_DIR / "premises_meta.parquet"

TEXT_COL = "premise_text"

ID_COL = "premise_id"

EMBEDDING_MODEL = "text-embedding-3-small"


def load_premises(path: Path) -> pd.DataFrame:
    if not path.exists():
        raise FileNotFoundError(
            f"{path} nicht gefunden. "
            "Lauf zuerst preprocessing/merge_premises.py (app/pipelines/nli/preprocessing)."
        )
    df = pd.read_parquet(path)
    if TEXT_COL not in df.columns:
        raise ValueError(
            f"Spalte '{TEXT_COL}' nicht im Premise-Parquet gefunden. "
            f"Spalten: {list(df.columns)}"
        )
    if ID_COL not in df.columns:
        df = df.reset_index(drop=True)
        df[ID_COL] = range(len(df))
        df.to_parquet(path, index=False)
    df[ID_COL] = df[ID_COL].astype(str)
    return df


def embed_batch(texts: List[str]) -> np.ndarray:
    resp = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts,
    )
    vectors = [np.array(item.embedding, dtype="float32") for item in resp.data]
    return np.vstack(vectors)


def build_embeddings(texts: List[str], batch_size: int = 64) -> np.ndarray:
    all_vecs: List[np.ndarray] = []
    for start in range(0, len(texts), batch_size):
        end = start + batch_size
        batch = texts[start:end]
        print(f"➡️ Embedding Batch {start}–{end-1} ({len(batch)} Texte)…")
        vecs = embed_batch(batch)
        all_vecs.append(vecs)
    emb = np.vstack(all_vecs)
    norms = np.linalg.norm(emb, axis=1, keepdims=True) + 1e-12
    emb = emb / norms
    return emb.astype("float32")


def main() -> None:
    print(f"➡️ Lade forecasts-statista (Statista + curated) aus {MERGED_PREMISES}")
    if CURATED_FORECASTS.exists():
        print(f"ℹ️ Curated forecasts eingebunden aus {CURATED_FORECASTS}")
    else:
        print(f"ℹ️ Hinweis: Keine curated forecasts gefunden unter {CURATED_FORECASTS}")
    df = load_premises(MERGED_PREMISES)
    print(f"✅ {len(df)} forecasts-statista geladen.")
    if "kind" in df.columns:
        kind_counts = df["kind"].fillna("unknown").value_counts().to_dict()
        print(f"   Breakdown by kind: {kind_counts}")
    texts = df[TEXT_COL].astype(str).tolist()
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    print(f"➡️ Baue OpenAI-Embeddings mit {EMBEDDING_MODEL} …")
    emb = build_embeddings(texts, batch_size=64)
    d = emb.shape[1]
    print(f"➡️ Erzeuge FAISS IndexFlatIP mit Dimension {d}")
    index = faiss.IndexFlatIP(d)
    index.add(emb)
    print(f"➡️ Speichere Index → {INDEX_FILE}")
    faiss.write_index(index, str(INDEX_FILE))
    print(f"➡️ Speichere Meta-Daten → {META_FILE}")
    meta = df[[ID_COL, TEXT_COL]].copy()
    meta.to_parquet(META_FILE, index=False)
    print(f"✅ Fertig: {len(df)} forecasts-statista im Index.")


if __name__ == "__main__":
    main()
