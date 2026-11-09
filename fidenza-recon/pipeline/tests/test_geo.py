from __future__ import annotations

import pytest
from fidenza_recon.geo import (
    GeoContext,
    ensure_ccw,
    facade_sides,
    min_rotated_rect,
    signed_area,
)
from shapely.geometry import Point, Polygon


def test_projection_roundtrip() -> None:
    ctx = GeoContext(10.0578098, 44.866476)
    lon, lat = ctx.local_to_lonlat(42.0, -17.5)
    x, z = ctx.lonlat_to_local(lon, lat)
    assert x == pytest.approx(42.0, abs=1e-6)
    assert z == pytest.approx(-17.5, abs=1e-6)


def test_ring_orientation() -> None:
    clockwise = [(0, 0), (0, 10), (10, 10), (10, 0)]
    ccw = ensure_ccw(clockwise)
    assert signed_area(ccw) > 0
    assert ccw[0] != ccw[-1]


def test_facade_normals_point_outward() -> None:
    polygon = Polygon([(0, 0), (12, 0), (12, 9), (0, 9)])
    sides = facade_sides(polygon)
    assert len(sides) == 4
    for side in sides:
        mid = (
            (side["p1"][0] + side["p2"][0]) / 2,
            (side["p1"][1] + side["p2"][1]) / 2,
        )
        normal = side["normal"]
        probe = Point(mid[0] + normal[0] * 0.5, mid[1] + normal[1] * 0.5)
        assert not polygon.contains(probe)


def test_min_rotated_rect_dimensions() -> None:
    polygon = Polygon([(0, 0), (20, 0), (20, 6), (0, 6)])
    rect = min_rotated_rect(polygon)
    assert rect["length_m"] == pytest.approx(20.0, abs=0.01)
    assert rect["width_m"] == pytest.approx(6.0, abs=0.01)
