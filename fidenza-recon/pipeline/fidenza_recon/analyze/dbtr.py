"""Use the regional DBTR building volumes as a fallback height source.

The DBTR ``UVL`` (unità volumetrica) layer is published as a public WMS and its
GetFeatureInfo response includes a qualitative building height (``H_uvl``,
about +/-3 m, derived from the 2008 DSM). It is used only where the current
pipeline has no DSM samples and would otherwise fall back to a flat typology
prior. Measured DSM heights are never overwritten.
"""

from __future__ import annotations

import json
import math
import random
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

import requests

from ..config import PROCESSED_DIR, AppConfig
from ..db import connect, init_db, now_iso, upsert_source
from ..geo import GeoContext

DBTR_WMS = "https://servizigis.regione.emilia-romagna.it/wms/dbtr"
DBTR_SOURCE = "dbtr_uvl_2008"
DBTR_CONFIDENCE = 0.45
_UVL_RE = re.compile(
    r"@UVL_Unita_volumetrica\s+(.*?)(?=\s*@|\Z)", re.IGNORECASE | re.DOTALL
)
_LAYER_RE = re.compile(
    r"@EDI_Edificio\s+(.*?)(?=\s*@|\Z)", re.IGNORECASE | re.DOTALL
)


def _number(value: Any) -> float | None:
    try:
        return float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return None


def _rows(block: str) -> list[dict[str, str]]:
    if "SHAPE.LEN;" not in block:
        return []
    header_text, value_text = block.split("SHAPE.LEN;", 1)
    headers = [item.strip() for item in header_text.split(";")] + ["SHAPE.LEN"]
    value_text = value_text.strip().rstrip(";")
    if not value_text:
        return []
    rows: list[dict[str, str]] = []
    for row_text in re.split(r"\s+(?=\d+;\d+;)", value_text):
        values = [value.strip() for value in row_text.split(";")]
        if len(values) < 8:
            continue
        rows.append(dict(zip(headers, values, strict=False)))
    return rows


def parse_uvl_response(text: str) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for match in _UVL_RE.finditer(text):
        rows.extend(_rows(match.group(1)))
    return rows


def parse_edi_response(text: str) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for match in _LAYER_RE.finditer(text):
        rows.extend(_rows(match.group(1)))
    return rows


def _get_feature_info(
    x: float, y: float, radius: float = 8.0, feature_count: int = 30
) -> str | None:
    params = {
        "service": "WMS",
        "version": "1.3.0",
        "request": "GetFeatureInfo",
        "layers": "EDI_Edificio,UVL_Unita_volumetrica",
        "query_layers": "EDI_Edificio,UVL_Unita_volumetrica",
        "styles": "",
        "bbox": f"{x - radius},{y - radius},{x + radius},{y + radius}",
        "width": "21",
        "height": "21",
        "info_format": "text/plain",
        "feature_count": str(feature_count),
        "CRS": "EPSG:7791",
        "I": "10",
        "J": "10",
    }
    try:
        for attempt in range(2):
            try:
                response = requests.get(DBTR_WMS, params=params, timeout=30)
                response.raise_for_status()
                return response.text
            except Exception:  # noqa: BLE001 - retry transient WMS errors
                if attempt == 0:
                    time.sleep(0.8)
        return None
    except Exception:  # noqa: BLE001 - fallback is optional
        return None


def query_building(x: float, y: float) -> dict[str, Any] | None:
    text = _get_feature_info(x, y)
    rows = parse_uvl_response(text) if text else []
    if not rows and text:
        # A slightly larger window handles centroids that fall in a courtyard.
        text = _get_feature_info(x, y, radius=15.0)
        rows = parse_uvl_response(text) if text else []
    if not rows:
        return None
    heights = [
        height
        for row in rows
        if (height := _number(row.get("H_uvl"))) is not None and height > 0
    ]
    if not heights:
        return None
    height = max(heights)
    eave_candidates: list[float] = []
    roof_candidates: list[float] = []
    for row in rows:
        base = _number(row.get("B_uvl"))
        gronda = _number(row.get("H_GRONDA"))
        colmo = _number(row.get("H_COLMO"))
        if base is not None and gronda is not None and gronda > base:
            eave_candidates.append(gronda - base)
        if gronda is not None and colmo is not None and colmo > gronda:
            roof_candidates.append(colmo - gronda)
    eave = max(eave_candidates) if eave_candidates else max(2.5, height - 0.8)
    eave = min(eave, height)
    roof = max(0.4, max(roof_candidates)) if roof_candidates else max(0.4, height - eave)
    return {
        "height_m": round(height, 2),
        "eave_height_m": round(eave, 2),
        "roof_height_m": round(roof, 2),
        "uvl_count": len(heights),
    }


def _pilot_sample(config: AppConfig, limit: int) -> list[dict]:
    base = json.loads(
        (PROCESSED_DIR / "buildings_base.json").read_text(encoding="utf-8")
    )
    groups: dict[str, list[dict]] = {}
    for record in base.get("buildings", []):
        if record.get("detail") != "pilot":
            continue
        if float(record.get("area_m2") or 0.0) < 50.0:
            continue
        groups.setdefault(record.get("district_id") or "unknown", []).append(record)
    selected: list[dict] = []
    per_group = max(1, math.ceil(limit / max(1, len(groups))))
    rng = random.Random(42)
    for records in groups.values():
        shuffled = list(records)
        rng.shuffle(shuffled)
        selected.extend(shuffled[:per_group])
    return selected[:limit]


def sample(config: AppConfig, limit: int = 60) -> dict[str, Any]:
    """Compare current heights with DBTR UVL heights for an audit sample."""
    ctx = GeoContext(config.origin[0], config.origin[1], config.crs_metric)
    heights = json.loads(
        (PROCESSED_DIR / "heights.json").read_text(encoding="utf-8")
    )
    records = _pilot_sample(config, limit)

    def run(record: dict) -> tuple[dict, dict | None]:
        x, y = ctx.local_to_metric(*record["centroid_local"])
        return record, query_building(x, y)

    pairs: list[dict[str, Any]] = []
    missing = 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(run, record) for record in records]
        for future in as_completed(futures):
            record, info = future.result()
            if info is None:
                missing += 1
                continue
            current = heights.get(record["osm_id"]) or {}
            if current.get("height_m") is None:
                continue
            pairs.append(
                {
                    "osm_id": record["osm_id"],
                    "district_id": record.get("district_id"),
                    "current_height_m": round(float(current["height_m"]), 2),
                    "dbtr_height_m": info["height_m"],
                    "difference_m": round(
                        float(current["height_m"]) - info["height_m"], 2
                    ),
                }
            )

    differences = [abs(item["difference_m"]) for item in pairs]
    biases = [item["difference_m"] for item in pairs]
    return {
        "sample_size": len(records),
        "matched": len(pairs),
        "missing": missing,
        "bias_m": round(sum(biases) / len(biases), 2) if biases else None,
        "mae_m": round(sum(differences) / len(differences), 2)
        if differences
        else None,
        "median_abs_m": round(sorted(differences)[len(differences) // 2], 2)
        if differences
        else None,
        "within_1m": sum(value <= 1.0 for value in differences),
        "within_2m": sum(value <= 2.0 for value in differences),
        "within_3m": sum(value <= 3.0 for value in differences),
        "pairs": pairs,
    }


def enrich(config: AppConfig, force: bool = False) -> dict[str, Any]:
    """Replace flat typology priors with DBTR UVL heights where available."""
    del force
    heights_path = PROCESSED_DIR / "heights.json"
    base_path = PROCESSED_DIR / "buildings_base.json"
    if not heights_path.exists() or not base_path.exists():
        return {"updated": 0, "targets": 0, "reason": "heights/base missing"}

    heights = json.loads(heights_path.read_text(encoding="utf-8"))
    base = json.loads(base_path.read_text(encoding="utf-8"))
    by_id = {record["osm_id"]: record for record in base.get("buildings", [])}
    targets = [
        osm_id
        for osm_id, record in heights.items()
        if record.get("height_source") == "typology_prior"
        and osm_id in by_id
    ]
    if not targets:
        return {"updated": 0, "targets": 0, "source": DBTR_SOURCE}

    ctx = GeoContext(config.origin[0], config.origin[1], config.crs_metric)
    default_floor = float(config.city["floor_heights"]["default_m"])

    def run(osm_id: str) -> tuple[str, dict[str, Any] | None]:
        record = by_id[osm_id]
        x, y = ctx.local_to_metric(*record["centroid_local"])
        return osm_id, query_building(x, y)

    updated = 0
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(run, osm_id) for osm_id in targets]
        for future in as_completed(futures):
            osm_id, info = future.result()
            if info is None:
                continue
            record = heights[osm_id]
            height = info["height_m"]
            eave = info["eave_height_m"]
            roof = info["roof_height_m"]
            floors = max(1, int(round(eave / default_floor)))
            record.update(
                {
                    "height_m": height,
                    "eave_height_m": eave,
                    "roof_height_m": roof,
                    "floors": floors,
                    "floor_height_m": round(eave / floors, 2),
                    "height_source": DBTR_SOURCE,
                    "height_confidence": DBTR_CONFIDENCE,
                    "notes": (
                        "DBTR UVL qualitative height (about +/-3 m, source 2008); "
                        "replaces the flat typology prior."
                    ),
                }
            )
            updated += 1

    heights_path.write_text(json.dumps(heights, indent=2), encoding="utf-8")
    summary = {
        "targets": len(targets),
        "updated": updated,
        "source": DBTR_SOURCE,
        "confidence": DBTR_CONFIDENCE,
        "updated_at": now_iso(),
    }
    (PROCESSED_DIR / "dbtr_enrichment.json").write_text(
        json.dumps(summary, indent=2), encoding="utf-8"
    )

    conn = connect()
    init_db(conn)
    upsert_source(
        conn,
        key="dbtr",
        name="Database Topografico Regionale — Unità volumetrica (UVL)",
        url=DBTR_WMS,
        license="CC BY 4.0",
        license_url="https://creativecommons.org/licenses/by/4.0/",
        retrieved_at=now_iso(),
        resolution="qualitative building height, about +/-3 m",
        notes=(
            "Public WMS GetFeatureInfo; used only as fallback for buildings "
            "without usable DSM samples."
        ),
    )
    conn.close()
    return summary
