# GULPER

A Canvas 2D arcade. You are a small hungry thing with eight tentacles and a
mouth that is bigger than you are. Take people whole. Get bigger. Take
heavier things. The district notices, and the response grows with you.

Play: [▶ Play](https://lucagandolfi77.github.io/random2/gulper-pwa/) ·
[source](https://github.com/LucaGandolfi77/random2/tree/main/gulper-pwa)

## The shape of it

- **42 campaign levels** across six districts (docks, downtown, ward, arctic,
  foundry, hive) — each a small mission, each a step up in size.
- **Six titans** — one at the end of every district, fought at the mass the
  campaign has grown you into.
- **Six weapons** (lash, grasp, tendril, net, acid, shock), **adaptations**
  (genome shards buy them), a **codex** of swallowed prey, and a save that
  lives entirely on the device.
- **A software rasteriser** (no WebGL) and a **WebAudio** engine, so the
  game boots offline and runs on a phone.

## Controls

- Move — WASD / arrows, or the on-screen stick
- Attack — mouse / touch (aim follows the pointer)
- Grab / swallow — Space
- Swap weapon — Q
- Feed frenzy — F (burns stamina)

## The three shrines

Outside the campaign, three ways to feed that never touch the campaign map,
its unlock chain or its save records:

- **ENDLESS NIGHT** — one arena, no clock, no exit. The district keeps
  producing and the response keeps escalating. The run ends when you are
  hollowed out; the score is the biggest thing you became.
- **DAILY HUNT** — one campaign mission, picked by the date, so every
  player in the world eats the same street on the same day. Entered with
  the biomass the campaign had walked in with, so the hunt arrives at its
  front door.
- **THE PROCESSION** — the six titans, one after another, each entered
  with the biomass the campaign ends the previous district with. A loss ends
  the run; the best distance is kept.

## Architecture

Static files, one namespace (`window.GU`), IIFE modules under `src/`. The
shared library is `../shared/arcade.js` (rasteriser, input, audio, storage
helpers) and is never forked.

- `config.js` — tuning constants (`C`).
- `rng.js` — seeded RNG, including `S.dailySeed()` (YYYYMMDD).
- `species.js`, `weapons.js`, `biomes.js`, `levels.js` — the content.
- `body.js` — player physics, growth, damage.
- `alarm.js`, `combat.js`, `absorb.js`, `ai.js` — systems.
- `world.js` — `S.World.create(levelId, opts)` builds a world; it accepts a
  whole synthetic level via `opts.level` and an entry biomass via
  `opts.carry`, so the shrines never pollute `save.carry`.
- `modes.js` — the shrine factories (`S.Modes.feastLevel`,
  `S.Modes.dailyLevel`, `S.Modes.stageLevel`) and their tables. Pure: no
  load-time work, no writes except through `S.Storage`.
- `render.js`, `input.js`, `ui.js`, `main.js` — draw, input, DOM, state
  machine. `main.js` and `ui.js` are browser-only (not loaded by the test
  harness).

## Persistence

Everything lives in `localStorage` (`gulper.save.v1`), migrated forward
rather than discarded. The save holds campaign progress, shards, the genome,
the codex, settings, and the shrine medals (`feast`, `daily`, `rush`).

## Tests

Plain `node tests/*.test.js`, no runner, no dependencies. The house rule:
every phase ships only with all suites green — a feature without a working
test is not shipped.

- `boot.test.js` — boot, stubs, rasteriser sanity.
- `content.test.js` — data shape, counts, level integrity.
- `render.test.js` — render budget.
- `sim.test.js` — the campaign, played headlessly by a deliberately simple
  bot that walks into gunfire and never dodges. All 42 must finish.
- `modes.test.js` — Endless Night survives three minutes, the daily hunt is
  winnable at its handed-down mass, all six procession stages fall in a row.

## Roadmap

### Phase 1 — Away from the campaign ✅ (shipped)

Endless Night, Daily Hunt, The Procession, plus this README. The shrines
each carry their own biomass and their own records, so they never disturb,
and are never disturbed by, the campaign's spine.

### Phase 2 — Rival predators and hazard patches ✅ (shipped)

A new rival predator, the Stalker (hides, then thins the crowd you need),
and a new biome hazard, the acid spill (a standing pool that burns on
contact). Docks, hive and foundry carry them; the campaign still clears.

### Phase 3 — Season Two: Sunken Cathedral ✅ (shipped)

A seventh biome, the Sunken Cathedral, with seven new levels and a new
titan, the Choirmaster. A seventh weapon, the Barbed Drag, that yanks
prey in instead of pushing them away. The campaign now runs to 49 levels.

### Phase 4 — Meta ✅ (shipped)

Medals for perfect clears, a Bill of Fare that lists every prey, rival and
titan, a stats screen, and a palette override in settings.

### Phase 5 — Layers ✅ (shipped)

Gamepad polling, a haptics pulse helper, accessibility settings
(reduced motion, high contrast, text size) and the CSS to honour them.

### Phase 6 — Hardening (planned)

A bot that clears Endless Night, the cathedral sim chain, a render budget
check, and CI smoke coverage for every shrine.
