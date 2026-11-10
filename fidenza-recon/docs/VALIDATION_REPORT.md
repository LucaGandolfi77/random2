# Visual validation report

Generated: 2026-11-10T13:56:19+00:00

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
| Footprint source | OSM footprint per building | 4585 / 4585 | pass |
| Height evidence | Measured where DSM exists | 4474 / 4585 | partial |
| Roof evidence | Shape + colour per building | 4585 roof records | pass |
| Street imagery | Licensed street-level coverage | 0 inside bbox (5 nearby) | unavailable |
| Reference photography | Landmarks | 32 Commons files | partial |

## Buildings reconstructed accurately

Tier A pilot landmarks with a licensed reference image: Chiesa di San Tommaso Becket, Chiesa del Sacro Cuore, Chiesa di Sant'Antonio Abate, Fidenza, Chiesa di San Pietro, Santuario della Gran Madre di Dio, Oratorio di San Giorgio, ex Chiesa di San Michele Arcangelo, Cattedrale di San Donnino, Chiesa di Santa Maria Annunziata, Teatro Girolamo Magnani, Porta di San Donnino

Context landmarks (if any) are rendered at LOD1 and are not claimed as
detailed facade reconstructions.

## Buildings approximated

4462 buildings are Tier B: measured height and roof. Pilot buildings have procedural facades; context buildings are LOD1 massing only.

## Buildings with missing source imagery

111 buildings are Tier C; no street-level photograph exists for them.

## Uncertain dimensions

2622 buildings are flagged for manual review (see CONFIDENCE_REPORT.md).

## Visual comparison

- `docs/screenshots/00-orthophoto-reference.jpg` — reference orthophoto crop.
- `docs/screenshots/01-duomo.png` — west facade of the Cattedrale di San Donnino.
- `docs/screenshots/02-porta-san-donnino.png` — medieval gate.
- `docs/screenshots/03-overview.png` — extended urban area in LOD1 batch; LOD3 streams near the camera.
- `docs/screenshots/04-height-confidence.png` — height confidence overlay.
- `docs/screenshots/05-street-level.png` — street-level facade grammar.
- `docs/screenshots/06-osm-footprints.png` — OSM footprints overlay.
- `docs/screenshots/07-render-vs-orthophoto.jpg` — side-by-side comparison.

## Viewer performance and export

- **duomo**: 50 fps, 711 draw calls, 2730k triangles
- **porta**: 51 fps, 809 draw calls, 2827k triangles
- **overview**: 60 fps, 348 draw calls, 600k triangles
- **street**: 60 fps, 411 draw calls, 2707k triangles
- **GLB export**: `data/processed/export/fidenza-piazza-duomo.glb` (23.7 MB)

Measured in Chrome headless (channel: chrome) at 1600x1000. Values are hardware-dependent; the detailed views are the heaviest. The GLB export is intentionally LOD1 and is produced by the in-viewer GLTFExporter.

**No approximation is reported as an exact reconstruction.**
