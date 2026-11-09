# Fidenza — ricostruzione 3D provenance-first

Ricostruzione 3D dell'isolato di **Piazza Duomo a Fidenza (PR)**: 259 edifici
dettagliati a LOD3, 379 edifici di contesto a LOD1, altezze misurate da
DSM−DTM, tetti e colori campionati sull'ortofoto RER 2023‑24, facciate
procedurali dichiarate come tali.

![Veduta dell'isolato](docs/screenshots/01-duomo.png)

> **Onestà del dato.** Fidenza non ha copertura street-level nel servizio
> pubblico KartaView (0 foto). Le facciate generiche sono quindi **ricostruite
> proceduralmente** a partire da morfologia, altezza, archetipo e orthophoto;
> non sono spacciate per ricostruzioni fotografiche. Il report di validazione
> elenca cosa è accurato, approssimato o da rivedere.

---

## Avvio rapido

```bash
# 1. Pipeline Python
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# 2. Viewer web
npm install
npm --prefix web install

# 3. Rigenera dati e modello (richiede rete: Overpass, RER, Wikimedia)
python -m fidenza_recon.cli all

# 4. Sincronizza il payload nel viewer e avvia
npm run data:sync
npm run dev
```

Apri `http://127.0.0.1:5173`.

Comandi utili:

```bash
python -m fidenza_recon.cli fetch       # OSM + RER + KartaView + Commons
python -m fidenza_recon.cli analyze     # impronte, altezze, tetti, archetipi
python -m fidenza_recon.cli generate    # descrittori, city.json, database
python -m fidenza_recon.cli report      # report in docs/
pytest                                  # test Python
npm --prefix web test                   # test TypeScript
ruff check pipeline                     # lint Python
npm run typecheck                       # typecheck TypeScript
npm run screenshots                     # screenshot + GLB + metriche
```

I dati grezzi e i raster sono in `data/raw` (gitignored). Il payload del viewer
è `data/processed/city.json`, copiato in `web/public/data/city.json`.

---

## Scope

| Area | Edifici | Dettaglio |
|---|---:|---|
| **Pilota** — Piazza Duomo, Duomo, Porta San Donnino, Teatro Magnani | 259 | LOD3: facciate con aperture, cornici, balconi, persiane, negozi, portali; tetti con falde, comignoli, paracarro |
| **Contesto** — buffer urbano di ~600×620 m | 379 | LOD1: volumi e tetti misurati, nessuna facciata dettagliata |

Il pilota non è un'isola: il contesto LOD1 evita che l'isolato galleggi sul
vuoto e permette di confrontare il dettaglio con la città reale.

---

## Fonti e licenze

| Fonte | Uso | Licenza |
|---|---|---|
| [OpenStreetMap / Overpass](https://www.openstreetmap.org/) | Impronte, strade, arredo, civici | **ODbL 1.0** — © OpenStreetMap contributors |
| [RER 2023‑24 ortofoto RGB/NIR](https://geoportale.regione.emilia-romagna.it/approfondimenti/rer23_24) | Colori tetti, NDVI, texture di base | **CC BY 4.0** |
| [DTM RER 2023‑24](https://servizigis.regione.emilia-romagna.it/arcgis/rest/services/public/DtmRER2023_24/ImageServer) | Quota terreno, nDSM | **CC BY 4.0** |
| [DSM AGEA 2008](https://servizigis.regione.emilia-romagna.it/arcgis/rest/services/public/DsmAgea2008/ImageServer) | Superficie edifici per le altezze | Servizio pubblico RER; **licenza da verificare prima della ridistribuzione** |
| [KartaView](https://kartaview.org/) | Copertura street-level | Nessuna foto disponibile: 0 download |
| [Wikimedia Commons](https://commons.wikimedia.org/) | 40 foto di riferimento per la validazione | Licenza per-file (CC BY, CC BY‑SA, pubblico dominio) |

**Google Street View / Photorealistic 3D Tiles non sono usati.** Nessun asset
derivato da Google è presente nel progetto.

L'inventario completo, con URL, data di pubblicazione, risoluzione e checksum,
è generato in [`docs/DATA_INVENTORY.md`](docs/DATA_INVENTORY.md) e
[`docs/LICENSES.md`](docs/LICENSES.md).

---

## Pipeline

```
OSM Overpass ─┐
RER ortofoto ─┼─> data/raw ─> buildings_base ─> heights (nDSM) ─> roofs ─> classify
RER DTM/DSM ──┘                                      │
Wikimedia ────> reference imagery                    v
                                              descriptors.json
                                                     │
                                                     v
                                            city.json + city.db
                                                     │
                                                     v
                                     Three.js viewer (procedural LOD3)
```

Moduli principali:

- `pipeline/fidenza_recon/fetch/overpass.py` — query, parsing way/relation,
  strade, arredo, civici.
- `fetch/rer.py` — export GeoTIFF georeferenziati da ArcGIS ImageServer,
  ortophoto/NIR/DTM/DSM, texture di base con correzione colore **solo display**.
- `fetch/kartaview.py` — griglia di copertura, riporta l'assenza di foto.
- `fetch/commons.py` — reference photography con rate limiting, licenze e autori.
- `analyze/buildings.py` — proiezione locale, impronte, lati, contesto stradale,
  distinzione pilota/contesto.
- `analyze/heights.py` — `nDSM = DSM 2008 − DTM 2023‑24`, percentile robusto,
  maschera vegetazione NDVI, confidenza per edificio.
- `analyze/roofs.py` — forma del tetto da nDSM, colore misurato da ortofoto,
  normalizzazione del colore di visualizzazione (il colore misurato resta nel DB).
- `analyze/classify.py` — archetipi con regole ed evidenze, tier A/B/C.
- `generate/descriptors.py` — grammatica di facciata deterministica (seed =
  OSM ID): campate, finestre, porte, negozi, balconi, cornici, lesene.
- `generate/city.py` — terreno, strade, arredo, payload runtime.
- `export/db_export.py` — popola `db/city.db` (edifici, facciate, imagery,
  validazione).
- `validate/report.py` — report di inventario, licenze, copertura, classificazione,
  confidenza e validazione.

### Coordinate

- CRS metrico: **EPSG:7791** (RDN2008 / UTM 32N).
- Origine locale: Duomo di San Donnino (`10.0578098, 44.866476`).
- Runtime: `x = est`, `z = sud`, `y = su`, metri. Nessuna coordinata globale
  inviata alla GPU.

---

## Viewer e generazione procedurale

- **Three.js + Vite + TypeScript strict**.
- `THREE.LOD` per edificio del pilota: LOD3 (dettaglio), LOD2 (involucro),
  LOD1 (volumi), LOD0 (impronta).
- Contesto: batch unico con vertex colors, 2 draw call per 379 edifici.
- Dettagli di facciata: `InstancedMesh` globali (telai, vetri, persiane,
  balconi, cornici, lesene, archi) → poche draw call per migliaia di elementi.
- Muri con **aperture reali** (ExtrudeGeometry con holes), telai, vetri,
  davanzali, persiane, balconi con ringhiere in ferro o pietra, cornici,
  lesene, portali, rosoni, croci di colmo.
- Tetti: piani, a falde, a padiglione, mansardati; comignoli, paracarro,
  camini, pluviali.
- Strade: marciapiedi, cordoli, attraversamenti, segnaletica; la superficie
  stradale usa l'ortofoto reale per evitare texture inventate.
- Debug: impronte OSM, heatmap confidenza altezze, etichette landmark,
  ispettore provenienza al click.
- Export **GLB** dal viewer (`GLTFExporter`), verificato a ~43 MB.

### Controlli

- Trascina per orbitare, rotella per zoom, click su un edificio per ispezionare
  fonte, confidenza, archetipo e dettagli procedurali.
- Tasti `1`–`4`: Duomo, Porta San Donnino, veduta d'insieme, livello strada.
- Pannello "Lettura del modello": impronte, confidenza, etichette, dettagli.

---

## Validazione e qualità

Report generati:

- [`docs/VALIDATION_REPORT.md`](docs/VALIDATION_REPORT.md)
- [`docs/CONFIDENCE_REPORT.md`](docs/CONFIDENCE_REPORT.md)
- [`docs/ARCHITECTURE_CLASSIFICATION.md`](docs/ARCHITECTURE_CLASSIFICATION.md)
- [`docs/IMAGERY_COVERAGE.md`](docs/IMAGERY_COVERAGE.md)
- [`docs/DATA_INVENTORY.md`](docs/DATA_INVENTORY.md)
- [`docs/LICENSES.md`](docs/LICENSES.md)

Numeri chiave dell'ultima esecuzione:

- 638 edifici totali: **259 pilota + 379 contesto**
- 9.816 finestre e 1.449 balconi procedurali
- 624 / 638 altezze misurate da DSM−DTM; 14 stime tipologiche dichiarate
- confidenza mediana delle altezze: **72%**
- 40 foto di riferimento Wikimedia Commons; **0 foto KartaView**
- 1.399 facciate registrate nel DB con layout e provenienza
- 313 righe di validazione, di cui 309 edifici flaggati per review

### Tier di confidenza

- **A** — landmark con riferimento fotografico licenziato e geometria misurata.
- **B** — altezza/tetto misurati, facciata procedurale inferita.
- **C** — solo impronta o altezza da fallback; confidenza bassa.

### Limiti dichiarati

1. **Nessuna street imagery**: KartaView non ha foto a Fidenza. Le facciate
   generiche non sono verificabili fotograficamente.
2. **DSM 2008 vs DTM 2023‑24**: l'altezza è cross-epoch; l'incertezza è
   registrata per edificio. Il DSM AGEA 2008 ha licenza da verificare.
3. **Colore dei tetti**: misurato sull'ortofoto, ma normalizzato per la
   visualizzazione; il valore misurato è conservato in `roof_colour_measured`.
4. **Contesto LOD1**: i 379 edifici fuori dal pilota non hanno facciate
   dettagliate. I landmark usano il livello massimo (LOD3+, equivalente a LOD4
   nella terminologia della specifica).
5. **Texture di base**: l'ortofoto è color-graded solo per il display; i
   GeoTIFF usati per le misure sono intatti.
6. **Tetti mansardati**: il tipo è conservato nel record, ma la geometria è
   approssimata come padiglione a due falde.
7. **Ricognizione dataset**: non è emerso un CityGML/CityJSON comunale pubblico
   per Fidenza. Il DSM RER 2023‑24 esiste come prodotto preconfezionato, ma non
   era esposto come servizio aperto in questa build: è stato usato il DSM AGEA
   2008 pubblico, con l'incertezza cross-epoch dichiarata.
8. **Validazione manuale**: i landmark sono confrontati con Commons; non c'è
   un benchmark automatico di similarità fotografica.
9. **Prestazioni**: la macchina di test riporta 49–60 fps a 1600×1000
   (overview 49 fps, viste ravvicinate 59–60 fps), con 149–526 draw call e
   ~1,5–1,7 M triangoli. Il GLB esportato è di ~43 MB. Le prestazioni vanno
   riverificate sull'hardware target.

---

## Struttura del progetto

```
fidenza-recon/
├── config/                 # città, archetipi, materiali
├── pipeline/fidenza_recon/ # fetch, analyze, generate, export, validate
├── web/                    # viewer Three.js + Vite
│   └── src/city/           # generatori facciate, tetti, edifici, strade, props
├── data/raw/               # cache OSM/RER/Commons (gitignored)
├── data/processed/         # city.json, descriptors, raster nDSM/NDVI, GLB
├── db/city.db              # provenienza, edifici, facciate, imagery, validazione
├── docs/                   # report + screenshots
└── scripts/                # sync dati, screenshot/GLB
```

---

## Deliverable (specifica §13)

| # | Deliverable | Dove |
|---|---|---|
| 1 | Modello 3D aggiornato | `web/` + `data/processed/export/fidenza-piazza-duomo.glb` |
| 2 | Database metadati edifici | `db/city.db` (638 edifici, 1.399 facciate, 40 imagery) |
| 3 | Inventario fonti e licenze | `docs/DATA_INVENTORY.md`, `docs/LICENSES.md` |
| 4 | Report copertura imagery | `docs/IMAGERY_COVERAGE.md` |
| 5 | Report classificazione architettonica | `docs/ARCHITECTURE_CLASSIFICATION.md` |
| 6 | Generatore procedurale edifici | `pipeline/.../generate/descriptors.py`, `web/src/city/building.ts` |
| 7 | Sistema di generazione facciate | `web/src/city/facade.ts`, `config/archetypes.yaml` |
| 8 | Sistema LOD | `web/src/city/building.ts` (`THREE.LOD`), contesto batch LOD1 |
| 9 | Screenshot di confronto | `docs/screenshots/` |
| 10 | Report qualità e confidenza | `docs/CONFIDENCE_REPORT.md`, `docs/VALIDATION_REPORT.md` |

---

## Riproducibilità

- Ogni dataset ha URL, data di accesso, risoluzione, bbox, licenza e checksum
  in `db/city.db` e `docs/DATA_INVENTORY.md`.
- I descrittori di facciata sono deterministici: stesso OSM ID + stessa
  configurazione ⇒ stesso layout.
- La pipeline è idempotente con `--force`; senza `--force` usa la cache locale.
- Il report di validazione non dichiara mai un'approssimazione come ricostruzione
  esatta: i tier e i flag procedurali sono espliciti in ogni record.
