"""Assemble the runtime city payload: buildings, streets, terrain, props."""

from __future__ import annotations

import json
import math
import shutil
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import rasterio
from shapely.geometry import Polygon

from ..config import PROCESSED_DIR, RAW_DIR, WEB_DATA_DIR, AppConfig
from ..geo import GeoContext, facade_sides

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


def _sample_grid(
    dtm_path: Path,
    ctx: GeoContext,
    bbox_local: tuple[float, float, float, float],
    nx: int,
    nz: int,
) -> dict:
    """Resample the DTM onto the local runtime grid in one windowed read."""

    minx, minz, maxx, maxz = bbox_local
    width = maxx - minx
    depth = maxz - minz
    from rasterio.enums import Resampling
    from rasterio.windows import Window, from_bounds

    with rasterio.open(dtm_path) as dtm:
        origin_ground = float(next(dtm.sample([ctx.origin_metric]))[0])
        min_metric = ctx.local_to_metric(minx, minz)
        max_metric = ctx.local_to_metric(maxx, maxz)
        left = min(min_metric[0], max_metric[0])
        right = max(min_metric[0], max_metric[0])
        bottom = min(min_metric[1], max_metric[1])
        top = max(min_metric[1], max_metric[1])
        window = from_bounds(left, bottom, right, top, dtm.transform)
        window = window.intersection(Window(0, 0, dtm.width, dtm.height))
        data = dtm.read(
            1,
            window=window,
            out_shape=(nz + 1, nx + 1),
            resampling=Resampling.bilinear,
        )
        data = data.astype("float32")
    heights = [
        round(float(value) - origin_ground, 2) if np.isfinite(value) else None
        for value in data.ravel()
    ]
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


def _stats(descriptors: dict, chunks: dict[str, list[dict]] | None = None) -> dict:
    buildings = descriptors["buildings"]
    height_sources: dict[str, int] = {}
    tiers: dict[str, int] = {}
    archetypes: dict[str, int] = {}
    roof_shapes: dict[str, int] = {}
    districts: dict[str, int] = {}
    for building in buildings:
        source = building.get("height_source") or "unknown"
        height_sources[source] = height_sources.get(source, 0) + 1
        tier = building.get("tier") or "C"
        tiers[tier] = tiers.get(tier, 0) + 1
        archetype = building.get("archetype") or "generic"
        archetypes[archetype] = archetypes.get(archetype, 0) + 1
        shape = (building.get("roof") or {}).get("shape") or "unknown"
        roof_shapes[shape] = roof_shapes.get(shape, 0) + 1
        district = building.get("district_id") or "unknown"
        districts[district] = districts.get(district, 0) + 1
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
        "districts": districts,
        "detail_chunks": len(chunks or {}),
        "height_confidence_median": round(
            float(np.median([item.get("height_confidence") or 0 for item in buildings])), 2
        )
        if buildings
        else 0.0,
    }


def _massing_sides(building: dict) -> list[dict]:
    sides = building.get("sides") or []
    if not sides:
        poly = Polygon(building["footprint"], building.get("holes") or [])
        if not poly.is_valid:
            poly = poly.buffer(0)
        sides = facade_sides(poly) if not poly.is_empty else []
    result: list[dict] = []
    for side in sides:
        result.append(
            {
                "index": side.get("index", 0),
                "p1": side["p1"],
                "p2": side["p2"],
                "length_m": side["length_m"],
                "bearing_deg": side.get("bearing_deg", 0.0),
                "facing_deg": side.get("facing_deg", 0.0),
                "normal": side["normal"],
                "street_facing": bool(side.get("street_facing")),
                "road_name": side.get("road_name"),
                "road_class": side.get("road_class"),
                "main_facade": bool(side.get("main_facade")),
            }
        )
    return result


def _massing_record(building: dict, chunk_key: str | None) -> dict:
    return {
        "id": building.get("id") or building["osm_id"],
        "osm_id": building["osm_id"],
        "detail": building.get("detail") or "pilot",
        "district_id": building.get("district_id"),
        "chunk": chunk_key,
        "name": building.get("name"),
        "landmark": bool(building.get("landmark")),
        "tier": building.get("tier"),
        "archetype": building.get("archetype"),
        "style_label": building.get("style_label"),
        "category": building.get("category"),
        "tags": building.get("tags") or {},
        "centroid_local": building["centroid_local"],
        "centroid_lonlat": building["centroid_lonlat"],
        "footprint": building["footprint"],
        "holes": building.get("holes") or [],
        "min_rect": building["min_rect"],
        "area_m2": building.get("area_m2"),
        "base_elevation_m": building.get("base_elevation_m"),
        "base_y": building.get("base_y", 0.0),
        "height_m": building.get("height_m", 8.0),
        "eave_height_m": building.get("eave_height_m", 7.0),
        "roof_height_m": building.get("roof_height_m", 0.8),
        "floors": building.get("floors", 2),
        "ground_floor_height_m": building.get("ground_floor_height_m", 4.0),
        "upper_floor_height_m": building.get("upper_floor_height_m", 3.2),
        "roof": building.get("roof")
        or {
            "shape": "flat",
            "pitch_deg": 0,
            "overhang_m": 0.3,
            "colour": "#9a5b45",
            "material": "tiles",
            "ridge_deg": 0,
            "confidence": 0.2,
        },
        "facade": building.get("facade")
        or {
            "primary": "#cdb794",
            "secondary": [],
            "material": "plaster",
            "roughness": 0.9,
            "metalness": 0.0,
        },
        "sides": _massing_sides(building),
        "window_count": building.get("window_count", 0),
        "balcony_count": building.get("balcony_count", 0),
        "height_source": building.get("height_source"),
        "height_confidence": building.get("height_confidence"),
        "archetype_confidence": building.get("archetype_confidence"),
        "geometry_confidence": building.get("geometry_confidence", 0.9),
        "texture_confidence": building.get("texture_confidence", 0.0),
        "evidence": [],
        "procedural_flags": ["lod1_massing"],
        "provenance": building.get("provenance")
        or {
            "footprint": "OpenStreetMap (ODbL 1.0)",
            "height": building.get("height_source"),
            "roof": "DSM 2008 + RER 2023-24 orthophoto/NIR",
            "facade": "not loaded; LOD3 descriptors are in detail chunks",
        },
        "notes": (
            "Massing LOD1 used for far chunks; full LOD3 descriptors are loaded "
            f"from {chunk_key} when the player approaches."
            if building.get("detail") == "pilot"
            else "Context building outside the detailed pilot; LOD1 massing only."
        ),
    }


def _chunk_key(x: float, z: float, size: float) -> str:
    return f"{math.floor(x / size)}_{math.floor(z / size)}"


def _chunk_bbox(buildings: list[dict]) -> list[float]:
    min_x = min(building["centroid_local"][0] for building in buildings)
    min_z = min(building["centroid_local"][1] for building in buildings)
    max_x = max(building["centroid_local"][0] for building in buildings)
    max_z = max(building["centroid_local"][1] for building in buildings)
    return [round(min_x, 2), round(min_z, 2), round(max_x, 2), round(max_z, 2)]


def _districts_payload(config: AppConfig, ctx: GeoContext) -> list[dict]:
    result = []
    for district in config.districts:
        x, z = ctx.lonlat_to_local(float(district["lon"]), float(district["lat"]))
        result.append(
            {
                "id": district["id"],
                "name": district["name"],
                "color": district.get("color", "#8a7f6a"),
                "description": district.get("description", ""),
                "lon": float(district["lon"]),
                "lat": float(district["lat"]),
                "local": [round(x, 2), round(z, 2)],
            }
        )
    return result


def _landmarks_payload(
    config: AppConfig, ctx: GeoContext, buildings: list[dict]
) -> list[dict]:
    by_name: list[dict] = []
    for landmark in config.landmarks:
        name = (landmark.get("name") or "").lower()
        keywords = [word for word in name.replace("-", " ").split() if len(word) > 4]
        match = None
        for building in buildings:
            candidate = (building.get("name") or "").lower()
            if not candidate:
                continue
            if candidate in name or name in candidate or any(
                word in candidate for word in keywords[:2]
            ):
                match = building
                break
        if match is None:
            lon, lat = float(landmark["lon"]), float(landmark["lat"])
            x, z = ctx.lonlat_to_local(lon, lat)
            nearest = min(
                buildings,
                key=lambda item: math.hypot(
                    item["centroid_local"][0] - x, item["centroid_local"][1] - z
                ),
                default=None,
            )
            if nearest and math.hypot(
                nearest["centroid_local"][0] - x, nearest["centroid_local"][1] - z
            ) <= 80:
                match = nearest
        if match is None:
            continue
        match["landmark"] = True
        by_name.append(
            {
                "id": landmark.get("kind", "landmark") + ":" + str(match["osm_id"]),
                "name": landmark["name"],
                "kind": landmark.get("kind", "landmark"),
                "osm_id": match["osm_id"],
                "local": match["centroid_local"],
                "lon": match["centroid_lonlat"][0],
                "lat": match["centroid_lonlat"][1],
                "height_m": match.get("height_m"),
                "tier": match.get("tier"),
                "archetype": match.get("archetype"),
            }
        )
    seen = {item["osm_id"] for item in by_name}
    for building in buildings:
        if not building.get("landmark") or building["osm_id"] in seen:
            continue
        by_name.append(
            {
                "id": "landmark:" + str(building["osm_id"]),
                "name": building.get("name") or building.get("style_label") or building["osm_id"],
                "kind": building.get("archetype") or "landmark",
                "osm_id": building["osm_id"],
                "local": building["centroid_local"],
                "lon": building["centroid_lonlat"][0],
                "lat": building["centroid_lonlat"][1],
                "height_m": building.get("height_m"),
                "tier": building.get("tier"),
                "archetype": building.get("archetype"),
            }
        )
        seen.add(building["osm_id"])
    return by_name


def _chunk_bounds(key: str, size: float) -> list[float]:
    ix, iz = (int(part) for part in key.split("_"))
    return [
        round(ix * size, 2),
        round(iz * size, 2),
        round((ix + 1) * size, 2),
        round((iz + 1) * size, 2),
    ]


def _write_json(path: Path, payload: dict | list) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    path.write_text(text, encoding="utf-8")
    return len(text.encode("utf-8"))


def _licenses() -> list[dict]:
    return [
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
            "source": "Regione Emilia-Romagna — DBTR Unità volumetrica (WMS)",
            "license": "CC BY 4.0",
            "url": "https://geoportale.regione.emilia-romagna.it/catalogo/dati-cartografici/cartografia-di-base/database-topografico-regionale",
            "attribution": "Regione Emilia-Romagna — Database Topografico Regionale",
        },
        {
            "source": "Wikimedia Commons",
            "license": "per-file (CC BY / CC BY-SA / public domain)",
            "url": "https://commons.wikimedia.org/wiki/Commons:Licensing",
            "attribution": "see docs/LICENSES.md",
        },
    ]


def _limits() -> list[str]:
    return [
        "No street-level imagery is available for Fidenza in the public KartaView endpoint.",
        "Generic facades are procedurally invented and flagged; they are not photographic reconstructions.",
        "Heights use DSM 2008 minus DTM 2023-24: cross-epoch uncertainty is explicit.",
        "Landmark facade colours and details are approximate unless a Commons reference is cited.",
        "LOD3 descriptors are streamed by 120 m chunk; far chunks use the LOD1 massing payload.",
    ]


def build(config: AppConfig, force: bool = False) -> dict:
    """Write the chunked runtime payload.

    Layout under data/processed/city/:
      manifest.json              tiny index: meta, stats, chunk table
      world.json                 terrain, ground, roads, plazas, props
      massing.json               LOD1 massing for every building
      detail/chunk_<x>_<z>.json  full LOD3 descriptors for pilot chunks
      landmarks.json             landmark markers
    A compact city.json remains as a single-file fallback.
    """

    out_dir = PROCESSED_DIR / "city"
    manifest_path = out_dir / "manifest.json"
    if manifest_path.exists() and not force:
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    descriptors = json.loads((PROCESSED_DIR / "descriptors.json").read_text(encoding="utf-8"))
    base = json.loads((PROCESSED_DIR / "buildings_base.json").read_text(encoding="utf-8"))

    ctx = GeoContext(config.origin[0], config.origin[1], config.crs_metric)
    bbox_local = ctx.bbox_local(config.context_bbox)
    pilot_bbox_local = ctx.bbox_local(config.pilot_bbox)
    dtm_path = RAW_DIR / "rer" / "dtm_rer2023_24.tif"
    span_x = bbox_local[2] - bbox_local[0]
    span_z = bbox_local[3] - bbox_local[1]
    nx = max(120, math.ceil(span_x / 15.0))
    nz = max(110, math.ceil(span_z / 15.0))
    print(f"sampling terrain {nx + 1}x{nz + 1} from DTM")
    terrain = _sample_grid(dtm_path, ctx, bbox_local, nx=nx, nz=nz)
    sampler = _terrain_sampler(terrain)
    print(f"building world geometry: {len(base['roads'])} road records, {len(base['props'])} props")
    roads, plazas = _roads(config, base, sampler)
    props = _props(config, base, sampler)

    origin_ground = terrain["origin_ground_elevation_m"]
    for building in descriptors["buildings"]:
        base_elevation = building.get("base_elevation_m")
        if base_elevation is None:
            x, z = building["centroid_local"]
            building["base_y"] = round(sampler(x, z), 2)
        else:
            building["base_y"] = round(float(base_elevation) - origin_ground, 2)

    ground_meta = json.loads((PROCESSED_DIR / "ground" / "ground.json").read_text(encoding="utf-8"))
    landmarks = _landmarks_payload(config, ctx, descriptors["buildings"])

    chunk_size = config.chunk_size_m
    parent_size = config.parent_chunk_size_m
    chunks: dict[str, list[dict]] = {}
    for building in descriptors["buildings"]:
        x, z = building["centroid_local"]
        building["parent_chunk"] = _chunk_key(x, z, parent_size)
        if building.get("detail") == "pilot":
            key = _chunk_key(x, z, chunk_size)
            building["chunk"] = key
            chunks.setdefault(key, []).append(building)
        else:
            building["chunk"] = None

    stats = _stats(descriptors, chunks)
    generated_at = datetime.now(UTC).replace(microsecond=0).isoformat()
    kartaview = {}
    kartaview_path = RAW_DIR / "kartaview" / "coverage.json"
    if kartaview_path.exists():
        kartaview = json.loads(kartaview_path.read_text(encoding="utf-8"))
    commons_path = RAW_DIR / "commons" / "commons.json"
    commons = json.loads(commons_path.read_text(encoding="utf-8")) if commons_path.exists() else {}

    meta = {
        "city": config.city["city"],
        "country": config.city["country"],
        "pilot": config.city["pilot"]["name"],
        "generated_at": generated_at,
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
        "chunk_size_m": chunk_size,
        "parent_chunk_size_m": parent_size,
        "detail_radius_m": config.detail_radius_m,
        "max_detail_chunks": config.max_detail_chunks,
    }
    coverage = {
        "street_level": {
            "source": "KartaView",
            "photo_count": kartaview.get("photos_inside_bbox", 0),
            "photo_count_nearby": kartaview.get("photo_count", 0),
            "points_with_photos": kartaview.get(
                "points_with_photos_inside_bbox", 0
            ),
            "available": bool(kartaview.get("photos_inside_bbox", 0)),
        },
        "reference_photos": {
            "source": "Wikimedia Commons",
            "file_count": commons.get("file_count", 0),
        },
    }

    parents: dict[str, dict] = {}
    chunk_entries: dict[str, dict] = {}
    for key in sorted(chunks):
        items = chunks[key]
        parent = _chunk_key(
            items[0]["centroid_local"][0], items[0]["centroid_local"][1], parent_size
        )
        relative_url = f"detail/chunk_{key}.json"
        payload = {
            "key": key,
            "parent": parent,
            "size_m": chunk_size,
            "bbox_local": _chunk_bounds(key, chunk_size),
            "buildings": items,
        }
        _write_json(out_dir / relative_url, payload)
        entry = {
            "key": key,
            "url": relative_url,
            "parent": parent,
            "bbox_local": payload["bbox_local"],
            "count": len(items),
        }
        chunk_entries[key] = entry
        parents.setdefault(
            parent,
            {
                "key": parent,
                "bbox_local": _chunk_bounds(parent, parent_size),
                "chunks": [],
            },
        )["chunks"].append(key)

    massing = [_massing_record(building, building.get("chunk")) for building in descriptors["buildings"]]
    world = {
        "terrain": terrain,
        "ground": {**ground_meta, "bbox_local": [round(value, 2) for value in bbox_local]},
        "roads": roads,
        "plazas": plazas,
        "props": props,
    }
    _write_json(out_dir / "world.json", world)
    _write_json(out_dir / "massing.json", {"buildings": massing})
    _write_json(out_dir / "landmarks.json", {"landmarks": landmarks})

    manifest = {
        "meta": meta,
        "stats": stats,
        "districts": _districts_payload(config, ctx),
        "files": {
            "world": "world.json",
            "massing": "massing.json",
            "landmarks": "landmarks.json",
            "detail_dir": "detail",
            "fallback": "city.json",
        },
        "chunks": chunk_entries,
        "parents": parents,
        "coverage": coverage,
        "licenses": _licenses(),
        "limits": _limits(),
    }
    _write_json(manifest_path, manifest)

    fallback = {
        "meta": meta,
        "terrain": terrain,
        "ground": world["ground"],
        "buildings": massing,
        "roads": roads,
        "plazas": plazas,
        "props": props,
        "stats": stats,
        "coverage": coverage,
        "licenses": manifest["licenses"],
        "limits": manifest["limits"],
    }
    _write_json(PROCESSED_DIR / "city.json", fallback)

    WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)
    for name in ("manifest.json", "world.json", "massing.json", "landmarks.json"):
        shutil.copy2(out_dir / name, WEB_DATA_DIR / name)
    shutil.copy2(PROCESSED_DIR / "city.json", WEB_DATA_DIR / "city.json")
    detail_target = WEB_DATA_DIR / "detail"
    if detail_target.exists():
        shutil.rmtree(detail_target)
    shutil.copytree(out_dir / "detail", detail_target)
    ground_source = PROCESSED_DIR / "ground" / "ortho.jpg"
    if ground_source.exists():
        shutil.copy2(ground_source, WEB_DATA_DIR / "ortho.jpg")

    detail_bytes = sum(
        path.stat().st_size for path in (out_dir / "detail").glob("*.json")
    )
    print(
        f"generated {len(massing)} buildings, {len(chunk_entries)} detail chunks "
        f"({detail_bytes / 1e6:.1f} MB detail, "
        f"{(manifest_path.stat().st_size + (out_dir / 'massing.json').stat().st_size) / 1e6:.1f} MB index+massing)"
    )
    return manifest
