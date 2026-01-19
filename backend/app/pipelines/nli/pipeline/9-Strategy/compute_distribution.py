from __future__ import annotations
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Dict, List

BASE_DIR = Path(__file__).resolve().parent

PIPELINE_ROOT = BASE_DIR.parent

if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))

from paths import PipelinePaths

PATHS = PipelinePaths.from_file(Path(__file__))

CALIBRATED_FILE = (
    PATHS.workdir / "8-HumanKalibration" / "out" / "score_human_calibrated.json"
)

OUTPUT_DIR = PATHS.workdir / "9-Strategy" / "out"

OUTPUT_FILE = OUTPUT_DIR / "strategy_distribution.json"

REPO_ROOT = BASE_DIR.parents[4]

CELL_DEFS_FILE = REPO_ROOT / "frontend" / "src" / "data" / "strategy_matrix_cells.json"

DEFAULT_LABELS = [
    ["Protect Position", "Invest to Build", "Build Selectively"],
    ["Build Selectively", "Manage for Earnings", "Expand or Harvest"],
    ["Protect Position and Refocus", "Manage for Earnings", "Divest"],
]


def _load_cell_definitions() -> List[List[Dict[str, Any]]]:
    try:
        if not CELL_DEFS_FILE.exists():
            raise FileNotFoundError
        return json.loads(CELL_DEFS_FILE.read_text(encoding="utf-8"))
    except Exception:
        fallback: List[List[Dict[str, Any]]] = []
        for row_idx, row in enumerate(DEFAULT_LABELS):
            fallback_row: List[Dict[str, Any]] = []
            for col_idx, title in enumerate(row):
                fallback_row.append(
                    {
                        "id": f"cell-{row_idx}-{col_idx}",
                        "title": title,
                        "description": "",
                        "icon": "CircleArrowDown",
                        "row": row_idx,
                        "col": col_idx,
                    }
                )
            fallback.append(fallback_row)
        return fallback


CELL_DEFINITIONS = _load_cell_definitions()


def _ts() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def _load_calibrated() -> Dict[str, Any]:
    if not CALIBRATED_FILE.exists():
        raise FileNotFoundError(f"Calibrated scores not found at {CALIBRATED_FILE}")
    return json.loads(CALIBRATED_FILE.read_text(encoding="utf-8"))


def _extract_interval(data: Dict[str, Any], key: str) -> Dict[str, Any]:
    intervals = data.get("calibrated") or {}
    interval = intervals.get(key)
    if not interval:
        raise ValueError(f"Calibrated interval '{key}' missing.")
    return interval


def _compute_quadrant_distribution(
    x_left: float,
    x_right: float,
    y_bottom: float,
    y_top: float,
    cells_def: List[List[Dict[str, Any]]],
) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    total_area = 0.0
    cells = 3
    for row in range(cells):
        for col in range(cells):
            cell_x1 = col / cells
            cell_x2 = (col + 1) / cells
            cell_y1 = row / cells
            cell_y2 = (row + 1) / cells
            overlap_x = max(0.0, min(x_right, cell_x2) - max(x_left, cell_x1))
            overlap_y = max(0.0, min(y_top, cell_y2) - max(y_bottom, cell_y1))
            area = overlap_x * overlap_y
            total_area += area
            if area > 0:
                try:
                    display_row = len(cells_def) - 1 - row
                    display_row = max(0, min(len(cells_def) - 1, display_row))
                    cell_meta_raw = cells_def[display_row][col]
                except Exception:
                    display_row = len(DEFAULT_LABELS) - 1 - row
                    cell_meta_raw = {
                        "id": f"cell-{display_row}-{col}",
                        "title": DEFAULT_LABELS[display_row][col],
                        "description": "",
                        "icon": "CircleArrowDown",
                        "row": display_row,
                        "col": col,
                    }
                cell_meta = dict(cell_meta_raw)
                cell_meta.setdefault("display_row", display_row)
                cell_meta.setdefault("display_col", col)
                cell_meta.setdefault("matrix_row", row)
                cell_meta.setdefault("matrix_col", col)
                results.append(
                    {
                        "row": row,
                        "col": col,
                        "area": area,
                        "percentage": 0.0,
                        "label": cell_meta.get(
                            "title", DEFAULT_LABELS[len(DEFAULT_LABELS) - 1 - row][col]
                        ),
                        "cell": cell_meta,
                    }
                )
    if total_area > 0:
        for item in results:
            item["percentage"] = (item["area"] / total_area) * 100
    results.sort(key=lambda r: r["percentage"], reverse=True)
    return results


def compute_distribution() -> None:
    data = _load_calibrated()
    risk_interval = _extract_interval(data, "risk")
    forecast_interval = _extract_interval(data, "forecast")
    x_left = _clamp01(float(risk_interval.get("lower", 0.0)))
    x_right = _clamp01(float(risk_interval.get("upper", 0.0)))
    y_bottom = _clamp01(float(forecast_interval.get("lower", 0.0)))
    y_top = _clamp01(float(forecast_interval.get("upper", 0.0)))
    if x_right < x_left:
        x_left, x_right = x_right, x_left
    if y_top < y_bottom:
        y_bottom, y_top = y_top, y_bottom
    distribution = _compute_quadrant_distribution(
        x_left, x_right, y_bottom, y_top, CELL_DEFINITIONS
    )
    payload = {
        "generated_at": _ts(),
        "source_files": {
            "calibrated_scores": str(CALIBRATED_FILE),
        },
        "bounds": {
            "risk": {"lower": x_left, "upper": x_right},
            "forecast": {"lower": y_bottom, "upper": y_top},
        },
        "labels": DEFAULT_LABELS,
        "cells": CELL_DEFINITIONS,
        "distribution": distribution,
    }
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"✅ Strategy distribution saved → {OUTPUT_FILE}")


def main() -> None:
    compute_distribution()


if __name__ == "__main__":
    main()
