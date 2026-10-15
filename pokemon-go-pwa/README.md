# Pokéball GO

> A low-poly Pokémon GO experience, bilingual (EN/IT). Swipe to throw, use
> berries, collect them all — 31 procedurally drawn creatures across 8 biomes,
> a full 40-level trainer ladder, and a 1-in-4096 shiny.

No build step, no dependencies, no image assets. Every creature is a triangle
fan built from `drawPolyEllipse` primitives at runtime.

**Play it:** <https://lucagandolfi77.github.io/random2/pokemon-go-pwa/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/pokemon-go-pwa/
```

---

## The one rule

**One swipe is one throw, and the throw's quality is the multiplier.**

The catch roll is `min(0.95, baseRate × ballMult × berryMult × throwMult)`,
where `baseRate = max(0.03, 0.55 − difficulty·0.05)`. `throwMult` comes from how
close the ball's flight ends to the target: **nice** (< 100px) or **great**
(< 60px). So the skill of the game is in the wrist, not the inventory — a
Master Ball on a bad throw is worth less than a Poké Ball on a great one.

## The systems

| | Rule, as implemented |
|---|---|
| **Throw physics** | `power = min(speed·0.12, 18)`, launched with `vy −= 4` (a lob), gravity `+0.6`/frame. Swipes under 20px are discarded |
| **Balls** | Poké / Great / Ultra / Master — multipliers 1.0 / 1.5 / 2.0 / 255 |
| **Berries** | Razz ×1.5, Nanab ×1.1 (flat — the "steady" effect is a number, not behaviour), Pinap ×2.5, Golden: none |
| **Rewards** | XP 100/120/150/200 by quality, ×2 if shiny, +50 on catch. Candy +3 (+6 with Pinap), stardust `100 + difficulty·20` |
| **Shiny** | `Math.random() < 1/4096`, drawn with a gold shadowBlur and sparkle |
| **Biomes** | 8 pools, picked as pills, weighted spawn by `p.weight` |
| **Achievements** | 6, computed on the fly in `renderTrainer` |
| **Ladder** | 30 XP thresholds (0…1,000,000), `getLevel` capped at 40 |

## The numbers

31 Pokédex entries · 18 types · 7 low-poly archetypes · 4 balls · 4 berries ·
8 biomes · 40 stars in the starfield · starting stock 30/10/5/0 balls,
10/5/5/0 berries, 1000 stardust.

## How it's built

```
pokemon-go-pwa/
├── src/main.js       state, logic, DOM
├── src/renderer.js   ARCHETYPES → triangle fans, canvas draw
├── src/config.js     31 dex entries, biomes, thresholds
├── src/storage.js    three save keys
├── index.html
├── manifest.json
├── service-worker.js
└── icons/
```

Archetypes are parametric families rather than 31 bespoke meshes: a creature
points to a family with its numbers, so the dex is data. Pokédex sprites are
re-drawn into 80×80 canvases inside each card on every `renderPokedex()`.

## Controls

| Action | |
|---|---|
| Throw | swipe up on the stage (min 20px) |
| Change encounter | biome pills, or *New Encounter* |
| Equip | Items tab |
| Trainer / Pokédex / Achievements | tabs |

## Saving

Three keys: `pokemon-state-v2` (language, caught[], seen[], thrown counts, xp,
level, lastPlayed, currentBiome), `pokemon-inventory-v2` (balls, berries,
candy map, stardust) and `pokemon-settings`. `resetGame()` clears the first two.

## Known limits

- 🟠 **"Excellent" throws are unreachable.** `resolveCatch` only ever produces
  great / nice / normal. The "Expert Thrower" achievement and the ×2.0
  multiplier are dead code.
- 🟠 **Evolution is display-only.** `candyToEvolve` / `evolvesTo` render as
  "⚡ Evolves (n/cost)" but no evolve action exists — and none of the 30
  `evolvesTo` ids point at a real dex entry.
- 🟡 Nanab's described effect ("reduce movement") is a flat ×1.1 and nothing
  else.
- 🟡 `settings.haptics` is toggleable but `navigator.vibrate` is never called;
  R2's `buzz` is unused.
- 🟡 No `R2.stats.run`, so catches and throws do not reach `stats-pwa`.
- ⚪ `../shared/arcade.js` is loaded and pre-cached by the service worker, but
  no module imports it.

## What's next

- 🟠 **Wire up evolution.** It is the most-requested feature of the genre and
  the data model is already there — it needs an action, an animation, and the
  30 `evolvesTo` ids pointing at real entries.
- 🟠 **Implement Excellent.** Add the band to `resolveCatch` (it is a
  threshold, not a mechanic) and make the achievement reachable.
- 🟡 **Make Nanab do something.** "Steadies the target" should reduce its
  movement, which is a state field and a decay.
- 🟡 Report runs to the dashboard: catches per session, throws per catch, shiny
  encounters.
- 🟢 A "nearby" radar so biomes feel like locations rather than tabs.
- 🟢 Raid / trade would both want a relay — which the repo's
  `BroadcastChannel` precedent in `static-pwa` could seed.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../../LICENSE).

Pokémon is © Nintendo/Creatures Inc./GAME FREAK inc. This is a fan tribute with
no commercial assets; every creature is drawn from typed primitives.
