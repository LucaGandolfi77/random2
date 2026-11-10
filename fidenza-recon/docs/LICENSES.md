# Licenses and attribution

This project does **not** use Google Street View, Google Photorealistic 3D Tiles,
or any other source whose terms prohibit extraction of standalone 3D assets.

## Runtime data

### OpenStreetMap

- License: **ODbL 1.0**
- URL: https://opendatacommons.org/licenses/odbl/1-0/
- Attribution: © OpenStreetMap contributors

### Regione Emilia-Romagna — Ortofoto/DTM RER 2023-24

- License: **CC BY 4.0**
- URL: https://creativecommons.org/licenses/by/4.0/
- Attribution: Regione Emilia-Romagna

### Regione Emilia-Romagna — DSM AGEA 2008 (public ArcGIS service)

- License: **RER public service — verify before redistribution**
- URL: https://geoportale.regione.emilia-romagna.it/
- Attribution: Regione Emilia-Romagna / AGEA 2008

### Regione Emilia-Romagna — DBTR Unità volumetrica (WMS)

- License: **CC BY 4.0**
- URL: https://geoportale.regione.emilia-romagna.it/catalogo/dati-cartografici/cartografia-di-base/database-topografico-regionale
- Attribution: Regione Emilia-Romagna — Database Topografico Regionale

### Wikimedia Commons

- License: **per-file (CC BY / CC BY-SA / public domain)**
- URL: https://commons.wikimedia.org/wiki/Commons:Licensing
- Attribution: see docs/LICENSES.md

## Reference photography

Wikimedia Commons files retain their per-file license and author. The
inventory is stored in `data/raw/commons/commons.json` and mirrored in the
imagery table of `db/city.db`. Reference photos are used for visual
validation only and are not projected onto facades.

## DSM licence caveat

The accessible DSM is the RER public ArcGIS ImageServer `DsmAgea2008`.
The service metadata does not state an explicit licence. It is used for
measurement and reported as *license to verify before redistribution*.
