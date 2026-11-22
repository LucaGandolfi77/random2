# Pocket DS

An installable, offline-capable **Nintendo DS emulator app shell** for iPhone and mobile, built as a self-contained PWA in the `random2` arcade.

> **Read this first:** Pocket DS does **not** bundle Nintendo BIOS files, firmware, or any games, and the core included today is a **demo core** — it boots, renders to both screens, and reacts to every button/stylus input, but it does not emulate DS hardware. A real emulator core can be plugged in through the documented interface in `src/core/`. No BIOS/ROM data ever leaves your device.

## Features

- **Authentic DS hardware styling** — clamshell body, hinge, two 256×192 screens, stylus, speaker grille, power LED, four switchable shell colours.
- **Responsive layouts** — stacked portrait by default; hinge "opens" into a side-by-side layout on phones in landscape. Auto/portrait/landscape can be forced in Settings.
- **Real touchscreen** — tap and drag on the lower screen; coordinates are mapped to the DS 256×192 touch plane. Multi-touch works (buttons + stylus at once).
- **Complete controls** — D-pad, A/B/X/Y, L/R, Start/Select on screen, plus a keyboard fallback (see the in-app `?` help).
- **Local file loading** — pick `arm9bios.bin`, `arm7bios.bin`, `firmware.bin` (optional) and a `.nds` ROM. Files are stored in IndexedDB and survive reloads and offline use.
- **Save states & save RAM** — multiple state slots and cart save RAM, both kept privately in IndexedDB. Save RAM is flushed when the app is backgrounded on iOS.
- **Offline PWA** — a service worker precaches the shell, styles, icons and all source modules. No external fonts, CDNs or network calls.
- **Pluggable core** — the UI talks only to the `EmulatorCore` contract, so swapping in a real WASM core requires no UI changes.

## Quick start

```bash
cd /Users/lgandolfi/Desktop/AI/Github/random2
python3 -m http.server 8080
# open http://localhost:8080/nds-pwa/
```

On the first launch, the loader panel opens. You can either:

1. **Open .nds** — the toolbar button (or the button on the idle screen) opens a file picker for a local ROM. It loads immediately and boots into the demo view showing your game's real header title. You can also **drag and drop** a `.nds` file anywhere onto the app.
2. **Try demo mode** — boots instantly with no files and shows the full UI in action, or
3. Load your own BIOS files and `.nds` ROM in the loader panel, then press **Boot game**.

All three paths use the bundled demo core: opening a ROM displays its title and exercises the controls, but does not actually run the game until a real WASM core is installed.

On iPhone, open the site in Safari and use **Share → Add to Home Screen** to install it fullscreen. On Android/Chrome use **Install app**.

## Legal

Pocket DS is an emulator frontend. Emulation itself is legal in most jurisdictions, but Nintendo's BIOS, firmware and game ROMs are copyrighted. **Do not distribute them with this app.** Supply your own legally obtained files; they are read locally through a file input and stored only in this site's IndexedDB. Clearing them is available in Settings → **Clear loaded files**.

## Architecture

```
index.html          app shell + loader/settings/states/help panels
styles.css          handheld styling, skins, portrait + landscape
manifest.json       installable PWA metadata
service-worker.js   offline precache (never caches user BIOS/ROM blobs)
icons/              SVG sources + generated PNG (incl. maskable)
src/
  main.js           bootstrap and all wiring
  config.js         constants, button bitmask, key map, storage keys
  emulator.js       60 Hz requestAnimationFrame loop, FPS, frame skip
  input.js          pointer buttons, keyboard, touchscreen -> InputSnapshot
  screens.js        canvas contexts, layout resolution, visual settings
  loader.js         permissive BIOS / ROM header validation
  storage.js        IndexedDB (files, states, RAM) + localStorage (settings)
  audio.js          tiny WebAudio feedback bus
  ui.js             toasts, overlays, status readouts
  core/
    core-api.js     EmulatorCore contract + core registry
    demo-core.js    working demo implementation (boot + input demo)
    wasm-core.js    documented seam for a real WebAssembly core
```

### The core contract

`src/core/core-api.js` defines the interface every core implements:

| Method | Purpose |
| --- | --- |
| `static id / label / description / requiredFiles` | Metadata for registration/UI |
| `constructor({ contexts, settings, onStatus })` | Receives both 2D canvas contexts |
| `async init({ files, demo })` | Load BIOS/ROM payload; return `true` on success |
| `tick(nowMs, input)` | Called once per frame; `input = { buttons, touch: {x, y, down} }` |
| `start() / pause() / stop() / reset()` | Lifecycle |
| `getState() / setState(state)` | Serializable save states |
| `getSaveRAM() / setSaveRAM(data)` | Cartridge save RAM |
| `getInfo()` | `{ title, code, maker, demo }` |
| `destroy()` | Cleanup |

Cores self-register via `registerCore(CoreClass)`; `main.js` creates one with `createCore('demo', opts)`.

### Adding a real emulator

See `src/core/wasm-core.js`. In short: compile a DS emulator (e.g. melonDS) to WASM with an Emscripten bridge exposing `init / runFrame / frame buffers / state / saveRAM`, drop the binary into `nds-pwa/core/`, replace the stub `bridge`, and select `'wasm'` in `main.js`. Because all other modules depend only on the contract, no UI, input, storage or CSS work is needed. Expect a significant porting effort and that full-speed emulation on an iPhone may not be achievable.

## Settings

Shell colour, layout mode, screen size (70–130%), frame skip, volume, scanlines and the touch hint are stored in localStorage under `pocketds.settings.v1`.

## Keyboard map

| DS control | Key |
| --- | --- |
| D-pad | Arrow keys / WASD |
| A / B | Z / X |
| X / Y | J / K |
| L / R | Q / E |
| Start / Select | Enter / Shift or Backspace |
| Stylus | Mouse or finger on the lower screen |

## Known limitations

- The bundled core is a demo, not a cycle-accurate DS emulator; it renders an on-screen badge saying so.
- BIOS/ROM validation is intentionally permissive (homebrew and revisions vary); warnings are informational.
- Performance of any future WASM core on mobile depends on the device and the core's optimisation.

## GitHub Pages deployment

Pocket DS is a **static PWA with no build tooling**. The Pages workflow publishes the folder verbatim to `https://lucagandolfi77.github.io/random2/nds-pwa/` and all paths are relative, so it works under the `/random2/` subpath.

Two CI steps were added for it:

- `.github/workflows/ci.yml` — `Pocket DS (PWA contract check)` runs `node nds-pwa/scripts/verify.mjs`.
- `.github/workflows/pages.yml` — `Build Pocket DS (static PWA, published by rsync)` runs the same check before deployment, and the assemble step asserts `_site/nds-pwa/index.html`, `manifest.json` and `service-worker.js` exist.

`scripts/verify.mjs` is the build gate: it checks required sources, manifest icons, every service-worker precache entry, HTML references, ES module imports, and that no remote scripts/stylesheets are loaded.

When committing a new page, regenerate the sitemap with `node tools/sitemap.mjs` (CI verifies it is current).

## Part of the random2 arcade

See `HUB_ENTRY.md` for the hub card snippet and deployment notes.
