from __future__ import annotations
from pathlib import Path
import sys
import uuid
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent

for parent in BASE_DIR.resolve().parents:
    if parent.name == "nli" and parent.parent.name in {"pipelines", "core", "helpers"}:
        NLI_ROOT = parent
        break

else:
    raise RuntimeError(
        "Unable to resolve nli root directory (expected pipelines/nli or helpers/nli)."
    )

PIPELINE_ROOT = NLI_ROOT / "pipeline"

if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))

from paths import PipelinePaths

PATHS = PipelinePaths.from_file(Path(__file__))

RISKS_XLSX = PATHS.raw_risks_dir / "risks.xlsx"

OUT_DIR = PATHS.preprocess_risks_out

OUT_PARQUET = PATHS.risks_parquet


def main() -> None:
    print(f"BASE_DIR   : {BASE_DIR}")
    print(f"RISKS_XLSX : {RISKS_XLSX}")
    print(f"OUT_PARQUET: {OUT_PARQUET}")
    if not RISKS_XLSX.exists():
        raise FileNotFoundError(f"Input file not found: {RISKS_XLSX}")
    df = pd.read_excel(RISKS_XLSX)
    col_map = {c: str(c).strip().lower() for c in df.columns}
    df.columns = list(col_map.values())
    if "pdf" in df.columns and "pdf_name" not in df.columns:
        df = df.rename(columns={"pdf": "pdf_name"})
    if "page_number" in df.columns and "page" not in df.columns:
        df = df.rename(columns={"page_number": "page"})
    if "risk_id" not in df.columns:
        df["risk_id"] = pd.NA
    ids: list[str] = []
    for val in df["risk_id"]:
        cleaned = str(val).strip() if not pd.isna(val) else ""
        ids.append(cleaned or uuid.uuid4().hex)
    df["risk_id"] = ids
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT_PARQUET, index=False)
    print(f"✅ {len(df)} Zeilen nach {OUT_PARQUET} geschrieben")


if __name__ == "__main__":
    main()
