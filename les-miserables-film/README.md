# LES MISÉRABLES — LE FIL D'OR

A twenty-minute animated film drawn live in TypeScript. Ink, paper, candlelight, and one golden thread from the first night to the last dawn.

**Watch:** <https://lucagandolfi77.github.io/random2/les-miserables-film/>

After Victor Hugo, 1862. Original procedural score. No images, footage, video files, or recorded music: every frame is canvas and every note is Web Audio.

## The film

| Time | Chapter |
|---|---|
| 0:00 | Prologue — the book opens, 1815 |
| 1:30 | I. Le Juste — the bishop's candlesticks |
| 3:30 | II. Fantine — hair, coins, snow |
| 5:30 | III. 24601 — the cart, the trial, the confession |
| 7:20 | IV. Cosette — the inn, the forest, the bucket |
| 9:00 | V. Paris — rooftops, Thénardier, the chase |
| 10:50 | VI. Le Jardin — Marius, Cosette, the gate |
| 12:40 | VII. La Barricade — rain, flag, Gavroche |
| 14:50 | VIII. L'Égout — the sewer, carrying Marius |
| 16:20 | IX. L'Étoile — Javert and the Seine |
| 17:40 | X. Le Pardon — the wedding, the truth, the death |
| 19:20 | Epilogue — the thread becomes light; credits |

Total runtime: **1200 seconds**. The clock is wall-clock exact; dropped frames skip animation, never story time.

## Player

- Tap the poster to begin with sound, or choose silence.
- Tap the picture to show/hide controls.
- `Space` play/pause · `←`/`→` 10 seconds · `C` captions · `M` mute · `F` fullscreen.
- The golden progress line is also the film's thread: tap or drag it, or open the chapter sheet.
- The language pill switches **English / Italiano** everywhere, including mid-film. The choice is remembered.
- On a phone, rotate upright for the full portrait experience. On desktop, the film sits in a 9:16 lightbox.
- Pause a frame and open **About** to save it as a PNG, or share a deep link to the current timestamp.
- Installable and offline after the first viewing (service worker runtime cache).

## Development

```bash
npm install
npm run dev        # Vite dev server
npm run typecheck
npm test           # timeline + bilingual integrity
npm run build      # production build in dist/
npm run preview
```

The production build uses relative asset paths (`base: './'`), so it runs at a domain root, under `/random2/les-miserables-film/`, or from a plain static server.

### Architecture

- `src/film/timeline.ts` — the single 1200-second source of truth: chapters, bilingual cues, quotes, exact boundaries.
- `src/film/renderer.ts` — portrait stage, adaptive resolution, cover/contain fitting, captions, chapter cards, grain.
- `src/film/scenes/` — one scene module per act, all pure functions of local time.
- `src/film/figures.ts` — silhouette puppets, poses, walk cycles, profiles, a person carrying another.
- `src/film/art.ts` — ink, paper, glows, candles, golden thread, weather, architecture.
- `src/film/audio.ts` — the original score: four-voice pad, bass, plucked motif, noise beds, bells.
- `src/main.ts` — player, bilingual UI, chapter sheet, deep links, frame export, wake lock.

Every frame is a deterministic function of time. Scrubbing, resuming, and deep links are frame-exact; nothing is simulated cumulatively.

### Accessibility & safety

Captions are on by default and can be disabled. The film avoids rapid flashing (no more than 3 Hz) and respects `prefers-reduced-motion` by removing camera shake. Controls are labelled and keyboard-operable. Content note: poverty, child labour, war, death and suicide; no graphic violence.

### Deployment

The repository's Pages workflow builds this folder, runs typecheck/tests, and copies `dist/` to `/les-miserables-film/`:

```yaml
- name: Build LES MISÉRABLES — Le Fil d'Or
  working-directory: les-miserables-film
  run: npm ci && npm run typecheck && npm test && npm run build
```

## Credits

Written, drawn and scored in TypeScript.<br>
Text after *Les Misérables* by Victor Hugo (public domain).<br>
Typefaces: Cormorant Garamond and Inter (SIL Open Font License).<br>
No copyrighted musical material is quoted or reproduced.
