"""Wikimedia Commons reference imagery for landmarks.

Requests are rate-limited and retried; only reference thumbnails are stored.
Images are used for visual validation, never projected onto arbitrary facades.
"""

from __future__ import annotations

import json
import re
import time
from typing import Any

import requests

from ..config import RAW_DIR, ensure_dirs
from ..db import connect, init_db, now_iso, upsert_imagery, upsert_source

API = "https://commons.wikimedia.org/w/api.php"
HEADERS = {
    "User-Agent": (
        "fidenza-recon/0.1 (provenance-first 3D reconstruction; "
        "contact: local research project)"
    )
}

CATEGORIES = [
    "Category:Duomo (Fidenza)",
    "Category:Churches in Fidenza",
    "Category:Buildings in Fidenza",
    "Category:Palaces in Fidenza",
    "Category:Theatres in Fidenza",
    "Category:City gates in Fidenza",
    "Category:Fidenza train station - Station building",
]

SEARCHES = [
    "Fidenza Duomo facciata",
    "Fidenza Porta San Donnino",
    "Teatro Magnani Fidenza",
    "Fidenza Piazza Duomo",
    "Fidenza centro storico",
]


def _api(params: dict[str, Any]) -> dict[str, Any]:
    payload = {
        "format": "json",
        "formatversion": "2",
        "action": "query",
        **params,
    }
    for attempt in range(5):
        response = requests.get(API, params=payload, headers=HEADERS, timeout=45)
        if response.status_code == 429:
            time.sleep(2.0 * (attempt + 1))
            continue
        response.raise_for_status()
        time.sleep(0.7)
        return response.json()
    raise RuntimeError("Wikimedia Commons rate limit persisted")


def _category_files(category: str, depth: int = 0, seen: set[str] | None = None) -> list[str]:
    seen = seen or set()
    if category in seen or depth > 2:
        return []
    seen.add(category)
    files: list[str] = []
    continuation: str | None = None
    while True:
        params: dict[str, Any] = {
            "list": "categorymembers",
            "cmtitle": category,
            "cmlimit": "100",
            "cmtype": "file|subcat",
        }
        if continuation:
            params["cmcontinue"] = continuation
        try:
            data = _api(params)
        except Exception:
            break
        members = data.get("query", {}).get("categorymembers", [])
        for member in members:
            if member.get("ns") == 6:
                files.append(member["title"])
            elif member.get("ns") == 14:
                files.extend(_category_files(member["title"], depth + 1, seen))
        continuation = data.get("continue", {}).get("cmcontinue")
        if not continuation:
            break
    return files


def _search_files(term: str, limit: int = 8) -> list[str]:
    try:
        data = _api(
            {
                "list": "search",
                "srsearch": term,
                "srnamespace": "6",
                "srlimit": str(limit),
            }
        )
    except Exception:
        return []
    return [item["title"] for item in data.get("query", {}).get("search", [])]


def _meta_value(meta: dict[str, Any], key: str) -> str | None:
    entry = meta.get(key) or {}
    raw = entry.get("value")
    if raw is None:
        return None
    return re.sub(r"<[^>]+>", "", str(raw)).strip()


def _image_info(titles: list[str]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for index in range(0, len(titles), 20):
        chunk = titles[index : index + 20]
        try:
            data = _api(
                {
                    "titles": "|".join(chunk),
                    "prop": "imageinfo|coordinates",
                    "iiprop": "url|extmetadata|size",
                    "iiurlwidth": "1200",
                }
            )
        except Exception:
            continue
        pages = data.get("query", {}).get("pages", [])
        for page in pages:
            info = (page.get("imageinfo") or [{}])[0]
            meta = info.get("extmetadata") or {}

            coords = (page.get("coordinates") or [{}])[0]
            records.append(
                {
                    "title": page.get("title"),
                    "page_url": info.get("descriptionurl"),
                    "thumb_url": info.get("thumburl"),
                    "width": info.get("thumbwidth") or info.get("width"),
                    "height": info.get("thumbheight") or info.get("height"),
                    "lat": coords.get("lat"),
                    "lon": coords.get("lon"),
                    "license": _meta_value(meta, "LicenseShortName"),
                    "license_url": _meta_value(meta, "LicenseUrl"),
                    "artist": _meta_value(meta, "Artist"),
                    "credit": _meta_value(meta, "Credit"),
                    "description": _meta_value(meta, "ImageDescription"),
                    "captured_at": _meta_value(meta, "DateTimeOriginal"),
                }
            )
    return records


def _store_imagery(records: list[dict[str, Any]]) -> None:
    conn = connect()
    init_db(conn)
    upsert_source(
        conn,
        key="wikimedia_commons",
        name="Wikimedia Commons",
        url="https://commons.wikimedia.org/",
        license="per-file (CC BY / CC BY-SA / public domain)",
        license_url="https://commons.wikimedia.org/wiki/Commons:Licensing",
        retrieved_at=now_iso(),
        resolution="reference photography",
        notes="Validation references; attribution preserved per file.",
    )
    conn.execute("DELETE FROM imagery WHERE source_key = 'wikimedia_commons'")
    for record in records:
        upsert_imagery(
            conn,
            {
                "source_key": "wikimedia_commons",
                "external_id": record.get("title"),
                "kind": "reference_photo",
                "lat": record.get("lat"),
                "lon": record.get("lon"),
                "captured_at": record.get("captured_at"),
                "license": record.get("license"),
                "attribution": record.get("artist") or record.get("credit"),
                "url": record.get("page_url"),
                "local_path": record.get("local_path"),
                "notes": record.get("description"),
            },
        )
    conn.close()


def fetch(force: bool = False) -> dict[str, Any]:
    ensure_dirs()
    out_dir = RAW_DIR / "commons"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "commons.json"
    if out_path.exists() and not force:
        payload = json.loads(out_path.read_text(encoding="utf-8"))
        if payload.get("file_count"):
            _store_imagery(payload.get("files", []))
            return payload

    titles: set[str] = set()
    for category in CATEGORIES:
        titles.update(_category_files(category))
    for term in SEARCHES:
        titles.update(_search_files(term))
    ordered = sorted(titles)[:60]
    records = _image_info(ordered) if ordered else []
    records = [record for record in records if record.get("thumb_url")][:48]

    image_dir = out_dir / "images"
    image_dir.mkdir(exist_ok=True)
    for record in records:
        safe = re.sub(r"[^A-Za-z0-9._-]+", "_", record["title"].removeprefix("File:"))[:120]
        target = image_dir / safe
        record["local_path"] = str(target.relative_to(out_dir))
        if target.exists():
            continue
        try:
            response = requests.get(record["thumb_url"], headers=HEADERS, timeout=60)
            response.raise_for_status()
            target.write_bytes(response.content)
            time.sleep(0.35)
        except Exception:  # noqa: BLE001 - reference image is optional
            record["local_path"] = None

    payload = {
        "source": "Wikimedia Commons",
        "categories": CATEGORIES,
        "searches": SEARCHES,
        "file_count": len(records),
        "files": records,
        "retrieved_at": now_iso(),
        "usage": "validation reference only; not used as facade textures",
    }
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    _store_imagery(records)
    return payload
