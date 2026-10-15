# Plane Shooter

> A tiny plane, pinned to the bottom of the screen. You never dodge — you only
> pick angles. Nothing collides with you, so the only way to lose a life is to
> let a threat leave the board.

**Mobile-first, iPhone-optimised.** Canvas 2D + WebAudio, ~15 KB of hand-written
JS, zero asset binaries.

**Play it:** <https://lucagandolfi77.github.io/random2/plane-pwa/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/plane-pwa/
```

---

## The one rule

**The plane is a fixed turret, not a ship.**

It never moves. Drag to swing the aim arc, lift to fire along that angle. The
plane has **no hitbox at all** — nothing in the code collides with it. A life is
lost only when an enemy reaches the bottom edge having not been shot, which
makes the game a pure targeting puzzle: choose angles, and do not let anything
through.

Bullets inherit a shrinking hit radius (`dist < b.life·10 + e.r`), so a
long-range shot is genuinely harder to connect than a close one.

## The systems

| | Rule, as implemented |
|---|---|
| **Fixed timestep** | 12 ticks/s, with `dt × (10 + level − 1)` speed scaling |
| **Levels** | `floor(score/100) + 1`; 10 points per kill × level |
| **Enemies** | up to 8 alive, one every 2 ticks, r = 8, vx ±1, spawned from top/bottom/left |
| **Power-ups** | 10% of kills drop one — but they are cosmetic only: the entity exists, is drawn, is never collected |
| **Aim** | the reticle is a DOM element rotated by `atan2 + π/2` |
| **Themes** | 4 palettes: neon, retro, forest, ocean |

## The numbers

Canvas 400×600 · tickRate 12 · bulletSpeed 12 px/tick · enemySpeed 6 px/tick ·
bullets live ~50 ticks · 3 lives · 4 themes.

## Controls

| Action | Touch | Keyboard |
|---|---|---|
| Aim | drag on the canvas | — |
| Fire | release | `Space` |

Installable and offline-capable once installed.

## Saving

`localStorage["plane-pwa"]` → `{highScore, theme}`, written on theme change and
on death. Plus `plane-install-dismissed`, and run records through
`R2.stats.run({slug:"plane-pwa/", score, durMs, wave:level, outcome:"loss"})`.

## Known limits

- 🔴 **Not playable with a mouse.** Aiming reads `e.touches[0]` and nothing
  else, so there is no pointer path. The `Space` handler only fires when
  `state.aiming` is already true — which can only become true by dragging — so
  aiming can never be *started* from the keyboard either. The game is
  touch-only, on a desktop and on the repo's own hub.
- 🔴 **The header comment is wrong.** It says "Aim and fly". Nothing flies;
  `config.planeSpeed` is declared and never used.
- 🟠 **A third of the threats are free.** Enemies spawned from the bottom edge
  (side 1, vy −6) leave through the top and never cost a life. Enemies from the
  left are only ever tested against `y > 600`.
- 🟡 Power-ups are uncollectable.
- 🟡 `theme.text` and `theme.neon` are read in `draw()` but undefined in every
  theme, so the fallback `#fff` always applies.

## What's next

- 🔴 **Pointer Events.** Replace `touches[0]` with `pointermove`, one handler
  for mouse, touch and pen. This is a ~10 line change and it makes the game
  playable where it is currently only viewable.
- 🟠 **Spawn sides that matter.** Give the bottom spawner a return path or drop
  it, and test left-spawned enemies against the left edge too.
- 🟡 **Make the plane move**, or delete the lie: make the turret explicit in
  the copy.
- 🟡 Collectable power-ups: shield, spread, rapid.
- 🟢 Wave patterns, a real enemy roster, and a "how far did you get" epilogue.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../../LICENSE).
