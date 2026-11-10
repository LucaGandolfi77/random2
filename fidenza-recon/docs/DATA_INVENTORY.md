# Data inventory

Generated: 2026-11-09T23:37:26+00:00

Pilot: **Centro urbano esteso di Fidenza** — detail bbox WGS84 `[10.0506, 44.8609, 10.0659, 44.8719]`
Context bbox WGS84 `[10.0506, 44.8609, 10.0659, 44.8719]`; pilot buildings are LOD3, context is LOD1.

## Registered datasets

| Source | Product | CRS | Path | License |
| --- | --- | --- | --- | --- |
| osm | pilot buildings, roads and street furniture | EPSG:4326 | C:\Users\lggan\Desktop\AI\Github\random2\fidenza-recon\data\raw\osm\buildings.geojson | ODbL 1.0 |
| rer_ortho | orthophoto RGB | EPSG:7791 | C:\Users\lggan\Desktop\AI\Github\random2\fidenza-recon\data\raw\rer\ortho_rgb.tif | CC BY 4.0 |
| rer_ortho | orthophoto NIR | EPSG:7791 | C:\Users\lggan\Desktop\AI\Github\random2\fidenza-recon\data\raw\rer\ortho_nir.tif | CC BY 4.0 |
| rer_dtm | DTM 0.5 m | EPSG:7791 | C:\Users\lggan\Desktop\AI\Github\random2\fidenza-recon\data\raw\rer\dtm_rer2023_24.tif | CC BY 4.0 |
| rer_dsm_agea2008 | DSM AGEA 2008 | EPSG:7791 | C:\Users\lggan\Desktop\AI\Github\random2\fidenza-recon\data\raw\rer\dsm_agea2008.tif | RER public service — license to verify before redistribution |

## Sources

| Key | Name | License | URL | Retrieved |
| --- | --- | --- | --- | --- |
| kartaview | KartaView (OpenStreetCam) | per-sequence; verify before use | https://kartaview.org/ | 2026-11-09T22:53:34+00:00 |
| osm | OpenStreetMap via Overpass API | ODbL 1.0 | https://www.openstreetmap.org/ | 2026-11-09T22:48:46+00:00 |
| rer_dsm_agea2008 | Regione Emilia-Romagna public ArcGIS service — DSM AGEA 2008 | RER public service — license to verify before redistribution | https://servizigis.regione.emilia-romagna.it/arcgis/rest/services/public/DsmAgea2008/ImageServer | None |
| rer_dtm | Regione Emilia-Romagna — DTM RER 2023-24 | CC BY 4.0 | https://geoportale.regione.emilia-romagna.it/approfondimenti/rer23_24 | None |
| rer_ortho | Regione Emilia-Romagna — Ortofoto RER 2023-24 RGB/NIR | CC BY 4.0 | https://geoportale.regione.emilia-romagna.it/approfondimenti/rer23_24 | None |
| wikimedia_commons | Wikimedia Commons | per-file (CC BY / CC BY-SA / public domain) | https://commons.wikimedia.org/ | 2026-11-09T23:03:27+00:00 |

## Counts

- Buildings: 1397 (1367 pilot + 30 context)
- Windows (procedural): 44751
- Balconies (procedural): 6286
- Landmarks: 9
- Road segments: 582
- Street props: 349

## Discovery notes

- No public municipal CityGML/CityJSON or cadastral 3D dataset for Fidenza
  was found in the regional CKAN catalogue or the RER ArcGIS service directory.
- The RER 2023-24 LiDAR/DSM product exists as a pre-packaged regional
  dataset, but no open DSM image service for that vintage was exposed
  during this build. The public DSM AGEA 2008 ImageServer was used for
  heights instead; the cross-epoch limitation is recorded per building.
- Orthophoto, NIR and DTM RER 2023-24 are used as-is; only the display
  ground texture is colour-graded.
