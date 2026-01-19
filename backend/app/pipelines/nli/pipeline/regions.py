from __future__ import annotations
from typing import Dict, List, Set, Optional

REGION_AMERICAS = "Americas"

REGION_EUROPE = "Europe"

REGION_GREATER_CHINA = "Greater China"

REGION_JAPAN = "Japan"

REGION_REST_OF_ASIA_PACIFIC = "Rest of Asia Pacific"

REGION_GLOBAL = "Global"

REGION_WORLDWIDE = "Worldwide"

CANONICAL_REGIONS_LIST: List[str] = [
    REGION_AMERICAS,
    REGION_EUROPE,
    REGION_GREATER_CHINA,
    REGION_JAPAN,
    REGION_REST_OF_ASIA_PACIFIC,
    REGION_GLOBAL,
]

REGION_AMERICAS_CODE = "AMERICAS"

REGION_EUROPE_CODE = "EUROPE"

REGION_GREATER_CHINA_CODE = "GREATER_CHINA"

REGION_JAPAN_CODE = "JAPAN"

REGION_REST_OF_ASIA_PACIFIC_CODE = "REST_OF_ASIA_PACIFIC"

REGION_APAC_CODE = "APAC"

REGION_GLOBAL_CODE = "GLOBAL"

REGION_WORLDWIDE_CODE = "WORLDWIDE"

REGION_ALIASES: Dict[str, str] = {
    "americas": REGION_AMERICAS,
    "america": REGION_AMERICAS,
    "north america": REGION_AMERICAS,
    "north-america": REGION_AMERICAS,
    "south america": REGION_AMERICAS,
    "south-america": REGION_AMERICAS,
    "usa": REGION_AMERICAS,
    "us": REGION_AMERICAS,
    "united states": REGION_AMERICAS,
    "canada": REGION_AMERICAS,
    "mexico": REGION_AMERICAS,
    "latin america": REGION_AMERICAS,
    "latam": REGION_AMERICAS,
    "europe": REGION_EUROPE,
    "emea": REGION_EUROPE,
    "eu": REGION_EUROPE,
    "european union": REGION_EUROPE,
    "uk": REGION_EUROPE,
    "united kingdom": REGION_EUROPE,
    "germany": REGION_EUROPE,
    "france": REGION_EUROPE,
    "italy": REGION_EUROPE,
    "spain": REGION_EUROPE,
    "netherlands": REGION_EUROPE,
    "switzerland": REGION_EUROPE,
    "sweden": REGION_EUROPE,
    "norway": REGION_EUROPE,
    "denmark": REGION_EUROPE,
    "russia": REGION_EUROPE,
    "middle east": REGION_EUROPE,
    "africa": REGION_EUROPE,
    "western europe": REGION_EUROPE,
    "eastern europe": REGION_EUROPE,
    "greater china": REGION_GREATER_CHINA,
    "greater-china": REGION_GREATER_CHINA,
    "greater china region": REGION_GREATER_CHINA,
    "china": REGION_GREATER_CHINA,
    "prc": REGION_GREATER_CHINA,
    "hong kong": REGION_GREATER_CHINA,
    "hongkong": REGION_GREATER_CHINA,
    "hk": REGION_GREATER_CHINA,
    "taiwan": REGION_GREATER_CHINA,
    "macau": REGION_GREATER_CHINA,
    "japan": REGION_JAPAN,
    "jp": REGION_JAPAN,
    "rest of asia pacific": REGION_REST_OF_ASIA_PACIFIC,
    "rest-of-asia-pacific": REGION_REST_OF_ASIA_PACIFIC,
    "asia pacific": REGION_REST_OF_ASIA_PACIFIC,
    "asia-pacific": REGION_REST_OF_ASIA_PACIFIC,
    "asia": REGION_REST_OF_ASIA_PACIFIC,
    "pacific": REGION_REST_OF_ASIA_PACIFIC,
    "india": REGION_REST_OF_ASIA_PACIFIC,
    "australia": REGION_REST_OF_ASIA_PACIFIC,
    "singapore": REGION_REST_OF_ASIA_PACIFIC,
    "south korea": REGION_REST_OF_ASIA_PACIFIC,
    "korea": REGION_REST_OF_ASIA_PACIFIC,
    "southeast asia": REGION_REST_OF_ASIA_PACIFIC,
    "sea": REGION_REST_OF_ASIA_PACIFIC,
    "thailand": REGION_REST_OF_ASIA_PACIFIC,
    "vietnam": REGION_REST_OF_ASIA_PACIFIC,
    "indonesia": REGION_REST_OF_ASIA_PACIFIC,
    "malaysia": REGION_REST_OF_ASIA_PACIFIC,
    "philippines": REGION_REST_OF_ASIA_PACIFIC,
    "new zealand": REGION_REST_OF_ASIA_PACIFIC,
    "global": REGION_GLOBAL,
    "worldwide": REGION_WORLDWIDE,
    "world": REGION_GLOBAL,
    "international": REGION_GLOBAL,
    "all regions": REGION_GLOBAL,
}

REGION_TO_CODE: Dict[str, str] = {
    REGION_AMERICAS: REGION_AMERICAS_CODE,
    REGION_EUROPE: REGION_EUROPE_CODE,
    REGION_GREATER_CHINA: REGION_GREATER_CHINA_CODE,
    REGION_JAPAN: REGION_JAPAN_CODE,
    REGION_REST_OF_ASIA_PACIFIC: REGION_REST_OF_ASIA_PACIFIC_CODE,
    REGION_GLOBAL: REGION_GLOBAL_CODE,
    REGION_WORLDWIDE: REGION_WORLDWIDE_CODE,
}

CODE_TO_REGION: Dict[str, str] = {v: k for k, v in REGION_TO_CODE.items()}

REGION_HIERARCHY: Dict[str, Set[str]] = {
    REGION_GLOBAL: {
        REGION_AMERICAS,
        REGION_EUROPE,
        REGION_GREATER_CHINA,
        REGION_JAPAN,
        REGION_REST_OF_ASIA_PACIFIC,
    },
    REGION_WORLDWIDE: {
        REGION_AMERICAS,
        REGION_EUROPE,
        REGION_GREATER_CHINA,
        REGION_JAPAN,
        REGION_REST_OF_ASIA_PACIFIC,
    },
    "APAC": {
        REGION_GREATER_CHINA,
        REGION_JAPAN,
        REGION_REST_OF_ASIA_PACIFIC,
    },
}

SUB_REGIONS: Dict[str, Set[str]] = {
    REGION_AMERICAS: {
        "North America",
        "South America",
        "USA",
        "Canada",
        "Mexico",
        "Brazil",
        "Argentina",
        "Chile",
        "Latin America",
    },
    REGION_EUROPE: {
        "Western Europe",
        "Eastern Europe",
        "UK",
        "Germany",
        "France",
        "Italy",
        "Spain",
        "Netherlands",
        "Switzerland",
        "Sweden",
        "Norway",
        "Denmark",
        "Russia",
        "Middle East",
        "Africa",
    },
    REGION_GREATER_CHINA: {"China", "Hong Kong", "Taiwan", "Macau", "PRC"},
    REGION_JAPAN: {"Japan"},
    REGION_REST_OF_ASIA_PACIFIC: {
        "India",
        "Australia",
        "Singapore",
        "South Korea",
        "Southeast Asia",
        "Thailand",
        "Vietnam",
        "Indonesia",
        "Malaysia",
        "Philippines",
        "New Zealand",
    },
}


def normalize_region(region: str) -> str:
    if not region:
        return REGION_GLOBAL
    normalized = region.strip().lower()
    return REGION_ALIASES.get(normalized, region.strip())


def region_to_code(region: str) -> str:
    canonical = normalize_region(region)
    return REGION_TO_CODE.get(canonical, canonical.upper().replace(" ", "_"))


def code_to_region(code: str) -> str:
    return CODE_TO_REGION.get(code.upper(), code)


def is_subset_of(child_region: str, parent_region: str) -> bool:
    child = normalize_region(child_region)
    parent = normalize_region(parent_region)
    if child == parent:
        return True
    if parent in REGION_HIERARCHY:
        if child in REGION_HIERARCHY[parent]:
            return True
    if parent == "APAC" or parent.upper() == "APAC":
        apac_children = REGION_HIERARCHY.get("APAC", set())
        if child in apac_children:
            return True
    if parent in SUB_REGIONS:
        child_lower = child.lower()
        for sub in SUB_REGIONS[parent]:
            if child_lower == sub.lower():
                return True
    return False


def get_children(parent_region: str) -> Set[str]:
    parent = normalize_region(parent_region)
    if parent in REGION_HIERARCHY:
        return REGION_HIERARCHY[parent].copy()
    if parent.upper() == "APAC":
        return REGION_HIERARCHY.get("APAC", set()).copy()
    return set()


def get_all_regions() -> List[str]:
    return [
        r for r in CANONICAL_REGIONS_LIST if r not in {REGION_GLOBAL, REGION_WORLDWIDE}
    ]


def validate_region(region: str) -> bool:
    normalized = normalize_region(region)
    return normalized in CANONICAL_REGIONS_LIST or normalized in REGION_ALIASES.values()


__all__ = [
    "REGION_AMERICAS",
    "REGION_EUROPE",
    "REGION_GREATER_CHINA",
    "REGION_JAPAN",
    "REGION_REST_OF_ASIA_PACIFIC",
    "REGION_GLOBAL",
    "REGION_WORLDWIDE",
    "REGION_AMERICAS_CODE",
    "REGION_EUROPE_CODE",
    "REGION_GREATER_CHINA_CODE",
    "REGION_JAPAN_CODE",
    "REGION_REST_OF_ASIA_PACIFIC_CODE",
    "REGION_APAC_CODE",
    "REGION_GLOBAL_CODE",
    "REGION_WORLDWIDE_CODE",
    "CANONICAL_REGIONS_LIST",
    "REGION_ALIASES",
    "REGION_TO_CODE",
    "CODE_TO_REGION",
    "REGION_HIERARCHY",
    "SUB_REGIONS",
    "normalize_region",
    "region_to_code",
    "code_to_region",
    "is_subset_of",
    "get_children",
    "get_all_regions",
    "validate_region",
]
