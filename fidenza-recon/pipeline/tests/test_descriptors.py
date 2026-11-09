from __future__ import annotations

import json

import pytest
from fidenza_recon.config import load_config
from fidenza_recon.generate.descriptors import _floors, _layout_side, _seed


def _side(length: float = 12.0) -> dict:
    return {
        "index": 2,
        "p1": [0.0, 0.0],
        "p2": [length, 0.0],
        "length_m": length,
        "bearing_deg": 90.0,
        "facing_deg": 90.0,
        "normal": [0.0, 1.0],
        "street_facing": True,
        "road_name": "Via di prova",
        "road_class": "residential",
    }


def test_floor_segmentation_is_continuous() -> None:
    config = load_config()
    floors = _floors(14.0, config.archetype("neoclassical_palazzo"))
    assert floors["levels"][0]["y0"] == 0.0
    assert floors["levels"][-1]["y1"] == pytest.approx(14.0)
    for lower, upper in zip(floors["levels"], floors["levels"][1:], strict=False):
        assert lower["y1"] == upper["y0"]


def test_facade_layout_is_deterministic_and_bounded() -> None:
    config = load_config()
    archetype = config.archetype("neoclassical_palazzo")
    floors = _floors(14.0, archetype)
    side = _side(12.0)
    first = _layout_side(archetype, side, floors, _seed("way/1"), True, None)
    second = _layout_side(archetype, side, floors, _seed("way/1"), True, None)
    assert json.dumps(first, sort_keys=True) == json.dumps(second, sort_keys=True)
    assert first["window_count"] > 0
    for window in first["windows"]:
        assert 0.0 <= window["u"] <= 12.0
        assert window["v"] >= 0.0
        assert window["v"] + window["height"] <= floors["levels"][-1]["y1"] + 0.01
        assert window["width"] > 0.0
        assert window["height"] > 0.0
    for door in first["doors"]:
        assert 0.0 <= door["u"] <= 12.0
        assert door["height"] <= floors["ground_height"] + 0.01


def test_gate_has_archway_and_no_windows() -> None:
    config = load_config()
    archetype = config.archetype("city_gate")
    floors = _floors(12.0, archetype)
    layout = _layout_side(archetype, _side(9.0), floors, _seed("way/2"), True, "city_gate")
    assert layout["window_count"] == 0
    assert layout["doors"][0]["type"] == "archway"


def test_tiny_side_is_left_empty() -> None:
    config = load_config()
    archetype = config.archetype("historic_townhouse")
    floors = _floors(10.0, archetype)
    layout = _layout_side(archetype, _side(1.4), floors, _seed("way/3"), False, None)
    assert layout["window_count"] == 0
    assert layout["balcony_count"] == 0
