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

MERGED_PAIRS_FILE = PATHS.reports_out_dir / "merged_pairs.json"

OUTPUT_DIR = PATHS.user_review_out_dir

PAIR_STATUS_FILE = OUTPUT_DIR / "pair_status.json"


def _ts() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def add_user_status() -> None:
    existing_status: Dict[str, Dict[str, Any]] = {}
    if PAIR_STATUS_FILE.exists():
        try:
            existing_records = json.loads(PAIR_STATUS_FILE.read_text(encoding="utf-8"))
            for item in existing_records:
                pid = item.get("pair_id")
                if pid is None:
                    continue
                existing_status[str(pid)] = item
        except Exception:
            print(
                f"⚠️ Could not read existing status file; reinitializing: {PAIR_STATUS_FILE}"
            )
    if not MERGED_PAIRS_FILE.exists():
        raise FileNotFoundError(
            f"Merged pairs file not found: {MERGED_PAIRS_FILE}. "
            "Run step 5 (merge_pairs.py) first."
        )
    print(f"➡️ Loading merged pairs from {MERGED_PAIRS_FILE}")
    data = json.loads(MERGED_PAIRS_FILE.read_text(encoding="utf-8"))
    combined_pairs = data.get("combined_pairs", [])
    if not combined_pairs:
        print("⚠️ No pairs found in merged_pairs.json")
        return
    print(f"➡️ Initializing status for {len(combined_pairs)} pairs")
    status_data = []
    for pair in combined_pairs:
        pair_id = pair.get("pair_id")
        if not pair_id:
            print(
                f"⚠️ Pair missing pair_id, skipping: {pair.get('premise_text', 'unknown')[:50]}"
            )
            continue
        if str(pair_id) in existing_status:
            status_entry = existing_status[str(pair_id)]
            status_entry.setdefault("status", "pending")
            status_entry.setdefault("updated_at", _ts())
        else:
            status_entry = {
                "pair_id": str(pair_id),
                "status": "pending",
                "updated_at": _ts(),
            }
        status_data.append(status_entry)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PAIR_STATUS_FILE.write_text(
        json.dumps(status_data, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"✅ User status initialized for {len(status_data)} pairs")
    print(f"📁 Saved to {PAIR_STATUS_FILE}")


def main() -> None:
    try:
        add_user_status()
    except Exception as exc:
        print(f"⚠️ Failed to add user status: {exc}")
        raise


if __name__ == "__main__":
    main()
