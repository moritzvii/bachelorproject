from __future__ import annotations
import argparse
import sys
from pathlib import Path
import pandas as pd

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

SPLIT_ROOT = PATHS.preprocess_forecast_out

FORECASTS_PARQUET = PATHS.forecasts_parquet

OUTPUT_DIR = PATHS.user_input_in_dir

OUTPUT_FILE = PATHS.merged_premises_file


def gather_split_files(root: Path) -> list[Path]:
    return sorted(root.glob("*/*/premises.parquet"))


def load_statista_frames() -> list[pd.DataFrame]:
    frames: list[pd.DataFrame] = []
    split_files = gather_split_files(SPLIT_ROOT)
    if not split_files:
        print(f"[info] No forecasts-statista rows found under {SPLIT_ROOT}")
        return frames
    for f in split_files:
        frames.append(pd.read_parquet(f))
    total_rows = sum(len(frame) for frame in frames)
    print(f"[info] Loaded {total_rows} forecasts-statista rows from {SPLIT_ROOT}")
    return frames


def load_additional_forecasts() -> list[pd.DataFrame]:
    if not FORECASTS_PARQUET.exists():
        print(f"[info] Optional curated forecasts missing → {FORECASTS_PARQUET}")
        return []
    df = pd.read_parquet(FORECASTS_PARQUET)
    if df.empty:
        print(f"[info] Curated forecasts parquet empty → {FORECASTS_PARQUET}")
        return []
    mapped = pd.DataFrame()
    mapped["premise_id"] = df.get("forecast_id")
    if "risk_name" in df.columns:
        mapped["premise_id"] = mapped["premise_id"].fillna(df["risk_name"])
    mapped["premise_text"] = df.get("nli")
    if "risk_text_quote" in df.columns:
        mapped["premise_text"] = mapped["premise_text"].fillna(df["risk_text_quote"])
    mapped["quote"] = df.get("risk_text_quote")
    mapped["region"] = df.get("region")
    mapped["segment"] = df.get("segment")
    mapped["segment_sub"] = df.get("segment_sub")
    mapped["year"] = None
    mapped["kind"] = None
    mapped["source"] = df.get("pdf_filename")
    mapped["nli_target"] = None
    mapped["page"] = df.get("page_start")
    mapped["pdf_name"] = df.get("pdf_filename")
    mapped["premise_id"] = (
        mapped["premise_id"]
        .fillna(
            pd.Series(range(len(mapped)), index=mapped.index).map(
                lambda i: f"forecast_{i}"
            )
        )
        .astype(str)
    )
    mapped["premise_text"] = mapped["premise_text"].fillna("").astype(str)
    mapped = mapped[mapped["premise_text"].str.strip() != ""]
    print(f"[info] Added {len(mapped)} curated forecasts from {FORECASTS_PARQUET}")
    return [mapped]


def merge_premises(target: Path) -> None:
    statista_frames = load_statista_frames()
    curated_frames = load_additional_forecasts()
    frames = statista_frames + curated_frames
    if not frames:
        raise FileNotFoundError(
            f"No forecasts-statista parquets found under {SPLIT_ROOT} or from {FORECASTS_PARQUET}"
        )
    df = pd.concat(frames, ignore_index=True)
    for col in [
        "premise_id",
        "premise_text",
        "region",
        "segment",
        "segment_sub",
        "year",
        "kind",
        "source",
        "nli_target",
    ]:
        if col not in df.columns:
            df[col] = None
    df = df.sort_values(["region", "segment", "year", "kind"]).reset_index(drop=True)
    target.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(target, index=False)
    print(f"[ok] merged {len(df)} forecasts-statista corpus rows → {target}")


def main():
    parser = argparse.ArgumentParser(
        description="Merge Statista and curated forecast Parquets into a single file"
    )
    parser.add_argument(
        "--output",
        default=str(OUTPUT_FILE),
        help="Path for the merged forecasts parquet",
    )
    args = parser.parse_args()
    merge_premises(Path(args.output))


if __name__ == "__main__":
    main()
