"""Cross-check OSM footprints against the 2008 built-up surface.

This is not a building detector: it highlights cells where the normalized DSM
is clearly above ground and NDVI excludes vegetation, but no OSM footprint is
present. Results are manual-review candidates, especially in industrial areas
and at the cross-epoch boundary (DSM 2008 vs OSM today).
"""

from __future__ import annotations

import json
import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image, ImageDraw, ImageFont
from rasterio import features
from shapely.geometry import Point, mapping, shape
from shapely.strtree import STRtree

from ..analyze import dbtr
from ..config import DOCS_DIR, PROCESSED_DIR, AppConfig
from ..geo import GeoContext

HEIGHT_THRESHOLD_M = 3.5
NDVI_THRESHOLD = 0.08
MIN_COMPONENT_AREA_M2 = 50.0
OSM_BUFFER_M = 2.0
DBTR_REVIEW_LIMIT = 40


def _district_centres(config: AppConfig, ctx: GeoContext) -> dict[str, tuple[float, float]]:
    return {
        district["id"]: ctx.lonlat_to_local(
            float(district["lon"]), float(district["lat"])
        )
        for district in config.districts
    }


def _district_for(
    point: tuple[float, float], centres: dict[str, tuple[float, float]]
) -> str:
    return min(
        centres,
        key=lambda key: (centres[key][0] - point[0]) ** 2
        + (centres[key][1] - point[1]) ** 2,
    )


def _load_buildings() -> list[dict]:
    return json.loads(
        (PROCESSED_DIR / "buildings_base.json").read_text(encoding="utf-8")
    ).get("buildings", [])


def _osm_mask(buildings: list[dict], transform, shape_hw: tuple[int, int]) -> np.ndarray:
    polygons = []
    for record in buildings:
        geometry = shape(
            {
                "type": "Polygon",
                "coordinates": [record["metric_ring"], *record["metric_holes"]],
            }
        )
        if not geometry.is_valid:
            geometry = geometry.buffer(0)
        if geometry.is_empty:
            continue
        polygons.append((mapping(geometry.buffer(OSM_BUFFER_M)), 1))
    if not polygons:
        return np.zeros(shape_hw, dtype=bool)
    return features.rasterize(
        polygons,
        out_shape=shape_hw,
        transform=transform,
        fill=0,
        dtype="uint8",
    ).astype(bool)


def _candidate_map(
    candidates: list[dict],
    ctx: GeoContext,
    config: AppConfig,
    path: Path,
) -> bool:
    ground = PROCESSED_DIR / "ground" / "ortho.jpg"
    meta_path = PROCESSED_DIR / "ground" / "ground.json"
    if not ground.exists() or not meta_path.exists():
        return False
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    bbox = meta["bbox_local"]
    image = Image.open(ground).convert("RGBA")
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    width, height = image.size

    def pixel(x: float, z: float) -> tuple[float, float]:
        return (
            (x - bbox[0]) / (bbox[2] - bbox[0]) * width,
            (z - bbox[1]) / (bbox[3] - bbox[1]) * height,
        )

    for candidate in candidates:
        if candidate["area_m2"] < 250:
            continue
        points = [pixel(x, z) for x, z in candidate["ring"]]
        if len(points) < 3:
            continue
        draw.polygon(points, fill=(220, 54, 38, 72), outline=(255, 92, 58, 220))

    image = Image.alpha_composite(image, overlay)
    draw = ImageDraw.Draw(image)
    centres = _district_centres(config, ctx)
    font = ImageFont.load_default()
    for district in config.districts:
        x, z = centres[district["id"]]
        px, py = pixel(x, z)
        draw.ellipse((px - 5, py - 5, px + 5, py + 5), fill=district.get("color", "#d9b46a"))
        draw.text((px + 8, py - 5), district["name"], fill="#fff5df", font=font)
    draw.rectangle((12, height - 42, 420, height - 10), fill=(10, 14, 16, 210))
    draw.text(
        (22, height - 34),
        "Rosso: candidati prioritari senza impronta OSM (DSM 2008, NDVI basso)",
        fill="#ffd7c8",
        font=font,
    )
    path.parent.mkdir(parents=True, exist_ok=True)
    if image.width > 1600:
        target_height = round(image.height * 1600 / image.width)
        image = image.resize((1600, target_height), Image.Resampling.LANCZOS)
    image.convert("RGB").save(path, quality=82, optimize=True)
    return True


def analyze(config: AppConfig) -> dict:
    ctx = GeoContext(config.origin[0], config.origin[1], config.crs_metric)
    buildings = _load_buildings()
    ndsm_path = PROCESSED_DIR / "ndsm.tif"
    ndvi_path = PROCESSED_DIR / "ndvi.tif"
    if not ndsm_path.exists() or not ndvi_path.exists():
        raise RuntimeError("nDSM/NDVI missing: run `analyze` first")

    with rasterio.open(ndsm_path) as source:
        ndsm = source.read(1)
        transform = source.transform
        shape_hw = (source.height, source.width)
    with rasterio.open(ndvi_path) as source:
        ndvi = source.read(1)
    built = (
        np.isfinite(ndsm)
        & np.isfinite(ndvi)
        & (ndsm > HEIGHT_THRESHOLD_M)
        & (ndsm < 80.0)
        & (ndvi < NDVI_THRESHOLD)
    )
    osm = _osm_mask(buildings, transform, shape_hw)
    uncovered = built & ~osm

    centres = _district_centres(config, ctx)
    tree = STRtree(
        [
            shape(
                {
                    "type": "Polygon",
                    "coordinates": [record["metric_ring"], *record["metric_holes"]],
                }
            )
            for record in buildings
        ]
    )
    candidates: list[dict] = []
    for geometry, value in features.shapes(
        uncovered.astype("uint8"), mask=uncovered, transform=transform
    ):
        if not value:
            continue
        polygon = shape(geometry)
        area = float(polygon.area)
        if area < MIN_COMPONENT_AREA_M2:
            continue
        centroid = polygon.centroid
        local = ctx.metric_to_local(centroid.x, centroid.y)
        index = int(tree.nearest(Point(centroid.x, centroid.y)))
        nearest = tree.geometries[index]
        compactness = (
            4.0 * math.pi * area / (polygon.length**2) if polygon.length else 0.0
        )
        candidates.append(
            {
                "area_m2": round(area, 1),
                "centroid_local": [round(local[0], 2), round(local[1], 2)],
                "district_id": _district_for(local, centres),
                "ring": [
                    [round(x, 1), round(z, 1)]
                    for x, z in (
                        ctx.metric_to_local(px, py) for px, py in polygon.exterior.coords
                    )
                ],
                "nearest_osm_m": round(float(nearest.distance(Point(centroid.x, centroid.y))), 2),
                "compactness": round(compactness, 3),
            }
        )
    candidates.sort(key=lambda item: -item["area_m2"])

    # Ask DBTR whether the largest candidates are actually mapped buildings.
    review = candidates[:DBTR_REVIEW_LIMIT]

    def check(candidate: dict) -> tuple[dict, dict | None]:
        x, z = candidate["centroid_local"]
        mx, my = ctx.local_to_metric(x, z)
        return candidate, dbtr.query_building(mx, my)

    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(check, candidate) for candidate in review]
        for future in as_completed(futures):
            candidate, info = future.result()
            candidate["dbtr_height_m"] = info.get("height_m") if info else None
            candidate["dbtr_has_uvl"] = bool(info)

    districts: dict[str, dict] = {}
    for district in config.districts:
        key = district["id"]
        districts[key] = {
            "built_area_m2": 0,
            "covered_area_m2": 0,
            "candidate_count": 0,
            "candidate_area_m2": 0,
        }
    # Nearest-centre district assignment on a 10 m grid.
    step = 10
    for y in range(0, shape_hw[0], step):
        for x in range(0, shape_hw[1], step):
            if not built[y, x]:
                continue
            mx, my = rasterio.transform.xy(transform, y, x, offset="center")
            lx, lz = ctx.metric_to_local(mx, my)
            key = _district_for((lx, lz), centres)
            districts[key]["built_area_m2"] += step * step
            if osm[y, x]:
                districts[key]["covered_area_m2"] += step * step
    for candidate in candidates:
        stats = districts[candidate["district_id"]]
        stats["candidate_count"] += 1
        stats["candidate_area_m2"] += candidate["area_m2"]

    priority = [
        candidate
        for candidate in candidates
        if candidate["area_m2"] >= 400
        and candidate["nearest_osm_m"] >= 8
        and (
            (candidate.get("dbtr_has_uvl") and candidate["area_m2"] >= 1000)
            or (
                candidate["compactness"] >= 0.12
                and candidate["area_m2"] >= 500
            )
            or (
                candidate["compactness"] >= 0.03
                and candidate["area_m2"] >= 5000
            )
        )
    ]

    for stats in districts.values():
        built_area = stats["built_area_m2"]
        stats["coverage_pct"] = (
            round(100.0 * stats["covered_area_m2"] / built_area, 1)
            if built_area
            else 0.0
        )
        stats["candidate_area_m2"] = round(stats["candidate_area_m2"], 1)

    total_built = int(built.sum())
    total_covered = int((built & osm).sum())
    result = {
        "generated_at": datetime.now(UTC).replace(microsecond=0).isoformat(),
        "thresholds": {
            "height_m": HEIGHT_THRESHOLD_M,
            "ndvi": NDVI_THRESHOLD,
            "min_area_m2": MIN_COMPONENT_AREA_M2,
            "osm_buffer_m": OSM_BUFFER_M,
        },
        "built_area_m2": total_built,
        "covered_area_m2": total_covered,
        "coverage_pct": round(100.0 * total_covered / total_built, 1)
        if total_built
        else 0.0,
        "candidate_count": len(candidates),
        "candidate_area_m2": round(sum(item["area_m2"] for item in candidates), 1),
        "priority_count": len(priority),
        "priority_area_m2": round(sum(item["area_m2"] for item in priority), 1),
        "districts": districts,
        "top_candidates": candidates[:100],
        "priority_candidates": priority[:100],
    }
    (PROCESSED_DIR / "coverage_audit.json").write_text(
        json.dumps(result, indent=2), encoding="utf-8"
    )
    map_path = DOCS_DIR / "screenshots" / "08-coverage-gaps.png"
    _candidate_map(priority, ctx, config, map_path)
    report = DOCS_DIR / "COVERAGE_AUDIT.md"
    report.write_text(_markdown(result), encoding="utf-8")
    return result


def _markdown(result: dict) -> str:
    thresholds = result["thresholds"]
    lines = [
        "# Coverage audit — OSM footprints vs built-up surface",
        "",
        f"Generated: {result['generated_at']}",
        "",
        "Confronto tra l'edificato rilevato dal DSM 2008 (nDSM > "
        f"{thresholds['height_m']} m, NDVI < {thresholds['ndvi']}) e le impronte",
        "OpenStreetMap attuali. Non è un rilevamento automatico di edifici:",
        "evidenzia **candidati da verificare**, non necessariamente edifici mancanti.",
        "",
        "## Esito",
        "",
        f"- Superficie costruita stimata: **{result['built_area_m2'] / 1e6:.2f} km²**",
        f"- Coperta da impronte OSM: **{result['coverage_pct']}%**",
        f"- Candidati grezzi (componenti ≥ {thresholds['min_area_m2']} m²): "
        f"**{result['candidate_count']}**, per "
        f"**{result['candidate_area_m2'] / 1e6:.2f} km²**",
        f"- Candidati prioritari (area ≥ 400 m², distanza OSM ≥ 8 m, "
        f"conferma DBTR o forma compatta): **{result['priority_count']}**, "
        f"per **{result['priority_area_m2'] / 1e6:.2f} km²**",
        "",
        "## Per quartiere",
        "",
        "| Quartiere | Edificato km² | Coperto % | Candidati | Area candidati m² |",
        "| --- | ---: | ---: | ---: | ---: |",
    ]
    for key, stats in result["districts"].items():
        lines.append(
            f"| {key} | {stats['built_area_m2'] / 1e6:.2f} | "
            f"{stats['coverage_pct']} | {stats['candidate_count']} | "
            f"{stats['candidate_area_m2']:.0f} |"
        )
    lines += [
        "",
        "## Candidati principali",
        "",
        "| Area m² | Quartiere | Centro locale (x,z) | Distanza OSM m | DBTR UVL |",
        "| ---: | --- | --- | ---: | --- |",
    ]
    for candidate in result["priority_candidates"][:20]:
        x, z = candidate["centroid_local"]
        dbtr_value = (
            f"h={candidate['dbtr_height_m']} m"
            if candidate.get("dbtr_has_uvl")
            else "no"
        )
        lines.append(
            f"| {candidate['area_m2']:.0f} | {candidate['district_id']} | "
            f"{x:.0f}, {z:.0f} | {candidate['nearest_osm_m']:.1f} | {dbtr_value} |"
        )
    lines += [
        "",
        "## Limiti dell'audit",
        "",
        "1. Il DSM è del **2008**: edifici costruiti dopo non possono essere rilevati.",
        "2. Il confronto è pixel-based: piccoli disallineamenti OSM/DSM producono",
        "   falsi candidati; l'impronta OSM è bufferizzata di 2 m.",
        "3. Alberi alti con NDVI anomalo, pensiline, muri e manufatti industriali",
        "   possono entrare nella maschera dell'edificato.",
        "4. Il DBTR UVL è un controllo indipendente del 2008, non una verifica",
        "   catastale aggiornata.",
        "",
        "Mappa: `docs/screenshots/08-coverage-gaps.png`.",
        "",
    ]
    return "\n".join(lines)
