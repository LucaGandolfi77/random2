# Pokéball GO v2 — Throw 2.0

> A low-poly creature collector where the throw is the game. **Hold to charge,
> drag to aim, circle to curve, release when the ring is small.** 1,025
> species, 10 biomes, 40 trainer levels, working evolutions, eggs, research
> and a 1-in-4096 shiny. Bilingual EN/IT. Installable, offline, zero build.

**Play it:** <https://lucagandolfi77.github.io/random2/pokemon-go-pwa-v2/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/pokemon-go-pwa-v2/
```

---

## The one rule

**The throw is a skill, not a dice roll.** Power, timing and spin all feed the
same catch roll:

```
rate = clamp(base × ball × berry × throw × curve, 0.03, 0.95)
base = max(0.03, 0.55 − difficulty × 0.05)
```

- **Power** comes from hold time plus drag distance.
- **Timing** is the shrinking ring. Hit when it is small.
- **Curve** is a circular drag while charging. It is harder to aim, but it
  multiplies the catch rate.
- **Excellent** is reachable: centre the throw and release on a small ring.

Quality is scored from the **closest approach of the flight path** to the
target, not from the frame where the ball happens to touch the hitbox. This
keeps the result identical at 30, 60 or 120 fps.

| Quality | Condition | Multiplier |
|---|---|---|
| Excellent | score ≥ 0.82 and centre ≤ 0.30 | ×2.0 |
| Great | score ≥ 0.62 | ×1.5 |
| Nice | score ≥ 0.38 | ×1.15 |
| Normal | otherwise | ×1.0 |
| Curveball | spin ≥ 0.35 | ×1.7 extra |

A Master Ball is guaranteed, with a confirmation before use.

## Controls

| Action | Touch / mouse | Keyboard |
|---|---|---|
| Aim | drag from the ball | arrow keys |
| Charge | hold | hold `Space` |
| Curve | circle while holding | — |
| Throw | release | release `Space` |
| Cancel | tap without dragging | `Esc` |
| Change encounter | biome pills / `⋯` menu | — |
| Change ball or berry | loadout chips at the bottom-left of the stage | — |
| Open Shop/Collection/Research/Settings | `More` in the bottom nav | — |

Eye/aim assist (enabled by default) slows the ring and enlarges the hitbox.
Turn it off in Settings.

## Mobile layout

- **Portrait**: compact top bar, biome and nearby strips, a flexible stage that
  fills the remaining height, and a five-item bottom navigation
  (`Catch`, `Dex`, `Bag`, `Trainer`, `More`).
- **Landscape**: the catch screen becomes a two-column layout. The stage is on
  the left; biome pills, nearby encounters and the side legend are on the right.
- **More sheet**: Shop, Collection, Research, Settings, How to throw and the
  install prompt live behind `More`; the tab bar stays at five items on every
  phone width.
- **Loadout**: tap the ball or berry chip on the stage to change items without
  leaving Catch. Master Ball still asks for confirmation; zero-count items are
  disabled.
- **Safe areas and browser chrome**: the shell uses `svh`/`dvh` plus a
  `visualViewport` fallback, `env(safe-area-inset-*)`, and a `ResizeObserver`
  on the stage, so the URL bar, notch and home indicator never hide the ball,
  the nav or the stage.
- **Long lists**: Pokédex and Collection render 48/36 cards at a time with a
  `Show more` button; hidden panels are not re-rendered after every catch.

## What is new vs v1

- **Throw 2.0**: power, ring timing, curveball, ballistic preview, hitbox,
  three shakes, critical capture, haptics and a real tutorial.
- **Per-instance collection**: every catch has a `uid`; detail, transfer and
  evolution act on the exact specimen you tapped.
- **Collection filters** that work: Recent, All, Shiny, CP, IV.
- **Real egg pools**: legendaries and mythicals never hatch; 2/5/10 km tiers.
- **Gen 2–9 names** are readable (`Chikorita`, `Mr. Mime`, `Ho-Oh`) and every
  generated species has a type description and a fitting low-poly archetype.
- **40 levels** instead of 30.
- **PWA shell**: 192/512/maskable icons, manifest shortcuts, OG/JSON-LD,
  service worker registration, cache versioning, safe-area layout.
- **Performance**: no RAF on hidden tabs, no AudioContext per sound, haptics
  and `R2.stats` wired in; hidden panels are not re-rendered on every catch.
- **Mobile shell**: five-item bottom nav, More sheet, landscape two-column
  catch screen, safe-area layout, loadout picker, install prompt.
- **Tests**: pure logic modules with `node:test`.

## Systems

| | Rule |
|---|---|
| **Balls** | Poké / Great / Ultra / Master — ×1.0 / ×1.5 / ×2.0 / guaranteed |
| **Berries** | Razz ×1.5, Nanab ×1.1 + slows movement, Pinap ×2 candy, Golden Razz ×2.5 |
| **Rewards** | XP by quality + curve bonus; candy +3 (+6 with Pinap); stardust `100 + difficulty × 20` |
| **Shiny** | `Math.random() < 1/4096`, gold glow and sparkle |
| **Biomes** | 10 pools with weighted spawns; nearby radar keeps shiny flags |
| **Eggs** | 2/5/10 km tiers, legendary-free, rarity-weighted; 9 slots |
| **Buddy** | affinity on catches, candy milestones at 25/50/75/100 |
| **Research** | 3 daily tasks, including curveball tasks; rewards in XP/items |
| **Shop** | balls and berries for stardust |
| **Trainer** | XP ladder 1–40, medals, achievements, stats |

## Numbers

**1,025 Pokédex entries** (Gen 1–9) · 18 types · 7 low-poly archetypes ·
4 balls · 4 berries · 10 biomes · 40 levels · shiny 1/4096.

## Architecture

```
pokemon-go-pwa-v2/
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
├── src/
│   ├── main.js            state, DOM, loop, input, UI
│   ├── config.js          dex, biomes, levels, throw defaults
│   ├── dex-data.js        1,025 species
│   ├── storage.js         v2 keys + uid migration
│   ├── renderer.js        low-poly art + target ring + trajectory
│   ├── sprites.js         PokeAPI artwork + lazy loader
│   └── logic/
│       ├── rng.js         mulberry32 / seeds
│       ├── throw.js       power, aim, ring, quality, catch rate, flight
│       ├── progress.js    eggs, levels, XP bands
│       └── dex.js         readable names, archetypes, descriptions
├── tests/
│   ├── throw.test.mjs
│   ├── progress.test.mjs
│   └── dex.test.mjs
└── package.json           "type": "module", node:test script
```

`src/logic/*` is pure: no DOM, no direct `Math.random()` in the throw math.
That is what makes the tests deterministic and the balance tunable.

## Tests

```bash
cd pokemon-go-pwa-v2
npm test
```

22 checks cover aim clamping, power, ring timing, Excellent reachability,
catch bounds, Master Ball, curve multiplier, trajectory, segment collision,
closest approach, egg pools, level ladder, slug names and type descriptions.

## Saving

Three keys: `pokemon-go-v2-state`, `pokemon-go-v2-inventory`,
`pokemon-go-v2-settings`. They are separate from v1, so the two games can live
on the same origin without overwriting each other. Old v2-shaped saves with no
`uid` are migrated on load.

## Known limits

- Official artwork is hot-linked from `PokeAPI/sprites`; the procedural
  low-poly drawing remains the offline fallback. The game is a fan tribute and
  is not commercial.
- Transfers and the Master Ball use a native `confirm()` for safety; the rest
  of the game uses in-app feedback.
- Raids, trades, gyms and real-world location are intentionally out of scope.
- The sprite cache grows with the number of species viewed; clearing site data
  resets it.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence.

Pokémon and Pokémon character names are © Nintendo / Creatures Inc. / GAME
FREAK inc. This is a fan-made, non-commercial tribute.
