# The Debt of Years

A five-chapter, portrait-oriented ink-and-ledger JRPG built with Phaser 3 and plain JavaScript. The village of Little Ember bought its lamps with borrowed years. You are Wren, the new year-keeper. Every spell, every quota payment, and every act of mercy is paid for with somebody's remaining life.

The game is a complete offline-capable PWA. It has no build step, no backend, and no external runtime dependencies beyond the vendored Phaser bundle.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Controls](#controls)
- [Core Loop](#core-loop)
- [The Village Map](#the-village-map)
- [Years, Death, and Memory](#years-death-and-memory)
- [Quotas and Chapters](#quotas-and-chapters)
- [Characters](#characters)
- [Story Events](#story-events)
- [Battle](#battle)
- [Favors](#favors)
- [Finals and Endings](#finals-and-endings)
- [New Game+](#new-game)
- [Ending Gallery](#ending-gallery)
- [Character Epilogues](#character-epilogues)
- [Save Data](#save-data)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [Content Authoring Guide](#content-authoring-guide)
- [Art and Audio](#art-and-audio)
- [Testing](#testing)
- [PWA and Service Worker](#pwa-and-service-worker)
- [Troubleshooting](#troubleshooting)
- [Design Notes](#design-notes)
- [Spoiler Reference](#spoiler-reference)

---

## Quick Start

Requirements:

- A modern browser with ES modules, Canvas/WebGL, and localStorage.
- Python 3 for the bundled static server, or any static file server.
- Node.js 18+ for the unit tests.

Run locally:

```bash
cd debt-of-years-pwa
npm run serve
```

Then open:

```text
http://localhost:8080/
```

Alternative:

```bash
python3 -m http.server 8080
```

Do not open `index.html` directly through `file://`. ES modules and service workers require an HTTP origin. The service worker is registered only when the protocol starts with `http`.

Install as an app:

- Open the game in a supported browser.
- Use the browser's "Install app" or "Add to Home Screen" action.
- The manifest is `manifest.webmanifest`.
- The app is portrait-oriented and uses a 720 x 1280 logical canvas.

---

## Controls

Desktop:

- Move: press and drag in the lower part of the screen. A floating joystick appears where you press.
- Interact: walk near a person or location, then press the contextual button.
- Menus: click or tap buttons.
- Dialog: click or tap to advance. Use "skip" to close the current dialog.

Mobile:

- Move: touch and drag in the lower part of the screen.
- Interact: tap the contextual button.
- Dialog and menus: tap.

The joystick zone begins at screen Y 930 in the 720 x 1280 logical viewport. The HUD stays fixed while the village camera scrolls.

---

## Core Loop

1. Explore the village and talk to its people.
2. Learn who is willing, unaware, refusing, or protected.
3. Walk the road to fight hollows. Battles cost vitality, not years, unless you cast spells.
4. At the gate, settle the chapter quota by assigning years from named villagers or from Wren.
5. Advance the chapter, face new events, and decide what the ledger is allowed to remember.
6. In the final chapter, choose what happens to the contract, the village, and the Collector.

The central tension is not "can you pay?" It is "who pays, and will anyone remember their name?"

---

## The Village Map

The map is 720 x 1600 world units. The camera follows Wren with a dead zone and clamps to the map bounds.

Important locations:

- The Gate: settle quotas, meet the Collector, reach the final choice.
- The Road: optional chapter battles. Each victory advances the day and restores vitality.
- The Chapel: the ledger, Nessa, and the funeral event.
- The Charter House: Mother Ottil and the original contract.
- The Ferry: Joss Vey and the escape route.
- The Bakery, Well, Alderman's House, Seamstress, Dock, and Nel's House: villager markers.

NPC markers are generated from `VILLAGER_POSITIONS` in `js/data/village.js`. Solid buildings and the river are Arcade Physics obstacles.

The Hub uses two cameras:

- Main camera: scrolls with the world.
- UI camera: fixed HUD, joystick, event banners, dialogs, and modals.

This avoids the classic Phaser problem where fixed UI renders correctly but receives input at the wrong world coordinates.

---

## Years, Death, and Memory

Every villager has a `years` value. Years are both currency and lifespan.

Drawing years:

- Reduces the target's `years`.
- Records an entry in the ledger.
- Can kill the target when years reach zero.
- Can erase the target from memory if the draw is secret and the target was not known well enough.

Consent types:

- `willing`: they have agreed.
- `unaware`: they do not know they are pledged.
- `refuses`: they refuse, but the ledger still allows the draw.
- `protected`: cannot be drawn from. Nel is protected.

Memory rules:

- A witnessed death is remembered.
- A secret death is remembered if the villager had spoken to Wren and had enough trust.
- A forgotten villager increments `stats.forgotten`.
- Nessa's funeral event can restore forgotten names.
- Three or more forgotten villagers force the `unnamed` ending.

Wren's own years:

- Wren starts with 40 years and 60 vitality.
- Spending Wren's years lowers Wren's maximum vitality.
- Spending all of Wren's years ends the run.
- Wren's years are the only "clean" cost in the story, but they are still finite.

---

## Quotas and Chapters

The base quotas are:

| Chapter | Title | Base Quota |
|---|---|---:|
| 1 | The Quota | 6 |
| 2 | The Ledger | 12 |
| 3 | The Hollow Season | 16 |
| 4 | The Second Chair | 22 |
| 5 | The Renewal | 28 |

Base total: 84 years.

In New Game+, each chapter quota is increased by 4 years, for a total of 104 years.

Chapter progression:

- Chapters 1 through 4 advance after the gate quota is paid and the interlude is read.
- Chapter 4 triggers the nomination event before advancing to chapter 5.
- Chapter 5 opens the final sequence after its quota is paid.
- The settlement screen supports manual allocation and an automatic "let the collector choose" option.
- The automatic option takes the shortest lives first, including Wren if necessary.

Chapter names, quotas, Roman numerals, and interludes live in `js/data/chapters.js`.

---

## Characters

### Wren

The player character and year-keeper. Wren is not a blank slate: the game tracks Wren's own years, vitality, and willingness to pay.

### Village Roster

| Character | Role | Starting Years | Consent | Notes |
|---|---|---:|---|---|
| Maren Holt | Baker | 4 | Willing | Grandmother, feeds the village first. |
| Ivo Pike | Ferry boy | 50 | Unaware | Believes his years are a fortune. |
| Old Wick | Well-keeper | 1 | Willing | Has buried three keepers. |
| Sable Vey | Collector's clerk | 22 | Refuses | Writes the margins. |
| Alderman Rusk | Mayor | 2 | Willing | Keeps forty years in a drawer. |
| Nessa Ward | Chapel sister | 18 | Willing | Counts the dead and restores names. |
| Tomas Reed | Gate guard | 12 | Unaware | Guards a gate that already sold him. |
| Lira Mott | Seamstress | 8 | Refuses | Sews shrouds and refuses the ledger. |
| Nel Ash | Child | 60 | Protected | The ledger is not allowed to learn her name. |
| Perrin Ash | Dockhand | 20 | Unaware | Nel's father. Sold years for passage. |
| Joss Vey | Ferryman | 14 | Unaware | Sable's brother. Runs the unregistered ferry. |
| Mother Ottil | Archivist | 6 | Willing | Keeps the original charter. |
| Orin Vale | Last keeper | 1 | Willing | The Collector's predecessor. |

### City Figures

- The Collector: the city's year-collector. His former name is Iven Ash. He is Nel's grandfather.
- Auditor Crane: the city auditor who investigates Sable's false names.
- The Contract: the original agreement, capable of manifesting as a final boss.

Speaker names are resolved through `speakerName()` in `js/data/villagers.js`. City-only speakers are listed in `SPECIAL_SPEAKERS`.

---

## Story Events

Events are defined in `js/data/events.js`. An event can be attached to a villager marker, a location, or both. Once its condition is true, it appears in the event banner and/or on the map.

Chapter 2:

- Sable's Offer: expose her, stop her, or let her write unregistered names.
- The Funeral: Nessa can read forgotten names aloud or let them rest.

Chapter 3:

- The Audit: give Sable to Auditor Crane, hide the pages, or confess. Each outcome changes quota and trust.
- Perrin's Claim: let Perrin take Nel, hide Nel in the chapel, or pay Perrin's debt with five of Wren's years.
- The First Page: take the original charter or ask Mother Ottil to keep it safe.

Chapter 4:

- The Man Who Counted: ask Orin to testify, give him a quiet death, or let him sleep.
- The Ferryman's Price: pay eight of Wren's years, promise the village's future, or refuse.
- The Nomination: protect Nel, offer yourself to the renewal, or let the council decide.

Chapter 5:

- The Council Will Negotiate: meet Auditor Crane at the Charter House. Publish the audit, trade the ledger for a lower quota, or send Crane away. Publishing unlocks a non-combat final path.

Events remain available in later chapters if their conditions stay true, except for the chapter 4 nomination, which is chapter-specific.

---

## Battle

Battle is turn-based and uses vitality rather than a separate HP pool for enemies only.

Actions:

- Attack: free.
- Guard: reduces the next blow.
- Spell: spends years from a named villager or Wren.
- Favor: spends a villager's one-time gift.

Spells:

| Spell | Cost | Effect |
|---|---:|---|
| Mend | 1 year | Restore 25 vitality. |
| Ember | 2 years | Deal 22 damage. |
| Hush | 3 years | Enemy loses its next turn. |
| Unmake | 5 years | Deal 45 damage. |

Enemies:

- Hollow Clerk
- Ledger Hound
- Interest Wraith
- Hollow Notary
- Year Eater

Final bosses:

- The Collector
- Auditor Crane
- The Contract

Winning a normal road battle advances the day, restores 12 vitality, and increments the chapter encounter counter. Losing takes years from the village and returns Wren to the Hub, unless Wren has no years left.

Final bosses are selected through `FINAL_ENCOUNTERS` in `js/data/enemies.js`. The Hub launches them with a `finale` ID. Victory sets the corresponding final flag and starts the Ending scene.

---

## Favors

Each villager can give one favor. Favors are one-use and are tracked with `favorUsed`.

Favor effects:

- `heal`: restore vitality.
- `healMax`: increase maximum vitality.
- `skip`: enemy loses a turn.
- `flee`: leave the fight.
- `years`: return years to Wren.

Favors are defined on each villager in `js/data/villagers.js`. The battle favor picker only shows living villagers who have not spent their favor.

---

## Finals and Endings

The final chapter presents a filtered list of choices. The base choices are:

- Let the ledger balance.
- Offer twenty of Wren's own years.
- Refuse and let the lamps go out.
- Face the Collector.
- Renew the contract.

Story-unlocked choices include:

- Burn the original charter (requires the first page).
- Expose the city's ledger (requires confessing during the audit).
- Publish the audit at the gate (requires the chapter 5 parley).
- Take the ferry (requires Joss and the ferry).
- Take the Collector's second chair (requires Orin's testimony and the offer).

Endings:

| ID | Title | Trigger |
|---|---|---|
| `balances` | The Ledger Balances | Default successful ledger. |
| `saint` | The Saint of Small Hours | Wren spends enough of Wren's own years. |
| `quiet` | The Quiet Collector | Heavy secret draws. |
| `unnamed` | The Unnamed | Three or more forgotten villagers, or forgotten plus no years. |
| `default` | The Default | Refuse the contract. |
| `renewal` | The Renewal | Renew the contract and become the next Collector. |
| `charter` | The Burned Charter | Defeat The Contract after burning the charter. |
| `ferry` | The Crossing | Escape by ferry. |
| `keeper` | The Keeper of Names | Expose the city or publish the audit. |
| `secondchair` | The Second Chair | Take the Collector's place. |

Ending priority is handled in `js/systems/endings.js`:

1. `unnamed` overrides everything if the village has forgotten too much.
2. An explicit `state.flags.finale` selects one of the new endings.
3. Legacy ledger conditions select `default`, `quiet`, `saint`, or `balances`.

The Ending scene can copy the ledger as text or render a downloadable PNG card.

---

## New Game+

New Game+ unlocks after the first completed ending.

What changes:

- Chapter quotas are increased by 4 years each.
- The opening uses `NGPLUS_OPENING` instead of the normal opening.
- Each chapter interlude gains an extra line about the page remembering Wren.
- The player carries one unlocked final choice into the new run.

The carried choice appears in the final choice list with a `(carried)` suffix. If the carried choice is "Offer twenty of your own years" and Wren has fewer than 20 years, the option is disabled with a "not enough years" label.

Meta progress is stored separately from the run save:

```text
debt-of-years-meta-v1
```

It contains:

- `endings`: discovered ending IDs.
- `choices`: final choices unlocked for carrying.
- `ngPlusRuns`: number of New Game+ runs started.

New Game+ is available from both the Title screen and the Ending screen.

---

## Ending Gallery

The Ending Gallery is a dedicated Phaser scene at `js/scenes/gallery.js`.

It shows all 10 endings as cards:

- Discovered endings show their title, kicker, and a `RECORDED` label.
- Undiscovered endings show `???` and `LOCKED`.
- The header shows the number of endings recorded.

Access it from:

- The Title screen.
- The Ending screen.

The gallery reads from `debt-of-years-meta-v1`, so it survives new games and cleared run saves.

---

## Character Epilogues

The Ending scene adds a `WHAT REMAINED` section. It generates one fate-aware sentence for each of the five expansion characters:

- Perrin Ash
- Joss Vey
- Mother Ottil
- Orin Vale
- Nel Ash

Epilogues respond to:

- Whether the character is alive, dead, or departed.
- Whether Nel was protected, hidden, taken to the city, or left with Perrin.
- Whether Orin testified.
- Whether the charter burned.
- Whether the ferry ending was chosen.

The logic lives in `getCharacterEpilogue()` in `js/systems/endings.js`.

---

## Save Data

Run save:

```text
debt-of-years-save-v2
```

The run save is a JSON object with `version: 2`. The current build intentionally rejects version 1 saves. Old saves are ignored rather than migrated.

Save behavior:

- Saving happens after major state changes.
- Continue is available only when the save has no `endingId`.
- Starting a new game clears the run save.
- Starting New Game+ clears the run save and creates a new run with NG+ fields.
- Meta progress is never cleared by starting a new run.

Key state fields:

- `version`
- `chapter`
- `day`
- `ngPlus`
- `ngPlusLevel`
- `carriedChoice`
- `quotaBonus`
- `hero`
- `quota`
- `villagers`
- `ledger`
- `flags`
- `stats`
- `endingId`

Storage is localStorage with an in-memory fallback if storage throws.

---

## Project Structure

```text
debt-of-years-pwa/
├── index.html
├── manifest.webmanifest
├── sw.js
├── package.json
├── README.md
├── css/
│   └── game.css
├── icons/
├── js/
│   ├── main.js
│   ├── art.js
│   ├── audio.js
│   ├── data/
│   │   ├── chapters.js
│   │   ├── endings.js
│   │   ├── enemies.js
│   │   ├── events.js
│   │   ├── finals.js
│   │   ├── spells.js
│   │   ├── story.js
│   │   ├── villagers.js
│   │   └── village.js
│   ├── scenes/
│   │   ├── boot.js
│   │   ├── title.js
│   │   ├── hub.js
│   │   ├── battle.js
│   │   ├── ending.js
│   │   └── gallery.js
│   ├── systems/
│   │   ├── endings.js
│   │   ├── ledger.js
│   │   ├── meta.js
│   │   ├── save.js
│   │   ├── state.js
│   │   └── store.js
│   ├── ui/
│   │   ├── core.js
│   │   ├── joystick.js
│   │   ├── ngplus.js
│   │   └── settlement.js
│   └── vendor/
│       └── phaser.min.js
├── tests/
│   ├── ledger.test.mjs
│   ├── map.test.mjs
│   └── story.test.mjs
└── tools/
    └── make-icons.mjs
```

---

## Data Model

### `js/data/chapters.js`

- `FINAL_CHAPTER`
- `CHAPTER_QUOTAS`
- `CHAPTER_NAMES`
- `ROMAN`
- `CHAPTER_INTERLUDES`

### `js/data/villagers.js`

- `VILLAGERS`: full roster, portrait seeds, consent, years, favors, epitaphs.
- `SPECIAL_SPEAKERS`: city-only and narrator speaker names.
- `speakerName()`
- `villagerById()`

### `js/data/village.js`

- `MAP_SIZE`
- `PLAYER_START`
- `RIVER`
- `FENCE`
- `BUILDINGS`
- `ROADS`
- `VILLAGER_POSITIONS`
- `LOCATIONS`
- `OBSTACLES`

### `js/data/events.js`

- `STORY_EVENTS`
- `getActiveEvents()`
- `eventForVillager()`
- `eventForLocation()`
- `firstActiveEvent()`

Events are data-driven. Each event can define:

- `id`
- `chapter`
- `markerId`
- `location`
- `title`
- `sub`
- `prompt`
- `condition(state)`

### `js/data/finals.js`

- `FINAL_CHOICES`
- `FINAL_BOSSES`
- `FINAL_ENDING_FLAGS`
- `CARRYABLE_FINAL_VALUES`
- `getFinalChoices(state)`

### `js/data/story.js`

Dialog content, event text, results, interludes, NG+ opening, final text, and boss victory text.

### `js/systems/state.js`

Creates the initial run state and exposes helpers:

- `createInitialState(opts)`
- `chapterName()`
- `livingVillagers()`
- `deadVillagers()`
- `quotaRemaining()`

### `js/systems/ledger.js`

- `drawYears()`
- `settleQuota()`
- `settleAuto()`
- `restoreForgotten()`
- `useFavor()`
- `healHero()`
- `hurtHero()`
- `grantHeroYears()`
- `ledgerTotals()`

### `js/systems/endings.js`

- `computeEnding()`
- `getEnding()`
- `getCharacterEpilogue()`

### `js/systems/meta.js`

- `loadMeta()`
- `saveMeta()`
- `recordEnding()`
- `incrementNgPlusRun()`
- `hasMetaProgress()`

### `js/systems/save.js`

- `saveState()`
- `loadState()`
- `hasSave()`
- `clearSave()`
- `readMuted()`
- `writeMuted()`

### `js/systems/store.js`

Holds the current in-memory state:

- `startNewGame(opts)`
- `setCurrent()`
- `getState()`
- `ensureState()`

---

## Content Authoring Guide

### Add a villager

1. Add the villager to `VILLAGERS` in `js/data/villagers.js`.
2. Add a portrait position in `VILLAGER_POSITIONS` in `js/data/village.js`.
3. Add intro, repeat, drawn, and low dialogue to `VILLAGER_TALK` in `js/data/story.js`.
4. Add a favor.
5. Run the map tests to verify the position does not overlap a solid obstacle.

Portraits are generated automatically from `seed`, `hair`, `tone`, and `age`.

### Add an event

1. Add an entry to `STORY_EVENTS` in `js/data/events.js`.
2. Use `markerId` for a villager event or `location` for a map-location event.
3. Add dialogue and result text to `js/data/story.js`.
4. Add an `openEvent()` branch and a resolve method in `js/scenes/hub.js`.
5. Add tests for the condition and effects.

### Add a final choice

1. Add the choice to `FINAL_CHOICES` in `js/data/finals.js`.
2. Add its boss mapping to `FINAL_BOSSES` if it is combat.
3. Add its ending mapping to `FINAL_ENDING_FLAGS`.
4. Handle it in `resolveFinal()` in `js/scenes/hub.js`.
5. Add any required flag to `createInitialState()`.
6. Add tests.

### Add an ending

1. Add the ending to `ENDINGS` in `js/data/endings.js`.
2. Add its trigger to `computeEnding()` in `js/systems/endings.js`.
3. Add the final flag and choice that lead to it.
4. Update the gallery automatically; it iterates `ENDINGS`.
5. Add a unit test.

### Add a chapter

1. Add the quota, name, Roman numeral, and interlude to `js/data/chapters.js`.
2. Update `FINAL_CHAPTER` if the final chapter changes.
3. Add chapter encounters to `js/data/enemies.js`.
4. Update chapter-specific event conditions.
5. Update progression tests.

---

## Art and Audio

All art is generated procedurally at boot in `js/art.js`:

- Background texture.
- Villager portraits.
- Enemy textures.
- Village map texture.
- Wren idle and walk frames.
- Pixel collision texture.
- Building art, including the Charter House archive facade.

There are no external image assets besides the app icons.

Audio is generated through `js/audio.js`. Audio starts only after a user gesture, which is required by mobile browsers. The mute preference is stored under `debt-of-years-muted`.

---

## Testing

Run unit tests:

```bash
npm test
```

The tests cover:

- Initial state and quotas.
- Drawing years and death.
- Secret draws and forgetting.
- Protected villagers.
- Wren's own years.
- Quota settlement and automatic collection.
- Restoring forgotten names.
- Healing and granting years.
- Ending priority.
- Map positions and obstacles.
- Chapter progression.
- Event conditions.
- Final choice gating and boss mapping.
- New Game+ quotas and carried choices.
- Parley and character epilogues.

Current test count: 26.

The browser smoke tests used during development are intentionally outside the repository. They exercise:

- Title, map, joystick, and contextual interaction.
- Audit, Perrin, Charter House, Orin, Ferry, nomination, and parley events.
- Chapter progression from 1 to 5.
- All three final bosses.
- Non-combat final paths.
- Ending screen, epilogues, gallery, and New Game+.
- Save version rejection and NG+ state.

Syntax check:

```bash
for f in js/**/*.js js/*.js; do node --check "$f"; done
```

---

## PWA and Service Worker

`sw.js` caches the application shell and all runtime modules. It uses a cache-first strategy with network fallback.

Important:

- Bump the `CACHE` constant whenever shipped assets change.
- The current cache version is `debt-of-years-v8`.
- The service worker calls `skipWaiting()` and `clients.claim()`.
- Navigation requests fall back to `index.html`.
- The app works offline after the first successful load.

If you change an asset and do not see it in the browser, hard reload or clear the site data. The cache-first service worker will keep serving the old file until the cache name changes.

---

## Troubleshooting

### Blank screen

- Confirm you are serving over HTTP, not opening `file://`.
- Check the browser console for module import errors.
- Hard reload or clear the service worker cache.

### Old save does not appear

This is intentional. The game uses `debt-of-years-save-v2` and rejects `version: 1` saves. Clear the old key if desired.

### New Game+ button is missing

- Complete an ending first.
- Confirm `debt-of-years-meta-v1` exists and contains at least one ending.
- The button is on both the Title and Ending screens.

### Gallery shows all cards locked

- Meta progress is stored separately from the run save.
- Complete an ending and confirm `recordEnding()` ran.
- Clearing site data also clears the gallery.

### Dialog or buttons do not respond

- The Hub uses a separate UI camera. Fixed UI input depends on it.
- Do not remove the UI camera setup in `js/scenes/hub.js`.
- Modals call `scene.cameras.main.ignore(root)` when the UI camera exists.

### Clipboard copy fails

Clipboard access can be blocked by browser permissions or insecure contexts. The game falls back to `document.execCommand('copy')` and shows a toast if both methods fail.

### Audio does not start

Audio requires a user gesture. Tap or click once. The title screen and boot screen both initialize audio on first pointer input.

---

## Design Notes

The game deliberately avoids a conventional "good option" economy. Paying the quota is always possible if enough years remain; the question is whether the player is willing to spend named lives. The new expansion extends that logic:

- The audit makes honesty expensive.
- Perrin's claim makes Nel's protection a family conflict, not just a rule.
- The charter makes the system itself an object that can be destroyed.
- The ferry makes escape a real, costly alternative.
- The second chair makes complicity a final choice.
- The parley makes public truth a non-combat path.

The New Game+ mode is not a victory lap. It raises quotas and lets the player carry one door forward, but the ledger still records who paid.

---

## Spoiler Reference

This section contains full spoilers.

### Main reveals

- The Collector was Iven Ash, a former village year-keeper.
- He took the second chair to save his son.
- Perrin Ash is his son.
- Nel Ash is his granddaughter.
- Sable has been writing unregistered names into the margins.
- Auditor Crane is the city's response to those margins.
- Mother Ottil holds the original charter.
- Orin Vale was the keeper before Iven.
- The charter can be burned, but the magic dies with it.
- The ferry can take eight people across the river.
- The city's renewal contract can be signed, refused, burned, exposed, or replaced.

### Final boss routes

- Face the Collector: `fight` -> `collector`.
- Burn the original charter: `charter` -> `contract`.
- Expose the city's ledger: `expose` -> `auditor`.

### Non-combat final route

- Complete the chapter 5 parley with Auditor Crane.
- Choose "Publish the audit at the gate."
- At the final gate, choose "Publish the audit at the gate."
- This leads to the `keeper` ending without a boss fight.

### New Game+ carry rules

- One final choice is carried.
- The choice is recorded from `state.flags.finalChoice` when an ending is reached.
- Quotas gain +4 per chapter.
- The carried choice appears with a `(carried)` label.
- Carried "offer" is disabled if Wren has fewer than 20 years.

---

## License and Credits

Game code, story, and procedural art were created for this project. Phaser 3 is vendored in `js/vendor/phaser.min.js` and is distributed under its own license. No separate project license file is included; add one before redistribution.
