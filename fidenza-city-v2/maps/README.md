# Mappe editabili

La cartella `maps/` contiene i manifest delle mappe. La mappa di Fidenza è in
`maps/fidenza/map.json`; `maps/_template/` è il punto di partenza per una nuova
città o una nuova versione.

## Flusso di lavoro

1. Copia `maps/_template/` in `maps/<id>/`.
2. Modifica `map.json`:
   - `center`, `origin`, `bbox`;
   - `places` con coordinate `lat/lon` e, quando possibile, ID OSM (`way/…`, `node/…`, `relation/…`);
   - `landmarks` con il modello 3D e l’eventuale rotazione;
   - `missions` con passi `x/z` oppure `place` + `offsetX/offsetZ`;
   - `seasons`.
3. Rigenera la geometria:

```bash
node tools/build-city.mjs --map maps/<id>/map.json --refresh
node tools/build-terrain.mjs --map maps/<id>/map.json --refresh
```

4. Compila il bundle dati e gli stili:

```bash
node tools/import-map.mjs --map maps/<id>/map.json --out data/map.json
```

5. Verifica POI, beacon, stelle e missioni:

```bash
node tools/audit-pois.mjs
node tools/validate-map.mjs
```

`audit-pois.mjs` confronta i POI con OpenStreetMap; `validate-map.mjs` controlla
che beacon, stelle e target delle missioni siano fuori dagli edifici e dentro
l’area giocabile. I report finiscono in `data/poi-audit.json` e
`data/map-validation.json`.

## Campi principali di `places`

| Campo | Descrizione |
| --- | --- |
| `id` | identificatore univoco |
| `name`, `short` | nome completo e nome breve sulla mappa |
| `category` | `church`, `museum`, `theatre`, `square`, `monument`, `station`, `park`, `civic`, `nature`, `service`, `food` |
| `osm` | ID OSM per l’audit, es. `way/182278537` |
| `lat`, `lon` | coordinate geografiche |
| `collectible` | se è uno degli 11 luoghi scopribili |
| `beacon` | posizione locale opzionale del fascio di luce; se assente viene calcolata dall’importer |
| `radius` | raggio di interazione in metri |
| `description`, `fact` | testi della scheda |

## Stili stagionali

`styles/<stagione>.json` controlla palette, luci, nebbia, vegetazione,
particelle, meteo e props. Per aggiungere una stagione, crea il file e
aggiungilo a `seasons.styles` nel manifest. La stagione può essere automatica
(in base al mese) o scelta dal giocatore; l’override URL è `?season=winter`.

## Note

- I dati OSM derivati restano soggetti a ODbL.
- Le coordinate locali usano un’origine tangente; non serve una libreria GIS.
- I beacon vengono ricalcolati dall’importer se la coordinata esplicita finisce
  dentro un edificio.
