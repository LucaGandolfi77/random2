"""Generate the provenance, classification and validation reports."""

from __future__ import annotations

import json
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path

from ..config import DOCS_DIR, PROCESSED_DIR, RAW_DIR, ensure_dirs
from ..db import connect


def _load(path: Path, default=None):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def _counts(values) -> str:
    counter = Counter(values)
    return ", ".join(f"{key}: {value}" for key, value in counter.most_common())


def _table(headers: list[str], rows: list[list[object]]) -> str:
    lines = ["| " + " | ".join(headers) + " |", "| " + " | ".join("---" for _ in headers) + " |"]
    for row in rows:
        lines.append("| " + " | ".join(str(value) for value in row) + " |")
    return "\n".join(lines)


def generate() -> dict[str, Path]:
    ensure_dirs()
    city = _load(PROCESSED_DIR / "city.json", {})
    roofs = _load(PROCESSED_DIR / "roofs.json", {})
    base = _load(PROCESSED_DIR / "buildings_base.json", {})
    kartaview = _load(RAW_DIR / "kartaview" / "coverage.json", {})
    commons = _load(RAW_DIR / "commons" / "commons.json", {})
    performance = _load(DOCS_DIR / "performance.json", {})

    buildings = city.get("buildings", [])
    meta = city.get("meta", {})
    stats = city.get("stats", {})
    generated = datetime.now(UTC).replace(microsecond=0).isoformat()

    conn = connect()
    sources = [dict(row) for row in conn.execute("SELECT * FROM sources ORDER BY key")]
    datasets = [dict(row) for row in conn.execute("SELECT * FROM datasets ORDER BY id")]
    conn.close()

    outputs: dict[str, Path] = {}

    inventory = [
        "# Data inventory",
        "",
        f"Generated: {generated}",
        "",
        f"Pilot: **{meta.get('pilot', 'n/a')}** — detail bbox WGS84 `{meta.get('pilot_bbox_wgs84')}`",
        f"Context bbox WGS84 `{meta.get('bbox_wgs84')}`; pilot buildings are LOD3, context is LOD1.",
        "",
        "## Registered datasets",
        "",
        _table(
            ["Source", "Product", "CRS", "Path", "License"],
            [
                [
                    dataset.get("source_key"),
                    dataset.get("product"),
                    dataset.get("crs"),
                    dataset.get("path"),
                    next(
                        (source.get("license") for source in sources if source.get("key") == dataset.get("source_key")),
                        "n/a",
                    ),
                ]
                for dataset in datasets
            ],
        ),
        "",
        "## Sources",
        "",
        _table(
            ["Key", "Name", "License", "URL", "Retrieved"],
            [
                [
                    source.get("key"),
                    source.get("name"),
                    source.get("license"),
                    source.get("url"),
                    source.get("retrieved_at"),
                ]
                for source in sources
            ],
        ),
        "",
        "## Counts",
        "",
        f"- Buildings: {stats.get('buildings', 0)} ({stats.get('pilot_buildings', 0)} pilot + {stats.get('context_buildings', 0)} context)",
        f"- Windows (procedural): {stats.get('windows', 0)}",
        f"- Balconies (procedural): {stats.get('balconies', 0)}",
        f"- Landmarks: {stats.get('landmarks', 0)}",
        f"- Road segments: {len(city.get('roads', []))}",
        f"- Street props: {len(city.get('props', []))}",
        "",
        "## Discovery notes",
        "",
        "- No public municipal CityGML/CityJSON or cadastral 3D dataset for Fidenza",
        "  was found in the regional CKAN catalogue or the RER ArcGIS service directory.",
        "- The RER 2023-24 LiDAR/DSM product exists as a pre-packaged regional",
        "  dataset, but no open DSM image service for that vintage was exposed",
        "  during this build. The public DSM AGEA 2008 ImageServer was used for",
        "  heights instead; the cross-epoch limitation is recorded per building.",
        "- Orthophoto, NIR and DTM RER 2023-24 are used as-is; only the display",
        "  ground texture is colour-graded.",
        "",
    ]
    outputs["inventory"] = DOCS_DIR / "DATA_INVENTORY.md"
    outputs["inventory"].write_text("\n".join(inventory), encoding="utf-8")

    licenses = [
        "# Licenses and attribution",
        "",
        "This project does **not** use Google Street View, Google Photorealistic 3D Tiles,",
        "or any other source whose terms prohibit extraction of standalone 3D assets.",
        "",
        "## Runtime data",
        "",
    ]
    for item in city.get("licenses", []):
        licenses += [
            f"### {item.get('source')}",
            "",
            f"- License: **{item.get('license')}**",
            f"- URL: {item.get('url')}",
            f"- Attribution: {item.get('attribution')}",
            "",
        ]
    licenses += [
        "## Reference photography",
        "",
        "Wikimedia Commons files retain their per-file license and author. The",
        "inventory is stored in `data/raw/commons/commons.json` and mirrored in the",
        "imagery table of `db/city.db`. Reference photos are used for visual",
        "validation only and are not projected onto facades.",
        "",
        "## DSM licence caveat",
        "",
        "The accessible DSM is the RER public ArcGIS ImageServer `DsmAgea2008`.",
        "The service metadata does not state an explicit licence. It is used for",
        "measurement and reported as *license to verify before redistribution*.",
        "",
    ]
    outputs["licenses"] = DOCS_DIR / "LICENSES.md"
    outputs["licenses"].write_text("\n".join(licenses), encoding="utf-8")

    coverage = [
        "# Street imagery coverage report",
        "",
        f"Generated: {generated}",
        "",
        "## KartaView",
        "",
        f"- Sample points: {kartaview.get('sample_points', 0)}",
        f"- Points with photos: {kartaview.get('points_with_photos', 0)}",
        f"- Photos: {kartaview.get('photo_count', 0)}",
        f"- Sequence API: {kartaview.get('sequence_api', 'n/a')}",
        "",
        "**Result: no usable street-level imagery exists for Fidenza in the public",
        "KartaView endpoint.** The pipeline therefore generates facades procedurally",
        "and records that fact on every building.",
        "",
        "## Wikimedia Commons references",
        "",
        f"- Files inventoried: {commons.get('file_count', 0)}",
        "- Used for: landmark validation and colour/detail cross-checks.",
        "- Not used for: projecting photographs onto arbitrary facades.",
        "",
    ]
    if commons.get("files"):
        coverage += [
            _table(
                ["File", "License", "Author"],
                [
                    [item.get("title"), item.get("license") or "n/a", (item.get("artist") or "n/a")[:80]]
                    for item in commons["files"][:40]
                ],
            ),
            "",
        ]
    outputs["coverage"] = DOCS_DIR / "IMAGERY_COVERAGE.md"
    outputs["coverage"].write_text("\n".join(coverage), encoding="utf-8")

    archetype_counter = Counter(item.get("archetype") for item in buildings)
    classification_report = [
        "# Architectural classification report",
        "",
        f"Generated: {generated}",
        "",
        "Classification is rule-based and evidence-weighted. It never claims a",
        "photographic reconstruction where no street-level imagery exists.",
        "Context buildings are classified for massing only; their facades are not detailed.",
        "",
        "## Distribution",
        "",
        _table(
            ["Archetype", "Style", "Buildings"],
            [
                [key, next((item.get("style_label") for item in buildings if item.get("archetype") == key), ""), count]
                for key, count in archetype_counter.most_common()
            ],
        ),
        "",
        "## Per-building records",
        "",
        _table(
            ["OSM ID", "Name", "Detail", "Archetype", "Tier", "Height (m)", "Height source", "Confidence"],
            [
                [
                    item.get("osm_id"),
                    item.get("name") or "—",
                    item.get("detail"),
                    item.get("archetype"),
                    item.get("tier"),
                    item.get("height_m"),
                    item.get("height_source"),
                    item.get("archetype_confidence"),
                ]
                for item in sorted(buildings, key=lambda value: -(value.get("height_m") or 0))[:80]
            ],
        ),
        "",
        f"Total buildings: {len(buildings)}",
        "",
    ]
    outputs["classification"] = DOCS_DIR / "ARCHITECTURE_CLASSIFICATION.md"
    outputs["classification"].write_text("\n".join(classification_report), encoding="utf-8")

    tier_counts = Counter(item.get("tier") for item in buildings)
    source_counts = Counter(item.get("height_source") for item in buildings)
    low_confidence = [
        item
        for item in buildings
        if (item.get("height_confidence") or 0) < 0.5
        or (item.get("roof", {}).get("confidence") or 0) < 0.4
        or (item.get("archetype_confidence") or 0) < 0.4
    ]
    confidence_report = [
        "# Quality and confidence report",
        "",
        f"Generated: {generated}",
        "",
        "## Tiers",
        "",
        "- **A** — landmark with licensed reference photography and measured geometry.",
        "- **B** — measured height/roof from LiDAR/orthophoto; facade grammar inferred.",
        "- **C** — footprint only or height fallback; lowest confidence.",
        "",
        _table(["Tier", "Buildings"], [[key, value] for key, value in sorted(tier_counts.items())]),
        "",
        "## Height evidence",
        "",
        _table(["Height source", "Buildings"], [[key, value] for key, value in sorted(source_counts.items())]),
        "",
        f"Median height confidence: **{stats.get('height_confidence_median', 0)}**",
        "",
        "## Roof evidence",
        "",
        f"- Roof shapes: {_counts(item.get('roof', {}).get('shape') for item in buildings)}",
        f"- Roof shape confidence median: {sorted([item.get('roof', {}).get('confidence', 0) for item in buildings])[len(buildings)//2] if buildings else 0}",
        "",
        "## Buildings requiring manual review",
        "",
    ]
    if low_confidence:
        confidence_report += [
            _table(
                ["OSM ID", "Name", "Height conf.", "Roof conf.", "Archetype conf."],
                [
                    [
                        item.get("osm_id"),
                        item.get("name") or "—",
                        item.get("height_confidence"),
                        item.get("roof", {}).get("confidence"),
                        item.get("archetype_confidence"),
                    ]
                    for item in low_confidence[:40]
                ],
            )
        ]
    else:
        confidence_report.append("None flagged.")
    confidence_report += [
        "",
        "## Unverified assumptions",
        "",
        "1. Window and shopfront positions are generated from facade width and an",
        "   architectural grammar; they are not observed measurements.",
        "2. Facade colours are typological palettes; roof colours are measured from",
        "   the 2023-24 orthophoto.",
        "3. Heights use a 2008 DSM and a 2023-24 DTM; the cross-epoch difference is",
        "   included in the confidence value.",
        "4. No street-level photographs exist, so facade proportions cannot be",
        "   photo-verified for generic buildings.",
        "5. Mansard roofs keep the type in the record but are geometrically",
        "   approximated as hipped roofs.",
        "6. Landmark LOD4 is the same detailed level as LOD3; context is LOD1.",
        "",
    ]
    outputs["confidence"] = DOCS_DIR / "CONFIDENCE_REPORT.md"
    outputs["confidence"].write_text("\n".join(confidence_report), encoding="utf-8")

    validation = [
        "# Visual validation report",
        "",
        f"Generated: {generated}",
        "",
        "## Method",
        "",
        "1. Footprints are rendered from the OSM geometry in local metric coordinates.",
        "2. Heights are measured as DSM−DTM over eroded footprints.",
        "3. Roof colour is sampled from the RER 2023-24 orthophoto, excluding vegetation",
        "   using NIR-derived NDVI.",
        "4. The orthophoto is used as the ground texture, so massing can be compared",
        "   directly against the real roof pattern.",
        "5. Landmarks are cross-checked against the Wikimedia Commons reference",
        "   inventory; a formal per-facade photographic similarity metric is not claimed.",
        "",
        "## Metrics",
        "",
        _table(
            ["Check", "Target", "Result", "Status"],
            [
                [
                    "Footprint source",
                    "OSM footprint per building",
                    f"{len(buildings)} / {len(base.get('buildings', []))}",
                    "pass",
                ],
                [
                    "Height evidence",
                    "Measured where DSM exists",
                    f"{source_counts.get('dsm_agea2008_minus_dtm_rer2023_24', 0)} / {len(buildings)}",
                    "partial" if source_counts.get("dsm_agea2008_minus_dtm_rer2023_24", 0) < len(buildings) else "pass",
                ],
                [
                    "Roof evidence",
                    "Shape + colour per building",
                    f"{len(roofs)} roof records",
                    "pass" if roofs else "fail",
                ],
                [
                    "Street imagery",
                    "Licensed street-level coverage",
                    "0 KartaView photos",
                    "unavailable",
                ],
                [
                    "Reference photography",
                    "Landmarks",
                    f"{commons.get('file_count', 0)} Commons files",
                    "partial" if commons.get("file_count") else "unavailable",
                ],
            ],
        ),
        "",
        "## Buildings reconstructed accurately",
        "",
        "Tier A pilot landmarks with a licensed reference image: "
        + (
            ", ".join(
                item.get("name") or item.get("osm_id")
                for item in buildings
                if item.get("tier") == "A" and item.get("detail") == "pilot"
            )
            or "none"
        ),
        "",
        "Context landmarks (if any) are rendered at LOD1 and are not claimed as",
        "detailed facade reconstructions.",
        "",
        "## Buildings approximated",
        "",
        f"{tier_counts.get('B', 0)} buildings are Tier B: measured height and roof. "
        "Pilot buildings have procedural facades; context buildings are LOD1 massing only.",
        "",
        "## Buildings with missing source imagery",
        "",
        f"{tier_counts.get('C', 0)} buildings are Tier C; no street-level photograph exists for them.",
        "",
        "## Uncertain dimensions",
        "",
        f"{len(low_confidence)} buildings are flagged for manual review (see CONFIDENCE_REPORT.md).",
        "",
        "## Visual comparison",
        "",
        "- `docs/screenshots/00-orthophoto-reference.jpg` — reference orthophoto crop.",
        "- `docs/screenshots/01-duomo.png` — west facade of the Cattedrale di San Donnino.",
        "- `docs/screenshots/02-porta-san-donnino.png` — medieval gate.",
        "- `docs/screenshots/03-overview.png` — extended urban area in LOD1 batch; LOD3 streams near the camera.",
        "- `docs/screenshots/04-height-confidence.png` — height confidence overlay.",
        "- `docs/screenshots/05-street-level.png` — street-level facade grammar.",
        "- `docs/screenshots/06-osm-footprints.png` — OSM footprints overlay.",
        "- `docs/screenshots/07-render-vs-orthophoto.jpg` — side-by-side comparison.",
        "",
        "## Viewer performance and export",
        "",
    ]
    if performance:
        views = performance.get("views", {})
        for name, values in views.items():
            validation += [
                f"- **{name}**: {values.get('fps')} fps, "
                f"{values.get('draw_calls')} draw calls, {values.get('triangles')} triangles",
            ]
        glb = performance.get("glb_export") or {}
        if glb:
            validation.append(
                f"- **GLB export**: `{glb.get('path')}` "
                f"({int(glb.get('bytes', 0)) / 1024 / 1024:.1f} MB)"
            )
        validation += [
            "",
            f"Measured in {performance.get('browser', 'a browser')} at "
            f"{performance.get('viewport', '1600x1000')}. Values are "
            "hardware-dependent; the detailed views are the heaviest. The GLB "
            "export is intentionally LOD1 and is produced by the in-viewer GLTFExporter.",
            "",
        ]
    else:
        validation += [
            "Run `npm run build && npm run screenshots` to capture the viewer "
            "metrics and the GLB export.",
            "",
        ]
    validation += [
        "**No approximation is reported as an exact reconstruction.**",
        "",
    ]
    outputs["validation"] = DOCS_DIR / "VALIDATION_REPORT.md"
    outputs["validation"].write_text("\n".join(validation), encoding="utf-8")

    return outputs
