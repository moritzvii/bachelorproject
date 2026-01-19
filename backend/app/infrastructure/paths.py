from __future__ import annotations
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path


@dataclass(frozen=True)
class BackendPaths:
    backend_root: Path
    project_root: Path
    pipeline_root: Path
    preprocessing_root: Path
    data_root: Path
    workdir_root: Path
    workdir: Path
    user_review_dir: Path
    merged_pairs_file: Path
    pair_status_file: Path
    selected_strategy_file: Path
    human_factors_file: Path
    matrix_adjustments_file: Path
    strategy_distribution_file: Path
    pipeline_status_file: Path
    pipeline_timings_file: Path
    forecast_out_dir: Path
    risk_out_dir: Path
    user_review_out_dir: Path
    retrieve_risk_out_dir: Path
    scoring_out_dir: Path
    score_summary_file: Path
    score_interval_file: Path
    calibration_out_dir: Path
    calibration_out_file: Path
    strategy_out_dir: Path
    strategy_out_file: Path
    presets_dir: Path
    pairs_presets_dir: Path
    merged_premises_source: Path
    preprocessed_risks: Path
    embeddings_index_dir: Path
    forecast_index_file: Path
    risk_index_file: Path
    default_data_root: Path
    default_workdir_root: Path
    default_preprocessed_risks: Path
    default_merged_premises: Path
    default_forecast_index: Path
    default_risk_index: Path


@lru_cache(maxsize=1)
def get_paths() -> BackendPaths:
    backend_root = Path(__file__).resolve().parents[2]
    nli_root = backend_root / "app" / "pipelines" / "nli"
    pipeline_root = nli_root / "pipeline"
    preprocessing_root = nli_root / "preprocessing"
    data_root = Path(
        os.getenv("NLI_DATA_ROOT", backend_root / "app" / "data" / "nli")
    ).resolve()
    workdir_root = Path(os.getenv("NLI_WORKDIR", data_root / "workdir")).resolve()
    workdir = workdir_root / "5-reports" / "out"
    user_review_dir = workdir_root / "6-userreview" / "out"
    merged_pairs_file = (workdir / "merged_pairs.json").resolve()
    pair_status_file = (user_review_dir / "pair_status.json").resolve()
    selected_strategy_file = (workdir / "selected_strategy.json").resolve()
    human_factors_file = (workdir / "human_factors.json").resolve()
    matrix_adjustments_file = (workdir / "matrix_adjustments.json").resolve()
    strategy_distribution_file = (workdir / "strategy_distribution.json").resolve()
    pipeline_status_file = (workdir / "pipeline_status.json").resolve()
    pipeline_timings_file = (workdir / "pipeline_timings.json").resolve()
    forecast_out_dir = workdir_root / "4-premisepairs" / "forecast-reports" / "out"
    risk_out_dir = workdir_root / "4-premisepairs" / "risk-reports" / "out"
    user_review_out_dir = workdir_root / "6-userreview" / "out"
    retrieve_risk_out_dir = workdir_root / "3-embeddings" / "risk-retrieve" / "out"
    scoring_out_dir = workdir_root / "7-scoring" / "out"
    score_summary_file = (scoring_out_dir / "score_summary.json").resolve()
    score_interval_file = (scoring_out_dir / "score_intervals.json").resolve()
    calibration_out_dir = workdir_root / "8-HumanKalibration" / "out"
    calibration_out_file = (
        calibration_out_dir / "score_human_calibrated.json"
    ).resolve()
    strategy_out_dir = workdir_root / "9-Strategy" / "out"
    strategy_out_file = (strategy_out_dir / "strategy_distribution.json").resolve()
    project_root = backend_root.parent
    presets_dir = Path(os.getenv("PRESETS_DIR", backend_root / "presets")).resolve()
    pairs_presets_dir = presets_dir
    merged_premises_source = (
        workdir_root / "1-user-input" / "in" / "premises.parquet"
    ).resolve()
    preprocessed_risks = (
        workdir_root / "0-preprocessing" / "risks" / "out" / "risks.parquet"
    ).resolve()
    embeddings_index_dir = (data_root / "embeddings-index").resolve()
    forecast_index_file = (embeddings_index_dir / "premises.faiss").resolve()
    risk_index_file = (embeddings_index_dir / "risks.faiss").resolve()
    default_data_root = (backend_root / "app" / "data" / "nli").resolve()
    default_workdir_root = (default_data_root / "workdir").resolve()
    default_preprocessed_risks = (
        default_workdir_root / "0-preprocessing" / "risks" / "out" / "risks.parquet"
    ).resolve()
    default_merged_premises = (
        default_workdir_root / "1-user-input" / "in" / "premises.parquet"
    ).resolve()
    default_forecast_index = (
        default_data_root / "embeddings-index" / "premises.faiss"
    ).resolve()
    default_risk_index = (
        default_data_root / "embeddings-index" / "risks.faiss"
    ).resolve()
    return BackendPaths(
        backend_root=backend_root,
        project_root=project_root,
        pipeline_root=pipeline_root,
        preprocessing_root=preprocessing_root,
        data_root=data_root,
        workdir_root=workdir_root,
        workdir=workdir,
        user_review_dir=user_review_dir,
        merged_pairs_file=merged_pairs_file,
        pair_status_file=pair_status_file,
        selected_strategy_file=selected_strategy_file,
        human_factors_file=human_factors_file,
        matrix_adjustments_file=matrix_adjustments_file,
        strategy_distribution_file=strategy_distribution_file,
        pipeline_status_file=pipeline_status_file,
        pipeline_timings_file=pipeline_timings_file,
        forecast_out_dir=forecast_out_dir,
        risk_out_dir=risk_out_dir,
        user_review_out_dir=user_review_out_dir,
        retrieve_risk_out_dir=retrieve_risk_out_dir,
        scoring_out_dir=scoring_out_dir,
        score_summary_file=score_summary_file,
        score_interval_file=score_interval_file,
        calibration_out_dir=calibration_out_dir,
        calibration_out_file=calibration_out_file,
        strategy_out_dir=strategy_out_dir,
        strategy_out_file=strategy_out_file,
        presets_dir=presets_dir,
        pairs_presets_dir=pairs_presets_dir,
        merged_premises_source=merged_premises_source,
        preprocessed_risks=preprocessed_risks,
        embeddings_index_dir=embeddings_index_dir,
        forecast_index_file=forecast_index_file,
        risk_index_file=risk_index_file,
        default_data_root=default_data_root,
        default_workdir_root=default_workdir_root,
        default_preprocessed_risks=default_preprocessed_risks,
        default_merged_premises=default_merged_premises,
        default_forecast_index=default_forecast_index,
        default_risk_index=default_risk_index,
    )


__all__ = ["BackendPaths", "get_paths"]
