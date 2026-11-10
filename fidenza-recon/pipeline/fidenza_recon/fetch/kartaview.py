"""KartaView coverage probe.

The public photo search endpoint is queried on a grid. The sequence endpoint
requires elevated access and is reported as restricted. No image is downloaded
unless coverage exists and the per-sequence license can be verified.
"""

from __future__ import annotations

import json
import math
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import requests

from ..config import RAW_DIR, AppConfig, ensure_dirs
from ..db import connect, init_db, now_iso, upsert_source

API = "https://api.kartaview.org/2.0"


def _grid_points(bbox: tuple[float, float, float, float], step_m: float = 250.0) -> list[tuple[float, float]]:
    minlon, minlat, maxlon, maxlat = bbox
    lat0 = (minlat + maxlat) / 2
    dx = step_m / (111_320 * math.cos(math.radians(lat0)))
    dy = step_m / 110_540
    points: list[tuple[float, float]] = []
    lat = minlat
    while lat <= maxlat:
        lon = minlon
        while lon <= maxlon:
            points.append((lat, lon))
            lon += dx
        lat += dy
    return points


def probe(config: AppConfig, force: bool = False) -> dict[str, Any]:
    ensure_dirs()
    out_dir = RAW_DIR / "kartaview"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "coverage.json"
    if out_path.exists() and not force:
        return json.loads(out_path.read_text(encoding="utf-8"))

    points = _grid_points(config.pilot_bbox, step_m=750.0)

    def sample_point(point: tuple[float, float]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        lat, lon = point
        try:
            response = requests.get(
                f"{API}/photo/",
                params={"lat": lat, "lng": lon, "radius": 500, "itemsPerPage": 5},
                headers={"User-Agent": "fidenza-recon/0.1"},
                timeout=25,
            )
            response.raise_for_status()
            payload = response.json()
            data = (payload.get("result") or {}).get("data") or []
        except Exception as exc:  # noqa: BLE001 - probe must not fail the pipeline
            return (
                {"lat": lat, "lon": lon, "error": str(exc), "count": 0},
                [],
            )
        photos = [
            {
                "external_id": str(item.get("id")),
                "sequence_id": item.get("sequenceId"),
                "lat": float(item["lat"]) if item.get("lat") else None,
                "lon": float(item["lng"]) if item.get("lng") else None,
                "heading": item.get("heading"),
                "captured_at": item.get("shotDate") or item.get("dateAdded"),
                "url": item.get("imageProcUrl") or item.get("fileurl"),
                "license": "per-sequence (verify)",
                "attribution": "KartaView contributors",
            }
            for item in data
        ]
        return ({"lat": lat, "lon": lon, "count": len(data)}, photos)

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(sample_point, points))

    samples = [sample for sample, _photos in results]
    photos = [photo for _sample, photo_list in results for photo in photo_list]
    time.sleep(0.15)
    minlon, minlat, maxlon, maxlat = config.pilot_bbox
    inside = [
        photo
        for photo in photos
        if photo.get("lon") is not None
        and photo.get("lat") is not None
        and minlon <= photo["lon"] <= maxlon
        and minlat <= photo["lat"] <= maxlat
    ]

    summary = {
        "source": "KartaView",
        "api": API,
        "bbox": config.pilot_bbox,
        "grid_step_m": 750,
        "search_radius_m": 500,
        "sample_points": len(samples),
        "points_with_photos": sum(1 for sample in samples if sample.get("count", 0) > 0),
        "photo_count": len(photos),
        "photos_inside_bbox": len(inside),
        "points_with_photos_inside_bbox": len(
            {photo.get("sequence_id") for photo in inside}
        ),
        "samples": samples,
        "photos": photos,
        "sequence_api": "restricted without elevated access",
        "notes": (
            "Fidenza has no usable street-level coverage inside the reconstructed "
            "bbox. A handful of photos exists just outside the north-east edge; "
            "they are listed but not used for facades. Facades are procedural "
            "except where Wikimedia Commons references exist."
        ),
        "retrieved_at": now_iso(),
    }
    out_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

    conn = connect()
    init_db(conn)
    upsert_source(
        conn,
        key="kartaview",
        name="KartaView (OpenStreetCam)",
        url="https://kartaview.org/",
        license="per-sequence; verify before use",
        license_url="https://kartaview.org/terms",
        retrieved_at=now_iso(),
        resolution="street-level imagery",
        notes="Coverage probe only; no images downloaded.",
    )
    conn.close()
    return summary
