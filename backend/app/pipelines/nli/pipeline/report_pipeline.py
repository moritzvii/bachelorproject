from __future__ import annotations
import shlex
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import IO, Sequence
from paths import PipelinePaths


class _Color:
    RESET = "\033[0m"
    BOLD = "\033[1m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    RED = "\033[31m"
    CYAN = "\033[36m"


PIPELINE_ROOT = Path(__file__).resolve().parent

PATHS = PipelinePaths.from_file(Path(__file__))

REPORTS_DIR = PATHS.pipeline_reports_dir

REPORTS_DIR.mkdir(parents=True, exist_ok=True)

REPORT_FILE = REPORTS_DIR / f"pipeline_report_{datetime.now():%Y%m%d_%H%M%S}.log"

STRATEGY_INPUT_FILE = PATHS.strategy_input_file


@dataclass(frozen=True)
class PipelineStage:
    name: str
    script: Path
    description: str
    requires_strategy: bool = False
    interactive: bool = False
    optional: bool = False


STAGES: Sequence[PipelineStage] = (
    PipelineStage(
        name="strategy input",
        script=PIPELINE_ROOT / "1-UserInput" / "input_strategy.py",
        description="Collect and confirm the user's strategy",
        requires_strategy=False,
        interactive=True,
    ),
    PipelineStage(
        name="strategy hypotheses",
        script=PIPELINE_ROOT / "2-Hypothesen" / "strategy_hypotheses.py",
        description="Generate hypotheses and a title for the parsed strategy",
        requires_strategy=True,
    ),
    PipelineStage(
        name="forecast retrieval",
        script=PIPELINE_ROOT
        / "3-Embeddings"
        / "Forecast-Retrieve"
        / "retrieve_candidates.py",
        description="Retrieve forecast premises that match the hypotheses",
        requires_strategy=True,
    ),
    PipelineStage(
        name="forecast NLI",
        script=PIPELINE_ROOT
        / "4-PremisePairs"
        / "forecast-reports"
        / "nli_premise_pairs.py",
        description="Score forecast premises against the hypotheses",
        requires_strategy=True,
    ),
    PipelineStage(
        name="curated forecast NLI",
        script=PIPELINE_ROOT / "4-PremisePairs" / "forecasts" / "nli_forecasts.py",
        description="Score curated forecasts parquet against the hypotheses",
        requires_strategy=True,
    ),
    PipelineStage(
        name="risk hybrid report",
        script=PIPELINE_ROOT / "4-PremisePairs" / "risk-reports" / "risk_nli_simple.py",
        description="Compute NLI-based risk scores from strategies and risks",
        requires_strategy=True,
    ),
    PipelineStage(
        name="merged pairs",
        script=PIPELINE_ROOT / "5-Reports" / "merge_pairs.py",
        description="Consolidate forecast, event, and risk pairs into a single report",
        requires_strategy=True,
    ),
    PipelineStage(
        name="user review status",
        script=PIPELINE_ROOT / "6-UserReview" / "add_user_status.py",
        description="Initialize or preserve user statuses for merged pairs",
        requires_strategy=True,
    ),
    PipelineStage(
        name="scoring summary",
        script=PIPELINE_ROOT / "7-Scoring" / "score_summary.py",
        description="Compute mean and variance for accepted forecast and risk pairs",
        requires_strategy=True,
    ),
    PipelineStage(
        name="scoring interval",
        script=PIPELINE_ROOT / "7-Scoring" / "intervall.py",
        description="Compute uncertainty intervals for forecast and risk scores",
        requires_strategy=True,
    ),
)


def ensure_strategy_available() -> None:
    if not STRATEGY_INPUT_FILE.exists():
        raise FileNotFoundError(
            f"Parsed strategy missing: {STRATEGY_INPUT_FILE}. "
            "Enter and confirm a strategy via the orchestrator before running dependent stages."
        )


def _color_status(success: bool) -> str:
    return _Color.GREEN if success else _Color.RED


def _log_stage(
    report: IO[str],
    stage: PipelineStage,
    command: str,
    result: subprocess.CompletedProcess,
) -> None:
    report.write(f"[{stage.name}] {stage.description}\n")
    report.write(f"Command: {command}\n")
    report.write(f"Return code: {result.returncode}\n")
    report.write("-- STDOUT --\n")
    stdout = (
        result.stdout
        if result.stdout is not None
        else "<interactive output not captured>"
    )
    report.write(f"{stdout}\n")
    report.write("-- STDERR --\n")
    stderr = (
        result.stderr
        if result.stderr is not None
        else "<interactive output not captured>"
    )
    report.write(f"{stderr}\n")


def _print_status(stage: PipelineStage, success: bool) -> None:
    status = "SUCCESS" if success else "FAILED"
    color = _color_status(success)
    print(
        f"{_Color.BOLD}{stage.name}{_Color.RESET} "
        f"{color}{status}{_Color.RESET} — {stage.description}"
    )


def _run_stage(stage: PipelineStage) -> subprocess.CompletedProcess | None:
    if stage.requires_strategy:
        ensure_strategy_available()
    if not stage.script.exists():
        if stage.optional:
            return None
        raise FileNotFoundError(f"Stage script missing: {stage.script}")
    command = [sys.executable, str(stage.script)]
    run_kwargs = {"cwd": PIPELINE_ROOT}
    if stage.interactive:
        run_kwargs["stdin"] = sys.stdin
        return subprocess.run(command, **run_kwargs)
    return subprocess.run(
        command,
        capture_output=True,
        text=True,
        **run_kwargs,
    )


def _render_summary(summary: list[tuple[str, bool]], report: IO[str]) -> None:
    report.write("Summary:\n")
    for name, success in summary:
        marker = "PASS" if success else "FAIL"
        report.write(f" - {name}: {marker}\n")


def main() -> None:
    start_time = datetime.now()
    summary: list[tuple[str, bool]] = []
    failure_stage: PipelineStage | None = None
    failure_reason: str | None = None
    exit_code = 0
    with REPORT_FILE.open("w", encoding="utf-8") as report:
        report.write(f"Pipeline start: {start_time.isoformat()}\n")
        report.write(f"Report path: {REPORT_FILE}\n\n")
        for stage in STAGES:
            try:
                result = _run_stage(stage)
                if result is None:
                    summary.append((stage.name, True))
                    report.write(
                        f"[{stage.name}] SKIPPED (optional, script not found)\n\n"
                    )
                    print(
                        f"{_Color.BOLD}{stage.name}{_Color.RESET} "
                        f"{_Color.YELLOW}SKIPPED{_Color.RESET} — {stage.description} (optional)"
                    )
                    continue
            except FileNotFoundError as exc:
                summary.append((stage.name, False))
                report.write(f"[{stage.name}] ABORTED: {exc}\n\n")
                failure_stage = stage
                failure_reason = str(exc)
                exit_code = 1
                break
            command_text = shlex.join([sys.executable, str(stage.script)])
            _log_stage(report, stage, command_text, result)
            success = result.returncode == 0
            summary.append((stage.name, success))
            _print_status(stage, success)
            if not success:
                failure_stage = stage
                failure_reason = "stage returned a non-zero exit code"
                exit_code = result.returncode or 1
                report.write("Pipeline aborted due to failure above.\n")
                break
        _render_summary(summary, report)
    if failure_stage:
        print(
            f"{_Color.BOLD}{failure_stage.name}{_Color.RESET} "
            f"{_Color.RED}FAILED{_Color.RESET} — {failure_reason}"
        )
        print(f"{_Color.YELLOW}See report for details: {REPORT_FILE}{_Color.RESET}")
        raise SystemExit(exit_code)
    print(f"{_Color.CYAN}Finished. Full report: {REPORT_FILE}{_Color.RESET}")


if __name__ == "__main__":
    main()
