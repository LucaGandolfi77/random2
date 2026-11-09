"""Geometric helpers.

Runtime coordinates are local metres: x = east, z = south, y = up.
Shapely operations on the ground plane treat (x, z) as ordinary 2D (x, y).
"""

from __future__ import annotations

import math
from collections.abc import Iterable
from dataclasses import dataclass

from pyproj import Transformer
from shapely.geometry import MultiPolygon, Polygon, shape
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform as shapely_transform

Point2 = tuple[float, float]


@dataclass(frozen=True)
class GeoContext:
    origin_lon: float
    origin_lat: float
    crs_metric: str = "EPSG:7791"

    def __post_init__(self) -> None:
        object.__setattr__(
            self, "_to_metric", Transformer.from_crs("EPSG:4326", self.crs_metric, always_xy=True)
        )
        object.__setattr__(
            self, "_to_wgs84", Transformer.from_crs(self.crs_metric, "EPSG:4326", always_xy=True)
        )
        ox, oy = self._to_metric.transform(self.origin_lon, self.origin_lat)
        object.__setattr__(self, "_origin_metric", (ox, oy))

    @property
    def origin_metric(self) -> Point2:
        return self._origin_metric

    def lonlat_to_metric(self, lon: float, lat: float) -> Point2:
        return self._to_metric.transform(lon, lat)

    def metric_to_lonlat(self, x: float, y: float) -> Point2:
        return self._to_wgs84.transform(x, y)

    def lonlat_to_local(self, lon: float, lat: float) -> Point2:
        x, y = self.lonlat_to_metric(lon, lat)
        return x - self._origin_metric[0], -(y - self._origin_metric[1])

    def local_to_lonlat(self, x: float, z: float) -> Point2:
        return self.metric_to_lonlat(self._origin_metric[0] + x, self._origin_metric[1] - z)

    def local_to_metric(self, x: float, z: float) -> Point2:
        return self._origin_metric[0] + x, self._origin_metric[1] - z

    def metric_to_local(self, x: float, y: float) -> Point2:
        return x - self._origin_metric[0], -(y - self._origin_metric[1])

    def bbox_local(self, bbox_wgs84: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
        minlon, minlat, maxlon, maxlat = bbox_wgs84
        p1 = self.lonlat_to_local(minlon, minlat)
        p2 = self.lonlat_to_local(maxlon, maxlat)
        return min(p1[0], p2[0]), min(p1[1], p2[1]), max(p1[0], p2[0]), max(p1[1], p2[1])

    def bbox_metric(self, bbox_wgs84: tuple[float, float, float, float]) -> tuple[float, float, float, float]:
        minlon, minlat, maxlon, maxlat = bbox_wgs84
        p1 = self.lonlat_to_metric(minlon, minlat)
        p2 = self.lonlat_to_metric(maxlon, maxlat)
        return min(p1[0], p2[0]), min(p1[1], p2[1]), max(p1[0], p2[0]), max(p1[1], p2[1])


def geometry_to_local(geom: BaseGeometry, ctx: GeoContext) -> BaseGeometry:
    """Project a WGS84 geometry into local metres (x, z)."""

    def _project(x: float, y: float, z: float | None = None) -> Point2:
        lx, lz = ctx.lonlat_to_local(x, y)
        return lx, lz

    return shapely_transform(_project, geom)


def geometry_to_metric(geom_4326: BaseGeometry, ctx: GeoContext) -> BaseGeometry:
    """Project a WGS84 geometry into the metric CRS (x, y north)."""

    def _project(x: float, y: float, z: float | None = None) -> Point2:
        return ctx.lonlat_to_metric(x, y)

    return shapely_transform(_project, geom_4326)


def signed_area(ring: Iterable[Point2]) -> float:
    points = list(ring)
    if len(points) < 3:
        return 0.0
    total = 0.0
    for i, (x1, z1) in enumerate(points):
        x2, z2 = points[(i + 1) % len(points)]
        total += x1 * z2 - x2 * z1
    return total / 2.0


def ensure_ccw(ring: list[Point2]) -> list[Point2]:
    if ring and ring[0] == ring[-1]:
        ring = ring[:-1]
    return ring if signed_area(ring) >= 0 else list(reversed(ring))


def polygon_rings(poly: Polygon) -> tuple[list[Point2], list[list[Point2]]]:
    outer = ensure_ccw([(float(x), float(z)) for x, z in poly.exterior.coords])
    holes = [ensure_ccw([(float(x), float(z)) for x, z in ring.coords]) for ring in poly.interiors]
    return outer, holes


def bearing_deg(p1: Point2, p2: Point2) -> float:
    dx = p2[0] - p1[0]
    dz = p2[1] - p1[1]
    return (math.degrees(math.atan2(dx, -dz)) + 360.0) % 360.0


def distance_m(a: Point2, b: Point2) -> float:
    return math.hypot(b[0] - a[0], b[1] - a[1])


def merge_collinear_edges(
    ring: list[Point2], angle_tol_deg: float = 7.0, min_length_m: float = 1.2
) -> list[tuple[Point2, Point2]]:
    """Merge nearly collinear consecutive ring edges into facade segments."""

    if len(ring) < 3:
        return []
    edges = [(ring[i], ring[(i + 1) % len(ring)]) for i in range(len(ring))]
    edges = [(a, b) for a, b in edges if distance_m(a, b) >= 0.05]
    if not edges:
        return []

    merged: list[tuple[Point2, Point2]] = []
    start, end = edges[0]
    prev_angle = bearing_deg(start, end)
    for nxt_start, nxt_end in edges[1:]:
        angle = bearing_deg(nxt_start, nxt_end)
        diff = abs((angle - prev_angle + 180.0) % 360.0 - 180.0)
        if nxt_start == end and diff <= angle_tol_deg:
            end = nxt_end
        else:
            merged.append((start, end))
            start, end = nxt_start, nxt_end
        prev_angle = angle
    merged.append((start, end))

    # Merge wrapped first/last when collinear.
    if len(merged) > 2:
        a1, b1 = merged[0]
        a2, b2 = merged[-1]
        diff = abs((bearing_deg(a2, b2) - bearing_deg(a1, b1) + 180.0) % 360.0 - 180.0)
        if b2 == a1 and diff <= angle_tol_deg:
            merged[0] = (a2, b1)
            merged.pop()

    return [(a, b) for a, b in merged if distance_m(a, b) >= min_length_m]


def outward_normal(poly: Polygon, p1: Point2, p2: Point2) -> Point2:
    """Return the unit normal of edge p1->p2 pointing away from the polygon."""

    dx = p2[0] - p1[0]
    dz = p2[1] - p1[1]
    length = math.hypot(dx, dz) or 1.0
    normal = (dz / length, -dx / length)
    mid = ((p1[0] + p2[0]) / 2.0, (p1[1] + p2[1]) / 2.0)
    from shapely.geometry import Point

    probe = Point(mid[0] + normal[0] * 0.25, mid[1] + normal[1] * 0.25)
    if poly.contains(probe) or poly.covers(probe):
        return (-normal[0], -normal[1])
    return normal


def orient_wall(poly: Polygon, p1: Point2, p2: Point2) -> tuple[Point2, Point2, Point2]:
    """Order a wall so that local +X = p2-p1 and local +Z = outward normal.

    With a Y-up right-handed frame, z = x cross y. The edge is reversed when
    needed so that this cross product is the outward normal.
    """

    normal = outward_normal(poly, p1, p2)
    dx = p2[0] - p1[0]
    dz = p2[1] - p1[1]
    length = math.hypot(dx, dz) or 1.0
    left = (-dz / length, dx / length)
    if abs(left[0] - normal[0]) + abs(left[1] - normal[1]) > 1e-6:
        p1, p2 = p2, p1
    return p1, p2, outward_normal(poly, p1, p2)


def min_rotated_rect(poly: Polygon) -> dict[str, object]:
    rect = poly.minimum_rotated_rectangle
    coords = list(rect.exterior.coords)[:4]
    best_i, best_len = 0, -1.0
    for i in range(4):
        p1, p2 = coords[i], coords[(i + 1) % 4]
        length = distance_m(p1, p2)
        if length > best_len:
            best_i, best_len = i, length
    p1 = coords[best_i]
    p2 = coords[(best_i + 1) % 4]
    angle = bearing_deg(p1, p2)
    widths = [distance_m(coords[i], coords[(i + 1) % 4]) for i in range(4)]
    return {
        "corners": [[round(x, 3), round(z, 3)] for x, z in coords],
        "length_m": round(max(widths), 3),
        "width_m": round(min(widths), 3),
        "angle_deg": round(angle % 180.0, 2),
    }


def facade_sides(poly: Polygon) -> list[dict[str, object]]:
    outer, _ = polygon_rings(poly)
    sides: list[dict[str, object]] = []
    for index, (a, b) in enumerate(merge_collinear_edges(outer)):
        p1, p2, normal = orient_wall(poly, a, b)
        sides.append(
            {
                "index": index,
                "p1": [round(p1[0], 3), round(p1[1], 3)],
                "p2": [round(p2[0], 3), round(p2[1], 3)],
                "length_m": round(distance_m(p1, p2), 3),
                "bearing_deg": round(bearing_deg(p1, p2), 2),
                "normal": [round(normal[0], 4), round(normal[1], 4)],
                "facing_deg": round(bearing_deg((0.0, 0.0), normal), 2),
            }
        )
    return sides


def polygon_from_geojson(geometry: dict, ctx: GeoContext) -> Polygon | None:
    try:
        geom = shape(geometry)
    except Exception:
        return None
    if isinstance(geom, MultiPolygon):
        geom = max(geom.geoms, key=lambda g: g.area)
    if not isinstance(geom, Polygon) or geom.is_empty:
        return None
    local = geometry_to_local(geom, ctx)
    if isinstance(local, MultiPolygon):
        local = max(local.geoms, key=lambda g: g.area)
    if not isinstance(local, Polygon) or not local.is_valid:
        local = local.buffer(0)
    if local.is_empty:
        return None
    return local  # type: ignore[return-value]


def centroid_local(poly: Polygon) -> Point2:
    c = poly.centroid
    return float(c.x), float(c.y)


def line_distance_to_point(line: BaseGeometry, point: Point2) -> float:
    from shapely.geometry import Point

    return float(line.distance(Point(point)))


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t
