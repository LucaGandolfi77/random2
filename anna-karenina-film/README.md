# NEVE E FERRO

**Un film d'animazione originale ispirato ad *Anna Karenina* di Lev Tolstoj.**

25 minuti · 12 sequenze · 79 inquadrature · dialoghi e sottotitoli in italiano · colonna sonora originale · PWA offline.

> Un inverno. Un treno. Una scelta.  
> L'amore non sempre salva: a volte rivela la gabbia.

---

## Cos'è

`NEVE E FERRO` è un cortometraggio cinematografico digitale completamente statico, costruito con TypeScript, Vite, SVG, Canvas e Web Audio. Non è una presentazione, una sequenza di slide o un visualizzatore di testi: è un motore narrativo a timeline che monta 79 inquadrature animate, con camera virtuale, parallasse, personaggi, luci, particelle, musica e sound design.

Il romanzo è pubblico dominio; la sceneggiatura, i personaggi, gli ambienti, la partitura e il sound design sono originali.

### Nota di produzione sugli sfondi

La prima scelta produttiva prevedeva matte painting generate e personaggi vettoriali. Il servizio di generazione immagini non era disponibile per saldo insufficiente, quindi la produzione è passata al fallback originale previsto dal progetto: **ambienti vettoriali/procedurali**. L'architettura è pronta per sostituire gli sfondi con plate pittoriche (`renderEnvironment`) senza cambiare la timeline. Non sono stati usati asset esterni o protetti.

### Voce

La versione cinematografica usa **narrazione scritta in intertitoli e dialoghi in sottotitoli sincronizzati**; la musica e il sound design portano l'emozione. Non usa Speech Synthesis del browser. È predisposta per un pacchetto voci registrate: vedi `docs/voice-pack.md`.

---

## Caratteristiche

- **Timeline centrale unica** da 1500 secondi, con play/pausa/seek senza desincronizzazione.
- **12 sequenze**, 79 inquadrature, 67 cue di dialogo/narrazione, nessuna scena placeholder.
- **Personaggi SVG** con rig 2D, espressioni, sguardo, battito di ciglia, respiro, mani, vestiti e viste di spalle.
- **Ambienti vettoriali a strati** con parallasse, profondità di campo simulata, luci, crowd silhouettes e primo piano sfocato.
- **Camera virtuale** con dolly, pan, zoom, rack focus simulato e tagli interni.
- **Particelle deterministiche** (neve, vapore, polvere, pioggia, braci) calcolate in funzione del tempo.
- **Colonna sonora originale** da camera sintetizzata in tempo reale via Web Audio: pianoforte, archi, violoncello, violino, flauto, campane, percussioni.
- **Sound design procedurale**: treno, fischi, vapore, passi, porte, orologi, campane, vento, pioggia, cavalli, fuoco, samovar, uccelli.
- **Sottotitoli** cinematografici, attivabili/disattivabili, con testi in `src/subtitles/it.ts` separati dai cue di timing e speaker.
- **Player completo** con capitoli, barra di avanzamento, tempo trascorso/rimanente, volume, mute, sottotitoli, fullscreen, ricomincia, resume.
- **PWA installabile** con manifest, icone originali, splash, service worker e cache integrale.
- **Offline reale** dopo il primo caricamento completo.
- **GitHub Pages** sotto un percorso annidato, con workflow additivo nel portfolio esistente.

---

## Avvio locale

Requisiti: Node.js `>=20.19`, npm.

```bash
cd anna-karenina-film
npm ci
npm run dev
```

Apri `http://127.0.0.1:5173/`.

### Build di produzione

```bash
npm run build
npm run preview
```

Per simulare esattamente GitHub Pages sotto `/random2/anna-karenina-film/`:

```bash
BASE_PATH=/random2/anna-karenina-film/ npm run build
npm run serve:pages
```

Apri `http://127.0.0.1:4173/random2/anna-karenina-film/`.

### Test

```bash
npm run typecheck
npm test
npm run test:e2e
```

I test E2E usano il canale Chrome locale e il server Vite. Se Chrome non è disponibile, installa i browser Playwright con `npx playwright install chromium`.

### Documenti

```bash
npm run validate   # controlla durata, shot, cue, sottotitoli
npm run docs       # rigenera sceneggiatura e storyboard dai dati
```

Documenti principali:

- `docs/screenplay.md` — sceneggiatura completa con timecode.
- `docs/storyboard.md` — storyboard tecnico delle 79 inquadrature.
- `docs/character-bible.md` — personaggi, costumi, espressioni, rig.
- `docs/art-direction.md` — concept visivo, palette, ambienti, regia.
- `docs/sound-design.md` — partitura, motivi, SFX, mix.
- `docs/voice-pack.md` — come aggiungere una voice track.
- `docs/qa.md` — verifiche eseguite e limiti.
- `ASSETS.md` — provenienza e licenze.

---

## Struttura

```
anna-karenina-film/
├── public/
│   ├── icons/                 # PWA, favicon, OG
│   ├── manifest.webmanifest
│   └── assets/                # predisposizione per plate e voice track
├── src/
│   ├── app/                   # landing, loading, player, end screen
│   ├── characters/            # specs e renderer SVG
│   ├── components/            # componenti UI riutilizzabili
│   ├── data/
│   │   ├── scenes/            # 12 sceneggiature temporizzate
│   │   ├── film.ts            # timeline aggregata
│   │   ├── helpers.ts
│   │   ├── palettes.ts
│   │   ├── types.ts
│   │   └── validate.ts
│   ├── engine/                # timeline, scene manager, audio, loader, persistenza
│   ├── scenes/                # motore scena, ambienti, props
│   ├── subtitles/             # testi localizzati, separati dai cue
│   ├── styles/
│   └── main.ts
├── scripts/                   # audio, icone, SW, docs, QA
├── tests/                     # Vitest + Playwright
├── docs/
├── index.html
├── vite.config.ts
├── playwright.config.ts
├── vitest.config.ts
├── package.json
└── README.md
```

---

## Architettura

### Timeline

`src/engine/FilmTimeline.ts` è l'unica fonte del tempo. Usa un'ancora `performance.now()` e un loop `requestAnimationFrame`; non usa `setTimeout` scollegati per il montaggio. Tutte le scene, le camere, i personaggi, le particelle, i sottotitoli e l'audio derivano dallo stesso tempo.

- Pausa: il tempo si ferma e l'AudioContext viene sospeso.
- Ripresa: il tempo continua dallo stesso punto e l'audio viene risincronizzato.
- Seek: scene e audio vengono riallineati; il player riparte pulito.
- Fine: la timeline si blocca esattamente a 1500 s e mostra la schermata finale.

### Scene

Ogni scena è un `SceneDef` con durata, palette, ambiente, shot, sottotitoli, musica e ambienza. Ogni shot contiene camera keyframe, actor track, effetti, SFX e props. I dati sono validati da `src/data/validate.ts` e dai test.

### Rendering

- Stage virtuale 1920×1080, scalato con letterboxing.
- SVG per personaggi, ambienti e props.
- Canvas per neve, vapore, pioggia, polvere, braci e fumo.
- CSS per camera, parallasse, luce, profondità di campo, grana e vignettatura.
- Palette CSS per scena; grade e haze globali.

### Audio

La partitura è generata in tempo reale con Web Audio. Non ci sono file audio esterni obbligatori; il film funziona offline anche senza scaricare tracce. Un `AnalyserNode` espone il livello audio nei test. La pausa sospende il contesto; il seek ferma e ricrea le sorgenti.

---

## PWA e offline

- `public/manifest.webmanifest` con icone 192/512/1024, maskable, apple-touch-icon.
- `scripts/build-sw.mjs` genera `dist/sw.js` con precache di tutti gli asset e versione hash.
- Il loader verifica manifest, icone, font e asset procedurali; non avvia il film finché non è pronto.
- La cache del service worker copre app shell, JS, CSS, font, icone e manifest.
- Dopo il primo caricamento completo il film funziona senza rete.
- Installazione: prompt su Chromium, istruzioni su iOS.

---

## GitHub Pages

Il progetto è pensato come app annidata nel portfolio del repository:

**https://lucagandolfi77.github.io/random2/anna-karenina-film/**

Base path di produzione: `/random2/anna-karenina-film/`.

Il workflow condiviso `.github/workflows/pages.yml` viene esteso in modo additivo:

1. aggiunge il lockfile al cache Node;
2. esegue `npm ci`, `npm run typecheck`, `npm test`, `npm run build` con `BASE_PATH`;
3. copia `dist/` in `_site/anna-karenina-film/`;
4. esclude la cartella sorgente dal `rsync` del sito.

Non vengono modificati gli altri progetti. La build di Pages dipende dal successo di tutti i progetti del portfolio.

Se il film viene spostato in un repository dedicato, imposta `BASE_PATH=/<nome-repository>/` e usa un workflow che pubblichi `dist/` alla radice.

---

## Verifiche eseguite

Vedi `docs/qa.md` per la matrice completa. In sintesi:

- `tsc --noEmit` senza errori.
- Vitest: 13 test su dati, timeline, sottotitoli e persistenza.
- Playwright: 7 test E2E su landing, player, pausa, seek, capitoli, sottotitoli, fine, resume, mobile e console.
- Build Vite e generazione service worker.
- Test sotto `/random2/anna-karenina-film/` con manifest, scope SW, cache, icone, font, offline e ripresa della riproduzione.
- Verifica del livello audio > 0 durante la riproduzione.
- Screenshot di controllo delle scene chiave.

Non dichiaro verificati soggettivamente il missaggio audio finale, l'installazione su un iPhone/iPad fisico o il deploy live se il push/Pages non è disponibile.

---

## Licenze e provenienza

- Codice: MIT (`LICENSE`).
- Opera, personaggi, ambienti, partitura e suoni originali: CC BY-NC-SA 4.0.
- Font: Cormorant Garamond e Inter, SIL Open Font License.
- Romanzo ispiratore: *Anna Karenina* di Lev Tolstoj, pubblico dominio.
- Nessun frame, voce, musica o immagine da adattamenti esistenti.
- Dettagli: `ASSETS.md`.

---

## Crediti

Un film originale ispirato ad *Anna Karenina* di Lev Tolstoj.  
Sceneggiatura, regia, animazione, musica e sviluppo realizzati per questo progetto.  
Immagini vettoriali originali. Partitura e sound design sintetizzati in Web Audio.  
Tipografia: Cormorant Garamond e Inter.  
Grazie per aver visto **NEVE E FERRO**.
