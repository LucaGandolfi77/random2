# random2 · Play

A collection of installable mini-games (PWAs) and one dev tool, hosted on GitHub Pages:

**https://lucagandolfi77.github.io/random2/**

## Projects

| Project | What it is | Play |
|---|---|---|
| [King Shot](king-shot-pwa/) | Touch archery duels | [▶ Play](king-shot-pwa/) |
| [Plane Shooter](plane-pwa/) | Classic side-scrolling shooter | [▶ Play](plane-pwa/) |
| [Slot Machine](slot-pwa/) | Slot machine, spin to win | [▶ Play](slot-pwa/) |
| [Snake](snake-pwa/) | Retro snake with themes & power-ups | [▶ Play](snake-pwa/) |
| [Mustang 1942](mustang-pwa/) | WWII vertical shmup, 32 stages | [▶ Play](mustang-pwa/) |
| [Farm Tycoon](virtual-farm-pwa/) | Idle farming simulator | [▶ Play](virtual-farm-pwa/) |
| [BUCIO](bucio/) | 3D black-hole eat-'em-up (Vite + three.js) | [▶ Play](bucio/) |
| [Snap Cam](snap-pwa/) | Camera with face lenses & film filters | [▶ Play](snap-pwa/) |
| [EADS](EADS/) | Embedded Analysis & Debug Studio (Python desktop tool) | [GitHub](EADS/) |

## Deployment

GitHub Pages is deployed automatically by [`.github/workflows/pages.yml`](.github/workflows/pages.yml)
on every push to `main`. The workflow builds BUCIO (Vite) and publishes the whole
repo, with `bucio/dist` served under `/bucio/`.

All games are plain static sites with relative paths, so they work both at the
repo root and under the `/random2/` Pages subpath.

## Local preview

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

For BUCIO locally: `cd bucio && npm install && npm run dev`.

## iPhone

Every game is an installable PWA: open it in Safari and use
**Share → Add to Home Screen** for a fullscreen, offline-capable app.
