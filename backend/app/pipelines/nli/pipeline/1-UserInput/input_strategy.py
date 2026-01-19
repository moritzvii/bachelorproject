from __future__ import annotations
import json
import sys
from datetime import datetime
from os import getenv
from pathlib import Path
from typing import Any
import zoneinfo
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=getenv("OPENAI_API_KEY"))

BASE_DIR = Path(__file__).resolve().parent

PIPELINE_ROOT = BASE_DIR.parent

sys.path.insert(0, str(PIPELINE_ROOT))

from paths import PipelinePaths
from regions import (
    REGION_AMERICAS,
    REGION_EUROPE,
    REGION_GREATER_CHINA,
    REGION_JAPAN,
    REGION_REST_OF_ASIA_PACIFIC,
    REGION_GLOBAL,
)

APPLE_REGIONS = [
    REGION_AMERICAS,
    REGION_EUROPE,
    REGION_GREATER_CHINA,
    REGION_JAPAN,
    REGION_REST_OF_ASIA_PACIFIC,
    REGION_GLOBAL,
]

PATHS = PipelinePaths.from_file(Path(__file__))

OUTPUT_DIR = PATHS.user_input_out_dir

OUTPUT_FILE = PATHS.strategy_input_file

APPLE_SEGMENTS = {"iPhone", "iPad", "Mac", "Watch", "Services", "Accessories", "Tablet"}

STRATEGY_FOCUS_VALUES = {
    "price",
    "revenue",
    "sales",
    "volume",
    "users",
    "penetration",
    "ecom",
    "online",
    "offline",
}

STRATEGY_DIRECTIONS = {"increase", "decrease", "flat", "unknown"}

SYSTEM_PROMPT = """You are a strategy parser for a Hybrid-Intelligence Decision Support System focused on Apple Inc.

TASK:
- Decide if the user input is related to Apple’s product/market strategy: product segments, official regions, or business metrics (price, revenue, sales, volume, users, penetration, e-commerce, channel split).
- If irrelevant (e.g., jokes, recipes, weather, random questions), return exactly:
  {"valid": false, "error": "Irrelevant input"}.
- If the input is HR-related (employees, headcount, hiring, workforce, FTE), return exactly:
  {"valid": false, "error": "Out of scope: HR metrics are not part of product/market strategy"}.

If relevant, normalize and return a compact JSON object with these fields:

  - valid: true
  - segment: canonical singular (one of: "iPhone","iPad","Mac","Watch","Services","Accessories","Tablet")
  - region: one of Apple’s reportable regions:
    ["Americas","Europe","Greater China","Japan","Rest of Asia Pacific","Global"]
    Map examples:
      Russia → Europe
      India/Middle East/Africa → Europe
      China/Hong Kong/Taiwan → Greater China
      Australia/Singapore/South Korea/SEA → Rest of Asia Pacific
      USA/Canada/North America/South America → Americas
      Japan → Japan
      If none found, default "Global"
  - focus: one of ["price","revenue","sales","volume","users","penetration","ecom","online","offline"]; default "sales" if unclear.
    Note: "users" refers to market users/customers, not employees.
  - direction: one of ["increase","decrease","flat","unknown"].
      "increase/grow/expand/boost" ⇒ "increase"
      "decrease/reduce/decline"   ⇒ "decrease"
      "remain/stable/flat"        ⇒ "flat"
      "adjust/optimize/review"    ⇒ "unknown"
  - title: concise, specific, non-generic strategic title describing the user’s intent (no generic terms like "Strategy", "Plan", "Objective").
    Examples: "iPhone Sales Expansion in Rest of Asia Pacific", "Europe iPad Pricing Adjustment", "Americas Mac Revenue Push".
  - paraphrased_strategy: standardized, polished paraphrase of the user input:
      If direction ≠ "unknown":
        "Strategic intent to <direction> <focus> for <segment> in <region>."
      If direction = "unknown":
        "Strategic intent to adjust <focus> for <segment> in <region>."

RULES:
- For invalid inputs (irrelevant or HR-related), output exactly the specified JSON object and do NOT include any additional fields.
- For valid inputs, output all fields listed above.
- Output exactly one valid JSON object and nothing else (no explanation, no markdown, no comments).

EXAMPLES:

INPUT: "Adjust Pricing Strategies of iPhones"
OUTPUT: {"valid": true, "segment": "iPhone", "region": "Global", "focus": "price", "direction": "unknown", "title": "iPhone Global Pricing Adjustment", "paraphrased_strategy": "Strategic intent to adjust price for iPhone in Global."}

INPUT: "Increase iPhone in Rest of Asia Pacific"
OUTPUT: {"valid": true, "segment": "iPhone", "region": "Rest of Asia Pacific", "focus": "sales", "direction": "increase", "title": "iPhone Sales Expansion in Rest of Asia Pacific", "paraphrased_strategy": "Strategic intent to increase sales for iPhone in Rest of Asia Pacific."}

INPUT: "Increase the employee number in Greater China"
OUTPUT: {"valid": false, "error": "Out of scope: HR metrics are not part of product/market strategy"}

INPUT: "Optimize iPad pricing for Europe"
OUTPUT: {"valid": true, "segment": "iPad", "region": "Europe", "focus": "price", "direction": "unknown", "title": "iPad Pricing Adjustment in Europe", "paraphrased_strategy": "Strategic intent to adjust price for iPad in Europe."}
"""


def enforce_strategy_schema(data: dict[str, Any]) -> str | None:
    if not isinstance(data, dict):
        return "Parser response was not a JSON object."
    if "valid" not in data or not isinstance(data["valid"], bool):
        return "'valid' field missing or not a boolean."
    segment = data.get("segment")
    if segment is not None:
        if not isinstance(segment, str) or segment not in APPLE_SEGMENTS:
            return f"Unexpected segment value: {segment}"
    region = data.get("region")
    if region is not None:
        if not isinstance(region, str) or region not in APPLE_REGIONS:
            return f"Unexpected region value: {region}"
    focus = data.get("focus")
    if focus is not None:
        if not isinstance(focus, str) or focus not in STRATEGY_FOCUS_VALUES:
            return f"Unexpected focus value: {focus}"
    direction = data.get("direction")
    if direction is not None:
        if not isinstance(direction, str) or direction not in STRATEGY_DIRECTIONS:
            return f"Unexpected direction value: {direction}"
    error = data.get("error")
    if error is not None and not isinstance(error, str):
        return "'error' field must be a string."
    title = data.get("title")
    if title is not None:
        if not isinstance(title, str) or not title.strip():
            return "Title must be a non-empty string."
    paraphrased = data.get("paraphrased_strategy")
    if paraphrased is not None:
        if not isinstance(paraphrased, str) or not paraphrased.strip():
            return "Paraphrased strategy must be a non-empty string."
    return None


def parse_strategy_text(strategy: str) -> dict[str, Any]:
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": strategy},
        ],
    )
    txt = resp.choices[0].message.content.strip()
    try:
        data = json.loads(txt)
    except json.JSONDecodeError:
        data = {"valid": False, "error": f"Invalid JSON returned: {txt}"}
    schema_issue = enforce_strategy_schema(data)
    if schema_issue:
        data = {"valid": False, "error": schema_issue}
    berlin = zoneinfo.ZoneInfo("Europe/Berlin")
    data["raw"] = strategy
    data["timestamp"] = datetime.now(berlin).isoformat()
    return data


def persist_strategy_result(data: dict[str, Any]) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return OUTPUT_FILE


def display_strategy_summary(data: dict[str, Any]) -> None:
    print(f"✅ Strategy parsed successfully → {OUTPUT_FILE}")
    print(f"- Segment:   {data.get('segment')}")
    print(f"- Region:    {data.get('region')}")
    print(f"- Focus:     {data.get('focus')}")
    print(f"- Direction: {data.get('direction')}")
    print(f"- Time:      {data.get('timestamp')}")
    print()
    print(json.dumps(data, indent=2, ensure_ascii=False))


def prompt_confirmation() -> bool:
    answer = input("Confirm this strategy? (y/N): ").strip().lower()
    return answer == "y"


def process_strategy(
    strategy: str,
    *,
    persist: bool = True,
    run_hypotheses: bool = True,
) -> tuple[dict[str, Any], bool, str | None]:
    data = parse_strategy_text(strategy)
    if persist and data.get("valid"):
        persist_strategy_result(data)
    pipeline_triggered = False
    pipeline_error = None
    if run_hypotheses and data.get("valid"):
        try:
            pipeline_triggered = False
            pipeline_error = "Hypotheses pipeline not yet implemented"
        except Exception as exc:
            pipeline_error = f"Pipeline execution failed: {exc!s}"
    return data, pipeline_triggered, pipeline_error


def main():
    while True:
        strategy = input("Enter your strategy: ").strip()
        if not strategy:
            print("❌ Empty input.")
            continue
        data = parse_strategy_text(strategy)
        if not data.get("valid"):
            print(f"❌ Invalid strategy: {data.get('error')}")
            continue
        display_strategy_summary(data)
        if not prompt_confirmation():
            print("ℹ️ Strategy discarded. Please enter a new strategy.")
            continue
        output_path = persist_strategy_result(data)
        print(f"✅ Parsed strategy persisted → {output_path}")
        print(
            "ℹ️ Run app/pipelines/nli/pipeline/report_pipeline.py to execute the downstream stages."
        )
        break


if __name__ == "__main__":
    main()
