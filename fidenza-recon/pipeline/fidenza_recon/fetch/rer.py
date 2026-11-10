"""Emilia-Romagna open geodata: orthophoto, DTM and DSM.

All rasters are fetched from public ArcGIS ImageServer endpoints as
georeferenced GeoTIFFs in EPSG:7791. No global coordinates enter the runtime.
"""

from __future__ import annotations

import hashlib
import json
import math
import time
from pathlib import Path
from typing import Any

import requests
from PIL import Image
from rasterio.io import MemoryFile

from ..config import PROCESSED_DIR, RAW_DIR, AppConfig, ensure_dirs
from ..db import connect, init_db, now_iso, upsert_dataset, upsert_source

ARCGIS_BASE = "https://servizigis.regione.emilia-romagna.it/arcgis/rest/services/public"
DEFAULT_SERVICES = {
    "ortho_rgb": "RER2023_24_RGB",
    "ortho_nir": "RER2023_24_NIR",
    "dtm": "DtmRER2023_24",
    "dsm": "DsmAgea2008",
}

# The public Web Adaptor starts failing around 9 megapixels per export and
# above 4096 px per side. Larger products are mosaicked from a 2-D tile grid.
MAX_EXPORT_PIXELS = 8_500_000
MAX_EXPORT_DIMENSION = 4096


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _request_image(
    service: str,
    bbox_metric: tuple[float, float, float, float],
    width: int,
    height: int,
    *,
    pixel_type: str | None = None,
    timeout_s: int = 300,
) -> tuple[bytes, str]:
    url = f"{ARCGIS_BASE}/{service}/ImageServer/exportImage"
    params = {
        "bbox": ",".join(f"{value:.3f}" for value in bbox_metric),
        "bboxSR": "7791",
        "imageSR": "7791",
        "size": f"{width},{height}",
        "format": "tiff",
        "interpolation": "RSP_BilinearInterpolation",
        "f": "image",
    }
    if pixel_type:
        params["pixelType"] = pixel_type
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            response = requests.get(url, params=params, timeout=timeout_s)
            response.raise_for_status()
            content_type = response.headers.get("content-type", "")
            if "image" not in content_type and "tiff" not in content_type:
                snippet = response.text[:240].replace("\n", " ")
                raise RuntimeError(
                    f"{service}: unexpected content type {content_type}: {snippet}"
                )
            return response.content, response.url
        except Exception as exc:  # noqa: BLE001 - retry transient server errors
            last_error = exc
            time.sleep(2.0 + attempt * 3.0)
    raise RuntimeError(f"{service}: export failed after retries: {last_error}")


def _export_image(
    service: str,
    bbox_metric: tuple[float, float, float, float],
    width: int,
    height: int,
    out_path: Path,
    *,
    pixel_type: str | None = None,
    timeout_s: int = 300,
    max_pixels: int = MAX_EXPORT_PIXELS,
    max_dimension: int = MAX_EXPORT_DIMENSION,
) -> dict[str, Any]:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if width * height <= max_pixels and width <= max_dimension and height <= max_dimension:
        content, url = _request_image(
            service,
            bbox_metric,
            width,
            height,
            pixel_type=pixel_type,
            timeout_s=timeout_s,
        )
        out_path.write_bytes(content)
        return {
            "path": out_path,
            "bytes": len(content),
            "service": service,
            "url": url,
            "bbox_metric": bbox_metric,
            "width": width,
            "height": height,
        }

    # Export a rectangular tile grid below the server limits, then mosaic the
    # georeferenced tiles into one GeoTIFF.
    tiles_x = max(1, math.ceil(width / max_dimension))
    tiles_y = max(1, math.ceil(height / max_dimension))
    while math.ceil(width / tiles_x) * math.ceil(height / tiles_y) > max_pixels:
        if width / tiles_x >= height / tiles_y:
            tiles_x += 1
        else:
            tiles_y += 1
    tile_width = math.ceil(width / tiles_x)
    tile_height = math.ceil(height / tiles_y)
    minx, miny, maxx, maxy = bbox_metric
    span_x = maxx - minx
    span_y = maxy - miny
    parts: list[Path] = []
    last_url = ""
    try:
        for row in range(tiles_y):
            start_row = row * tile_height
            end_row = min(height, start_row + tile_height)
            if start_row >= end_row:
                continue
            for column in range(tiles_x):
                start_col = column * tile_width
                end_col = min(width, start_col + tile_width)
                if start_col >= end_col:
                    continue
                tile_bbox = (
                    minx + span_x * (start_col / width),
                    miny + span_y * (start_row / height),
                    minx + span_x * (end_col / width),
                    miny + span_y * (end_row / height),
                )
                content, last_url = _request_image(
                    service,
                    tile_bbox,
                    end_col - start_col,
                    end_row - start_row,
                    pixel_type=pixel_type,
                    timeout_s=timeout_s,
                )
                part_path = out_path.with_name(
                    f"{out_path.stem}.part{row}_{column}.tif"
                )
                part_path.write_bytes(content)
                parts.append(part_path)

        import rasterio
        from rasterio.merge import merge

        datasets = [rasterio.open(path) for path in parts]
        try:
            mosaic, transform = merge(datasets)
            profile = datasets[0].profile.copy()
            profile.update(
                width=mosaic.shape[2],
                height=mosaic.shape[1],
                transform=transform,
                compress="deflate",
            )
            with rasterio.open(out_path, "w", **profile) as sink:
                sink.write(mosaic.astype(profile["dtype"]))
        finally:
            for dataset in datasets:
                dataset.close()
    finally:
        for part in parts:
            part.unlink(missing_ok=True)

    return {
        "path": out_path,
        "bytes": out_path.stat().st_size,
        "service": service,
        "url": last_url,
        "bbox_metric": bbox_metric,
        "width": width,
        "height": height,
        "tiles": len(parts),
        "grid": [tiles_x, tiles_y],
    }


def _decode_meta(raw: bytes) -> dict[str, Any]:
    with MemoryFile(raw) as memfile:
        with memfile.open() as dataset:
            return {
                "crs": str(dataset.crs),
                "width": dataset.width,
                "height": dataset.height,
                "dtype": dataset.dtypes[0],
                "transform": list(dataset.transform)[:6],
            }


def _ground_texture(ortho_path: Path, bbox_local: tuple[float, float, float, float], width_px: int) -> dict[str, Any]:
    PROCESSED_DIR.joinpath("ground").mkdir(parents=True, exist_ok=True)
    target = PROCESSED_DIR / "ground" / "ortho.jpg"
    with Image.open(ortho_path) as image:
        rgb = image.convert("RGB")
        ratio = width_px / rgb.width
        resized = rgb.resize((width_px, max(1, round(rgb.height * ratio))), Image.Resampling.LANCZOS)
        import numpy as np

        pixels = np.asarray(resized).astype("float32")
        luminance = pixels.mean(axis=2, keepdims=True)
        shadow = np.clip(1.0 - luminance / 150.0, 0.0, 1.0)
        target_lum = luminance * 1.0
        blend = (0.85 * shadow)[..., 0][..., None]
        pixels = pixels * (1.0 - blend) + target_lum * blend
        pixels[..., 0] *= 1.05
        pixels[..., 1] *= 1.0
        pixels[..., 2] *= 0.90
        pixels += shadow[..., 0][..., None] * np.array([16.0, 14.0, 12.0], dtype="float32")
        pixels = np.clip(pixels, 0, 255).astype("uint8")
        graded = Image.fromarray(pixels, mode="RGB")
        quality = 88
        graded.save(target, quality=quality, optimize=True, progressive=True)
        meta = {
            "image": "ortho.jpg",
            "width": resized.width,
            "height": resized.height,
            "bbox_local": list(bbox_local),
            "crs": "local-metres",
            "license": "CC BY 4.0 — Regione Emilia-Romagna (RER 2023-24 orthophoto)",
            "color_grade": "display-only warm correction; raw GeoTIFF is unmodified",
        }
    (PROCESSED_DIR / "ground" / "ground.json").write_text(
        json.dumps(meta, indent=2), encoding="utf-8"
    )
    return meta


def fetch(config: AppConfig, force: bool = False) -> dict[str, Any]:
    ensure_dirs()
    bbox_wgs84 = config.context_bbox
    from ..geo import GeoContext

    ctx = GeoContext(config.origin[0], config.origin[1], config.crs_metric)
    bbox_metric = ctx.bbox_metric(bbox_wgs84)
    bbox_local = ctx.bbox_local(bbox_wgs84)
    span_x = bbox_metric[2] - bbox_metric[0]
    span_y = bbox_metric[3] - bbox_metric[1]
    timeout_s = int(config.city["downloads"]["request_timeout_s"])

    out_dir = RAW_DIR / "rer"
    out_dir.mkdir(parents=True, exist_ok=True)

    downloads = config.downloads
    ortho_res = float(downloads["ortho_resolution_m"])
    dtm_res = float(downloads["dtm_resolution_m"])
    dsm_res = float(downloads["dsm_resolution_m"])
    max_pixels = int(downloads.get("max_export_pixels", MAX_EXPORT_PIXELS))
    max_dimension = int(downloads.get("max_export_dimension", MAX_EXPORT_DIMENSION))
    ortho_size = (math.ceil(span_x / ortho_res), math.ceil(span_y / ortho_res))
    dtm_size = (math.ceil(span_x / dtm_res), math.ceil(span_y / dtm_res))
    dsm_size = (math.ceil(span_x / dsm_res), math.ceil(span_y / dsm_res))

    products: dict[str, Any] = {}
    pilot_bbox_metric = ctx.bbox_metric(config.pilot_bbox)
    pilot_span_x = pilot_bbox_metric[2] - pilot_bbox_metric[0]
    pilot_span_y = pilot_bbox_metric[3] - pilot_bbox_metric[1]
    ortho05_res = float(downloads.get("ortho_pilot_resolution_m", 0.5))
    ortho02_res = float(downloads.get("ortho_centro_resolution_m", 0.2))
    centro_bbox_wgs84 = downloads.get("ortho_centro_bbox_wgs84")
    centro_bbox_metric = (
        ctx.bbox_metric(tuple(centro_bbox_wgs84))
        if centro_bbox_wgs84
        else pilot_bbox_metric
    )
    centro_span_x = centro_bbox_metric[2] - centro_bbox_metric[0]
    centro_span_y = centro_bbox_metric[3] - centro_bbox_metric[1]
    ortho05_size = (
        math.ceil(pilot_span_x / ortho05_res),
        math.ceil(pilot_span_y / ortho05_res),
    )
    ortho02_size = (
        math.ceil(centro_span_x / ortho02_res),
        math.ceil(centro_span_y / ortho02_res),
    )
    specs = [
        ("ortho_rgb", "RER2023_24_RGB", out_dir / "ortho_rgb.tif", ortho_size, None, "RGB orthophoto 2023-24", ortho_res, bbox_metric),
        ("ortho_nir", "RER2023_24_NIR", out_dir / "ortho_nir.tif", ortho_size, None, "NIR orthophoto 2023-24", ortho_res, bbox_metric),
        ("dtm", "DtmRER2023_24", out_dir / "dtm_rer2023_24.tif", dtm_size, "F32", "DTM RER 2023-24", dtm_res, bbox_metric),
        ("dsm", "DsmAgea2008", out_dir / "dsm_agea2008.tif", dsm_size, "F32", "DSM AGEA 2008", dsm_res, bbox_metric),
        ("ortho_rgb_05", "RER2023_24_RGB", out_dir / "ortho_rgb_05.tif", ortho05_size, None, "RGB orthophoto 2023-24 — pilot 0.5 m", ortho05_res, pilot_bbox_metric),
        ("ortho_nir_05", "RER2023_24_NIR", out_dir / "ortho_nir_05.tif", ortho05_size, None, "NIR orthophoto 2023-24 — pilot 0.5 m", ortho05_res, pilot_bbox_metric),
        ("ortho_rgb_02", "RER2023_24_RGB", out_dir / "ortho_rgb_02.tif", ortho02_size, None, "RGB orthophoto 2023-24 — centro 0.2 m", ortho02_res, centro_bbox_metric),
        ("ortho_nir_02", "RER2023_24_NIR", out_dir / "ortho_nir_02.tif", ortho02_size, None, "NIR orthophoto 2023-24 — centro 0.2 m", ortho02_res, centro_bbox_metric),
    ]
    cached = not force
    for key, service, path, size, pixel_type, label, resolution, spec_bbox in specs:
        if cached and path.exists() and path.stat().st_size > 500:
            products[key] = {
                "path": path,
                "url": f"{ARCGIS_BASE}/{service}/ImageServer",
                "bytes": path.stat().st_size,
                "bbox_metric": spec_bbox,
                "width": size[0],
                "height": size[1],
            }
            continue
        products[key] = _export_image(
            service,
            spec_bbox,
            size[0],
            size[1],
            path,
            pixel_type=pixel_type,
            timeout_s=timeout_s,
            max_pixels=max_pixels,
            max_dimension=max_dimension,
        )
        print(
            f"  RER {key}: {size[0]}x{size[1]} px, "
            f"{products[key]['bytes'] / 1e6:.1f} MB"
            + (f" in {products[key]['tiles']} tiles" if products[key].get("tiles") else ""),
            flush=True,
        )
        products[key]["label"] = label
        products[key]["resolution_m"] = resolution

    ground = _ground_texture(
        products["ortho_rgb"]["path"],
        bbox_local,
        int(config.city["downloads"]["ground_texture_width_px"]),
    )

    conn = connect()
    init_db(conn)
    upsert_source(
        conn,
        key="rer_ortho",
        name="Regione Emilia-Romagna — Ortofoto RER 2023-24 RGB/NIR",
        url="https://geoportale.regione.emilia-romagna.it/approfondimenti/rer23_24",
        license="CC BY 4.0",
        license_url="https://creativecommons.org/licenses/by/4.0/",
        published_at="2024",
        resolution="0.20 m native; 0.5 m pilot; 1 m context",
        notes=(
            "Orthophoto and NIR acquired by RER; 1 m ground texture, "
            "0.5 m pilot and 0.2 m historic-centre analysis products."
        ),
    )
    upsert_source(
        conn,
        key="rer_dtm",
        name="Regione Emilia-Romagna — DTM RER 2023-24",
        url="https://geoportale.regione.emilia-romagna.it/approfondimenti/rer23_24",
        license="CC BY 4.0",
        license_url="https://creativecommons.org/licenses/by/4.0/",
        published_at="2024",
        resolution="0.5 m",
        notes="LiDAR-derived DTM, 0.5 m grid.",
    )
    upsert_source(
        conn,
        key="rer_dsm_agea2008",
        name="Regione Emilia-Romagna public ArcGIS service — DSM AGEA 2008",
        url=f"{ARCGIS_BASE}/{DEFAULT_SERVICES['dsm']}/ImageServer",
        license="RER public service — license to verify before redistribution",
        license_url="https://geoportale.regione.emilia-romagna.it/",
        published_at="2008",
        resolution="2 m native (resampled for analysis)",
        notes=(
            "Building/vegetation surface model from the AGEA 2008 survey. "
            "Cross-epoch with the 2023-24 DTM: heights carry a documented uncertainty."
        ),
    )
    for key, label, source_key in (
        ("ortho_rgb", "orthophoto RGB", "rer_ortho"),
        ("ortho_nir", "orthophoto NIR", "rer_ortho"),
        ("ortho_rgb_05", "orthophoto RGB 0.5 m pilot", "rer_ortho"),
        ("ortho_nir_05", "orthophoto NIR 0.5 m pilot", "rer_ortho"),
        ("ortho_rgb_02", "orthophoto RGB 0.2 m centro", "rer_ortho"),
        ("ortho_nir_02", "orthophoto NIR 0.2 m centro", "rer_ortho"),
        ("dtm", "DTM 0.5 m", "rer_dtm"),
        ("dsm", "DSM AGEA 2008", "rer_dsm_agea2008"),
    ):
        product = products[key]
        upsert_dataset(
            conn,
            source_key=source_key,
            product=label,
            path=str(product["path"]),
            crs="EPSG:7791",
            bbox=json.dumps(bbox_metric),
            checksum=_sha256(product["path"]),
            retrieved_at=now_iso(),
            notes=f"{product['width']}x{product['height']} px",
        )
    conn.close()

    return {
        "products": {key: str(value["path"]) for key, value in products.items()},
        "bbox_metric": bbox_metric,
        "bbox_local": bbox_local,
        "ground": ground,
    }
