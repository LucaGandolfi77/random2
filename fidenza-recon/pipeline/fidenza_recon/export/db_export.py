"""Populate the provenance database from the generated city payload."""

from __future__ import annotations

import json
from pathlib import Path

from ..config import PROCESSED_DIR, RAW_DIR, AppConfig
from ..db import (
    add_validation,
    connect,
    init_db,
    now_iso,
    upsert_building,
    upsert_facades,
    upsert_imagery,
)


def _load(path: Path, default=None):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def export(config: AppConfig) -> dict:
    del config
    city = _load(PROCESSED_DIR / "city.json", {})
    descriptors = _load(PROCESSED_DIR / "descriptors.json", {})
    base = _load(PROCESSED_DIR / "buildings_base.json", {})
    commons = _load(RAW_DIR / "commons" / "commons.json", {})
    kartaview = _load(RAW_DIR / "kartaview" / "coverage.json", {})
    base_by_id = {record["osm_id"]: record for record in base.get("buildings", [])}
    commons_files = commons.get("files", [])

    def image_reference(name: str | None) -> str | None:
        if not name:
            return None
        lowered = name.lower()
        keywords: list[str] = []
        if "cattedrale" in lowered or "duomo" in lowered:
            keywords = ["cattedrale", "duomo", "san donnino"]
        elif "porta" in lowered:
            keywords = ["porta"]
        elif "teatro" in lowered:
            keywords = ["teatro", "magnani"]
        elif "oratorio" in lowered or "chiesa" in lowered:
            keywords = ["oratorio", "chiesa", "san giorgio", "san pietro"]
        else:
            keywords = [lowered]
        matches = [
            item.get("title")
            for item in commons_files
            if any(keyword in (item.get("title") or "").lower() for keyword in keywords)
        ]
        return "; ".join(matches[:6]) if matches else None

    conn = connect()
    init_db(conn)
    conn.execute("DELETE FROM buildings")
    conn.execute("DELETE FROM building_facades")
    conn.execute("DELETE FROM imagery WHERE source_key = 'wikimedia_commons'")
    conn.execute("DELETE FROM validation")

    buildings = descriptors.get("buildings") or city.get("buildings", [])
    for building in buildings:
        record = base_by_id.get(building["osm_id"], {})
        upsert_building(
            conn,
            {
                "osm_id": building["osm_id"],
                "osm_type": building["osm_id"].split("/")[0],
                "name": building.get("name"),
                "footprint_json": {
                    "outer": building["footprint"],
                    "holes": building["holes"],
                },
                "centroid_lon": building["centroid_lonlat"][0],
                "centroid_lat": building["centroid_lonlat"][1],
                "area_m2": building.get("area_m2"),
                "perimeter_m": record.get("perimeter_m"),
                "orientation_deg": building.get("min_rect", {}).get("angle_deg"),
                "height_m": building.get("height_m"),
                "eave_height_m": building.get("eave_height_m"),
                "roof_height_m": building.get("roof_height_m"),
                "height_source": building.get("height_source"),
                "height_confidence": building.get("height_confidence"),
                "floors": building.get("floors"),
                "floor_height_m": building.get("upper_floor_height_m"),
                "ground_elevation_m": building.get("base_elevation_m"),
                "roof_shape": building.get("roof", {}).get("shape"),
                "roof_colour": building.get("roof", {}).get("colour"),
                "roof_material": building.get("roof", {}).get("material"),
                "archetype": building.get("archetype"),
                "archetype_confidence": building.get("archetype_confidence"),
                "geometry_confidence": building.get("geometry_confidence"),
                "texture_confidence": building.get("texture_confidence"),
                "tier": building.get("tier"),
                "procedural_flags": building.get("procedural_flags"),
                "tags_json": building.get("tags"),
                "source_dataset": (
                    "OSM footprints; RER 2023-24 orthophoto/DTM; DSM AGEA 2008; "
                    "DBTR UVL fallback where DSM is missing"
                ),
                "source_url": "https://www.openstreetmap.org/",
                "license": (
                    "ODbL 1.0 (OSM); CC BY 4.0 (RER); CC BY 4.0 (DBTR); "
                    "DSM service license to verify"
                ),
                "image_reference": image_reference(building.get("name")),
                "facade_source": (
                    "procedural_grammar"
                    if building.get("detail") == "pilot"
                    else "not_detailed_context_lod1"
                ),
                "facade_primary_colour": building.get("facade", {}).get("primary"),
                "facade_material": building.get("facade", {}).get("material"),
                "window_count": building.get("window_count"),
                "balcony_count": building.get("balcony_count"),
                "construction_period": "unknown",
                "last_verified": now_iso(),
            },
        )
        upsert_facades(conn, building["osm_id"], building.get("sides") or [])

    for item in commons.get("files", []):
        upsert_imagery(
            conn,
            {
                "source_key": "wikimedia_commons",
                "external_id": item.get("title"),
                "kind": "reference_photo",
                "lat": item.get("lat"),
                "lon": item.get("lon"),
                "captured_at": item.get("captured_at"),
                "license": item.get("license"),
                "attribution": item.get("artist") or item.get("credit"),
                "url": item.get("page_url"),
                "local_path": item.get("local_path"),
                "notes": item.get("description"),
            },
        )

    pilot = [building for building in buildings if building.get("detail") == "pilot"]
    measured = [
        building
        for building in buildings
        if building.get("height_source") == "dsm_agea2008_minus_dtm_rer2023_24"
    ]
    flagged = [
        building
        for building in buildings
        if (building.get("height_confidence") or 0) < 0.5
        or (building.get("archetype_confidence") or 0) < 0.4
        or (building.get("roof", {}).get("confidence") or 0) < 0.4
    ]
    add_validation(
        conn,
        check_name="osm_footprint_source",
        reference="OpenStreetMap footprints (ODbL)",
        measured=f"{len(buildings)} building records",
        status="pass",
        checked_at=now_iso(),
    )
    add_validation(
        conn,
        check_name="height_evidence",
        reference="DSM AGEA 2008 minus DTM RER 2023-24",
        measured=f"{len(measured)} / {len(buildings)}",
        error="cross-epoch uncertainty",
        status="partial" if len(measured) < len(buildings) else "pass",
        checked_at=now_iso(),
    )
    add_validation(
        conn,
        check_name="street_level_imagery",
        reference="KartaView public photo endpoint",
        measured=(
            f"{kartaview.get('photos_inside_bbox', 0)} photos inside bbox; "
            f"{kartaview.get('photo_count', 0)} nearby"
        ),
        status=(
            "pass"
            if kartaview.get("photos_inside_bbox", 0)
            else "unavailable"
        ),
        checked_at=now_iso(),
    )
    add_validation(
        conn,
        check_name="reference_photography",
        reference="Wikimedia Commons",
        measured=f"{commons.get('file_count', 0)} files",
        status="partial" if commons.get("file_count", 0) < len(pilot) else "pass",
        checked_at=now_iso(),
    )
    for building in flagged:
        add_validation(
            conn,
            osm_id=building["osm_id"],
            check_name="manual_review",
            reference="height/archetype/roof confidence thresholds",
            measured=(
                f"height={building.get('height_confidence')}, "
                f"archetype={building.get('archetype_confidence')}, "
                f"roof={building.get('roof', {}).get('confidence')}"
            ),
            status="review",
            checked_at=now_iso(),
        )

    counts = {
        "buildings": len(buildings),
        "pilot": len(pilot),
        "context": len(buildings) - len(pilot),
        "measured_heights": len(measured),
        "flagged_for_review": len(flagged),
        "imagery": len(commons.get("files", [])),
    }
    conn.commit()
    conn.close()
    summary_path = PROCESSED_DIR / "db_summary.json"
    summary_path.write_text(json.dumps(counts, indent=2), encoding="utf-8")
    return counts
