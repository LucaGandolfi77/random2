"""Assemble the runtime city payload: buildings, streets, terrain, props."""

from __future__ import annotations

import json
import math
import shutil
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import rasterio

from ..config import PROCESSED_DIR, RAW_DIR, WEB_DATA_DIR, AppConfig
from ..geo import GeoContext

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
ROAD_SURFACE = {
    "primary": "asphalt",
    "primary_link": "asphalt",
    "secondary": "asphalt",
    "secondary_link": "asphalt",
    "tertiary": "asphalt",
    "tertiary_link": "asphalt",
    "residential": "asphalt",
    "unclassified": "asphalt",
    "service": "asphalt",
    "living_street": "asphalt",
    "pedestrian": "paving",
    "footway": "paving",
    "cycleway": "asphalt",
    "path": "gravel",
    "steps": "stone",
}


def _parse_float(value: object) -> float | None:
    if value is None:
        return None
    try:
        return float(str(value).replace(",", ".").split(";")[0])
    except (TypeError, ValueError):
        return None


def _road_width(config: AppConfig, road: dict) -> float:
    width = _parse_float(road.get("width"))
    if width and 1.0 <= width <= 40.0:
        return width
    lanes = _parse_float(road.get("lanes"))
    if lanes and 1 <= lanes <= 8:
        return lanes * 3.0 + 1.0
    defaults = config.city.get("road_width_defaults_m", {})
    return float(defaults.get(road.get("highway"), 6.0))


def _sample_grid(dtm_path: Path, ctx: GeoContext, bbox_local: tuple[float, float, float, float], nx: int, nz: int) -> dict:
    minx, minz, maxx, maxz = bbox_local
    width = maxx - minx
    depth = maxz - minz
    heights: list[float | None] = []
    with rasterio.open(dtm_path) as dtm:
        origin_ground = float(next(dtm.sample([ctx.origin_metric]))[0])
        for iz in range(nz + 1):
            for ix in range(nx + 1):
                x = minx + width * ix / nx
                z = minz + depth * iz / nz
                mx, my = ctx.local_to_metric(x, z)
                value = next(dtm.sample([(mx, my)]))[0]
                heights.append(
                    round(float(value) - origin_ground, 2) if np.isfinite(value) else None
                )
    return {
        "nx": nx,
        "nz": nz,
        "bbox_local": [round(minx, 2), round(minz, 2), round(maxx, 2), round(maxz, 2)],
        "width_m": round(width, 2),
        "depth_m": round(depth, 2),
        "origin_ground_elevation_m": round(origin_ground, 2),
        "heights": heights,
    }


def _terrain_sampler(terrain: dict):
    minx, minz, maxx, maxz = terrain["bbox_local"]
    nx, nz = terrain["nx"], terrain["nz"]
    width = maxx - minx
    depth = maxz - minz
    heights = terrain["heights"]

    def sample(x: float, z: float) -> float:
        gx = (x - minx) / width * nx if width else 0.0
        gz = (z - minz) / depth * nz if depth else 0.0
        ix = int(max(0, min(nx - 1, math.floor(gx))))
        iz = int(max(0, min(nz - 1, math.floor(gz))))
        fx = max(0.0, min(1.0, gx - ix))
        fz = max(0.0, min(1.0, gz - iz))
        def value(i: int, j: int) -> float:
            index = j * (nx + 1) + i
            return float(heights[index]) if heights[index] is not None else 0.0
        h00, h10 = value(ix, iz), value(ix + 1, iz)
        h01, h11 = value(ix, iz + 1), value(ix + 1, iz + 1)
        return (h00 * (1 - fx) + h10 * fx) * (1 - fz) + (h01 * (1 - fx) + h11 * fx) * fz

    return sample


def _roads(config: AppConfig, base: dict, terrain_sampler) -> tuple[list[dict], list[dict]]:
    roads = []
    plazas = []
    for road in base["roads"]:
        highway = road.get("highway")
        if highway not in WALKABLE | VEHICULAR:
            continue
        coords = road.get("coords") or []
        if len(coords) < 2:
            continue
        width = _road_width(config, road)
        sidewalk = road.get("sidewalk") not in {"no", "none", None, "separate"}
        built = []
        for x, z in coords:
            built.append([round(x, 3), round(terrain_sampler(x, z) + 0.02, 3), round(z, 3)])
        is_area = road.get("area") == "yes" and len(coords) >= 4 and coords[0] == coords[-1]
        if is_area:
            plazas.append(
                {
                    "osm_id": road["osm_id"],
                    "name": road.get("name"),
                    "kind": highway,
                    "ring": built,
                    "surface": ROAD_SURFACE.get(highway, "paving"),
                }
            )
            continue
        roads.append(
            {
                "osm_id": road["osm_id"],
                "name": road.get("name"),
                "kind": highway,
                "width_m": round(width, 2),
                "surface": ROAD_SURFACE.get(highway, "asphalt"),
                "sidewalk": bool(sidewalk and highway in VEHICULAR),
                "oneway": road.get("oneway") in {"yes", "true", "1", "-1"},
                "points": built,
                "markings": highway in {"primary", "secondary", "tertiary"},
            }
        )
    return roads, plazas


def _props(config: AppConfig, base: dict, terrain_sampler) -> list[dict]:
    props = []
    for prop in base["props"]:
        x, z = prop["local"]
        kind = prop["kind"]
        rotation = 0.0
        if kind == "crossing":
            rotation = 0.0
        props.append(
            {
                "osm_id": prop["osm_id"],
                "kind": kind,
                "name": prop.get("name"),
                "x": round(x, 3),
                "y": round(terrain_sampler(x, z), 3),
                "z": round(z, 3),
                "rotation": rotation,
                "tags": {
                    key: value
                    for key, value in (prop.get("tags") or {}).items()
                    if key in {"highway", "amenity", "natural", "barrier", "entrance", "shop", "name"}
                },
            }
        )
    return props


def _stats(descriptors: dict, heights: dict, classification: dict, roofs: dict) -> dict:
    buildings = descriptors["buildings"]
    height_sources: dict[str, int] = {}
    tiers: dict[str, int] = {}
    archetypes: dict[str, int] = {}
    roof_shapes: dict[str, int] = {}
    for building in buildings:
        source = building.get("height_source") or "unknown"
        height_sources[source] = height_sources.get(source, 0) + 1
        tier = building.get("tier") or "C"
        tiers[tier] = tiers.get(tier, 0) + 1
        archetype = building.get("archetype") or "generic"
        archetypes[archetype] = archetypes.get(archetype, 0) + 1
        shape = (building.get("roof") or {}).get("shape") or "unknown"
        roof_shapes[shape] = roof_shapes.get(shape, 0) + 1
    return {
        "buildings": len(buildings),
        "pilot_buildings": sum(1 for item in buildings if item.get("detail") == "pilot"),
        "context_buildings": sum(1 for item in buildings if item.get("detail") == "context"),
        "windows": sum(item.get("window_count", 0) for item in buildings),
        "balconies": sum(item.get("balcony_count", 0) for item in buildings),
        "landmarks": sum(1 for item in buildings if item.get("landmark")),
        "height_sources": height_sources,
        "tiers": tiers,
        "archetypes": archetypes,
        "roof_shapes": roof_shapes,
        "height_confidence_median": round(
            float(np.median([item.get("height_confidence") or 0 for item in buildings])), 2
        )
        if buildings
        else 0.0,
    }


def build(config: AppConfig, force: bool = False) -> dict:
    out_path = PROCESSED_DIR / "city.json"
    if out_path.exists() and not force:
        return json.loads(out_path.read_text(encoding="utf-8"))

    descriptors = json.loads((PROCESSED_DIR / "descriptors.json").read_text(encoding="utf-8"))
    base = json.loads((PROCESSED_DIR / "buildings_base.json").read_text(encoding="utf-8"))
    heights = json.loads((PROCESSED_DIR / "heights.json").read_text(encoding="utf-8"))
    roofs = json.loads((PROCESSED_DIR / "roofs.json").read_text(encoding="utf-8"))
    classification = json.loads((PROCESSED_DIR / "classification.json").read_text(encoding="utf-8"))

    ctx = GeoContext(config.origin[0], config.origin[1], config.crs_metric)
    bbox_local = ctx.bbox_local(config.context_bbox)
    pilot_bbox_local = ctx.bbox_local(config.pilot_bbox)
    dtm_path = RAW_DIR / "rer" / "dtm_rer2023_24.tif"
    terrain = _sample_grid(dtm_path, ctx, bbox_local, nx=80, nz=72)
    sampler = _terrain_sampler(terrain)
    roads, plazas = _roads(config, base, sampler)
    props = _props(config, base, sampler)

    for building in descriptors["buildings"]:
        base_elevation = building.get("base_elevation_m")
        origin_ground = terrain["origin_ground_elevation_m"]
        if base_elevation is None:
            x, z = building["centroid_local"]
            building["base_y"] = round(sampler(x, z), 2)
        else:
            building["base_y"] = round(float(base_elevation) - origin_ground, 2)

    ground_meta = json.loads((PROCESSED_DIR / "ground" / "ground.json").read_text(encoding="utf-8"))
    stats = _stats(descriptors, heights, classification, roofs)

    kartaview = {}
    kartaview_path = RAW_DIR / "kartaview" / "coverage.json"
    if kartaview_path.exists():
        kartaview = json.loads(kartaview_path.read_text(encoding="utf-8"))
    commons_path = RAW_DIR / "commons" / "commons.json"
    commons = json.loads(commons_path.read_text(encoding="utf-8")) if commons_path.exists() else {}

    payload = {
        "meta": {
            "city": config.city["city"],
            "country": config.city["country"],
            "pilot": config.city["pilot"]["name"],
            "generated_at": datetime.now(UTC).replace(microsecond=0).isoformat(),
            "origin": {
                "name": config.city["origin"]["name"],
                "lon": config.origin[0],
                "lat": config.origin[1],
            },
            "crs_metric": config.crs_metric,
            "bbox_wgs84": list(config.context_bbox),
            "pilot_bbox_wgs84": list(config.pilot_bbox),
            "bbox_local": [round(value, 2) for value in bbox_local],
            "pilot_bbox_local": [round(value, 2) for value in pilot_bbox_local],
            "origin_ground_elevation_m": terrain["origin_ground_elevation_m"],
            "lod_distances_m": config.city["rendering"]["lod_distances_m"],
        },
        "terrain": terrain,
        "ground": {
            **ground_meta,
            "bbox_local": [round(value, 2) for value in bbox_local],
        },
        "buildings": descriptors["buildings"],
        "roads": roads,
        "plazas": plazas,
        "props": props,
        "stats": stats,
        "coverage": {
            "street_level": {
                "source": "KartaView",
                "photo_count": kartaview.get("photo_count", 0),
                "points_with_photos": kartaview.get("points_with_photos", 0),
                "available": bool(kartaview.get("photo_count")),
            },
            "reference_photos": {
                "source": "Wikimedia Commons",
                "file_count": commons.get("file_count", 0),
            },
        },
        "licenses": [
            {
                "source": "OpenStreetMap",
                "license": "ODbL 1.0",
                "url": "https://opendatacommons.org/licenses/odbl/1-0/",
                "attribution": "© OpenStreetMap contributors",
            },
            {
                "source": "Regione Emilia-Romagna — Ortofoto/DTM RER 2023-24",
                "license": "CC BY 4.0",
                "url": "https://creativecommons.org/licenses/by/4.0/",
                "attribution": "Regione Emilia-Romagna",
            },
            {
                "source": "Regione Emilia-Romagna — DSM AGEA 2008 (public ArcGIS service)",
                "license": "RER public service — verify before redistribution",
                "url": "https://geoportale.regione.emilia-romagna.it/",
                "attribution": "Regione Emilia-Romagna / AGEA 2008",
            },
            {
                "source": "Wikimedia Commons",
                "license": "per-file (CC BY / CC BY-SA / public domain)",
                "url": "https://commons.wikimedia.org/wiki/Commons:Licensing",
                "attribution": "see docs/LICENSES.md",
            },
        ],
        "limits": [
            "No street-level imagery is available for Fidenza in the public KartaView endpoint.",
            "Generic facades are procedurally invented and flagged; they are not photographic reconstructions.",
            "Heights use DSM 2008 minus DTM 2023-24: cross-epoch uncertainty is explicit.",
            "Landmark facade colours and details are approximate unless a Commons reference is cited.",
        ],
    }

    out_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(out_path, WEB_DATA_DIR / "city.json")
    ground_source = PROCESSED_DIR / "ground" / "ortho.jpg"
    if ground_source.exists():
        shutil.copy2(ground_source, WEB_DATA_DIR / "ortho.jpg")
    return payload
