# LAST CALL

*A neon art-deco drink deck battler. Pour. Push. Prevail.* 🍸

**Play:** <https://lucagandolfi77.github.io/random2/last-call-pwa/>
**Source:** <https://github.com/LucaGandolfi77/random2/tree/main/last-call-pwa>

LAST CALL is a real-time lane card battle for one player against a bartender
AI. Build an eight-card deck from cocktails, wine, beer and spirits, defend
two **Taps** and your **Cellar**, and take the rival bar's towers before the
clock runs out. Eight venues, 24 drinks, three saved decks, five upgrade
levels. Fully offline, no accounts, no trackers, no build step.

---

## The match

Each side has two lane towers (**Taps**) and one **Cellar**. Destroy a Tap to
earn a crown and open that lane. Destroy the Cellar to end the match
immediately.

- **3:00 regulation.** The player with more crowns wins. If the crowns are
  level, the match goes to **1:00 overtime**.
- **Overtime is sudden death.** The first tower to fall decides the match. If
  nobody breaks through, the healthier Cellar wins the tiebreak.
- **Buzz** is the resource. It starts at 5, caps at 10 and refills over time.
  The last minute is **Happy Hour**: Buzz fills twice as fast.
- **Stars** come from your own bar: finish with all three towers standing for
  3 stars, two towers for 2, one tower for 1.

The first venue teaches the loop with contextual tips: deploy cheap, cover a
lane, spend Buzz instead of letting it sit full, use spells on crowds, and
push during Happy Hour.

## The Bar Tour

Eight venues unlock in order. The rival's card levels, reaction time and
aggression rise as you move from Old Town to The Strip.

| # | Venue | District | The house special |
|---|---|---|---|
| 1 | **The Rusty Tap** | Old Town | Cheap beer and a forgiving first round |
| 2 | **Neon Copa** | Old Town | Cocktail swarms and splash |
| 3 | **Cork & Candle** | Old Town | Wine control and a heavy tank |
| 4 | **The Velvet Rope** | Midtown | Buildings, barrels and a bouncer |
| 5 | **Rooftop Fizz** | Midtown | Air units and champagne corks |
| 6 | **The Sour Cellar** | Midtown | Spell-heavy, spread out or suffer |
| 7 | **Midnight Lounge** | The Strip | Fast shots and faster pushes |
| 8 | **LAST CALL** | The Strip | The boss bar: every bottle, every trick |

Clearing a venue unlocks the next one and two new drinks for the shelf.
**Quick Match** is a practice mode with Easy, Normal and Hard AI and a random
two-cards-per-family rival deck; it pays a small tip fee but no stars or tour
progress.

## The drinks

The launch roster is 24 cards, six per family:

| Family | Identity | Examples |
|---|---|---|
| **Cocktails** | Swarm, duelists and splash | Mojito Mob, Margarita Duelist, Piña Colada |
| **Wine** | Range, healing and tanks | Chianti Slinger, Rosé Sommelier, Barolo Bulwark |
| **Beer** | Cheap bodies and buildings | Lager Louts, IPA Marksman, Rum Barrel |
| **Spirits & Softs** | Burst damage and utility | Whiskey Gunslinger, Sparkling Water, Espresso Martini |

Cards come in four rarities, five levels and three shapes: troops, buildings
and spells. Levels scale HP, damage and healing; the deck builder shows the
stats at the level you own. Three deck slots are saved locally.

## Controls

| Action | Mouse / keyboard | Touch |
|---|---|---|
| Select a card | **1–4** or click a hand card | Tap a hand card |
| Deploy | Click the arena, or **arrows** + **Enter** | Drag onto the arena, or tap card then tap the bar |
| Cancel selection | **Esc** | Tap the card again, or tap outside |
| Pause / resume | **P** or **Esc** | Pause button |
| Scroll screens | Mouse wheel / trackpad | Swipe |

Troops deploy on your half of the bar; spells can land anywhere. A glowing
preview shows whether the placement is legal and affordable. The arena is
keyboard-focusable, and every dialog closes with **Esc**.

## PWA and offline

The game ships a manifest, SVG and generated PNG icons, a maskable icon, an OG
cover, and a versioned cache-first service worker. Once loaded it plays with
the network off. All art is drawn procedurally on Canvas 2D and all sound is
synthesised with WebAudio; the only binary files are the generated icons.

Progress lives in one `localStorage` record (`random2-last-call-v1`): tips,
card levels, tour stars, three decks, settings. There is no server, no login
and no telemetry. Installing the PWA and playing offline are the same thing as
playing online.

## Development

There is no build and no dependency. Serve the repository root and open the
folder:

```bash
python3 -m http.server 8080
# http://localhost:8080/last-call-pwa/
```

Run the headless suite:

```bash
node last-call-pwa/tests/run.mjs
```

It loads the real simulation, cards, AI and storage modules into Node with a
Map-backed `localStorage`, then checks:

- the 24-card roster, six per family, the eight venue decks and the starter
  deck are legal and internally consistent;
- seeded RNG determinism, deployment rules, card cycling, damage, spells,
  crowns, overtime and the end-of-match result;
- all 24 cards can be unlocked, upgrades spend the right tips, and tour wins
  award stars, first-clear bonuses and the next venue;
- a headless AI match terminates without NaN and produces a result object;
- the manifest, every icon, the service-worker precache and every script in
  `index.html` agree with each other.

Run the browser smoke test against a local server:

```bash
python3 -m http.server 8099
node last-call-pwa/tests/smoke.mjs http://localhost:8099/last-call-pwa/
```

It drives a real Chromium over the DevTools Protocol: boots the menu, starts
a Quick Match, deploys a card, pauses and resumes, finishes the match, opens
the Bar Tour and the deck builder, upgrades a drink, checks the versioned
service-worker cache, then reloads with the network off and starts another
match. It skips cleanly when no Chromium is installed.

Regenerate the icons (SVG sources plus PNGs) with:

```bash
python3 last-call-pwa/tools/make_icons.py
```

The script uses only the Python standard library and calls `sips`,
`rsvg-convert` or `cairosvg` — whichever is available — to turn the SVGs into
PNGs. The committed PNGs are what ship.

### Files

```
last-call-pwa/
  index.html          markup, meta, PWA hooks
  styles.css          menu, tour, deck builder, HUD, phone/desktop arena
  manifest.json       install metadata and icons
  service-worker.js   offline cache (bump CACHE_NAME on release)
  icons/              SVG sources, PNG icons, maskable icon, OG cover
  tools/
    make_icons.py     stdlib-only icon generator
  src/
    config.js         board geometry, economy, venues, tutorial text
    util.js           small deterministic helpers
    rng.js            seeded RNG
    cards.js          the 24-card roster and level scaling
    storage.js        profile, decks, upgrades, rewards, sanitising
    sim.js            authoritative fixed-step match simulation
    ai.js             rival bartender AI (acts only through Sim.playCard)
    audio.js          procedural WebAudio music and effects
    render.js         procedural Canvas 2D arena, drinks and portraits
    input.js          pointer → world coordinates, touch and mouse
    ui.js             menus, tour, deck builder, hand, dialogs, results
    main.js           boot, fixed-step RAF loop, persistence, PWA wiring
  tests/
    run.mjs           headless simulation, content and PWA tests
    smoke.mjs         in-browser match, tour, deck, upgrades and offline boot
```

## Design notes

- **Mobile-first arena.** The logical board is 900×1600 and every simulation
  distance is in those units, so a card's range is the same on a phone and a
  desktop. The Canvas is letterboxed into the available space and touch
  targets live outside it in the hand and HUD.
- **Fixed 60 Hz simulation.** Rendering is decoupled from the rules. The loop
  accumulates real time, runs at most five simulation steps per frame, and
  caps a frame at 100 ms so a background tab cannot teleport the match.
- **One source of truth.** The AI calls the same `Sim.playCard` as the player
  and cannot ignore Buzz, deployment zones or the unit cap. The renderer reads
  the state; it never mutates it.
- **Procedural art.** Drinks, portraits, towers, particles and the bar itself
  are drawn from card metadata and geometry. No sprites, no image decode, no
  binary assets beyond the generated icons.

## License

Same as the parent repository: see [`../LICENSE`](../LICENSE).