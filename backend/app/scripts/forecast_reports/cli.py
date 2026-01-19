from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> None:
    app_root = Path(__file__).resolve().parents[2]
    pipeline_root = app_root / "pipelines" / "nli" / "pipeline"
    script_path = pipeline_root / "report_pipeline.py"
    if not script_path.exists():
        raise FileNotFoundError(f"Pipeline report script not found: {script_path}")
    result = subprocess.run([sys.executable, str(script_path)], cwd=str(pipeline_root))
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
