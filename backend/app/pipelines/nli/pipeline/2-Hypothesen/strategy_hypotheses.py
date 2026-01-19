from __future__ import annotations
import datetime
import json
import sys
from os import getenv
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=getenv("OPENAI_API_KEY"))

BASE_DIR = Path(__file__).resolve().parent

PIPELINE_ROOT = BASE_DIR.parent

sys.path.insert(0, str(PIPELINE_ROOT))

from paths import PipelinePaths

PATHS = PipelinePaths.from_file(Path(__file__))

INPUT_PATH = PATHS.strategy_input_file

OUTPUT_DIR = PATHS.hypotheses_out_dir

OUTPUT_FILE = PATHS.hypotheses_file

SYSTEM_PROMPT = """You are a hypothesis and strategy-title generator for Natural Language Inference (NLI).
Input: a structured strategy with keys (segment, region, focus, direction, raw).
Output: 3–5 short, declarative hypotheses plus a clean strategy title, both rooted in the same strategy.

You MUST normalize Apple product segments to their over-arching device categories used in forecast reports:

- If segment = "iPhone"  → write "Smartphones"
- If segment = "iPad"    → write "Tablets"
- If segment = "Mac"     → write "Mac (Laptops)" or just "Mac laptops"
- If segment = "Watch"   → write "Wearables, Home and Accessories"
- If segment = "Accessories" or "Wearables, Home and Accessories"
                        → write "Wearables, Home and Accessories"
- If segment = "Services" → keep "Services"

Never use brand labels like "iPhone", "iPad" or "Apple Watch" in the hypotheses – always use the normalized category wording above, so that the wording matches the forecast premises.

Guidelines:
- Generate 3 MNLI-taugliche Hypothesen: one sentence, ≤ 15 words, declarative, no causal phrasing or buzzwords.
- Each hypothesis must explicitly mention:
  - a normalized segment category (Smartphones, Tablets, Mac (Laptops), Smartwatches, Wearables, Home and Accessories, Services),
  - a region (Apple regions: Americas, Europe, Greater China, Japan, Rest of Asia Pacific, Global – use the region from the input strategy or Global as default),
  - one metric (price/ASP, revenue, sales, volume, users, penetration, e-commerce, online share, offline share),
  - and – if present in the input – a direction (increase/decrease/flat).
- The formulation must be directly comparable to the forecast premises in `premises.parquet`, i.e. refer to concrete forecast metrics (e.g. price per unit, ASP, revenue, volume, online share) and avoid abstract terms like “brand awareness”.
- Keep every hypothesis tightly aligned with the input strategy, stay within the given region and respect the direction/focus combination.
- Paraphrase the raw strategy into a slide-ready title (max 3 words, max 25 characters); remove fillers, fix obvious errors, keep it short and crisp.
- Output strictly JSON, no explanations, no Markdown.

Respond with JSON:
{"hypotheses": ["...", "...", "..."], "strategy_title": "deck-ready heading"}.
"""


def enforce_title_limits(candidate: str) -> str:
    candidate = candidate.strip()
    if not candidate:
        return ""
    words = [word for word in candidate.split() if word]
    limited_words: list[str] = []
    current_len = 0
    for word in words:
        if len(limited_words) >= 3:
            break
        delimiter = 1 if limited_words else 0
        if current_len + delimiter + len(word) > 25:
            break
        limited_words.append(word)
        current_len += delimiter + len(word)
    if limited_words:
        return " ".join(limited_words)
    return candidate[:25].rstrip()


def main() -> None:
    if not INPUT_PATH.exists():
        print(
            f"❌ {INPUT_PATH} not found. Run pipeline/1-UserInput/input_strategy.py first."
        )
        return
    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        strategy = json.load(f)
    if not strategy.get("valid", False):
        print("❌ Strategy invalid or not relevant.")
        return
    strategy_for_hypos = dict(strategy)
    if strategy_for_hypos.get("region") == "Rest of Asia Pacific":
        strategy_for_hypos["region"] = "Asia Pacific"
    strategy_text = json.dumps(strategy_for_hypos, ensure_ascii=False)
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        temperature=0,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": strategy_text},
        ],
    )
    txt = resp.choices[0].message.content.strip()
    try:
        payload = json.loads(txt)
    except json.JSONDecodeError:
        payload = {"error": f"Invalid JSON returned: {txt}"}
    if error := payload.get("error"):
        print(f"⚠️ {error}")
    hypotheses = payload.get("hypotheses", [])
    raw_title = str(payload.get("strategy_title", "") or "")
    sanitized_title = enforce_title_limits(raw_title)
    if not sanitized_title:
        sanitized_title = enforce_title_limits(strategy.get("raw", ""))
    strategy["hypotheses"] = hypotheses
    strategy["hypotheses_created_at"] = datetime.datetime.utcnow().isoformat() + "Z"
    strategy["strategy_title"] = sanitized_title
    strategy["strategy_title_created_at"] = datetime.datetime.utcnow().isoformat() + "Z"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(strategy, f, ensure_ascii=False, indent=2)
    print(f"✅ Hypothesen + Titel generiert → {OUTPUT_FILE}")
    print(
        json.dumps(
            {
                "hypotheses": strategy["hypotheses"],
                "strategy_title": strategy.get("strategy_title"),
            },
            indent=2,
            ensure_ascii=False,
        )
    )
    print(
        "ℹ️ Run app/pipelines/nli/pipeline/report_pipeline.py to execute downstream steps."
    )


if __name__ == "__main__":
    main()
