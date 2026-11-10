"""Export the SQLite provenance database to portable formats."""

from __future__ import annotations

import csv
import hashlib
import io
import json
import sqlite3
from collections.abc import Iterable
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import quote

import yaml

from ..config import DB_DIR, PROJECT_ROOT

DEFAULT_TABLES = (
    "sources",
    "datasets",
    "buildings",
    "building_facades",
    "imagery",
    "validation",
)
FORMATS = ("json", "yaml", "jsonl", "csv")

JSON_COLUMNS = {
    "datasets": ("bbox",),
    "buildings": ("footprint_json", "procedural_flags", "tags_json"),
    "building_facades": ("layout_json",),
}
FIELD_RENAMES = {
    "buildings": {"footprint_json": "footprint", "tags_json": "tags"},
    "building_facades": {"layout_json": "layout"},
}
TRANSFORMATIONS = {
    "datasets": {
        "bbox": {"decode": "json"},
        "path": {"normalize": "project_relative"},
    },
    "buildings": {
        "footprint_json": {"decode": "json", "rename": "footprint"},
        "procedural_flags": {"decode": "json"},
        "tags_json": {"decode": "json", "rename": "tags"},
    },
    "building_facades": {
        "layout_json": {"decode": "json", "rename": "layout"},
        "street_facing": {"cast": "boolean"},
    },
}
RELATIONS = [
    {"from": "datasets.source_key", "to": "sources.key"},
    {"from": "building_facades.osm_id", "to": "buildings.osm_id"},
    {"from": "imagery.source_key", "to": "sources.key"},
    {"from": "validation.osm_id", "to": "buildings.osm_id"},
]


def _quote(identifier: str) -> str:
    return '"' + identifier.replace('"', '""') + '"'


def _relative_path(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(PROJECT_ROOT.resolve()))
    except ValueError:
        return str(path)


def _portable_path(value: str | None) -> str | None:
    if not value:
        return value
    path = Path(value)
    if not path.is_absolute():
        return value
    try:
        return str(path.resolve().relative_to(PROJECT_ROOT.resolve()))
    except ValueError:
        marker = f"/{PROJECT_ROOT.name}/"
        if marker in value:
            return value.split(marker, 1)[1]
        return value


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _table_columns(conn: sqlite3.Connection, table: str) -> list[dict[str, Any]]:
    columns = []
    for row in conn.execute(f"PRAGMA table_info({_quote(table)})"):
        columns.append(
            {
                "name": row["name"],
                "type": row["type"],
                "not_null": bool(row["notnull"]),
                "primary_key": bool(row["pk"]),
                "default": row["dflt_value"],
            }
        )
    return columns


def _table_ddl(conn: sqlite3.Connection, table: str) -> str | None:
    row = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table,),
    ).fetchone()
    return row["sql"] if row else None


def _table_rows(
    conn: sqlite3.Connection,
    table: str,
    columns: list[dict[str, Any]],
) -> list[sqlite3.Row]:
    primary_key = [column["name"] for column in columns if column["primary_key"]]
    order = ", ".join(_quote(name) for name in primary_key) if primary_key else "rowid"
    return conn.execute(f"SELECT * FROM {_quote(table)} ORDER BY {order}").fetchall()


def _decode_json(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def _convert_row(table: str, row: sqlite3.Row, raw: bool) -> dict[str, Any]:
    converted: dict[str, Any] = {}
    for column in row.keys():
        value = row[column]
        target = column
        if not raw:
            target = FIELD_RENAMES.get(table, {}).get(column, column)
            if column in JSON_COLUMNS.get(table, ()):
                value = _decode_json(value)
            if table == "building_facades" and column == "street_facing":
                value = None if value is None else bool(value)
            if table == "datasets" and column == "path":
                value = _portable_path(value)
        converted[target] = value
    return converted


def build_payload(
    db_path: Path | None = None,
    tables: Iterable[str] | None = None,
    raw: bool = False,
    include_timestamp: bool = True,
) -> dict[str, Any]:
    """Read the database and build the JSON-serialisable export payload."""
    database = Path(db_path) if db_path else DB_DIR / "city.db"
    if not database.exists():
        raise FileNotFoundError(f"database not found: {database}")

    selected = tuple(tables) if tables else DEFAULT_TABLES
    unknown = sorted(set(selected) - set(DEFAULT_TABLES))
    if unknown:
        raise ValueError(f"unknown table(s): {', '.join(unknown)}")

    uri = f"file:{quote(str(database.resolve()))}?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    try:
        schema: dict[str, Any] = {}
        data: dict[str, list[dict[str, Any]]] = {}
        counts: dict[str, int] = {}
        for table in selected:
            columns = _table_columns(conn, table)
            rows = _table_rows(conn, table, columns)
            schema[table] = {"ddl": _table_ddl(conn, table), "columns": columns}
            data[table] = [_convert_row(table, row, raw) for row in rows]
            counts[table] = len(rows)
    finally:
        conn.close()

    generated_at = None
    if include_timestamp:
        generated_at = datetime.now(UTC).replace(microsecond=0).isoformat()

    meta = {
        "format": "fidenza-recon-db",
        "version": 1,
        "generated_at": generated_at,
        "source_database": _relative_path(database),
        "source_database_sha256": _sha256(database),
        "table_counts": counts,
        "row_count": sum(counts.values()),
        "field_names": {} if raw else FIELD_RENAMES,
        "transformations": {} if raw else TRANSFORMATIONS,
        "relations": RELATIONS,
    }
    return {"meta": meta, "schema": schema, "tables": data}


def _json_text(payload: dict[str, Any], indent: int) -> str:
    if indent > 0:
        return json.dumps(payload, ensure_ascii=False, indent=indent) + "\n"
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n"


def _yaml_text(payload: dict[str, Any]) -> str:
    return yaml.safe_dump(
        payload,
        sort_keys=False,
        allow_unicode=True,
        default_flow_style=False,
        width=120,
    )


def _atomic_write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(text, encoding="utf-8")
    temporary.replace(path)


def _default_output(fmt: str) -> Path:
    base = DB_DIR / "exports"
    if fmt in {"json", "yaml"}:
        return base / f"fidenza-city-db.{fmt}"
    return base / f"fidenza-city-db-{fmt}"


def _csv_value(value: Any) -> Any:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return value


def _write_table_directory(
    payload: dict[str, Any],
    target: Path,
    fmt: str,
) -> None:
    target.mkdir(parents=True, exist_ok=True)
    renames = payload["meta"]["field_names"]
    files: dict[str, str] = {}
    for table, rows in payload["tables"].items():
        columns = payload["schema"][table]["columns"]
        headers = [
            renames.get(table, {}).get(column["name"], column["name"])
            for column in columns
        ]
        if fmt == "jsonl":
            path = target / f"{table}.jsonl"
            lines = [
                json.dumps(row, ensure_ascii=False, separators=(",", ":"))
                for row in rows
            ]
            text = "\n".join(lines)
            _atomic_write(path, text + ("\n" if text else ""))
        else:
            path = target / f"{table}.csv"
            buffer = io.StringIO()
            writer = csv.DictWriter(buffer, fieldnames=headers, extrasaction="ignore")
            writer.writeheader()
            for row in rows:
                writer.writerow({key: _csv_value(row.get(key)) for key in headers})
            _atomic_write(path, buffer.getvalue())
        files[table] = path.name

    manifest = {
        "meta": payload["meta"],
        "schema": payload["schema"],
        "files": files,
    }
    _atomic_write(target / "manifest.json", _json_text(manifest, 2))


def export(
    fmt: str = "json",
    output: Path | None = None,
    db_path: Path | None = None,
    tables: Iterable[str] | None = None,
    raw: bool = False,
    include_timestamp: bool = True,
    indent: int = 2,
) -> dict[str, Any]:
    """Export the database and return a small summary of what was written."""
    fmt = fmt.lower()
    if fmt not in FORMATS:
        raise ValueError(f"unsupported format: {fmt}; choose from {', '.join(FORMATS)}")

    payload = build_payload(
        db_path=db_path,
        tables=tables,
        raw=raw,
        include_timestamp=include_timestamp,
    )
    target = Path(output) if output else _default_output(fmt)

    if fmt in {"json", "yaml"}:
        if target.exists() and target.is_dir():
            target = target / _default_output(fmt).name
        elif not target.suffix:
            target = target.with_suffix(f".{fmt}")
        text = _json_text(payload, indent) if fmt == "json" else _yaml_text(payload)
        _atomic_write(target, text)
    else:
        if target.exists() and target.is_file():
            raise ValueError(f"output for {fmt} must be a directory: {target}")
        _write_table_directory(payload, target, fmt)

    return {
        "format": fmt,
        "path": str(target),
        "table_counts": payload["meta"]["table_counts"],
        "row_count": payload["meta"]["row_count"],
    }
