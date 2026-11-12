# NEVE E FERRO — QA

## Ambienti di verifica

- macOS, Node `22.23.2`, npm `10.9.8`.
- Chrome locale via Playwright (`channel: chrome`).
- Build di produzione servita sotto `/random2/anna-karenina-film/`.
- Service Worker e Cache API attivi.

## Matrice

| Verifica | Esito | Evidenza |
|---|---|---|
| `tsc --noEmit` | ✅ | nessun errore |
| Vitest | ✅ 13/13 | dati film, timeline, sottotitoli, persistenza |
| Playwright E2E | ✅ 7/7 | landing, player, pausa, seek, capitoli, sottotitoli, fine, resume, mobile, console |
| 12 scene | ✅ | `src/data/film.ts`, test |
| Durata 1500 s | ✅ | test timeline e validazione |
| 79 inquadrature | ✅ | test e storyboard |
| 67 cue dialogo/narrazione | ✅ | test e sceneggiatura |
| Nessuna scena vuota | ✅ | shot sweep 79/79, 0 frame sotto soglia di luminosità |
| Nessun errore console | ✅ | shot sweep + E2E |
| Pausa congela il tempo | ✅ | E2E |
| Ripresa senza desync | ✅ | E2E; AudioContext sospeso/ripreso |
| Seek e capitoli | ✅ | E2E |
| Sottotitoli on/off | ✅ | E2E |
| Resume da localStorage | ✅ | E2E |
| Layout mobile 390×844 | ✅ | E2E |
| Audio non silenzioso | ✅ | RMS dell'`AnalyserNode` > 0 in riproduzione |
| Manifest e icone | ✅ | base path annidato |
| Service Worker scope | ✅ | `/random2/anna-karenina-film/` |
| Cache offline | ✅ | 74 asset: index, JS, manifest, icone, font |
| Riproduzione offline | ✅ | landing + player sotto rete disattivata |
| Deploy GitHub Pages live | ⏳ da verificare dopo il push | workflow additivo in `.github/workflows/pages.yml` |
| Installazione iPhone/iPad reale | ⚠️ manuale | Playwright WebKit non sostituisce un dispositivo |
| Missaggio audio soggettivo | ⚠️ non ascoltato in questa sede | verifica tecnica di livello e sincronizzazione |
| Qualità visiva soggettiva | ⚠️ stile vettoriale dichiarato | non fotorealistico; fallback AI documentato |

## Shot sweep

79 screenshot, uno per inquadratura, con UI e sottotitoli nascosti, presi dalla build di produzione sotto il percorso GitHub Pages. Nessun errore, nessun frame vuoto.

![Contact sheet delle 79 inquadrature](qa/contact-sheet.jpg)

Immagini chiave:

![Landing](qa/landing.jpg)
![Ballo](qa/ballroom.jpg)
![Appartamento](qa/apartment.jpg)
![Memoria](qa/memory.jpg)

## Base path e offline

Comando:

```bash
BASE_PATH=/random2/anna-karenina-film/ npm run build
npm run serve:pages
```

Risultati:

- manifest: `/random2/anna-karenina-film/manifest.webmanifest`
- scope service worker: `/random2/anna-karenina-film/`
- cache: 74 asset
- offline: landing e player avviati, tempo che avanza
- errori console: 0

## Passata integrale

Lo script `scripts/full-pass.ts` avvia il film dall'inizio, lo lascia scorrere a velocità reale per 25 minuti e registra stato, scena, sottotitolo e audio. Il risultato viene salvato in `/tmp/neve-full-pass/full-pass.json` e allegato al report finale.

## Limiti dichiarati

- Non è stata effettuata una prova su un iPhone/iPad fisico: l'installazione PWA e il fullscreen iOS richiedono un dispositivo reale.
- Il missaggio audio è verificato tecnicamente (RMS, contesto, pausa, seek), non con un ascolto critico umano.
- Il deploy live dipende dal successo del workflow del portfolio e dalle credenziali Git disponibili.
- La grafica è volutamente vettoriale/stilizzata; la generazione AI di matte painting non era disponibile e non è stata usata.
