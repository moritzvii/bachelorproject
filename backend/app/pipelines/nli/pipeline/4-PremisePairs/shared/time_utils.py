from __future__ import annotations
from datetime import UTC, datetime


def ts_utc() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")
