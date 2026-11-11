# LA CORONA E LA TESTA

**Una passione cefalofora in sei atti.**

Cortometraggio animato low-poly, solenne e umano, costruito interamente con Three.js, TypeScript e Web Audio API. La leggenda di San Donnino, patrono di Fidenza: un funzionario della corte di Massimiano, una fuga lungo le vie consolari, una decapitazione presso lo Stirone e un corpo che si alza portando la propria testa.

- **Durata:** 7 minuti e 23 secondi circa.
- **Lingua:** italiano.
- **Formato:** film 3D nel browser, con regia, animazioni, dialoghi, sottotitoli e audio.
- **Nessun asset esterno, nessuna API, nessun servizio cloud.**
- **101 sottotitoli** sincronizzati con la timeline.

---

## Installazione e avvio

Requisiti: Node.js 20.19+ (testato con Node 25), npm e un browser moderno con WebGL. Le voci usano la sintesi vocale del sistema, quindi disponibilità e timbro possono variare.

```bash
npm install
npm run dev
```

Aprire l'indirizzo mostrato da Vite, in genere `http://localhost:5173/`.

### Build di produzione

```bash
npm run build
npm run preview
```

La build è statica e trasferibile: la cartella `dist/` può essere servita da qualsiasi server HTTP. Aprire `index.html` con `file://` non è consigliato, perché i moduli ES richiedono un server.

### Test

```bash
npm run typecheck
npm test
npm run smoke
```

`npm run smoke` richiede una build precedente (`npm run build`) e Google Chrome installato. Avvia un server di anteprima, verifica il film in Chrome headless, salva screenshot in `tests/artifacts/` ed esce con codice diverso da zero se una verifica fallisce. Su macOS il percorso di Chrome viene rilevato automaticamente; su altri sistemi impostare `CHROME_PATH`.

Per eseguire lo smoke test contro un server già attivo:

```bash
SMOKE_URL=http://127.0.0.1:5173/ npm run smoke
```

---

## Come si guarda

1. Aprire il menu.
2. Premere **GUARDA IL FILM**.
3. Il film parte dall'Atto I. Se esiste un progresso salvato, il menu mostra **Riprendi**.
4. Durante la proiezione i controlli si trovano in basso; in modalità cinema si nascondono quando il mouse resta fermo.

### Comandi da tastiera

| Tasto | Azione |
|---|---|
| Spazio | Play / Pausa |
| ← / → | Indietro / avanti di 5 secondi (Shift: 1 secondo) |
| ↑ / ↓ | Volume |
| M | Muto |
| C | Sottotitoli |
| V | Voci sintetiche |
| F | Schermo intero |
| R | Ricomincia |
| Esc | Chiude impostazioni / esce dalla modalità cinema |

La UI offre anche: play/pausa, restart, salto atto precedente/successivo, timeline, volume, sottotitoli, voci, velocità (0.75×, 1×, 1.25×, 1.5×), qualità grafica, download `.srt`, fullscreen e modalità cinema.

---

## Cosa c'è nel film

Sei atti, una sola passione:

1. **La corona** — Milano, corte di Massimiano, 293 d.C. Donnino è *primus cubicularius*, custode della corona imperiale. Protegge i cristiani, rifiuta il sacrificio agli dei e depone la corona.
2. **Le vie consolari** — un bivio notturno, la pioggia, una comunità cristiana nascosta, una pattuglia che passa troppo vicino. Donnino sceglie la Via Claudia.
3. **La via Emilia** — la pianura, il XV miglio, un contadino, un bambino febbricitante e un cane che non si fida. Intanto la pattuglia lo riconosce.
4. **Lo Stirone** — il ponte, il tramonto, il centurione che è stato suo commilitone. La decapitazione resta fuori campo: la camera guarda il fiume, poi tace.
5. **Il miracolo** — all'alba il corpo si alza, prende la propria testa e attraversa lo Stirone. Una vedova guarda senza capire.
6. **La città** — il cantiere del Duomo, un maestro, un apprendista, i pellegrini e la facciata che racconta la storia. Poi il maestro si rivolge allo spettatore.

Il finale esteso è voluto: quindici secondi di silenzio davanti alla statua, poi la domanda **«La testa è questa. Il corpo, dove lo lasciate?»**. Poi nero.

La decapitazione è trattata fuori campo e senza gore. La cefaloforia è un'immagine sacra e surreale, non un effetto horror.

---

## Struttura del progetto

```text
la-corona-e-la-testa/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  vitest.config.ts
  README.md
  public/
    assets/
      captions.it.srt        # generato
      audio/ textures/ fonts/ # riservate; il film è procedurale
  scripts/
    export-captions.ts       # genera captions + SRT dallo screenplay
    smoke.ts                 # QA end-to-end con Chrome headless
  src/
    main.ts
    styles/main.css
    data/
      screenplay.json        # atti, beat, dialoghi, azioni, suoni
      camera-cues.json       # shot template e movimenti di camera
      types.ts
      roster.ts
      compileScreenplay.ts
    scene/
      FilmController.ts      # orchestrazione, playback, seek, UI state
      SceneManager.ts
      CameraDirector.ts
      Lighting.ts
      Sky.ts
      QualityManager.ts
    animation/
      Timeline.ts
      DialogueController.ts
    characters/
      StageActor.ts
      LowPolyCharacter.ts
      CharacterAnimator.ts
      CharacterFactory.ts
      Extras.ts              # il cane
    environments/
      BaseEnvironment.ts
      Court.ts / Crossroads.ts / ViaEmilia.ts
      Stirone.ts / Fidenza.ts
      props.ts
      propsRoman.ts
    subtitles/
      SubtitleManager.ts
      captions.it.json       # generato
      srt.ts
    audio/
      AudioManager.ts
      VoiceSynth.ts
      Music.ts
      Sfx.ts
      Synth.ts
    ui/
      MainMenu.ts
      PlayerControls.ts
      SettingsPanel.ts
      EndCard.ts
      types.ts
    utils/
      math.ts / storage.ts / textures.ts
  tests/
    timeline.test.ts
    captions.test.ts
    srt.test.ts
    storage.test.ts
    artifacts/               # screenshot dello smoke test (generati)
```

Il film è **data-driven**: la sceneggiatura e le inquadrature sono dati, mentre il codice costruisce personaggi, ambienti, camera, audio e UI.

---

## Come modificare il film

### Dialoghi, pause, tempi

Tutto parte da `src/data/screenplay.json`.

Un atto contiene una lista di `beats`. Ogni beat ha:

- `camera`: l'id di uno shot in `camera-cues.json`;
- `duration` opzionale: durata minima del beat;
- `dialogue`: battute con `speaker`, `text`, `duration` opzionale e `pauseAfter` opzionale;
- `actions`: azioni dei personaggi con `at`, `character`, `action`, `from`/`to` o `mark`, `duration`, `face`;
- `sfx`: effetti sonori con `at`, `name`, `gain`;
- `scene` opzionale: cambia ambiente/stage all'interno di un atto;
- `dialogueDelay` e `tail`: controllano rispettivamente l'attesa prima della prima battuta e il respiro finale del beat.

La durata delle battute viene stimata dal testo se non specificata. Il compilatore somma battute, azioni e suoni e calcola i timestamp assoluti, senza doverli scrivere a mano. Se un beat supera la durata minima, si allunga automaticamente.

Per cambiare un tempo:

1. modificare `duration`, `pauseAfter`, `dialogueDelay` o `tail`;
2. eseguire `npm run captions` (oppure `npm run dev`/`npm run build`, che lo fanno automaticamente);
3. verificare la durata totale stampata a console: deve restare tra 300 e 480 secondi.

La timeline è deterministica: per ogni istante il film ricostruisce scena, camera, pose, sottotitoli e audio. Questo rende affidabili pausa, seek, restart e ripresa.

### Sottotitoli

- I sottotitoli sono in una UI HTML sopra il canvas, mai dentro la scena 3D.
- `src/subtitles/captions.it.json` è generato da `scripts/export-captions.ts` a partire dallo screenplay. Non modificarlo a mano: verrebbe sovrascritto.
- Il file SRT statico è in `public/assets/captions.it.srt`; l'app può anche scaricarlo dalle impostazioni.
- Per rigenerarli: `npm run captions`.
- I test verificano che ogni battuta abbia una caption identica (testo, speaker, tempi).

### Camera e inquadrature

`src/data/camera-cues.json` contiene gli shot riutilizzabili. Una posizione o un target può essere:

- un array `[x, y, z]`;
- il nome di un “mark” definito nell'ambiente;
- un oggetto che segue un personaggio: `{ "character": "donnino", "offset": [0, 1.4, 0] }`.

Le posizioni dei mark sono nei costruttori degli ambienti (`this.mark('nome', x, y, z)`). Per una nuova inquadratura:

1. aggiungere il mark nell'ambiente;
2. aggiungere lo shot in `camera-cues.json`;
3. referenziarlo da un beat in `screenplay.json`.

I cambi di shot avvengono ai confini dei beat; le lunghe carrellate e i push-in lenti sono voluti.

### Personaggi e animazioni

- I corpi sono costruiti proceduralmente in `LowPolyCharacter.ts` (testa, viso, tuniche, toghe, armature, mantelli, cappucci, elmi, lauro, attrezzi).
- `CharacterFactory.ts` definisce Donnino, Massimiano, il centurione, il carnefice, il maestro, la vedova, il bambino, il cane, ecc.
- `CharacterAnimator.ts` risolve le azioni della timeline e passa lo stato all'attore; le pose sono funzioni del tempo, non stato accumulato.
- Le azioni disponibili sono in `src/data/types.ts` (`ActionName`).
- `carry_head` è l'azione cefalofora: nasconde la testa sul collo, mostra una testa-clone tra le mani e mantiene il passo lento. `lie_headless` mostra il corpo disteso senza testa; `lie` lo mostra ricomposto.
- Per aggiungere un'animazione: estendere `ActionName`, gestirla in `CharacterAnimator`, e implementarne la posa in `LowPolyCharacter`/`Extras`.
- Il cane ha animazioni dedicate in `Extras.ts`.

### Ambienti

Ogni ambiente è una classe in `src/environments/` che:

- crea geometrie, luci, cielo, props;
- definisce i mark;
- registra gli attori con posizione, orientamento e visibilità iniziale;
- può reagire al tempo (`update`) o alla timeline (`applyTimeline`).

Gli ambienti del film sono: corte imperiale, bivio consolare, Via Emilia, Stirone al tramonto, Stirone all'alba e cantiere del Duomo. Lo stile è low-poly teatrale: pochi elementi, materiali opachi, ombre, nebbia, spazio negativo. I cartelli usano `CanvasTexture` generata a runtime; non ci sono immagini esterne. I prop romani e romanici sono in `propsRoman.ts`.

### Audio

- Tutto è sintetizzato con Web Audio API: vento, pioggia, tuoni, fuoco, catene, porte, passi, cavalli, corni, ascia, campane, martello e scalpello, preghiera di folla, cane, corvo, musica minimale e riverbero.
- Le voci usano Web Speech API (sintesi vocale italiana del browser) con rate/pitch distinti per personaggio.
- Se la sintesi vocale non è disponibile, il film resta completamente fruibile tramite sottotitoli.
- Pausa e seek cancellano la voce corrente per evitare desincronizzazione.
- Volume, mute e toggle voci sono persistenti.

---

## Progresso, impostazioni e accessibilità

- Il progresso viene salvato in `localStorage` ogni 2 secondi, alla pausa, al cambio di atto e prima di chiudere la pagina.
- Al ritorno, il menu mostra il tempo salvato e il pulsante **Riprendi**.
- Il completamento è memorizzato separatamente; dopo la fine, il menu propone una nuova visione dall'inizio.
- Le impostazioni (qualità, sottotitoli, dimensione, voci, cinema, volume, velocità) sono persistenti.
- I sottotitoli sono un elemento `aria-live`; i controlli hanno etichette accessibili e focus visibile.
- Il film offre anche una modalità cinema con UI nascosta e cursore che scompare dopo inattività.

---

## Qualità grafica e compatibilità

- WebGLRenderer, tone mapping ACES, sRGB, ombre PCF.
- Qualità automatica: su dispositivi con poca memoria/CPU o touch screen piccoli viene attivata la modalità bassa (pixel ratio ridotto, ombre disattivate). È possibile forzare alta/bassa nelle impostazioni.
- Geometrie condivise, materiali condivisi, instancing per pavimentazione, erba, strada romana e canneti; luci limitate.
- Obiettivo: 60 FPS su desktop medio. Su hardware molto modesto il film resta guardabile in qualità bassa.
- Browser consigliati: Chrome/Edge recenti, Safari recente, Firefox recente.
- Se WebGL non è disponibile, l'app mostra un messaggio di errore invece di simulare una proiezione.

---

## Test e verifica

- `tests/timeline.test.ts`: struttura degli atti, durata 5–8 minuti, dialoghi portanti, sottotitoli, hold finale, telecamere, roster, uso esclusivo di `carry_head` per Donnino.
- `tests/captions.test.ts`: confronto esatto tra screenplay compilato e `captions.it.json`.
- `tests/srt.test.ts`: formattazione dei timestamp e file SRT.
- `tests/storage.test.ts`: impostazioni, progresso, dati corrotti e formattazione del tempo.
- `npm run smoke`: menu, avvio, audio, sottotitoli, pausa, ripresa, salti atto, restart, velocità, volume, muto, progresso dopo reload, fine, replay, download SRT, cinema mode, auto-hide, fullscreen e assenza di errori JavaScript.
- Gli screenshot dello smoke test finiscono in `tests/artifacts/`.

I test non simulano funzionalità assenti: verificano il comportamento reale dell'app in Chrome headless.

---

## Nota storica

La vicenda segue la *Passio sancti Domnini* e la tradizione fidentina: Donnino, *cubicularius* di Massimiano, la fuga, la decapitazione presso lo Stirone, il miracolo cefaloforo e la nascita del culto che portò a Borgo San Donnino e al Duomo di Fidenza. La data 293 è quella tradizionale, non un dato storicamente accertato. Il film è una rilettura narrativa e non una ricostruzione documentaria; la facciata romanica del Duomo e il suo ciclo scultoreo sono la principale suggestione visiva dell'ultimo atto.

Fonti di orientamento: Diocesi di Fidenza, *S. Donnino Martire*; *Passio* BHL 2264–2265; Museo del Duomo di Fidenza; tradizione iconografica del martire cefaloforo.

---

## Originalità e licenze

- Sceneggiatura, personaggi, ambienti, animazioni, audio e UI sono originali e generati proceduralmente.
- Nessun file audio, texture o font protetto è incluso.
- Three.js è distribuito con licenza MIT.
- Le voci sono fornite dal sistema operativo/browser tramite Web Speech API e non vengono incluse nel progetto.
- I font della UI sono stack di sistema (Georgia/Palatino, Avenir/Helvetica, SF Mono), così il progetto funziona offline.

---

## Note

- La disponibilità e la qualità delle voci TTS dipendono dal browser e dal sistema. I sottotitoli sono sempre la fonte di verità.
- La durata delle battute è stimata e può essere ritoccata in `screenplay.json`; il compilatore ricalcola tutto.
- La prima costruzione delle scene può richiedere qualche secondo; la schermata di caricamento indica l'ambiente in preparazione.
- Il film è pensato per una visione continua, ma il sistema di seek ricostruisce correttamente lo stato della scena anche a metà di un'azione.

**Fine.**
