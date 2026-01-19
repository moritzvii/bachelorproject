"""
==================================================
Premise Parquet Builder
Normalizes forecast Excel exports, rejects empty horizons, and derives regional/segment premises (level trends, channel/store splits, YOY summaries).
==================================================
"""

from __future__ import annotations
import argparse
import re
import sys
import uuid
from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parent


def _resolve_nli_root(current: Path) -> Path:
    for parent in current.parents:
        if parent.name == "nli" and parent.parent.name in {
            "pipelines",
            "core",
            "helpers",
        }:
            return parent
    raise RuntimeError(
        "Unable to resolve nli root directory (expected pipelines/nli or helpers/nli)."
    )


NLI_ROOT = _resolve_nli_root(BASE_DIR)

PIPELINE_ROOT = NLI_ROOT / "pipeline"

if str(PIPELINE_ROOT) not in sys.path:
    sys.path.insert(0, str(PIPELINE_ROOT))

from regions import REGION_ALIASES, normalize_region as normalize_region_canonical
from paths import PipelinePaths

PATHS = PipelinePaths.from_file(Path(__file__))

DEFAULT_OUT = PATHS.preprocess_forecast_out

DEFAULT_INPUT = PATHS.raw_forecast_dir

LEVEL_DEF = {
    "Revenue_total": ("revenue", lambda v: f"${v:.2f}bn", "revenue"),
    "Volume_total": ("volume", lambda v: f"{v:.2f}m units", "volume"),
    "Price_per_unit": ("average selling price", lambda v: f"${v:,.0f}", "asp"),
    "Ecom_revenue_total": ("e-commerce revenue", lambda v: f"${v:.2f}bn", "ecom"),
    "Users_total": ("e-commerce users", lambda v: f"{v:.2f}m users", "users"),
    "Users_total2": (
        "estimated number of people who buy the segment online",
        lambda v: f"{v:.2f}m users",
        "users_total2",
    ),
    "Penetration_rate": (
        "e-commerce penetration",
        lambda v: f"{v*100:.1f}%",
        "penetration",
    ),
    "Penetration_rate2": (
        "share of the population purchasing the segment online in that year",
        lambda v: f"{v*100:.1f}%",
        "penetration_rate2",
    ),
    "Channel_split": ("online share", lambda v: f"{v*100:.1f}%", "channel_share"),
    "Channel_split_app": (
        "store revenue share",
        lambda v: f"{v*100:.1f}%",
        "store_share",
    ),
}

YOY_DEF = {
    "Revenue_YoY": ("revenue YoY", "revenue_yoy"),
    "Volume_YoY": ("volume YoY", "volume_yoy"),
    "Ecom_revenue_YoY": ("e-commerce revenue YoY", "ecom_yoy"),
}

METRIC_UNIT_BASE = {
    "Revenue_total": "currency_billions",
    "Ecom_revenue_total": "currency_billions",
    "Volume_total": "count_millions",
    "Users_total": "count_millions",
    "Users_total2": "count_millions",
}

WEARABLES_HOME_ACCESSORIES = "Wearables, Home and Accessories"

SEGMENT_CANONICAL = {
    "iphone": "iPhone",
    "ipad": "iPad",
    "mac": "Mac",
    "watch": "Watch",
    "services": "Services",
    "app": "Services",
    "apps": "Services",
    "app store": "Services",
    "accessories": "Accessories",
    "tablet": "Tablet",
    "tablets": "Tablet",
    "wearables": WEARABLES_HOME_ACCESSORIES,
}

SUBSEGMENT_PARENT = {
    "laptop": "Mac",
    "laptops": "Mac",
    "smart speaker": WEARABLES_HOME_ACCESSORIES,
    "smartspeaker": WEARABLES_HOME_ACCESSORIES,
    "smartspeakers": WEARABLES_HOME_ACCESSORIES,
    "smartwatch": WEARABLES_HOME_ACCESSORIES,
    "smart watches": WEARABLES_HOME_ACCESSORIES,
    "smartwatches": WEARABLES_HOME_ACCESSORIES,
    "smart watch": WEARABLES_HOME_ACCESSORIES,
    "smart-watch": WEARABLES_HOME_ACCESSORIES,
}

ANSI_RED = "\033[31m"

ANSI_RESET = "\033[0m"

_WARNED_SEGMENTS: set[str] = set()

_WARNED_REGIONS: set[str] = set()


def _warn_unrecognized_item(kind: str, raw_display: str, fallback: str) -> None:
    bucket = _WARNED_SEGMENTS if kind == "segment" else _WARNED_REGIONS
    key = (raw_display or "").casefold()
    if key in bucket:
        return
    bucket.add(key)
    display = raw_display if raw_display else "<empty>"
    fallback_display = fallback if fallback else "<empty>"
    print(
        f"{ANSI_RED}[warn] {kind.title()} '{display}' not recognized → using '{fallback_display}'.{ANSI_RESET}",
        file=sys.stderr,
    )


def normalize_region(region_raw: str) -> str:
    if not isinstance(region_raw, str):
        _warn_unrecognized_item("region", "<non-string>", "Worldwide")
        return "Worldwide"
    cleaned = region_raw.strip()
    if not cleaned:
        _warn_unrecognized_item("region", "<empty>", "Worldwide")
        return "Worldwide"
    result = normalize_region_canonical(cleaned)
    if result == "Global":
        result = "Worldwide"
    if result == cleaned or result.lower() == cleaned.lower():
        lookup = cleaned.casefold()
        matched = False
        for key in REGION_ALIASES.keys():
            if lookup == key or key in lookup:
                matched = True
                break
        if not matched:
            fallback = cleaned.title() or cleaned
            _warn_unrecognized_item("region", cleaned, fallback)
            return fallback
    return result


def normalize_segment_hierarchy(segment_raw: str) -> tuple[str, str | None]:
    cleaned = segment_raw.strip()
    if not cleaned:
        _warn_unrecognized_item("segment", "<empty>", "<empty>")
        return "", None
    normalized = cleaned.casefold()
    if normalized == "wearables":
        return WEARABLES_HOME_ACCESSORIES, "Smartwatches"
    parent = SUBSEGMENT_PARENT.get(normalized)
    if parent:
        return parent, cleaned.title()
    canonical = SEGMENT_CANONICAL.get(normalized)
    if canonical:
        return canonical, None
    fallback = cleaned.title() or cleaned
    _warn_unrecognized_item("segment", cleaned, fallback)
    return fallback, None


def _format_segment_label(segment: str, subsegment: str | None) -> str:
    if not segment:
        return subsegment or ""
    return f"{segment} ({subsegment})" if subsegment else segment


def _extract_segment_subsegment(series: pd.DataFrame) -> str | None:
    if "segment_sub" not in series.columns or series.empty:
        return None
    candidates = [s for s in series["segment_sub"].dropna().unique() if str(s).strip()]
    if len(candidates) == 1:
        return candidates[0]
    return None


def _to_num(x):
    if pd.isna(x):
        return pd.NA
    if isinstance(x, (int, float)):
        return float(x)
    s = str(x).strip().replace("\u00A0", " ")
    s = s.replace(".", "").replace(",", ".")
    try:
        return float(s)
    except Exception:
        return pd.NA


def _normalize_unit_text(unit_raw: str | None) -> str | None:
    if not isinstance(unit_raw, str):
        return None
    cleaned = unit_raw.replace("\u00A0", " ").strip()
    if not cleaned:
        return None
    lowered = cleaned.casefold()
    if lowered in {"nan", "none", "n/a", "na"}:
        return None
    return lowered


def _has_word(text: str, token: str) -> bool:
    if not token:
        return False
    return bool(re.search(rf"(?<!\w){re.escape(token)}(?!\w)", text))


def _scale_currency_to_billions(text: str) -> float | None:
    if "trillion" in text or "trn" in text:
        return 1000.0
    if _has_word(text, "bn"):
        return 1.0
    if "billion" in text:
        return 1.0
    if "million" in text or _has_word(text, "mn"):
        return 0.001
    if "thousand" in text or _has_word(text, "k"):
        return 1e-6
    if "$" in text or "usd" in text or "us$" in text:
        return 1e-9
    return None


def _scale_count_to_millions(text: str) -> float | None:
    if "billion" in text or _has_word(text, "bn"):
        return 1000.0
    if "million" in text or _has_word(text, "mn"):
        return 1.0
    if "thousand" in text or _has_word(text, "k"):
        return 0.001
    if "unit" in text or "units" in text or "user" in text or "users" in text:
        return 1e-6
    return None


SCALE_FUNCTIONS = {
    "currency_billions": _scale_currency_to_billions,
    "count_millions": _scale_count_to_millions,
}


def _scale_value_by_unit(row: pd.Series):
    val = row["value"]
    if pd.isna(val):
        return val
    if not isinstance(val, (int, float)):
        return val
    base_kind = METRIC_UNIT_BASE.get(row["metric_sheet"])
    if not base_kind:
        return val
    unit_text = _normalize_unit_text(row["unit"])
    if not unit_text:
        return val
    scaler = SCALE_FUNCTIONS.get(base_kind)
    if not scaler:
        return val
    factor = scaler(unit_text)
    return float(val) * factor if factor is not None else val


def _contains_significant_value(df: pd.DataFrame, epsilon: float = 1e-9) -> bool:
    if df.empty:
        return False
    vals = pd.to_numeric(df["value"], errors="coerce").dropna()
    if vals.empty:
        return False
    return bool((vals.abs() > epsilon).any())


def _drop_years_without_significant_values(
    df: pd.DataFrame, *, epsilon: float = 1e-9
) -> pd.DataFrame:
    if df.empty:
        return df
    vals = pd.to_numeric(df["value"], errors="coerce")
    mask = vals.abs() > epsilon
    if not mask.any():
        return df
    valid_years = df.loc[mask, "year"].unique()
    return df[df["year"].isin(valid_years)]


def row_id():
    return uuid.uuid4().hex[:12]


def _slug(token: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9]+", "-", str(token)).strip("-")
    return cleaned or "unknown"


def _default_source(seg: str, reg: str) -> str:
    return f"{_slug(seg)}-{_slug(reg)}.pdf"


def add(
    rows, seg, reg, y_last, kind, text, source=None, nli_target=None, segment_sub=None
):
    rows.append(
        {
            "premise_id": row_id(),
            "year": int(y_last),
            "segment": seg,
            "segment_sub": segment_sub,
            "region": reg,
            "kind": kind,
            "premise_text": text,
            "source": source or _default_source(seg, reg),
            "nli_target": nli_target or "",
        }
    )


def fmt_pct(v):
    return f"{v*100:.1f}%" if v is not None else "n/a"


def cagr(v0: float, vt: float, years: int):
    if years <= 0 or v0 is None or vt is None:
        return None
    if v0 <= 0 or vt <= 0:
        return None
    try:
        return (vt / v0) ** (1 / years) - 1
    except Exception:
        return None


def load_export_long(xlsx_path: Path | str) -> pd.DataFrame:
    df = pd.read_excel(xlsx_path, sheet_name="EXPORT_LONG", engine="openpyxl")
    need = [
        "metric_sheet",
        "metric_title",
        "unit",
        "segment",
        "region",
        "category",
        "year",
        "value",
    ]
    miss = [c for c in need if c not in df.columns]
    if miss:
        raise ValueError(f"EXPORT_LONG missing columns: {miss}")
    df = df.copy()
    for c in ["metric_sheet", "metric_title", "unit", "segment", "region", "category"]:
        df[c] = df[c].astype(str).str.strip()
    hierarchy = [normalize_segment_hierarchy(value) for value in df["segment"]]
    if hierarchy:
        normalized = pd.DataFrame(
            hierarchy, index=df.index, columns=["segment_main", "segment_sub"]
        )
        df["segment"] = normalized["segment_main"]
        df["segment_sub"] = normalized["segment_sub"]
    else:
        df["segment_sub"] = pd.NA
    df["region"] = df["region"].apply(normalize_region)
    df["year"] = pd.to_numeric(df["year"], errors="coerce")
    df["value"] = df["value"].apply(_to_num)

    def normalize_percent(row: pd.Series) -> float | None:
        val = row["value"]
        unit = str(row["unit"]).lower()
        if pd.isna(val) or not isinstance(val, (int, float)):
            return val
        if "%" in unit or "pct" in unit or "percent" in unit:
            return float(val) / 100
        return float(val)

    df["value"] = df.apply(normalize_percent, axis=1)
    df["value"] = df.apply(_scale_value_by_unit, axis=1)
    df = df.dropna(subset=["year", "value"])
    df = _drop_years_without_significant_values(df)
    df = df[(df["year"] >= 2017) & (df["year"] <= 2030)]
    return df.reset_index(drop=True)


def make_level_premises(df_long: pd.DataFrame, forecast_from: int) -> pd.DataFrame:
    rows = []
    base = df_long[df_long["metric_sheet"].isin(LEVEL_DEF.keys())].copy()
    base = base[base["year"] >= forecast_from]
    for (ms, seg, reg), g in base.groupby(
        ["metric_sheet", "segment", "region"], dropna=False
    ):
        label, printer, nli_tag = LEVEL_DEF[ms]

        def _process_level_series(
            series: pd.DataFrame, sub_label_override: str | None
        ) -> None:
            if series.empty:
                return
            if ms == "Channel_split":
                g_on = (
                    series[series["category"].str.casefold() == "online".casefold()]
                    .dropna(subset=["value"])
                    .sort_values("year")
                )
                g_off = (
                    series[series["category"].str.casefold() == "offline".casefold()]
                    .dropna(subset=["value"])
                    .sort_values("year")
                )
                target_series = None
                label_used = "online share"
                if len(g_on) >= 2:
                    target_series = g_on
                elif len(g_off) >= 2:
                    target_series = g_off
                    label_used = "offline share"
                else:
                    return
                if not _contains_significant_value(target_series):
                    return
                y0, yt = int(target_series.iloc[0]["year"]), int(
                    target_series.iloc[-1]["year"]
                )
                v0, vt = float(target_series.iloc[0]["value"]), float(
                    target_series.iloc[-1]["value"]
                )
                eps = 1e-9
                if vt > v0 + eps:
                    direction = "increase"
                    kind = f"trend_{nli_tag}_up"
                    nli_target = "increase"
                elif vt < v0 - eps:
                    direction = "decrease"
                    kind = f"trend_{nli_tag}_down"
                    nli_target = "decrease"
                else:
                    direction = "remain roughly flat"
                    kind = f"trend_{nli_tag}_flat"
                    nli_target = "flat"
                sub_label = sub_label_override or _extract_segment_subsegment(
                    target_series
                )
                seg_label = _format_segment_label(seg, sub_label)
                text = (
                    f"In {reg}, {seg_label} {label_used} are forecast to {direction} "
                    f"from {printer(v0)} in {y0} to {printer(vt)} in {yt}."
                )
                add(
                    rows,
                    seg,
                    reg,
                    yt,
                    kind,
                    text,
                    source=f"{ms} {y0}-{yt}",
                    nli_target=nli_target,
                    segment_sub=sub_label,
                )
                return
            if ms == "Channel_split_app":
                for store_key in ("apple", "google"):
                    store_series = (
                        series[series["category"].str.casefold() == store_key]
                        .dropna(subset=["value"])
                        .sort_values("year")
                    )
                    if len(store_series) < 2:
                        continue
                    if not _contains_significant_value(store_series):
                        continue
                    y0, yt = int(store_series.iloc[0]["year"]), int(
                        store_series.iloc[-1]["year"]
                    )
                    v0, vt = float(store_series.iloc[0]["value"]), float(
                        store_series.iloc[-1]["value"]
                    )
                    eps = 1e-9
                    if vt > v0 + eps:
                        direction = "increase"
                        kind = f"trend_{nli_tag}_up"
                        nli_target = "increase"
                    elif vt < v0 - eps:
                        direction = "decrease"
                        kind = f"trend_{nli_tag}_down"
                        nli_target = "decrease"
                    else:
                        direction = "remain roughly flat"
                        kind = f"trend_{nli_tag}_flat"
                        nli_target = "flat"
                    store_label = store_key.capitalize()
                    sub_label = sub_label_override or _extract_segment_subsegment(
                        store_series
                    )
                    seg_label = _format_segment_label(seg, sub_label)
                    text = (
                        f"In {reg}, {seg_label} {store_label} store revenue share is forecast to {direction} "
                        f"from {printer(v0)} in {y0} to {printer(vt)} in {yt}."
                    )
                    add(
                        rows,
                        seg,
                        reg,
                        yt,
                        kind,
                        text,
                        source=f"{ms} {store_label} {y0}-{yt}",
                        nli_target=nli_target,
                        segment_sub=sub_label,
                    )
                return
            g_tot = (
                series[series["category"].str.casefold() == "total".casefold()]
                .dropna(subset=["value"])
                .sort_values("year")
            )
            if len(g_tot) < 2:
                return
            if not _contains_significant_value(g_tot):
                return
            y0, yt = int(g_tot.iloc[0]["year"]), int(g_tot.iloc[-1]["year"])
            v0, vt = float(g_tot.iloc[0]["value"]), float(g_tot.iloc[-1]["value"])
            eps = 1e-9
            if vt > v0 + eps:
                direction = "increase"
                kind = f"trend_{nli_tag}_up"
                nli_target = "increase"
            elif vt < v0 - eps:
                direction = "decrease"
                kind = f"trend_{nli_tag}_down"
                nli_target = "decrease"
            else:
                direction = "remain roughly flat"
                kind = f"trend_{nli_tag}_flat"
                nli_target = "flat"
            years = max(1, yt - y0)
            cg = cagr(v0, vt, years)
            cagr_txt = f" (CAGR ≈ {fmt_pct(cg)})" if cg is not None else ""
            sub_label = sub_label_override or _extract_segment_subsegment(g_tot)
            seg_label = _format_segment_label(seg, sub_label)
            text = (
                f"In {reg}, {seg_label} {label} are forecast to {direction} "
                f"from {printer(v0)} in {y0} to {printer(vt)} in {yt}{cagr_txt}."
            )
            add(
                rows,
                seg,
                reg,
                yt,
                kind,
                text,
                source=f"{ms} {y0}-{yt}",
                nli_target=nli_target,
                segment_sub=sub_label,
            )

        sub_clean = g["segment_sub"].fillna("").astype(str).str.strip()
        sub_values = [val for val in pd.unique(sub_clean) if val]
        _process_level_series(g, None)
        if len(sub_values) > 1:
            for sub_label in sub_values:
                mask = sub_clean == sub_label
                subset = g[mask]
                if subset.empty:
                    continue
                _process_level_series(subset, sub_label)
    return pd.DataFrame(
        rows,
        columns=[
            "premise_id",
            "year",
            "segment",
            "segment_sub",
            "region",
            "kind",
            "premise_text",
            "source",
            "nli_target",
        ],
    )


def make_yoy_premises(df_long: pd.DataFrame, forecast_from: int) -> pd.DataFrame:
    rows = []
    base = df_long[df_long["metric_sheet"].isin(YOY_DEF.keys())].copy()
    base = base[base["year"] >= forecast_from]
    for (ms, seg, reg), g in base.groupby(
        ["metric_sheet", "segment", "region"], dropna=False
    ):
        title, tag = YOY_DEF[ms]

        def _process_yoy_series(
            series: pd.DataFrame, sub_label_override: str | None
        ) -> None:
            g_tot = (
                series[series["category"].str.casefold() == "total".casefold()]
                .dropna(subset=["value"])
                .sort_values("year")
            )
            if len(g_tot) < 1:
                return
            if not _contains_significant_value(g_tot):
                return
            ys = g_tot["year"].tolist()
            vals = g_tot["value"].tolist()
            pct_vals = [(v * 100 if abs(v) <= 1 else v) for v in vals]
            pos = sum(v > 0 for v in pct_vals)
            neg = sum(v < 0 for v in pct_vals)
            zer = sum(abs(v) < 1e-12 for v in pct_vals)
            k = len(pct_vals)
            avg = sum(pct_vals) / k if k else 0.0
            if pos > neg:
                tone = "posted positive YoY in"
                verdict = "up"
                nli_target = "increase"
            elif neg > pos:
                tone = "posted negative YoY in"
                verdict = "down"
                nli_target = "decrease"
            else:
                tone = "showed mixed YoY in"
                verdict = "mixed"
                nli_target = "mixed"
            y0, yt = int(ys[0]), int(ys[-1])
            avg_txt = f"{avg:+.1f}%"
            sub_label = sub_label_override or _extract_segment_subsegment(g_tot)
            seg_label = _format_segment_label(seg, sub_label)
            text = (
                f"From {y0} to {yt}, {reg} {seg_label} {title} {tone} "
                f"{pos if pos > neg else (neg if neg > pos else (k - zer))}/{k} years (avg {avg_txt})."
            )
            add(
                rows,
                seg,
                reg,
                yt,
                f"agg_{tag}_{verdict}",
                text,
                source=f"{ms} {y0}-{yt}",
                nli_target=nli_target,
                segment_sub=sub_label,
            )

        sub_clean = g["segment_sub"].fillna("").astype(str).str.strip()
        sub_values = [val for val in pd.unique(sub_clean) if val]
        _process_yoy_series(g, None)
        if len(sub_values) > 1:
            for sub_label in sub_values:
                mask = sub_clean == sub_label
                subset = g[mask]
                if subset.empty:
                    continue
                _process_yoy_series(subset, sub_label)
    return pd.DataFrame(
        rows,
        columns=[
            "premise_id",
            "year",
            "segment",
            "segment_sub",
            "region",
            "kind",
            "premise_text",
            "source",
            "nli_target",
        ],
    )


def path_safe(label: str) -> str:
    return label.replace(" ", "_").replace("/", "-")


def split_by_region_segment(prem_all: pd.DataFrame, root: Path) -> None:
    for (region, segment), group in prem_all.groupby(
        ["region", "segment"], dropna=False
    ):
        if not region or not segment:
            continue
        dest = root / path_safe(region) / path_safe(segment)
        dest.mkdir(parents=True, exist_ok=True)
        group.to_parquet(dest / "premises.parquet", index=False)


def gather_input_files(input_path: Path) -> list[Path]:
    if input_path.is_file():
        return [input_path]
    if input_path.is_dir():
        return sorted(
            [
                p
                for p in input_path.iterdir()
                if p.is_file()
                and p.suffix.lower() in {".xls", ".xlsx"}
                and not p.name.startswith("~")
            ]
        )
    raise ValueError(f"Input path not found: {input_path}")


def main():
    ap = argparse.ArgumentParser(description="Build normalized premise Parquets")
    ap.add_argument(
        "--input",
        default=str(DEFAULT_INPUT),
        help="Excel-Datei oder Ordner mit XLSX-Zeitreihen (eine Datei darf mehrere Segment/Region enthalten)",
    )
    ap.add_argument(
        "--outdir",
        default=str(DEFAULT_OUT),
        help="output directory for consolidated + split Parquets",
    )
    ap.add_argument(
        "--forecast-from", type=int, default=2025, help="Startjahr für Forecast-Fenster"
    )
    args = ap.parse_args()
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)
    input_path = Path(args.input)
    source_files = gather_input_files(input_path)
    if not source_files:
        raise ValueError(f"Keine Excel-Dateien in {input_path}")
    df_long = pd.concat(
        [load_export_long(path) for path in source_files], ignore_index=True
    )
    prem_level = make_level_premises(df_long, args.forecast_from)
    prem_yoy = make_yoy_premises(df_long, args.forecast_from)
    prem_all = pd.concat([prem_level, prem_yoy], ignore_index=True)
    prem_all = prem_all.sort_values(["region", "segment", "year", "kind"]).reset_index(
        drop=True
    )
    split_by_region_segment(prem_all, outdir)
    print(f"[ok] parsed {len(source_files)} Excel(s) → {len(df_long)} rows")
    print(f"[ok] total premises written to region/segment subfolders under {outdir}")
    print(f"[info] forecast window: >= {args.forecast_from}")


if __name__ == "__main__":
    main()
