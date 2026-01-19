from __future__ import annotations
from dataclasses import dataclass
import os
from pathlib import Path


def _resolve_nli_root(current: Path) -> Path:
    for parent in current.resolve().parents:
        if parent.name == "nli" and parent.parent.name in {
            "pipelines",
            "core",
            "helpers",
        }:
            return parent
    raise RuntimeError(
        "Unable to resolve nli root from current path (expected pipelines/nli or helpers/nli)."
    )


@dataclass(frozen=True)
class PipelinePaths:
    nli_root: Path
    pipeline_root: Path
    preprocessing_root: Path
    data_root: Path
    raw_dir: Path
    workdir: Path
    raw_forecast_dir: Path
    raw_forecasts_dir: Path
    raw_risks_dir: Path
    preprocess_forecast_out: Path
    preprocess_forecasts_out: Path
    preprocess_risks_out: Path
    user_input_in_dir: Path
    user_input_out_dir: Path
    hypotheses_out_dir: Path
    embeddings_index_dir: Path
    forecast_retrieve_out_dir: Path
    risk_retrieve_out_dir: Path
    strategic_retrieve_out_dir: Path
    forecast_reports_out_dir: Path
    event_reports_out_dir: Path
    risk_reports_out_dir: Path
    reports_out_dir: Path
    user_review_out_dir: Path
    pipeline_reports_dir: Path

    @classmethod
    def from_file(cls, current_file: Path) -> "PipelinePaths":
        nli_root = _resolve_nli_root(current_file)
        if nli_root.parent.name in {"core", "pipelines"}:
            backend_root = nli_root.parents[2]
        else:
            backend_root = nli_root.parents[1]
        pipeline_root = nli_root / "pipeline"
        preprocessing_root = nli_root / "preprocessing"
        default_data_root = backend_root / "app" / "data" / "nli"
        data_root = Path(os.getenv("NLI_DATA_ROOT", default_data_root)).resolve()
        raw_dir = data_root / "raw"
        workdir = Path(os.getenv("NLI_WORKDIR", data_root / "workdir")).resolve()
        preprocess_root = workdir / "0-preprocessing"
        user_input_root = workdir / "1-user-input"
        hypotheses_root = workdir / "2-hypothesen"
        embeddings_root = workdir / "3-embeddings"
        embeddings_index_root = data_root / "embeddings-index"
        premise_pairs_root = workdir / "4-premisepairs"
        reports_root = workdir / "5-reports"
        user_review_root = workdir / "6-userreview"
        return cls(
            nli_root=nli_root,
            pipeline_root=pipeline_root,
            preprocessing_root=preprocessing_root,
            data_root=data_root,
            raw_dir=raw_dir,
            workdir=workdir,
            raw_forecast_dir=raw_dir / "forecast-statista",
            raw_forecasts_dir=raw_dir / "forecasts",
            raw_risks_dir=raw_dir / "risks",
            preprocess_forecast_out=preprocess_root / "forecast-statista" / "out",
            preprocess_forecasts_out=preprocess_root / "forecasts" / "out",
            preprocess_risks_out=preprocess_root / "risks" / "out",
            user_input_in_dir=user_input_root / "in",
            user_input_out_dir=user_input_root / "out",
            hypotheses_out_dir=hypotheses_root / "out",
            embeddings_index_dir=embeddings_index_root,
            forecast_retrieve_out_dir=embeddings_root / "forecast-retrieve" / "out",
            risk_retrieve_out_dir=embeddings_root / "risk-retrieve" / "out",
            strategic_retrieve_out_dir=embeddings_root / "strategic-retrieve" / "out",
            forecast_reports_out_dir=premise_pairs_root / "forecast-reports" / "out",
            event_reports_out_dir=premise_pairs_root / "event-reports" / "out",
            risk_reports_out_dir=premise_pairs_root / "risk-reports" / "out",
            reports_out_dir=reports_root / "out",
            user_review_out_dir=user_review_root / "out",
            pipeline_reports_dir=workdir / "pipeline-reports",
        )

    @property
    def strategy_input_file(self) -> Path:
        return self.user_input_out_dir / "strategy_input.json"

    @property
    def hypotheses_file(self) -> Path:
        return self.hypotheses_out_dir / "strategy_with_hypotheses.json"

    @property
    def merged_premises_file(self) -> Path:
        return self.user_input_in_dir / "premises.parquet"

    @property
    def risks_parquet(self) -> Path:
        return self.preprocess_risks_out / "risks.parquet"

    @property
    def forecasts_parquet(self) -> Path:
        return self.preprocess_forecasts_out / "forecasts.parquet"

    @property
    def embeddings_risk_retrieve_out_dir(self) -> Path:
        return self.risk_retrieve_out_dir
