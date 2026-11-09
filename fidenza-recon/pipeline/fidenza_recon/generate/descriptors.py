"""Deterministic facade and roof descriptors.

All layouts are procedural. Measurements (footprint, height, roof shape,
roof colour) come from the analysis stage; window positions, shopfronts,
balconies and ornaments are inferred and flagged as such.
"""

from __future__ import annotations

import hashlib
import json
import random
import re
from typing import Any

from ..config import PROCESSED_DIR, AppConfig
from ..geo import clamp


def _seed(*parts: object) -> int:
    digest = hashlib.sha1(":".join(str(part) for part in parts).encode()).hexdigest()
    return int(digest[:12], 16)


def _shade(hex_colour: str, factor: float) -> str:
    value = hex_colour.lstrip("#")
    r, g, b = (int(value[i : i + 2], 16) for i in (0, 2, 4))
    r = int(clamp(r * factor, 0, 255))
    g = int(clamp(g * factor, 0, 255))
    b = int(clamp(b * factor, 0, 255))
    return f"#{r:02x}{g:02x}{b:02x}"


def _mix(a: str, b: str, t: float) -> str:
    av = a.lstrip("#")
    bv = b.lstrip("#")
    ar, ag, ab = (int(av[i : i + 2], 16) for i in (0, 2, 4))
    br, bg, bb = (int(bv[i : i + 2], 16) for i in (0, 2, 4))
    return f"#{int(ar + (br - ar) * t):02x}{int(ag + (bg - ag) * t):02x}{int(ab + (bb - ab) * t):02x}"


def _palette_pick(arch: dict, rng: random.Random) -> tuple[str, list[str]]:
    facade = arch.get("facade") or {}
    primary = facade.get("primary") or "#cdb794"
    secondary = list(facade.get("secondary") or [])
    if secondary:
        primary = rng.choice([primary, *secondary])
    variants = [_shade(primary, 0.92), _shade(primary, 1.04)]
    if len(secondary) >= 2:
        variants.append(_mix(primary, rng.choice(secondary), 0.35))
    return primary, variants[:3]


def _floors(eave: float, arch: dict) -> dict[str, Any]:
    ground = float(arch.get("ground_floor_height_m", 4.0))
    upper = float(arch.get("floor_height_m", 3.2))
    ground = min(ground, max(2.8, eave * 0.55))
    n_upper = max(0, int(round((eave - ground) / max(1.8, upper))))
    if n_upper == 0:
        ground = eave
        upper = 0.0
    else:
        upper = (eave - ground) / n_upper
    levels: list[dict[str, float]] = [{"index": 0, "y0": 0.0, "y1": ground, "height": ground}]
    y = ground
    for index in range(1, n_upper + 1):
        levels.append({"index": index, "y0": y, "y1": y + upper, "height": upper})
        y += upper
    return {"ground_height": ground, "upper_height": upper, "levels": levels}


def _window_type(arch: dict, floor_index: int, rng: random.Random) -> str:
    window = arch.get("window") or {}
    base = window.get("type", "single")
    if window.get("piano_nobile_arch") and floor_index == 1:
        return "arched"
    if base == "double" and rng.random() < 0.25:
        return "single"
    return base


def _layout_side(
    arch: dict,
    side: dict,
    floors: dict[str, Any],
    building_seed: int,
    is_main: bool,
    landmark_kind: str | None,
    gate_passage: bool = True,
) -> dict[str, Any]:
    rng = random.Random(building_seed ^ (int(side["index"]) * 2654435761))
    length = float(side["length_m"])
    street = bool(side.get("street_facing"))
    window_cfg = arch.get("window") or {}
    ground_h = floors["ground_height"]
    margin = clamp(length * 0.07, 0.35, 1.1)
    usable = max(1.0, length - 2 * margin)
    bay_target = float(arch.get("bay_width_m", 2.9))
    bays = max(1, min(14, int(round(usable / bay_target))))
    bay_width = usable / bays
    bay_centres = [margin + bay_width * (index + 0.5) for index in range(bays)]

    layout: dict[str, Any] = {
        "floors": floors["levels"],
        "bays": bays,
        "bay_width_m": round(bay_width, 3),
        "margin_m": round(margin, 3),
        "windows": [],
        "doors": [],
        "shopfronts": [],
        "balconies": [],
        "pilasters": [],
        "string_courses": [],
        "cornice": None,
        "ornaments": [],
        "shop_bays": [],
        "door_bay": None,
    }

    is_church = landmark_kind in {"romanesque_church", "church"}
    is_gate = landmark_kind == "city_gate"
    is_theatre = landmark_kind == "theatre"
    is_station = landmark_kind == "station_building"

    if length < 2.8:
        layout["window_count"] = 0
        layout["balcony_count"] = 0
        layout["street_facing"] = street
        layout["road_name"] = side.get("road_name")
        layout["road_class"] = side.get("road_class")
        layout["main_facade"] = is_main
        return layout

    if is_gate and not gate_passage:
        layout["ornaments"].append("crenellations")
        layout["window_count"] = 0
        layout["balcony_count"] = 0
        layout["street_facing"] = street
        layout["road_name"] = side.get("road_name")
        layout["road_class"] = side.get("road_class")
        layout["main_facade"] = is_main
        return layout

    if is_gate:
        arch_width = min(4.2, length * 0.45)
        arch_height = min(6.2, ground_h + 1.6)
        layout["doors"].append(
            {
                "u": length / 2,
                "v": 0.0,
                "width": arch_width,
                "height": arch_height,
                "type": "archway",
                "colour": (arch.get("door") or {}).get("color", "#3f2a1d"),
            }
        )
        layout["ornaments"].append("crenellations")
        layout["window_count"] = 0
        layout["balcony_count"] = 0
        layout["street_facing"] = street
        layout["road_name"] = side.get("road_name")
        layout["road_class"] = side.get("road_class")
        layout["main_facade"] = is_main
        return layout

    # Ground floor: portal, door or shopfront.
    shop_probability = float((arch.get("shopfront") or {}).get("probability", 0.0))
    shop = street and rng.random() < shop_probability and length > 4.0
    if shop:
        shop_bays = 1 if bay_width < 3.4 else 2
        shop_bays = min(shop_bays, bays)
        start = rng.randrange(0, bays - shop_bays + 1)
        for index in range(start, start + shop_bays):
            u = bay_centres[index]
            width = min(3.6, bay_width * shop_bays - 0.4)
            layout["shopfronts"].append(
                {
                    "u": u,
                    "v": 0.0,
                    "width": width,
                    "height": min(3.2, ground_h - 0.35),
                    "type": rng.choice(["glass", "timber", "awning"]),
                    "colour": rng.choice(["#3b3b3b", "#5b3a28", "#244a4a", "#7a2f2f"]),
                }
            )
            if bays > 1:
                layout["shop_bays"].append(index)
        available = [index for index in range(bays) if index not in layout["shop_bays"]]
        door_bay = rng.choice(available) if available else None
    else:
        door_bay = bays // 2 if bays % 2 == 1 else rng.randrange(0, bays)

    if is_church:
        door_bay = bays // 2 if is_main else None
        if is_main:
            portal_width = min(2.4, bay_width * 0.8)
            layout["doors"].append(
                {
                    "u": bay_centres[door_bay],
                    "v": 0.0,
                    "width": portal_width,
                    "height": min(4.6, ground_h - 0.2),
                    "type": "portal",
                    "colour": (arch.get("door") or {}).get("color", "#4f3324"),
                }
            )
            if bays >= 3:
                layout["ornaments"].append("rose_window")
        elif length >= 8.0 and rng.random() < 0.5:
            door_bay = bays // 2
            layout["doors"].append(
                {
                    "u": bay_centres[door_bay],
                    "v": 0.0,
                    "width": min(1.2, bay_width * 0.45),
                    "height": min(2.3, ground_h - 0.4),
                    "type": "single",
                    "colour": (arch.get("door") or {}).get("color", "#4f3324"),
                }
            )
    elif door_bay is not None:
        door_cfg = arch.get("door") or {}
        layout["doors"].append(
            {
                "u": bay_centres[door_bay],
                "v": 0.0,
                "width": min(1.35, bay_width * 0.5),
                "height": min(2.45, ground_h - 0.4),
                "type": door_cfg.get("type", "single"),
                "colour": door_cfg.get("color", "#4a3022"),
            }
        )
    layout["door_bay"] = door_bay

    # Ground-floor windows (skip shop bays and door bay).
    for index, u in enumerate(bay_centres):
        if index == door_bay or index in layout["shop_bays"]:
            continue
        if is_church and is_main:
            continue
        if is_church:
            width = min(1.2, bay_width * 0.35)
            height = min(3.0, ground_h * 0.62)
            window_height = height
        else:
            width = min(1.5, bay_width * float(window_cfg.get("width_ratio", 0.42)) * 1.1)
            window_height = min(2.0, ground_h * 0.5)
        layout["windows"].append(
            {
                "u": u,
                "v": (ground_h - window_height) / 2,
                "width": width,
                "height": window_height,
                "type": "arched" if is_church else "single",
                "frame": window_cfg.get("frame_color", "#e6dfd2"),
                "sill": bool(window_cfg.get("sill", True)),
                "floor": 0,
            }
        )

    # Upper floors.
    for level in floors["levels"][1:]:
        floor_index = int(level["index"])
        upper_h = level["height"]
        for index, u in enumerate(bay_centres):
            if is_church and is_main and index == bays // 2:
                continue
            if is_station:
                width = min(2.2, bay_width * 0.72)
            elif is_theatre:
                width = min(1.6, bay_width * 0.5)
            else:
                width = min(1.6, bay_width * float(window_cfg.get("width_ratio", 0.44)))
            window_type = _window_type(arch, floor_index, rng)
            if is_theatre:
                window_type = "arched" if floor_index == 1 else "single"
            height_ratio = float(window_cfg.get("height_ratio", 0.6))
            if window_type in {"french", "arched"}:
                height_ratio = max(height_ratio, 0.68)
            window_height = min(upper_h * height_ratio, upper_h - 0.45)
            if window_height < 0.6:
                continue
            v = level["y0"] + (upper_h - window_height) * (0.5 if is_station else 0.56)
            layout["windows"].append(
                {
                    "u": u,
                    "v": v,
                    "width": width,
                    "height": window_height,
                    "type": window_type,
                    "frame": window_cfg.get("frame_color", "#e6dfd2"),
                    "sill": bool(window_cfg.get("sill", True)),
                    "floor": floor_index,
                    "shutters": rng.random()
                    < float((arch.get("shutters") or {}).get("probability", 0.0)),
                    "shutter_type": (arch.get("shutters") or {}).get("type", "louvered"),
                }
            )

    # Balconies.
    balcony_cfg = arch.get("balcony") or {}
    balcony_probability = float(balcony_cfg.get("probability", 0.0))
    allowed_floors = set(balcony_cfg.get("floors") or [])
    if balcony_probability > 0 and not is_church and not is_gate:
        for level in floors["levels"][1:]:
            if int(level["index"]) not in allowed_floors:
                continue
            if rng.random() > balcony_probability:
                continue
            if balcony_cfg.get("continuous"):
                selected = list(range(bays))
            else:
                selected = sorted(
                    {
                        bays // 2,
                        rng.randrange(0, bays),
                        (bays - 1) if rng.random() < 0.4 else bays // 2,
                    }
                )
            for index in selected:
                width = (
                    bay_width * bays - 0.6
                    if balcony_cfg.get("continuous")
                    else min(bay_width - 0.25, 2.4)
                )
                layout["balconies"].append(
                    {
                        "u": bay_centres[index],
                        "v": level["y0"] + 0.05,
                        "width": max(0.8, width),
                        "depth": float(balcony_cfg.get("depth_m", 0.9)),
                        "type": balcony_cfg.get("type", "concrete"),
                        "railing": balcony_cfg.get("railing", "iron"),
                        "floor": int(level["index"]),
                        "continuous": bool(balcony_cfg.get("continuous")),
                    }
                )

    # Cornice and string courses.
    if float(arch.get("cornice_m", 0.2)) > 0:
        layout["cornice"] = {
            "height": float(arch.get("cornice_m", 0.2)),
            "depth": 0.18 if is_church else 0.12,
            "colour": _shade(arch.get("facade", {}).get("primary", "#d8c9ae"), 1.08),
        }
    layout["string_courses"].append(
        {"v": ground_h, "height": 0.12 if not is_church else 0.2, "depth": 0.08}
    )
    if is_theatre or is_station:
        layout["string_courses"].append({"v": ground_h + floors["upper_height"], "height": 0.15, "depth": 0.1})

    # Pilasters / lesenes.
    if arch.get("pilasters") or is_church or is_theatre:
        for index in range(bays + 1):
            u = margin + bay_width * index
            if 0.2 < u < length - 0.2:
                layout["pilasters"].append(
                    {"u": u, "width": 0.26 if is_church else 0.18, "depth": 0.07}
                )

    layout["window_count"] = len(layout["windows"])
    layout["balcony_count"] = len(layout["balconies"])
    layout["street_facing"] = street
    layout["road_name"] = side.get("road_name")
    layout["road_class"] = side.get("road_class")
    layout["main_facade"] = is_main
    return layout


def build_descriptors(config: AppConfig, force: bool = False) -> dict:
    out_path = PROCESSED_DIR / "descriptors.json"
    if out_path.exists() and not force:
        return json.loads(out_path.read_text(encoding="utf-8"))

    base = json.loads((PROCESSED_DIR / "buildings_base.json").read_text(encoding="utf-8"))
    heights = json.loads((PROCESSED_DIR / "heights.json").read_text(encoding="utf-8"))
    roofs = json.loads((PROCESSED_DIR / "roofs.json").read_text(encoding="utf-8"))
    classification = json.loads((PROCESSED_DIR / "classification.json").read_text(encoding="utf-8"))

    descriptors: list[dict[str, Any]] = []
    for record in base["buildings"]:
        osm_id = record["osm_id"]
        height_info = heights.get(osm_id) or {}
        roof_info = roofs.get(osm_id) or {}
        class_info = classification.get(osm_id) or {}
        archetype_key = class_info.get("archetype") or "generic"
        arch = config.archetype(archetype_key)
        landmark = bool(arch.get("landmark")) or class_info.get("tier") == "A"
        rng = random.Random(_seed(osm_id))
        height = float(height_info.get("height_m") or 8.5)
        eave = float(height_info.get("eave_height_m") or max(3.0, height - 0.8))
        eave = clamp(eave, 2.8, height)
        if archetype_key in {"romanesque_church", "church"}:
            # Churches carry the facade gable above the side eaves. The
            # DSM eave percentile is the side-wall height, not the gable top.
            gable_eave = height * 0.78
            if gable_eave > eave:
                eave = gable_eave
                height_info = {**height_info, "eave_height_m": eave}
                roof_info = {**roof_info, "roof_height_m": max(0.6, height - eave)}
        if archetype_key == "city_gate":
            # The DSM low percentile undershoots on a detached gate tower.
            gate_eave = height * 0.72
            eave = gate_eave
            height_info = {**height_info, "eave_height_m": eave}
            roof_info = {**roof_info, "roof_height_m": max(0.8, height - eave)}
        floors = _floors(eave, arch)
        primary, secondary = _palette_pick(arch, rng)
        roof_shape = roof_info.get("roof_shape") or arch.get("roof", {}).get("shape", "gabled")
        roof_height = float(roof_info.get("roof_height_m") or height_info.get("roof_height_m") or 0.6)
        if roof_shape == "flat":
            roof_height = 0.35

        if record.get("detail") == "context":
            descriptors.append(
                {
                    "id": osm_id,
                    "osm_id": osm_id,
                    "detail": "context",
                    "name": record.get("name"),
                    "archetype": archetype_key,
                    "style_label": class_info.get("style_label"),
                    "category": class_info.get("category"),
                    "landmark": False,
                    "tier": class_info.get("tier"),
                    "tags": record.get("tags"),
                    "centroid_local": record["centroid_local"],
                    "centroid_lonlat": record["centroid_lonlat"],
                    "footprint": record["ring"],
                    "holes": record["holes"],
                    "min_rect": record["min_rect"],
                    "area_m2": record["area_m2"],
                    "base_elevation_m": height_info.get("ground_elevation_m"),
                    "height_m": round(height, 2),
                    "eave_height_m": round(eave, 2),
                    "roof_height_m": round(roof_height, 2),
                    "floors": len(floors["levels"]),
                    "ground_floor_height_m": round(floors["ground_height"], 2),
                    "upper_floor_height_m": round(floors["upper_height"], 2),
                    "roof": {
                        "shape": roof_shape,
                        "pitch_deg": float(arch.get("roof", {}).get("pitch_deg", 20)),
                        "overhang_m": float(arch.get("roof", {}).get("overhang_m", 0.45)),
                        "colour": roof_info.get("roof_colour") or arch.get("roof", {}).get("color", "#9a5b45"),
                        "material": roof_info.get("roof_material") or arch.get("roof", {}).get("material", "tiles"),
                        "ridge_deg": record["min_rect"]["angle_deg"],
                        "confidence": roof_info.get("roof_shape_confidence", 0.3),
                    },
                    "facade": {
                        "primary": primary,
                        "secondary": secondary,
                        "material": (arch.get("facade") or {}).get("material", "plaster"),
                        "roughness": float((arch.get("facade") or {}).get("roughness", 0.86)),
                        "metalness": float((arch.get("facade") or {}).get("metalness", 0.0)),
                    },
                    "sides": [],
                    "window_count": 0,
                    "balcony_count": 0,
                    "height_source": height_info.get("height_source"),
                    "height_confidence": height_info.get("height_confidence"),
                    "archetype_confidence": class_info.get("archetype_confidence"),
                    "geometry_confidence": class_info.get("geometry_confidence", 0.9),
                    "texture_confidence": 0.0,
                    "evidence": class_info.get("evidence", []),
                    "procedural_flags": ["context_lod1"],
                    "facade_analysis": {
                        "detail": "context_lod1",
                        "windows_per_side": {},
                        "window_spacing_m": None,
                        "window_alignment": "not_modelled",
                        "window_frame_colours": [],
                        "shutters": False,
                        "balcony_types": [],
                        "cornice": False,
                        "pilasters": False,
                        "drainpipes": "not_modelled",
                        "construction_period": "unknown",
                        "unverified_assumptions": [
                            "Context massing only; facade details are intentionally omitted.",
                        ],
                    },
                    "provenance": {
                        "footprint": "OpenStreetMap (ODbL 1.0)",
                        "height": height_info.get("height_source"),
                        "roof": "DSM 2008 + RER 2023-24 orthophoto/NIR",
                        "facade": "not detailed outside the pilot",
                    },
                    "notes": "Context building outside the detailed pilot block; rendered at LOD1.",
                }
            )
            continue

        sides = []
        main_side_id = None
        max_side_length = max((float(side["length_m"]) for side in record["sides"]), default=0.0)
        street_sides = [side for side in record["sides"] if side.get("street_facing")]
        pool = street_sides or record["sides"]
        if pool:
            preferred = [
                side
                for side in record["sides"]
                if re.search(r"piazza|duomo", side.get("road_name") or "", re.IGNORECASE)
            ]
            if archetype_key in {"romanesque_church", "church"}:
                west = [
                    side
                    for side in record["sides"]
                    if float(side["length_m"]) >= 8.0
                    and 240.0 <= float(side["facing_deg"]) <= 300.0
                ]
                if west:
                    main_side_id = max(west, key=lambda side: float(side["length_m"]))["index"]
                elif preferred:
                    main_side_id = max(preferred, key=lambda side: float(side["length_m"]))["index"]
                else:
                    main_side_id = max(pool, key=lambda side: float(side["length_m"]))["index"]
            elif landmark and preferred:
                main_side_id = max(preferred, key=lambda side: float(side["length_m"]))["index"]
            else:
                main_side_id = max(pool, key=lambda side: float(side["length_m"]))["index"]

        for side in record["sides"]:
            if float(side["length_m"]) < 1.6:
                continue
            layout = _layout_side(
                arch,
                side,
                floors,
                _seed(osm_id),
                is_main=(side["index"] == main_side_id),
                landmark_kind=archetype_key if landmark else None,
                gate_passage=(
                    archetype_key != "city_gate"
                    or float(side["length_m"]) >= 0.9 * max_side_length
                ),
            )
            sides.append(
                {
                    "index": side["index"],
                    "p1": side["p1"],
                    "p2": side["p2"],
                    "length_m": side["length_m"],
                    "bearing_deg": side["bearing_deg"],
                    "facing_deg": side["facing_deg"],
                    "normal": side["normal"],
                    "street_facing": bool(side.get("street_facing")),
                    "road_name": side.get("road_name"),
                    "road_class": side.get("road_class"),
                    "main_facade": side["index"] == main_side_id,
                    "layout": layout,
                }
            )

        window_total = sum(side["layout"]["window_count"] for side in sides)
        balcony_total = sum(side["layout"]["balcony_count"] for side in sides)
        all_windows = [window for side in sides for window in side["layout"]["windows"]]
        bay_widths = [side["layout"]["bay_width_m"] for side in sides]
        facade_analysis = {
            "detail": "pilot_lod3",
            "windows_per_side": {
                str(side["index"]): side["layout"]["window_count"] for side in sides
            },
            "window_spacing_m": round(sum(bay_widths) / len(bay_widths), 2) if bay_widths else None,
            "window_alignment": "regular_bay_grid",
            "window_width_m": round(
                sum(window["width"] for window in all_windows) / len(all_windows), 2
            )
            if all_windows
            else None,
            "window_height_m": round(
                sum(window["height"] for window in all_windows) / len(all_windows), 2
            )
            if all_windows
            else None,
            "window_frame_colours": sorted({window["frame"] for window in all_windows}),
            "shutters": any(window.get("shutters") for window in all_windows),
            "balcony_types": sorted(
                {balcony["type"] for side in sides for balcony in side["layout"]["balconies"]}
            ),
            "balcony_count": balcony_total,
            "doors": sum(len(side["layout"]["doors"]) for side in sides),
            "shopfronts": sum(len(side["layout"]["shopfronts"]) for side in sides),
            "cornice": any(side["layout"]["cornice"] for side in sides),
            "pilasters": any(side["layout"]["pilasters"] for side in sides),
            "drainpipes": "modelled at street-facing side ends",
            "ornaments": sorted(
                {
                    ornament
                    for side in sides
                    for ornament in side["layout"]["ornaments"]
                }
            ),
            "construction_period": "unknown",
            "unverified_assumptions": [
                "Window positions inferred from facade width and archetype; no street-level imagery exists.",
                "Facade colours are typological palettes, not measured values.",
                "Shopfronts and balconies are inferred from archetype and street context.",
                "Construction period is unknown; the archetype is morphological, not archival.",
            ],
        }
        descriptor = {
            "id": osm_id,
            "osm_id": osm_id,
            "detail": "pilot",
            "name": record.get("name"),
            "archetype": archetype_key,
            "style_label": class_info.get("style_label"),
            "category": class_info.get("category"),
            "landmark": landmark,
            "tier": class_info.get("tier"),
            "tags": record.get("tags"),
            "centroid_local": record["centroid_local"],
            "centroid_lonlat": record["centroid_lonlat"],
            "footprint": record["ring"],
            "holes": record["holes"],
            "min_rect": record["min_rect"],
            "area_m2": record["area_m2"],
            "base_elevation_m": height_info.get("ground_elevation_m"),
            "height_m": round(height, 2),
            "eave_height_m": round(eave, 2),
            "roof_height_m": round(roof_height, 2),
            "floors": len(floors["levels"]),
            "ground_floor_height_m": round(floors["ground_height"], 2),
            "upper_floor_height_m": round(floors["upper_height"], 2),
            "roof": {
                "shape": roof_shape,
                "pitch_deg": float(arch.get("roof", {}).get("pitch_deg", 20)),
                "overhang_m": float(arch.get("roof", {}).get("overhang_m", 0.45)),
                "colour": roof_info.get("roof_colour") or arch.get("roof", {}).get("color", "#9a5b45"),
                "material": roof_info.get("roof_material") or arch.get("roof", {}).get("material", "tiles"),
                "ridge_deg": record["min_rect"]["angle_deg"],
                "confidence": roof_info.get("roof_shape_confidence", 0.3),
            },
            "facade": {
                "primary": primary,
                "secondary": secondary,
                "material": (arch.get("facade") or {}).get("material", "plaster"),
                "roughness": float((arch.get("facade") or {}).get("roughness", 0.86)),
                "metalness": float((arch.get("facade") or {}).get("metalness", 0.0)),
            },
            "sides": sides,
            "facade_analysis": facade_analysis,
            "window_count": window_total,
            "balcony_count": balcony_total,
            "height_source": height_info.get("height_source"),
            "height_confidence": height_info.get("height_confidence"),
            "archetype_confidence": class_info.get("archetype_confidence"),
            "geometry_confidence": class_info.get("geometry_confidence", 0.9),
            "texture_confidence": class_info.get("texture_confidence", 0.05),
            "evidence": class_info.get("evidence", []),
            "procedural_flags": sorted(
                set(
                    (class_info.get("procedural_flags") or [])
                    + ["facade_window_layout", "window_positions_inferred"]
                    + (["shopfront_inferred"] if any(side["layout"]["shopfronts"] for side in sides) else [])
                    + (["balcony_layout_inferred"] if balcony_total else [])
                    + (["gable_cross"] if archetype_key in {"romanesque_church", "church"} else [])
                )
            ),
            "provenance": {
                "footprint": "OpenStreetMap (ODbL 1.0)",
                "height": height_info.get("height_source"),
                "roof": "DSM 2008 + RER 2023-24 orthophoto/NIR",
                "facade": "procedural grammar; no street-level imagery available",
                "reference_images": "Wikimedia Commons where a landmark match exists",
            },
            "notes": height_info.get("notes"),
        }
        descriptors.append(descriptor)

    payload = {
        "buildings": descriptors,
        "counts": {
            "buildings": len(descriptors),
            "pilot": sum(1 for item in descriptors if item.get("detail") == "pilot"),
            "context": sum(1 for item in descriptors if item.get("detail") == "context"),
            "windows": sum(item["window_count"] for item in descriptors),
            "balconies": sum(item["balcony_count"] for item in descriptors),
            "landmarks": sum(1 for item in descriptors if item["landmark"]),
        },
        "architectural_grammar": {
            key: {
                "label": value.get("label"),
                "category": value.get("category"),
            }
            for key, value in config.archetype_defs.items()
        },
    }
    out_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return payload
