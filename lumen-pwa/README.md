# LUMEN

A bioluminescent `.io` game for the pitch-black abyss.

> **Your light is your eyes — grow, and everyone sees you too.**

You are a ribbon eel swimming in total darkness. Eat plankton and krill, cut
yourself off other creatures, and try to reach the top of the board without
something in the dark swallowing you whole.

## The one rule everything hangs off

Your glow radius **is** your vision radius, and it scales with your mass:

```
glow = 110 + 18·√mass   (clamped 110 → 420 px)
```

A large LUMEN can see wrecks, food fields and rivals across the map. A large
LUMEN is also visible from a very long way off, and the AI values big prey
higher. Greed literally makes you blind in the best feeding grounds.

The complementary beat: **you see other creatures' glow halos long before you
can make out their bodies.** A light drifting in the dark is a warning. Whether
it is a krill swarm or something with teeth is a separate question.

## Playing

| Input | Action |
|---|---|
| Drag anywhere | Swim — the head never stops |
| Boost pad / second finger / hold mouse / `Space` | Burn mass to outrun a threat |
| `Arrows` / `WASD` | Steer (desktop) |

Boost burns mass at 9/s and ejects glowing motes behind you that anyone can
eat, so escaping is always a trade.

## The abyss

| Creature / hazard | Behaviour |
|---|---|
| Plankton | +1 mass, everywhere |
| Krill cloud | +14 mass, drifts slowly |
| Wreck | Lethal. 36 of them, faintly lit by barnacles |
| Jellyfish | Contact stuns you for 1.6s — no control |
| Anglerfish | 900 mass, 400px body, 330px/s lunge. Lethal everywhere |

Anglerfish telegraph: the lure flares and the body goes still for half a second
before it lunges. When it finally lies stunned with the lure out, **spear it
with a boost** — that is the only way to kill one.

## Depth zones

The map is four horizontal bands, and the *darkness itself* is tinted per band,
so depth is legible through the fog before you can read anything else.

| Band | Water | Plankton | Jellyfish | Anglers |
|---|---|---|---|---|
| **Sunlit** | bright teal | richest | sparse | rare |
| **Twilight** | blue | good | even | common |
| **Midnight** | indigo | thin | thick | frequent |
| **Trenches** | near-black violet | poorest | thickest | everywhere |

The trade is deliberate: the shallows are **bright but empty**, the deep is
**dark but rich** and packed with things that sting. Bands crossfade over 260px
rather than snapping, and the same band table drives generation, the darkness
tint, the minimap and the HUD depth meter, so they cannot drift apart.

Everything lives in `src/zones.js` — per-band density weights are editable
without touching any system code.

## The rivals

There is no server. `localStorage` is the entire backend, and the trick that
makes it feel like there is one is a **persistent roster**: 40 named rivals
(`Vortex_77`, `Abyssalv2`, `Nyx.exe`, `biolum404`…) generated once from a seed
and frozen forever. The same names hunt you every session, on every device.

Each carries a personality — `aggression`, `greed`, `caution`, `skill`,
`boostiness` — blended across six behaviours:

- **forage** — best food by value-per-distance
- **intercept** — aims where a target *will* be
- **cut-off** — leads the target by arrival time, which sets up the kill. Skilled bots find it; unskilled ones chase the head and crash
- **scavenge** — detours to fresh corpses (why you can watch your own death get picked apart)
- **escape** — boosts perpendicular from anything much bigger
- **wander** — smooth noise, so nobody moves like a robot

**Grudges persist.** Kill a rival and it hunts you back. Let one kill you and
it respawns already looking for you, banner and all. Grudges fade over days.

## Tuning

All numbers live in `src/config.js`. Current shape:

| | |
|---|---|
| Arena | 4500 × 4500, soft-walled |
| Speed / boost | 190 → 330 px/s |
| Turn rate | 4.6 rad/s at mass 0 → 2.4 at 800 (big = heavier = wider turns) |
| Rival lifespan | ~19s mean, respawn 1.2–3.5s |
| Corpse value | 60% of mass, despawns after 12s, edible but harmless |
| Sim cost | ~0.8 ms/frame for 41 creatures |

Corpses pay less than live prey so camping never beats hunting.

## Layout

Plain static files, no build step, no dependencies.

```
index.html          shell + HUD markup
styles.css          deep-sea glass UI
manifest.json       PWA manifest
service-worker.js   cache-first, fully offline
icons/              SVG + generated PNGs (incl. maskable)
src/
  config.js         every tunable number, palette, math + seeded RNG
  zones.js          depth bands: density weights, darkness tint, band lookup
  storage.js        localStorage backend: roster, stats, grudges, settings
  world.js          generation, spine-based movement, collision, mass economy
  render.js         camera, light-mask compositor, fog of war, bloom, minimap
  player.js         pointer/touch/keyboard steering and boost
  bots.js           roster, personalities, the six-behaviour steering blend
  audio.js          fully synthesised WebAudio — no audio assets to cache
  ui.js             HUD, leaderboard, kill feed, minimap, screens
  main.js           game loop and flow
```

Bodies are stored as a **re-spaced spine** at fixed arc length rather than
per-frame segments, so they look identical at any framerate and cost the same
on a phone as on a desktop.

Rendering draws the world flat into an offscreen buffer, then punches a light
mask through it with `destination-out` radial gradients. Anything your glow
does not reach stays black. The shader and the core mechanic are the same idea.

## Testing

A headless harness drives the simulation without a browser:

```bash
node lumen-pwa/tests/sim.test.js
```

Deterministic unit checks (roster stability, spawn clearance, grudge
bookkeeping, the angler weak point) plus a behavioural suite aggregated over
five fixed seeds — rival ecology, and a scripted "competent player" measured
on feeding, hunting, survival time and how often it dies to a *named* rival
rather than to scenery.

## Notes

- Plain `<script>` tags and a global `window.LUMEN`, so it runs from any static
  host and survives being opened from a subpath.
- Audio is synthesised at runtime, so there is nothing to cache and nothing to
  fail offline.
- Honours `prefers-reduced-motion`.
