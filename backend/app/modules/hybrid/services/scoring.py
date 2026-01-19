from __future__ import annotations
import json
import subprocess
import sys
from datetime import UTC, datetime
from fastapi import HTTPException, status
from app.infrastructure.paths import BackendPaths


def _ts() -> str:
    return datetime.now(UTC).isoformat()


def run_scoring_script(
    paths: BackendPaths,
    stage_dir: str,
    script_name: str,
    stage_label: str,
    timeout_seconds: int = 120,
) -> None:
    script_path = paths.pipeline_root / stage_dir / script_name
    if not script_path.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scoring script not found: {script_path}",
        )
    result = subprocess.run(
        [sys.executable, str(script_path)],
        cwd=str(paths.pipeline_root),
        capture_output=True,
        text=True,
        timeout=timeout_seconds,
    )
    if result.returncode != 0:
        error_msg = result.stderr if result.stderr else result.stdout
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute {stage_label}: {error_msg[:400]}",
        )


def load_score_summary_payload(paths: BackendPaths) -> dict:
    if not paths.score_summary_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Score summary not found. Run scoring-summary stage first.",
        )
    try:
        with open(paths.score_summary_file, "r", encoding="utf-8") as f:
            summary = json.load(f)
        if paths.score_interval_file.exists():
            try:
                with open(paths.score_interval_file, "r", encoding="utf-8") as f:
                    intervals_data = json.load(f)
                    if "intervals" in intervals_data:
                        summary["intervals"] = intervals_data["intervals"]
            except Exception:
                pass
        return summary
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse score summary JSON",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load score summary: {exc!s}",
        )


def run_calibration_script(
    paths: BackendPaths,
    forecast_alignment: float,
    risk_alignment: float,
    forecast_confidence: float,
    risk_confidence: float,
    timeout_seconds: int = 120,
) -> None:
    script_path = paths.pipeline_root / "8-HumanKalibration" / "human_calibration.py"
    if not script_path.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Calibration script not found: {script_path}",
        )
    args = [
        sys.executable,
        str(script_path),
        "--forecast-alignment",
        str(forecast_alignment),
        "--risk-alignment",
        str(risk_alignment),
        "--forecast-confidence",
        str(forecast_confidence),
        "--risk-confidence",
        str(risk_confidence),
    ]
    result = subprocess.run(
        args,
        cwd=str(paths.pipeline_root),
        capture_output=True,
        text=True,
        timeout=timeout_seconds,
    )
    if result.returncode != 0:
        error_msg = result.stderr if result.stderr else result.stdout
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute human calibration: {error_msg[:400]}",
        )


def load_calibration_payload(paths: BackendPaths) -> dict:
    if not paths.calibration_out_file.exists():
        try:
            summary = load_score_summary_payload(paths)
            intervals = summary.get("intervals") if isinstance(summary, dict) else {}
            if intervals:
                return {
                    "generated_at": _ts(),
                    "source_files": {},
                    "ai": intervals,
                    "calibrated": intervals,
                }
        except Exception:
            pass
        return {
            "generated_at": _ts(),
            "source_files": {},
            "ai": {},
            "calibrated": {},
        }
    try:
        with open(paths.calibration_out_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse calibrated scores JSON",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load calibrated scores: {exc!s}",
        )


def run_strategy_script(paths: BackendPaths, timeout_seconds: int = 120) -> None:
    script_path = paths.pipeline_root / "9-Strategy" / "compute_distribution.py"
    if not script_path.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Strategy script not found: {script_path}",
        )
    result = subprocess.run(
        [sys.executable, str(script_path)],
        cwd=str(paths.pipeline_root),
        capture_output=True,
        text=True,
        timeout=timeout_seconds,
    )
    if result.returncode != 0:
        error_msg = result.stderr if result.stderr else result.stdout
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to compute strategy distribution: {error_msg[:400]}",
        )


def load_strategy_payload(paths: BackendPaths) -> dict:
    if not paths.strategy_out_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Strategy distribution not found. Run strategy stage first.",
        )
    try:
        with open(paths.strategy_out_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse strategy distribution JSON",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load strategy distribution: {exc!s}",
        )


__all__ = [
    "load_calibration_payload",
    "load_score_summary_payload",
    "load_strategy_payload",
    "run_calibration_script",
    "run_scoring_script",
    "run_strategy_script",
]
