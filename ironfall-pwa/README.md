# IRONFALL — *Three Lanes to the Reliquary*

**A free 3v3 lane MOBA in the Warhammer 40k universe, running entirely in a mobile browser.** You command one of eight champions against three enemy warbands across three lanes on a shattered cathedral-world. Last-hit the wave, break the Bastion Towers, take the Reliquary, kill the Core.

No build step. No bundler. No dependencies. No binary art — every sprite, tile and sound effect is generated at runtime from about four thousand lines of JavaScript.

**Play it:** <https://lucagandolfi77.github.io/random2/ironfall-pwa/>

---

## Install

| | |
|---|---|
| **Android / Chrome / Edge** | Open the URL → menu → **Install**, or the browser's own install chip |
| **iOS / Safari** | Share → **Add to Home Screen** |
| **Desktop** | Any modern browser. Keyboard works too. |
| **Offline** | From the first load onward. The service worker is registered and actually used. |

To run it locally:

```bash
cd ironfall-pwa
python3 -m http.server 8000
# open http://localhost:8000/
```

`file://` will not work — service workers and ES-module-era caching require an origin.

---

## The loop

**Last-hit.** You only get gold for the minion *you* kill. Assisting pays a third of it; experience is shared with everyone standing near the corpse. That asymmetry is the entire reason to fight over a wave rather than race for it.

**Bastion Towers have three plates.** Each plate is 62 armour. All three together are 186 — a tower at full plates is effectively twice as armoured as a stripped one. Take them off and the dive window opens. Plates regrow, and they regrow faster before level 11 than after, so an early plate loss is a real wound and a late one is a formality.

**Escalation.** Every 11 seconds a tower under pressure hits harder, up to three times over. A dive that takes 30 seconds costs four times what one that takes 8 does.

**Both Cores exposed means +25% damage taken.** That is the win clock, and it is deliberately visible.

**The Reliquary** wakes in the river once two Towers have fallen, anywhere on the map. It buffs *both* teams by 8% while anyone holds it — symmetric on purpose, because a team-favouring objective makes the losing side's only correct play "do not contest".

---

## The systems

### Champions — eight across four warbands

| Champion | Warband | Role | Passive |
|---|---|---|---|
| **VANGUARD** | Astartes | tank | **AQUILA** — +30 armour below 40% health |
| **VOTARY** | Astartes | mage | **AQUILA** |
| **HEXER** | Warpbound | mage | **MALEFICIUM** — 14% of overkill damage heals you |
| **BLOODLETTER** | Warpbound | bruiser | **MALEFICIUM** |
| **ZOANTHROP** | Tyranid | marksman | **SYNAPSE** — heal 16% of your damage on champion kills |
| **HIVE TYRANT** | Tyranid | tank | **SYNAPSE** |
| **SERGEANT** | Guard & Grots | marksman | **REQUISITION** — +18% gold from last-hits |
| **GROTSHOUL** | Guard & Grots | bruiser | **REQUISITION** |

Every ability is **data plus one of thirteen archetypes** — `cone`, `dash`, `shot`, `chain`, `beam`, `blast`, `slam`, `blink`, `shield`, `buff`, `field`, `summon`. That is the only reason eight champions is a fortnight of work rather than a quarter, and it is also why the roster suite can walk all 32 abilities and assert the numbers are in ranges the simulation can survive.

The hotbar is **Q W E R** in that order for every champion, always.

| Ranks | Levels |
|---|---|
| Q, W | 1, 5, 9, 13 |
| E | 2, 6, 10, 14 |
| R | 6, 11, 15, 18 |

### Runes — 27 loadouts from 9 runes

One pick per row, applied at deployment.

| Row | Options |
|---|---|
| **Keystone** | `GRASPPLATE` DoT after 4 attacks · `LETHAL TEMPO` +40% AS after 3 · `PREDATOR` +32% MS and +350 vision below 40% HP |
| **Tempo** | `TRIUMPH` heal on a champion kill · `DILIGENT BLADE` +2 gold per last-hit · `PRESSURE` +14% MS and +18% AS in the enemy half |
| **Utility** | `BULWARK` flat survivability · `SECOND WIND` cooldowns and regen · `BOOTLEG` cheaper Scryer-relays and gold per wave |

Keystones change *how* you deal damage rather than how much. Three of the nine carry behaviour; the other six are deliberate stat blocks, because row two should not be a trap for someone who does not want to think.

### Doctrine — the mastery track

Light on purpose. A champion unlocks a permanent bonus at **3, 6 and 10 wins with that champion**: `+60 HP +3 AD`, then `+130 HP +6 AD +12 MS`, then `+220 HP +10 AD +24 MS`.

The tier is **recomputed from your win record every time it is read**, never stored as its own number. A hand-edited save cannot grant a Doctrine it has not earned, and the roster suite checks that.

### The Forge — twelve items

No build paths and no components tree. A shop with forty items is a shop nobody reads on a phone, and every item here has to survive being bought at minute one *and* minute twenty.

| | |
|---|---|
| **Boots** | `SERVO BOOTS` +35 MS · `WAR-GOG BOOTS` +45 MS +120 HP |
| **Physical** | `BOLTER CHARGE` · `CHAINSWORD` · `POWER PLATE` · `RELICBLADE` |
| **Magical** | `WARP TALISMAN` · `PSYKERNER` · `CENSER OF ASHES` (kills refund all cooldowns) |
| **Utility** | `VOID LENS` (free Scryer-relays) · `RELIQUARY SEAL` (doubled Reliquary buff) · `CHAPTER BANNER` |

The shop opens **only at your own Bastion and only out of combat**, and it tells you which of the two is stopping you rather than ignoring the tap.

---

## How it looks

Flat-shaded prisms on an axonometric grid. No mesh, no matrix, no WebGL.

```
screen.x = (world.x − world.y) × 0.82
screen.y = (world.x + world.y) × 0.46 − world.z × 0.78
```

A body is a stack of faceted solids — a pentagon at the medium tier, a heptagon at high, a box on the low tier where the frame budget is all that matters. A tower is a tapered obelisk that **visibly loses its top third as it loses its plates** — damage state you can read without a health bar. Everything sorts on a single dot-product key against the view vector, which is exactly the quantity that means "further from the camera" in a linear projection, so the sort cannot disagree with what is being drawn.

The payoff of staying linear: a constant world-space face normal maps to a constant screen gradient, so flat shading is **one precomputed number per face**, not a lighting calculation. That is also what makes faceting affordable — a shape's face list and its light table are built once at startup and never touched again, so a seven-sided body costs the same per frame as a box and the only difference is which faces survive the back-face cull.

The other half of that arithmetic: **half of any convex outline is the far side**. A box and a pentagon both fill exactly three faces. A pentagon that looks nothing like a box is therefore free, and it is the whole reason the low-poly work cost about 13% on the medium tier rather than 60%.

### Warp haze, instead of fog of war

Unexplored ground is **dim but visible**. Enemies outside your vision draw as **silhouettes** at 22% alpha with no team tint and no health bar. You know something is over there; you do not know what it is, so you cannot aim a skillshot at it.

League's hard fog on a 390px phone turns every gank into a coin flip. The information a player gets from "something is happening over there and it has just stopped moving" is worth a real amount of skill, and the minimap carries the scouting layer that fog would otherwise.

---

## Architecture

```
ironfall-pwa/
├── index.html              SEO, JSON-LD VideoGame, all UI markup
├── styles.css              touch-action: none, safe-area insets
├── manifest.json
├── service-worker.js       CACHE_NAME "ironfall-pwa-v1", per-asset .catch()
├── og-cover.png            1200×630
├── icons/                  SVG sources + rasterised PNGs
├── scripts/gen-icons.mjs   dev only; never runs in CI
├── src/                    17 files, ~4,000 lines, one namespace: window.IF
│   ├── config.js           every tunable number in the game
│   ├── rng.js              seeded mulberry32
│   ├── mapdata.js          three lanes, river, structures, camps
│   ├── storage.js          versioned save, validation, Doctrine
│   ├── champions.js        the roster — data only, no behaviour
│   ├── runes.js  items.js
│   ├── combat.js           damage, mitigation, all 16 passives
│   ├── abilities.js        the thirteen archetypes + effects
│   ├── world.js            entities, waves, vision, win conditions
│   ├── ai.js               bot brains, draft, last-hitting
│   ├── render.js           isometric renderer, haze, particles
│   ├── minimap.js          its own canvas, 48×48 reveal grid
│   ├── input.js            thumb stick, aim drag, keyboard
│   ├── audio.js            runtime WebAudio, zero files
│   ├── ui.js               HUD, screens, shop, kill feed
│   └── main.js             boot, fixed-step loop, match lifecycle
└── tests/                  five suites, plain node, no framework
```

### Rules that hold everywhere

- **Classic scripts, one namespace.** `(function (S) { "use strict"; … })(window.IF = window.IF || {})`. No modules, no bundler, no build.
- **`var`, four spaces, double quotes, semicolons.**
- **Every non-obvious decision gets a comment saying why**, usually citing the bug that motivated it. Several of those comments are the most useful documentation in the file.
- **The simulation never reads a clock.** `world.time` is advanced by the caller in exact steps, which is what makes the whole game reproducible from a seed and testable headlessly.
- **The renderer never affects the simulation.** Transient particles and floaters are expired in `world.step()`, not in `draw()` — a backgrounded tab stops drawing but keeps stepping, and cleanup that lives in the renderer is cleanup that stops happening.
- **Every passive lives in one switch.** Four faction passives, seven rune hooks, five item passives, all in `combat.js`. A passive is the easiest thing in a game to break by changing a stat elsewhere.

### Save data

Namespace `ironfall.v1.` — five keys: runes, doctrine, records, settings, meta. Every field validated on read; a corrupt or hand-edited save can never produce NaN stats, and it can never grant a Doctrine tier its wins do not support. `pagehide` persists, because mobile browsers kill backgrounded tabs without warning.

---

## Tests

```bash
node ironfall-pwa/tests/sim.test.js       # 95 checks — simulation, economy, storage, geometry
node ironfall-pwa/tests/roster.test.js    # 69 checks — every ability, item, rune and passive
node ironfall-pwa/tests/boot.test.js      # 69 checks — real DOM, real frame loop, end to end
node ironfall-pwa/tests/render.test.js    # 10 checks — draw-call budget and renderer hygiene
node ironfall-pwa/tests/balance.test.js   # 28 checks — Monte-Carlo over AI-vs-AI matches
```

`balance.test.js` is the one that matters. It runs a batch of headless matches over many seeds and asserts on **shape, not exact numbers** — a test asserting "average match length is 734 seconds" fails the next time anyone tunes anything; a test asserting "the median match is between eight and twenty-five minutes" tells you when the game has stopped being a game.

What it found, and what the shape assertions now guard:

| Bug | Symptom |
|---|---|
| Sticky-retreat lockout | A bot refreshed its own commit timer once per reaction interval, so one bad trade at minute two meant it stood in base for the rest of the match with zero CS. Looked like cautious play; was a deadlock. |
| Scalar ultimate costs | All eight ultimates declared a number, but the runtime indexed it as an array. `130[0]` is `undefined`, which made mana NaN on cast and left the roster's biggest ability permanently unusable. |
| Inverted last-hit margin | The predicate computed `myTime − timeToDie` and rewarded the branch taken when the bot was going to *lose* the minion. Every bot attacked every minion in range, and `csSkill` scaled a branch that decided nothing. |
| Plates never depleted | Read by the damage model, regenerated by the world, and reduced by nothing — a tower kept full plate armour through every siege of its life. |
| Dead champions never respawned | The dead branch of the unit loop `continue`d before reaching the respawn logic, and there was no path back. |
| Fountain ate movement orders | Champions spawned *inside* their own fountain, and the fountain cleared `moveTo` every step. Nobody could leave base. |
| `dmgTaken` and `aggro` declared and unread | Half the difficulty ladder was in config and read from nowhere, so all three doctrines played identically. |

`boot.test.js` builds a fake DOM out of the real `index.html`, boots the real `main.js` against it and pumps the real frame loop by hand for two simulated minutes. It asserts that **every `<button id>` in the markup has a click listener** — a check written after `btn-install` and `btn-install-later` shipped dead whenever the shared arcade library was absent, leaving a dialog with two dead buttons and no way to dismiss it.

### The balance ladder

Difficulty is real, and it is measured on the decision it is supposed to change rather than on an outcome that would be noisy at 14 samples. The same contested last-hit is offered to all three doctrines and scored on **precision** — of the swings taken, how many could actually be won:

```
Recruit     0.777
Guardsman   0.809
Necron Lord 0.831
```

Skill is modelled as **misjudgement**, not as a different threshold: a Recruit under-estimates how much damage is already inbound, so it reads a contested minion as a free one and swings anyway. That is what a bad last-hitter does, and it produces a real gradient without a second rule. Scaling a penalty instead — the two obvious alternatives — does nothing, because the score of a swing a bot expects to lose is always negative and any multiplier keeps it negative.

---

## Mobile performance

- **DPR capped at 2.** A 3× screen at full resolution is three times the fill cost for a difference nobody can see on a moving isometric scene, and it is the fastest way to a 30fps game on hardware that is otherwise capable of 60.
- **Auto-quality.** 90 sampled frames, then a tier is chosen from the average. High / Med / Low control DPR, face shading, particles and unit detail. The user is not asked.
- **A spatial grid over every unit**, rebuilt once per step into preallocated buckets. Minion acquisition and bot perception were both linear scans over the whole unit array — O(n²), sixty times a second, and invisible in a test with six units and fatal at minute six with two hundred and fifty.
- **Painter's sort, insertion.** ~120 entries, almost always within a few places of sorted because the units did not moved much since the previous frame.
- **Corpses are removed** 1.2s after death. Ninety corpses is the difference between a frame that costs 3ms and one that costs 9ms.
- **Corpses are not removed for champions** — the HUD, kill feed, scoreboard and AI all hold references into that array.

---

## Known limits

- **Bot-vs-bot balance is tuned; human-vs-bot is not.** The harness runs six bots. It knows nothing about how a person decides to hold a minion for two more seconds.
- **A 3v3 is not a 5v5.** Team fights are readable in a phone frame; a ten-man engagement is not, and this is why there are three of you.
- **No replay.** The seed is stored, so a loss *could* be reproduced; nothing does it yet.
- **Items have no build paths.** Deliberate, and the reason is above.
- **One map, one objective.**

---

## Credits

Design, code, art and audio: **Luca Gandolfi** — <https://github.com/LucaGandolfi77>

Uses [`../shared/arcade.js`](../shared/arcade.js) from the PWA Arcade for sound synthesis helpers, particles, storage, seeded RNG, playtime tracking and the run log. Not forked — the CI check enforces that.

Warhammer 40,000 is a trademark of Games Workshop. This is an unofficial, non-commercial fan project containing no Games Workshop assets, audio or artwork. Every pixel and every sample in it is generated by the code in this folder.

## Copyright & licence

Code and assets © 2026 Luca Gandolfi. Released under the repository's [LICENSE](../LICENSE).

| Asset | Source |
|---|---|
| All sprites, tiles, icons and the social card | Generated by `scripts/gen-icons.mjs` and drawn at runtime by `src/render.js` |
| All sound | Synthesised at runtime by `src/audio.js` — no audio files exist in this project |
| Fonts | System stacks only. No web fonts, so nothing is fetched and nothing breaks offline. |
