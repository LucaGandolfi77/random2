# TODOs — Concept tycoon in attesa di implementazione

Documento di design derivato dalla sessione di brainstorming sui tycoon
(vedi sezione "Concept tycoon" nella cronologia del progetto). Cinque concept
analizzati e approvati, in attesa di sviluppo. ALVEARE, il sesto, è stato
implementato: vedere `alveare-pwa/` e il README.

Criteri di valutazione usati in fase di selezione:

1. **Risorsa non convenzionale al centro** — il salto di qualità è mettere al
   centro una risorsa che gli altri tycoon trattano come sfondo.
2. **Il mondo reagisce alle decisioni** — conseguenze strutturali, non solo
   "più soldi → più negozi".
3. **Trade-off senza ottimo assoluto** — la risposta giusta dipende dal
   contesto.
4. **Il tema detta estetica e interfaccia.**
5. **Fit tecnico PWA** — offline-first, zero server, zero asset binari.

Legenda: Originalità (O) · Profondità (P) · Rischio implementazione (R) ·
Fit PWA (F). Scala: basso / medio / alto / massimo.

---

## 1. MADRE — Casa di fermentazione ✅ IMPLEMENTATO

> Implementato in `madre-pwa/` (vedi README). La checklist sotto resta come
> riferimento di design. Priorità consigliata: ~~1~~ completato.
> O: alto · P: alto · R: medio-basso · F: massimo

**Fantasy.** Una casa madre di fermentazioni: formaggi, koji, kombucha, aceti.
L'ingrediente principale non è nella dispensa: è il tempo reale tra una
sessione e l'altra.

**Core loop.** Allestire un batch → ogni batch ha una curva di maturazione
(innesco, picco, degrado) → vendere al momento giusto → preparare il
successivo. I batch maturano con timestamp reali: chiudi l'app mercoledì,
riapri domenica, i formaggi sono invecchiati quattro giorni davvero.

**Meccanica firma.** L'offline progression ribaltata in rischio: il tempo
fuori dall'app non è un bonus gratuito, è il processo che continua — verso il
pregio o verso il marcio. Dimenticare un batch è una decisione economica.

**Sistemi di profondità.**
- Cantine con microclimi = curve diverse dallo stesso ceppo.
- Contratti a consegna fissa: promettere 12 formaggi entro venerdì; usciti dal
  picco, si vendono come "vecchio" a metà prezzo.
- Ceppi che mutano dopo N generazioni.
- Mercato con oscillazioni lente indipendenti dalla produzione.

**Rischio di design.** Il giocatore impaziente abbandona se non ci sono cicli
corti: servire cicli a ore (kombucha) in parallelo ai cicli a giorni
(pecorino), con onboarding costruito sul dualismo.

**Fit tecnico.** Timestamp + `R2.trackPlaytime` + notifiche opt-in sono già
nell'infrastruttura (`shared/arcade.js`). Canvas 2D, no fisica.

### Checklist implementazione

- [ ] Modello dati batch: `{tipo, ceppo, camera, tStart, curva[], stato}`
- [ ] Curva di maturazione valutata da `Date.now() - tStart` (nessun tick
      richiesto mentre l'app è chiusa)
- [ ] Panel cantina: griglia di contenitori con stato visuale per curva
- [ ] Mercato: prezzi con random walk lento + ordini a scadenza
- [ ] Contratti: generati dal daily seed, penalità/manza
- [ ] Notifiche opt-in: "il lotto #4 è al picco" via `R2` + Notification API
- [ ] Bilanciamento: cicli 2h / 12h / 72h in parallelo
- [ ] PWA: manifest, SW, safe-area, hub card + record (ricavo totale)

---

## 2. LINEA ROSSA — Metro planner ✅ IMPLEMENTATO

> Implementato in `metro-pwa/` (vedi README). Priorità consigliata: ~~2~~ completato.
> O: alto · P: molto alto · R: medio · F: alto

**Fantasy.** Progettare la rete metropolitana di una città che cresce, dal
primo tunnel al capolinea.

**Core loop.** La mappa mostra domande di trasporto latenti → tracciare linee
(drag) → frequenze e capienza dei convogli → tariffe → espansioni finanziate
con prestiti a interesse.

**Meccanica firma.** Il feedback urbanistico: la metropolitana **cambia** la
città. I quartieri raggiunti si densificano (più domanda), quelli ignorati
degradano. Il giocatore decide dove la città cresce — e poi deve gestire la
congestione che ha creato. Effetto rete esplicito: il valore di una stazione
cresce con le connessioni che la toccano.

**Sistemi di profondità.**
- Onde di pendolari (mattina/sera) con direzioni asimmetriche.
- Interscambi: la copertura della rete è sottrattiva, non additiva.
- Costi di scavo variabili per geologia (centro storico = caro).
- Capienza vs frequenza: pochi treni lunghi o molti corti.
- Prestiti con rating che peggiora se le linee sono in perdita.

**Rischio di design.** La simulazione della domanda deve restare leggibile:
troppa complessità genera un foglio di calcolo, non un gioco. Mitigazione:
domande visualizzate come flussi di puntini, mai come numeri grezzi.

**Fit tecnico.** Canvas 2D pulito (linee, punti, curve di Bezier per le
linee), nessuna fisica. La difficoltà è il bilanciamento.

### Checklist implementazione

- [ ] Griglia di quartieri con popolazione/luoghi di lavoro
- [ ] Tracciamento linee: snap ai quartieri, polilinee con curve
- [ ] Modello domanda: matrice origine-destinazione semplificata
- [ ] Assegnazione treni: frequenza per linea, capienza, affollamento
- [ ] Interazioni incrociate: tempi di interchange
- [ ] Economia: tariffe, costi scavo, prestiti, rating
- [ ] Crescita urbana: quartieri raggiunti si densificano nel tempo
- [ ] UI: overlay domanda, heatmap affollamento, pannello linea
- [ ] PWA + hub + record (passeggeri trasportati totali)

---

## 3. NEBBIA — La gilda dei cartografi ✅ IMPLEMENTATO

> Implementato in `nebbia-pwa/` (vedi README). Priorità consigliata: ~~3~~ completato.
> O: alto · P: alto · R: medio · F: alto

**Fantasy.** Seicento. Un continente avvolto nella nebbia. La gilda vende
mappe a navigatori che ci rischiano la vita.

**Core loop.** Finanziare spedizioni che esplorano il foglio di guerra → i
cartografi trascrivono con precisione variabile → vendere le mappe → le navi
dei clienti navigano **usando le tue mappe** → errori tuoi = naufragi.

**Meccanica firma.** L'informazione come merce rischiosa: vendere presto una
mappa incompleta genera cassa immediata; ogni errore uccide gente che non
vedrai mai, e torna come rapporti di naufragio, inchieste, clausole di
risarcimento. Il prodotto è la verità, e la verità costa verifiche.

**Sistemi di profondità.**
- Le copie propagano gli errori: mappa copiata da mappa.
- Contratti con garanzie e penali.
- Edizioni atlante che consolidano il cartiglio — e i suoi sbagli.
- Esploratori con skill diversi (precisione vs velocità vs costo).

**Rischio di design.** Feedback indiretto: i naufragi avvengono fuori schermo.
Mitigazione: sistema di report che riporta le conseguenze sulla scrivania
della gilda (lettere dei superstiti, udienze della lega navale).

**Fit tecnico.** Canvas 2D; estetica carta/inchiostro già collaudata con SINI.
Fog of war su griglia esagonale o libera.

### Checklist implementazione

- [ ] Mondo: costa, scogli, relitti generati proceduralmente (daily seed)
- [ ] Fog of war a celle; spedizioni con pathing semplice
- [ ] Cartografi: precisione variabile → errori di transcrizione (spostamenti
      e omissioni di elementi)
- [ ] Mappe come prodotti: livello di dettaglio, copia, edizione
- [ ] Simulazione navigatori: rotte decise dalle mappe comprate
- [ ] Naufragi: probabilità in funzione di errore mappa + meteo
- [ ] Reputazione gilda: report, inchieste, penali
- [ ] UI: scrivania cartografo, tavolo di copy, archivio mappe vendute
- [ ] PWA + hub + record (ricavi gilda, naufragi evitati)

---

## 4. ACQUA — L'ingegnere degli acquedotti ✅ IMPLEMENTATO

> Implementato in `acqua-pwa/` (vedi README). Priorità consigliata: ~~4~~ completato.
> O: alto · P: alto · R: medio-alto · F: alto

**Fantasy.** Roma. Portare l'acqua in una città che cresce, con la sola
gravità.

**Core loop.** Leggere l'altimetria → tracciare canali con pendenze reali →
costruire archi dove serve (costosi) → l'acqua scorre secondo simulazione
idraulica semplificata ma onesta → fontane, terme, taverne dove arriva l'acqua
→ i notabili la vogliono prima dei plebei.

**Meccanica firma.** La pendenza non è decorativa: pendenza insufficiente =
ristagno, eccessiva = erosione del canale. Nessun tutorial può salvare un
profilo altimetrico maltrattato: è un puzzle di ingegneria che diventa tycoon.

**Sistemi di profondità.**
- Serbatoi di testata e cadute di pressione.
- Calcare che restringe i canali nel tempo (manutenzione).
- Sabbione: sedimentazione che va pulita.
- Siccità determinate dal daily seed.
- Pressione politica: richieste dei notabili con scadenze.

**Rischio di design.** La simulazione del flusso va semplificata senza
diventare falsa: portata ∝ pendenza × sezione, perdite per attrito. La
leggibilità è tutto: il profilo altimetrico deve essere sempre visibile.

**Fit tecnico.** Canvas 2D, line-drawing, nessuna fisica rigida. La sim
idraulica semplificata è il grosso del lavoro.

### Checklist implementazione

- [ ] Terreno: heightmap 1D del profilo + generazione città
- [ ] Canali: polilinee con quota; pendenza calcolata per segmento
- [ ] Sim idraulica: portata = k × pendenza × sezione; erosione/ristagno
- [ ] Archi: costo ∝ luce e altezza; pillar ogni N metri
- [ ] Città: edifici che richiedono portata; soddisfazione
- [ ] Manutenzione: calcare, sabbione, ispezioni
- [ ] Eventi: siccità (daily seed), rotture, pressione politica
- [ ] UI: profilo altimetrico sempre visibile, overlay portata
- [ ] PWA + hub + record (litri/giorno consegnati)

---

## 5. STYX — Casa funebre del confine

> Doppia clientela: i vivi pagano, i morti hanno istruzioni.
> Priorità consigliata: **5** (dopo i precedenti, per tema delicato).
> O: massimo (fantasy) · P: medio-alto · R: medio · F: alto

**Fantasy.** L'unica agenzia di pompe funebri di una città costruita sul
confine tra i vivi e i morti. Tono cozy-dark: malinconico, mai grottesco.

**Core loop.** Arriva un feretro → trattativa con la famiglia (il **lutto è
una risorsa emotiva**: l'upsell fa cassa oggi e reputazione giù domani) →
preparazione della cerimonia → sepoltura → e il defunto, dall'altro lato, ha
richieste sue: testamenti, debiti, ultime volontà.

**Meccanica firma.** Doppia clientela: un funerale può essere redditizio e un
disastro etico — e il defunto si presenta comunque dallo sportello
dell'oltretomba per lamentarsi.

**Sistemi di profondità.**
- Cimitero persistente: spazio limitato, esumazioni da gestire.
- Il cimitero come rappresentazione fisica delle scelte del giocatore.
- Epidemie: la domanda surge, la reputazione si consuma.
- Cerimonie personalizzate: componenti con costi emotivi diversi.
- Contratti con clausole testamentoarie da onorare (o negoziare).

**Rischio di design.** Il tema richiede un tono misurato: niente jump-scare,
niente macabro gratuito. Se il tono tiene, il fantasy è il più originale
del lotto.

**Fit tecnico.** Motore isometrico riutilizzabile da `resort-pwa`
(Isola Resort). Canvas 2D.

### Checklist implementazione

- [ ] Riutilizzo motore isometrico resort-pwa (estrazione in shared/ o fork)
- [ ] Case study funebre: flusso arrivo → trattativa → cerimonia → sepoltura
- [ ] Sistema lutto: meter per famiglia, effetto upsell su reputazione
- [ ] Sportello oltretomba: coda defunti con richieste
- [ ] Cimitero: piazzamento tombe, spazio, esumazioni
- [ ] Eventi: epidemie, clausole testamentoarie
- [ ] Tono: writing pass dedicato (malinconico, mai grottesco)
- [ ] PWA + hub + record (famiglie soddisfatte, onore guadagnato)

---

## Priorità consigliata

| # | Concept | Perché |
|---|---------|--------|
| 1 | **MADRE** | Meccanica impossibile fuori da una PWA; miglior rapporto profondità/rischio; infrastruttura già presente |
| 2 | **LINEA ROSSA** | Massima profondità sistemica e longevità; il lavoro sta nel bilanciamento |
| 3 | **NEBBIA** | Potenziale narrativo forte; demo verticale (spedizione → mappa → naufragio) come proof-of-concept |
| 4 | **ACQUA** | Bellissimo e educativo, ma la sim idraulica allunga i tempi |
| 5 | **STYX** | Fantasy più originale; richiede una pass di writing dedicata e il refactoring del motore isometrico |

## Fondazioni condivise da estrarre durante lo sviluppo

- [ ] Estrarre il motore isometrico da `resort-pwa/` in un modulo condiviso
      (serve per STYX, riutilizzabile da Isola Resort)
- [ ] Estendere `shared/arcade.js`: utilità per timestamp offline
      (`elapsedRealtime()`) e wrapper notifiche opt-in (serve a MADRE,
      riusabile da STATIC)
- [ ] Standardizzare il pannello obiettivi/contratti generati dal daily seed
      (MADRE, ACQUA, NEBBIA)
- [ ] Pattern UI "gestione" condiviso: pannelli, liste, bottoni di acquisto
      (MADRE, LINEA ROSSA, STYX)




# Errors to correct:

**Risolto** (2026-10-14). Le voci sotto sono state sistemate; i dettagli di
ciascuna correzione sono nei rispettivi commit. Restano aperte solo quelle
marcate `APERTO`.

| Voce | Stato |
|---|---|
| `viti-pwa` ReferenceError `grainCanvas` | risolto |
| `nebbia-pwa` ReferenceError `view` | risolto |
| `madre-pwa` ReferenceError `Sound` (+ `fmt` latente) | risolto |
| `acqua-pwa` ReferenceError `seed` | risolto |
| `anthology-pwa` / `recherche-pwa` ESM caricati come script classici | risolto |
| `virtual-farm-pwa` personaggi + soldi iniziali | risolto |
| `territorio-pwa` modalità senza respawn | risolto |
| `sini-pwa` morte troppo veloce | risolto |
| `snap-pwa` effetti al contrario | risolto |
| `mustang-pwa` più nemici | risolto |
| `mycel-pwa` non si muove | risolto |
| `alveare-pwa` non fa niente | risolto |
| `metro-pwa` altri livelli | risolto |
| `pokemon-go-pwa` pokedex completo + lancio come in Pokémon GO | APERTO |
| `bible-pwa` 5 handler (`showIndex`, `showAbout`, `goToChapter`, `hideChapterMenu`, `backToLibrary`) chiamati dal markup ma non definiti | APERTO |
| `example-pwa` importa `checkCollisions` da `world.js`, che non lo esporta e non lo definisce | APERTO |

## Dettaglio delle segnalazioni risolte

<details>
<summary>Registro completo</summary>

# Errors to correct:
Uncaught ReferenceError: grainCanvas is not defined
    at HTMLDocument.init (game.js:929:17)


Aggiungere personaggi a virtual-farm e mettere soldi iniziali altrimenti non può iniziare a piantare


Anthology-pwa:
Uncaught SyntaxError: Unexpected token 'export'
storage.js:1 Uncaught SyntaxError: Cannot use import statement outside a module
render.js:1 Uncaught SyntaxError: Cannot use import statement outside a module
main.js:1 Uncaught SyntaxError: Cannot use import statement outside a module
anthology-pwa/:1 <meta name="apple-mobile-web-app-capable" content="yes"> is deprecated. Please include <meta name="mobile-web-app-capable" content="yes">
anthology-pwa/:77 Uncaught ReferenceError: openVN is not defined
    at HTMLAnchorElement.onclick (anthology-pwa/:77:98)
anthology-pwa/:70 Uncaught ReferenceError: openVN is not defined
    at HTMLElement.onclick (anthology-pwa/:70:69)
anthology-pwa/:87 Uncaught ReferenceError: openVN is not defined
    at HTMLAnchorElement.onclick (anthology-pwa/:87:91)
anthology-pwa/:80 Uncaught ReferenceError: openVN is not defined
    at HTMLElement.onclick (anthology-pwa/:80:62)
anthology-pwa/:97 Uncaught ReferenceError: openVN is not defined
    at HTMLAnchorElement.onclick (anthology-pwa/:97:100)
anthology-pwa/:90 Uncaught ReferenceError: openVN is not defined
    at HTMLElement.onclick (anthology-pwa/:90:71)
anthology-pwa/:107 Uncaught ReferenceError: openVN is not defined
    at HTMLAnchorElement.onclick (anthology-pwa/:107:95)
anthology-pwa/:100 Uncaught ReferenceError: openVN is not defined
    at HTMLElement.onclick (anthology-pwa/:100:66)
anthology-pwa/:117 Uncaught ReferenceError: openVN is not defined
    at HTMLAnchorElement.onclick (anthology-pwa/:117:91)
anthology-pwa/:110 Uncaught ReferenceError: openVN is not defined
    at HTMLElement.onclick (anthology-pwa/:110:62)
anthology-pwa/:133 Uncaught ReferenceError: openVN is not defined
    at HTMLAnchorElement.onclick (anthology-pwa/:133:93)
anthology-pwa/:128 Uncaught ReferenceError: openVN is not defined
    at HTMLElement.onclick (anthology-pwa/:128:64)
anthology-pwa/:125 Uncaught ReferenceError: openVN is not defined
    at HTMLAnchorElement.onclick (anthology-pwa/:125:95)
anthology-pwa/:120 Uncaught ReferenceError: openVN is not defined
    at HTMLElement.onclick (anthology-pwa/:120:66)
anthology-pwa/:141 Uncaught ReferenceError: openVN is not defined
    at HTMLAnchorElement.onclick (anthology-pwa/:141:93)
anthology-pwa/:136 Uncaught ReferenceError: openVN is not defined
    at HTMLElement.onclick (anthology-pwa/:136:64)


territorio-pwa:
Modalità che i nemici non respawnano

sini-pwa:
Muore troppo velocemente

snap-pwa:
alcuni effetti sono al contrario

recerche-pwa:
Uncaught SyntaxError: Unexpected token 'export'
storage.js:1 Uncaught SyntaxError: Cannot use import statement outside a module
render.js:1 Uncaught SyntaxError: Cannot use import statement outside a module
audio.js:1 Uncaught SyntaxError: Cannot use import statement outside a module
main.js:1 Uncaught SyntaxError: Cannot use import statement outside a module
index.html:109 Live reload enabled.
index.html:1 <meta name="apple-mobile-web-app-capable" content="yes"> is deprecated. Please include <meta name="mobile-web-app-capable" content="yes">
index.html:60 Uncaught ReferenceError: startVN is not defined
    at HTMLButtonElement.onclick (index.html:60:53)
index.html:61 Uncaught ReferenceError: switchLanguage is not defined
    at HTMLButtonElement.onclick (index.html:61:63)
4index.html:60 Uncaught ReferenceError: startVN is not defined
    at HTMLButtonElement.onclick (index.html:60:53)


pokemon-go-pwa:
implementa piu pokemon utto il pokedex e il lancio giusto come in pokemon go con potenza timing e giro


nebbia-pwa:
Uncaught ReferenceError: view is not defined
    at resize (game.js:773:5)
    at HTMLDocument.init (game.js:840:5)


mycel-pwa:
non si muove

mustang-pwa:
aggiungere piu nemici 


metro-pwa:
aggiungi altri livelli 

madre-pwa:
game.js:625 Uncaught ReferenceError: Sound is not defined
    at initSound (game.js:625:11)
    at HTMLDocument.init (game.js:644:5)


alveare-pwa:
non fa niente


acqua-pwa:
Live reload enabled.
game.js:98 Uncaught ReferenceError: seed is not defined
    at genTerrain (game.js:98:49)
    at HTMLDocument.init (game.js:688:5)

</details>

---

## The self-audit — what is left

`tools/audit/run.mjs` loads every project in this repository in a real
browser and checks it there. The report is committed at
`portfolio/audit/report.html` **with the failures in it**. This is the list
of what is still open, and it is the next piece of work.

| Rule | Findings | Where |
|---|---:|---|
| Text below the WCAG contrast threshold | 127 | mostly the muted text of the games |
| Tap targets under 48px | 193 | mostly small icon buttons in the games |
| Canvas games with no aria-live region | 25 | the game surfaces cannot announce their state |

Already fixed in the same pass: the shared scene reader was throwing on load
and leaving nine literary pages empty; every control with no accessible name;
every form control with no label; a heading that skipped a level; and every
contrast and tap-target finding on the portfolio's own pages, which now
audit clean.

Run it with `node tools/audit/run.mjs`. It skips cleanly when there is no
browser.
