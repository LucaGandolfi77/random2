from __future__ import annotations

from fidenza_recon.db import connect, init_db, upsert_building, upsert_dataset, upsert_source


def test_schema_and_upserts(tmp_path) -> None:
    conn = connect(tmp_path / "test.db")
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
        path="/tmp/buildings.geojson",
        crs="EPSG:4326",
    )
    upsert_dataset(
        conn,
        source_key="osm",
        product="footprints",
        path="/tmp/buildings.geojson",
        crs="EPSG:4326",
    )
    assert conn.execute("select count(*) from datasets").fetchone()[0] == 1
    upsert_building(
        conn,
        {
            "osm_id": "way/1",
            "osm_type": "way",
            "name": "Test",
            "height_m": 10.0,
            "height_source": "dsm_agea2008_minus_dtm_rer2023_24",
            "height_confidence": 0.72,
            "tier": "B",
            "procedural_flags": ["facade_window_layout"],
        },
    )
    upsert_building(
        conn,
        {
            "osm_id": "way/1",
            "osm_type": "way",
            "name": "Test updated",
            "height_m": 11.0,
            "height_source": "dsm_agea2008_minus_dtm_rer2023_24",
            "height_confidence": 0.72,
            "tier": "B",
        },
    )
    row = conn.execute("select name, height_m from buildings where osm_id = 'way/1'").fetchone()
    assert row["name"] == "Test updated"
    assert row["height_m"] == 11.0
    conn.close()
