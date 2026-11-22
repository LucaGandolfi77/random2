# Hub Entry: Pocket DS

## About This PWA

Pocket DS is an installable Nintendo DS emulator app shell for the browser, built for iPhone and other mobile devices. It presents authentic DS hardware (dual screens, hinge, touch screen, D-pad, face/shoulder/system buttons) and uses a pluggable core architecture so a real WebAssembly emulator can be dropped in without touching the UI.

It ships with a working **demo core** that exercises the entire app — boot animation, dual-screen rendering, button/stylus input, save states and save RAM — while clearly labelling that no hardware emulation is active.

## Hub Integration

Add this card to the hub `index.html` game grid:

```html
<div class="card" data-playable="nds-pwa/" data-tags="games,emulator,retro,arcade">
    <div class="tile">
        <canvas width="200" height="200" data-game="nds-pwa"></canvas>
    </div>
    <h3>Pocket DS</h3>
    <p>A Nintendo DS emulator PWA for iPhone and mobile. Load your own BIOS and ROM.</p>
    <div class="meta">
        <span class="tag">games</span>
        <span class="tag">emulator</span>
        <span class="tag">retro</span>
    </div>
</div>
```

## Deployment

1. Commit the `nds-pwa/` directory together with the updated `sitemap.xml` and hub `index.html`.
2. CI runs `node nds-pwa/scripts/verify.mjs` (the PWA build gate), and the Pages workflow runs the same check before publishing.
3. `pages.yml` publishes the folder **as-is** with the site-wide `rsync` — there is no bundler and no `dist/` step. All asset paths are relative (`./`), so it works under `/random2/nds-pwa/`.
4. Live at `https://lucagandolfi77.github.io/random2/nds-pwa/`.
5. Open on a phone and use **Share → Add to Home Screen** (iOS) or **Install app** (Android/Chrome).

If you commit on a later date than the sitemap was generated, run `node tools/sitemap.mjs` first — CI checks that the committed sitemap is current.

## Key Features

- **Authentic DS hardware** — clamshell portrait layout and a rotating landscape layout, both CSS-only.
- **Real touchscreen** — pointer-driven lower screen mapped to 256×192 stylus coordinates, with multi-touch.
- **Full input** — D-pad, A/B/X/Y, L/R, Start/Select on screen plus a keyboard fallback.
- **Local-only files** — ARM9 BIOS, ARM7 BIOS, firmware and `.nds` ROM are read with a file picker and stored in IndexedDB. Nothing is uploaded or bundled.
- **Persistence** — save states and save RAM in IndexedDB; settings in localStorage.
- **Offline PWA** — service worker precaches the shell and source modules; no external fonts or network requests.
- **Pluggable core** — `src/core/core-api.js` defines the contract; `demo-core.js` implements it today; `wasm-core.js` is the documented integration seam for a real emulator.

## Limitations

No Nintendo BIOS, firmware or games are included, and the bundled core is a demo, not a cycle-accurate emulator. Full-speed DS emulation on an iPhone depends on a future WASM core and is not guaranteed.

## File Structure

```
nds-pwa/
├── index.html                 # app shell + all panels
├── styles.css                 # handheld CSS, skins, portrait/landscape
├── manifest.json              # PWA manifest
├── service-worker.js          # offline shell cache
├── icons/                     # SVG + generated PNG icons
├── src/
│   ├── main.js                # wiring / bootstrap
│   ├── config.js              # constants, button map, settings keys
│   ├── emulator.js            # 60 Hz loop, FPS, frame skip
│   ├── input.js               # buttons, keyboard, touchscreen
│   ├── screens.js             # contexts, layout, visual settings
│   ├── loader.js              # (reserved) file validation helpers
│   ├── storage.js             # IndexedDB + localStorage
│   ├── audio.js               # WebAudio feedback
│   ├── ui.js                  # toasts, overlays, status
│   └── core/
│       ├── core-api.js        # EmulatorCore contract + registry
│       ├── demo-core.js       # working demo implementation
│       └── wasm-core.js       # WASM integration scaffold
├── README.md
└── HUB_ENTRY.md
```

## Local Development

```bash
cd /Users/lgandolfi/Desktop/AI/Github/random2
python3 -m http.server 8080
# visit http://localhost:8080/nds-pwa/
```
