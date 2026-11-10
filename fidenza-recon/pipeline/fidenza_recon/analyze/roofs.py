"""Roof shape, colour and material inference."""

from __future__ import annotations

import colorsys
import json

import numpy as np
import rasterio
from rasterio.mask import mask as raster_mask
from shapely.geometry import Polygon, mapping

from ..config import PROCESSED_DIR, RAW_DIR, AppConfig
from ..geo import GeoContext


def _polygon(record: dict) -> Polygon:
    poly = Polygon(record["metric_ring"], record["metric_holes"])
    return poly if poly.is_valid else poly.buffer(0)


def _grid_points(min_rect: dict, ctx: GeoContext, n: int = 14) -> tuple[list[tuple[float, float]], int]:
    corners = min_rect["corners"]
    p0, p1, _, p3 = corners
    points: list[tuple[float, float]] = []
    for j in range(n):
        v = (j + 0.5) / n
        for i in range(n):
            u = (i + 0.5) / n
            x = p0[0] + u * (p1[0] - p0[0]) + v * (p3[0] - p0[0])
            z = p0[1] + u * (p1[1] - p0[1]) + v * (p3[1] - p0[1])
            points.append(ctx.local_to_metric(x, z))
    return points, n


def _sample_surface(dataset: rasterio.DatasetReader, points: list[tuple[float, float]], n: int) -> np.ndarray:
    values = np.array([next(dataset.sample([point]))[0] for point in points], dtype="float32")
    return values.reshape(n, n)


def _hex(rgb: tuple[int, int, int]) -> str:
    return "#{:02x}{:02x}{:02x}".format(*rgb)


def _hsv(hex_color: str) -> tuple[float, float, float]:
    value = hex_color.lstrip("#")
    r, g, b = (int(value[i : i + 2], 16) / 255.0 for i in (0, 2, 4))
    return colorsys.rgb_to_hsv(r, g, b)


def _median_colour(
    record: dict,
    ortho: rasterio.DatasetReader | None,
    nir: rasterio.DatasetReader | None,
    roof_shape: str,
) -> tuple[str | None, str | None, int]:
    if ortho is None or nir is None:
        return None, None, 0
    poly = _polygon(record)
    eroded = poly.buffer(-0.5)
    if eroded.is_empty:
        eroded = poly
    try:
        rgb, _ = raster_mask(ortho, [mapping(eroded)], crop=True, filled=False)
        red = rgb[0].astype("float32")
        green = rgb[1].astype("float32")
        blue = rgb[2].astype("float32")
        infrared, _ = raster_mask(nir, [mapping(eroded)], crop=True, filled=False)
        nir_values = infrared[0].astype("float32")
        valid = ~(np.ma.getmaskarray(rgb[0]) | np.ma.getmaskarray(infrared[0]))
        ndvi = (nir_values - red) / (nir_values + red + 1e-6)
        keep = valid & (ndvi <= 0.28) & np.isfinite(red)
        if keep.sum() < 5:
            keep = valid & np.isfinite(red)
        if keep.sum() == 0:
            return None, None, 0
        rr = np.asarray(red, dtype="float32") / 255.0
        gg = np.asarray(green, dtype="float32") / 255.0
        bb = np.asarray(blue, dtype="float32") / 255.0
        maxc = np.maximum(np.maximum(rr, gg), bb)
        minc = np.minimum(np.minimum(rr, gg), bb)
        delta = maxc - minc
        saturation = np.where(maxc > 0, delta / np.maximum(maxc, 1e-6), 0.0)
        hue = np.zeros_like(maxc)
        warm_mask = keep & (delta > 1e-6)
        if warm_mask.any():
            rc = (maxc - rr) / np.maximum(delta, 1e-6)
            gc = (maxc - gg) / np.maximum(delta, 1e-6)
            bc = (maxc - bb) / np.maximum(delta, 1e-6)
            hue = np.where(
                maxc == rr,
                bc - gc,
                np.where(maxc == gg, 2.0 + rc - bc, 4.0 + gc - rc),
            )
            hue = (hue / 6.0) % 1.0
        warm = keep & ((hue < 0.16) | (hue > 0.93)) & (saturation > 0.16) & (maxc > 0.3)
        sample = warm if warm.sum() >= 8 else keep & (maxc > 0.32)
        if sample.sum() == 0:
            sample = keep
        measured = (
            int(np.median(np.asarray(red[sample]))),
            int(np.median(np.asarray(green[sample]))),
            int(np.median(np.asarray(blue[sample]))),
        )
        measured_hex = _hex(measured)
        h, sat, value = colorsys.rgb_to_hsv(*(component / 255.0 for component in measured))
        if roof_shape == "flat":
            if value > 0.6 or sat < 0.05:
                measured_hex = "#6a6862"
                sat, value = 0.03, 0.42
        else:
            if sat < 0.06 and value > 0.78:
                observed = "#a8a29a"
                displayed = colorsys.rgb_to_hsv(*(int(observed[i : i + 2], 16) / 255.0 for i in (1, 3, 5)))
                h, sat, value = displayed
            elif 0.01 < h < 0.17 and sat > 0.10:
                # Historic clay tiles are under-saturated in sunlit
                # orthophoto pixels; normalise the display colour while
                # keeping the measured colour in the record.
                sat = min(0.58, max(0.50, sat * 1.35 + 0.08))
                value = max(0.52, min(0.72, value))
            else:
                sat = min(0.58, sat * 1.35 + 0.03)
                value = max(0.4, min(0.8, value))
        display = "#{:02x}{:02x}{:02x}".format(
            *(
                int(round(component * 255))
                for component in colorsys.hsv_to_rgb(h, sat, value)
            )
        )
        return display, measured_hex, int(sample.sum())
    except Exception:  # noqa: BLE001 - colour is optional
        return None, None, 0


def _material(roof_shape: str, colour: str, archetype_hint: str | None) -> str:
    hue, saturation, value = _hsv(colour)
    if roof_shape == "flat":
        return "membrane"
    if archetype_hint in {"industrial", "station_building"} and saturation < 0.2:
        return "metal"
    if saturation < 0.09 and value < 0.55:
        return "slate"
    if saturation < 0.14 and value > 0.45 and archetype_hint in {"industrial", "station_building"}:
        return "metal"
    return "tiles"


def _classify_shape(
    grid: np.ndarray, roof_height: float, height: float, record: dict
) -> tuple[str, float]:
    name = (record.get("name") or "").lower()
    tags = record.get("tags") or {}
    if "cattedrale" in name or "chiesa" in name or "santuario" in name or "oratorio" in name:
        return "gabled", 0.7
    if "porta" in name:
        return "gabled", 0.65
    if tags.get("building") in {"industrial", "warehouse"}:
        return "gabled", 0.55

    clean = grid[np.isfinite(grid)]
    if clean.size < 8 or height <= 3.5:
        return "flat", 0.4
    if not np.isfinite(grid[4:-4, 4:-4]).any():
        return "flat", 0.35
    spread = float(np.percentile(clean, 95) - np.percentile(clean, 20))
    if roof_height < 0.9 or spread < 0.6:
        return "flat", 0.55

    centre = np.nanmean(grid[4:-4, 4:-4])
    edge = np.nanmean(np.concatenate([grid[0], grid[-1], grid[:, 0], grid[:, -1]]))
    rise = float(centre - edge)
    if rise < 0.35:
        return "flat", 0.45

    # Ridge along the long axis: gable ends drop, hip ends also drop but the
    # central plateau is shorter. Use the corner drop as a weak discriminator.
    central_std = float(np.nanstd(grid[4:-4, 4:-4]))
    if rise > 1.6 and central_std < 0.35:
        return "mansard", 0.4
    corners = np.nanmean([grid[0, 0], grid[0, -1], grid[-1, 0], grid[-1, -1]])
    if corners < centre - 1.1:
        return "hipped", 0.45
    return "gabled", 0.5


def analyze(config: AppConfig, force: bool = False) -> dict:
    out_path = PROCESSED_DIR / "roofs.json"
    if out_path.exists() and not force:
        return json.loads(out_path.read_text(encoding="utf-8"))

    base = json.loads((PROCESSED_DIR / "buildings_base.json").read_text(encoding="utf-8"))
    heights = json.loads((PROCESSED_DIR / "heights.json").read_text(encoding="utf-8"))
    ndsm_path = PROCESSED_DIR / "ndsm.tif"
    ctx = GeoContext(config.origin[0], config.origin[1], config.crs_metric)

    results: dict[str, dict] = {}
    paths = {
        "1": (
            RAW_DIR / "rer" / "ortho_rgb.tif",
            RAW_DIR / "rer" / "ortho_nir.tif",
        ),
        "05": (
            RAW_DIR / "rer" / "ortho_rgb_05.tif",
            RAW_DIR / "rer" / "ortho_nir_05.tif",
        ),
        "02": (
            RAW_DIR / "rer" / "ortho_rgb_02.tif",
            RAW_DIR / "rer" / "ortho_nir_02.tif",
        ),
    }
    datasets: dict[str, tuple[rasterio.DatasetReader, rasterio.DatasetReader]] = {}
    for level, (rgb_path, nir_path) in paths.items():
        if rgb_path.exists() and nir_path.exists():
            datasets[level] = (rasterio.open(rgb_path), rasterio.open(nir_path))
    downloads = config.downloads
    centro_bbox = downloads.get("ortho_centro_bbox_wgs84")
    centro_metric = ctx.bbox_metric(tuple(centro_bbox)) if centro_bbox else None
    pilot_metric = ctx.bbox_metric(config.pilot_bbox)

    def select_dataset(
        record: dict,
    ) -> tuple[str, rasterio.DatasetReader, rasterio.DatasetReader] | None:
        mx, my = ctx.local_to_metric(*record["centroid_local"])
        if (
            centro_metric
            and "02" in datasets
            and centro_metric[0] <= mx <= centro_metric[2]
            and centro_metric[1] <= my <= centro_metric[3]
        ):
            return "02", *datasets["02"]
        if (
            "05" in datasets
            and pilot_metric[0] <= mx <= pilot_metric[2]
            and pilot_metric[1] <= my <= pilot_metric[3]
        ):
            return "05", *datasets["05"]
        for level in ("1", "05", "02"):
            if level in datasets:
                return level, *datasets[level]
        return None

    try:
        with rasterio.open(ndsm_path) as ndsm:
            for position, record in enumerate(base["buildings"], start=1):
                if position % 500 == 0:
                    print(f"  roofs {position}/{len(base['buildings'])}")
                height_info = heights.get(record["osm_id"], {})
                height = float(height_info.get("height_m", 8.0))
                roof_height = float(height_info.get("roof_height_m", 0.8))
                points, n = _grid_points(record["min_rect"], ctx)
                grid = _sample_surface(ndsm, points, n)
                shape, shape_confidence = _classify_shape(grid, roof_height, height, record)

                selected = select_dataset(record)
                selected_level = selected[0] if selected else "1"
                if selected is None:
                    colour, measured_colour, colour_pixels = None, None, 0
                else:
                    colour, measured_colour, colour_pixels = _median_colour(
                        record, selected[1], selected[2], shape
                    )
                    fallback = datasets.get("1")
                    if colour is None and fallback is not None and selected_level != "1":
                        colour, measured_colour, colour_pixels = _median_colour(
                            record, fallback[0], fallback[1], shape
                        )
                        selected_level = "1"
                resolution = {"02": 0.2, "05": 0.5, "1": 1.0}[selected_level]
                if colour is None:
                    colour = "#9a5b45" if shape != "flat" else "#6a6862"
                    measured_colour = None
                    colour_confidence = 0.2
                else:
                    colour_confidence = 0.7 if colour_pixels >= 20 else 0.45
                material = _material(shape, colour, record.get("name"))
                results[record["osm_id"]] = {
                    "osm_id": record["osm_id"],
                    "roof_shape": shape,
                    "roof_shape_confidence": round(shape_confidence, 2),
                    "roof_colour": colour,
                    "roof_colour_measured": measured_colour,
                    "roof_colour_confidence": round(colour_confidence, 2),
                    "roof_material": material,
                    "roof_height_m": round(roof_height if shape != "flat" else 0.3, 2),
                    "colour_pixels": colour_pixels,
                    "ortho_resolution_m": resolution,
                    "source": (
                        "DSM 2008 surface + RER 2023-24 orthophoto/NIR "
                        f"at {resolution} m"
                    ),
                }
    finally:
        for rgb, nir in datasets.values():
            rgb.close()
            nir.close()
    out_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    return results
