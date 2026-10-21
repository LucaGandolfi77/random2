# random2 · Play

> A monorepo of installable mini-games (PWAs) and one desktop dev tool.
> Every game runs entirely in the browser, is fully playable offline once
> installed, uses **zero binary art assets** (everything is drawn procedurally
> on canvas) and **zero trackers**.

**Live arcade:** <https://lucagandolfi77.github.io/random2/>

---

## Table of contents

- [What's in the box](#whats-in-the-box)
- [Quick start](#quick-start)
- [Installing as an app (PWA)](#installing-as-an-app-pwa)
- [The games](#the-games)
  - [King Shot](#king-shot)
  - [Plane Shooter](#plane-shooter)
  - [Slot Machine](#slot-machine)
  - [Snake](#snake)
  - [LUMEN](#lumen)
  - [SECTOR 7](#sector-7)
  - [SINI](#sini)
  - [Viti & Lastre](#viti--lastre)
  - [MYCEL](#mycel)
  - [STATIC](#static)
  - [ALVEARE](#alveare)
  - [MADRE](#madre)
  - [LINEA ROSSA](#linea-rossa)
  - [NEBBIA](#nebbia)
  - [ACQUA](#acqua)
  - [FORMICA](#formica)
  - [Mustang 1942](#mustang-1942)
  - [Farm Tycoon](#farm-tycoon)
  - [Isola Resort](#isola-resort)
  - [BUCIO](#bucio)
  - [Territorio](#territorio)
  - [Snap Cam](#snap-cam)
  - [IRONFALL](#ironfall)
  - [PULSE](#pulse)
  - [PIXEL CUP '96](#pixel-cup-96)
  - [CENSUS](#census)
- [The tools](#the-tools)
  - [EADS Studio](#eads-studio)
- [The portfolio page](#the-portfolio-page)
- [The hub page](#the-hub-page)
- [Architecture](#architecture)
- [Deployment (GitHub Pages)](#deployment-github-pages)
- [Local development](#local-development)
- [Adding a new game](#adding-a-new-game)
- [Privacy & performance](#privacy--performance)
- [Browser support](#browser-support)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## What's in the box

| # | Project | Kind | Tech | Offline | Try it |
|---|---------|------|------|:-------:|--------|
| 1 | **King Shot** | Archery duels | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/king-shot-pwa/) |
| 2 | **Plane Shooter** | Side-scrolling shmup | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/plane-pwa/) |
| 3 | **Slot Machine** | 3-reel casino | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/slot-pwa/) |
| 4 | **Snake** | Retro arcade | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/snake-pwa/) |
| 5 | **LUMEN** | Bioluminescent .io survival | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/lumen-pwa/) |
| 6 | **SECTOR 7** | Low-poly space combat | Canvas 2D (facet meshes) + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/sector7-pwa/) |
| 7 | **SINI** | Living-brushstroke .io (sumi-e) | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/sini-pwa/) |
| 8 | **Viti & Lastre** | Screw-puzzle demolition | Canvas 2D (rigid body) + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/viti-pwa/) |
| 9 | **MYCEL** | Branching fungal network .io | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/mycel-pwa/) |
| 10 | **The Library** | Literary classics as visual novels | Canvas 2D + WebAudio | ✅ | [▶ Open](https://lucagandolfi77.github.io/random2/anthology-pwa/) |
| 11 | **The Bible** | Holy Bible as visual novel, bilingual | Canvas 2D + WebAudio | ✅ | [▶ Open](https://lucagandolfi77.github.io/random2/bible-pwa/) |
| 12 | **Crime & Punishment** | Dostoevsky as melancholic visual novel | Canvas 2D + WebAudio | ✅ | [▶ Open](https://lucagandolfi77.github.io/random2/crime-and-punishment-pwa/) |
| 13 | **A la recherche** | Proust: memory and lost time | Canvas 2D + WebAudio | ✅ | [▶ Open](https://lucagandolfi77.github.io/random2/recherche-pwa/) |
| 14 | **Star Explorer** | Space adventure: asteroids and crystals | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/example-pwa/) |
| 15 | **STATIC** | Pirate broadcast .io (CRT/VHS) | Canvas 2D + WebAudio + BroadcastChannel | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/static-pwa/) |
| 16 | **New Star Soccer** | Football career RPG: matches, transfers, life | TypeScript + Canvas 2D + WebAudio (Vite) | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/new-star-soccer/) |
| 17 | **ALVEARE** | Bee-tycoon con waggle dance disegnabile | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/alveare-pwa/) |
| 18 | **MADRE** | Fermentation tycoon on real time | DOM UI + Canvas curves + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/madre-pwa/) |
| 19 | **LINEA ROSSA** | Metro planner tycoon | Canvas 2D + gravity model + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/metro-pwa/) |
| 20 | **NEBBIA** | Cartographer guild, misinformation economy | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/nebbia-pwa/) |
| 21 | **ACQUA** | Roman aqueduct engineer (hydraulics) | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/acqua-pwa/) |
| 22 | **FORMICA** | Ant-colony territory .io | Canvas 2D + WebAudio | ✅ | [▶ Gioca](https://lucagandolfi77.github.io/random2/formica-pwa/) |
| 23 | **Mustang 1942** | WWII vertical shmup | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/mustang-pwa/) |
| 24 | **Farm Tycoon** | Idle farming sim, staff da assumere | Canvas/DOM + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/virtual-farm-pwa/) |
| 25 | **Isola Resort** | Low-poly island resort tycoon | Canvas 2D (isometrico) + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/resort-pwa/) |
| 26 | **BUCIO** | 3D black-hole eat-'em-up | three.js + Vite | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/bucio/) |
| 27 | **Snap Cam** | Camera + face lenses | MediaPipe + getUserMedia | ✅* | [▶ Open](https://lucagandolfi77.github.io/random2/snap-pwa/) |
| 28 | **Territorio** | Paper.io vs bots, modalità arena senza respawn | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/territorio-pwa/) |
| 29 | **STATS** | Play-data dashboard | Canvas 2D (charts) | ✅ | [▶ Open](https://lucagandolfi77.github.io/random2/stats-pwa/) |
| 30 | **EADS Studio** | Embedded dev tool | Python / Flask | n/a | [⌘ GitHub](https://github.com/LucaGandolfi77/random2/tree/main/EADS) |
| 31 | **CENSUS** | Sampling-theory tycoon | Canvas 2D | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/census-pwa/) |
| 32 | **IRONFALL** | 3v3 lane MOBA, Warhammer 40k | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/ironfall-pwa/) |
| 33 | **PULSE** | Procedural rhythm game | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/pulse-pwa/) |
| 34 | **Portfolio** | EN/IT case-study site | HTML + CSS + JS | ✅ | [⌘ Open](https://lucagandolfi77.github.io/random2/portfolio/) |
| 35 | **Pokédex GO** | Low-poly creature collection, bilingual | Canvas 3D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/pokemon-go-pwa/) |
| 36 | **SARTORIA** | Couture tycoon: one runway per season | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/sartoria-pwa/) |
| 37 | **Mini Tower** | Tiny-tower builder: floors, shops, tenants | Canvas 2D + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/tiny-tower-pwa/) |
| 38 | **PIXEL CUP '96** | Low-poly arcade football, five a side | Canvas 2D (software rasteriser) + WebAudio | ✅ | [▶ Play](https://lucagandolfi77.github.io/random2/pixel-cup-pwa/) |

\* Snap Cam needs HTTPS (any browser rule for `getUserMedia`) and downloads its
face-tracking engine on first use; after that it works offline too.

Every web project is a **PWA**: it has a web manifest, a service worker with a
precache, Apple touch meta tags, safe-area-aware CSS and a standalone display
mode. Open one, add it to your home screen, and it behaves like a native app.

## Quick start

```bash
git clone https://github.com/LucaGandolfi77/random2.git
cd random2
python3 -m http.server 8080
# open http://localhost:8080
```

That's it for every game except BUCIO and NEW STAR SOCCER (see [Local development](#local-development)).
All games are plain static files with relative paths — no build step, no
bundlers, no dependencies. BUCIO and New Star Soccer are the two exceptions
(Vite; three.js and TypeScript respectively), and both are compiled by CI
before publishing.

## Installing as an app (PWA)

| Platform | Steps |
|----------|-------|
| **iPhone / iPad** (Safari) | Open a game → **Share** → **Add to Home Screen**. Launches fullscreen with no browser chrome, keeps working offline. |
| **Android** (Chrome) | Open a game → tap the **Install** banner, or **⋮ → Install app**. |
| **Desktop** (Chrome/Edge) | Click the install icon in the address bar, or **⋮ → Install**. |
| **macOS** (Safari 17+) | **File → Add to Dock**. |

All games request `display: standalone`, cache their full shell in a service
worker on first load and store progress (high scores, unlocks, farm state,
photos) in `localStorage` / `IndexedDB` on the device.

---

## The games

### King Shot

*Touch archery duels.* 👑

Pull back with one finger to set angle and power, release to loose. The aim
circle and crosshair mirror your finger in real time, so a single thumb is
enough — designed phone-first, playable with mouse and keyboard too.

- Drag-to-aim, release-to-fire controls with a live trajectory feel
- Ticking clock, combo scoring and escalating rounds
- Procedural targets and synthesized WebAudio SFX (bow, impact, win)
- Four color themes (neon, retro, forest, ocean) with persistent high score
- Installable, offline-capable, ~15 KB of hand-written JS

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/` (SVG).

### Plane Shooter

*Classic side-scrolling sky action.* ✈️

You fly a little plane at the bottom of the screen; enemies stream in from the
edges. Drag to aim the gun direction, release to fire, dodge what comes back.

- 360° aiming (touch drag or mouse), infinite bullets with life-time falloff
- Enemy spawner with bounce physics and a difficulty ramp per level
- Occasional power-up drops, particle explosions on every kill
- Three lives, level-up thresholds, high-score persistence
- Full offline shell + install prompt, iPhone viewport locked (no zoom/jitter)

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/` (SVG).

### Slot Machine

*Spin to win.* 🎰

A three-reel slot with emoji symbols, a real paytable and a bet multiplier.
Each reel spins with its own random speed and stops at its own random moment,
then the middle payline is evaluated.

- 8 symbols (🍇 🍎 🍊 🍋 🔔 ⭐ 💰 🍀) with payouts from 2× to 50×
- **Progressive jackpot**: the meter grows with every spin (persisted in
  `slot-jackpot`); three 💰 pay it out in full and reset it — with a golden
  banner and a rising arpeggio
- **Free spins**: three ⭐ grant 5 auto-playing spins
- Adjustable bet (1–10) and persistent high score
- Win bursts with a particle explosion and a rising arpeggio; losing spins get
  a soft descending tone
- Idle reel drift so the machine always looks alive
- Full PWA shell with themes and offline play

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/` (SVG).

### Snake

*The retro classic, reimagined.* 🐍

Grid-locked snake with buttery-smooth rendering, swipe gestures on touch and
arrow keys/WASD on desktop.

- Food (fruit emojis), scoring and speed-up per level
- Three modes: **classic** (deadly walls), **time** (60-second sprint) and
  **daily challenge** — a seeded RNG (`R2.dailySeed()` + mulberry32) drives
  food, power-up and obstacle placement from the day's seed, with its own
  per-day high score; the hub displays the live seed
- Power-ups: 🌈 rainbow (triple points), ⏰ clock (bonus time), ⭐ star (points)
- Optional wrap-around walls vs. classic deadly walls
- Obstacles appear as levels progress; particle bursts and synth SFX
- Pause (Space), game-over stats, persistent high score, four themes

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/` (SVG).

### LUMEN

*A bioluminescent `.io` game for the pitch-black abyss.* 🌊

You are a ribbon eel swimming in total darkness. **Your glow radius is your
vision radius, and it scales with your mass** — so growing lets you see the
whole map and makes you visible from a very long way off. You also spot other
creatures' glow halos long before their bodies, which is most of the tension.

- 40 **persistent named rivals** (`Vortex_77`, `Abyssalv2`, `Nyx.exe`…) generated
  once from a seed and frozen, so the same names hunt you every session. Each
  has a blended personality across forage / intercept / cut-off / scavenge /
  escape / wander — skilled bots lead their target by arrival time to set up a
  cut-off, unskilled ones chase the head and crash
- **Grudges persist across sessions**: kill a rival and it hunts you back; let
  one kill you and it respawns already looking for you
- Hazards: wrecks, jellyfish that stun you, and 900-mass anglerfish that
  telegraph a lunge with a flare — killable only by spearing the lure with a
  boost while they lie stunned
- Corpses drop as edible meat worth 60% of mass, so you can watch your own death
  get scavenged by someone who was waiting for it
- **Four depth zones** — Sunlit / Twilight / Midnight / Trenches. The darkness
  itself is tinted per band, so depth reads through the fog; shallows are
  bright but empty, the trenches dark but rich and crawling with jellyfish and
  anglerfish
- Fog of war via a light mask composited through `destination-out` radial
  gradients, plus marine-snow parallax, bloom and a depth-tracking synth drone
- Vertical depth meter, 3-second spectate of your killer, kill feed, live
  leaderboard, minimap
- Fully synthesised WebAudio — no audio assets at all

**Files:** `index.html`, `styles.css`, `src/` (`config`, `zones`, `storage`,
`world`, `render`, `player`, `bots`, `audio`, `ui`, `main`), `manifest.json`,
`service-worker.js`, `icons/`, `tests/sim.test.js`. See
[`lumen-pwa/README.md`](lumen-pwa/README.md).

### SECTOR 7

*Low-poly space combat, one thumb or one mouse.* 🛰️

A *Darkorbit*-flavoured single-player game: one ship, four sectors, no clock.
Harvest **energy** and **crystals**, shoot pirates across eight tiers, dock at
the station and spend the proceeds on seven upgrade tracks. Death costs you the
energy on your hull and nothing else — **crystals are banked the moment you
touch them**, so a bad run can never cost you progress.

- Two currencies that pull against each other: **energy** is the upgrade fuel
  and it drops on your deck when you die (fly back and reclaim it before it
  expires); **crystals** are permanent, and they are also the **escalation
  dial** — the sector only spawns the tiers you have earned the right to fight
- **Four sectors**, each with its own rock field, palette, NPC cap and payout
  multiplier: ROOK (no hazard), KESTREL (ion storms that make the stick lie),
  VANTA (nebulae that eat your regeneration), MAW (gravity wells that bend
  every trajectory). Gated on *lifetime* crystals, so buying something can
  never lock a map back up
- Space station with four tabs: modules (energy), contracts (rotating
  objectives paying crystals), refits (permanent perks — salvage rig, frame
  plating, tractor field, survey suite, broker contact), and the sector map.
  Docking is a loan, not a gift — a slice of your energy is charged on launch
- **Bounty hunters**: a named rival arrives on a timer, knows where you are
  from the moment it spawns, and its price climbs the longer it lives. The one
  that killed you last time comes back
- Ten module tracks (Blaster, Ammo, Plasma, Shield, Armor, Processor, Thruster,
  Cargo, Missiles, Mines) at ten levels each, every one of them showing the
  concrete numbers it buys. Missiles are a lock-on burst that cuts through
  armour; mines are the only defence that works while you are running away from
  something faster
- **Destructible rock fields** — rocks holding a big crystal cache are visibly
  marked, because an undifferentiated field tells you nothing about what is
  worth shooting — plus loose energy crates, and eight NPC tiers with patrol /
  attack / flee AI that fight each other as well as you
- **Low-poly without WebGL**: every hull, rock, crate and the station is a facet
  mesh built from two primitives, drawn flat-shaded through an oblique
  projection. Per-face lighting is one dot product per face; the view vector is
  derived from the projection so back-face culling can never drift
- Thumb-anchored virtual stick, `FIRE`/`MSL`/`MINE`/`DOCK` pads, soft turret
  auto-aim, directional damage indicators, an off-screen station marker, full
  keyboard parity, haptics
- **Two control schemes that never fight each other.** A mouse click is never a
  thumb press: the stick ignores the mouse, and a click on the map means
  "fly there" on empty space or "lock that ship" on a hull — the minimap is the
  same map at a wider scale, so a click on it means the same thing. `Ctrl` fires
  a dedicated **lock-on shot** at the selected ship: it ignores the turret arc
  and can hit something behind you, it needs the target in reach, and it runs on
  its own cooldown so the blaster is still the better answer to a target you are
  already pointing at
- **Three guns, three problems.** The laser chews armour and bounces off
  shields, the capacitor round chews shields and is wasted on armour, and the
  **plasma round pierces** — its armour damage lands through a shield. It is
  the only answer to a shielded hull, and it is bounded by being slow: a test
  asserts it never out-damages the laser against a bare hull, because a weapon
  that won at everything would kill two upgrade tracks at once
- **Six CPUs, one slot.** Insta-Shield, Radar, **Cloak**, Warp, Energy Leech and
  Repair Patch. The cloak is a perception effect and not a shield: anything that
  has to *acquire* a target cannot see you, and an NPC already fighting you
  forgets you — but a round already in the air still lands
- **A mining beam that is a tool and never a weapon.** Hold it, point the ship at
  a rock, and the energy comes out of the rock and into your hold directly — no
  pickups to chase, and the Cargo track is legible from the cockpit. It cannot
  hurt a ship, it costs nothing, and it never runs out, which is exactly what
  makes it safe to turn the guns into consumables later: a player can always
  mine, so a player can always be solvent
- Fully synthesised WebAudio — no audio assets. Zero art assets of any kind
- Everything that churns is a fixed pool: no allocation in the draw or sim path
- Hand-rolled facet-mesh renderer on Canvas 2D (no WebGL): two primitives,
  flat-shaded through a sheared oblique projection, per-face lighting in one dot
  product, back-face culling driven by the projection's own view vector
- Headless tests: **over 1,400 checks across four suites** — simulation/economy,
  render, content tables, and a full app boot against a fake DOM that drives
  menu → launch → touch steering → dock → upgrade → repair → undock → die →
  relaunch without a browser. The render suite compares every drawn polygon
  against an independent projection, which is the only check that catches
  geometry that is subtly wrong rather than broken; the boot suite asserts
  every button in the markup is actually wired, and that the mouse and touch
  schemes stay apart
- Includes a difficulty-curve test that runs the sector twice, as a rookie and
  as a banked pilot, asserting the intro is survivable and the late game is not

**Files:** `index.html`, `styles.css`, `src/` (`config`, `storage`, `sectors`,
`modes`, `world`, `render`, `stations`, `contracts`, `bounty`, `input`,
`player`, `npcs`, `audio`, `ui`, `main`), `manifest.json`,
`service-worker.js`, `icons/`, `scripts/gen-icons.mjs`,
`tests/sim.test.js`, `tests/render.test.js`, `tests/boot.test.js`,
`tests/content.test.js`. See
[`sector7-pwa/README.md`](sector7-pwa/README.md).

### SINI

*Sei un tratto di inchiostro sumi vivo su carta di riso.* 🖌️

Un .io calligrafico con un'estetica che quasi nessun gioco osa: carta beige
con grana, inchiostro nero che sanguina, un solo sigillo rosso. Niente sprite,
niente gradienti arcade — solo inchiostro, acqua e carta.

- **Il hook — bagnato vs secco:** il tuo inchiostro secca col tempo. **Bagnato**
  = scorri veloce, viri stretto, e la tua scia **evapora** senza lasciare traccia.
  **Secco** = lasci segni **permanenti** che diventano trappole letali per tutti,
  te compreso. Dipingere è l'unico modo di punteggiare — quindi l'avidità ti
  secca letteralmente nel tuo stesso cimitero
- **Punteggio = foglio dipinto:** la classifica misura la percentuale di carta
  che hai coperto di inchiostro permanente; quando il foglio supera il 60% la
  pergamena è completa e si inizia un nuovo foglio
- **Il foglio è finito:** i bordi uccidono — una linea di seta rosso-marrone
  visibile, cosa rarissima negli .io. L'inchiostro che tocca il bordo colasca
  via per sempre
- **Gocce d'acqua:** si telegrafano con un'ombra che cresce, poi cancellano i
  segni in un raggio (la mappa si auto-pulisce) — e assorbono il tuo corpo se
  ci finisci dentro. Troppo poco inchiostro = dissolvenza
- **Pietre d'inchiostro** ⚫ per re-idratarti e allungare il tratto; **scatto**
  (tieni premuto / SPAZIO / pulsante) che beve il tuo inchiostro
- **🔴 Il sigillo rosso:** se raro, chi lo prende rende istantaneamente
  permanente tutta la propria scia con bonus — il momento "maestro"
- **Cimitero con firma:** quando muori, un sigillo rosso col tuo nome viene
  timbrato dove sei caduto — e resta sul foglio per sempre
- **6 bot calligrafi** (Bokuseki, Kami, Ichimonji…) con AI che dipinge, cerca
  pietre e evita l'inchiostro secco — i loro cadaveri diventano ostacoli
- Grana della carta procedural pattern, bordi che sanguinano, minimappa a
  pergamena, HUD in stile sumi-e

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/` (SVG), `shared/arcade.js` via `../shared/`.

### Viti & Lastre

*Svita, sposta e riavvita: giù tutto.* 🪛

Il puzzle di demolizione alla *Bolts & Nuts* portato al massimo: lastre di legno,
metallo e vetro imbullonate su un pannello, con **fisica rigida vera** quando
cadono (engine OBB scritto a mano: SAT + impulsi sequenziali, solo box).

- **Il loop:** tocca una vite → si svita nel **portaviti** (solo 4 slot!).
  Tocca un foro libero → la vite si riavvita lì. Una lasta senza viti che la
  trattengono **cade con la fisica**: rotola, si ribalta, tonfa sul banco e
  si dissolve in polvere
- **Viti lunghe:** una vite attraversa più laste sovrapposte e le blocca
  insieme — l'ordine di smontaggio è il puzzle
- **Viti coperte:** quelle sotto una lasta superiore non si toccano finché
  non la fai scendere (sono disegnate sotto, si intravedono)
- **Colori:** le viti entrano solo nei fori dello stesso colore — col portaviti
  piccolo, riordinarle è metà del gioco
- **Viti speciali:** 🟠 **arrugginite** (3 tocchi), 🌀 **a molla** (se resta
  l'ultima vite, lancia la lasta in aria!), 🔧 **universale** (entra in qualsiasi
  foro)
- **Materiali:** il **metallo** che cade da forte **fa saltare le viti** delle
  lastre che colpisce → reazioni a catena; il **vetro** si rompe sopra una
  certa velocità d'impatto — nei livelli "vetro protetto" romperlo significa
  perdere
- **Rotelle:** alcune lastre, invece di cadere, scivolano lungo una rotaia
  fino a uscire dal pannello
- **10 livelli** progressivi con par e stelle (3★ se entro il par), selezione
  livelli con sblocco progressivo, record salvato e statistiche nell'hub

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/` (SVG), `shared/arcade.js` via `../shared/`.

### MYCEL

*Sei una rete di ife bioluminescenti nel suolo scuro.* 🍄

L'.io con la meccanica più nuova dell'arcade: il **branching**. Non sei un
serpente — sei un'intera rete fungina che si espande e sopravvive.

- **Più punte, un dito per tendine:** sacrifici 45 di biomassa e far germogliare
  un secondo, terzo, quarto tendine da un punto della rete esistente. Con il
  touch ogni dito ne guida uno (assegnazione alla punta più vicina); col mouse
  tutte seguono il cursore. La camera inquadra l'intera rete e zooma out mentre
  ti espandi
- **Economia della crescita:** mangiare spore da biomassa; crescere la costa
  (0.4/px). Se la biomassa finisce le punte si fermano: il corpo è persistente,
  quello che hai costruito resta sullo schermo
- **Parassiti:** vermi magenta che raggiungono le tue punte e **mangiano la rete
  all'indietro** — se divoram fino alla radice del tendine, la punta muore e con
  lei tutti i rami che ne dipendono (la rete si sfilaccia)
- **Zone tossiche:** chiazze viola pulsanti che drenano biomassa ed erodono la
  punta mentre sei dentro
- **Rocce sepolte:** poligoni procedurali che bloccano la crescita (le punte
  le aggirano con probe-steering)
- **3 bot micelii rivali** (Rizomorfo, Sporencia, MicelioNero) che competono
  per le spore e ramificano anche loro; respawn alla morte
- Estetica bioluminescente: ife con glow, suolo scuro procedurale, spore
  pulsanti; punteggio = lunghezza totale della rete, con record e leaderboard

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/` (SVG), `shared/arcade.js` via `../shared/`.

### STATIC

*Sei un segnale TV pirata intrufolato in una rete di cavi morti.* 📺

Un .io su **grafo**: ti muovi solo lungo i cavi, agli incroci scegli la
direzione. Estetica CRT/VHS integrale: scanline, ghosting cromatico, wobble
VHS, neve, tracking band — tutto procedurale, zero filtri CSS.

- **Pacchetti dati** che scorrono lungo i cavi: mangiali per punteggiare
- **Conquista i televisori:** resta vicino a una TV per 1.2s per sequestrarla
  (+100 punti, +1 segnale). I **2 segnali rivali** (Pirate-7, ANALOG) la
  strangolano per primi se ti distratti
- **Bande di censura:** tre barre nere che ti danno la caccia lungo il grafo
  (pathfinding greedy), sempre più veloci. 3 contatti e il segnale muore —
  conquistare una TV ripristina il segnale
- **📹 Trasmissione locale (opt-in):** col pulsante ON AIR il gioco chiede il
  permesso notifiche e ti avvisa degli eventi (TV conquistate, censure) anche
  a schermo spento; via **BroadcastChannel** le altre schede aperte dello
  stesso browser compaiono in classifica come segnali rivali. Sulla stessa WiFi
  servirebbe un server relay: qui tutto resta onesto e sul dispositivo
- Post-processing a 3 pass: mondo offscreen → ghosting 'lighter' offset,
  scanline pattern, neve ciclica, banda tracking, vignetta

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/` (SVG), `shared/arcade.js` via `../shared/`.

### ALVEARE

*Sei la mente dell'alveare.* 🐝

Il tycoon con la meccanica della **danza dell'oscillazione** reale (waggle
dance): le esploratrici scoprono i campi, tornano all'alveare e **tu disegni
la danza** che istruisce le operaie.

- **Il hook:** sulla tavola del favo disegni un tratto partendo dal centro —
  **l'angolo rispetto al sole** (sempre in alto) codifica la direzione del
  campo, **la lunghezza del tratto** codifica la distanza (scala sugli anelli:
  300/600/900/1200 m). La biologia della waggle dance diventata interfaccia
- **Precisione = reclutamento:** angolo entro ±14° e lunghezza entro ±15%
  arruolano tutte le operaie richieste; errori crescenti mandano una frazione
  crescente di api **nel vuoto** (dove consumano il corpo per niente)
- **Squadre persistenti:** una danza crea un'assegnazione permanente che
  navetta alveare ↔ campo finché non la richiami; i chip in alto mostrano le
  squadre attive con richiamo istantaneo
- **Economia:** miele → covata (api), espansione celle, nuove esploratrici;
  consumo continuo dell'alveare proporzionale alla popolazione
- **Stagioni vere:** primavera/estate raccolgono, autunno scema, e l'**inverno
  blocca il foraggiamento mentre il consumo continua**: le riserve devono
  durare, e peggiorano anno dopo anno
- **Pericoli:** vespai da non inseguire, **rapine di vespe**, campi trattati
  con pesticidi che avvelenano le squadre
- Segnala-tipo: nome del campo, distanza in metri, angolo in gradi "a destra/
  sinistra del sole" — tradurlo in danza è il gioco

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/` (SVG), `shared/arcade.js` via `../shared/`.

### MADRE

*Il tempo reale è l'ingrediente.* 🫙

Casa madre di fermentazioni: kombucha, yogurt, formaggi. Le curve di
maturazione sono valutate da **timestamp reali** — chiudi l'app e i lotti
continuano a invecchiare. L'offline progression ribaltata in rischio.

- **Curva di ogni lotto:** salita → picco → degrado → marciume. Vendere al
  picco è tutto; dimenticare è una decisione economica (il marciume resta in
  cantina come lezione, da scartare a mano)
- **Camere con microclimi:** Dispensa (×1.0), Cantina fresca (×0.6: allunga
  la finestra di vendita), Locale caldo (×1.6: corre verso il picco) — la
  stessa ricetta ha tempistiche diverse a seconda di dove la metti
- **Cicli reali in parallelo:** Kefir al picco in 5 minuti, Kombucha 30
  minuti, Yogurt 4 ore, Formaggio 24 ore, Pecorino riserva 4 giorni
- **Contratti dal daily seed:** ordini della città con quantità, soglia di
  qualità (≥ 65%) e scadenza reale; consegnare alza la reputazione che
  moltiplica i ricompense, i contratti scaduti la mangiano
- **Mercato a random walk:** il moltiplicatore si muove ogni 5 minuti reali,
  anche offline (con ritorno alla media)
- **Report offline:** al rientro, il riepilogo di ciò che il tempo ha fatto:
  lotti al picco, lotti a male, contratti scaduti
- **Notifiche opt-in** quando un lotto entra nella finestra di picco
- UI DOM professionale con mini-grafici canvas delle curve per lotto

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/` (SVG), `shared/arcade.js` via `../shared/`.

### LINEA ROSSA

*La città cresce dove la porti.* 🚇

Metro planner tycoon: la simulazione della domanda urbana usa un **gravity
model** reale (residenti × uffici ÷ distanza), le rotte si calcolano con
**BFS sul grafo delle linee** (fino a 2 interscambi) e la città cresce dove
arriva la tua rete.

- **Tracciamento linee:** tocchi i quartieri in sequenza — stazioni e scavo
  costano, con **geologia variabile** per quartiere
- **Domanda = gravity model:** flussi casa↔lavoro tra ogni coppia di
  quartieri serviti, con onde di pendolari (mattina/sera asimmetriche)
- **Interscambi:** le linee che condividono un quartiere si collegano — la
  BFS assegna ogni coppia di quartieri alla rotta migliore, con penalità
  per cambio linea
- **Capienza vs domanda:** treni acquistabili per linea; barra
  domanda/capienza con allarme sopraffollamento che **blocca la crescita**
  del quartiere
- **Feedback urbanistico:** i quartieri serviti crescono, ne nascono di
  nuovi ai margini, quelli ignorati degradano
- **Tariffa con elasticità:** più alta = più ricavi per passeggero ma meno
  passeggeri
- **Prestiti a interesse** (2%/giorno, rating limitato) e **bancarotta**
  sotto −€ 400
- Onde di pendolari visibili, passeggeri in attesa animati alle stazioni,
  treni in movimento lungo le linee

**6 mappe.** Il menu (`☰ Scegli la mappa`, o il pulsante `❓`) apre la
selezione del livello, con blocchi progressivi e record per scenario:

| # | Mappa | Il problema |
|---|---|---|
| 1 | Città libera | mappa generata, nessun vincolo: si impara sulle regole |
| 2 | Prima linea | un solo centro, `geo` fino a 2.80: la stazione cara la paghi una volta |
| 3 | Il Varo | un fiume e tre ponti: sotto acqua il tunnel costa ×3.2 |
| 4 | Il Porto | due centri di lavoro separati da un bacino: la scorciatoia costa |
| 5 | Meandrica | meandro con due soli ponti, la parte vecchia è la più cara |
| 6 | Metropolix | 14 quartieri, 3 centri, 6 linee massime: la rete che regge tutto |

L'acqua (fiumi e laghi) e i centri storici sono disegnati sulla mappa: un
tracciato che taglia l'acqua costa **×3.2**, e **×1.8** se passa entro 40 px
da un ponte. Ogni livello ha i suoi parametri (cassa iniziale, tariffa,
capienza e costo dei treni, scavo, interesse, tetto di prestito, soglia di
fallimento, cap di linee e quartieri).

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/` (SVG), `shared/arcade.js` via `../shared/`.

### NEBBIA

*L'informazione è merce rischiosa.* 🗺️

Seicento. La gilda vende mappe di un continente avvolto nella nebbia. Il
mondo vero esiste — scogli, secche, isole generati dal daily seed — ma la
**tua carta ha errori di trascrizione**: segni spostati, scogli omessi,
pericoli inventati. Le navi dei clienti navigano sui tuoi segni.

- **Il hook:** uno scoglio dimenticato è un naufragio (−15 ⭐, −€ 150 di
  risarcimento); uno scoglio inventato fa solo perdere tempo alle navi.
  **Sotto-marking uccide, over-marking spreca** — e tu vedi solo la tua mappa,
  mai la verità
- **Esplorazioni:** finanzia spedizioni che rivelano la nebbia e riportano un
  bozzo; i **cartografi** (abilità variabile, assumibili) trascrivono
  applicando gli errori in base alla loro abilità
- **🔍 Verifica:** paga per confrontare mappa e realtà in un'area: correzioni,
  aggiunte e rimozione dei segni fantasma — comprare certezza prima di
  vendere un'edizione costosa
- **Naufragi come inchiesta:** ogni relitto rivela la verità di quel punto
  (la correzione entra in mappa) e lascia il simbolo del relitto
- **Quasi-naufragi** dei navigatori segnalano pericoli sfiorati: −3 ⭐ ma la
  mappa si corregge da sola
- **Contratti dal daily seed:** coprire una baia, vendere N edizioni
- Estetica carta nautica: pergamena con grana, inchiostro, rosa dei venti
  procedurale, relitti segnati a croce, e "HIC SVNT DRACONES" nella nebbia

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/` (SVG), `shared/arcade.js` via `../shared/`.

### ACQUA

*La pendenza è la meccanica.* ⛲

Roma ha sete. La sorgente è sul monte, la città nel vallone: colungi l'acqua
con la **sola gravità** su un profilo altimetrico 1D.

- **Tre tecniche romane:** <b>canale</b> a terra (economico, segue il
  rilievo), <b>arco</b> sopra i valli (costoso, quota costante con pilastri),
  <b>cunicolo</b> sotto le colline (carissimo). Il tipo dipende da DOVE
  tocchi: sopra il terreno, sul terreno, sotto la superficie
- **Sim idraulica onesta:** la portata dell'intero acquedotto è il **minimo
  delle capacità dei segmenti** — un solo tratto malato strozza tutto.
  Pendenza < 0.04 → ristagno e sabbione; > 0.55 → erosione; finestra
  ideale 0.09–0.35 sempre leggibile sul profilo
- **Usura e manutenzione:** calcare, sabbione ed erosione degradano i
  segmenti nel tempo; rotture casuali sui tratti logori; riparazioni
  toccando il segmento
- **Città che cresce al castellum:** decidi TU dove termina l'acqua;
  fontane, insulae, taverne e terme spuntano se la soddisfazione regge e
 pagano tasse proporzionali all'acqua servita
- **Eventi:** siccità (la sorgente a metà), rotture, malcontento che porta
  alla rivolta
- Estetica: profilo altimetrico con cielo romano, archi a tutto sesto,
  acqua animata lungo i canali, etichette di pendenza colorate per
  regime

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/` (SVG), `shared/arcade.js` via `../shared/`.

### FORMICA

*Sei una colonia di formiche su un tavolo di legno.* 🐜

Un .io del territorio con un hook che nessun altro .io ti dà: **camminare
dipinge**. Ogni formica deposita feromone; le celle del tavolo diventano tue,
e rispondono a una sola legge — il territorio abbandonato decade, quello
confinante si scioglie, e rubare è più lento che dipingere sul neutro.

- **Il loop doppio:** dipingi il tavolo (paper.io) *e* ci porti le briciole
  (agar.io). Le briciole depositate nel nido si trasformano in formiche — la
  colonia cresce, dipinge più in fretta, e difende meglio
- **Le razzie notturne:** di notte le colonie nemiche lanciano ondate di
  formiche d'assalto che marciano lungo **i loro feromoni** verso il tuo nido.
  Fuori dal loro territorio rallentano e vagano: la rete di strade è la loro
  autostrada — e tagliargliela è una tattica, non un dettaglio
- **L'anello di difesa:** la tua colonia parcheggiata sul nido respinge
  l'assalto prima che il cratere venga toccato. Una colonia numerosa fa a
  brandelli le formiche nemiche; una colonia lontana torna a casa e trova il
  nido saccheggiato
- **Annessione:** azzerare una colonia converte il suo nido in bottino — e il
  suo territorio diventa carta da rubare. Fuori dal corpo a corpo, le colonie
  muoiono annegate nelle gocce o dissolte nell'inchiostro, e il pericolo
  cancella i feromoni attorno a sé: la mappa si ripulisce da sé
- **Cinque colonie nemiche persistenti**, con nomi da roster congelato
  (`Colonia Rossa_77`, `Colonia Corazzata404`…) e cinque caratteri —
  espansione, agricoltura, razzia, difesa, cautela — che decidono davvero
  come giocano. Una razzia in arrivo le richiama tutte a casa
- **Quattro zone del tavolo** (Angolo del Pane, Macchia d'Inchiostro, Zona
  d'Ombra, Tavola Calda): cosa ci cade, quanto è pericolosa, e di che colore
  è il legno. La tinta sfuma ai confini, non taglia
- **Ciclo giorno/notte** (~108 s): la notte tinge il tavolo, ispessisce la
  vignette, accende l'unica luce calda — il tuo nido — e il ronzio del
  tavolo scende di tono
- Grana del legno procedurale (pattern tileabile), zero asset: formiche a tre
  segmenti con sei zampe animate, briciole irregolari, cristalli di zucchero,
  insetti con le zampe
- HUD in italiano: briciole, formiche, territorio %, posizione, barra del
  nido; minimappa a "tavolo" con il territorio per pixel-cella; banner quando
  una razzia marcia su di te
- WebAudio sintetizzato: scricchiolii delle briciole in combo, corno della
  razzia, tonfo dell'inchiostro, annegamento, drone del tavolo che segue
  giorno e notte

**Files:** `index.html`, `styles.css`, `src/` (`config`, `zones`, `storage`,
`world`, `render`, `player`, `bots`, `audio`, `ui`, `main`), `manifest.json`,
`service-worker.js`, `icons/` (SVG), `tests/sim.test.js`. See
[`formica-pwa/README.md`](formica-pwa/README.md).

### Mustang 1942

*Vertical WWII air shooter, 32 stages × 2 fronts.* 🛩️

Mechanics follow Capcom's *1942* (1984): the aerial loop, POW crates dropped by
destroyed formations, side fighters, Yashichi medals, bomber scoring chains,
sector boss planes and the end-of-stage shoot-down tally. No build step, no
dependencies, no binary assets — every aircraft, tank, warship and landscape is
drawn procedurally, every sound is synthesized.

- **Two fronts:** *Operation Overlord* (Europe 1944, P-51 Mustang vs.
  Luftwaffe) and *Operation Rising Sun* (Pacific 1942, A6M Zero vs. USAAF/USN),
  each 32 stages across eight named sectors
- **Aerial loop** makes you briefly invulnerable but blocks fire — three per
  stage, unspent loops pay 1,000 points each at the tally
- **POW crates:** green = firepower up (2→4 guns), white = smart bomb,
  grey = two side fighters, plus more
- Three difficulty presets (Recruit / Arcade / Ace) remembered between runs
- Continue system that restarts from the last cleared sector, per front

| Action | Touch | Keyboard |
|--------|-------|----------|
| Move | drag anywhere | arrows / `WASD` |
| Shoot | automatic | hold `Z` / `Space` |
| Aerial loop | **LOOP** button | `X` / `Shift` |
| Pause | **PAUSE** button | `P` / `Esc` |
| Start / next stage | tap playfield | `Enter` |

**Files:** `index.html`, `styles.css`, `src/` (`art.js`, `audio.js`,
`data.js`, `game.js`), `scripts/gen-icons.mjs`, `tests/`, `manifest.json`,
`service-worker.js`. See [`mustang-pwa/README.md`](mustang-pwa/README.md) for
the full mechanics manual.

### Farm Tycoon

*Cozy idle farming empire.* 🌾

Manage a growing farm: plant crops, water them, raise animals, survive the
weather and watch coins pile up. Time advances automatically (one in-game day
per few real seconds), so the farm keeps living while you plan.

- Expandable grid (1×1 → 5×5): every cell holds a crop or an animal
- Five crops (corn, wheat, tomato, carrot, potato) with different growth
  times, multi-harvest yields and seed costs (~50% of sell price)
- Animals (chicken, sheep, …) that eat coins and produce goods daily
- Weather that speeds up or slows down growth, milestones and achievements
- Day/night cycle, persistent farm state in `localStorage`, offline play

**Files:** `index.html`, `styles.css`, `game.js`, `manifest.json`,
`service-worker.js`, `icons/`. See
[`virtual-farm-pwa/README.md`](virtual-farm-pwa/README.md) for the full
economy tables.

### Isola Resort

*Costruisci il resort dei sogni su un'isola low-poly.* 🏝️

Un tycoon isometrico in italiano, interamente procedurale: acqua sfaccettata
animata, isola con elevazione, ombrelloni, palme che ondeggiano, barche a vela
che portano ospiti con desideri da soddisfare. Zero build step, zero asset.

- **Loop tycoon completo:** le barche attraccano al molo con ospiti che vogliono
  relax 🏖️, cibo 🍕 o drink 🍹 → costruisci ombrelloni, chioschi, beach bar,
  piscine e cabane per servirli → ogni servizio pagato alza la **reputazione** →
  arrivano più barche (e mance più ricche con reputazione ≥ 80)
- **👑 Ospiti VIP:** turisti d'oro con corona che vogliono solo lusso (piscina o
  cabana), pagano **4×** e valgono +2.5 reputazione — ma se li deludi sono -8
- **🌧️ Meteo dinamico:** sole, nuvole e pioggia (con lampi, tuoni e arrivi -40%)
  che tingono il cielo e cambiano ogni ~35–65 secondi
- **🎯 Catena di 10 missioni** con ricompense automatiche (dal "servi 5 ospiti"
  alla "cabana di livello 3"), mostrate nell'HUD
- **🎵 Musica calypso generativa:** sequencer WebAudio senza file — basso,
  marimba random-walk su scala pentatonica e luccichii; tempo e scala seguono
  notte e meteo (pioggia = più lenta e malinconica). Toggle 🎵 nell'HUD,
  rispetta le impostazioni globali
- **Ospiti vivi:** figure low-poly con camminata animata, bolla-desiderio e
  barra di pazienza; se aspettano troppo vanno via arrabbiati (−reputazione)
- **7 costruzioni** in catalogo, ognuna disegnata a mano in geometria iso
  (tetti a piramide a strisce, ombrelloni, piscine con acqua animata), con **3
  livelli** di potenziamento (capacità e prezzo +25% per livello) e vendita al 50%
- **Espansione dell'isola:** compra gli anelli di sabbia (🔒 sull'acqua) per
  sbloccare nuovi lotti — 650 e 1600 monete
- **🏨 Hotel** con ospiti overnight: entrate passive accumulate durante la
  notte e incassate all'alba (200 × livello a notte), facciata con finestre
  che si illuminano e bandiera sul tetto; conta anche per i guadagni offline
- **🔄 Camera rotabile** su 4 orientazioni (roundtrip matematico verificato:
  proiezione, picking e painter's algorithm seguono la rotazione)
- **💾 Export/import del salvataggio** (file JSON validato) dal menu 💾
- **Ciclo giorno/notte** (~2 min): alba, tramonto, stelle, finestre illuminate
  e fiaccole con alone luminoso; la notte gli arrivi rallentano
- **Eventi giornalieri** da `R2.dailySeed()`: giornata di punta (+50% arrivi),
  acqua colorata (+15% prezzi), festa del villaggio (+25% mance)
- **Guadagni offline** (cap 8h, efficienza 40%) con pannello di benvenuto al
  rientro, **bonus giornaliero** crescente e riepilogo a inizio giornata
- **Camera:** trascina per esplorare, pinch/rotella per zoom, tap per
  costruire o gestire; ghost-preview verde/rosso sul lotto
- **🐬 Delfini** che saltano nell'acqua attorno all'isola e **📸 postcard
  condivisibili** (Web Share API con fallback download, watermark incluso)
- Autosave ogni 6s + su chiusura; statistiche (serviti/persi/guadagni) nel
  dashboard dei record dell'hub

**Files:** `index.html`, `styles.css`, `game.js` (~1000 righe vanilla),
`manifest.json`, `service-worker.js`, `icons/` (SVG), `shared/arcade.js`
tramite `../shared/`.

### BUCIO

*You are a black hole loose over an Italian seaside town.* 🕳️

A 3D eat-'em-up built with **three.js** and bundled with **Vite**: 120 seconds
to devour Portomarina — and your rival holes — before the clock runs out.

- Full 3D low-poly town (procedural buildings, props, sky and sea) you can
  grow through: the bigger you get, the further the camera pulls back
- Rival AI holes that hunt and flee depending on relative size; beat one that's
  smaller and take 3× its score, get eaten and lose points
- **Gold** events worth 500 points that vanish fast
- **Power gems** (from level 5 also a gravity-wave button, `SPAZIO` / ◉):
  turbo, magnetism, double points, shield, instant growth, luck
- Italian-language UI with a tier list, three graphics presets and multiple
  world themes/ambiances
- Installable PWA build (workbox precache) — deployable as static files

**Source:** [`bucio/`](bucio/) — `src/core/` (engine, input, audio, utils),
`src/world/` (terrain, sky, props, themes), `src/game/` (director, AI,
camera, effects, hole, power-ups), `src/ui/` (screens, HUD, joystick).
Built output is deployed under `/bucio/`.

### Snap Cam

*Camera with face lenses & film filters.* 👻

A Snapchat-style PWA: real-time front/back camera with **face lenses**
(MediaPipe FaceLandmarker, 478 landmarks, engine vendored in `snap-pwa/vendor/`)
and a stack of image filters. Snaps live only on your device.

- Face lenses: 🐶 dog, 😎 shades, 👑 crown, 😍 heart eyes, 🐱 cat, 🐰 rabbit,
  🤖 robot, 🤠 cowboy, 😈 devil, 😇 angel, 🦊 fox, 🐼 panda, 🧛 vampire,
  🧙 wizard, 🐝 bee, 🎩 top hat & monocle, 🧔 wig, 🥸 moustache, 🏴 eyepatch,
  🫧 bubbles, plus animated "quiz" lenses that draw a random
  animal/food/mood on your forehead
- Film filters: B/W, noir, sepia, vivid, cold, warm, negative, psychedelic
  (animated), mosaic, vignette, grain, VHS (scanlines), duotone, thermal,
  dream (bloom), neon, cyanotype, solarized, infrared, amber, cross-process
- Frames: light leak, instant film with a date back, 2.39:1 cinema with a
  frame counter, frost, glitch, prism, ticket stub, photo corners, film
  strip, dust, rim light
- **Minigames that use the body**: 🥁 drums (move your head over a pad and
  open your mouth to hit it, tilt for the crash, blink for the hi-hat) and
  🦆 duck (a rubber duck swims across the frame; open your mouth to catch
  it). The sounds are synthesised, so there is nothing to download.
- **Looks**: a lens, a frame and a grade in one tap
- Front/back switching with auto-mirror on the front camera, screen flash
- Shot → caption → save to **Memories** (IndexedDB) / download / share;
  grid viewer with delete and export
- **Import a photo** from the device and run it through the same lens,
  frame and grade; **photo booth**: four shots composed into one strip
- A bottom sheet with the whole catalogue and the favourites, a settings
  panel (countdown, composition guide, haptics, mirror, quality), a
  hold-to-compare button and a thumbnail of the last snap
- Requires HTTPS (GitHub Pages qualifies); first face-lens use fetches the
  ~15 MB engine, then it is cached by the service worker for offline use

**Files:** `index.html`, `app.js`, `filters.js`, `ui.js`, `styles.css`,
`vendor/` (MediaPipe tasks-vision bundle, wasm, models), `manifest.json`,
`service-worker.js`. See [`snap-pwa/README.md`](snap-pwa/README.md).

---

### IRONFALL

**A 3v3 lane MOBA in the Warhammer 40k universe**, and the most mechanically
ambitious thing in this arcade by a wide margin. You command one of eight
champions against three enemy warbands across three lanes on a shattered
cathedral-world: last-hit the wave, break the Bastion Towers, take the
Reliquary, kill the Core.

- **Three lanes, three Towers, two Cores** — a real Summoner's-Rift shape
  compressed for a phone: lanes long enough to matter, a map small enough that
  one screen's worth of camera is a meaningful decision
- **Turret plates** — each Bastion Tower has three plates worth 62 armour
  each. Lose them and the dive window opens. This is the single most important
  number in the game and the reason tower timing is a decision rather than a
  coin flip
- **8 champions across 4 warbands** — Astartes, Warpbound, Tyranid Hive and
  Guard & Grots, each with a passive that changes how you play, not just your
  stat bar
- **13 ability archetypes** — every one of the 32 abilities is *data* plus an
  archetype name. Nothing in the roster has bespoke code, which is why eight
  champions was a fortnight rather than a quarter
- **9 runes, 27 loadouts** — a keystone row, a tempo row and a utility row,
  applied at deployment
- **Doctrine** — a champion unlocks a permanent bonus at 3, 6 and 10 wins with
  it. Light on purpose: no grind
- **12 items, no build paths** — a shop with forty items is a shop nobody
  reads on a phone
- **Three enemy doctrines** — Recruit, Guardsman, Necron Lord. Measured
  last-hit *precision* of 0.777 / 0.809 / 0.831
- **Warp haze instead of fog of war** — unseen enemies are drawn as
  silhouettes. You know something is there; you can't aim at it
- **Isometric faux-3D, no WebGL** — flat-shaded boxes on a linear axonometric
  projection, painter-sorted on one dot-product key, DPR capped at 2, quality
  tier chosen from sampled frame times
- **Four node test suites, no framework** — including a Monte-Carlo balance
  harness that runs AI-vs-AI matches and asserts on shape rather than on exact
  numbers

**Files:** `index.html` · `styles.css` · `manifest.json` ·
`service-worker.js` · `icons/` · `og-cover.png` · `src/` (17 files) ·
`tests/` (4 suites) · `scripts/gen-icons.mjs`

[▶ Play](https://lucagandolfi77.github.io/random2/ironfall-pwa/) ·
[source](https://github.com/LucaGandolfi77/random2/tree/main/ironfall-pwa) ·
[README](ironfall-pwa/README.md)

### PULSE

*A rhythm game with no music files.* 🎵

A four-lane game where the track does not exist until you ask for it. One 32-bit
seed picks the tempo, key, progression, drum pattern and a melodic motif; the note
chart is then read back out of the same melody, so the notes you press always land
on the tune you hear. `#seed=` in the URL reproduces a track exactly.

Audio is synthesised offline in twelve-second chunks and scheduled as each one
finishes, so a 2:49 track is playable in about 450 ms with no files downloaded.
`song.js` and `chart.js` are DOM-free and deterministic, which is what lets the
generator be tested over 500 seeds in Node.

**Files:** `index.html` · `styles.css` · `manifest.json` ·
`service-worker.js` · `icons/` · `og-cover.png` · `src/` (5 files) ·
`sim.test.mjs` · `smoke.mjs` · `tools/make-icons.py`

[▶ Play](https://lucagandolfi77.github.io/random2/pulse-pwa/) ·
[source](https://github.com/LucaGandolfi77/random2/tree/main/pulse-pwa) ·
[README](pulse-pwa/README.md)

### PIXEL CUP '96

*Low-poly arcade football, in a pixel buffer.* ⚽

Five a side, ninety seconds a half, one ball and a crowd that will not shut
up. The picture is **not** WebGL and **not** images: the pitch, the players,
the ball, the goal and the crowd are triangles drawn by hand into a 320×180
byte buffer that the browser scales up with nearest-neighbour sampling.

- **Flat shading.** Every face has one colour, computed from its normal
  against a single light and then quantised to a limited palette. That is
  what makes the geometry read as low-poly rather than as a small smooth
  render.
- **A real depth buffer.** The rasteriser tests 1/d, and 1/d is an exact
  affine function of the screen position across a plane, so interpolating it
  across a triangle is not an approximation. Pitch, players and goalposts
  share one buffer with no sorting at all.
- **One copy of the rules.** `src/core.js` has no DOM in it and is loaded by
  the browser *and* by the Node tests, so the tests exercise the game you
  actually play.
- **Three modes:** a quick match, an eight-team knockout cup whose progress
  survives a closed tab, and a penalty shoot-out settled on a sweeping
  marker. Three difficulty levels, a pause sheet with a way out of the
  match, and switches for the sound, the music and the vibration.
- **Every sound is synthesised.** The crowd is filtered noise, the whistle is
  two detuned squares, the music is a sixteen-step square-wave sequencer.
  There is not one audio file in the folder.
- **Crosses and headers.** A cross is a high ball over the defence and into
  the box, on its own key; above 1.15 units the ball can only be headed,
  never carried, so an aerial chance is a real chance. The heads-up display
  tells you when the ball is yours to head.

The commentary is in Italian, because the terraces always are: *"Che gola!"*,
*"Che sprechi!"*, *"Attenzione al contropiede!"*.

**Files:** `index.html` · `styles.css` · `manifest.json` ·
`service-worker.js` · `icons/` · `og-cover.png` · `src/` (9 files) ·
`tests/` (3 files) · `smoke.mjs` · `tools/` (3 files)

[▶ Play](https://lucagandolfi77.github.io/random2/pixel-cup-pwa/) ·
[source](https://github.com/LucaGandolfi77/random2/tree/main/pixel-cup-pwa) ·
[README](pixel-cup-pwa/README.md)

### CENSUS

*A game about sampling.* 📋

You are the chief enumerator of a city nobody has counted, and nobody will
tell you the population until after you have committed a number to paper. You
have a purse of a few hundred pounds, a deadline, and the city divided into
wards.

- **The arithmetic is real.** The margin of error is `z·√(p(1−p)/n)` over the
  households that answered, combined in quadrature with the sampling error in
  the mean household size. Nothing is faked to flatter the game.
- **Non-response is selective, not random.** The wards that refuse are
  systematically the ones with larger households, so a sample from them reads
  low — and no number of extra enumerators fixes it while the bias is there.
- **Wards you never visit are omitted from your total**, and the page says
  which ones. A hole in the return is named, not filled in with a guess.
- **Five levels, 1841–1881**, from a first rough count to a ten-ward census
  with a fifth of the houses reachable.
- Measured coverage: a stated 95% interval contains the truth about **92%** of
  the time when nothing biases the sample, and about **75%** when non-response
  is selective. That gap is the game.

```bash
python3 -m http.server 8080
# open http://localhost:8080/census-pwa/
```

## The tools

### Territorio

*Paper.io-style arena vs bots.* 🚩

A grid-territory .io game on an 80×80 arena: leave a trail outside your land,
close a loop and claim everything inside (enemy cells included). Cross
someone's trail and they're eliminated — cross your own and it's over.

- 4 bots with a 3-mode AI (expand / return home / ambush) that plan loop
  closures, avoid danger and cut your trail when you're careless
- Live leaderboard, kill feed, capture flashes and a cached minimap
- Touch joystick (drag anywhere) + WASD/arrows, records in `localStorage`
- **Multiplayer-ready engine**: every player exposes only `input.dir`; phase 2
  swaps bots for remote players over Supabase Realtime (host-authoritative,
  quantized snapshots) without touching the game rules
- Simulation is dependency-free and unit-tested: ring capture (BFS), trail
  cutting, respawns and a 300-second stress run all pass in Node

### STATS

*Your arcade, measured.* 📊

Every game in this repo already writes your records, playtime and run history
to this device — STATS reads all of it and draws it. It makes the
"zero trackers" claim checkable: the data is on the device, and the page can
hand it to you as JSON.

- **Score distributions** — histograms per game and across the whole log, with
  the mean marked and the median stated
- **Best over time** — the running maximum, which is the number a player
  actually cares about
- **When you play** — an hour-of-day by day-of-week heatmap, plus hour and
  weekday marginals
- **Library** — every game with runs, its best, mean and median, and how much
  time has gone into it
- **Records** — the per-game save files as they are, with no shared schema
- **Data** — export/import JSON, and an erase button that wipes the run log
  while leaving the games' own records alone

Charts come from `shared/chart.js`, a zero-dependency Canvas 2D library with
line, area, bar, histogram, scatter, boxplot, heatmap and sparkline primitives,
DPR-aware and following the hub's light/dark toggle.

```bash
python3 -m http.server 8080
# open http://localhost:8080/stats-pwa/
```

### EADS Studio

A **Python** desktop application (not a web game) for embedded C/C++ work:
a Flask-served studio UI that drives the whole analyze-build-debug loop.

- **Project registry** (`projects.json`) with per-project toolchains and paths
- **Source explorer**: file tree, preview with size/binary guards
- **Build** jobs (make/cmake) with live SSE event streams and cancellation
- **Binary inspection**: ELF sections/symbols, `addr2line` mapping
- **Static analysis** profiles (Cppcheck) and **stack usage** reports
- **Doxygen** docs generation and on-device **run** sessions (serial/runner)
- **GDB/MI debugging** backend: start sessions, send commands, stop

Run it locally:

```bash
cd EADS
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
python app.py
```

**Source:** [`EADS/`](EADS/) — `studio/web.py` (REST + SSE API),
`studio/services/` (build, gdbmi, analyze, inspect, runner, source, binaries),
`tests/` (pytest suite).

---

## The portfolio page

`portfolio/` is the same work presented for a different reader. The arcade is
a shelf of things to play; the portfolio is nine case studies written as
*problem → constraint → approach → result*, with the numbers attached:

**CENSUS** (a claimed 95% interval that covers only ~75% under bias) ·
**STATS** (a dashboard that labels its own heatmap an estimate) ·
**BUCIO** (~1,800 objects in ~30 draw calls) · **SECTOR 7** (a two-pool
damage model, 20k lines, no build) · **IRONFALL** (a draw-call budget test) ·
**PULSE** (a rhythm game with no audio files) · **THE BALANCE LAB** (5,000
seeded sessions measured) · **THE SHARED ENGINE** (1,655 lines used by 36
projects) · **EADS STUDIO** (a gdb/MI debugger over a serial link).

There is also a one-page CV at `portfolio/cv.html`: it prints to exactly one
A4 sheet, and its figures carry the same machine-checked claims as the
portfolio's. Around it: `portfolio/verify.html` (the ledger),
`portfolio/audit/report.html` (the self-audit), `portfolio/now.html` (what is
shipping), `portfolio/notes/` (three bilingual essays) and
`portfolio/404.html`.

It is bilingual EN/IT with the language chosen by the browser on first visit.
Both languages live in the markup as sibling elements and CSS picks one, so
the page is complete and crawlable with JavaScript off — see
[`portfolio/README.md`](portfolio/README.md) for why, and for the three
placeholders that need filling before it goes in front of a client.

Two details worth knowing if you touch it:

- It is the **only page here that loads no shared library**. `shared/arcade.js`
  would cost ~17 KB for one media query and would tie the folder to this
  repository's layout, which is the only thing stopping the folder from being
  copied to its own domain as-is.
- Its screenshots in `portfolio/shots/` are **generated**, not drawn by hand:
  `portfolio/scripts/shots.mjs` drives a Chromium over the DevTools Protocol
  using only Node built-ins, and puts each app into a state worth
  photographing — the published CENSUS return, a seeded STATS profile, a
  sector in flight — because a title screen proves nothing.

### The self-audit

`tools/audit/` loads every project in this repository in a real browser and
checks it there: contrast ratios computed with the WCAG formula, tap targets,
accessible names, labels, heading order, duplicate ids, and the two
navigation timings from a cold cache. The report is committed at
`portfolio/audit/report.html` **with the failures in it** — a self-audit that
finds nothing is a decoration.

```bash
node tools/audit/run.mjs            # both audits, then the report
```

It skips cleanly when there is no browser, so it can never be the reason a
build goes red.

### The claims ledger

Every number the portfolio states is recomputed from this repository by
`tools/verify.mjs` and compared with the number the page actually renders.
If one drifts, CI goes red. The ledger is published at
`portfolio/verify.html`, and each row carries the command that reproduces its
number.

```bash
node tools/verify.mjs --check   # exit 1 if any claim drifted
```

Numbers on the page carry a `data-claim` attribute, so the check is against
the page itself rather than against a copy of the page. Numbers written in
prose are covered by a stale-literal lint instead. See
[`portfolio/README.md`](portfolio/README.md#the-claims-ledger) for how to add a
claim.

## The hub page

The repo root doubles as the arcade's home page
([`index.html`](index.html)) — a single self-contained file listing every
project. It is itself an installable PWA.

**Graphics**

- Animated aurora background (two drifting conic-gradient blobs) plus a live
  **canvas starfield** with depth parallax that follows your pointer
- Pointer-tracked radial sheen and a subtle **3D tilt** on each card (pointer
  devices only)
- Shimmer sweep across every game tile, animated gradient title, pulsing
  kicker dot
- Staggered scroll-reveal of cards via `IntersectionObserver`
- Animated count-up stats strip (games / offline / binary assets / trackers)

**Features**

- **Live search** across names, taglines and tags (press `/` to focus)
- **Category filters**: All · Shooters · Arcade · Casual · Apps · Tools — the
  choice persists in `localStorage`
- 🎲 **Surprise me**: picks a random playable game, announces it on the button,
  then jumps
- **Install button** powered by `beforeinstallprompt` (hidden until the
  browser offers installation)
- **Online/offline pill** in the corner that flips to
  "Offline — games still work"
- Hub service worker (`sw.js`, network-first for navigations,
  stale-while-revalidate for the shell) — registered with **relative paths**, so
  it works both at a domain root and under GitHub Pages' `/random2/` subpath
- **🏆 Your records dashboard**: reads each game's high score from device
  storage and shows it on the hub, with a "last played" timestamp and a
  one-click reset (currently Snake, King Shot, Plane Shooter, Slot Machine and
  LUMEN — the games that write `random2-last-played`)
- **🌓 Dark/light theme toggle**, persisted and seeded from
  `prefers-color-scheme` on first visit; `theme-color` meta follows along
- **↗ Share button**: Web Share API on mobile, clipboard fallback with a toast
  everywhere else
- **🔊 / 📳 Global settings toggles** (sound & haptics) stored in the shared
  `random2-settings` blob — every game that loads `shared/arcade.js` respects
  them
- **🎬 Live tile previews**: each card's tile runs a tiny animated scene
  (snake circling its food, slot reels, a black hole feeding…) on one shared
  rAF loop — paused offscreen, hidden tabs and `prefers-reduced-motion`
- **⏱️ Time played** stat (aggregated from the games that track it) and
  today's **Snake daily-challenge seed** shown in the hero
- **⌨️ Keyboard grid navigation**: arrow keys / Home / End walk the visible
  cards, Enter launches; filter results are announced via an ARIA live region
- **Custom [`404.html`](404.html)**: a black hole ate your URL — auto-redirects
  to the correct hub root (project pages included) with a countdown

**Quality**

- `prefers-reduced-motion` disables every animation (starfield paints once)
- Safe-area insets respected on notched iPhones (`env(safe-area-inset-*)`)
- Focus-visible outlines, ARIA roles/labels, semantic landmarks, no layout
  shift; works without JS (cards simply show, filters hide)

---

## Architecture

```
random2/
├── index.html              # hub/landing page (self-contained, own SW: sw.js)
├── manifest.webmanifest    # hub manifest
├── sw.js                   # hub service worker (shell only, relative scope)
├── shared/
│   └── arcade.js           # micro-library: audio, particles, storage, settings
├── icons/                  # hub icons (PNG 192/512)
├── apple-touch-icon.png
├── .github/workflows/pages.yml   # build + deploy pipeline
│
├── snake-pwa/              # ┐
├── king-shot-pwa/          # │ plain static PWAs — same shape:
├── plane-pwa/              # │   index.html · styles.css · game.js
├── slot-pwa/               # │   manifest.json · service-worker.js · icons/
├── virtual-farm-pwa/       # │   (+ <script src="../shared/arcade.js"> in the simple four)
│                          # ┘
│
├── mustang-pwa/            # static PWA, code split into src/ modules + tests
├── lumen-pwa/              # static PWA, src/ modules + headless sim test
├── snap-pwa/               # static PWA + vendored MediaPipe engine
├── resort-pwa/             # isometric tycoon (Italian UI), vanilla Canvas 2D
│
├── bucio/                  # three.js game, Vite project → dist/ on deploy
│   ├── src/                #   ES modules (core, world, game, ui)
│   ├── public/             #   icons & screenshots
│   └── vite.config.js
│
└── EADS/                   # Python/Flask desktop tool + pytest suite
```

Design rules that keep the repo boring (in a good way):

- **No frameworks** for the games: each is vanilla JS on a 2D canvas, with a
  tiny shared shape — `init / gameLoop / update / draw / localStorage` — so any
  one of them can be read top-to-bottom in one sitting.
- **`shared/arcade.js`** is the one file games may share: sound, particles,
  storage, settings, haptics, play-time tracking, daily seed + seeded RNG and
  the iOS install-coaching overlay. It is a plain script (no modules)
  exposing a single `window.R2` global, and each game's service worker
  precaches it so offline play keeps working.
- **Relative paths everywhere** in the static games, so they run identically at
  a domain root, under `/random2/`, or from any subfolder.
- **One service worker per game**, each with its own cache name; the hub SW
  only owns the hub shell and never intercepts sub-game traffic.
- **State is device-local only** — `localStorage` for scores/settings,
  `IndexedDB` for Snap Cam photos. There is no server-side state anywhere.

## Deployment (GitHub Pages)

Pushes to `main` trigger [`.github/workflows/pages.yml`](.github/workflows/pages.yml):

1. **Checkout** the repo.
2. **Build BUCIO**: `npm ci && npm run build` inside `bucio/` (Node 20, npm
   cache keyed on `bucio/package-lock.json`).
3. **Assemble the site**: rsync everything except `.git`, `.github` and the
   BUCIO *sources* into `_site/`, then copy `bucio/dist/` → `_site/bucio/`
   and `touch _site/.nojekyll` (so GitHub serves paths starting with `_`).
4. **Upload + deploy** the artifact with `actions/upload-pages-artifact` and
   `actions/deploy-pages`.

Concurrency is grouped (`group: pages`), so a rapid series of pushes never
races — the newest deploy wins. The published URL is
<https://lucagandolfi77.github.io/random2/>.

## Local development

| Project | Command | URL |
|---------|---------|-----|
| Hub + all static games | `python3 -m http.server 8080` (repo root) | <http://localhost:8080> |
| BUCIO (dev) | `cd bucio && npm install && npm run dev` | Vite dev server |
| BUCIO (prod build) | `cd bucio && npm run build` | serves `bucio/dist/` |
| EADS | `cd EADS && pip install -r requirements*.txt && python app.py` | Flask UI |

Notes:

- Service workers only register on `https://` or `http://localhost` — opening
  `index.html` via `file://` will not register them (Mustang additionally needs
  a real origin because of root-absolute asset paths).
- If a game seems stuck on an old version after a deploy, bump its
  `CACHE_NAME` (or the hub's `sw.js` version) and hard-reload once; SW updates
  activate on the next navigation.

## Adding a new game

1. Create `my-game-pwa/` with the standard shape:
   `index.html`, `styles.css`, `game.js`, `manifest.json`,
   `service-worker.js`, `icons/` (192 + 512).
2. Use **relative paths** and give the SW a unique `CACHE_NAME`.
3. Add Apple tags + safe-area viewport so it behaves on iPhone.
4. Add a card to the root `index.html` with `data-playable="my-game-pwa/"`,
   `data-tags="..."`, an emoji tile and a gradient pair.
5. Add a row to the table in this README (and a section if the game deserves
   one).
6. Push to `main` — Pages deploys automatically, and CI (see below) runs the
   static checks. Done.

## Roadmap

Everything below is a real TODO, tracked here. I concept tycoon non ancora
implementati (NEBBIA, ACQUA, STYX) sono specificati in
**[TODOs.md](TODOs.md)** — MADRE e LINEA ROSSA sono stati implementati. Check something off by opening
a PR — keep this list honest.

### ✅ Done

- [x] **FORMICA** — new game: ant-colony .io on a wooden table where walking
      paints pheromone territory. Dual loop (paper.io painting + agar.io
      carrying): crumbs deposited in the nest convert into workers, so the
      colony grows, paints faster and defends better. Night raids march along
      the raider's own pheromone roads toward your nest and slow down offroad
      — cutting their roads is a tactic. Parked colony = defense ring outside
      the crater; the bigger the colony the harder it bites. Annex a colony
      and its nest becomes loot. Water drops drown and erase pheromones, ink
      dissolves and burns territory, so the map self-cleans. 5 persistent
      rival colonies with 5 blended characters (expansion / farming / raiding
      / defense / caution) that all come home when a raid is incoming; 4
      tabletop zones with tinted wood edges; ~108s day/night cycle with drone
      tracking. Procedural wood-grain pattern, three-segment six-legged ants,
      fully synthesised WebAudio. Headless sim suite: 65 checks (territory
      paint & steal & decay, crumb economy, hazard lethality, clash maths,
      annexation, raid defense & nest crash, day/night, grudges, ecology over
      5 seeds, performance)
- [x] **Isola Resort Tycoon wave 3:** hotel con entrate notturne, camera
      rotabile su 4 orientazioni (roundtrip verificato su tutte le celle),
      export/import del salvataggio, tempo musicale scalato su meteo/notte
- [x] **ACQUA** — Roman aqueduct engineer: 1D altimetric profile, honest
      hydraulics (flow = min of segment capacities), slope bands with
      stagnation/erosion, ground channels + arches + tunnels, lime decay,
      breaks, droughts, city growth at the castellum
- [x] **NEBBIA** — cartographer guild: truth vs mis-transcribed guild map,
      expeditions into fog, cartographer skill driving transcription errors,
      navigator wrecks revealing the truth, verification purchases
- [x] **LINEA ROSSA** — metro planner tycoon: gravity model demand, BFS
      routing with transfers, urban growth feedback, fare elasticity, loans
      with interest and bankruptcy
- [x] **MADRE** — fermentation tycoon on real timestamps: maturation curves
      that keep running with the app closed, rooms as speed multipliers,
      daily-seed contracts, drifting market, offline report, peak notifications
- [x] **ALVEARE** — bee-tycoon with the waggle dance drawn by hand: angle
      from the sun encodes direction, stroke length encodes distance; seasons
      with lethal winters, brood/comb economy, wasp raids and pesticide events
- [x] **SINI** — new game: living-brushstroke .io (sumi-e) with the wet/dry
      ink mechanic, permanent lethal calligraphy, finite paper edges, erasing
      water droplets, red seal stamp graveyard, painting-percentage scoring,
      spatial-hash collisions and 6 painting bots
- [x] **Isola Resort Tycoon wave 2:** ospiti VIP (4× payout), meteo dinamico
      con tuoni, catena di 10 missioni, musica calypso generativa (WebAudio
      senza file), delfini, postcard condivisibili
- [x] **SECTOR 7** — new game: low-poly space combat (Darkorbit-style)
      single-player vs NPC. Hand-rolled facet-mesh renderer on Canvas 2D (no
      WebGL): two primitives, flat-shaded through a sheared oblique
      projection, per-face lighting in one dot product. Energy is the upgrade
      currency and dies with the ship; crystals are banked on pickup and drive
      NPC tier escalation. Docking station with five upgrade tracks and a
      launch fee. 8 NPC tiers, destructible rock fields, energy crates,
      thumb-anchored stick + pads + soft auto-aim. Fixed pools throughout, DPR
      capped at 2, quality auto-detected from measured frame time. 284 headless
      checks across three suites, no build step, no dependencies
- [x] **Isola Resort Tycoon** — new game: isometric low-poly resort manager
      (Italian UI) with guest desires, reputation, upgrades, island expansion,
      day/night, daily events, offline earnings
- [x] Snake **daily challenge**: third game mode driven by `R2.dailySeed()` +
      a mulberry32 seeded RNG (food, power-ups and obstacle placement), with a
      per-day high score in `snake-daily`; the hub shows the live seed
- [x] Slot: **progressive jackpot meter** (grows with every spin, triple 💰
      pays it out and resets it, persisted in `slot-jackpot`) plus **5 free
      spins** on triple ⭐ with auto-play
- [x] Hub: **time played** stat — `R2.trackPlaytime()` accumulates
      device-local seconds per game (visibility-gated, one write per 5 s)
- [x] **iOS install coaching**: `R2.installHint()` shows a dismissible
      "Share → Add to Home Screen" bar in iOS Safari when not installed
      (no `beforeinstallprompt` there), remembered across all games
- [x] Shared micro-library [`shared/arcade.js`](shared/arcade.js): WebAudio
      blip engine, particle system, JSON storage helpers, global
      sound/haptics settings and play-tracking — the four simple games now
      load it instead of carrying ~90 copied lines each
- [x] Live animated mini-previews rendered inside hub card tiles — later
      removed during the LUMEN hub rework (re-add is on the Planned list)
- [x] Hub: keyboard grid navigation (arrows / Home / End / Enter) + ARIA live
      region announcing filter results
- [x] Shared settings blob `random2-settings` (sound / haptics) with hub
      toggles; games honor it via `R2.getSettings()`
- [x] Hub: records dashboard aggregating per-game high scores from device
      storage, with last-played timestamps and reset
- [x] Cross-game tracker: Snake / King Shot / Plane / Slot write
      `random2-last-played` so the hub can show "last played"
- [x] Hub: dark/light theme toggle (persisted, `prefers-color-scheme` seeded,
      dynamic `theme-color`)
- [x] Hub: share button (Web Share API + clipboard fallback + toast)
- [x] Custom `404.html` with subpath-aware auto-redirect
- [x] CI workflow (`.github/workflows/ci.yml`): ESM-aware `node --check` over
      every JS file, JSON validation of all manifests, manifest-link audit for
      every PWA directory
- [x] Games: `navigator.vibrate` haptics on shoot/eat/hit/win/game-over
      (Snake, King Shot, Plane Shooter, Slot Machine)
- [x] Hub: category filters + live search + surprise-me launcher

### 🚧 In progress

- [ ] Extending the shared library to the rest of the arcade (Mustang, Farm,
      BUCIO still own their engines)

### 🗺️ Planned

- [ ] Hub: re-add live tile previews (dropped during the LUMEN rework)
- [ ] Hub: extend theme sync so games follow the hub's dark/light choice
- [ ] Hub: live daily-challenge standings (compare `snake-daily` highs
      across… friends? a static JSON? needs a design)
- [x] **MYCEL** — the fungal network .io: branching tendrils (one finger per
      tip, up to 4), biomass economy, parasites that devour the network,
      toxic zones, buried rocks, bioluminescent hyphae
- [x] **STATIC** — pirate broadcast .io: graph-based movement on dead cables,
      flowing data packets, TV seizure, hunting censor bands, full CRT/VHS
      post-processing, opt-in local broadcast (Notifications + BroadcastChannel
      across tabs)
- [ ] Plane: end-of-wave boss encounters with attack patterns
- [ ] King Shot: moving targets, wind drift and a duel-vs-AI mode
- [ ] Farm: save-file export/import (download/upload JSON) for device migration
- [ ] Mustang: third front (Korea, 1951) reusing the existing stage engine
- [ ] Lighthouse CI gate (perf ≥ 90, a11y ≥ 90) wired into the deploy workflow
- [ ] Opt-in settings sync across games via a single `random2-settings` blob:
      theme preference inside games, difficulty presets, reduce-motion override
- [ ] Snap Cam: video lenses (short clips) on top of the photo pipeline

## CI

Besides the Pages deploy, every push/PR runs
[`.github/workflows/ci.yml`](.github/workflows/ci.yml):

1. **JS syntax check** — `node --check` over every `.js` file (excluding
   `node_modules`, `.venv`, `vendor/`, `dist/`, EADS), automatically switching
   to module mode for files that use `import`/`export`.
2. **Manifest JSON check** — every `manifest.json` / `*.webmanifest` must parse.
3. **PWA audit** — every directory that ships a manifest must have an
   `index.html` that links it.

## Privacy & performance

- **No accounts, no analytics, no ads, no network calls** in any game —
  the only optional network fetch is Snap Cam's first-time MediaPipe download.
- Everything visual is generated at runtime: emoji glyphs, canvas drawing and
  CSS gradients replace sprites, so each game ships in a few tens of KB.
- Audio is synthesized with the WebAudio API (oscillators + gain envelopes),
  so there are no sound files either.
- Storage limits: `localStorage` (a few KB) for progress; Snap Cam uses
  IndexedDB for photos and never uploads them.
- The starfield, tilts and animations all pause or flatten under
  `prefers-reduced-motion`, and canvases pause when the tab is hidden.

## Browser support

| Browser | Status |
|---------|--------|
| iOS Safari 16.4+ | ✅ target platform (safe-areas, standalone, 16.4+ needed for Snap's MediaPipe) |
| Chrome / Edge (desktop & Android) | ✅ |
| Firefox (desktop & Android) | ✅ |
| Safari macOS | ✅ (Add to Dock on 17+) |

`color-mix()` and `100dvh` are used on the hub; on very old browsers those
degrade gracefully (no sheen tint / slightly different heights).

## Troubleshooting

- **"Add to Home Screen" missing on iPhone** → you must open the game in
  Safari (not an in-app browser).
- **Game won't load assets after a redeploy** → the old SW is still
  controlling the tab; close and reopen the game once, or bump its cache name.
- **Camera black in Snap Cam** → check HTTPS and camera permission; also make
  sure no other tab is holding the camera.
- **BUCIO 404 under `/random2/bucio/`** → the Vite `base` is configured for the
  Pages subpath; if you self-host at a domain root, rebuild after adjusting
  `vite.config.js`.
- **EADS can't find the toolchain** → set the compiler/debugger paths in the
  project registry (`projects.json`).

## FAQ

**Is everything really offline?**
After the first load, yes — each game's service worker precaches its shell.
Snap Cam needs one extra online visit to fetch the face-tracking engine.

**Where are my high scores stored?**
On your device only (`localStorage`/`IndexedDB`). Clearing site data resets
them; nothing ever leaves the device.

**Can I host this myself?**
Yes. It's all static files (plus one Vite build). Any static host works; for
Snap Cam the host must serve HTTPS.

**Why emoji instead of sprites?**
They're crisp on every DPI, cost zero bytes, and fit the "procedural, no
binary assets" constraint. Mustang 1942 is the exception in spirit: its art is
procedurally *drawn* on canvas rather than being emoji.

---

Made for fun. Fork it, steal the patterns, ship your own game.
