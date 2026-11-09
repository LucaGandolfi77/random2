"""Measure building heights from DSM - DTM and record the evidence.

The accessible surface model is the AGEA 2008 DSM (2 m native), while the
terrain model is the RER 2023-24 DTM (0.5 m). The cross-epoch difference is
carried into every height confidence value.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import rasterio
from rasterio.mask import mask as raster_mask
from rasterio.warp import Resampling, reproject
from shapely.geometry import Polygon, mapping

from ..config import PROCESSED_DIR, RAW_DIR, AppConfig
from ..db import now_iso

DSM_SOURCE = "dsm_agea2008_minus_dtm_rer2023_24"
DSM_CONFIDENCE = 0.72
LEVELS_CONFIDENCE = 0.55
PRIOR_CONFIDENCE = 0.15


def _align_to_grid(source_path: Path, reference: rasterio.DatasetReader) -> np.ndarray:
    with rasterio.open(source_path) as source:
        destination = np.full(
            (reference.height, reference.width), np.nan, dtype="float32"
        )
        reproject(
            source=source.read(1),
            destination=destination,
            src_transform=source.transform,
            src_crs=source.crs,
            src_nodata=source.nodata,
            dst_transform=reference.transform,
            dst_crs=reference.crs,
            dst_nodata=np.nan,
            resampling=Resampling.bilinear,
        )
    return destination


def _ndvi(ortho_path: Path, nir_path: Path, reference: rasterio.DatasetReader) -> np.ndarray:
    with rasterio.open(ortho_path) as rgb, rasterio.open(nir_path) as nir:
        red = rgb.read(1).astype("float32")
        infrared = nir.read(1).astype("float32")
        if red.shape != infrared.shape:
            infrared = np.resize(infrared, red.shape)
        ndvi = (infrared - red) / (infrared + red + 1e-6)
        destination = np.full((reference.height, reference.width), np.nan, dtype="float32")
        reproject(
            source=ndvi,
            destination=destination,
            src_transform=rgb.transform,
            src_crs=rgb.crs,
            dst_transform=reference.transform,
            dst_crs=reference.crs,
            dst_nodata=np.nan,
            resampling=Resampling.bilinear,
        )
    return destination


def _polygon(record: dict) -> Polygon:
    poly = Polygon(record["metric_ring"], record["metric_holes"])
    if not poly.is_valid:
        poly = poly.buffer(0)
    return poly


def _erode(poly: Polygon, distance: float) -> Polygon:
    eroded = poly.buffer(-distance)
    if eroded.is_empty or eroded.area < 2.0:
        eroded = poly.buffer(-distance / 3)
    return eroded if not eroded.is_empty else poly


def _stats(values: np.ndarray) -> dict[str, float] | None:
    clean = values[np.isfinite(values)]
    if clean.size == 0:
        return None
    clean = clean[(clean > -3.0) & (clean < 80.0)]
    if clean.size == 0:
        return None
    return {
        "p20": float(np.percentile(clean, 20)),
        "p50": float(np.percentile(clean, 50)),
        "p90": float(np.percentile(clean, 90)),
        "p95": float(np.percentile(clean, 95)),
        "std": float(np.std(clean)),
        "max": float(np.max(clean)),
        "count": int(clean.size),
    }


def analyze(config: AppConfig, force: bool = False) -> dict:
    out_path = PROCESSED_DIR / "heights.json"
    if out_path.exists() and not force:
        return json.loads(out_path.read_text(encoding="utf-8"))

    base = json.loads((PROCESSED_DIR / "buildings_base.json").read_text(encoding="utf-8"))
    dtm_path = RAW_DIR / "rer" / "dtm_rer2023_24.tif"
    dsm_path = RAW_DIR / "rer" / "dsm_agea2008.tif"
    ortho_path = RAW_DIR / "rer" / "ortho_rgb.tif"
    nir_path = RAW_DIR / "rer" / "ortho_nir.tif"

    has_rasters = dtm_path.exists() and dsm_path.exists()
    if not has_rasters:
        raise RuntimeError("DTM/DSM rasters missing: run `fetch` first")

    with rasterio.open(dtm_path) as dtm:
        dtm_array = dtm.read(1).astype("float32")
        dsm_array = _align_to_grid(dsm_path, dtm)
        ndsm = dsm_array - dtm_array
        ndvi = _ndvi(ortho_path, nir_path, dtm) if ortho_path.exists() else np.zeros_like(ndsm)
        profile = dtm.profile.copy()
        profile.update(dtype="float32", count=1, nodata=np.nan, compress="deflate")
        with rasterio.open(PROCESSED_DIR / "ndsm.tif", "w", **profile) as sink:
            sink.write(ndsm.astype("float32"), 1)
        with rasterio.open(PROCESSED_DIR / "ndvi.tif", "w", **profile) as sink:
            sink.write(ndvi.astype("float32"), 1)

        default_floor = float(config.city["floor_heights"]["default_m"])

        def ground_at(x: float, y: float) -> float | None:
            value = next(dtm.sample([(x, y)]))[0]
            return float(value) if np.isfinite(value) else None

        from ..geo import GeoContext

        origin = config.origin
        ctx = GeoContext(origin[0], origin[1], config.crs_metric)
        results: dict[str, dict] = {}
        ndsm_ds = rasterio.open(PROCESSED_DIR / "ndsm.tif")
        ndvi_ds = rasterio.open(PROCESSED_DIR / "ndvi.tif")
        for record in base["buildings"]:
            poly = _polygon(record)
            eroded = _erode(poly, 0.7)
            values = np.array([])
            vegetation_removed = 0
            try:
                masked, _ = raster_mask(
                    ndsm_ds, [mapping(eroded)], crop=True, filled=False, all_touched=False
                )
                data = np.ma.getdata(masked).astype("float32").ravel()
                mask = np.ma.getmaskarray(masked).ravel()
                data = data[~mask]
                try:
                    ndvi_masked, _ = raster_mask(
                        ndvi_ds, [mapping(eroded)], crop=True, filled=False, all_touched=False
                    )
                    ndvi_data = np.ma.getdata(ndvi_masked).astype("float32").ravel()
                    ndvi_mask = np.ma.getmaskarray(ndvi_masked).ravel()
                    ndvi_data = ndvi_data[~ndvi_mask]
                    if ndvi_data.size == data.size:
                        vegetation = (ndvi_data > 0.38) & (data > 2.0)
                        vegetation_removed = int(vegetation.sum())
                        data = data[~vegetation]
                except Exception:  # noqa: BLE001 - vegetation mask is best effort
                    pass
                values = data
            except Exception:  # noqa: BLE001 - fall back to centred sampling
                values = np.array([])

            stats = _stats(values)
            centroid = record["centroid_local"]
            mx, my = ctx.local_to_metric(*centroid)
            ground = ground_at(mx, my)
            floors_tag = record["tags"].get("building:levels")
            try:
                levels = int(str(floors_tag).split(";")[0]) if floors_tag else None
            except (TypeError, ValueError):
                levels = None

            height_source = DSM_SOURCE
            confidence = DSM_CONFIDENCE
            if stats and stats["count"] >= 12:
                height = max(2.5, min(60.0, stats["p90"]))
                eave = stats["p20"]
                if height - eave < 0.9:
                    eave = height
                    roof_height = 0.35
                else:
                    roof_height = max(0.4, height - eave)
                if stats["count"] < 30:
                    confidence -= 0.08
                if stats["std"] > 4.5:
                    confidence -= 0.08
                pixel_count = stats["count"]
            elif levels:
                floor = float(config.city["floor_heights"]["default_m"])
                height = levels * floor + 1.0
                eave = height - 0.8
                roof_height = 0.8
                height_source = "osm_building_levels"
                confidence = LEVELS_CONFIDENCE
                pixel_count = 0
            else:
                floor = float(config.city["floor_heights"]["default_m"])
                height = 8.5
                eave = height - 0.8
                roof_height = 0.8
                height_source = "typology_prior"
                confidence = PRIOR_CONFIDENCE
                pixel_count = 0

            floors = max(1, int(round(eave / default_floor))) if height_source == DSM_SOURCE else (
                levels or max(1, int(round(eave / default_floor)))
            )
            results[record["osm_id"]] = {
                "osm_id": record["osm_id"],
                "height_m": round(height, 2),
                "eave_height_m": round(eave, 2),
                "roof_height_m": round(roof_height, 2),
                "floors": floors,
                "floor_height_m": round(eave / floors, 2) if floors else default_floor,
                "ground_elevation_m": round(ground, 2) if ground is not None else None,
                "height_source": height_source,
                "height_confidence": round(max(0.1, min(0.9, confidence)), 2),
                "pixel_count": pixel_count,
                "vegetation_removed": vegetation_removed,
                "ndsm_std": round(stats["std"], 2) if stats else None,
                "last_verified": now_iso(),
                "notes": (
                    "DSM 2008 surface minus DTM 2023-24; cross-epoch uncertainty."
                    if height_source == DSM_SOURCE
                    else "No usable DSM samples: height from OSM levels."
                    if height_source == "osm_building_levels"
                    else "No height evidence: typology prior, low confidence."
                ),
            }

    ndsm_ds.close()
    ndvi_ds.close()
    out_path.write_text(json.dumps(results, indent=2), encoding="utf-8")
    return results
