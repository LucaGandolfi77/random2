"""SQLite metadata and provenance store."""

from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .config import DB_DIR

SCHEMA = """
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    url TEXT,
    license TEXT,
    license_url TEXT,
    retrieved_at TEXT,
    published_at TEXT,
    resolution TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS datasets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_key TEXT NOT NULL,
    product TEXT NOT NULL,
    path TEXT,
    crs TEXT,
    bbox TEXT,
    checksum TEXT,
    retrieved_at TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS buildings (
    osm_id TEXT PRIMARY KEY,
    osm_type TEXT,
    name TEXT,
    footprint_json TEXT,
    centroid_lon REAL,
    centroid_lat REAL,
    area_m2 REAL,
    perimeter_m REAL,
    orientation_deg REAL,
    height_m REAL,
    eave_height_m REAL,
    roof_height_m REAL,
    height_source TEXT,
    height_confidence REAL,
    floors INTEGER,
    floor_height_m REAL,
    ground_elevation_m REAL,
    roof_shape TEXT,
    roof_colour TEXT,
    roof_material TEXT,
    archetype TEXT,
    archetype_confidence REAL,
    geometry_confidence REAL,
    texture_confidence REAL,
    tier TEXT,
    procedural_flags TEXT,
    tags_json TEXT,
    source_dataset TEXT,
    source_url TEXT,
    license TEXT,
    image_reference TEXT,
    facade_source TEXT,
    facade_primary_colour TEXT,
    facade_material TEXT,
    window_count INTEGER,
    balcony_count INTEGER,
    construction_period TEXT,
    last_verified TEXT
);

CREATE TABLE IF NOT EXISTS building_facades (
    osm_id TEXT NOT NULL,
    side_index INTEGER NOT NULL,
    length_m REAL,
    bearing_deg REAL,
    facing_deg REAL,
    street_facing INTEGER,
    road_name TEXT,
    road_class TEXT,
    layout_json TEXT,
    source TEXT,
    PRIMARY KEY (osm_id, side_index)
);

CREATE TABLE IF NOT EXISTS imagery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_key TEXT,
    external_id TEXT,
    kind TEXT,
    lat REAL,
    lon REAL,
    heading REAL,
    captured_at TEXT,
    license TEXT,
    attribution TEXT,
    url TEXT,
    local_path TEXT,
    sequence_id TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS validation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    osm_id TEXT,
    check_name TEXT,
    reference TEXT,
    measured TEXT,
    error TEXT,
    status TEXT,
    checked_at TEXT,
    notes TEXT
);
"""


def now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def connect(path: Path | None = None) -> sqlite3.Connection:
    target = path or (DB_DIR / "city.db")
    target.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(target)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    # Forward-compatible migration for databases created by earlier builds.
    for column, definition in (
        ("source_dataset", "TEXT"),
        ("source_url", "TEXT"),
        ("license", "TEXT"),
        ("image_reference", "TEXT"),
        ("facade_source", "TEXT"),
        ("facade_primary_colour", "TEXT"),
        ("facade_material", "TEXT"),
        ("window_count", "INTEGER"),
        ("balcony_count", "INTEGER"),
        ("construction_period", "TEXT"),
    ):
        try:
            conn.execute(f"ALTER TABLE buildings ADD COLUMN {column} {definition}")
        except sqlite3.OperationalError:
            pass
    conn.commit()


def upsert_source(conn: sqlite3.Connection, **row: Any) -> None:
    keys = [
        "key",
        "name",
        "url",
        "license",
        "license_url",
        "retrieved_at",
        "published_at",
        "resolution",
        "notes",
    ]
    values = [row.get(k) for k in keys]
    conn.execute(
        f"""
        INSERT INTO sources ({", ".join(keys)}) VALUES ({", ".join("?" for _ in keys)})
        ON CONFLICT(key) DO UPDATE SET
            name=excluded.name, url=excluded.url, license=excluded.license,
            license_url=excluded.license_url, retrieved_at=excluded.retrieved_at,
            published_at=excluded.published_at, resolution=excluded.resolution,
            notes=excluded.notes
        """,
        values,
    )
    conn.commit()


def upsert_dataset(conn: sqlite3.Connection, **row: Any) -> None:
    keys = ["source_key", "product", "path", "crs", "bbox", "checksum", "retrieved_at", "notes"]
    conn.execute(
        "DELETE FROM datasets WHERE source_key = ? AND product = ?",
        (row.get("source_key"), row.get("product")),
    )
    conn.execute(
        f"""
        INSERT INTO datasets ({", ".join(keys)}) VALUES ({", ".join("?" for _ in keys)})
        """,
        [row.get(k) for k in keys],
    )
    conn.commit()


def upsert_building(conn: sqlite3.Connection, row: dict[str, Any]) -> None:
    keys = [
        "osm_id",
        "osm_type",
        "name",
        "footprint_json",
        "centroid_lon",
        "centroid_lat",
        "area_m2",
        "perimeter_m",
        "orientation_deg",
        "height_m",
        "eave_height_m",
        "roof_height_m",
        "height_source",
        "height_confidence",
        "floors",
        "floor_height_m",
        "ground_elevation_m",
        "roof_shape",
        "roof_colour",
        "roof_material",
        "archetype",
        "archetype_confidence",
        "geometry_confidence",
        "texture_confidence",
        "tier",
        "procedural_flags",
        "tags_json",
        "source_dataset",
        "source_url",
        "license",
        "image_reference",
        "facade_source",
        "facade_primary_colour",
        "facade_material",
        "window_count",
        "balcony_count",
        "construction_period",
        "last_verified",
    ]
    values = []
    for key in keys:
        value = row.get(key)
        if key in ("footprint_json", "procedural_flags", "tags_json") and not isinstance(value, str):
            value = json.dumps(value, ensure_ascii=False) if value is not None else None
        values.append(value)
    conn.execute(
        f"""
        INSERT INTO buildings ({", ".join(keys)}) VALUES ({", ".join("?" for _ in keys)})
        ON CONFLICT(osm_id) DO UPDATE SET
            {", ".join(f"{k}=excluded.{k}" for k in keys if k != "osm_id")}
        """,
        values,
    )
    conn.commit()


def upsert_facades(conn: sqlite3.Connection, osm_id: str, sides: list[dict[str, Any]]) -> None:
    conn.execute("DELETE FROM building_facades WHERE osm_id = ?", (osm_id,))
    for side in sides:
        conn.execute(
            """
            INSERT INTO building_facades
            (osm_id, side_index, length_m, bearing_deg, facing_deg, street_facing,
             road_name, road_class, layout_json, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                osm_id,
                side.get("index"),
                side.get("length_m"),
                side.get("bearing_deg"),
                side.get("facing_deg"),
                1 if side.get("street_facing") else 0,
                side.get("road_name"),
                side.get("road_class"),
                json.dumps(side.get("layout"), ensure_ascii=False) if side.get("layout") else None,
                side.get("source", "procedural"),
            ),
        )
    conn.commit()


def upsert_imagery(conn: sqlite3.Connection, row: dict[str, Any]) -> None:
    keys = [
        "source_key",
        "external_id",
        "kind",
        "lat",
        "lon",
        "heading",
        "captured_at",
        "license",
        "attribution",
        "url",
        "local_path",
        "sequence_id",
        "notes",
    ]
    conn.execute(
        f"INSERT INTO imagery ({', '.join(keys)}) VALUES ({', '.join('?' for _ in keys)})",
        [row.get(k) for k in keys],
    )
    conn.commit()


def add_validation(conn: sqlite3.Connection, **row: Any) -> None:
    keys = ["osm_id", "check_name", "reference", "measured", "error", "status", "checked_at", "notes"]
    conn.execute(
        f"INSERT INTO validation ({', '.join(keys)}) VALUES ({', '.join('?' for _ in keys)})",
        [row.get(k) for k in keys],
    )
    conn.commit()
