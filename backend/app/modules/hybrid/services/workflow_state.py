from __future__ import annotations
from datetime import UTC, datetime
from app.infrastructure.paths import BackendPaths
from app.infrastructure.persistence.json_store import read_json, write_json


def load_selected_strategy_id(paths: BackendPaths) -> str | None:
    if not paths.selected_strategy_file.exists():
        return None
    try:
        data = read_json(paths.selected_strategy_file)
        strategy_id = data.get("strategy_id")
        return (
            strategy_id
            if isinstance(strategy_id, str) and strategy_id.strip()
            else None
        )
    except Exception:
        return None


def load_status_lookup(paths: BackendPaths) -> tuple[dict[str, str], dict[str, str]]:
    exact: dict[str, str] = {}
    prefix: dict[str, str] = {}
    if not paths.pair_status_file.exists():
        return exact, prefix
    try:
        status_data = read_json(paths.pair_status_file)
        for item in status_data:
            pid = str(item.get("pair_id", "")).strip()
            status = str(item.get("status", "")).strip()
            if not pid or not status:
                continue
            exact[pid] = status
            prefix_key = pid.rsplit("_", 1)[0]
            prefix[prefix_key] = status
    except Exception:
        pass
    return exact, prefix


def update_pair_status(paths: BackendPaths, pair_id: str, status: str) -> dict:
    status_data = []
    if paths.pair_status_file.exists():
        status_data = read_json(paths.pair_status_file)
    found = False
    timestamp = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    payload_pair_id = str(pair_id)
    for item in status_data:
        if str(item.get("pair_id")) == payload_pair_id:
            item["pair_id"] = payload_pair_id
            item["status"] = status
            item["updated_at"] = timestamp
            found = True
            break
    if not found:
        status_data.append(
            {
                "pair_id": payload_pair_id,
                "status": status,
                "updated_at": timestamp,
            }
        )
    write_json(paths.pair_status_file, status_data, indent=2)
    return {
        "message": "Status updated successfully",
        "pair_id": pair_id,
        "status": status,
    }


def get_pair_statuses(paths: BackendPaths) -> list[dict]:
    if not paths.pair_status_file.exists():
        return []
    data = read_json(paths.pair_status_file)
    for item in data:
        if "pair_id" in item:
            item["pair_id"] = str(item["pair_id"])
    return data


def save_selected_strategy(paths: BackendPaths, payload: dict) -> None:
    write_json(paths.selected_strategy_file, payload, indent=2)


def load_selected_strategy(paths: BackendPaths) -> dict:
    return read_json(paths.selected_strategy_file)


def save_human_factors(paths: BackendPaths, payload: dict) -> None:
    write_json(paths.human_factors_file, payload, indent=2)


def get_human_factors(paths: BackendPaths) -> dict:
    return read_json(paths.human_factors_file)


def load_human_factors(
    paths: BackendPaths, default: float = 0.5
) -> tuple[float, float, float, float]:
    if not paths.human_factors_file.exists():
        return (default, default, default, default)
    try:
        data = read_json(paths.human_factors_file)
        return (
            float(data.get("forecast_alignment", default)),
            float(data.get("risk_alignment", default)),
            float(data.get("forecast_confidence", default)),
            float(data.get("risk_confidence", default)),
        )
    except Exception:
        return (default, default, default, default)


def save_matrix_adjustments(paths: BackendPaths, payload: dict) -> None:
    write_json(paths.matrix_adjustments_file, payload, indent=2)


def get_matrix_adjustments(paths: BackendPaths) -> dict:
    return read_json(paths.matrix_adjustments_file)


def save_strategy_distribution(paths: BackendPaths, payload: dict) -> None:
    write_json(paths.strategy_distribution_file, payload, indent=2)


def get_strategy_distribution(paths: BackendPaths) -> dict:
    return read_json(paths.strategy_distribution_file)


__all__ = [
    "get_matrix_adjustments",
    "get_human_factors",
    "get_pair_statuses",
    "get_strategy_distribution",
    "load_human_factors",
    "load_selected_strategy",
    "load_selected_strategy_id",
    "load_status_lookup",
    "save_matrix_adjustments",
    "save_human_factors",
    "save_selected_strategy",
    "save_strategy_distribution",
    "update_pair_status",
]
