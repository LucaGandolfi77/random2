# Piano Fall PWA

A landscape progressive web app piano with **Synthesia-style falling notes**: tiles slide down the lanes and you strike the matching key as they cross the golden line.

## How to Play

- **Song mode** — pick one of five built-in songs from the menu. Tiles fall down the lanes; hit the right key when a tile reaches the gold line:
  - **Perfect** (±85 ms) = 100 pts, **Good** (±180 ms) = 60 pts, both multiplied by your combo (up to ×4)
  - Missed notes ghost-play softly so the melody keeps flowing — the run is scored on accuracy, not survival
  - Per-song best scores are saved locally
- **Freestyle mode** — the whole keyboard is yours, just play.

### Controls

| Input | Action |
| --- | --- |
| Tap / click keys | Play (multi-touch works) |
| `A S D F G H J K L ;` | White keys C4–E5 |
| `W E T Y U O P` | Black keys |
| `Esc` | Pause / resume |

## Songs

Twinkle Twinkle Little Star · Mary Had a Little Lamb · Ode to Joy · Jingle Bells · Für Elise (theme)

All note data is tiny `[midi, beat]` arrays — no audio assets, everything is synthesized live with WebAudio (triangle + harmonic partials with a piano-style decay envelope).

## Features

- 🎹 10 white + 7 black keys (C4–E5), lane layout perfectly synced between canvas and DOM keys
- ⏱ Song clock runs on `AudioContext.currentTime` → pause is sample-accurate (`AC.suspend()`)
- 💥 Hit bursts, rings, judgement popups, beat-pulsing gold line
- 🏆 Combo multiplier, live accuracy, progress bar, per-song bests
- 📱 Landscape-first: rotate prompt on portrait phones, safe-area insets, DPR-aware crisp rendering
- 🔊 Sound toggle, haptics, offline support via service worker
- 📊 Run stats recorded through the shared arcade layer (`R2.stats`)

## Technical Details

- Vanilla JavaScript, HTML5 Canvas, CSS3 — no build step, no dependencies
- Uses the shared `../shared/arcade.js` micro-library (storage, haptics, stats, install hints)
- WebAudio synthesis with three partials per note; no samples or downloads
- Pointer events for multi-touch; keyboard mapping for desktop
- Service Worker cache-first for full offline play

## File Structure

```
piano-pwa/
├── index.html        # Shell, HUD, overlays
├── piano.js          # Synth, songs, falling-note engine, judging
├── styles.css        # Keyboard, glass HUD, overlays
├── manifest.json     # PWA manifest (orientation: landscape)
├── service-worker.js # Offline caching (cache-first)
└── icons/            # SVG app icons
```

## Development

Serve this directory with any static web server and open it in a browser. Best experienced in landscape on a phone, or on desktop with the keyboard mapping. Works offline after the first visit.
