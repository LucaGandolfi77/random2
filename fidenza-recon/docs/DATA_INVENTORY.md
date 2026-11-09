# Data inventory

Generated: 2026-11-08T23:46:25+00:00

Pilot: **Isolato di Piazza Duomo** — detail bbox WGS84 `[10.0562, 44.8652, 10.0603, 44.8676]`
Context bbox WGS84 `[10.0544, 44.8636, 10.0621, 44.8692]`; pilot buildings are LOD3, context is LOD1.

## Registered datasets

| Source | Product | CRS | Path | License |
| --- | --- | --- | --- | --- |
| osm | pilot buildings, roads and street furniture | EPSG:4326 | /Users/jessicabottarelli/Desktop/Gandalf/Github/random2/fidenza-recon/data/raw/osm/buildings.geojson | ODbL 1.0 |
| rer_ortho | orthophoto RGB | EPSG:7791 | /Users/jessicabottarelli/Desktop/Gandalf/Github/random2/fidenza-recon/data/raw/rer/ortho_rgb.tif | CC BY 4.0 |
| rer_ortho | orthophoto NIR | EPSG:7791 | /Users/jessicabottarelli/Desktop/Gandalf/Github/random2/fidenza-recon/data/raw/rer/ortho_nir.tif | CC BY 4.0 |
| rer_dtm | DTM 0.5 m | EPSG:7791 | /Users/jessicabottarelli/Desktop/Gandalf/Github/random2/fidenza-recon/data/raw/rer/dtm_rer2023_24.tif | CC BY 4.0 |
| rer_dsm_agea2008 | DSM AGEA 2008 | EPSG:7791 | /Users/jessicabottarelli/Desktop/Gandalf/Github/random2/fidenza-recon/data/raw/rer/dsm_agea2008.tif | RER public service — license to verify before redistribution |

## Sources

| Key | Name | License | URL | Retrieved |
| --- | --- | --- | --- | --- |
| kartaview | KartaView (OpenStreetCam) | per-sequence; verify before use | https://kartaview.org/ | 2026-11-08T22:59:51+00:00 |
| osm | OpenStreetMap via Overpass API | ODbL 1.0 | https://www.openstreetmap.org/ | 2026-11-08T23:20:41+00:00 |
| rer_dsm_agea2008 | Regione Emilia-Romagna public ArcGIS service — DSM AGEA 2008 | RER public service — license to verify before redistribution | https://servizigis.regione.emilia-romagna.it/arcgis/rest/services/public/DsmAgea2008/ImageServer | None |
| rer_dtm | Regione Emilia-Romagna — DTM RER 2023-24 | CC BY 4.0 | https://geoportale.regione.emilia-romagna.it/approfondimenti/rer23_24 | None |
| rer_ortho | Regione Emilia-Romagna — Ortofoto RER 2023-24 RGB/NIR | CC BY 4.0 | https://geoportale.regione.emilia-romagna.it/approfondimenti/rer23_24 | None |
| wikimedia_commons | Wikimedia Commons | per-file (CC BY / CC BY-SA / public domain) | https://commons.wikimedia.org/ | 2026-11-08T23:20:41+00:00 |

## Counts

- Buildings: 638 (259 pilot + 379 context)
- Windows (procedural): 9816
- Balconies (procedural): 1449
- Landmarks: 4
- Road segments: 248
- Street props: 148

## Discovery notes

- No public municipal CityGML/CityJSON or cadastral 3D dataset for Fidenza
  was found in the regional CKAN catalogue or the RER ArcGIS service directory.
- The RER 2023-24 LiDAR/DSM product exists as a pre-packaged regional
  dataset, but no open DSM image service for that vintage was exposed
  during this build. The public DSM AGEA 2008 ImageServer was used for
  heights instead; the cross-epoch limitation is recorded per building.
- Orthophoto, NIR and DTM RER 2023-24 are used as-is; only the display
  ground texture is colour-graded.
