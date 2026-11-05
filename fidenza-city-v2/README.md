# Fidenza da Giocare v2.11

![Fidenza da Giocare v2](assets/img/corso.jpg)

Open world gratuito nel browser ambientato a **Fidenza**, Emilia-Romagna. La
v2.11 completa il volo su mobile, aggiunge il pulsante **🚲 Bici**, aumenta il
traffico sulle strade principali e documenta tecnologie, funzioni, guida e
curiosità del progetto.

> Progetto indipendente e non ufficiale, non affiliato al Comune di Fidenza.
> Nessun codice, asset, testo o audio di altri giochi è stato riutilizzato.

## Indice

- [Avvio](#avvio)
- [Tecnologie usate](#tecnologie-usate)
- [Features](#features)
- [Come giocare](#come-giocare)
- [Comandi](#comandi)
- [Curiosità](#curiosità)
- [Novità v2.11](#novità-v211--volo-mobile-bici-e-traffico)
- [Novità precedenti](#novità-v210--insegne-e-parchi-verdi)
- [Dati, rigenerazione ed editor](#dati-e-correzioni)
- [Struttura del progetto](#struttura)
- [Licenze](#licenze)

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

Requisiti: un browser moderno con WebGL, JavaScript ES modules, Web Audio e
Service Worker. Non serve installare dipendenze: Three.js e i font sono
self-hosted in `vendor/` e `assets/fonts/`.

## Tecnologie usate

| Tecnologia | Dove viene usata |
| --- | --- |
| **HTML5 + CSS3** | Shell del gioco, HUD, dialoghi nativi `<dialog>`, layout responsive, `env(safe-area-inset-*)`, `backdrop-filter`. |
| **JavaScript ES2022 (moduli ES)** | Tutto il codice del gioco, import/export tra moduli, nessun bundler a runtime. |
| **Three.js r169** | Scena 3D, camera, materiali, luci, ombre, geometrie, `InstancedMesh`, `BufferGeometryUtils`. |
| **WebGL** | Rendering accelerato di città, veicoli, alberi, particelle e cielo. |
| **Canvas 2D** | Minimappa e mappa grande, texture procedurali, insegne delle attività, cattura foto. |
| **Web Audio API** | Audio interamente sintetizzato: motori, campanello bici, clacson, ambiente, eventi e segnali. |
| **Web Storage (`localStorage`)** | Salvataggio locale di nome, punti, stelle, luoghi, missioni, carriera, impostazioni e statistiche. |
| **IndexedDB** | Galleria fotografica locale con miniature e JPEG. |
| **Service Worker + Cache API** | PWA offline con precache di shell, dati, stili, font, Three.js e moduli. |
| **Web App Manifest** | Installazione su desktop e mobile, icona, tema e modalità standalone. |
| **Pointer Lock API** | Controllo camera con mouse su desktop. |
| **Gamepad API** | Controller con stick sinistro/destro e pulsanti. |
| **Vibration API** | Feedback aptico su mobile per interazioni, stelle e bici. |
| **`matchMedia` e pointer events** | Rilevamento touch, joystick virtuale, pulsanti a pressione continua. |
| **Fetch API + JSON** | Caricamento di `city.json`, `terrain.json`, `map.json`, stili e meteo. |
| **`Intl.DateTimeFormat`** | Ora italiana, giorni della settimana e orologio del mondo. |
| **File System Access API** | Salvataggio diretto dei manifest dall’editor di mappa. |
| **Node.js (script CLI)** | Rigenerazione città, terreno, import mappa, audit e validazione. |
| **Overpass API** | Pipeline offline per scaricare i dati OpenStreetMap di Fidenza. |
| **Terrain Tiles / EU-DEM Copernicus** | Rilievo del terreno fuori dal centro urbano. |
| **OpenStreetMap (ODbL)** | Edifici, strade, piazze, parchi, corsi d’acqua, POI e attraversamenti. |
| **GitHub Pages** | Hosting statico della build pubblica. |

### Scelte tecniche

- **Nessun backend**: salvataggi, foto e progressi restano nel browser.
- **Nessun tile server a runtime**: la mappa 2D è disegnata una volta su canvas
  dai dati della città.
- **Geometrie unite per materiale**: muri, tetti, strade e arredi riducono le
  draw call.
- **Instancing** per alberi, lampioni, panchine, bollard, cespugli, ciuffi
  d’erba e fiori.
- **Collisioni 2D** cerchio-poligono con spatial hash.
- **Qualità adattiva**: risoluzione e dettagli cambiano su mobile e in base al
  carico.
- **Dati separati dal codice**: la città è editabile con manifest, schema,
  template e tool di validazione.

## Features

### Città e mondo

- **Fidenza ricostruita** da OpenStreetMap: **3.373 edifici**, **1.816 segmenti
  stradali**, **185 aree** (piazze, parchi, prato, sport), **13 corsi d’acqua**
  e **62 binari**.
- **85 POI** con icone e categorie: chiese, musei, teatri, piazze, monumenti,
  stazione, parchi e uffici.
- **23 luoghi** scopribili e **12 landmark** modellati: Duomo, Piazza Duomo,
  Porta, Ponte, Teatro Magnani, Palazzo Comunale, Gran Madre, San Pietro,
  Museo Musini, Stazione, Stirone e Obelisco.
- **51 insegne di attività** su ristoranti, bar, caffè, farmacie, banche, hotel
  e musei, montate sulla facciata più vicina.
- **Tetti 3D** a falde, padiglione e piano, con comignoli, abbaini, grondaie,
  cornici, persiane, balconi, gradini e vetrine.
- **Vegetazione viva**: fino a **850 alberi**, cespugli, ciuffi d’erba e fiori
  distribuiti su parchi e prato.
- **Quattro stagioni** con palette, particelle, nebbia, neve, luci natalizie e
  meteo; **ciclo giorno/notte** con finestre illuminate e lampioni.
- **Strade realistiche** con asfalto procedurale, marciapiedi, linee, tombini,
  attraversamenti e **12 semafori** funzionanti.
- **Vita urbana**: pedoni, ciclisti, auto ambientali, navetta, treno e bici
  parcheggiate.

### Mobilità

- **Auto, Vespa, taxi e ambulanza** guidabili con fisica arcade, collisioni,
  ruote animate, clacson e potenziamenti.
- **Bici guidabili** in 5 punti della città, con campanello, ruote e pedalata
  animata; altre bici parcheggiate e ciclisti animati fanno da contorno.
- **Navetta urbana** con percorso calcolato sulla rete stradale, 4 fermate,
  pensiline e cartelli.
- **Treno** a tre carrozze con sosta in banchina.
- **Volo libero** con WASD/joystick, quota, boost, atterraggio e camera ampia.
- **Traffico ambientale** solo su strade `primary`, `secondary` e `tertiary`:
  8 auto su qualità bassa, 14 su media, 22 su alta. Le strade pedonali,
  ciclabili, di servizio e residenziali restano libere.
- **Semafori** con ciclo rosso/giallo/verde: le auto rallentano e si fermano,
  i pedoni attraversano sulle strisce.

### Missioni e carriera

- **14 missioni** guidate dal manifest: emergenza al parco, inseguimento,
  pizza in Vespa, taxi, cartoline, pellegrino, consegna urgente, giro turistico,
  coincidenza, ultimo treno, capolinea e tre missioni di San Donnino.
- **Fidenza Carriera**: patente con tre checkpoint, tre professioni (tassista,
  corriere, fotografo), lavori generati dai POI, XP, livelli, soldi,
  reputazione, bonus notturni e storico.
- **Garage** con potenziamenti reali per motore, assetto e freni.
- **Lavori fotografici** che richiedono una vera foto in modalità foto vicino
  al soggetto.
- **Eventi della città**: mercato del mercoledì e del sabato, mercatino di
  Natale, festa di San Donnino, serate al Teatro Magnani, dehors estivi e ora
  di punta in stazione.
- **San Donnino**: processione, bancarelle, torta fritta, culatello, gnocco
  fritto, programma della festa, fuochi d’artificio e badge dedicato.

### Foto, progressi e rigiocabilità

- **Modalità foto** con camera libera, filtri, cornici, griglia, ora e stagione
  di anteprima, nascondi giocatore/veicoli, scatto JPEG, galleria IndexedDB e
  download PNG.
- **27 stelle** nascoste e **23 luoghi** da scoprire.
- **37 achievement** e statistiche dettagliate: km a piedi e in auto, velocità
  massima, missioni, stelle, luoghi, foto, stagioni, giorni e tempo di gioco.
- **Sfida del giorno** deterministica dalla data, con progresso e ricompensa
  salvati solo in locale.
- **Punteggio**, badge evento, storico lavori e replay libero dopo l’intro.

### Mobile e PWA

- **Joystick virtuale** che funziona a piedi, in auto, in Vespa, in bici e in
  volo.
- **Menu rapido touch** con pausa, mappa, missioni, carriera, foto, volo, bici
  e audio.
- **Pulsanti contestuali** per interagire, frenare, clacson e azione.
- **Volo mobile** con joystick per il movimento e pulsanti **▲ Sali** /
  **▼ Scendi** per la quota.
- **Pulsante 🚲 Bici**: sale sulla bici più vicina entro 8 m, scende se sei in
  sella, avvisa se sei su un altro veicolo o indica la distanza della bici più
  vicina.
- **Bici sulla minimappa e sulla mappa grande**.
- **HUD adattivo**, risoluzione dinamica, ombre ridotte e dettagli contenuti su
  mobile.
- **PWA installabile e offline** con cache versionata e avviso di aggiornamento.

### Editor e dati

- **Editor visuale** per POI, beacon, landmark, stelle, missioni, veicoli,
  prop, spawn, tabellone, edifici e strade.
- **Mission builder** con tappe, tempo, reward, POI collegato, commenti e foto.
- **Undo/redo**, snap, layer, ricerca e validazione integrata.
- **Salvataggio** con File System Access API, download/import JSON e bozza in
  `localStorage`.
- **Audit e validatori**: POI, edifici, insegne, traffico e raggiungibilità.

## Come giocare

### 1. Primo avvio

1. Avvia il server statico e apri `http://localhost:8081`.
2. Scegli la stagione (o lascia “automatica”).
3. Premi **Gioca** e, se vuoi, inserisci il tuo nome.
4. Ti trovi in Piazza Duomo, davanti alla facciata del Duomo di San Donnino.

### 2. Muoversi e guardarsi intorno

- **Desktop**: WASD o frecce per muoverti, mouse per guardare, Shift per
  correre.
- **Mobile**: joystick sinistro per muoverti, trascina sul canvas per guardare.
- **Controller**: stick sinistro per muoverti, stick destro per guardare.
- Avvicinati a un luogo, a una stella o a un veicolo e usa **E** (o il pulsante
  azione) per interagire.
- Apri la **mappa** con **N** o tocca la minimappa per vedere POI, stelle,
  missioni, bus, treno e bici.

### 3. Esplorare e collezionare

- Cerca le **27 stelle**: brillano in aria e si raccolgono passandoci vicino.
- Scopri i **23 luoghi**: avvicinati al beacon e interagisci.
- Ogni stella e ogni luogo danno punti; i punti sbloccano achievement e
  compaiono nella sfida del giorno.
- La minimappa mostra stelle, luoghi, missione attiva, eventi e bici.

### 4. Guidare auto, Vespa e bici

- Avvicinati a un veicolo e premi **E** (o il pulsante azione).
- **W/joystick su** accelera, **S/joystick giù** frena o va in retromarcia,
  **A/D o joystick laterale** sterza.
- **Spazio/Freno** frena, **H/📯** suona il clacson.
- **E** scende dal veicolo.
- Su mobile puoi usare il pulsante **🚲 Bici** in qualsiasi momento:
  - se sei in sella, scendi;
  - se sei a piedi e c’è una bici entro 8 m, sali;
  - se sei su un altro veicolo, il gioco ti chiede di scendere;
  - altrimenti ti dice a quanti metri è la bici più vicina.
- Le bici guidabili sono segnate in oro sulla mappa.

### 5. Volare

- Premi **V** (desktop) o **✈** nel menu rapido (mobile).
- **WASD/joystick** muove in orizzontale e in avanti, **Space/Q** o **▲/▼**
  regola la quota, **Shift** dà il boost.
- Guarda in alto o in basso con il mouse/dito per salire o scendere in volo.
- Premi **V** o **✈** per atterrare.
- Non puoi volare mentre sei su un veicolo: prima scendi.

### 6. Missioni

1. Apri il menu missioni con **F** o **☑**.
2. Scegli una missione e segui il beacon sulla mappa.
3. Raggiungi le tappe nell’ordine indicato e interagisci con **E**.
4. Completa la missione entro il tempo per ottenere punti e, se previsto,
   ricompense di carriera.

### 7. Carriera

1. Apri **Carriera** con **C** o **▤**.
2. Sostieni l’esame di guida: tre checkpoint da raggiungere.
3. Accetta lavori come tassista, corriere o fotografo.
4. Guadagna XP, soldi e reputazione; sali di livello.
5. Compra potenziamenti nel garage: motore, assetto e freni.
6. I lavori fotografici richiedono una foto scattata vicino al soggetto.

### 8. Modalità foto

- Premi **P** o **▣**.
- Muoviti con WASD, guarda con il mouse, regola l’altezza con Q/E, cambia FOV
  con `[` e `]`.
- Scegli filtro, cornice, ora e stagione.
- Attiva o disattiva griglia, giocatore e veicoli.
- Scatta: la foto viene salvata in **IndexedDB** e compare nella galleria.
- Puoi scaricarla in PNG o eliminarla; tutto resta locale.

### 9. Eventi e sfida del giorno

- La card **“Oggi in città”** mostra l’evento attivo e il prossimo.
- Partecipa agli eventi per statistiche, achievement e lavori speciali.
- La **sfida del giorno** cambia ogni giorno ed è deterministica dalla data.
- La festa di San Donnino ha tre missioni dedicate e un badge.

### 10. Salvataggio e PWA

- Il progresso è salvato automaticamente in `localStorage`.
- Dal menu pausa puoi esportare/importare il salvataggio o azzerare i progressi.
- La PWA funziona offline dopo il primo caricamento.
- Se modifichi file statici, incrementa `CACHE` in `sw.js` per invalidare la
  cache.

## Comandi

| Azione | Desktop | Mobile |
| --- | --- | --- |
| Muoversi | WASD / frecce | joystick sinistro |
| Correre | Shift | pulsante Corri |
| Guardare | mouse (pointer lock) | trascina sul canvas |
| Interagire | E | pulsante azione contestuale |
| Entrare/uscire dal veicolo | E vicino al veicolo | pulsante azione |
| Bici | E vicino alla bici | pulsante 🚲 |
| Accelerare | W / ↑ | joystick su |
| Freno / retromarcia | S / ↓, Spazio | joystick giù, pulsante Freno |
| Sterzare | A/D o ←/→ | joystick laterale |
| Clacson / campanello | H | pulsante 📯 |
| Volare | V | pulsante ✈ |
| Quota in volo | Space / Q | pulsanti ▲ Sali / ▼ Scendi |
| Boost in volo | Shift | — |
| Atterrare | V | pulsante ✈ |
| Missioni | F | menu rapido touch |
| Carriera | C o voce in pausa | menu rapido touch |
| Mappa | N o click sulla minimappa | menu rapido touch |
| Modalità foto | P o voce in pausa | menu rapido touch |
| Audio | M | menu rapido touch |
| Stagione | selettore in pausa o nell’intro | selettore |
| Pausa | Esc | Esc |

Nota: i controlli laterali sono invertiti in tutte le modalità di movimento
(a piedi, in auto e in volo): **A/←** va a destra, **D/→** va a sinistra.

Nella modalità foto: WASD per muoverti, trascina il mouse per guardare, Q/E per
l’altezza, Shift per andare veloce, `[` e `]` per il campo visivo, P/Esc per
uscire. La galleria e i download sono solo locali. Su mobile compare uno stick
virtuale per muovere la camera.

**Controller**: stick sinistro per muoversi, stick destro per guardare, A per
interagire, B per frenare, X per correre, Y per le missioni, Back per la mappa,
Start per la pausa.

**Performance**: aggiungi `?quality=low`, `?quality=medium` o `?quality=high`
all’URL per forzare il livello grafico.

## Curiosità

- **Fidenza** si chiamava **Borgo San Donnino** e sorge lungo la **Via
  Francigena**, l’antica rotta dei pellegrini verso Roma. Nel gioco la missione
  *Il pellegrino* rende omaggio a questo cammino.
- Il **Duomo di San Donnino** è uno dei simboli romanici dell’Emilia-Romagna:
  la facciata è incompleta e conserva sculture e bassorilievi. Nel gioco è
  modellata con la facciata rivolta verso Piazza Duomo.
- **San Donnino** è il patrono di Fidenza; la festa patronale nel gioco include
  processione, bancarelle, torta fritta, culatello e gnocco fritto.
- Il **Teatro Girolamo Magnani** porta il nome di un celebre scenografo
  fidentino. Nel gioco ospita serate ed eventi speciali.
- La **Stazione di Fidenza** è un nodo ferroviario della pianura parmense; nel
  gioco è ricostruita con binari, banchina, pensilina e tabellone.
- Il **torrente Stirone** attraversa la zona e dà il nome al parco regionale;
  nel gioco è trattato come corso d’acqua lineare, non come punto.
- **Piazza Duomo** non è l’obelisco: l’obelisco è un POI separato in Piazza
  Garibaldi. È una delle correzioni storiche rispetto alla v1.
- La mappa usa **3.373 edifici** con footprint reali: i tetti non sono più
  generati sul bounding box ma sulla forma dell’edificio.
- Le **51 insegne** delle attività sono associate al POI commerciale e montate
  sulla facciata più vicina, evitando sovrapposizioni.
- Il traffico ambientale è **solo su strade carrabili principali**: niente auto
  su pedonali, ciclabili, marciapiedi o strade residenziali.
- La città ha **12 semafori** e **15 attraversamenti**; i pedoni attraversano
  quando le auto hanno il rosso.
- Le **27 stelle** e i **23 luoghi** sono posizionati sul manifest e validati
  con un controllo di raggiungibilità.
- I **37 achievement** coprono stelle, luoghi, missioni, guida, foto,
  stagioni, carriera, eventi e San Donnino.
- L’audio è **completamente sintetizzato** con la Web Audio API: non ci sono
  file audio registrati.
- Le foto sono salvate in **IndexedDB** e non vengono mai caricate su un server.
- Il gioco non ha **backend, account o telemetria**: tutto resta nel browser.
- La mappa 2D è disegnata **una sola volta** su un canvas offscreen da 2048 px,
  poi ritagliata per minimappa e mappa grande.
- La qualità grafica è adattiva: su mobile le ombre sono disattivate e la
  risoluzione si abbassa automaticamente se il frame rate cala.

## Novità v2.11 — Volo mobile, bici e traffico

- **Joystick in volo**: il touch movement ora muove davvero il personaggio in
  volo, con forward/strafe e inversione laterale coerente con il resto del gioco.
- **Pulsanti quota mobile**: **▲ Sali** e **▼ Scendi** compaiono solo in volo e
  sostituiscono i comandi di guida.
- **Pulsante 🚲 Bici** nel menu rapido: salita entro 8 m, discesa, avviso se sei
  su un altro veicolo e distanza della bici più vicina.
- **Bici sulla minimappa e sulla mappa grande**, con icona dedicata.
- **Joystick anche in auto, Vespa e bici**: accelerazione e sterzo touch.
- **Traffico potenziato**: 8 auto su qualità bassa, 14 su media, 22 su alta,
  solo su `primary`, `secondary` e `tertiary`.
- **Nessuna auto** su strade pedonali, ciclabili, di servizio o residenziali.
- **Audit traffico** in `data/traffic-audit.json` con conteggi per tipo di
  strada e verifica delle strade vietate.
- **README ampliato** con tecnologie, features, guida, comandi e curiosità.

## Novità v2.10 — Insegne e parchi verdi

- **Insegne delle attività** su 51 POI commerciali: ristoranti, bar, caffè,
  farmacie, banche, hotel e musei.
- Insegne montate sulla facciata più vicina, con colore, categoria, tenda e
  pannello leggibile.
- **Prato texturizzato** con erba, ciuffi, cespugli e fiori.
- **Alberi aumentati** fino a 850 su qualità alta.
- **Parchi più vivi** con dettagli verdi distribuiti sulle aree verdi.
- **Audit insegne** in `data/poi-sign-audit.json`.

## Novità v2.9 — Tetti e dettagli edilizi

- **Tetti sulla footprint reale**: niente più tetti generati sul bounding box.
- **Tetti a falde orientati** sul lato più lungo dell’edificio.
- **Tetti a padiglione** per footprint convesse irregolari.
- **Tetti piani con parapetto** per capannoni, garage, scuole e ospedali.
- **Dettagli**: colmi, fasce di gronda, pluviali, comignoli con cappello,
  abbaini, impianti sui tetti piani, cornici, persiane, gradini e vetrine.
- **Audit edifici** su tutti i 3.373 edifici con report `data/building-audit.json`.
- **Import edifici** da GeoJSON/DBTR/Microsoft/Overture tramite
  `tools/merge-buildings.mjs`.

## Novità v2.8 — Fix, mobile e coerenza

- **Mobile**: joystick migliorato, pulsanti contestuali, menu rapido touch,
  pulsanti guida dinamici e feedback aptico.
- **Prestazioni mobile**: risoluzione adattiva, HUD/minimappa limitati, ombre
  disattivate su mobile e dettagli ridotti.
- **Editor**: supporto bici, campo evento missione e “foto obbligatoria”.
- **Ruote del traffico**: si fermano davvero quando l’auto è ferma al rosso.
- **Eventi sincronizzati** con l’orologio del mondo, non solo con l’ora reale.
- **Modalità foto**: il timer delle missioni fotografiche continua a scorrere.
- **Azzera progressi**: ora cancella anche la galleria fotografica.
- **Ritorno all’intro**: conferma se c’è una missione attiva e salva le
  statistiche pendenti.
- **Volo accessibile da mobile** tramite il menu pausa.
- **Versioni allineate**: gioco, mappa, bundle e PWA a **2.8.0**.
- **Performance**: cornici e davanzali saltati sulla qualità low.

## Novità v2.7 — Bici e città reale

- **Controlli laterali invertiti** a piedi, in auto e in volo, incluso touch e
  gamepad.
- **Biciclette guidabili** in cinque punti della città, con campanello, ruote e
  pedalata animata.
- **Case più dettagliate**: cornici, davanzali, persiane, pluviali, cappelli dei
  comignoli e coperture con texture in coppi.
- **Strade più realistiche**: asfalto procedurale, marciapiedi in cemento, linee
  di bordo, tombini e texture su tutta la rete.
- **Tetti texturizzati** e dettagli solo su qualità medium/high, con fallback
  semplificato su low.

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
- **POI verificati**: 23 luoghi scopribili e 85 punti di interesse con icone
  per chiese, musei, teatri, piazze, monumenti, stazione, parchi e uffici.
- **Grafica**: tetti a falde, comignoli, facciate con finestre, fasce, balconi,
  tende, marciapiedi, arredo urbano, illuminazione e ombre morbide.
- **Stagioni**: primavera, estate, autunno e inverno con palette, vegetazione,
  particelle, nebbia, neve al suolo, luci natalizie e meteo.
- **Mappa editabile**: manifest JSON, schema, template per nuove città, importer,
  audit POI e validatore di raggiungibilità.
- **Gameplay**: auto, Vespa, taxi, ambulanza, bici, 14 missioni, carriera con
  lavori e garage, 27 stelle, mappa completa, audio sintetizzato, PWA offline.
- **Vita in città**: foto, 37 achievement, statistiche, sfida del giorno,
  semafori, attraversamenti, insegne 3D e traffico sulle strade principali.

## Dati e correzioni

La mappa è costruita da **OpenStreetMap** e **Terrain Tiles**. I POI sono
confrontati con le feature OSM tramite `tools/audit-pois.mjs`. L’attribuzione
del progetto include **© OpenStreetMap contributors (ODbL)** e
**© Regione Emilia-Romagna** come riferimento territoriale.

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
node tools/audit-buildings.mjs
node tools/audit-poi-signs.mjs
node tools/audit-traffic.mjs
# opzionale: aggiorna altezze/tetti da un GeoJSON DBTR/Microsoft/Overture
node tools/merge-buildings.mjs --geojson edifici.geojson --dry-run
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
    building-geometry.js geometria e classificazione tetti
    poi-signs.js      associazione POI-attività e facciate
    traffic.js       pianificazione traffico su strade principali
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
    audit-buildings.mjs
    audit-poi-signs.mjs
    audit-traffic.mjs
    merge-buildings.mjs
  data/
    city.json
    terrain.json
    map.json
    styles/
    poi-audit.json
    map-validation.json
    building-audit.json
    poi-sign-audit.json
    traffic-audit.json
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

## Fonti edilizie opzionali

L’audit e il merge sono pronti per dati esterni, ma i dati non vengono scaricati
a runtime.

- **DBTR Emilia-Romagna** — edifici e unità volumetriche, licenza **CC BY 4.0**.
- **OpenStreetMap** — base già usata, licenza **ODbL**.
- **Microsoft Global Building Footprints** — licenza da verificare sulla
  distribuzione scelta.
- **Google Open Buildings 2.5D** — altezze stimate, licenza **CC BY 4.0/ODbL**
  secondo la distribuzione.
- **Overture Maps Buildings** — licenza **ODbL**.

Usa `tools/merge-buildings.mjs` su un’esportazione GeoJSON e controlla sempre il
report `data/building-audit.json` dopo l’import.

## Licenze

- Codice del gioco: originale, distribuito con la licenza del repository.
- Dati OpenStreetMap: ODbL.
- Riferimento territoriale: © Regione Emilia-Romagna.
- Terrain Tiles: attribuzione Mapzen / EU-DEM Copernicus.
- Three.js: MIT.
- Font Anton e Oswald: SIL Open Font License 1.1.

Vedi `data/ATTRIBUTION.md`.
