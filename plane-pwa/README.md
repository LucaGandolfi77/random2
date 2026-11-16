# Plane Shooter

> One thumb. Drag to fly. Auto-fire. The swarm does not stop.

A compact vertical shooter for portrait phones and desktop browsers. Drag
anywhere on the playfield to move the plane, let the auto-fire do the work,
and dodge the bullets. No bombs, no bosses, no upgrade screens: a run is a
few minutes of movement and targeting.

**Play it:** <https://lucagandolfi77.github.io/random2/plane-pwa/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/plane-pwa/
```

---

## The one rule

**The plane is 20 px wide. Its hitbox is a 4 px circle.**

That gap is the game. The sprite is large enough to read at a glance, the
hitbox is small enough that a near miss is genuinely a near miss, and the
difference is what makes dodging feel fair with a thumb on a phone. Nothing
about the playfield is hidden: if a bullet looks like it missed, it missed.

The drag is relative to the point where your finger landed. The plane does
not jump under your thumb; you can drag from the bottom corner and keep the
whole playfield visible.

## Controls

| Action | Touch | Mouse | Keyboard |
|---|---|---|---|
| Fly | Drag anywhere on the playfield | Drag with the left button | Arrows / WASD |
| Fire | Automatic | Automatic | Automatic |
| Pause / resume | Pause button | Pause button | `P` / `Esc` |
| Mute | Speaker button | Speaker button | `M` |
| Change theme | Theme button | Theme button | `T` |
| Start / restart | Play button | Play button | `Enter` |

The plane is clamped to the playfield; `pointercancel`, `lostpointercapture`
and a window blur all release the drag cleanly. Keyboard movement is
normalised so diagonals are not faster than the axes.

## The systems

| System | Rule |
|---|---|
| Lives | 3. A hit costs one life, grants 1.8 s of invulnerability, clears nearby enemy bullets and shakes the screen. Maximum 5 lives. |
| Shield | Absorbs one hit, then breaks. Its ring is drawn around the plane. |
| Auto-fire | 6.25 shots/s. The bullet cap is 42, so a long empty screen cannot build a burst. |
| Power-ups | 12% drop chance (32% for a tank): Rapid, Spread, Shield, Repair. They fall, home toward the plane and are collected on contact. Rapid and Spread last 10 s. |
| Waves | One every 20 s. Enemy speed and spawn rate ramp with a cap; a wave pays `100 × wave` and shows a banner. |
| Hitbox | Player 4 px; bullets 3 px; enemies 9-16 px. Circle-circle collision only. |
| Difficulty | Enemy speed caps at 2.2×, spawn interval at 0.45 s, enemy bullet speed at 1.8×. |
| Menu / pause / over | Explicit phases. Pausing stops the simulation; hiding the tab pauses automatically. |

### Enemies

| Enemy | HP | Value | Behaviour |
|---|---:|---:|---|
| Drifter | 1 | 10 | Straight descent |
| Weaver | 1 | 20 | Sine-wave descent |
| Diver | 1 | 30 | Descends and tracks the player horizontally |
| Gunner | 2 | 40 | Stops around y = 165, fires aimed bullets, then leaves |
| Tank | 4 | 70 | Slow, fires a three-way spread from y = 80 |

Enemies that leave the bottom are removed. There is no penalty for letting
one escape; the cost is the score you did not get, which keeps the pressure
on movement rather than on a hidden rule.

## The numbers

Design space 400×600 · fixed 60 Hz step · bullets 560 px/s · enemy bullets
150-175 px/s base · 3 lives · 4 themes · 12 enemies and 60 enemy bullets on
screen at most · 180 particles.

The renderer measures the main content box, sizes the stage to a 2:3
rectangle and gives the canvas a DPR-aware backing store (capped at 2×).
There is no letterboxing inside the canvas, so pointer coordinates map with
a single scale factor.

## Saving

`localStorage["plane-pwa"]` stores:

```json
{
  "version": 2,
  "highScore": 0,
  "bestWave": 1,
  "theme": "neon",
  "installDismissed": false
}
```

The old build stored `{ highScore, theme }`; loading migrates it in memory
and the next save writes the versioned shape. Runs are also recorded through
`R2.stats.run({ slug: "plane-pwa/", score, durMs, wave, outcome: "loss",
meta: { kills, powerups, hits } })`. The dashboard's legacy reader still
finds the high score under the same key.

Sound and haptics come from the shared `random2-settings` object, so the
speaker button is the same mute as the rest of the arcade.

## Development

No build step, no dependencies. The source is ES modules loaded directly by
the browser.

```bash
cd plane-pwa
npm test                      # node --test tests/*.test.mjs
# with a static server running from the repository root:
node smoke.mjs http://localhost:8080/plane-pwa/
```

The unit tests cover movement, auto-fire, collisions, invulnerability,
shields, power-ups, waves, determinism and a small bot that must survive 30
seconds. The smoke test drives Chromium through the real page: pointer drag,
auto-fire score, pause, game over, restart, theme persistence and an offline
reload through the service worker.

`?debug=1` exposes `window.PlaneShooter` with `snapshot()`, `start()`,
`spawn()`, `forceGameOver()` and `setPlayer()`. It is used by the smoke test
and is not needed to play.

## Files

```
index.html              app shell, HUD, overlay, install prompt
styles.css              portrait layout, safe areas, themes, 48px targets
manifest.json           installable PWA metadata
service-worker.js       versioned precache, offline navigation fallback
src/config.js           tuning, themes, enemy and power-up tables
src/sim.js              pure fixed-step simulation
src/render.js           Canvas 2D renderer, DPR and resize
src/input.js            pointer drag and keyboard, coordinate mapping
src/storage.js          versioned save + legacy migration
src/ui.js               HUD, overlay, live region, install prompt
src/main.js             state machine, loop, R2 stats, PWA hooks
tests/                  node:test suites
smoke.mjs               Chromium smoke test
icons/                  SVG sources + PNG 192/512/maskable/apple-touch
```

## Known limits

- Portrait-first by design. Landscape works on desktop, but phones get a
  rotate hint because the thumb reach is bad.
- No online leaderboard and no accounts: the high score is local to the
  device, like the rest of the arcade.
- No bombs, bosses or upgrade tree. `plane-arcade-pwa` is the deeper game in
  this family; `plane-pwa` is deliberately the short one.
- Audio starts only after a user gesture, because browsers require it.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../LICENSE).
