#!/usr/bin/env python3
"""Movement decisions for the PokéSurvivor browser bot.

The strategy is deliberately independent from Playwright.  The browser layer
turns the game's read-only runtime snapshot into these small data classes, and
this module returns the WASD keys that should be held for the next tick.
"""

from __future__ import annotations

from dataclasses import dataclass
from math import cos, hypot, sin
from typing import Any, Iterable


@dataclass(frozen=True)
class PlayerState:
    x: float
    y: float
    radius: float = 16.0
    hp: float = 1.0
    max_hp: float = 1.0
    dead: bool = False
    slot_one_move: str | None = None
    attack_moves: tuple[str, ...] = ()

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "PlayerState":
        return cls(
            x=_number(payload.get("x")),
            y=_number(payload.get("y")),
            radius=_number(payload.get("r"), 16.0),
            hp=_number(payload.get("hp"), 1.0),
            max_hp=max(1.0, _number(payload.get("maxHp"), 1.0)),
            dead=bool(payload.get("dead", False)),
            slot_one_move=str(payload["slotOneMove"]) if payload.get("slotOneMove") else None,
            attack_moves=tuple(
                str(name)
                for name in payload.get("attackMoves", [])
                if name
            ),
        )


@dataclass(frozen=True)
class EnemyState:
    x: float
    y: float
    radius: float = 16.0
    boss: bool = False
    dead: bool = False

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "EnemyState":
        return cls(
            x=_number(payload.get("x")),
            y=_number(payload.get("y")),
            radius=_number(payload.get("r"), 16.0),
            boss=bool(payload.get("boss", False)),
            dead=bool(payload.get("dead", False)),
        )


@dataclass(frozen=True)
class PickupState:
    x: float
    y: float
    kind: str = "xp"

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "PickupState":
        return cls(
            x=_number(payload.get("x")),
            y=_number(payload.get("y")),
            kind=str(payload.get("kind", "xp")),
        )


@dataclass(frozen=True)
class TerrainState:
    x: float
    y: float
    kind: str = "floor"

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "TerrainState":
        return cls(
            x=_number(payload.get("x")),
            y=_number(payload.get("y")),
            kind=str(payload.get("kind", "floor")),
        )


@dataclass(frozen=True)
class PropState:
    x: float
    y: float
    radius: float = 12.0
    kind: str = "tree"
    solid: bool = True
    flat: bool = False

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "PropState":
        return cls(
            x=_number(payload.get("x")),
            y=_number(payload.get("y")),
            radius=_number(payload.get("r"), 12.0),
            kind=str(payload.get("type", "tree")),
            solid=bool(payload.get("solid", True)),
            flat=bool(payload.get("flat", False)),
        )


@dataclass(frozen=True)
class HazardState:
    kind: str
    x: float
    y: float
    radius: float = 0.0
    angle: float = 0.0
    length: float = 0.0
    width: float = 0.0
    age: float = 0.0
    delay: float = 0.0

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "HazardState":
        return cls(
            kind=str(payload.get("kind", "zone")),
            x=_number(payload.get("x")),
            y=_number(payload.get("y")),
            radius=_number(payload.get("r")),
            angle=_number(payload.get("angle")),
            length=_number(payload.get("len")),
            width=_number(payload.get("w")),
            age=_number(payload.get("t")),
            delay=_number(payload.get("delay")),
        )


@dataclass(frozen=True)
class Snapshot:
    state: str
    player: PlayerState | None
    enemies: tuple[EnemyState, ...] = ()
    pickups: tuple[PickupState, ...] = ()
    hazards: tuple[HazardState, ...] = ()
    terrain: tuple[TerrainState, ...] = ()
    props: tuple[PropState, ...] = ()

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "Snapshot":
        player_payload = payload.get("player")
        return cls(
            state=str(payload.get("state", "unknown")),
            player=PlayerState.from_payload(player_payload) if player_payload else None,
            enemies=tuple(
                EnemyState.from_payload(enemy)
                for enemy in payload.get("enemies", [])
                if isinstance(enemy, dict)
            ),
            pickups=tuple(
                PickupState.from_payload(pickup)
                for pickup in payload.get("pickups", [])
                if isinstance(pickup, dict)
            ),
            hazards=tuple(
                HazardState.from_payload(hazard)
                for hazard in payload.get("hazards", [])
                if isinstance(hazard, dict)
            ),
            terrain=tuple(
                TerrainState.from_payload(tile)
                for tile in payload.get("terrain", [])
                if isinstance(tile, dict)
            ),
            props=tuple(
                PropState.from_payload(prop)
                for prop in payload.get("props", [])
                if isinstance(prop, dict)
            ),
        )


def _number(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return number if number == number and abs(number) != float("inf") else default


def _unit(x: float, y: float, fallback: tuple[float, float] = (1.0, 0.0)) -> tuple[float, float]:
    length = hypot(x, y)
    if length < 1e-6:
        return fallback
    return x / length, y / length


def _add(a: tuple[float, float], b: tuple[float, float], weight: float = 1.0) -> tuple[float, float]:
    return a[0] + b[0] * weight, a[1] + b[1] * weight


def _nearest(
    x: float,
    y: float,
    points: Iterable[Any],
) -> tuple[Any | None, float]:
    nearest = None
    nearest_distance = float("inf")
    for point in points:
        distance = hypot(point.x - x, point.y - y)
        if distance < nearest_distance:
            nearest = point
            nearest_distance = distance
    return nearest, nearest_distance


def _hazard_force(player: PlayerState, hazard: HazardState) -> tuple[float, float, float]:
    """Return an avoidance vector and its urgency for one telegraphed hazard."""

    time_left = max(0.0, hazard.delay - hazard.age)
    if time_left > 2.0:
        return 0.0, 0.0, 0.0

    # Hazards become much more important during their final second.  Keeping a
    # small amount of force before that point prevents the bot from stepping
    # into a warning that is already nearly complete.
    urgency = max(0.25, 1.0 - time_left / 2.0)

    if hazard.kind == "zone":
        dx = player.x - hazard.x
        dy = player.y - hazard.y
        distance = hypot(dx, dy)
        safe_radius = hazard.radius + player.radius + 90.0
        if distance >= safe_radius:
            return 0.0, 0.0, 0.0
        direction = _unit(dx, dy, (cos(hazard.age * 7.0), sin(hazard.age * 7.0)))
        strength = max(0.0, (safe_radius - distance) / safe_radius)
        return direction[0], direction[1], strength * urgency

    # Beam hazards are rectangles extending from (x, y) in `angle`.
    ca, sa = cos(hazard.angle), sin(hazard.angle)
    dx, dy = player.x - hazard.x, player.y - hazard.y
    along = dx * ca + dy * sa
    perpendicular = -dx * sa + dy * ca
    half_width = hazard.width / 2.0 + player.radius * 0.6
    if along < -player.radius or along > hazard.length + player.radius:
        return 0.0, 0.0, 0.0
    distance_from_beam = abs(perpendicular)
    safe_width = half_width + 85.0
    if distance_from_beam >= safe_width:
        return 0.0, 0.0, 0.0

    side = 1.0 if perpendicular >= 0.0 else -1.0
    # If exactly on the centre line, use a deterministic side that changes
    # with the warning age so the player does not remain in the beam.
    if abs(perpendicular) < 1e-6:
        side = 1.0 if int(hazard.age * 10.0) % 2 == 0 else -1.0
    direction = (-sa * side, ca * side)
    strength = max(0.0, (safe_width - distance_from_beam) / safe_width)
    return direction[0], direction[1], strength * urgency


def _obstacle_force(
    player: PlayerState,
    obstacle_x: float,
    obstacle_y: float,
    obstacle_radius: float,
    strength: float,
    fallback: tuple[float, float],
) -> tuple[float, float, bool]:
    """Repel the player from a solid or dangerous world object."""

    dx, dy = player.x - obstacle_x, player.y - obstacle_y
    distance = hypot(dx, dy)
    safe_distance = obstacle_radius + player.radius + 78.0
    if distance >= safe_distance:
        return 0.0, 0.0, False
    direction = _unit(dx, dy, fallback)
    urgency = max(0.0, (safe_distance - distance) / safe_distance)
    return direction[0] * strength * urgency, direction[1] * strength * urgency, distance < player.radius + obstacle_radius + 12.0


def _keys_for_vector(x: float, y: float) -> frozenset[str]:
    """Convert a world-space vector into the keys understood by input.js."""

    length = hypot(x, y)
    if length < 0.12:
        return frozenset()
    x, y = x / length, y / length
    keys: set[str] = set()
    if x < -0.18:
        keys.add("a")
    elif x > 0.18:
        keys.add("d")
    if y < -0.18:
        keys.add("w")
    elif y > 0.18:
        keys.add("s")
    return frozenset(keys)


class SurvivalStrategy:
    """Keep moving, orbit threats, and collect nearby rewards."""

    def __init__(self, orbit_period: float = 4.5) -> None:
        self.orbit_period = orbit_period
        self._last_direction = (1.0, 0.0)

    def reset(self) -> None:
        self._last_direction = (1.0, 0.0)

    def choose(self, snapshot: Snapshot, now: float) -> frozenset[str]:
        player = snapshot.player
        if player is None or player.dead or snapshot.state in {"over", "ui"}:
            return frozenset()

        px, py = player.x, player.y
        desired = (0.0, 0.0)

        # Leave warning circles and beams first.  This force is intentionally
        # strong enough to dominate the regular orbit for imminent attacks.
        for hazard in snapshot.hazards:
            hx, hy, urgency = _hazard_force(player, hazard)
            desired = _add(desired, (hx, hy), 4.0 * urgency)

        # `wall` is the game's raised rock/formation terrain and `liquid`
        # covers water plus the damaging lava, poison, spark, and ice arenas.
        # The world samples are tile centres; a generous radius keeps the bot
        # from scraping their edges while orbiting enemies.
        nearest_floor: tuple[TerrainState | None, float] = (None, float("inf"))
        standing_on_obstacle = False
        for tile in snapshot.terrain:
            distance = hypot(tile.x - px, tile.y - py)
            if tile.kind == "floor":
                if distance < nearest_floor[1]:
                    nearest_floor = (tile, distance)
                continue
            radius = 72.0 if tile.kind == "liquid" else 86.0
            force = 6.0 if tile.kind == "liquid" else 7.0
            ox, oy, touching = _obstacle_force(
                player, tile.x, tile.y, radius, force, self._last_direction
            )
            desired = _add(desired, (ox, oy))
            standing_on_obstacle = standing_on_obstacle or touching

        # Trees, rocks, chests, altars, and other raised solid props are
        # reported separately from terrain tiles. Flat springs/traps remain
        # usable and are therefore not treated as obstacles.
        for prop in snapshot.props:
            if not prop.solid or prop.flat:
                continue
            force = 8.0 if prop.kind == "tree" else 7.0
            ox, oy, touching = _obstacle_force(
                player, prop.x, prop.y, prop.radius, force, self._last_direction
            )
            desired = _add(desired, (ox, oy))
            standing_on_obstacle = standing_on_obstacle or touching

        # If a sample says the player is already on water/wall/another solid
        # object, head toward the closest sampled floor rather than continuing
        # the enemy orbit and getting pinned against it.
        if standing_on_obstacle and nearest_floor[0] is not None:
            floor = nearest_floor[0]
            escape = _unit(floor.x - px, floor.y - py, self._last_direction)
            desired = _add(desired, escape, 10.0)

        live_enemies = [enemy for enemy in snapshot.enemies if not enemy.dead]
        threat_center = (0.0, 0.0)
        threat_weight = 0.0
        closest_distance = float("inf")

        for enemy in live_enemies:
            dx, dy = px - enemy.x, py - enemy.y
            distance = hypot(dx, dy)
            closest_distance = min(closest_distance, distance)

            safe_distance = 300.0 + (90.0 if enemy.boss else 0.0)
            if distance < safe_distance:
                weight = ((safe_distance - distance) / safe_distance) ** 2
                if enemy.boss:
                    weight *= 1.35
                away = _unit(dx, dy, self._last_direction)
                desired = _add(desired, away, 2.5 * weight)

            if distance < 520.0:
                weight = (520.0 - distance) / 520.0
                if enemy.boss:
                    weight *= 1.5
                threat_center = _add(threat_center, (enemy.x, enemy.y), weight)
                threat_weight += weight

        # Orbit the weighted centre of the nearby horde.  Reversing the orbit
        # periodically prevents a long run from drifting into one obstacle or
        # repeatedly following the same enemy formation.
        if threat_weight:
            cx, cy = threat_center[0] / threat_weight, threat_center[1] / threat_weight
            away_x, away_y = _unit(px - cx, py - cy, self._last_direction)
            turn = 1.0 if int(now / self.orbit_period) % 2 == 0 else -1.0
            tangent = (-away_y * turn, away_x * turn)
            desired = _add(desired, tangent, 1.0)
            if closest_distance < 190.0:
                desired = _add(desired, (away_x, away_y), 1.8)
        else:
            # There is no horde yet: keep a gentle, deterministic patrol so
            # the player finds experience rather than standing at spawn.
            angle = now / self.orbit_period
            desired = _add(desired, (cos(angle), sin(angle)), 0.45)

        # Experience and reward pickups are useful targets when approaching
        # them is not immediately dangerous.  The game's magnet radius handles
        # the final collection, so the bot does not need pixel-perfect aiming.
        pickup, pickup_distance = _nearest(
            px,
            py,
            (
                pickup
                for pickup in snapshot.pickups
                if pickup.kind in {"xp", "xpBig", "coin", "heal", "magnet", "ticket", "ticket10", "item"}
            ),
        )
        low_health = player.hp / max(1.0, player.max_hp) < 0.45
        if pickup is not None and (
            closest_distance > 170.0
            or pickup.kind == "heal" and low_health
            or pickup_distance < 80.0
        ):
            target = _unit(pickup.x - px, pickup.y - py, self._last_direction)
            desired = _add(desired, target, 0.9 if not low_health else 1.2)

        direction = _unit(desired[0], desired[1], self._last_direction)
        self._last_direction = direction
        return _keys_for_vector(*direction)


__all__ = [
    "EnemyState",
    "HazardState",
    "PickupState",
    "PropState",
    "PlayerState",
    "Snapshot",
    "SurvivalStrategy",
    "TerrainState",
]
