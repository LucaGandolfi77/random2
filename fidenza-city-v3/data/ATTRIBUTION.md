# Attribuzioni e licenze

**Fidenza da Giocare** è un progetto indipendente e non ufficiale, non affiliato al Comune di Fidenza.

## Dati geografici

- **Mappa e dati vettoriali**: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), distribuiti con licenza [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
  - Il file `data/city.json` è un database derivato da OpenStreetMap e resta soggetto a ODbL.
  - Lo snapshot `data/osm-roads.json` contiene i way `highway` con tag e geometria, usati per normalizzare larghezze e verificare i centerline; è anch'esso derivato da OpenStreetMap (ODbL).
  - Per usi che modificano o redistribuiscono il database, valgono gli obblighi di attribuzione e condivisione allo stesso modo previsti da ODbL.
- **Rilievo fuori centro**: [AWS Open Data — Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) — Mapzen, con dati EU-DEM Copernicus. Il file `data/terrain.json` è derivato dai tile Terrarium AWS ad alta risoluzione.
- **Dettagli del centro storico**: negozi, arredo urbano, alberi singoli, barriere e segnaletica sono derivati da OpenStreetMap (ODbL), tramite `tools/build-center-details.mjs`.
- **Dati territoriali di riferimento**: © Regione Emilia-Romagna. Per Fidenza non vengono usati dati della Regione Friuli-Venezia Giulia: la riga FVG presente in altri progetti non è geograficamente valida per l'Emilia-Romagna.

## Mondo ArnisWorld3

- **ArnisWorld3** è un save Minecraft generato con [Arnis](https://github.com/louis-e/arnis)
  a partire da OpenStreetMap per l'area di Fidenza. Il save sorgente
  (`assets/ArnisWorld3/`, circa 575 MB) **non viene ridistribuito**: è escluso
  da git e dal deploy GitHub Pages.
- I dati derivati in `data/arnis/` (materiali di edifici, aree, strade, alberi,
  acqua e mappa di superficie) sono un database derivato da OpenStreetMap e
  restano soggetti a **ODbL**.
- Le texture dei blocchi in `js/mc-blocks.js` sono **pixel art originale**
  generata proceduralmente dal progetto: non sono asset Mojang.
- Arnis e Minecraft sono marchi dei rispettivi proprietari; questo progetto non
  è affiliato a Mojang, Microsoft o Arnis.

## Software

- **Three.js** — © Three.js Authors, licenza MIT. File in `vendor/`.
- **Anton** e **Oswald** — font distribuiti con SIL Open Font License 1.1, self-hosted in `assets/fonts/`.
- Il codice del gioco, l'interfaccia, i modelli 3D procedurali, i testi delle missioni e le schede dei luoghi sono originali.

## Modello 3D del Duomo

- **Duomo 3D**: rappresentazione 3D del Duomo di San Donnino fornita
  dall'autore del progetto. È usata come riferimento di colore e texture per il
  Duomo low-poly solido; l'asset splat compresso `assets/3d/duomo-hd.bin` non
  viene caricato dal gioco. Il PLY sorgente non è ridistribuito. Formato e
  rigenerazione in `assets/3d/README.md`.

## Ispirazione

Il formato “città reale come open world nel browser” è ispirato a progetti come Naon City. Nessun codice, asset grafico, testo, audio o dato proprietario di Naon City è stato riutilizzato: il gioco è una ricostruzione originale con meccaniche analoghe.

## Contenuti

Le descrizioni dei luoghi sono testi divulgativi originali, scritti per il gioco. Le missioni sono inventate e non rappresentano servizi reali.

## Mappa v2

- Il manifest editabile è `maps/fidenza/map.json`; il bundle usato dal gioco è `data/map.json`.
- I POI sono verificati contro OpenStreetMap con `tools/audit-pois.mjs`; il report è `data/poi-audit.json`.
- La validazione di raggiungibilità di beacon, stelle e missioni è in `tools/validate-map.mjs`; il report è `data/map-validation.json`.
- Gli stili stagionali sono in `maps/fidenza/styles/` e vengono compilati in `data/styles/`.
