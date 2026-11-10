"""OpenStreetMap acquisition via Overpass API."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

import requests
from shapely.geometry import LineString, MultiPolygon, Polygon, mapping
from shapely.ops import polygonize, unary_union

from ..config import RAW_DIR, AppConfig, ensure_dirs
from ..db import now_iso, upsert_dataset, upsert_source

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

QUERY_TEMPLATE = """
[out:json][timeout:{timeout}];
(
  way["building"]({bbox});
  relation["building"]({bbox});
  way["highway"]({bbox});
  node["highway"]({bbox});
  node["entrance"]({bbox});
  node["amenity"~"^(bench|waste_basket|bus_station|bicycle_parking|drinking_water|fountain|post_box|parking|shelter)$"]({bbox});
  node["natural"="tree"]({bbox});
  node["barrier"="bollard"]({bbox});
  node["public_transport"="platform"]({bbox});
  node["shop"]({bbox});
  node["office"]({bbox});
  node["craft"]({bbox});
);
out tags geom;
"""

PROP_KINDS = {
    ("highway", "street_lamp"): "lamp",
    ("natural", "tree"): "tree",
    ("amenity", "bench"): "bench",
    ("amenity", "waste_basket"): "waste_basket",
    ("amenity", "bus_station"): "bus_stop",
    ("highway", "bus_stop"): "bus_stop",
    ("public_transport", "platform"): "bus_stop",
    ("barrier", "bollard"): "bollard",
    ("highway", "crossing"): "crossing",
    ("highway", "traffic_signals"): "traffic_signals",
    ("amenity", "bicycle_parking"): "bicycle_parking",
    ("amenity", "drinking_water"): "fountain",
    ("amenity", "fountain"): "fountain",
    ("amenity", "post_box"): "post_box",
    ("amenity", "parking"): "parking",
    ("entrance", "*"): "entrance",
}


def _classify_prop(tags: dict[str, Any]) -> str | None:
    for (key, value), kind in PROP_KINDS.items():
        if value == "*" and key in tags:
            return kind
        if tags.get(key) == value:
            return kind
    return None


def _parse_way_geometry(element: dict[str, Any]) -> list[tuple[float, float]]:
    return [
        (float(node["lon"]), float(node["lat"]))
        for node in element.get("geometry") or []
        if node and "lon" in node and "lat" in node
    ]


def _relation_polygon(element: dict[str, Any]) -> Polygon | MultiPolygon | None:
    outer_lines: list[LineString] = []
    inner_lines: list[LineString] = []
    for member in element.get("members") or []:
        geometry = member.get("geometry") or []
        coords = [
            (float(node["lon"]), float(node["lat"]))
            for node in geometry
            if node and "lon" in node and "lat" in node
        ]
        if len(coords) < 2:
            continue
        line = LineString(coords)
        if member.get("role") == "inner":
            inner_lines.append(line)
        else:
            outer_lines.append(line)
    if not outer_lines:
        return None
    outer_polys = list(polygonize(unary_union(outer_lines)))
    if not outer_polys:
        return None
    poly = max(outer_polys, key=lambda p: p.area)
    if inner_lines:
        inner_polys = list(polygonize(unary_union(inner_lines)))
        if inner_polys:
            poly = poly.difference(unary_union(inner_polys))
    return poly


def _feature(osm_type: str, osm_id: int, geometry: Any, tags: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "Feature",
        "geometry": mapping(geometry),
        "properties": {
            "osm_id": f"{osm_type}/{osm_id}",
            "osm_type": osm_type,
            "tags": tags,
            "name": tags.get("name"),
        },
    }


def _download(query: str, timeout_s: int) -> dict[str, Any]:
    last_error: Exception | None = None
    headers = {
        "User-Agent": "fidenza-recon/0.1 (research; OSM ODbL)",
        "Accept": "application/json",
    }
    for endpoint in OVERPASS_ENDPOINTS:
        for attempt in range(2):
            try:
                response = requests.post(
                    endpoint,
                    data={"data": query},
                    headers=headers,
                    timeout=timeout_s,
                )
                response.raise_for_status()
                return response.json()
            except Exception as exc:  # noqa: BLE001 - try the next mirror
                last_error = exc
                time.sleep(2.0 + attempt * 4.0)
    raise RuntimeError(f"All Overpass endpoints failed: {last_error}")


def fetch(config: AppConfig, force: bool = False) -> dict[str, Path]:
    ensure_dirs()
    bbox = config.context_bbox
    bbox_str = f"{bbox[1]:.6f},{bbox[0]:.6f},{bbox[3]:.6f},{bbox[2]:.6f}"
    out_dir = RAW_DIR / "osm"
    out_dir.mkdir(parents=True, exist_ok=True)
    raw_path = out_dir / "osm_raw.json"
    buildings_path = out_dir / "buildings.geojson"
    roads_path = out_dir / "roads.geojson"
    props_path = out_dir / "props.geojson"

    if raw_path.exists() and not force:
        payload = json.loads(raw_path.read_text(encoding="utf-8"))
    else:
        query = QUERY_TEMPLATE.format(bbox=bbox_str, timeout=240)
        payload = _download(query, timeout_s=360)
        raw_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    buildings: list[dict[str, Any]] = []
    roads: list[dict[str, Any]] = []
    props: list[dict[str, Any]] = []
    seen_buildings: set[str] = set()

    elements = payload.get("elements", [])
    relation_member_ids: set[int] = set()
    for element in elements:
        if element.get("type") == "relation" and "building" in element.get("tags", {}):
            for member in element.get("members") or []:
                if member.get("type") == "way":
                    relation_member_ids.add(int(member["ref"]))

    for element in elements:
        tags = element.get("tags") or {}
        osm_type = element.get("type")
        osm_id = int(element.get("id", 0))
        if osm_type == "way" and "building" in tags:
            if osm_id in relation_member_ids:
                continue
            coords = _parse_way_geometry(element)
            if len(coords) < 4:
                continue
            if coords[0] != coords[-1]:
                coords.append(coords[0])
            poly = Polygon(coords)
            if not poly.is_valid:
                poly = poly.buffer(0)
            if poly.is_empty:
                continue
            feature = _feature("way", osm_id, poly, tags)
            if feature["properties"]["osm_id"] not in seen_buildings:
                buildings.append(feature)
                seen_buildings.add(feature["properties"]["osm_id"])
        elif osm_type == "relation" and "building" in tags:
            poly = _relation_polygon(element)
            if poly is None or poly.is_empty:
                continue
            feature = _feature("relation", osm_id, poly, tags)
            if feature["properties"]["osm_id"] not in seen_buildings:
                buildings.append(feature)
                seen_buildings.add(feature["properties"]["osm_id"])
        elif osm_type == "way" and "highway" in tags:
            coords = _parse_way_geometry(element)
            if len(coords) < 2:
                continue
            feature = _feature("way", osm_id, LineString(coords), tags)
            feature["properties"]["highway"] = tags.get("highway")
            feature["properties"]["name"] = tags.get("name")
            roads.append(feature)
        elif osm_type == "node":
            kind = _classify_prop(tags)
            if kind is None:
                continue
            props.append(
                {
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [element["lon"], element["lat"]]},
                    "properties": {
                        "osm_id": f"node/{osm_id}",
                        "osm_type": "node",
                        "kind": kind,
                        "tags": tags,
                        "name": tags.get("name"),
                    },
                }
            )

    for path, features in (
        (buildings_path, buildings),
        (roads_path, roads),
        (props_path, props),
    ):
        path.write_text(
            json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False),
            encoding="utf-8",
        )

    from ..db import connect, init_db

    conn = connect()
    init_db(conn)
    upsert_source(
        conn,
        key="osm",
        name="OpenStreetMap via Overpass API",
        url="https://www.openstreetmap.org/",
        license="ODbL 1.0",
        license_url="https://opendatacommons.org/licenses/odbl/1-0/",
        retrieved_at=now_iso(),
        resolution="vector footprints and centrelines",
        notes="© OpenStreetMap contributors",
    )
    upsert_dataset(
        conn,
        source_key="osm",
        product="pilot buildings, roads and street furniture",
        path=str(buildings_path),
        crs="EPSG:4326",
        bbox=json.dumps(bbox),
        retrieved_at=now_iso(),
        notes=f"{len(buildings)} buildings, {len(roads)} road segments, {len(props)} nodes",
    )
    conn.close()

    return {
        "raw": raw_path,
        "buildings": buildings_path,
        "roads": roads_path,
        "props": props_path,
    }
