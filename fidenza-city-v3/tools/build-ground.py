#!/usr/bin/env python3
"""Generate the realistic ground textures for Fidenza da Giocare v3.

Reads the RER 2023-24 orthophoto GeoTIFFs (EPSG:7791) and writes JPEG LODs
aligned to the game's local metre grid (see js/config.js: origin 44.8665,
10.0612, x = east, z = south).

The output is intentionally plain: the game adds PBR detail, shadows and
lighting at runtime. The script only reprojects, colour-grades, fills the thin
strips outside the raster and writes progressive JPEGs.

Usage (from the repository root):
    fidenza-recon/.venv/bin/python fidenza-city-v3/tools/build-ground.py \
        --base fidenza-recon/data/raw/rer/ortho_rgb_05.tif \
        --center fidenza-recon/data/raw/rer/ortho_rgb_02.tif
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image, ImageFilter
from rasterio.enums import Resampling
from rasterio.transform import Affine
from rasterio.warp import transform_bounds, reproject

# Must match js/config.js WORLD.origin / WORLD.bounds.
ORIGIN_LAT = 44.8665
ORIGIN_LON = 10.0612
M_PER_DEG_LAT = 111132.0
M_PER_DEG_LON = 111320.0 * math.cos(ORIGIN_LAT * math.pi / 180.0)

# Must match js/config.js WORLD.spawn.
SPAWN_X = -312.0
SPAWN_Z = 12.0

ATTRIBUTION = (
    "Ortofoto RER 2023-24 — Regione Emilia-Romagna, CC BY 4.0 "
    "(ricampionata e color graded)"
)


def project(lon: float, lat: float) -> tuple[float, float]:
    return (lon - ORIGIN_LON) * M_PER_DEG_LON, -(lat - ORIGIN_LAT) * M_PER_DEG_LAT


def unproject(x: float, z: float) -> tuple[float, float]:
    return ORIGIN_LON + x / M_PER_DEG_LON, ORIGIN_LAT - z / M_PER_DEG_LAT


def wgs_bounds(path: Path) -> tuple[float, float, float, float]:
    with rasterio.open(path) as src:
        west, south, east, north = transform_bounds(
            src.crs, "EPSG:4326", *src.bounds, densify_pts=21
        )
    return west, south, east, north


def fill_invalid(rgb: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Fill no-data pixels with the nearest valid edge value.

    The 0.5 m raster stops ~40 m short of the game bounds on three sides.
    Edge replication keeps the seam invisible under fog instead of showing a
    black strip.
    """
    if mask.all():
        return rgb
    out = rgb.copy()
    valid = mask.copy()
    for _ in range(2):
        # horizontal fill
        for row in np.where(valid.any(axis=1))[0]:
            cols = np.where(valid[row])[0]
            if cols.size == 0:
                continue
            first, last = cols[0], cols[-1]
            if first > 0:
                out[row, :first] = out[row, first]
                valid[row, :first] = True
            if last < out.shape[1] - 1:
                out[row, last + 1:] = out[row, last]
                valid[row, last + 1:] = True
        # vertical fill
        for col in np.where(valid.any(axis=0))[0]:
            rows = np.where(valid[:, col])[0]
            if rows.size == 0:
                continue
            first, last = rows[0], rows[-1]
            if first > 0:
                out[:first, col] = out[first, col]
                valid[:first, col] = True
            if last < out.shape[0] - 1:
                out[last + 1:, col] = out[last, col]
                valid[last + 1:, col] = True
    if not valid.all():
        # Corners and any leftover pixels: use a heavily blurred copy so the
        # extension does not repeat a field seam as vertical stripes.
        blurred = np.asarray(
            Image.fromarray(out, mode="RGB").filter(ImageFilter.GaussianBlur(16))
        )
        out[~mask] = blurred[~mask]
    return out


def compute_illumination(rgb: np.ndarray, size: int = 512) -> tuple[np.ndarray, float]:
    """Blurred low-frequency illumination of a whole raster.

    The field is shared by the base and every tile, so a tile edge can never
    introduce a brightness step.
    """
    image = Image.fromarray(rgb, mode="RGB")
    small = image.resize((size, size), Image.Resampling.LANCZOS)
    small_pixels = np.asarray(small).astype(np.float32)
    small_lum = Image.fromarray(
        np.clip(small_pixels.mean(axis=2), 0, 255).astype(np.uint8), mode="L"
    )
    field = np.asarray(small_lum.filter(ImageFilter.GaussianBlur(28))).astype(np.float32)
    return field, float(np.median(field))


def resize_field(field: np.ndarray, width: int, height: int) -> np.ndarray:
    return np.asarray(
        Image.fromarray(np.clip(field, 0, 255).astype(np.uint8), mode="L").resize(
            (width, height), Image.Resampling.BILINEAR
        )
    ).astype(np.float32)


def apply_grade(
    rgb: np.ndarray,
    illumination: np.ndarray,
    target: float,
    shadow_strength: float = 0.72,
) -> np.ndarray:
    factor = np.clip(target / np.maximum(illumination, 12.0), 0.65, 2.1)
    factor = 1.0 + (factor - 1.0) * shadow_strength

    pixels = rgb.astype(np.float32) * factor[..., None]
    luminance = pixels.mean(axis=2, keepdims=True)
    shadow = np.clip(1.0 - luminance / 150.0, 0.0, 1.0)
    blend = (0.55 * shadow)[..., 0][..., None]
    pixels = pixels * (1.0 - blend) + luminance * blend
    pixels[..., 0] *= 1.035
    pixels[..., 1] *= 1.0
    pixels[..., 2] *= 0.955
    pixels += shadow[..., 0][..., None] * np.array([12.0, 11.0, 9.0], dtype=np.float32) * shadow_strength
    return np.clip(pixels, 0, 255).astype(np.uint8)


def grade(rgb: np.ndarray, shadow_strength: float = 0.72) -> np.ndarray:
    field, target = compute_illumination(rgb)
    illumination = resize_field(field, rgb.shape[1], rgb.shape[0])
    return apply_grade(rgb, illumination, target, shadow_strength=shadow_strength)


def reproject_raw(
    source: Path,
    lon_west: float,
    lon_east: float,
    lat_south: float,
    lat_north: float,
    width: int,
    height: int,
) -> np.ndarray:
    with rasterio.open(source) as src:
        src_data = src.read()
        dst = np.zeros((src.count, height, width), dtype=src_data.dtype)
        dst_transform = Affine(
            (lon_east - lon_west) / width,
            0.0,
            lon_west,
            0.0,
            -(lat_north - lat_south) / height,
            lat_north,
        )
        reproject(
            source=src_data,
            destination=dst,
            src_transform=src.transform,
            src_crs=src.crs,
            dst_transform=dst_transform,
            dst_crs="EPSG:4326",
            resampling=Resampling.lanczos,
            num_threads=4,
            init_dest_nodata=True,
            dst_nodata=0,
        )
    rgb = np.moveaxis(dst[:3], 0, -1)
    mask = rgb.max(axis=2) > 0
    return fill_invalid(rgb, mask)


def reproject_rgb(
    source: Path,
    lon_west: float,
    lon_east: float,
    lat_south: float,
    lat_north: float,
    width: int,
    height: int,
    shadow_strength: float = 0.72,
) -> np.ndarray:
    rgb = reproject_raw(source, lon_west, lon_east, lat_south, lat_north, width, height)
    return grade(rgb, shadow_strength=shadow_strength)


def save_jpeg(rgb: np.ndarray, path: Path, quality: int) -> None:
    image = Image.fromarray(rgb, mode="RGB")
    # Light unsharp mask: the JPEG is downsampled from 0.5 m / 0.2 m data.
    image = image.filter(ImageFilter.UnsharpMask(radius=1.4, percent=55, threshold=2))
    image.save(path, quality=quality, optimize=True, progressive=True)


def build_levels(
    rgb: np.ndarray,
    out_dir: Path,
    prefix: str,
    sizes: list[int],
    quality: int,
    bounds: dict,
) -> list[dict]:
    levels = []
    base = Image.fromarray(rgb, mode="RGB")
    for index, width in enumerate(sizes):
        height = max(1, round(base.height * width / base.width))
        level = base if width == base.width else base.resize((width, height), Image.Resampling.LANCZOS)
        name = f"{prefix}-z{index}.jpg"
        level.save(out_dir / name, quality=quality, optimize=True, progressive=True)
        levels.append(
            {
                "id": f"z{index}",
                "src": name,
                "width": width,
                "height": height,
                "metersPerPixel": round(
                    (bounds["maxX"] - bounds["minX"]) / width, 3
                ),
            }
        )
    return levels


def build_base(source: Path, out_dir: Path, width: int) -> tuple[dict, np.ndarray, float]:
    west, south, east, north = wgs_bounds(source)
    # Crop exactly to the raster footprint instead of extending to the game
    # bounds: the few missing metres are covered by the terrain and this keeps
    # the mosaic border out of the texture.
    min_x, max_z = project(west, south)
    max_x, min_z = project(east, north)
    bbox = {"minX": min_x, "maxX": max_x, "minZ": min_z, "maxZ": max_z}
    height = max(1, round(width * (max_z - min_z) / (max_x - min_x)))
    raw = reproject_raw(source, west, east, south, north, width, height)
    field, target = compute_illumination(raw)
    graded = apply_grade(raw, resize_field(field, width, height), target)
    sizes = [width, max(512, width // 2), max(256, width // 4)]
    levels = build_levels(graded, out_dir, "ortho", sizes, quality=84, bounds=bbox)
    return {
        "bounds": bbox,
        "sourceBoundsWgs84": [west, south, east, north],
        "levels": levels,
    }, field, target


def build_center(source: Path, out_dir: Path, width: int) -> dict:
    west, south, east, north = wgs_bounds(source)
    min_x, max_z = project(west, south)
    max_x, min_z = project(east, north)
    bbox = {"minX": min_x, "maxX": max_x, "minZ": min_z, "maxZ": max_z}
    height = max(1, round(width * (max_z - min_z) / (max_x - min_x)))
    rgb = reproject_rgb(source, west, east, south, north, width, height, shadow_strength=0.96)
    sizes = [width, max(512, width // 2)]
    levels = build_levels(rgb, out_dir, "ortho-center", sizes, quality=86, bounds=bbox)
    return {"bounds": bbox, "levels": levels}


def sample_field(
    field: np.ndarray,
    bounds: dict,
    min_x: float,
    max_x: float,
    min_z: float,
    max_z: float,
    width: int,
    height: int,
) -> np.ndarray:
    """Bilinear sample of the global illumination field for a tile bbox."""
    size_x = field.shape[1]
    size_y = field.shape[0]
    span_x = bounds["maxX"] - bounds["minX"]
    span_z = bounds["maxZ"] - bounds["minZ"]
    fx0 = (min_x - bounds["minX"]) / span_x * size_x
    fx1 = (max_x - bounds["minX"]) / span_x * size_x
    fz0 = (min_z - bounds["minZ"]) / span_z * size_y
    fz1 = (max_z - bounds["minZ"]) / span_z * size_y
    x0 = max(0, min(size_x - 1, int(math.floor(fx0))))
    x1 = max(x0 + 1, min(size_x, int(math.ceil(fx1))))
    y0 = max(0, min(size_y - 1, int(math.floor(fz0))))
    y1 = max(y0 + 1, min(size_y, int(math.ceil(fz1))))
    crop = Image.fromarray(np.clip(field, 0, 255).astype(np.uint8), mode="L")
    crop = crop.crop((x0, y0, x1, y1)).resize((width, height), Image.Resampling.BILINEAR)
    return np.asarray(crop).astype(np.float32)


def build_tiles(
    source: Path,
    out_dir: Path,
    base_meta: dict,
    base_field: np.ndarray,
    base_target: float,
    *,
    tile_pixels: int = 512,
    border: int = 4,
    meters_per_pixel: float = 0.5,
    quality: int = 82,
    margin: float = 64.0,
) -> dict:
    """Reproject the 0.5 m raster once, crop 520 px tiles and grade them
    with the same global illumination field as the base."""
    bounds = base_meta["bounds"]
    tile_meters = tile_pixels * meters_per_pixel
    # Inset the grid from the raster edge. The north/west/south/east edges of
    # the RER footprint can be a few dozen metres short; the base orthophoto
    # keeps those thin strips.
    grid_min_x = bounds["minX"] + margin
    grid_min_z = bounds["minZ"] + margin
    available_x = (bounds["maxX"] - margin) - grid_min_x
    available_z = (bounds["maxZ"] - margin) - grid_min_z
    cols = max(1, int(math.floor(available_x / tile_meters)))
    rows = max(1, int(math.floor(available_z / tile_meters)))
    grid = {
        "minX": grid_min_x,
        "minZ": grid_min_z,
        "maxX": grid_min_x + cols * tile_meters,
        "maxZ": grid_min_z + rows * tile_meters,
    }
    width = cols * tile_pixels
    height = rows * tile_pixels
    lon_west = ORIGIN_LON + grid["minX"] / M_PER_DEG_LON
    lon_east = ORIGIN_LON + grid["maxX"] / M_PER_DEG_LON
    lat_south = ORIGIN_LAT - grid["maxZ"] / M_PER_DEG_LAT
    lat_north = ORIGIN_LAT - grid["minZ"] / M_PER_DEG_LAT
    raw = reproject_raw(source, lon_west, lon_east, lat_south, lat_north, width, height)
    padded = np.pad(raw, ((border, border), (border, border), (0, 0)), mode="edge")
    image_pixels = tile_pixels + border * 2
    tiles_dir = out_dir / "tiles" / "05"
    tiles_dir.mkdir(parents=True, exist_ok=True)
    names: list[str] = []
    total_bytes = 0
    for row in range(rows):
        for col in range(cols):
            x0 = col * tile_pixels
            y0 = row * tile_pixels
            crop = padded[y0:y0 + image_pixels, x0:x0 + image_pixels]
            image_min_x = grid["minX"] + col * tile_meters - border * meters_per_pixel
            image_min_z = grid["minZ"] + row * tile_meters - border * meters_per_pixel
            image_max_x = image_min_x + image_pixels * meters_per_pixel
            image_max_z = image_min_z + image_pixels * meters_per_pixel
            illumination = sample_field(
                base_field, bounds, image_min_x, image_max_x, image_min_z, image_max_z,
                image_pixels, image_pixels,
            )
            graded = apply_grade(crop, illumination, base_target)
            path = tiles_dir / f"{col}_{row}.jpg"
            save_jpeg(graded, path, quality)
            names.append(f"05/{path.name}")
            total_bytes += path.stat().st_size

    manifest = {
        "version": 1,
        "level": "05",
        "tilePixels": tile_pixels,
        "borderPixels": border,
        "imagePixels": image_pixels,
        "metersPerPixel": meters_per_pixel,
        "tileMeters": tile_meters,
        "bounds": grid,
        "grid": {"cols": cols, "rows": rows},
        "count": len(names),
        "totalBytes": total_bytes,
        "tiles": names,
    }
    (out_dir / "tiles" / "manifest.json").write_text(
        json.dumps(manifest, indent=2), encoding="utf-8"
    )

    spawn_col = math.floor((SPAWN_X - grid["minX"]) / tile_meters)
    spawn_row = math.floor((SPAWN_Z - grid["minZ"]) / tile_meters)
    precache = []
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            col = spawn_col + dc
            row = spawn_row + dr
            if 0 <= col < cols and 0 <= row < rows:
                precache.append(f"05/{col}_{row}.jpg")

    return {
        "manifest": "tiles/manifest.json",
        "level": "05",
        "tilePixels": tile_pixels,
        "borderPixels": border,
        "imagePixels": image_pixels,
        "metersPerPixel": meters_per_pixel,
        "tileMeters": tile_meters,
        "bounds": grid,
        "grid": {"cols": cols, "rows": rows},
        "count": len(names),
        "totalBytes": total_bytes,
        "precache": precache,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", type=Path, help="0.5 m orthophoto GeoTIFF")
    parser.add_argument("--center", type=Path, help="0.2 m orthophoto GeoTIFF")
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parent.parent / "data" / "ground")
    parser.add_argument("--base-width", type=int, default=4096)
    parser.add_argument("--center-width", type=int, default=4096)
    parser.add_argument("--no-tiles", action="store_true", help="skip the 0.5 m near-field tile pyramid")
    parser.add_argument("--tile-pixels", type=int, default=512)
    parser.add_argument("--tile-border", type=int, default=4)
    parser.add_argument("--tile-quality", type=int, default=82)
    parser.add_argument("--tile-margin", type=float, default=64.0)
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    meta = {
        "version": 1,
        "origin": {"lat": ORIGIN_LAT, "lon": ORIGIN_LON},
        "license": "CC BY 4.0 — Regione Emilia-Romagna (RER 2023-24 orthophoto)",
        "attribution": ATTRIBUTION,
    }
    if args.base:
        base_meta, field, target = build_base(args.base, args.out, args.base_width)
        meta["base"] = base_meta
        print(f"✓ base {base_meta['levels'][0]['src']} ({base_meta['levels'][0]['width']}×{base_meta['levels'][0]['height']})")
        if not args.no_tiles:
            meta["tiles"] = build_tiles(
                args.base,
                args.out,
                base_meta,
                field,
                target,
                tile_pixels=args.tile_pixels,
                border=args.tile_border,
                quality=args.tile_quality,
                margin=args.tile_margin,
            )
            print(
                f"✓ tiles {meta['tiles']['count']} × {meta['tiles']['tileMeters']:.0f} m "
                f"({meta['tiles']['totalBytes'] / 1e6:.1f} MB)"
            )
    if args.center:
        meta["center"] = build_center(args.center, args.out, args.center_width)
        print(f"✓ centre {meta['center']['levels'][0]['src']} ({meta['center']['levels'][0]['width']}×{meta['center']['levels'][0]['height']})")

    (args.out / "ground.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    for path in sorted(args.out.glob("*.jpg")):
        print(f"  {path.name:24s} {path.stat().st_size / 1e6:6.2f} MB")
    if meta.get("tiles"):
        print(f"  tiles/05/                {meta['tiles']['totalBytes'] / 1e6:6.2f} MB")


if __name__ == "__main__":
    main()
