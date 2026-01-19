from __future__ import annotations
import sys
import uuid
from pathlib import Path
from typing import Tuple
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
from regions import normalize_region as normalize_region_canonical

PATHS = PipelinePaths.from_file(Path(__file__))

FORECASTS_XLSX = PATHS.raw_forecasts_dir / "forecasts.xlsx"

OUT_DIR = PATHS.preprocess_forecasts_out

OUT_PARQUET = PATHS.forecasts_parquet

ID_COLUMN = "forecast_id"

SHEET_NAME = "Forecast"

WEARABLES_HOME_ACCESSORIES = "Wearables, Home and Accessories"

SEGMENT_CANONICAL = {
    "iphone": "iPhone",
    "ipad": "iPad",
    "mac": "Mac",
    "watch": "Watch",
    "services": "Services",
    "app": "Services",
    "apps": "Services",
    "app store": "Services",
    "appstore": "Services",
    "accessories": "Accessories",
    "pc": "Mac",
    "computer": "Mac",
    "devices": "Smartphones",
    "smartphones": "Smartphones",
    "tablet": "Tablet",
    "tablets": "Tablet",
    "wearables": WEARABLES_HOME_ACCESSORIES,
}

SUBSEGMENT_PARENT = {
    "laptop": "Mac",
    "laptops": "Mac",
    "smart speaker": WEARABLES_HOME_ACCESSORIES,
    "smartspeaker": WEARABLES_HOME_ACCESSORIES,
    "smartspeakers": WEARABLES_HOME_ACCESSORIES,
    "smartwatch": WEARABLES_HOME_ACCESSORIES,
    "smart watches": WEARABLES_HOME_ACCESSORIES,
    "smartwatches": WEARABLES_HOME_ACCESSORIES,
    "smart watch": WEARABLES_HOME_ACCESSORIES,
    "smart-watch": WEARABLES_HOME_ACCESSORIES,
}


def normalize_region(value: object) -> str:
    if not isinstance(value, str) or not value.strip():
        return "Worldwide"
    cleaned = value.strip()
    lowered = cleaned.casefold()
    if lowered == "apac":
        return "Apac"
    if lowered == "all":
        return "Worldwide"
    normalized = normalize_region_canonical(cleaned)
    return normalized or cleaned.title()


def normalize_segment_hierarchy(value: object) -> Tuple[str, str | None]:
    if not isinstance(value, str):
        return "", None
    cleaned = value.strip()
    if not cleaned:
        return "", None
    key = cleaned.casefold()
    if key == "wearables":
        return WEARABLES_HOME_ACCESSORIES, "Smartwatches"
    if key in {"appstore", "app store"}:
        return "Services", "App Store"
    parent = SUBSEGMENT_PARENT.get(key)
    if parent:
        return parent, cleaned.title()
    canonical = SEGMENT_CANONICAL.get(key)
    if canonical:
        return canonical, None
    return cleaned.title(), None


def main() -> None:
    print(f"BASE_DIR      : {BASE_DIR}")
    print(f"FORECASTS_XLSX: {FORECASTS_XLSX}")
    print(f"SHEET_NAME    : {SHEET_NAME}")
    print(f"OUT_PARQUET   : {OUT_PARQUET}")
    if not FORECASTS_XLSX.exists():
        raise FileNotFoundError(f"Input file not found: {FORECASTS_XLSX}")
    workbook = pd.ExcelFile(FORECASTS_XLSX)
    if SHEET_NAME not in workbook.sheet_names:
        raise ValueError(
            f"Worksheet '{SHEET_NAME}' not found in {FORECASTS_XLSX}. "
            f"Available sheets: {', '.join(workbook.sheet_names)}"
        )
    df = pd.read_excel(workbook, sheet_name=SHEET_NAME)
    col_map = {c: str(c).strip().lower() for c in df.columns}
    df.columns = list(col_map.values())
    if "pdf" in df.columns and "pdf_name" not in df.columns:
        df = df.rename(columns={"pdf": "pdf_name"})
    if "page_number" in df.columns and "page" not in df.columns:
        df = df.rename(columns={"page_number": "page"})
    if ID_COLUMN not in df.columns:
        df[ID_COLUMN] = pd.NA
    ids: list[str] = []
    for val in df[ID_COLUMN]:
        cleaned = str(val).strip() if not pd.isna(val) else ""
        ids.append(cleaned or uuid.uuid4().hex)
    df[ID_COLUMN] = ids
    if "region" in df.columns:
        df["region"] = df["region"].apply(normalize_region)
    segment_parent: list[str] = []
    segment_sub: list[str | None] = []
    seg_series = (
        df["segment"] if "segment" in df.columns else pd.Series([None] * len(df))
    )
    for raw in seg_series:
        parent, sub = normalize_segment_hierarchy(raw)
        segment_parent.append(parent)
        segment_sub.append(sub)
    df["segment"] = segment_parent
    df["segment_sub"] = segment_sub
    df["kind"] = pd.NA
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    df.to_parquet(OUT_PARQUET, index=False)
    print(f"✅ {len(df)} Zeilen nach {OUT_PARQUET} geschrieben")


if __name__ == "__main__":
    main()
