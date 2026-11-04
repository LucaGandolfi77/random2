# Fidenza da Giocare v2

![Fidenza da Giocare v2](assets/img/corso.jpg)

Open world gratuito nel browser ambientato a **Fidenza**, Emilia-Romagna. La v2
corregge i punti di interesse, raddrizza la facciata del Duomo, aggiunge tetti,
comignoli, stagioni, un livello POI completo e un formato mappa editabile.

> Progetto indipendente e non ufficiale, non affiliato al Comune di Fidenza.

## Avvio

Serve un server statico: i moduli ES e i dati JSON non funzionano aprendo
`index.html` con `file://`.

```bash
cd fidenza-city-v2
python3 -m http.server 8081
# apri http://localhost:8081
```

In alternativa:

```bash
npx serve fidenza-city-v2
```

## Comandi

| Azione | Desktop | Mobile |
| --- | --- | --- |
| Muoversi | WASD / frecce | levetta |
| Correre | Shift | pulsante Corri |
| Guardare | mouse (pointer lock) | trascina sul canvas |
| Interagire | E | pulsante ▶ |
| Entrare/uscire dal veicolo | E vicino al veicolo | pulsante ▶ / Auto |
| Freno | Spazio | pulsante Freno |
| Clacson | H | pulsante 📯 |
| Missioni | F | tabellone con ▶ |
| Mappa | N o click sulla minimappa | click sulla minimappa |
| Audio | M | pulsante audio |
| Stagione | selettore in pausa o nell’intro | selettore |
| Pausa | Esc / P | Esc |

## Cosa c’è nella v2

- **Mappa corretta**: Piazza Duomo riportata davanti alla cattedrale, Palazzo
  Comunale sulla relation OSM `2428450`, Obelisco separato in Piazza Garibaldi,
  Duomo con facciata rivolta a ovest.
- **POI verificati**: 11 luoghi collezionabili + un livello completo di punti di
  interesse con icone per chiese, musei, teatri, piazze, monumenti, stazione,
  parchi e uffici.
- **Grafica**: tetti a falde, comignoli, facciate con finestre, fasce, balconi,
  tende, marciapiedi, arredo urbano, illuminazione e ombre morbide.
- **Stagioni**: primavera, estate, autunno e inverno con palette, vegetazione,
  particelle, nebbia, neve al suolo, luci natalizie e meteo.
- **Mappa editabile**: manifest JSON, schema, template per nuove città, importer,
  audit POI e validatore di raggiungibilità.
- **Gameplay**: auto, Vespa, taxi, ambulanza, cinque missioni, 27 stelle, mappa
  completa, audio sintetizzato, PWA offline.

## Dati e correzioni

La mappa è costruita da OpenStreetMap e Terrain Tiles. I POI sono confrontati
con le feature OSM tramite `tools/audit-pois.mjs`.

Correzioni principali rispetto alla v1:

- **Piazza Duomo** non è l’obelisco: l’obelisco è un POI separato.
- **Palazzo Comunale** non è il nodo “Comune di Fidenza”: è la relation
  `2428450`, più a sud.
- **Duomo**: la facciata principale è a ovest, verso Piazza Duomo.
- **Spawn**: in Piazza Duomo, con vista frontale sulla facciata.
- **Stirone**: trattato come feature lineare, non come punto centrale.

Rigenerazione:

```bash
node tools/build-city.mjs --map maps/fidenza/map.json --refresh
node tools/build-terrain.mjs --map maps/fidenza/map.json --refresh
node tools/import-map.mjs --map maps/fidenza/map.json
node tools/audit-pois.mjs
node tools/validate-map.mjs
```

## Mappe e stagioni

La mappa editabile è `maps/fidenza/map.json`; gli stili stagionali sono in
`maps/fidenza/styles/`. Per importare un’altra città o una nuova versione:

1. copia `maps/_template/` in `maps/<id>/`;
2. modifica `map.json`;
3. lancia i tool con `--map maps/<id>/map.json`;
4. il gioco carica `data/map.json`.

La stagione predefinita è automatica in base al mese. Puoi forzarla con
`?season=spring`, `?season=summer`, `?season=autumn` o `?season=winter`, oppure
dal selettore in pausa/intro. La scelta viene salvata in locale.

## Struttura

```text
fidenza-city-v2/
  index.html
  manifest.webmanifest
  sw.js
  css/style.css
  js/
    main.js          avvio, loop, stagioni, interazioni
    world.js         terreno, edifici, tetti, props, stagioni, traffico
    landmarks.js     modelli dei luoghi simbolo
    missions.js      missioni guidate dal manifest
    map.js           minimappa, mappa completa, POI
    player.js        controller terza persona
    vehicles.js      guida arcade
    hud.js           interfaccia DOM
    audio.js         audio sintetizzato WebAudio
  maps/
    fidenza/
      map.json
      styles/
        spring.json summer.json autumn.json winter.json
    _template/
    README.md
  schema/
    map.schema.json
    style.schema.json
  tools/
    build-city.mjs
    build-terrain.mjs
    import-map.mjs
    audit-pois.mjs
    validate-map.mjs
  data/
    city.json
    terrain.json
    map.json
    styles/
    poi-audit.json
    map-validation.json
  assets/
    fonts/
    icons/
    img/
  vendor/
    three.module.js
    BufferGeometryUtils.js
```

## Note tecniche

- Three.js è self-hosted; l’import map in `index.html` punta a `vendor/`.
- Le geometrie statiche sono unite per materiale; alberi, lampioni, panchine e
  bollard usano instancing.
- Le collisioni sono 2D (cerchio vs poligono) con spatial hash.
- La mappa 2D è disegnata dai dati della città su un canvas offscreen, senza
  tile server a runtime.
- Il service worker mette in cache shell, dati, stili, font e Three.js.

> Se modifichi file statici, incrementa la costante `CACHE` in `sw.js`.

## Licenze

- Codice del gioco: originale, distribuito con la licenza del repository.
- Dati OpenStreetMap: ODbL.
- Terrain Tiles: attribuzione Mapzen / EU-DEM Copernicus.
- Three.js: MIT.
- Font Anton e Oswald: SIL Open Font License 1.1.

Vedi `data/ATTRIBUTION.md`.
