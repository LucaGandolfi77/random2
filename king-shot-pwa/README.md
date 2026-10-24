# King Shot PWA

A progressive web app archery-defense game. You are the king on the castle wall: draw your bow, arc arrows over the battlements and hold the line against waves of monsters.

## How to Play

1. **Drag anywhere and release** — the royal bow aims at your finger and arrows fly on a gravity arc (a dotted preview shows the trajectory).
2. Slimes march, bats swoop and armored brutes soak multiple hits — don't let them reach the wall.
3. Each monster that touches the wall costs a heart. Lose all 5 and the kingdom falls.
4. Chain kills without missing to build a **combo multiplier** (up to ×5).
5. Grab dropped power-ups: **Multishot** (3 arrows), **Piercing** (arrows pass through), **Slow-mo**, **Wall Repair**.
6. Clear a wave to earn a bonus — the next wave is bigger and faster.

Desktop: ← → aim, ↑ ↓ power, **Space** to fire, **P** to pause, **Enter** to start.

## Features

- 🏹 Slingshot aiming with live trajectory preview and power arc
- 🌄 Fully painted canvas scene: night sky, twinkling stars, moon, parallax mountains, brick wall, waving flag, flickering torches with embers
- 👹 Three enemy types with distinct art, animation and behavior (squash-and-stretch slimes, sine-wave bats, crackable armored brutes)
- 💥 Particle bursts, hit flashes, floating score popups, screen shake
- 🌈 Four scene palettes: Royal Night, Synthwave, Emerald Dawn, Deep Tide
- 🏆 Combo system, wave bonuses, high score, run stats via the shared arcade layer
- 🔊 Synth sound effects and haptics
- 💾 Offline support via service worker, installable PWA
- 📱 Mobile-first: DPR-aware crisp rendering, pointer events, safe-area insets, auto-pause on background

## Technical Details

- Vanilla JavaScript, HTML5 Canvas, CSS3 — no build step, no dependencies
- Uses the shared `../shared/arcade.js` micro-library (sound, particles helpers, stats, install hints)
- `devicePixelRatio`-aware canvas that fills the viewport; game logic runs in CSS-pixel space with view-height-relative physics
- Swept segment-circle collision so fast arrows can't tunnel through targets
- Service Worker for offline caching, manifest for installation
- LocalStorage for high score, theme and play counts

## File Structure

```
king-shot-pwa/
├── index.html        # Shell, HUD, overlays
├── game.js           # Scene, entities, waves, input, rendering
├── styles.css        # Glass HUD, overlays, themes
├── manifest.json     # PWA manifest
├── service-worker.js # Offline caching (cache-first)
└── icons/            # SVG app icons
```

## Development

To run locally, serve this directory with any static web server (or open it via the hub). The game works offline after the first visit thanks to the service worker.

## License

This project is open source and available for modification and distribution.
