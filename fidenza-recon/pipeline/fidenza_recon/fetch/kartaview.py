"""KartaView coverage probe.

The public photo search endpoint is queried on a grid. The sequence endpoint
requires elevated access and is reported as restricted. No image is downloaded
unless coverage exists and the per-sequence license can be verified.
"""

from __future__ import annotations

import json
import math
import time
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

    points = _grid_points(config.pilot_bbox, step_m=200.0)
    samples: list[dict[str, Any]] = []
    photos: list[dict[str, Any]] = []
    for lat, lon in points:
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
            samples.append({"lat": lat, "lon": lon, "error": str(exc), "count": 0})
            continue
        samples.append({"lat": lat, "lon": lon, "count": len(data)})
        for item in data:
            photos.append(
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
            )
        time.sleep(0.15)

    summary = {
        "source": "KartaView",
        "api": API,
        "bbox": config.pilot_bbox,
        "grid_step_m": 200,
        "search_radius_m": 500,
        "sample_points": len(samples),
        "points_with_photos": sum(1 for sample in samples if sample.get("count", 0) > 0),
        "photo_count": len(photos),
        "samples": samples,
        "photos": photos,
        "sequence_api": "restricted without elevated access",
        "notes": (
            "Fidenza has no usable street-level coverage in the public KartaView "
            "photo endpoint. Facades are therefore procedural except where "
            "Wikimedia Commons references exist."
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
