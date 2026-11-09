"""Normalise OSM footprints into local metric building records."""

from __future__ import annotations

import json
import math
from pathlib import Path

from shapely.geometry import LineString, MultiLineString, Point, Polygon, shape
from shapely.geometry import box as shapely_box
from shapely.prepared import prep

from ..config import PROCESSED_DIR, RAW_DIR, AppConfig
from ..geo import (
    GeoContext,
    centroid_local,
    facade_sides,
    geometry_to_local,
    geometry_to_metric,
    min_rotated_rect,
    polygon_rings,
)

SKIP_BUILDINGS = {"roof", "no", "construction", "ruins"}
WALKABLE = {"footway", "pedestrian", "path", "living_street", "steps", "cycleway"}
VEHICULAR = {
    "primary",
    "primary_link",
    "secondary",
    "secondary_link",
    "tertiary",
    "tertiary_link",
    "residential",
    "unclassified",
    "service",
    "living_street",
    "pedestrian",
    "track",
}


def _load_features(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload.get("features", [])


def _polygon_from_feature(feature: dict) -> Polygon | None:
    try:
        geom = shape(feature["geometry"])
    except Exception:
        return None
    if geom.geom_type == "MultiPolygon":
        geom = max(geom.geoms, key=lambda g: g.area)
    if geom.geom_type != "Polygon" or geom.is_empty:
        return None
    return geom


def _road_index(roads_path: Path, ctx: GeoContext) -> list[dict]:
    records: list[dict] = []
    for feature in _load_features(roads_path):
        tags = feature.get("properties", {}).get("tags", {}) or {}
        highway = tags.get("highway")
        if highway not in WALKABLE | VEHICULAR:
            continue
        geometry = feature.get("geometry") or {}
        coords = geometry.get("coordinates") or []
        if len(coords) < 2:
            continue
        metric = LineString([ctx.lonlat_to_metric(lon, lat) for lon, lat in coords])
        local = LineString([ctx.lonlat_to_local(lon, lat) for lon, lat in coords])
        records.append(
            {
                "osm_id": feature["properties"]["osm_id"],
                "name": tags.get("name"),
                "highway": highway,
                "width": tags.get("width"),
                "sidewalk": tags.get("sidewalk"),
                "oneway": tags.get("oneway"),
                "surface": tags.get("surface"),
                "area": tags.get("area"),
                "tags": tags,
                "metric": metric,
                "local": local,
                "prepared": prep(metric),
            }
        )
    return records


def _street_context(
    side: dict, roads: list[dict], ctx: GeoContext
) -> tuple[bool, str | None, str | None, float | None]:
    p1 = tuple(side["p1"])
    p2 = tuple(side["p2"])
    mid_local = ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2)
    mid_metric = ctx.local_to_metric(*mid_local)
    best: tuple[float, dict] | None = None
    for road in roads:
        distance = road["metric"].distance(Point(mid_metric))
        if best is None or distance < best[0]:
            best = (distance, road)
    if best is None:
        return False, None, None, None
    distance, road = best
    try:
        width = float(str(road["width"]).replace(",", ".")) if road.get("width") else None
    except ValueError:
        width = None
    threshold = (width or 6.0) / 2.0 + 8.0
    street_facing = distance <= threshold
    return street_facing, road.get("name"), road.get("highway"), round(distance, 2)


def analyze(config: AppConfig, force: bool = False) -> dict:
    out_path = PROCESSED_DIR / "buildings_base.json"
    if out_path.exists() and not force:
        return json.loads(out_path.read_text(encoding="utf-8"))

    ctx = GeoContext(config.origin[0], config.origin[1], config.crs_metric)
    pilot_local = ctx.bbox_local(config.pilot_bbox)
    context_local = ctx.bbox_local(config.context_bbox)
    buildings_features = _load_features(RAW_DIR / "osm" / "buildings.geojson")
    roads = _road_index(RAW_DIR / "osm" / "roads.geojson", ctx)
    props = json.loads((RAW_DIR / "osm" / "props.geojson").read_text(encoding="utf-8"))

    records: list[dict] = []
    skipped: list[dict] = []
    for feature in buildings_features:
        tags = feature.get("properties", {}).get("tags", {}) or {}
        building_type = tags.get("building")
        if building_type in SKIP_BUILDINGS:
            skipped.append({"osm_id": feature["properties"]["osm_id"], "building": building_type})
            continue
        metric = _polygon_from_feature(feature)
        if metric is None:
            continue
        local = geometry_to_local(metric, ctx)
        local_metric = geometry_to_metric(shape(feature["geometry"]), ctx)
        if isinstance(local_metric, Polygon) is False:
            continue
        if not local.is_valid:
            local = local.buffer(0)
        if local.is_empty or local.area < 4.0:
            continue
        outer, holes = polygon_rings(local)
        sides = facade_sides(local)
        for side in sides:
            street, road_name, road_class, distance = _street_context(side, roads, ctx)
            side["street_facing"] = street
            side["road_name"] = road_name
            side["road_class"] = road_class
            side["distance_to_road_m"] = distance

        centroid = centroid_local(local)
        lonlat = ctx.local_to_lonlat(*centroid)
        in_pilot = (
            pilot_local[0] <= centroid[0] <= pilot_local[2]
            and pilot_local[1] <= centroid[1] <= pilot_local[3]
        )
        rect = min_rotated_rect(local)
        area = float(local.area)
        perimeter = float(local.length)
        compactness = (4 * math.pi * area) / (perimeter * perimeter) if perimeter else 0.0
        records.append(
            {
                "osm_id": feature["properties"]["osm_id"],
                "osm_type": feature["properties"].get("osm_type"),
                "detail": "pilot" if in_pilot else "context",
                "name": tags.get("name"),
                "tags": tags,
                "building": building_type,
                "ring": [[round(x, 3), round(z, 3)] for x, z in outer],
                "holes": [
                    [[round(x, 3), round(z, 3)] for x, z in hole] for hole in holes
                ],
                "metric_ring": [[round(x, 3), round(y, 3)] for x, y in local_metric.exterior.coords],
                "metric_holes": [
                    [[round(x, 3), round(y, 3)] for x, y in ring.coords]
                    for ring in local_metric.interiors
                ],
                "area_m2": round(area, 2),
                "perimeter_m": round(perimeter, 2),
                "compactness": round(compactness, 3),
                "orientation_deg": rect["angle_deg"],
                "min_rect": rect,
                "centroid_local": [round(centroid[0], 3), round(centroid[1], 3)],
                "centroid_lonlat": [round(lonlat[0], 7), round(lonlat[1], 7)],
                "sides": sides,
                "address": {
                    "street": tags.get("addr:street"),
                    "housenumber": tags.get("addr:housenumber"),
                },
                "amenities": [
                    key
                    for key in ("shop", "amenity", "office", "craft", "tourism", "leisure")
                    if key in tags
                ],
            }
        )

    clip_box = shapely_box(
        context_local[0] - 30,
        context_local[1] - 30,
        context_local[2] + 30,
        context_local[3] + 30,
    )
    roads_local = []
    for road in roads:
        clipped = road["local"].intersection(clip_box)
        if clipped.is_empty:
            continue
        if isinstance(clipped, MultiLineString):
            clipped = max(clipped.geoms, key=lambda line: line.length)
        if not isinstance(clipped, LineString) or clipped.length < 1.0:
            continue
        roads_local.append(
            {
                "osm_id": road["osm_id"],
                "name": road["name"],
                "highway": road["highway"],
                "width": road["width"],
                "lanes": (road.get("tags") or {}).get("lanes"),
                "sidewalk": road["sidewalk"],
                "oneway": road["oneway"],
                "surface": road["surface"],
                "area": road["area"],
                "coords": [[round(x, 3), round(z, 3)] for x, z in clipped.coords],
            }
        )
    props_local: list[dict] = []
    for feature in props.get("features", []):
        coords = (feature.get("geometry") or {}).get("coordinates") or []
        if len(coords) < 2:
            continue
        x, z = ctx.lonlat_to_local(coords[0], coords[1])
        if not (
            context_local[0] - 20 <= x <= context_local[2] + 20
            and context_local[1] - 20 <= z <= context_local[3] + 20
        ):
            continue
        props_local.append(
            {
                "osm_id": feature["properties"]["osm_id"],
                "kind": feature["properties"]["kind"],
                "tags": feature["properties"].get("tags", {}),
                "name": feature["properties"].get("name"),
                "local": [round(x, 3), round(z, 3)],
            }
        )

    payload = {
        "buildings": records,
        "skipped": skipped,
        "roads": roads_local,
        "props": props_local,
        "counts": {
            "buildings": len(records),
            "pilot": sum(1 for record in records if record["detail"] == "pilot"),
            "context": sum(1 for record in records if record["detail"] == "context"),
            "skipped": len(skipped),
            "roads": len(roads_local),
            "props": len(props_local),
        },
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return payload
