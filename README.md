# random2 · Play

> A monorepo of installable mini-games (PWAs) and one desktop dev tool.
> Every game runs entirely in the browser, is fully playable offline once
> installed, uses **zero binary art assets** (everything is drawn procedurally
> on canvas) and **zero trackers**.

**Live arcade:** <https://lucagandolfi77.github.io/random2/>

---

## Table of contents

- [What's in the box](#whats-in-the-box)
- [Quick start](#quick-start)
- [Installing as an app (PWA)](#installing-as-an-app-pwa)
- [The games](#the-games)
  - [King Shot](#king-shot)
  - [Plane Shooter](#plane-shooter)
  - [Slot Machine](#slot-machine)
  - [Snake](#snake)
  - [Mustang 1942](#mustang-1942)
  - [Farm Tycoon](#farm-tycoon)
  - [BUCIO](#bucio)
  - [Snap Cam](#snap-cam)
- [The tools](#the-tools)
  - [EADS Studio](#eads-studio)
- [The hub page](#the-hub-page)
- [Architecture](#architecture)
- [Deployment (GitHub Pages)](#deployment-github-pages)
- [Local development](#local-development)
- [Adding a new game](#adding-a-new-game)
- [Privacy & performance](#privacy--performance)
- [Browser support](#browser-support)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## What's in the box

| # | Project | Kind | Tech | Offline | Try it |
|---|---------|------|------|:-------:|--------|
| 1 | **King Shot** | Archery duels | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/king-shot-pwa/) |
| 2 | **Plane Shooter** | Side-scrolling shmup | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/plane-pwa/) |
| 3 | **Slot Machine** | 3-reel casino | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/slot-pwa/) |
| 4 | **Snake** | Retro arcade | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/snake-pwa/) |
| 5 | **Mustang 1942** | WWII vertical shmup | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/mustang-pwa/) |
| 6 | **Farm Tycoon** | Idle farming sim | Canvas/DOM + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/virtual-farm-pwa/) |
| 7 | **BUCIO** | 3D black-hole eat-'em-up | three.js + Vite | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/bucio/) |
| 8 | **Snap Cam** | Camera + face lenses | MediaPipe + getUserMedia | ✅* | [▶ Open](https://lucagandolfi77.github.io/random2/snap-pwa/) |
| 9 | **EADS Studio** | Embedded dev tool | Python / Flask | n/a | [⌘ GitHub](https://github.com/LucaGandolfi77/random2/tree/main/EADS) |

\* Snap Cam needs HTTPS (any browser rule for `getUserMedia`) and downloads its
face-tracking engine on first use; after that it works offline too.

Every web project is a **PWA**: it has a web manifest, a service worker with a
precache, Apple touch meta tags, safe-area-aware CSS and a standalone display
mode. Open one, add it to your home screen, and it behaves like a native app.

## Quick start

```bash
git clone https://github.com/LucaGandolfi77/random2.git
cd random2
python3 -m http.server 8080
# open http://localhost:8080
```

That's it for every game except BUCIO (see [Local development](#local-development)).
All games are plain static files with relative paths — no build step, no
bundlers, no dependencies. BUCIO is the one exception (Vite + three.js), and it
is compiled by CI before publishing.

## Installing as an app (PWA)

| Platform | Steps |
|----------|-------|
| **iPhone / iPad** (Safari) | Open a game → **Share** → **Add to Home Screen**. Launches fullscreen with no browser chrome, keeps working offline. |
| **Android** (Chrome) | Open a game → tap the **Install** banner, or **⋮ → Install app**. |
| **Desktop** (Chrome/Edge) | Click the install icon in the address bar, or **⋮ → Install**. |
| **macOS** (Safari 17+) | **File → Add to Dock**. |

All games request `display: standalone`, cache their full shell in a service
worker on first load and store progress (high scores, unlocks, farm state,
photos) in `localStorage` / `IndexedDB` on the device.

---

## The games

### King Shot

*Touch archery duels.* 👑

Pull back with one finger to set angle and power, release to loose. The aim
circle and crosshair mirror your finger in real time, so a single thumb is
enough — designed phone-first, playable with mouse and keyboard too.

- Drag-to-aim, release-to-fire controls with a live trajectory feel
- Ticking clock, combo scoring and escalating rounds
- Procedural targets and synthesized WebAudio SFX (bow, impact, win)
- Four color themes (neon, retro, forest, ocean) with persistent high score
- Installable, offline-capable, ~15 KB of hand-written JS

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/` (SVG).

### Plane Shooter

*Classic side-scrolling sky action.* ✈️

You fly a little plane at the bottom of the screen; enemies stream in from the
edges. Drag to aim the gun direction, release to fire, dodge what comes back.

- 360° aiming (touch drag or mouse), infinite bullets with life-time falloff
- Enemy spawner with bounce physics and a difficulty ramp per level
- Occasional power-up drops, particle explosions on every kill
- Three lives, level-up thresholds, high-score persistence
- Full offline shell + install prompt, iPhone viewport locked (no zoom/jitter)

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/` (SVG).

### Slot Machine

*Spin to win.* 🎰

A three-reel slot with emoji symbols, a real paytable and a bet multiplier.
Each reel spins with its own random speed and stops at its own random moment,
then the middle payline is evaluated.

- 8 symbols (🍇 🍎 🍊 🍋 🔔 ⭐ 💰 🍀) with payouts from 2× to 50×
- Adjustable bet (1–10) and persistent high score
- Win bursts with a particle explosion and a rising arpeggio; losing spins get
  a soft descending tone
- Idle reel drift so the machine always looks alive
- Full PWA shell with themes and offline play

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/` (SVG).

### Snake

*The retro classic, reimagined.* 🐍

Grid-locked snake with buttery-smooth rendering, swipe gestures on touch and
arrow keys/WASD on desktop.

- Food (fruit emojis), scoring and speed-up per level
- Power-ups: 🌈 rainbow (triple points), ⏰ clock (bonus time), ⭐ star (points)
- Optional wrap-around walls vs. classic deadly walls
- Obstacles appear as levels progress; particle bursts and synth SFX
- Pause (Space), game-over stats, persistent high score, four themes

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/` (SVG).

### Mustang 1942

*Vertical WWII air shooter, 32 stages × 2 fronts.* 🛩️

Mechanics follow Capcom's *1942* (1984): the aerial loop, POW crates dropped by
destroyed formations, side fighters, Yashichi medals, bomber scoring chains,
sector boss planes and the end-of-stage shoot-down tally. No build step, no
dependencies, no binary assets — every aircraft, tank, warship and landscape is
drawn procedurally, every sound is synthesized.

- **Two fronts:** *Operation Overlord* (Europe 1944, P-51 Mustang vs.
  Luftwaffe) and *Operation Rising Sun* (Pacific 1942, A6M Zero vs. USAAF/USN),
  each 32 stages across eight named sectors
- **Aerial loop** makes you briefly invulnerable but blocks fire — three per
  stage, unspent loops pay 1,000 points each at the tally
- **POW crates:** green = firepower up (2→4 guns), white = smart bomb,
  grey = two side fighters, plus more
- Three difficulty presets (Recruit / Arcade / Ace) remembered between runs
- Continue system that restarts from the last cleared sector, per front

| Action | Touch | Keyboard |
|--------|-------|----------|
| Move | drag anywhere | arrows / `WASD` |
| Shoot | automatic | hold `Z` / `Space` |
| Aerial loop | **LOOP** button | `X` / `Shift` |
| Pause | **PAUSE** button | `P` / `Esc` |
| Start / next stage | tap playfield | `Enter` |

**Files:** `index.html`, `styles.css`, `src/` (`art.js`, `audio.js`,
`data.js`, `game.js`), `scripts/gen-icons.mjs`, `tests/`, `manifest.json`,
`service-worker.js`. See [`mustang-pwa/README.md`](mustang-pwa/README.md) for
the full mechanics manual.

### Farm Tycoon

*Cozy idle farming empire.* 🌾

Manage a growing farm: plant crops, water them, raise animals, survive the
weather and watch coins pile up. Time advances automatically (one in-game day
per few real seconds), so the farm keeps living while you plan.

- Expandable grid (1×1 → 5×5): every cell holds a crop or an animal
- Five crops (corn, wheat, tomato, carrot, potato) with different growth
  times, multi-harvest yields and seed costs (~50% of sell price)
- Animals (chicken, sheep, …) that eat coins and produce goods daily
- Weather that speeds up or slows down growth, milestones and achievements
- Day/night cycle, persistent farm state in `localStorage`, offline play

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/`. See
[`virtual-farm-pwa/README.md`](virtual-farm-pwa/README.md) for the full
economy tables.

### BUCIO

*You are a black hole loose over an Italian seaside town.* 🕳️

A 3D eat-'em-up built with **three.js** and bundled with **Vite**: 120 seconds
to devour Portomarina — and your rival holes — before the clock runs out.

- Full 3D low-poly town (procedural buildings, props, sky and sea) you can
  grow through: the bigger you get, the further the camera pulls back
- Rival AI holes that hunt and flee depending on relative size; beat one that's
  smaller and take 3× its score, get eaten and lose points
- **Gold** events worth 500 points that vanish fast
- **Power gems** (from level 5 also a gravity-wave button, `SPAZIO` / ◉):
  turbo, magnetism, double points, shield, instant growth, luck
- Italian-language UI with a tier list, three graphics presets and multiple
  world themes/ambiances
- Installable PWA build (workbox precache) — deployable as static files

**Source:** [`bucio/`](bucio/) — `src/core/` (engine, input, audio, utils),
`src/world/` (terrain, sky, props, themes), `src/game/` (director, AI,
camera, effects, hole, power-ups), `src/ui/` (screens, HUD, joystick).
Built output is deployed under `/bucio/`.

### Snap Cam

*Camera with face lenses & film filters.* 👻

A Snapchat-style PWA: real-time front/back camera with **face lenses**
(MediaPipe FaceLandmarker, 478 landmarks, engine vendored in `snap-pwa/vendor/`)
and a stack of image filters. Snaps live only on your device.

- Face lenses: 🐶 dog, 😎 shades, 👑 crown, 😍 heart eyes, 🐱 cat, 🐰 rabbit,
  🤖 robot, 🤠 cowboy, 😈 devil, 😇 angel, plus animated "quiz" lenses that
  draw a random animal/food/mood on your forehead
- Film filters: B/W, noir, sepia, vivid, cold, warm, negative, psychedelic
  (animated), mosaic, vignette, grain, VHS (scanlines), duotone, thermal,
  dream (bloom)
- Front/back switching with auto-mirror on the front camera, screen flash
- Shot → caption → save to **Ricordi** (IndexedDB) / download / discard;
  grid viewer with delete and export
- Requires HTTPS (GitHub Pages qualifies); first face-lens use fetches the
  ~15 MB engine, then it is cached by the service worker for offline use

**Files:** `index.html`, `app.js`, `filters.js`, `styles.css`,
`vendor/` (MediaPipe tasks-vision bundle, wasm, models), `manifest.json`,
`service-worker.js`. See [`snap-pwa/README.md`](snap-pwa/README.md).

---

## The tools

### EADS Studio

*Embedded Analysis & Debug Studio.* 🛠️

A **Python** desktop application (not a web game) for embedded C/C++ work:
a Flask-served studio UI that drives the whole analyze-build-debug loop.

- **Project registry** (`projects.json`) with per-project toolchains and paths
- **Source explorer**: file tree, preview with size/binary guards
- **Build** jobs (make/cmake) with live SSE event streams and cancellation
- **Binary inspection**: ELF sections/symbols, `addr2line` mapping
- **Static analysis** profiles (Cppcheck) and **stack usage** reports
- **Doxygen** docs generation and on-device **run** sessions (serial/runner)
- **GDB/MI debugging** backend: start sessions, send commands, stop

Run it locally:

```bash
cd EADS
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
python app.py
```

**Source:** [`EADS/`](EADS/) — `studio/web.py` (REST + SSE API),
`studio/services/` (build, gdbmi, analyze, inspect, runner, source, binaries),
`tests/` (pytest suite).

---

## The hub page

The repo root doubles as the arcade's home page
([`index.html`](index.html)) — a single self-contained file listing every
project. It is itself an installable PWA.

**Graphics**

- Animated aurora background (two drifting conic-gradient blobs) plus a live
  **canvas starfield** with depth parallax that follows your pointer
- Pointer-tracked radial sheen and a subtle **3D tilt** on each card (pointer
  devices only)
- Shimmer sweep across every game tile, animated gradient title, pulsing
  kicker dot
- Staggered scroll-reveal of cards via `IntersectionObserver`
- Animated count-up stats strip (games / offline / binary assets / trackers)

**Features**

- **Live search** across names, taglines and tags (press `/` to focus)
- **Category filters**: All · Shooters · Arcade · Casual · Apps · Tools — the
  choice persists in `localStorage`
- 🎲 **Surprise me**: picks a random playable game, announces it on the button,
  then jumps
- **Install button** powered by `beforeinstallprompt` (hidden until the
  browser offers installation)
- **Online/offline pill** in the corner that flips to
  "Offline — games still work"
- Hub service worker (`sw.js`, network-first for navigations,
  stale-while-revalidate for the shell) — registered with **relative paths**, so
  it works both at a domain root and under GitHub Pages' `/random2/` subpath

**Quality**

- `prefers-reduced-motion` disables every animation (starfield paints once)
- Safe-area insets respected on notched iPhones (`env(safe-area-inset-*)`)
- Focus-visible outlines, ARIA roles/labels, semantic landmarks, no layout
  shift; works without JS (cards simply show, filters hide)

---

## Architecture

```
random2/
├── index.html              # hub/landing page (self-contained, own SW: sw.js)
├── manifest.webmanifest    # hub manifest
├── sw.js                   # hub service worker (shell only, relative scope)
├── icons/                  # hub icons (PNG 192/512)
├── apple-touch-icon.png
├── .github/workflows/pages.yml   # build + deploy pipeline
│
├── snake-pwa/              # ┐
├── king-shot-pwa/          # │ plain static PWAs — same shape:
├── plane-pwa/              # │   index.html · styles.css · game.js
├── slot-pwa/               # │   manifest.json · service-worker.js · icons/
├── virtual-farm-pwa/       # ┘
│
├── mustang-pwa/            # static PWA, code split into src/ modules + tests
├── snap-pwa/               # static PWA + vendored MediaPipe engine
│
├── bucio/                  # three.js game, Vite project → dist/ on deploy
│   ├── src/                #   ES modules (core, world, game, ui)
│   ├── public/             #   icons & screenshots
│   └── vite.config.js
│
└── EADS/                   # Python/Flask desktop tool + pytest suite
```

Design rules that keep the repo boring (in a good way):

- **No frameworks** for the games: each is vanilla JS on a 2D canvas, with a
  tiny shared shape — `init / gameLoop / update / draw / localStorage` — so any
  one of them can be read top-to-bottom in one sitting.
- **Relative paths everywhere** in the static games, so they run identically at
  a domain root, under `/random2/`, or from any subfolder.
- **One service worker per game**, each with its own cache name; the hub SW
  only owns the hub shell and never intercepts sub-game traffic.
- **State is device-local only** — `localStorage` for scores/settings,
  `IndexedDB` for Snap Cam photos. There is no server-side state anywhere.

## Deployment (GitHub Pages)

Pushes to `main` trigger [`.github/workflows/pages.yml`](.github/workflows/pages.yml):

1. **Checkout** the repo.
2. **Build BUCIO**: `npm ci && npm run build` inside `bucio/` (Node 20, npm
   cache keyed on `bucio/package-lock.json`).
3. **Assemble the site**: rsync everything except `.git`, `.github` and the
   BUCIO *sources* into `_site/`, then copy `bucio/dist/` → `_site/bucio/`
   and `touch _site/.nojekyll` (so GitHub serves paths starting with `_`).
4. **Upload + deploy** the artifact with `actions/upload-pages-artifact` and
   `actions/deploy-pages`.

Concurrency is grouped (`group: pages`), so a rapid series of pushes never
races — the newest deploy wins. The published URL is
<https://lucagandolfi77.github.io/random2/>.

## Local development

| Project | Command | URL |
|---------|---------|-----|
| Hub + all static games | `python3 -m http.server 8080` (repo root) | <http://localhost:8080> |
| BUCIO (dev) | `cd bucio && npm install && npm run dev` | Vite dev server |
| BUCIO (prod build) | `cd bucio && npm run build` | serves `bucio/dist/` |
| EADS | `cd EADS && pip install -r requirements*.txt && python app.py` | Flask UI |

Notes:

- Service workers only register on `https://` or `http://localhost` — opening
  `index.html` via `file://` will not register them (Mustang additionally needs
  a real origin because of root-absolute asset paths).
- If a game seems stuck on an old version after a deploy, bump its
  `CACHE_NAME` (or the hub's `sw.js` version) and hard-reload once; SW updates
  activate on the next navigation.

## Adding a new game

1. Create `my-game-pwa/` with the standard shape:
   `index.html`, `styles.css`, `game.js`, `manifest.json`,
   `service-worker.js`, `icons/` (192 + 512).
2. Use **relative paths** and give the SW a unique `CACHE_NAME`.
3. Add Apple tags + safe-area viewport so it behaves on iPhone.
4. Add a card to the root `index.html` with `data-playable="my-game-pwa/"`,
   `data-tags="..."`, an emoji tile and a gradient pair.
5. Add a row to the table in this README (and a section if the game deserves
   one).
6. Push to `main` — Pages deploys automatically. Done.

## Privacy & performance

- **No accounts, no analytics, no ads, no network calls** in any game —
  the only optional network fetch is Snap Cam's first-time MediaPipe download.
- Everything visual is generated at runtime: emoji glyphs, canvas drawing and
  CSS gradients replace sprites, so each game ships in a few tens of KB.
- Audio is synthesized with the WebAudio API (oscillators + gain envelopes),
  so there are no sound files either.
- Storage limits: `localStorage` (a few KB) for progress; Snap Cam uses
  IndexedDB for photos and never uploads them.
- The starfield, tilts and animations all pause or flatten under
  `prefers-reduced-motion`, and canvases pause when the tab is hidden.

## Browser support

| Browser | Status |
|---------|--------|
| iOS Safari 16.4+ | ✅ target platform (safe-areas, standalone, 16.4+ needed for Snap's MediaPipe) |
| Chrome / Edge (desktop & Android) | ✅ |
| Firefox (desktop & Android) | ✅ |
| Safari macOS | ✅ (Add to Dock on 17+) |

`color-mix()` and `100dvh` are used on the hub; on very old browsers those
degrade gracefully (no sheen tint / slightly different heights).

## Troubleshooting

- **"Add to Home Screen" missing on iPhone** → you must open the game in
  Safari (not an in-app browser).
- **Game won't load assets after a redeploy** → the old SW is still
  controlling the tab; close and reopen the game once, or bump its cache name.
- **Camera black in Snap Cam** → check HTTPS and camera permission; also make
  sure no other tab is holding the camera.
- **BUCIO 404 under `/random2/bucio/`** → the Vite `base` is configured for the
  Pages subpath; if you self-host at a domain root, rebuild after adjusting
  `vite.config.js`.
- **EADS can't find the toolchain** → set the compiler/debugger paths in the
  project registry (`projects.json`).

## FAQ

**Is everything really offline?**
After the first load, yes — each game's service worker precaches its shell.
Snap Cam needs one extra online visit to fetch the face-tracking engine.

**Where are my high scores stored?**
On your device only (`localStorage`/`IndexedDB`). Clearing site data resets
them; nothing ever leaves the device.

**Can I host this myself?**
Yes. It's all static files (plus one Vite build). Any static host works; for
Snap Cam the host must serve HTTPS.

**Why emoji instead of sprites?**
They're crisp on every DPI, cost zero bytes, and fit the "procedural, no
binary assets" constraint. Mustang 1942 is the exception in spirit: its art is
procedurally *drawn* on canvas rather than being emoji.

---

Made for fun. Fork it, steal the patterns, ship your own game.
