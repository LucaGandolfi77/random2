# CARDUME

A shoal `.io` game in open water.

> **Your body is a crowd — and the crowd is spendable.**

You are not one fish. You are a school of them: the head you steer, the
formation behind it, and every single member is something you can afford to
lose. Eat plankton, absorb smaller schools, grow — and remember that a big
school is visible from a very long way off, and that the fish you throw away
as bait are the same fish you were counting on.

## The one rule everything hangs off

Everything about CARDUME follows from **your vision radius is your school
size**:

```
sight = 140 + 26·√members   (clamped 140 → 560 px)
```

A small school barely sees the reef around it. A big school reads the whole
zone — food, rivals, every predator — from far away. And every rival sees *you*
at exactly the same range. Greed makes you the brightest thing in the water.

The complementary beat: **you see a school as a shimmer long before you can
count its fish.** Counting takes distance, and by then it has already decided
whether you are prey.

## The signature mechanic: the bait

Second finger (or the `ESCA` pad / `Space`): launch your **three nearest fish
as bait**.

- Bait swims away from you on a wild, erratic course and **every predator
  within ~500 px prioritises bait over you** — barracuda commit to it, the
  shadow ignores you while bait is alive
- When a bait fish dies you **reclaim a fragment of its mass** — spending
  crowd is an investment, not just a loss
- Bait is on a cooldown, and you must still have 5+ members to throw any

This is the tactic the whole game is built around: the correct answer to a
barracuda is often *throw it three fish and run*. Everything else in the
design — predator targeting, mass economy, the school's visibility — is tuned
so that trade is real.

## Playing

| Input | Action |
|---|---|
| Drag anywhere | Steer — the school head always moves |
| Second finger / `ESCA` pad / hold mouse / `Space` / `Shift` | Launch bait |
| `Arrows` / `WASD` | Steer (desktop) |

## The shoal

Members follow **formation slots**: each fish holds a deterministic slot in a
lattice behind the head (a spring toward its slot, plus separation). Slot
indices recompute on every membership change, so a school that has lost half
its fish re-forms in a clean wedge instead of collapsing. Rendering cost is
`O(n)` with `n ≤ 60`; no flocking complexity, no per-frame allocation
(fixed pools, LUMEN-style).

- **Members** up: absorb a smaller school (+1 member each of theirs, minus a
  conversion loss), or grow mass on plankton and krill
- **Members** down: predator bites, jellyfish stings, the shark, and any
  school that eats yours
- **Speed** falls as the school grows; the school turns slower too — being
  big is a *defensive* virtue and a *mobility* tax

## The ocean

| Thing | Behaviour |
|---|---|
| Plankton | +1 mass, everywhere, always |
| Krill cloud | +14 mass, drifts slowly, worth chasing |
| Rival school | Absorb if smaller than you; cut its head and its members scatter |
| Barracuda | Fast, straight, dumb, **lureable**. Bait pulls it off you |
| Jellyfish | Drifts. Contact splits one member off your school |
| Seabird | Circles the surface, dives at silhouettes near the top edge — the surface is food and it is a ceiling |
| L'ombra | A whale-sized shadow in the deep zone that ignores everything but the largest school in the water. When it swims, everyone moves |

The classic `.io` cut-off rule applies to schools as bodies: put your head
through a rival's formation and that head dies. Eating a school gives you a
fraction of its members; its death scatters meat worth less than its live
mass, so camping a corpse never pays.

## The three zones

The map is three bands, tinted per band, and the tint reads before you can
read anything else — the way depth is legible through water before you can
name a fish.

| Band | Water | Food | Who lives there |
|---|---|---|---|
| **Reef** | bright turquoise, shallow | densest plankton | barracuda, seabirds |
| **Open water** | open blue | krill, rival schools | everyone |
| **The deep** | near-black, cold | sparse | jellyfish, l'ombra |

The deep is where the big mass is, and the deep is where the thing that eats
big mass lives. Same lever as LUMEN's glow radius, one zone over.

## The other schools

Eight schools with a persistent roster built from a frozen seed
(`Reef_Run_77`, `Marea404`, `Spiaggia_prime`…), each a blend of five
personalities — **expansion, greed, timidity, roaming, skill** — so they
genuinely play differently: greedy schools over-commit to a krill cloud they
can't defend, timid ones bolt at half your size, skilled ones cut your
formation instead of chasing your head.

**Grudges persist across sessions**: the school that absorbed you starts its
next run already hunting you, and the one you absorbed comes back looking.
Grudges fade slowly (×0.985 per run).

## Score

`cardume-best` = the largest school you ever held, plus peak rank and
schools absorbed. Death is a school under two members: the water keeps
running, your rivals keep feeding, and the same eight names are there when
you come back.

## Files

Plain scripts on `window.CARDUME`, no build step, no dependencies, no binary
assets of any kind — every fish, gradient and caustic is drawn procedurally,
every sound is synthesised. Offline PWA shell via `shared/arcade.js`.

- `index.html` — canvas, HUD, menu, death, install prompt
- `styles.css` — safe-areas, reduced-motion respected
- `src/config.js` — tuning, palette, seeded RNG, wander
- `src/zones.js` — the three bands, tints, spawn weights
- `src/storage.js` — roster, stats, grudges, settings, hub publishing
- `src/world.js` — schools, slots, food, predators, the mass economy
- `src/render.js` — camera, caustics, band tint, schools, bait
- `src/player.js` — pointer + keyboard + bait pad
- `src/bots.js` — perception, mode choice, steering, grudge bookkeeping
- `src/audio.js` — synthesised only: sonar blips, strikes, splash
- `src/ui.js` — HUD, leaderboard, kill feed, screens
- `src/main.js` — loop, states (menu → playing → spectate → dead)
- `manifest.json`, `service-worker.js`, `icons/` (SVG)
- `tests/sim.test.js` — headless suite: `node cardume-pwa/tests/sim.test.js`

## Testing plan

The headless suite runs the real world and bot modules with no browser,
deterministic unit checks first and a behavioural suite aggregated over five
fixed seeds (single-seed thresholds were hopelessly flaky on LUMEN and
FORMICA both):

1. **Roster** — 8 schools, unique names, in-range personalities, stable
   across reads, different seed ⇒ different roster
2. **Slots** — formation wedge rebuilds on membership change; `O(n)` bound
   holds at 60 members
3. **Bait** — launching bait redirects predators in range; bait death returns
   mass; cooldown enforced; can't launch below 5 members
4. **Economy** — plankton/krill/school absorption math; meat worth less than
   live mass; school cap
5. **Visibility** — sight radius formula, clamped; rival detection matches it
6. **Predators** — barracuda lures onto bait, loses you; jellyfish splits a
   member; seabird only dives near the surface; l'ombra only targets the
   leader
7. **Grudges** — absorption and death write grudges; a grudging school
   actually hunts the player; grudges decay
8. **Ecology** (aggregated) — population holds, schools keep feeding, named
   schools kill you, you can absorb and lead
9. **Performance** — sim step comfortably inside a 60 fps frame

## Status

Design spec. Implementation follows FORMICA's architecture: same module
split, same PWA shell, same headless test standard, same "zero assets, zero
network, fully offline" constraints.
