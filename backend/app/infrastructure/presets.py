from __future__ import annotations
from datetime import UTC, datetime
from app.infrastructure.paths import BackendPaths
from app.infrastructure.persistence.json_store import read_json, write_json


def list_preset_strategy_ids(paths: BackendPaths) -> set[str]:
    preset_ids: set[str] = set()
    strategy_presets = paths.presets_dir / "strategy-presets.json"
    try:
        if strategy_presets.exists():
            payload = read_json(strategy_presets)
            if isinstance(payload, list):
                for item in payload:
                    pid = (
                        str(
                            getattr(
                                item,
                                "get",
                                lambda key, default=None: item.get(key, default),
                            )("id", "")
                        ).strip()
                        if isinstance(item, dict)
                        else ""
                    )
                    if pid:
                        preset_ids.add(pid)
    except Exception:
        preset_ids = set()
    try:
        for preset_file in paths.presets_dir.glob("pairs-*.json"):
            pid = preset_file.stem.replace("pairs-", "", 1)
            if pid:
                preset_ids.add(pid)
    except Exception:
        pass
    return preset_ids


def load_pairs_preset(paths: BackendPaths, strategy_id: str | None) -> dict | None:
    if not strategy_id:
        return None
    preset_file = paths.pairs_presets_dir / f"pairs-{strategy_id}.json"
    if not preset_file.exists():
        return None
    try:
        payload = read_json(preset_file)
        return payload if isinstance(payload, dict) else None
    except Exception:
        return None


def _compute_pair_counts(pairs: list[dict]) -> dict:
    forecast_count = sum(1 for pair in pairs if pair.get("pair_type") == "forecast")
    risk_count = sum(1 for pair in pairs if pair.get("pair_type") == "risk")
    return {
        "forecast": forecast_count,
        "risk": risk_count,
        "total_pairs": len(pairs),
    }


def persist_preset_pairs(
    paths: BackendPaths, strategy_id: str, preset_payload: dict
) -> None:
    combined_pairs = preset_payload.get("combined_pairs")
    if not isinstance(combined_pairs, list):
        raise ValueError("Preset pairs payload is missing combined_pairs list.")
    generated_at = preset_payload.get("generated_at") or datetime.now(
        UTC
    ).isoformat().replace("+00:00", "Z")
    counts = preset_payload.get("counts") or _compute_pair_counts(combined_pairs)
    metadata = (
        preset_payload.get("metadata")
        if isinstance(preset_payload.get("metadata"), dict)
        else {}
    )
    metadata = {**metadata, "preset_strategy_id": strategy_id}
    write_json(
        paths.merged_pairs_file,
        {
            "generated_at": generated_at,
            "counts": counts,
            "metadata": metadata,
            "combined_pairs": combined_pairs,
        },
        indent=2,
    )


__all__ = ["list_preset_strategy_ids", "load_pairs_preset", "persist_preset_pairs"]
