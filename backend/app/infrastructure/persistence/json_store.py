from __future__ import annotations
import json
from pathlib import Path
from typing import Any


def read_json(path: Path) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def write_json(
    path: Path, payload: Any, *, indent: int = 2, ensure_ascii: bool = True
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=indent, ensure_ascii=ensure_ascii)


__all__ = ["read_json", "write_json"]
