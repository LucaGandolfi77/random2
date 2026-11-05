# Fidenza Editor 2.16

Editor visuale 2D per la mappa di **Fidenza da Giocare v2**. Pensato per il
lavoro da PC: scorciatoie, command palette, modifica vertice per vertice e
geometrie custom che il gioco 3D vede senza rigenerare i dati OSM.

```text
http://localhost:8081/fidenza-editor/
```

Serve il server statico del progetto:

```bash
cd fidenza-city-v2
python3 -m http.server 8081
```

## Cosa modifica

- **POI**: posizione, nome, categoria, descrizione, raggio, `collectible`, ID OSM.
- **Beacon**: posizione separata dal POI.
- **Landmark 3D**: modello, rotazione, offset, scala, visibilità.
- **Stelle**: posizione, aggiunta, rimozione.
- **Missioni**: builder visuale con tipo, evento, titolo, testo, tempo, reward,
  tappe cliccando sulla mappa, riordino, raggio, prompt, commento, foto, foto
  obbligatoria e POI collegato.
- **Veicoli**: tipo (`car`, `vespa`, `bike`), etichetta, posizione, rotazione,
  colore.
- **Prop**: palette per insegne, targhe, alberi, panchine, lampioni, bollard,
  fioriere, bancarelle e auto parcheggiate; testo, rotazione, scala e colore.
- **Spawn** e **tabellone missioni**.
- **Navetta**: percorso e fermate calcolati dai POI, visibili nel layer Navetta.
- **Edifici**: nascondi, sposta, ruota, scala, altezza, piani, tetto, colore e
  vertici.
- **Strade**: nascondi, sposta, ruota, scala, larghezza, tipo, superficie,
  senso unico, marciapiede, ponte, tunnel e vertici.
- **Aree**: nascondi, sposta, ruota, scala, tipo, colore e vertici.
- **Corsi d’acqua**: tipo, larghezza, spostamento, visibilità e vertici.
- **Ferrovie**: tipo, larghezza, ponte, spostamento, visibilità e vertici.
- **Nuove geometrie custom**: strada, area, edificio, corso d’acqua e ferrovia.

Le modifiche alle feature OSM sono **override** in `map.overrides`: i dati
originali non vengono toccati. Le nuove geometrie finiscono in `map.custom` e
vengono unite dal gioco in `applyOverrides`.

## Scorciatoie

| Tasto | Azione |
| --- | --- |
| `V` | Seleziona |
| `H` | Mano / pan |
| `R` | Disegna strada |
| `A` | Disegna area |
| `B` | Disegna edificio |
| `W` | Disegna corso d’acqua |
| `T` | Disegna ferrovia |
| `P` | Aggiungi POI |
| `S` | Aggiungi stella |
| `G` | Snap on/off |
| `F` | Inquadra tutta la città |
| `Shift+F` | Centra sulla selezione |
| `Spazio` | Pan temporaneo |
| `Ctrl+Z` / `Ctrl+Y` | Annulla / ripeti |
| `Ctrl+S` | Salva manifest |
| `Ctrl+Shift+S` | Salva manifest + bundle |
| `Ctrl+O` | Importa |
| `Ctrl+D` | Duplica |
| `Ctrl+K` | Command palette |
| `Delete` | Elimina elemento o vertice attivo |
| Frecce | Sposta di 1 m |
| `Shift+Frecce` | Sposta di 10 m |
| `Alt+←/→` | Ruota di 5° |
| `,` / `.` | Ruota di 5° |
| `+` / `-` | Zoom |
| `0` | Inquadra tutto |
| `1…9` | Cambia tab |
| `?` / `F1` | Mostra scorciatoie |
| `Esc` | Annulla disegno / vertice / selezione |

Durante il disegno:

- click per aggiungere un punto;
- `Invio` o doppio clic per chiudere;
- click sul primo punto per chiudere un poligono;
- `Backspace` rimuove l’ultimo punto;
- `Esc` annulla.

## Modifica vertici

Seleziona un edificio, una strada, un’area, un corso d’acqua o una ferrovia:

- i vertici diventano maniglie bianche;
- trascina un vertice per spostarlo;
- `Alt+clic` su un segmento inserisce un vertice;
- `Delete` rimuove il vertice attivo (minimo 3 per un poligono, 2 per una linea);
- **Inverti** cambia direzione alla linea;
- **Semplifica** riduce i vertici mantenendo la forma.

La modifica di una feature OSM crea un override con geometria assoluta
(`pts`/`poly`), quindi non serve rigenerare la città.

## Nuove geometrie custom

Il modello dati è:

```json
"custom": {
  "buildings": [],
  "roads": [],
  "areas": [],
  "waterways": [],
  "railways": []
}
```

Esempio di strada:

```json
{
  "id": "custom-road-abc",
  "name": "Via Nuova",
  "kind": "residential",
  "pts": [[-120, 40], [-60, 52], [10, 48]],
  "w": 7,
  "surface": "asphalt",
  "oneway": false,
  "sidewalk": true
}
```

Le feature custom sono visibili in 3D (edifici, manto stradale, aree verdi,
acqua, binari), nella minimappa e nella mappa grande. Hanno ID testuali stabili
e non collidono con gli ID OSM numerici.

## Command palette

`Ctrl+K` apre la palette. Cerca:

- comandi (salvataggio, modalità, tab, geometria, vista, snap, aiuto);
- POI, missioni, strade, aree, edifici, acqua e ferrovie.

`↑`/`↓` naviga, `Invio` esegue, `Esc` chiude.

## Performance

- **Spatial hash** per hit test di edifici, strade, aree, acqua e ferrovie.
- **Culling** delle feature fuori dalla vista.
- **Rendering in requestAnimationFrame**, al massimo una volta per frame.
- **Drag leggero**: durante il trascinamento non parte la validazione completa.
- **Validazione al rilascio** o dopo una modifica da inspector.
- **Layer cache dell’indice** ricostruita solo quando cambia la città patchata.
- **Liste limitate a 500 righe** per tab, con ricerca immediata.

La status bar mostra i millisecondi dell’ultimo render, le aree visibili,
controlli, errori, override e feature custom.

## Validazione

Il pannello esegue la stessa validazione del CLI e segnala:

- beacon, stelle, veicoli, spawn e target dentro edifici;
- elementi fuori dall’area giocabile;
- ID duplicati o riferimenti mancanti;
- override riferiti a feature inesistenti;
- geometrie custom con pochi vertici, vertici duplicati, area/linea troppo
  piccola o lati che si incrociano;
- altezze edificio e larghezze strada non valide;
- geometrie assolute degli override non valide.

Un click sull’errore seleziona l’elemento e lo centra sulla mappa.

Puoi anche lanciare:

```bash
node tools/validate-map.mjs
node tools/import-map.mjs
```

## Salvataggio

- **Salva manifest**: scrive `maps/fidenza/map.json`.
- **Salva bundle**: scrive un file `data-map.json` da sostituire a `data/map.json`.
- **Salva entrambi**: usa la File System Access API per scrivere direttamente
  `maps/fidenza/map.json` e `data/map.json` nella cartella scelta.
- **Importa** carica un manifest JSON.
- La bozza viene salvata automaticamente in `localStorage`.
- **Ripristina** ricarica il manifest originale dal server.
- **Elimina bozza** cancella il salvataggio locale.

Dopo il salvataggio diretto il gioco legge `data/map.json` senza altre
operazioni. Se il browser mostra una versione vecchia, fai un hard reload o
incrementa `CACHE` in `sw.js`.

## File

```text
fidenza-editor/
  index.html
  editor.css
  js/main.js          scorciatoie, command palette, tab e salvataggi
  js/state.js         stato, undo, custom feature, vertici e override
  js/map-view.js      canvas, disegno, vertici, hit test e culling
  js/inspector.js     pannelli POI, missioni, prop e geometrie
  js/geometry.js      semplificazione, rotazione, snap e test geometrici
  js/spatial.js       indice spaziale per hit test e culling
  js/io.js            import/export e bozza locale
  js/geo.js           proiezioni e utility di base
```

Moduli condivisi con il gioco e i tool:

```text
js/map-compiler.js
js/map-overrides.js
js/map-validate.js
schema/map.schema.json
```
