# 🥊 RAGDUEL.IO

> one thumb · one ragdoll · one winner

A physics dueling game in the spirit of stickman .io mobile games, built as an
offline-first PWA. Your stickman is a verlet ragdoll with real momentum — every
attack is a full-body launch, every death is a comedy.

![tier](https://img.shields.io/badge/tiers-5-orange) ![duels](https://img.shields.io/badge/ladder-5_duels-yellow) ![deps](https://img.shields.io/badge/dependencies-zero-brightgreen)

## 🎮 How it plays

| Input | Action |
|---|---|
| **Hold & drag, release** | Aim & fling your whole body fists-first (longer hold = harder hit) |
| **Quick tap** | Jump / dodge |
| **A / D** (desktop) | Manual footwork |
| **SPACE** (desktop) | Jump |
| **Hold S** (desktop) | Charge & auto-aim fling toward the rival |
| **Walk into crates** | Grab brooms, traffic cones… benches |

- **Ladder:** win 5 duels in a row to rank up through 5 tiers
  (PARKING LOT → NEON DOJO → TOXIC YARD → ROOFTOP 3AM → THE VOID).
  Lose once and the ladder resets.
- **Weapons drop from the sky** with parachutes. They have reach, damage and
  durability — benches hit like a truck and shatter in two swings.
- **Rivals remember:** every defeated bot joins your trophy wall and may return
  as a ☠ **revenge match**.
- **👥 2P versus:** first to 3 wins on one screen — see below.
- Bots are powered by the same physics: they telegraph (arm winds up), fling,
  whiff, back off, go for weapon crates, and get knocked flat just like you.

### 👥 2P local versus — first to 3

Two players, one device:

- **Touch:** the screen splits — P1 plays the **left half**, P2 the **right half**.
  Drag to aim & fling, tap to jump. Full multi-touch, so both can charge at once.
- **Keyboard:** P1 = **A / D / W** + hold **S** to fling · P2 = **◀ ▶ ▲** + hold **▼** to fling
  (flings auto-aim at the rival; hold longer = harder hit).
- Equal stats, fair fight. The arena **re-themes every duel**, weapon crates drop
  for whoever gets there first, and a rematch is one tap away.

## 🕹 Menu

The main menu is a live **demo arena** — two bots duel behind the UI, forever.

## 🧠 Tech

- `sim.js` — pure simulation, zero DOM: verlet ragdolls (11 points, 11 distance
  constraints + pose muscles), a stand-up muscle system (knocked-down fighters
  fold their legs back and rise), weapons, crate drops, bot AI state machine,
  and a 2P-versus match state (win pips, first-to-3, match reset).
  Tested headlessly by `sim.test.mjs` (`node sim.test.mjs`).
- `game.js` — Canvas 2D renderer with hit-stop, screen shake, KO slow-mo +
  camera zoom, particles, damage floaters, and a WebAudio synth (no audio
  assets).
- Zero dependencies, zero build step, zero network after first load.

## 📱 PWA features

- Installable (fullscreen, landscape) with SVG icons
- Service worker: cache-first app shell, offline duels forever
- Progress persisted in `localStorage` (best tier, trophy wall, sound, both player names)
- Haptics via the Vibration API, auto-pause on tab switch
- First-run hints (fling / jump / versus controls) taught in-round

## 🎨 Palette

Player is **electric yellow** on dark navy; enemies rotate through neon
pink / orange / violet / red. Each tier re-themes the arena.
