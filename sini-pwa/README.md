# SINI

> Living ink on rice paper. Your ink dries as you age — the more of the page
> you bake into permanence, the faster the rest of you evaporates. Wetness is
> life. The body is not a snake; it is a brushstroke that grows old as it
> paints.

*A living-brushstroke .io.* No build step, no dependencies, no art assets.

**Play it:** <https://lucagandolfi77.github.io/random2/sini-pwa/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/sini-pwa/
```

---

## The one rule

**The more paper you bake, the faster you dry.**

`WET_MAX = 100`, `WET_DECAY = 1.05`, and
`decayRate(p) = WET_DECAY + min(1.6, p.paintedArea/26000)`. Painting is
literally ageing. Drain is capped at 14/s; at wet 0 you die of dried ink. The
whole game is the tension between occupying territory and staying wet long
enough to do it.

`lifeOf(wet)` says how long a stroke survives before evaporating to nothing:
below wet 28 it is `Infinity` — permanent. Between 28 and 100 it runs 1.6s at
the top down to 8.1s at the bottom.

## The systems

| | Rule, as implemented |
|---|---|
| **Two-layer ink** | wet points are redrawn each frame at alpha `0.88(1 − age/life)` with a halo growing `r(1.5 + age·0.5)`. Permanent ink is baked once into an offscreen canvas and never redrawn |
| **Only permanent ink kills** | `lethalAt()` queries a spatial hash (`HASH_CELL 64`) and skips any point with `life !== Infinity` |
| **Speed and turn** | `speed = 128(0.72 + 0.55·wet/100)`, `turn = 3.3 + 3.4·wet/100`. Drying is not just death, it is clumsiness |
| **Dash** | ×1.5 speed and a **flat +9** wet/sec — an adder, not a multiplier, so it costs a fixed absolute amount of life whatever your wetness |
| **Water droplets** | every 3.5–6.5s, 12% chance of two, warn 1s, then erase baked ink with `destination-out`. The counterplay |
| **Red seal** | every 40–70s for 18s: bakes *all* your wet points instantly, +150 score, 2.5s invulnerable. Greed dries you into your own graveyard |
| **Collision** | head-on, the shorter **body** dies. Body starts 70, +3 per stone (cap 250), −16 per droplet, death below `BODY_MIN 20` |
| **Rounds** | at 60% painted the sheet turns and the map resets `paintedTotal` |

## The numbers

Paper 1800×2400 · lethal border 9px · `SPACING 7` · `HEAD_R 7` · `POINT_R 4.4` ·
6 bots from a 10-name list, respawning after 2.5s · 34 stones, +14 wet each ·
each baked mark ≈78px² · score `floor(paintedArea/50)`.

## How it's built

```
sini-pwa/
├── game.js     the ink model, the bots, the two-layer renderer
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
└── icons/
```

The offscreen 1800×2400 canvas that holds permanent ink is also blitted,
scaled, into the 96×128 minimap — so the minimap is not a redraw, it is a view
of the real artefact.

## Controls

| Action | Touch / Mouse | Keyboard |
|---|---|---|
| Aim | pointer move over the stage | — |
| Dash | pointer down, or hold the on-screen ⏩ | `Space` |

## Saving

`localStorage["sini-best"]` (percent painted) and
`R2.saveJSON("sini-pwa", {highScore: round(best·100)})`. No mid-run state — a
new sheet resets `paintedTotal`.

## Known limits

- 🟡 **The score is computed and never shown.** `p.score` is maintained (`/50`,
  `+150` on a seal) but the HUD and the leaderboard both read `paintedArea`.
  Sealing is therefore invisible in the numbers.
- 🟡 The HUD's "dry" warning toggles at wet ≤ 33, while the true permanence
  threshold is 28. The code carries a comment flagging the mismatch.
- 🟡 Bots respawn after 2.5s; a human has to press *Riscrivi*. An asymmetry
  that costs a round in the standings.
- ⚪ No tests, no keyboard placement.

## What's next

- 🟠 **Show the score.** It exists; the HUD should use it.
- 🟠 **Match the camera.** A bot that dies charts its own territory, which is
  what the .io genre actually does and would make the seal a real trade.
- 🟡 Unify the dry-warning threshold with `lifeOf()`'s 28.
- 🟡 Keyboard: WASD to steer, `Space` to dash — the pointer-only path is the
  thing standing between this and a desktop playthrough.
- 🟢 An editor: draw your own sheet and paint over it.
- 🟢 Seasonal papers: a summer sheet that dries everything faster.
- ⚪ Sound design is untouched — the wet/dry model is *audible* information that
  is currently silent.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../../LICENSE).
