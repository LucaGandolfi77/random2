# Fidenza da Giocare v2.6

![Fidenza da Giocare v2](assets/img/corso.jpg)

Open world gratuito nel browser ambientato a **Fidenza**, Emilia-Romagna. La v2.6
aggiunge il volo libero, auto più veloci, più biciclette, il ritorno alla
schermata iniziale, il link all’editor e la versione del gioco nell’intro.

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
| Volare | V (poi WASD, Space/Q, Shift) | tasto Volo non previsto |
| Guardare | mouse (pointer lock) | trascina sul canvas |
| Interagire | E | pulsante ▶ |
| Entrare/uscire dal veicolo | E vicino al veicolo | pulsante ▶ / Auto |
| Freno | Spazio | pulsante Freno |
| Clacson | H | pulsante 📯 |
| Missioni | F | tabellone con ▶ |
| Carriera | C o voce in pausa | voce in pausa |
| Mappa | N o click sulla minimappa | click sulla minimappa |
| Modalità foto | P o voce in pausa | voce in pausa |
| Audio | M | pulsante audio |
| Stagione | selettore in pausa o nell’intro | selettore |
| Pausa | Esc | Esc |

Nella modalità foto: WASD per muoverti, trascina il mouse per guardare, Q/E per
l’altezza, Shift per andare veloce, `[` e `]` per il campo visivo, P/Esc per
uscire. La galleria e i download sono solo locali. Su mobile compare uno stick
virtuale per muovere la camera.

**Controller**: stick sinistro per muoversi, stick destro per guardare, A per
interagire, B per frenare, X per correre, Y per le missioni, Back per la mappa,
Start per la pausa.

**Performance**: aggiungi `?quality=low`, `?quality=medium` o `?quality=high`
all’URL per forzare il livello grafico.

## Novità v2.6 — Volo e città viva

- **Ritorno alla schermata iniziale** dal menu pausa, senza azzerare i progressi.
- **Link all’editor** direttamente dall’intro.
- **Auto più veloci**: fino a circa 86 km/h, con accelerazione e freni ricalibrati.
- **Volo libero** con `V`: WASD, Space/Q per la quota, Shift per la velocità,
  mouse per guardare e `V` per atterrare.
- **Ruote corrette** su auto, Vespa, bus e treno: rotolano sull’asse giusto.
- **Più biciclette**: bici parcheggiate e ciclisti animati in città.
- **Versione del gioco** visibile nell’intro.

## Novità v2.5 — Eventi in città

- **Calendario urbano**: mercato del mercoledì e del sabato, mercatino di Natale,
  festa di San Donnino, serate al Teatro Magnani, dehors estivi e ora di punta
  in stazione.
- **Eventi visibili**: bancarelle, albero di Natale, luci, palco, tappeto rosso,
  ombrelloni e folla animano i luoghi.
- **Lavori speciali**: ogni evento aggiunge offerte di carriera dedicate, con
  paga aumentata.
- **San Donnino**: processione animata, bancarelle di torta fritta, culatello e
  gnocco fritto, programma della festa, fuochi d’artificio alle 22:30 e tre
  missioni dedicate: *La processione*, *Torta fritta in festa* e *La foto della
  festa*.
- **Badge evento**: completando le tre missioni di San Donnino si ottiene il
  badge della festa.
- **Card “Oggi in città”** nell’intro e nel menu pausa, con orario e prossimo
  evento.
- **Eventi visitati**: statistiche, sfida del giorno e achievement dedicati.
- **Anteprima forzata**: aggiungi `?event=market`, `?event=christmas-market`,
  `?event=san-donnino`, `?event=theatre-night`, `?event=summer-dehors` o
  `?event=station-rush` all’URL per provare un evento fuori stagione.

## Novità v2.4 — Fidenza Carriera

- **Patente**: un esame di guida con tre checkpoint sblocca taxi e consegne.
- **Tre carriere**: tassista, corriere e fotografo, con lavori generati dai POI
  della città, distanza, tempo e paga.
- **Progressione**: XP, livelli, soldi, reputazione, bonus notturni e storico
  degli ultimi lavori.
- **Garage**: potenziamenti per motore, assetto e freni applicati davvero ai
  veicoli.
- **Lavori fotografici**: richiedono una vera foto in modalità foto vicino al
  soggetto.
- **Integrazione**: sfida del giorno, statistiche e nuovi achievement dedicati
  alla carriera.

## Novità v2.3 — Fidenza si muove

- **Navetta urbana**: percorso reale calcolato sulla rete stradale, quattro
  fermate (Stazione, Piazza Duomo, Teatro Magnani, Gran Madre), pensiline e
  cartelli. La navetta si ferma alle fermate e riparte.
- **Treno in transito**: convoglio a tre carrozze sulla linea vicino alla
  stazione, con sosta in banchina e ripartenza.
- **Sala d’attesa e banchina**: pensilina, panchine, biglietteria automatica,
  tabellone delle partenze e insegna del binario.
- **Pedoni sulle strisce**: attraversano quando le auto hanno il rosso e
  aspettano il momento giusto; il traffico ambientale continua a fermarsi.
- **Tre missioni nuove**: *Coincidenza*, *Ultimo treno* e *Capolinea*.
- **Audio di zona**: l’ambiente cambia tra centro, stazione, parco e Stirone,
  con campanella alla stazione.
- **Foto**: cornici cartolina/Fidenza, didascalie con luogo e data, galleria
  raggruppata per luogo e stick virtuale su mobile.
- **Qualità della vita**: esporta/importa il salvataggio e avviso di nuova
  versione PWA.

## Novità v2.2 — Vita in città

- **Tre missioni nuove**: *Il pellegrino* sulla Via Francigena, *Consegna urgente*
  dalla Farmacia Cavour all’Ospedale e *Giro turistico* dalla stazione a Teatro,
  Piazza Duomo e Gran Madre.
- **Modalità foto**: camera libera, filtri, ora e stagione di anteprima, griglia,
  nascondi giocatore/veicoli, scatto in JPEG, galleria IndexedDB e download PNG.
- **Achievement e statistiche**: 18 obiettivi, km a piedi e in auto, velocità
  massima, missioni, stelle, luoghi, foto, stagioni, giorni e tempo di gioco.
- **Sfida del giorno**: obiettivo deterministico dalla data, progresso e record
  salvati per giorno, ricompensa in punti. Solo locale, nessun backend.
- **Semafori e attraversamenti**: 12 semafori e 15 attraversamenti, ciclo
  rosso/giallo/verde e traffico ambientale che rallenta o si ferma. Il giocatore
  resta libero: è un gioco arcade.
- **Insegne 3D**: pannelli leggibili per Duomo, Teatro, Palazzo Comunale, Porta,
  Ponte, Stazione, Museo Musini e Gran Madre, più targhe per le piazze e Via
  Emilia. Testo e posizione sono modificabili dal manifest o dall’editor.
- **Editor**: mission builder visuale, palette props (insegne, targhe, alberi,
  panchine, lampioni, fioriere, bancarelle e auto parcheggiate) e validazione
  dei prop.

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
- **Gameplay**: auto, Vespa, taxi, ambulanza, undici missioni, carriera con
  lavori e garage, 27 stelle, mappa completa, audio sintetizzato, PWA offline.
- **Vita in città**: foto, obiettivi, statistiche, sfida del giorno, semafori,
  attraversamenti e insegne 3D.

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

Se Overpass non risponde, `build-city.mjs` interrompe la rigenerazione invece di
sovrascrivere `data/city.json` con una risposta vuota. In quel caso usa i dati
già presenti e rilancia l’audit quando il servizio torna disponibile.


## Editor mappa

Apri:

```text
http://localhost:8081/fidenza-editor/
```

L’editor visuale permette di spostare POI, beacon, landmark, stelle, missioni,
veicoli, prop, spawn e tabellone; può anche nascondere/spostare/ruotare edifici
e strade tramite override, senza toccare i dati OSM originali.

- Trascina un POI per spostare il punto e il beacon.
- Trascina un landmark per spostare il modello 3D.
- Trascina un edificio o una strada per creare un override.
- Crea missioni complete: tipo, titolo, tempo, reward, tappe cliccando sulla
  mappa, riordino, POI collegato, commenti e foto.
- Posiziona props e insegne con la palette; testo, rotazione, scala e colore
  sono modificabili dall’inspector.
- Undo/redo, snap, layer, ricerca, validazione integrata.
- Salvataggio diretto con File System Access API, oppure download/import JSON.
- Bozza automatica in `localStorage`.

Dettagli: `fidenza-editor/README.md`.

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
    map-compiler.js   compilatore mappa condiviso
    map-overrides.js  override edifici/strade/aree
    map-validate.js   validazione condivisa
    landmarks.js     modelli dei luoghi simbolo
    missions.js      missioni guidate dal manifest
    achievements.js  obiettivi e progresso locale
    daily.js         sfida del giorno deterministica
    career.js        lavori, XP, soldi, reputazione e garage
    events.js        calendario ed eventi della città
    photo-mode.js    camera libera, filtri, cornici e cattura
    photo-store.js   galleria foto in IndexedDB
    transit.js       grafo stradale e percorso della navetta
    map.js           minimappa, mappa completa, POI, bus e treno
    player.js        controller terza persona
    vehicles.js      guida arcade
    hud.js           interfaccia DOM
    audio.js         audio sintetizzato WebAudio
  fidenza-editor/
    index.html
    editor.css
    README.md
    js/
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
    build-traffic.mjs
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
