from __future__ import annotations
import json
from fastapi import HTTPException, status
from app.infrastructure.paths import BackendPaths
from app.modules.hybrid.services.workflow_state import load_status_lookup
from app.infrastructure.persistence.json_store import read_json


def load_merged_pairs(paths: BackendPaths) -> dict:
    if not paths.merged_pairs_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merged pairs file not found. Run the pipeline first.",
        )
    try:
        data = read_json(paths.merged_pairs_file)
        exact_status, prefix_status = load_status_lookup(paths)
        for pair in data.get("combined_pairs", []):
            page_val = pair.get("page")
            try:
                if page_val is None:
                    pass
                elif isinstance(page_val, (int, float)) and not float(
                    page_val
                ) == float(page_val):
                    pair["page"] = None
            except Exception:
                pair["page"] = None
            pid = str(pair.get("pair_id", ""))
            prefix = pid.rsplit("_", 1)[0] if pid else ""
            pair["status"] = (
                exact_status.get(pid) or prefix_status.get(prefix) or "pending"
            )
        return data
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse merged pairs JSON",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load merged pairs: {exc!s}",
        )


def load_accepted_pairs(paths: BackendPaths) -> dict:
    if not paths.merged_pairs_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merged pairs file not found. Run the pipeline first.",
        )
    try:
        data = read_json(paths.merged_pairs_file)
        exact_status, prefix_status = load_status_lookup(paths)
        accepted_pairs = []
        for pair in data.get("combined_pairs", []):
            pair_id = str(pair.get("pair_id", ""))
            prefix = pair_id.rsplit("_", 1)[0] if pair_id else ""
            pair_status = (
                exact_status.get(pair_id)
                or prefix_status.get(prefix)
                or pair.get("status", "pending")
            )
            if pair_status == "accepted":
                pair["status"] = pair_status
                accepted_pairs.append(pair)
        accepted_counts = {
            "forecast": sum(1 for p in accepted_pairs if p["pair_type"] == "forecast"),
            "risk": sum(1 for p in accepted_pairs if p["pair_type"] == "risk"),
            "total": len(accepted_pairs),
        }
        return {
            "generated_at": data.get("generated_at", ""),
            "counts": accepted_counts,
            "metadata": data.get("metadata", {}),
            "combined_pairs": accepted_pairs,
        }
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse merged pairs JSON",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load accepted pairs: {exc!s}",
        )


__all__ = ["load_accepted_pairs", "load_merged_pairs"]
