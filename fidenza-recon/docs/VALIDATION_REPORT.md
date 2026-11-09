# Visual validation report

Generated: 2026-11-08T23:46:25+00:00

## Method

1. Footprints are rendered from the OSM geometry in local metric coordinates.
2. Heights are measured as DSM−DTM over eroded footprints.
3. Roof colour is sampled from the RER 2023-24 orthophoto, excluding vegetation
   using NIR-derived NDVI.
4. The orthophoto is used as the ground texture, so massing can be compared
   directly against the real roof pattern.
5. Landmarks are cross-checked against the Wikimedia Commons reference
   inventory; a formal per-facade photographic similarity metric is not claimed.

## Metrics

| Check | Target | Result | Status |
| --- | --- | --- | --- |
| Footprint source | OSM footprint per building | 638 / 638 | pass |
| Height evidence | Measured where DSM exists | 624 / 638 | partial |
| Roof evidence | Shape + colour per building | 638 roof records | pass |
| Street imagery | Licensed street-level coverage | 0 KartaView photos | unavailable |
| Reference photography | Landmarks | 40 Commons files | partial |

## Buildings reconstructed accurately

Tier A pilot landmarks with a licensed reference image: Oratorio di San Giorgio, Cattedrale di San Donnino, Teatro Girolamo Magnani, Porta di San Donnino

Context landmarks (if any) are rendered at LOD1 and are not claimed as
detailed facade reconstructions.

## Buildings approximated

619 buildings are Tier B: measured height and roof. Pilot buildings have procedural facades; context buildings are LOD1 massing only.

## Buildings with missing source imagery

14 buildings are Tier C; no street-level photograph exists for them.

## Uncertain dimensions

309 buildings are flagged for manual review (see CONFIDENCE_REPORT.md).

## Visual comparison

- `docs/screenshots/00-orthophoto-reference.jpg` — reference orthophoto crop.
- `docs/screenshots/01-duomo.png` — west facade of the Cattedrale di San Donnino.
- `docs/screenshots/02-porta-san-donnino.png` — medieval gate.
- `docs/screenshots/03-overview.png` — pilot + context massing.
- `docs/screenshots/04-height-confidence.png` — height confidence overlay.
- `docs/screenshots/05-street-level.png` — street-level facade grammar.
- `docs/screenshots/06-osm-footprints.png` — OSM footprints overlay.
- `docs/screenshots/07-render-vs-orthophoto.jpg` — side-by-side comparison.

## Viewer performance and export

- **duomo**: 60 fps, 368 draw calls, 1587k triangles
- **porta**: 60 fps, 336 draw calls, 1556k triangles
- **overview**: 49 fps, 526 draw calls, 1661k triangles
- **street**: 59 fps, 149 draw calls, 1469k triangles
- **GLB export**: `data/processed/export/fidenza-piazza-duomo.glb` (42.9 MB)

Measured in Chrome headless (channel: chrome) at 1600x1000. The overview is the heaviest view; values are hardware-dependent. The GLB export was produced by the in-viewer GLTFExporter.

**No approximation is reported as an exact reconstruction.**
