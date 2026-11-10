from __future__ import annotations

import numpy as np
import rasterio
from fidenza_recon.config import load_config
from fidenza_recon.generate.city import (
    _chunk_bounds,
    _chunk_key,
    _massing_record,
    _massing_sides,
    _sample_grid,
)
from fidenza_recon.geo import GeoContext
from rasterio.transform import from_origin


def _building(**overrides) -> dict:
    record = {
        "id": "way/1",
        "osm_id": "way/1",
        "detail": "pilot",
        "name": "Casa di prova",
        "archetype": "historic_townhouse",
        "style_label": "Casa urbana",
        "category": "residential",
        "landmark": False,
        "tier": "B",
        "tags": {"building": "yes"},
        "centroid_local": [12.0, 34.0],
        "centroid_lonlat": [10.05, 44.86],
        "footprint": [[-4.0, -3.0], [4.0, -3.0], [4.0, 3.0], [-4.0, 3.0]],
        "holes": [],
        "min_rect": {
            "corners": [[-4.0, -3.0], [4.0, -3.0], [4.0, 3.0], [-4.0, 3.0]],
            "length_m": 8.0,
            "width_m": 6.0,
            "angle_deg": 0.0,
        },
        "area_m2": 48.0,
        "base_y": 1.2,
        "height_m": 9.0,
        "eave_height_m": 8.0,
        "roof_height_m": 1.0,
        "floors": 3,
        "ground_floor_height_m": 4.0,
        "upper_floor_height_m": 3.0,
        "roof": {
            "shape": "gabled",
            "pitch_deg": 20.0,
            "overhang_m": 0.4,
            "colour": "#9a5b45",
            "material": "tiles",
            "ridge_deg": 0.0,
            "confidence": 0.7,
        },
        "facade": {
            "primary": "#cdb794",
            "secondary": ["#d8c4a5"],
            "material": "plaster",
            "roughness": 0.9,
            "metalness": 0.0,
        },
        "sides": [],
        "height_source": "dsm_agea2008_minus_dtm_rer2023_24",
        "height_confidence": 0.64,
        "archetype_confidence": 0.45,
        "geometry_confidence": 0.9,
        "texture_confidence": 0.0,
    }
    record.update(overrides)
    return record


def test_chunk_keys_and_bounds_are_stable() -> None:
    key = _chunk_key(119.9, -0.1, 120.0)
    assert key == "0_-1"
    assert _chunk_bounds(key, 120.0) == [0.0, -120.0, 120.0, 0.0]


def test_massing_record_keeps_lod1_sides_without_facade_layout() -> None:
    record = _massing_record(_building(), "0_0")
    assert record["chunk"] == "0_0"
    assert record["height_m"] == 9.0
    assert record["roof"]["shape"] == "gabled"
    assert len(record["sides"]) == 4
    assert all("layout" not in side for side in record["sides"])
    assert "procedural_flags" in record


def test_massing_sides_reconstruct_empty_footprint_sides() -> None:
    sides = _massing_sides(_building())
    assert len(sides) == 4
    assert sum(side["length_m"] for side in sides) == 28.0


def test_terrain_grid_keeps_north_at_min_z(tmp_path) -> None:
    config = load_config()
    context = GeoContext(config.origin[0], config.origin[1], config.crs_metric)
    origin_x, origin_y = context.origin_metric
    transform = from_origin(origin_x - 60, origin_y + 60, 1, 1)
    north_up = np.fromfunction(
        lambda row, _col: (origin_y + 60 - row) - origin_y,
        (120, 120),
        dtype="float32",
    )
    path = tmp_path / "dtm.tif"
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        width=120,
        height=120,
        count=1,
        dtype="float32",
        crs=config.crs_metric,
        transform=transform,
    ) as dataset:
        dataset.write(north_up, 1)

    terrain = _sample_grid(path, context, (-40.0, -40.0, 40.0, 40.0), 4, 4)
    first_row = terrain["heights"][:5]
    last_row = terrain["heights"][-5:]
    assert all(value > 30 for value in first_row)
    assert all(value < -30 for value in last_row)
