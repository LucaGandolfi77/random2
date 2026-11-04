# Fidenza Editor

Editor visuale 2D per la mappa di **Fidenza da Giocare v2**.

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
- **Missioni**: builder visuale con tipo, titolo, testo, tempo, reward, tappe
  cliccando sulla mappa, riordino, raggio, prompt, commento, foto e POI collegato.
- **Veicoli**: tipo, etichetta, posizione, rotazione, colore.
- **Prop**: palette per insegne, targhe, alberi, panchine, lampioni, bollard,
  fioriere, bancarelle e auto parcheggiate; testo, rotazione, scala e colore.
- **Spawn** e **tabellone missioni**.
- **Navetta**: percorso e fermate calcolati dai POI, visibili nel layer Navetta.
- **Edifici**: nascondi, sposta, ruota, scala, altezza, colore.
- **Strade**: nascondi, sposta, ruota, larghezza, superficie.
- **Aree**: nascondi, sposta, ruota, scala.
- **Corsi d'acqua e ferrovie**: nascondi/sposta.

Le modifiche a edifici e strade sono **override** in `map.overrides`: i dati OSM originali non vengono toccati e possono essere rigenerati.

## Interazioni

- Click: seleziona.
- Trascina: sposta l'elemento selezionato.
- Shift + trascina: pan.
- Rotella: zoom.
- `F`: inquadra tutta la città.
- `Ctrl+Z` / `Ctrl+Y`: annulla/ripeti.
- `Delete`: elimina l'elemento selezionato.
- `Esc`: deseleziona.

Il tratteggio rosso mostra la posizione originale di un edificio/strada modificato.

L’editor è volutamente solo 2D: dopo il salvataggio apri il gioco per vedere il risultato in 3D.

## POI, landmark e edifici

Sono tre cose distinte:

- trascinare un **POI** muove il punto e il beacon; il modello 3D del landmark resta fermo e va spostato con il suo handle;
- trascinare un **landmark** muove solo il modello 3D (offset);
- trascinare un **edificio** crea un override geometrico della footprint.

Per spostare un intero edificio con il suo modello, sposta l'edificio e il landmark insieme.

## Mission builder

1. Apri il tab **Missioni** e premi **+ Nuova missione**.
2. Scegli il tipo (`pellegrino`, `consegna`, `taxi`, `foto`, `inseguimento`,
   `ambulanza`, `coincidenza`, `notturna`, `navetta`, `personalizzata`), titolo,
   testo, tempo e reward.
3. Seleziona la missione e premi **+ Tappa sulla mappa**: il click successivo
   aggiunge una tappa nella posizione scelta.
4. Usa l’inspector per nome, prompt, commento, raggio, foto, POI collegato e
   offset. Le frecce ↑/↓ riordinano le tappe; il cestino le elimina.
5. La validazione segnala missioni senza tappe o target dentro un edificio.

## Palette props

Nel tab **Prop** scegli un tipo dalla palette e clicca sulla mappa. I prop sono
salvati in `map.props` e il gioco li costruisce in 3D.

- **Insegna** e **Targa**: testo, sottotitolo, larghezza, altezza, colore,
  rotazione e scala.
- **Albero, panchina, lampione, bollard, fioriera, bancarella, auto parcheggiata**:
  posizione, rotazione, scala e colore dove applicabile.
- La validazione controlla tipo, area giocabile e sovrapposizione con edifici.

## Salvataggio

- **Salva manifest**: scrive `maps/fidenza/map.json`.
- **Salva bundle**: scrive un file `data-map.json` da sostituire a `data/map.json` (o usa “Salva entrambi”).
- **Salva entrambi**: usa la File System Access API per scrivere direttamente
  `maps/fidenza/map.json` e `data/map.json` nella cartella scelta.
- Nei browser senza File System Access API vengono scaricati i file.
- **Importa** carica un manifest JSON.
- La bozza viene salvata automaticamente in `localStorage`.
- **Ripristina** ricarica il manifest originale dal server.
- **Elimina bozza** cancella il salvataggio locale.

Dopo aver salvato direttamente i file non serve altro: il gioco legge
`data/map.json`, che nel service worker è servito in network-first. Se il browser
mostra ancora la versione vecchia, fai un hard reload o incrementa `CACHE` in
`sw.js`. Se hai scaricato i file, sostituiscili nel progetto.

## Validazione

Il pannello laterale esegue la stessa validazione del CLI:

- beacon, stelle, veicoli, spawn e target fuori dagli edifici;
- elementi fuori dall’area giocabile;
- ID duplicati o riferimenti mancanti;
- override riferiti a elementi inesistenti.

Puoi anche lanciare:

```bash
node tools/audit-pois.mjs
node tools/validate-map.mjs
```

## File

```text
fidenza-editor/
  index.html
  editor.css
  js/main.js
  js/state.js
  js/map-view.js
  js/inspector.js
  js/io.js
  js/geo.js
```

Moduli condivisi con il gioco e i tool:

```text
js/map-compiler.js
js/map-overrides.js
js/map-validate.js
```
