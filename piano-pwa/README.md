# Piano Fall PWA

A landscape progressive web app piano with **Synthesia-style falling notes**: tiles slide down the lanes and you strike the matching key as they cross the golden line.

## How to Play

- **Song mode** — pick one of 15 built-in songs from the menu. Tiles fall down the lanes; hit the right key when a tile reaches the gold line:
  - **Perfect** (±85 ms) = 100 pts, **Good** (±180 ms) = 60 pts, both multiplied by your combo (up to ×4)
  - Missed notes ghost-play softly so the melody keeps flowing — the run is scored on accuracy, not survival
  - Per-song best scores are saved locally
- **MIDI mode** — load any `.mid` / `.midi` file and play it in the same falling-note mode. Tempo changes are respected, chords appear on multiple lanes, and out-of-range notes are octave-shifted or filtered automatically.
- **Freestyle mode** — the whole keyboard is yours, just play.

### Controls

| Input | Action |
| --- | --- |
| Tap / click keys | Play (multi-touch works) |
| `A S D F G H J K L ;` | First 10 white keys (C4–E5 by default) |
| `W E T Y U O P` | First 7 black keys |
| `Z X C V B N M , . / ' [` | Extra white keys on larger keyboards |
| `1 2 3 4 5 6 7 8` | Extra black keys on larger keyboards |
| `Esc` | Pause / resume, or close Settings |

## Keyboard Size

Open **Settings** (⚙ in the menu) to choose how many keys are on screen:

| Keys | Range |
| --- | --- |
| 17 | C4–E5 (default) |
| 20 | C4–G5 |
| 25 | C4–C6 |
| 29 | C4–E6 |
| 37 | C4–C7 |

The choice is saved locally, and the falling lanes, canvas grid, and computer-key mapping all rebuild to match.

## Songs

**Easy:** Twinkle Twinkle Little Star · Mary Had a Little Lamb · Happy Birthday · Frère Jacques · London Bridge

**Medium:** Ode to Joy · Jingle Bells · When the Saints Go Marching In · Amazing Grace · Greensleeves · Canon in D (theme) · Minuet in G

**Hard:** Für Elise (theme) · The Entertainer · William Tell Overture

All built-in note data is tiny `[midi, beat]` arrays — no audio assets, everything is synthesized live with WebAudio (triangle + harmonic partials with a piano-style decay envelope).

## MIDI Import

- Uses the dependency-free `midi.js` parser (SMF format 0/1, running status, tempo maps, track names, sysex skipping).
- Notes outside the current keyboard are octave-shifted to keep as much of the song as possible; leftovers are dropped and a toast shows the percentage that fits.
- Drum channel 10 is ignored.
- Up to 5 MIDI files (about 2 MB total) are saved in `localStorage` under **Your MIDI files**; use the ✕ button to remove one.
- Files are read locally in the browser and never uploaded.

## Features

- 🎹 Adjustable 17–37 key keyboard, lane layout perfectly synced between canvas and DOM keys
- ⏱ Song clock runs on `AudioContext.currentTime` → pause is sample-accurate (`AC.suspend()`)
- 💥 Hit bursts, rings, judgement popups, beat-pulsing gold line
- 🏆 Combo multiplier, live accuracy, progress bar, per-song bests
- 📁 MIDI import with octave auto-fit and a locally saved library
- 📱 Landscape-first: rotate prompt on portrait phones, safe-area insets, DPR-aware crisp rendering
- 🔊 Sound toggle, haptics, offline support via service worker
- 📊 Run stats recorded through the shared arcade layer (`R2.stats`)

## Technical Details

- Vanilla JavaScript, HTML5 Canvas, CSS3 — no build step, no dependencies
- Uses the shared `../shared/arcade.js` micro-library (storage, haptics, stats, install hints)
- WebAudio synthesis with three partials per note; no samples or downloads
- Pointer events for multi-touch; dynamic keyboard mapping for desktop
- Service Worker cache-first for full offline play

## File Structure

```
piano-pwa/
├── index.html        # Shell, HUD, overlays, MIDI + settings UI
├── piano.js          # Synth, songs, falling-note engine, judging, MIDI library
├── midi.js           # Dependency-free Standard MIDI File parser
├── styles.css        # Keyboard, glass HUD, overlays, settings
├── manifest.json     # PWA manifest (orientation: landscape)
├── service-worker.js # Offline caching (cache-first)
└── icons/            # SVG app icons
```

## Development

Serve this directory with any static web server and open it in a browser. Best experienced in landscape on a phone, or on desktop with the keyboard mapping. Works offline after the first visit.
