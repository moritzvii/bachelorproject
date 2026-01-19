from __future__ import annotations
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from types import ModuleType
from typing import Any, Callable

APP_ROOT = Path(__file__).resolve().parents[3]

PIPELINE_MODULE_PATH = (
    APP_ROOT / "pipelines" / "nli" / "pipeline" / "1-UserInput" / "input_strategy.py"
)

_PIPELINE_MODULE_NAME = "nli_strategy_input"

ProcessStrategyResult = tuple[dict[str, Any], bool, str | None]

ProcessStrategyCallable = Callable[..., ProcessStrategyResult]


def _load_strategy_module() -> ModuleType:
    if not PIPELINE_MODULE_PATH.exists():
        raise FileNotFoundError(f"Strategy parser not found at {PIPELINE_MODULE_PATH}")
    spec = spec_from_file_location(_PIPELINE_MODULE_NAME, PIPELINE_MODULE_PATH)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load spec for {_PIPELINE_MODULE_NAME}")
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_strategy_module = _load_strategy_module()

_process_strategy: ProcessStrategyCallable = getattr(
    _strategy_module, "process_strategy"
)


def process_strategy(
    strategy: str, *, persist: bool = True, run_hypotheses: bool = True
) -> ProcessStrategyResult:
    return _process_strategy(strategy, persist=persist, run_hypotheses=run_hypotheses)


__all__ = ["process_strategy"]
