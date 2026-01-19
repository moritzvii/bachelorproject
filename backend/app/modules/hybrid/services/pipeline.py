from __future__ import annotations
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from fastapi import HTTPException, status
from app.infrastructure.paths import BackendPaths
from app.infrastructure.presets import (
    list_preset_strategy_ids,
    load_pairs_preset,
    persist_preset_pairs,
)

from app.modules.hybrid.services.scoring import (
    run_calibration_script,
    run_scoring_script,
    run_strategy_script,
)

from app.modules.hybrid.services.workflow_state import (
    load_human_factors,
    load_selected_strategy_id,
)


def load_historical_timings(paths: BackendPaths) -> dict[str, float]:
    try:
        if paths.pipeline_timings_file.exists():
            with open(paths.pipeline_timings_file, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return {
        "2-Hypothesen": 10.0,
        "3-Embeddings": 20.0,
        "3-Embeddings/Forecast-Retrieve": 30.0,
        "3-Embeddings/Risk-Retrieve": 20.0,
        "4-PremisePairs/forecast-reports": 60.0,
        "4-PremisePairs/risk-reports": 60.0,
        "5-Reports": 10.0,
        "6-UserReview": 5.0,
    }


def save_stage_timing(paths: BackendPaths, stage: str, duration: float) -> None:
    try:
        timings = load_historical_timings(paths)
        if stage in timings:
            timings[stage] = timings[stage] * 0.7 + duration * 0.3
        else:
            timings[stage] = duration
        paths.pipeline_timings_file.parent.mkdir(parents=True, exist_ok=True)
        with open(paths.pipeline_timings_file, "w", encoding="utf-8") as f:
            json.dump(timings, f, indent=2)
    except Exception:
        pass


def write_pipeline_status(
    paths: BackendPaths,
    stage: str,
    stage_name: str,
    status_type: str = "running",
    progress: float = 0.0,
    est_remaining: int = 0,
) -> None:
    try:
        paths.pipeline_status_file.parent.mkdir(parents=True, exist_ok=True)
        status_data = {
            "status": status_type,
            "current_stage": stage,
            "stage_name": stage_name,
            "timestamp": str(Path(__file__).stat().st_mtime),
            "progress": progress,
            "estimated_seconds_remaining": est_remaining,
        }
        with open(paths.pipeline_status_file, "w", encoding="utf-8") as f:
            json.dump(status_data, f, indent=2)
    except Exception:
        pass


def cleanup_previous_outputs(paths: BackendPaths) -> None:
    targets = [
        paths.forecast_out_dir / "premise_hypothesis_pairs.json",
        paths.forecast_out_dir / "premise_hypothesis_top5.json",
        paths.forecast_out_dir / "forecast_pairs.json",
        paths.retrieve_risk_out_dir / "risk_candidates.parquet",
        paths.risk_out_dir / "risk_pairs_nli_simple.json",
        paths.risk_out_dir / "risk_hybrid_pairs.json",
        paths.risk_out_dir / "risk_hybrid_top5.json",
        paths.risk_out_dir / "risk_score_explanations.json",
        paths.workdir / "merged_pairs.json",
        paths.user_review_out_dir / "mean_scores.json",
    ]
    for path in targets:
        try:
            path.unlink()
        except FileNotFoundError:
            continue
        except Exception:
            continue


def clean_workdir_out_dirs(paths: BackendPaths) -> dict[str, list[str]]:
    removed: list[str] = []
    skipped: list[str] = []
    errors: list[str] = []
    candidate_roots = {
        paths.workdir_root.resolve(),
        paths.default_workdir_root.resolve(),
    }
    data_root_env = os.getenv("NLI_DATA_ROOT")
    if data_root_env:
        try:
            candidate_roots.add((Path(data_root_env).resolve() / "workdir").resolve())
        except Exception:
            pass
    preserve_roots = {(root / "0-preprocessing").resolve() for root in candidate_roots}
    for root in candidate_roots:
        if not root.exists():
            continue
        for out_path in root.rglob("out"):
            if not out_path.is_dir():
                continue
            if any(p == out_path or p in out_path.parents for p in preserve_roots):
                skipped.append(str(out_path))
                continue
            try:
                shutil.rmtree(out_path)
                removed.append(str(out_path))
            except FileNotFoundError:
                continue
            except Exception as exc:
                errors.append(f"{out_path}: {exc}")
    return {
        "removed": sorted(set(removed)),
        "skipped": sorted(set(skipped)),
        "errors": errors,
    }


def _ensure_artifact(
    target: Path, fallback: Path, missing: list[str], remedy: str
) -> None:
    if target.exists():
        return
    if fallback.exists():
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(fallback, target)
            return
        except Exception as exc:
            missing.append(f"{target} (copy from {fallback} failed: {exc})")
            return
    missing.append(f"{target} ({remedy})")


def require_preprocessing_artifacts(paths: BackendPaths) -> None:
    missing: list[str] = []
    _ensure_artifact(
        paths.preprocessed_risks,
        paths.default_preprocessed_risks,
        missing,
        "run preprocessing/risks/parquet-transformer.py",
    )
    _ensure_artifact(
        paths.merged_premises_source,
        paths.default_merged_premises,
        missing,
        "run preprocessing/merge_premises.py",
    )
    _ensure_artifact(
        paths.forecast_index_file,
        paths.default_forecast_index,
        missing,
        "run preprocessing/embeddings/build_forecast_index.py",
    )
    _ensure_artifact(
        paths.risk_index_file,
        paths.default_risk_index,
        missing,
        "run preprocessing/embeddings/build_risk_index.py",
    )
    if missing:
        message = (
            f"Preprocessing required under {paths.preprocessing_root}: "
            + "; ".join(missing)
        )
        write_pipeline_status(paths, "preprocessing", message, "failed", 0.0, 0)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )


def run_pipeline_script(
    paths: BackendPaths,
    stage_dir: str,
    script_name: str,
    stage_label: str,
    timeout_seconds: int = 300,
) -> None:
    script_path = paths.pipeline_root / stage_dir / script_name
    if not script_path.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline script not found: {script_path}",
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
            detail=f"Failed at {stage_label}: {error_msg[:500]}",
        )


def _build_default_stages() -> list[tuple[str, str, str]]:
    default_stages: list[tuple[str, str, str]] = [
        ("2-Hypothesen", "strategy_hypotheses.py", "Generating hypotheses"),
    ]
    default_stages.extend(
        [
            (
                "3-Embeddings/Forecast-Retrieve",
                "retrieve_candidates.py",
                "Retrieving forecast candidates",
            ),
            (
                "3-Embeddings/Risk-Retrieve",
                "retrieve_candidates.py",
                "Retrieving risk candidates (fresh)",
            ),
            (
                "3-Embeddings/Risk-Retrieve",
                "retrieve_candidates.py",
                "Retrieving risk candidates",
            ),
            (
                "4-PremisePairs/forecast-reports",
                "nli_premise_pairs.py",
                "Analyzing forecast alignments",
            ),
            (
                "4-PremisePairs/risk-reports",
                "risk_nli_simple.py",
                "Analyzing risk alignments",
            ),
            ("5-Reports", "merge_pairs.py", "Merging evidence reports"),
            ("6-UserReview", "add_user_status.py", "Initializing user review"),
        ]
    )
    return default_stages


def run_pipeline(paths: BackendPaths) -> dict:
    try:
        cleanup_previous_outputs(paths)
        historical_timings = load_historical_timings(paths)
        selected_strategy_id = load_selected_strategy_id(paths)
        preset_ids = list_preset_strategy_ids(paths)
        preset_pairs_path = (
            (paths.pairs_presets_dir / f"pairs-{selected_strategy_id}.json")
            if selected_strategy_id
            else None
        )
        if preset_pairs_path and preset_pairs_path.exists():
            try:
                preset_pairs_payload = load_pairs_preset(paths, selected_strategy_id)
                if not preset_pairs_payload:
                    write_pipeline_status(
                        paths,
                        "error",
                        f"Preset '{selected_strategy_id}' missing pairs payload. Deploy pairs-{selected_strategy_id}.json.",
                        "failed",
                        0.0,
                        0,
                    )
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            f"Preset '{selected_strategy_id}' requires pairs-{selected_strategy_id}.json in frontend/public/presets."
                        ),
                    )
                estimated_preset_time = int(historical_timings.get("6-UserReview", 5.0))
                write_pipeline_status(
                    paths,
                    "preset",
                    "Using preset evidence",
                    "running",
                    0.0,
                    estimated_preset_time,
                )
                persist_preset_pairs(paths, selected_strategy_id, preset_pairs_payload)
                stage_start = time.time()
                run_pipeline_script(
                    paths,
                    "6-UserReview",
                    "add_user_status.py",
                    "Initializing user review (preset evidence)",
                    timeout_seconds=120,
                )
                save_stage_timing(paths, "6-UserReview", time.time() - stage_start)
                try:
                    scoring_stages = [
                        ("7-Scoring", "score_summary.py", "score summary"),
                        ("7-Scoring", "intervall.py", "score intervals"),
                    ]
                    for stage_dir, script_name, stage_label in scoring_stages:
                        run_scoring_script(paths, stage_dir, script_name, stage_label)
                    fa, ra, fc, rc = load_human_factors(paths)
                    try:
                        run_calibration_script(paths, fa, ra, fc, rc)
                    except Exception:
                        pass
                    try:
                        run_strategy_script(paths)
                    except Exception:
                        pass
                except HTTPException:
                    raise
                except Exception as exc:
                    write_pipeline_status(
                        paths,
                        "error",
                        f"Preset scoring failed: {exc!s}",
                        "failed",
                        0.0,
                        0,
                    )
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Preset scoring failed: {exc!s}",
                    ) from exc
                write_pipeline_status(
                    paths, "completed", "Preset evidence ready...", "success", 100.0, 0
                )
                return {
                    "status": "success",
                    "message": "Preset evidence ready...",
                }
            except HTTPException:
                raise
            except Exception as exc:
                write_pipeline_status(
                    paths, "error", f"Preset pipeline failed: {exc!s}", "failed", 0.0, 0
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Preset pipeline failed: {exc!s}",
                ) from exc
        if (
            selected_strategy_id
            and selected_strategy_id in preset_ids
            and not (preset_pairs_path and preset_pairs_path.exists())
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Preset '{selected_strategy_id}' selected but pairs-{selected_strategy_id}.json is missing in frontend/public/presets."
                ),
            )
        require_preprocessing_artifacts(paths)
        stages = _build_default_stages()
        total_estimated_duration = sum(
            historical_timings.get(stage_dir, 30.0) for stage_dir, _, _ in stages
        )
        write_pipeline_status(
            paths,
            "starting",
            "Initializing pipeline",
            "running",
            0.0,
            int(total_estimated_duration),
        )
        elapsed_duration = 0.0
        for idx, (stage_dir, script_name, stage_name) in enumerate(stages):
            stage_estimated_duration = historical_timings.get(stage_dir, 30.0)
            remaining_stages_duration = sum(
                historical_timings.get(s[0], 30.0) for s in stages[idx + 1 :]
            )
            progress = (
                (elapsed_duration / total_estimated_duration) * 100
                if total_estimated_duration > 0
                else 0
            )
            estimated_remaining = int(
                stage_estimated_duration + remaining_stages_duration
            )
            write_pipeline_status(
                paths, stage_dir, stage_name, "running", progress, estimated_remaining
            )
            stage_start_time = time.time()
            script_path = paths.pipeline_root / stage_dir / script_name
            if not script_path.exists():
                write_pipeline_status(
                    paths, stage_dir, f"Script not found: {script_name}", "failed"
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Pipeline script not found: {script_path}",
                )
            result = subprocess.run(
                [sys.executable, str(script_path)],
                cwd=str(paths.pipeline_root),
                capture_output=True,
                text=True,
                timeout=300,
            )
            if result.returncode != 0:
                error_msg = result.stderr if result.stderr else result.stdout
                write_pipeline_status(
                    paths,
                    stage_dir,
                    f"Failed at {stage_name}",
                    "failed",
                    progress,
                    estimated_remaining,
                )
                return {
                    "status": "failed",
                    "message": f"Pipeline failed at stage: {stage_dir}/{script_name}",
                    "error": error_msg[:500],
                }
            stage_duration = time.time() - stage_start_time
            save_stage_timing(paths, stage_dir, stage_duration)
            elapsed_duration += stage_duration
        write_pipeline_status(
            paths, "completed", "Processing finished...", "success", 100.0, 0
        )
        return {
            "status": "success",
            "message": "Processing finished...",
        }
    except subprocess.TimeoutExpired:
        write_pipeline_status(
            paths, "timeout", "Pipeline execution timed out", "failed", 0.0, 0
        )
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Pipeline execution timed out",
        )
    except Exception as exc:
        write_pipeline_status(
            paths, "error", f"Pipeline execution failed: {exc!s}", "failed", 0.0, 0
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pipeline execution failed: {exc!s}",
        )


__all__ = [
    "clean_workdir_out_dirs",
    "load_historical_timings",
    "run_pipeline",
    "write_pipeline_status",
]
