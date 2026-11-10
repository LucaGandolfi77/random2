"""Rule-based architectural classification with explicit evidence."""

from __future__ import annotations

import hashlib
import json
import math

from ..config import PROCESSED_DIR, RAW_DIR, AppConfig

RELIGIOUS = {"cattedrale", "duomo", "chiesa", "santuario", "oratorio", "abbazia"}
PUBLIC = {"teatro", "municipio", "palazzo comunale", "stazione"}
CENTRAL = {"centro"}
STATION = {"monica"}
RESIDENTIAL = {"sanlazzaro", "azalee", "corea", "luce"}
RURAL = {"coduro"}


def _centre_distance(record: dict) -> float:
    x, z = record["centroid_local"]
    return math.hypot(x, z)


def _has_shopfront(record: dict) -> bool:
    tags = record.get("tags") or {}
    if any(key in tags for key in ("shop", "amenity", "office", "craft", "tourism")):
        return True
    return False


def _street_facing(record: dict) -> bool:
    return any(side.get("street_facing") for side in record.get("sides", []))


def _road_classes(record: dict) -> set[str]:
    return {
        side.get("road_class")
        for side in record.get("sides", [])
        if side.get("street_facing")
    }


def _ratio(osm_id: str) -> float:
    digest = hashlib.sha1(str(osm_id).encode()).digest()
    return digest[0] / 255.0


def classify_one(config: AppConfig, record: dict, height_info: dict, roof_info: dict) -> dict:
    tags = record.get("tags") or {}
    name = (record.get("name") or "").lower()
    building = tags.get("building")
    area = float(record.get("area_m2") or 0.0)
    height = float(height_info.get("height_m") or 8.0)
    roof_shape = roof_info.get("roof_shape") or "unknown"
    distance = _centre_distance(record)
    district = record.get("district_id")
    evidence: list[str] = []
    confidence = 0.3
    road_classes = _road_classes(record)
    shopfront = _has_shopfront(record)
    street = _street_facing(record)

    if any(word in name for word in RELIGIOUS):
        archetype = "romanesque_church" if ("cattedrale" in name or "duomo" in name) else "church"
        evidence.append("nome storico-religioso")
        confidence = 0.9
    elif "porta" in name:
        archetype = "city_gate"
        evidence.append("nome 'Porta' (gate medievale)")
        confidence = 0.85
    elif "teatro" in name:
        archetype = "theatre"
        evidence.append("nome 'Teatro'")
        confidence = 0.85
    elif "stazione" in name:
        archetype = "station_building"
        evidence.append("nome 'Stazione'")
        confidence = 0.85
    elif building in {"garage", "garages", "shed", "hut", "carport"}:
        archetype = "generic"
        evidence.append("volume accessorio")
        confidence = 0.5
    elif building in {"industrial", "warehouse", "factory", "greenhouse", "hangar"}:
        archetype = "industrial"
        evidence.append("building=industrial/warehouse")
        confidence = 0.75
    elif area >= 600 and height <= 12.0 and roof_shape == "flat":
        archetype = "industrial"
        evidence.append("grande copertura piana: capannone o deposito")
        confidence = 0.55
    elif building == "apartments":
        if roof_shape == "flat":
            archetype = "1960s_concrete" if height >= 16.5 else "post_war_apartment"
            evidence.append("building=apartments + tetto piano")
        elif district in CENTRAL:
            archetype = "early_1900_apartment"
            evidence.append("building=apartments + centro storico")
        else:
            archetype = "post_war_apartment"
            evidence.append("building=apartments + periferia")
        confidence = 0.6
    elif building in {"terrace", "residential"}:
        archetype = "post_war_apartment" if height >= 10.5 else "historic_townhouse"
        evidence.append("edilizia residenziale in serie")
        confidence = 0.45
    elif building in {"house", "detached", "semidetached_house", "villa", "farm", "bungalow"}:
        if height >= 7.4 and area >= 90:
            archetype = "liberty_villa"
            evidence.append("villetta o casa unifamiliare con giardino")
            confidence = 0.42
        else:
            archetype = "generic"
            evidence.append("casa di piccola dimensione")
            confidence = 0.35
    elif district in CENTRAL and area >= 300 and height >= 13 and roof_shape != "flat":
        archetype = "neoclassical_palazzo"
        evidence.append("grande impronta + altezza + tetto inclinato nel centro")
        confidence = 0.5
    elif area >= 160 and height >= 12.5:
        if roof_shape == "flat":
            archetype = "1960s_concrete" if height >= 16.5 else "post_war_apartment"
            evidence.append("impronta ampia + altezza + tetto piano")
        elif district in CENTRAL:
            archetype = "early_1900_apartment"
            evidence.append("impronta ampia + altezza + tetto inclinato")
        else:
            archetype = "post_war_apartment"
            evidence.append("impronta ampia + altezza in periferia")
        confidence = 0.45
    elif area >= 95 and height >= 12.0:
        archetype = "post_war_apartment" if roof_shape == "flat" else "early_1900_apartment"
        evidence.append("altezza superiore alla media del lotto")
        confidence = 0.4
    elif shopfront and street:
        archetype = "mixed_use_shopfront"
        evidence.append("attività al piano terra su strada")
        confidence = 0.55
    elif (
        street
        and ("pedestrian" in road_classes or "residential" in road_classes)
        and area > 80
        and _ratio(record["osm_id"]) < 0.45
    ):
        archetype = "mixed_use_shopfront"
        evidence.append("fronte su strada urbana con probabile piano terra commerciale")
        confidence = 0.32
    elif area < 110 and height <= 10.5 and roof_shape != "flat":
        archetype = (
            "liberty_villa"
            if district in RURAL | RESIDENTIAL and area >= 70
            else "historic_townhouse"
        )
        evidence.append("lotto piccolo + altezza contenuta + tetto inclinato")
        confidence = 0.45
    elif district in CENTRAL:
        archetype = "historic_townhouse"
        evidence.append("contesto centro storico")
        confidence = 0.35
    elif district in STATION:
        archetype = "early_1900_apartment" if height >= 9.5 else "historic_townhouse"
        evidence.append("contesto stazione / prima periferia")
        confidence = 0.32
    elif district in RESIDENTIAL:
        archetype = "post_war_apartment" if height >= 9.0 else "generic"
        evidence.append("contesto residenziale di periferia")
        confidence = 0.3
    elif district in RURAL:
        archetype = "generic"
        evidence.append("contesto rurale o frazione")
        confidence = 0.25
    else:
        archetype = "generic"
        evidence.append("evidenza insufficiente")
        confidence = 0.25

    if roof_shape == "flat" and archetype in {"neoclassical_palazzo", "historic_townhouse"}:
        # Flat roofs can occur on historic buildings after alterations; keep the
        # classification but lower confidence.
        confidence = max(0.2, confidence - 0.1)
        evidence.append("tetto piano su tipologia storica: possibile alterazione")

    height_source = height_info.get("height_source")
    if height_source == "dsm_agea2008_minus_dtm_rer2023_24":
        tier = "A" if confidence >= 0.8 else "B"
    else:
        tier = "C"

    style_key = archetype
    style_label = config.archetypes.get("style_labels", {}).get(style_key, style_key)
    procedural_flags = list(config.archetype(archetype).get("procedural_flags", []))
    if height_source != "dsm_agea2008_minus_dtm_rer2023_24":
        procedural_flags.append("height_typology_prior")
    if roof_info.get("roof_shape_confidence", 0) < 0.5:
        procedural_flags.append("roof_shape_inferred")

    return {
        "osm_id": record["osm_id"],
        "name": record.get("name"),
        "archetype": archetype,
        "style_label": style_label,
        "category": config.archetype(archetype).get("category"),
        "archetype_confidence": round(confidence, 2),
        "evidence": evidence,
        "tier": tier,
        "geometry_confidence": 0.9,
        "texture_confidence": 0.05,
        "procedural_flags": sorted(set(procedural_flags)),
        "centre_distance_m": round(distance, 1),
        "district_id": district,
        "street_facing": _street_facing(record),
        "height_source": height_source,
    }


def analyze(config: AppConfig, force: bool = False) -> dict:
    out_path = PROCESSED_DIR / "classification.json"
    if out_path.exists() and not force:
        return json.loads(out_path.read_text(encoding="utf-8"))

    base = json.loads((PROCESSED_DIR / "buildings_base.json").read_text(encoding="utf-8"))
    heights = json.loads((PROCESSED_DIR / "heights.json").read_text(encoding="utf-8"))
    roofs = json.loads((PROCESSED_DIR / "roofs.json").read_text(encoding="utf-8"))

    commons_path = RAW_DIR / "commons" / "commons.json"
    commons_titles: list[str] = []
    if commons_path.exists():
        commons = json.loads(commons_path.read_text(encoding="utf-8"))
        commons_titles = [item.get("title", "").lower() for item in commons.get("files", [])]

    results: dict[str, dict] = {}
    for record in base["buildings"]:
        result = classify_one(
            config,
            record,
            heights.get(record["osm_id"], {}),
            roofs.get(record["osm_id"], {}),
        )
        name = (record.get("name") or "").lower()
        has_reference = any(name and name in title for title in commons_titles)
        if has_reference:
            result["tier"] = "A"
            result["texture_confidence"] = 0.25
            result["evidence"].append("foto di riferimento Wikimedia Commons")
        results[record["osm_id"]] = result

    out_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    return results
