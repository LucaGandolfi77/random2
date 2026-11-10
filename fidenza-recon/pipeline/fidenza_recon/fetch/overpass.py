"""OpenStreetMap acquisition via Overpass API."""

from __future__ import annotations

import json
import math
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


def _tile_bboxes(
    bbox: tuple[float, float, float, float],
    size_m: float,
    overlap_m: float,
) -> list[tuple[float, float, float, float]]:
    """Split a WGS84 bbox into a grid of approximately square tiles."""

    minlon, minlat, maxlon, maxlat = bbox
    lat0 = (minlat + maxlat) / 2.0
    width_m = max(1.0, (maxlon - minlon) * 111_320.0 * math.cos(math.radians(lat0)))
    height_m = max(1.0, (maxlat - minlat) * 110_540.0)
    nx = max(1, math.ceil(width_m / max(200.0, size_m)))
    nz = max(1, math.ceil(height_m / max(200.0, size_m)))
    lon_step = (maxlon - minlon) / nx
    lat_step = (maxlat - minlat) / nz
    lon_overlap = overlap_m / (111_320.0 * math.cos(math.radians(lat0)))
    lat_overlap = overlap_m / 110_540.0
    tiles: list[tuple[float, float, float, float]] = []
    for iz in range(nz):
        for ix in range(nx):
            tiles.append(
                (
                    max(minlon, minlon + ix * lon_step - lon_overlap),
                    max(minlat, minlat + iz * lat_step - lat_overlap),
                    min(maxlon, minlon + (ix + 1) * lon_step + lon_overlap),
                    min(maxlat, minlat + (iz + 1) * lat_step + lat_overlap),
                )
            )
    return tiles


def _bbox_key(bbox: tuple[float, float, float, float]) -> str:
    import hashlib

    return hashlib.sha1(
        ",".join(f"{value:.7f}" for value in bbox).encode()
    ).hexdigest()[:12]


def _fetch_tile(
    bbox: tuple[float, float, float, float],
    cache_dir: Path,
    force: bool,
    depth: int = 0,
) -> list[dict[str, Any]]:
    cache_path = cache_dir / f"tile_{_bbox_key(bbox)}.json"
    if cache_path.exists() and not force:
        payload = json.loads(cache_path.read_text(encoding="utf-8"))
        return list(payload.get("elements") or [])

    bbox_str = f"{bbox[1]:.6f},{bbox[0]:.6f},{bbox[3]:.6f},{bbox[2]:.6f}"
    query = QUERY_TEMPLATE.format(bbox=bbox_str, timeout=150)
    try:
        payload = _download(query, timeout_s=210)
        elements = list(payload.get("elements") or [])
        cache_path.write_text(
            json.dumps({"elements": elements}, ensure_ascii=False), encoding="utf-8"
        )
        return elements
    except Exception as exc:  # noqa: BLE001 - split and retry smaller tiles
        if depth >= 2:
            raise RuntimeError(f"Overpass tile failed after splitting: {bbox}: {exc}") from exc
        minlon, minlat, maxlon, maxlat = bbox
        midlon = (minlon + maxlon) / 2.0
        midlat = (minlat + maxlat) / 2.0
        children = [
            (minlon, minlat, midlon, midlat),
            (midlon, minlat, maxlon, midlat),
            (minlon, midlat, midlon, maxlat),
            (midlon, midlat, maxlon, maxlat),
        ]
        print(
            f"  overpass tile failed, splitting into {len(children)} sub-tiles",
            flush=True,
        )
        elements: list[dict[str, Any]] = []
        for child in children:
            elements.extend(_fetch_tile(child, cache_dir, force, depth + 1))
        return elements


def fetch(config: AppConfig, force: bool = False) -> dict[str, Path]:
    ensure_dirs()
    bbox = config.context_bbox
    out_dir = RAW_DIR / "osm"
    out_dir.mkdir(parents=True, exist_ok=True)
    cache_dir = out_dir / "tiles"
    cache_dir.mkdir(parents=True, exist_ok=True)
    raw_path = out_dir / "osm_raw.json"
    buildings_path = out_dir / "buildings.geojson"
    roads_path = out_dir / "roads.geojson"
    props_path = out_dir / "props.geojson"

    if raw_path.exists() and not force:
        payload = json.loads(raw_path.read_text(encoding="utf-8"))
    else:
        tiling = config.tiling
        tiles = _tile_bboxes(
            bbox,
            float(tiling.get("osm_tile_size_m", 2000)),
            float(tiling.get("osm_tile_overlap_m", 150)),
        )
        print(f"fetching OSM in {len(tiles)} tiles", flush=True)
        combined: dict[tuple[str, int], dict[str, Any]] = {}
        for index, tile in enumerate(tiles, start=1):
            print(f"  OSM tile {index}/{len(tiles)} {tile}", flush=True)
            for element in _fetch_tile(tile, cache_dir, force):
                osm_type = str(element.get("type") or "")
                osm_id = int(element.get("id") or 0)
                if not osm_type or not osm_id:
                    continue
                combined.setdefault((osm_type, osm_id), element)
        payload = {"elements": list(combined.values())}
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
