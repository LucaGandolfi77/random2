from __future__ import annotations

import json
from pathlib import Path

import yaml
from fidenza_recon.db import (
    add_validation,
    connect,
    init_db,
    upsert_building,
    upsert_dataset,
    upsert_facades,
    upsert_imagery,
    upsert_source,
)
from fidenza_recon.export import db_dump


def _seed(tmp_path: Path) -> Path:
    db_path = tmp_path / "city.db"
    conn = connect(db_path)
    init_db(conn)
    upsert_source(
        conn,
        key="osm",
        name="OpenStreetMap",
        url="https://www.openstreetmap.org/",
        license="ODbL 1.0",
    )
    upsert_dataset(
        conn,
        source_key="osm",
        product="footprints",
        path=(
            "/Users/someone/Desktop/random2/fidenza-recon/"
            "data/raw/osm/buildings.geojson"
        ),
        crs="EPSG:4326",
        bbox="[10.0, 44.0, 10.1, 44.1]",
    )
    upsert_building(
        conn,
        {
            "osm_id": "way/1",
            "osm_type": "way",
            "name": "Test building",
            "footprint_json": {
                "outer": [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0]],
                "holes": [],
            },
            "height_m": 7.5,
            "procedural_flags": ["context_lod1"],
            "tags_json": {"building": "yes", "source": "survey"},
        },
    )
    upsert_facades(
        conn,
        "way/1",
        [
            {
                "index": 0,
                "length_m": 10.0,
                "bearing_deg": 90.0,
                "facing_deg": 0.0,
                "street_facing": True,
                "road_name": "Via Roma",
                "road_class": "residential",
                "layout": {"bays": 3, "windows": []},
                "source": "procedural",
            }
        ],
    )
    upsert_imagery(
        conn,
        {
            "source_key": "osm",
            "external_id": "photo-1",
            "kind": "reference_photo",
        },
    )
    add_validation(
        conn,
        osm_id="way/1",
        check_name="manual_review",
        status="review",
    )
    conn.close()
    return db_path


def test_export_json_converts_nested_fields(tmp_path) -> None:
    db_path = _seed(tmp_path)
    output = tmp_path / "export.json"

    summary = db_dump.export(
        output=output,
        db_path=db_path,
        include_timestamp=False,
    )

    assert summary["table_counts"] == {
        "sources": 1,
        "datasets": 1,
        "buildings": 1,
        "building_facades": 1,
        "imagery": 1,
        "validation": 1,
    }
    assert summary["row_count"] == 6

    payload = json.loads(output.read_text(encoding="utf-8"))
    assert payload["meta"]["generated_at"] is None
    assert payload["meta"]["source_database_sha256"]
    assert payload["meta"]["table_counts"]["buildings"] == 1
    assert payload["schema"]["buildings"]["ddl"].startswith("CREATE TABLE")

    building = payload["tables"]["buildings"][0]
    assert building["footprint"] == {
        "outer": [[0.0, 0.0], [1.0, 0.0], [1.0, 1.0]],
        "holes": [],
    }
    assert building["tags"] == {"building": "yes", "source": "survey"}
    assert building["procedural_flags"] == ["context_lod1"]
    assert "footprint_json" not in building
    assert "tags_json" not in building

    dataset = payload["tables"]["datasets"][0]
    assert dataset["bbox"] == [10.0, 44.0, 10.1, 44.1]
    assert dataset["path"] == "data/raw/osm/buildings.geojson"

    facade = payload["tables"]["building_facades"][0]
    assert facade["layout"] == {"bays": 3, "windows": []}
    assert facade["street_facing"] is True


def test_export_raw_and_selected_tables(tmp_path) -> None:
    db_path = _seed(tmp_path)
    output = tmp_path / "raw.json"

    summary = db_dump.export(
        output=output,
        db_path=db_path,
        tables=["buildings"],
        raw=True,
        include_timestamp=False,
    )

    assert summary["table_counts"] == {"buildings": 1}
    payload = json.loads(output.read_text(encoding="utf-8"))
    assert set(payload["tables"]) == {"buildings"}
    building = payload["tables"]["buildings"][0]
    assert json.loads(building["footprint_json"])["holes"] == []
    assert isinstance(building["procedural_flags"], str)
    assert "footprint" not in building


def test_export_yaml_jsonl_and_csv(tmp_path) -> None:
    db_path = _seed(tmp_path)

    yaml_path = tmp_path / "export.yaml"
    db_dump.export(fmt="yaml", output=yaml_path, db_path=db_path)
    yaml_payload = yaml.safe_load(yaml_path.read_text(encoding="utf-8"))
    assert yaml_payload["meta"]["table_counts"]["buildings"] == 1

    jsonl_dir = tmp_path / "jsonl"
    db_dump.export(fmt="jsonl", output=jsonl_dir, db_path=db_path)
    assert (jsonl_dir / "buildings.jsonl").exists()
    assert (jsonl_dir / "manifest.json").exists()
    first = json.loads(
        (jsonl_dir / "buildings.jsonl").read_text(encoding="utf-8").splitlines()[0]
    )
    assert first["osm_id"] == "way/1"

    csv_dir = tmp_path / "csv"
    db_dump.export(fmt="csv", output=csv_dir, db_path=db_path)
    assert (csv_dir / "buildings.csv").exists()
    assert "osm_id" in (csv_dir / "buildings.csv").read_text(encoding="utf-8")


def test_export_rejects_unknown_table(tmp_path) -> None:
    db_path = _seed(tmp_path)
    try:
        db_dump.export(output=tmp_path / "bad.json", db_path=db_path, tables=["nope"])
    except ValueError as error:
        assert "unknown table" in str(error)
    else:
        raise AssertionError("expected ValueError for an unknown table")
