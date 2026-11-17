# Lucky Seven — Slot Arcade

> Fifteen machines. Three pay systems. A dozen mechanics. Four progressive
> jackpots. Twelve play modes, a nine-stage quest campaign, dedicated vector
> symbol art and a full effects system — one installable, offline-first arcade
> with no build step and no dependencies. Every cabinet, reel, symbol and
> effect is drawn on canvas; nothing is fetched from the network at runtime.

**Play it:** <https://lucagandolfi77.github.io/random2/slot-pwa/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/slot-pwa/
```

---

## The roster

Pick a machine in the **lobby** (🏠 or `H`). Machines unlock with VIP level;
all fifteen are available at VIP 11. One shared wallet and one set of global
jackpots span the whole arcade.

| # | Machine | Grid / pays | Signature mechanics | VIP | Volatility | RTP* |
|---|---|---|---|---|---|---|
| 1 | 🎰 **Lucky Seven** | 5×3 · 20 lines | Cascades, jackpot wheel, bonus | 1 | Medium | ~92% |
| 2 | 7️⃣ **Neon Retro 777** | 3×3 · 1–5 lines | Gamble, bonus buy, jackpot wheel | 1 | Very High | ~87% |
| 3 | 🔺 **Pharaoh's Fortune** | 5×3 · 25 lines | Mystery symbols, expanding wilds | 2 | High | ~85% |
| 4 | 🪐 **Nebula Nine** | 5×4 · 243 ways | Ways pays, stacked wilds, multiplier ladder | 3 | High | ~96% |
| 5 | 🍬 **Sugar Rush** | 6×5 · clusters | Cluster pays, tumbling, symbol upgrades | 4 | High | ~90% |
| 6 | 💎 **Vault Breaker** | 3×3 · 5 lines | Hold & Win respins with coin values and jackpots | 5 | Medium | ~98% |
| 7 | 🐚 **Atlantis Deep** | 5×3 · 20 lines | Sticky wilds in free spins, scatter respins | 6 | Medium | ~92% |
| 8 | ⚔️ **Samurai Spirit** | 5×3 · 15 lines | Shifting wild, gamble, bonus buy | 7 | High | ~91% |
| 9 | 🍸 **Bar Blu di Luca Zheng** | 5×3 · 20 lines | Neon drinks, cascades, jackpot wheel | 1 | Medium | ~98% |
| 10 | 🚲 **Giro dei Bar** | 5×3 · 25 lines | Pub-crawl bonus, gamble, bonus buy | 1 | High | ~97% |
| 11 | 🏀 **Armata Gialloblù** | 5×4 · 243 ways | Fulgor Fidenza fans, sticky wilds, multiplier ladder | 8 | High | ~97% |
| 12 | 🐰 **Sinibbio Reale** | 3×3 · 5 lines | Royal Hold & Win coins and jackpots | 9 | Medium | ~99% |
| 13 | 🕵️ **Giardino Agente Zero** | 6×5 · clusters | Mystery symbols, upgrades, tumbling clusters | 10 | High | ~98% |
| 14 | 👑 **Principina a Mare** | 5×3 · 20 lines | Seaside cascades, scatter respins, jackpot wheel | 11 | Medium | ~93% |
| 15 | 💎 **Cristallo 3D** | 5×3 · 20 lines | Real Three.js WebGL cabinet, gem cascades, jackpot wheel | 6 | High | ~95% |

The first four machines are free from VIP 1; Cristallo unlocks at VIP 6, then
Armata, Sinibbio, Agente Zero and Principina at VIP 8–11. The VIP ladder now runs from **Rookie** to
**Icon** across 11 levels.

\* Measured by `node scripts/balance.mjs 20000`, a seeded Monte Carlo of the
full game loop for each machine (line/cluster/ways wins, cascades, scatters,
free spins, bonuses and jackpots). Treat these as estimates, not guarantees.

## Play modes

The lobby has twelve tabs: **Play, Daily, Tournament, Spin Rush, Bonus Hunt,
Boss Battle, Jackpot Chase, Cascade Challenge, Mystery Roulette, High Roller,
Quests, Profile**.

- **Play** — standard spins, with Auto (`A`) and Turbo (`T`) toggles.
- **Daily** — the seeded five-spin challenge against simulated rivals.
- **Tournament** — one ten-spin run per machine per week. Rivals are generated
  deterministically from the week's seed, so every player faces the same board.
  A live rank updates after each spin; the prize ladder pays on completion and a
  top-three finish unlocks the **Champion** trophy.
- **Spin Rush** — 60 seconds of automatic turbo spins with no wager. The score
  multiplier climbs every ten seconds (1× → 4×). Rewards scale with the final
  score, a personal best is saved, and 5,000 points unlocks **Speed Demon**.
- **Bonus Hunt** — 12 spins where only bonus-triggering wins score; features pay a
  final bounty scaled by hits.
- **Boss Battle** — every machine has a boss with its own HP. Wins deal damage,
  features deal double; defeat it for a bounty.
- **Jackpot Chase** — 15 spins to fill a 6,000-unit personal meter; partial fills
  still pay, a full meter pays a jackpot bonus.
- **Cascade Challenge** — 10 spins where points are your wins multiplied by the
  cascade length. Long tumble chains win.
- **Mystery Roulette** — a random unlocked machine plus a random modifier (2×/3×
  wins, extra wilds, free spins) for 10 spins.
- **High Roller** (VIP 5+) — max bet only, prestige points on wins and double
  prestige for features.
- **Quests** — a nine-stage, three-chapter campaign. Activate a stage, then play
  normally: objectives are checked on every spin, in every mode. Completing a
  stage pays credits and unlocks a trophy. Stages unlock in order.
- **Profile** — VIP level, XP, totals and the trophy gallery (11 trophies).

## Pay systems

- **Lines** — pay left-to-right on the selected paylines. Wilds substitute.
- **Ways** — match symbols on adjacent reels starting from the left; *any row*
  counts. More matching rows multiply the ways and the payout (capped at 27).
- **Clusters** — connect 5+ orthogonally adjacent matching symbols; wilds bridge
  any symbol. Larger clusters pay more, and tumbling upgrades low symbols.

## Mechanics glossary

- **Cascade** — winning symbols vanish, new ones fall in, each tumble multiplies
  the win by 2×, 3×, 4×…
- **Mystery symbol** — every ❓ on the grid reveals the same random symbol.
- **Expanding wild** — a centre-row wild can expand to fill its whole column.
- **Stacked wild** — extra wilds appear in pairs on a reel.
- **Shifting wild** — the wild marches one reel to the right each spin.
- **Sticky wild** — wilds stay locked during free spins.
- **Hold & Win** — collect coin symbols; three respins, refreshed by new coins.
  Fill the board for the Grand jackpot.
- **Scatter respin** — two scatters give one free re-spin with the scatters held.
- **Symbol upgrade** — after a tumble, the cheapest symbols step up a tier.
- **Multiplier ladder** — later cascades pay 4×, 6×, 8×… instead of 2×, 3×, 4×.
- **Bonus pick'em** — 3+ scatters open three boxes of credits, free spins or a jackpot.
- **Gamble** — double-or-nothing card flip on a big win (`G`).
- **Bonus buy** — pay a fixed price to jump straight into free spins (Paytable panel).

## How to play

| Action | |
|---|---|
| Spin | **SPIN**, the lever, `Space` / `Enter` |
| Mode tabs | Lobby → Play / Daily / Tournament / Rush / Quests / Profile |
| Auto-spin / Turbo | **AUTO** (`A`) / **TURBO** (`T`) |
| Bet / Lines | **BET** (`B`) / **LINES** (`L`) |
| Machine lobby | **LOBBY** (`H`) |
| Daily challenge | **RUN** (`C`) — five seeded spins, ranked against rivals |
| Daily bonus | **CLAIM** (`D`) — credits + 7-day calendar + free spins |
| Practice mode | Settings or `X` — no credits wagered |
| Paytable / Stats / Collections | **PAYTABLE** (`P`), **STATS** (`S`), Settings |
| Gamble | `G` when offered after a big win |
| Close a panel | `Escape` or ✕ |

## Progress and prizes

- **Shared wallet** — credits carry across every machine.
- **XP & VIP** — 10 credits wagered = 1 XP; VIP levels unlock machines and
  appear on every screen.
- **Global jackpots** — Mini 50 / Minor 250 / Major 1,500 / Grand 10,000,
  growing from 0.5% / 0.2% / 0.05% / 0.01% of every wager across the arcade.
- **Daily bonus** — credits, free spins on streak days and a seven-day calendar.
- **Daily challenge** — a seeded reel sequence shared by all players, ranked
  against simulated rivals for a credit prize.
- **Missions & achievements** — 8 missions, 11 achievements spanning all machines.
- **Symbol collections** — discover symbols across machines; complete sets for bonuses.
- **Practice mode** — try any unlocked machine without risking credits.

Out of credits? A 500-credit top-up is one tap away. The game is never a dead end.

## Graphics and effects

- **Vector symbol art** — every symbol on every machine is drawn from paths by
  `src/art/symbols.js`, so the look is identical across devices and works fully
  offline (no emoji font dependency).
- **Animated backgrounds** — `src/art/backgrounds.js` draws a theme-specific
  backdrop: starfields, ocean bubbles, desert dunes, falling leaves/snow,
  drifting embers, candy sprinkles and a scrolling retro grid. All animations
  are time-based and simplified under `prefers-reduced-motion`.
- **Effects system** — `src/effects.js` provides animated WIN / BIG WIN / MEGA
  WIN / EPIC / JACKPOT banners, coin showers, confetti, fireworks, rotating light
  beams, lightning bolts, floating `+credit` popups, symbol-explosion shards,
  screen shake, screen flash and theme-specific signature particles (glitch,
  bubbles, embers, sand, leaves, snow, sprinkles, stardust). Particle count is
  capped for smooth mobile play.
- **Bonus presentation** — bonus rounds open with a "BONUS ROUND" cinematic
  (spotlight rays + coin fountain), the jackpot wheel throws tick sparks, and
  each pick'em chest reveal flips with its own burst and floating prize label.
- **Near-miss tease** — when the decided result is genuinely two jackpot symbols
  short of a line, the third reel slows one symbol before settling with a spark
  trail. The outcome is never changed — the reel animation only teases what
  actually happened.
- **Reel geometry** — symbols are centred inside each cell (the leading
  off-window placeholder is skipped), so all 3, 4 or 5 rows are fully visible
  and stay aligned with paylines, particles and near-miss cues.
- **Cristallo 3D** — a real Three.js cabinet renders the reels in WebGL with
  cylindrical drums, crystal materials, coloured lights, reflections and a
  subtle parallax. It runs on its own canvas layered over the 2D chrome so all
  buttons and HUD stay intact. Resolution adapts with
  `setPixelRatio(Math.min(devicePixelRatio, 2))`; devices without WebGL fall
  back to the regular 2D cabinet automatically. The Three.js modules are
  vendored in `vendor/` (MIT licence) so the game stays offline and build-free.
- **Draw-on win lines** and eased reel motion complete the presentation.

## Themes

Ten palettes, usable on **any** machine: Neon, Retro, Forest, Ocean, Egyptian
Gold, Cosmic Violet, Candy Pink, Norse Ice, Samurai Red and Safari Amber. A
machine's default palette is applied when you select it; override it freely in
Settings. Each machine also has its own vector symbol set and motif.

## PWA

- Installable manifest with categories, screenshots, shortcuts (Play, Lobby,
  Paytable, Daily) and PNG icons including maskable and `apple-touch-icon`.
- Versioned service worker: network-first navigation with an offline shell
  fallback, stale-while-revalidate assets, `SKIP_WAITING` update flow.
- iOS safe areas, standalone display, per-theme `theme-color`, offline badge.
- Shared `R2` arcade helper for sound, haptics, settings, playtime and hub stats.
- `prefers-reduced-motion` is respected.

## Saving

| Key | Contents |
|---|---|
| `slot-pwa-v3` | wallet, bet/lines, free spins, theme, selected machine, XP/VIP, per-machine stats, missions, achievements, collections, daily + challenge state, mode results, quest progress, trophies |
| `slot-jackpot-v2` | the four global jackpot meters |
| `random2-settings` | shared sound / music / haptics settings |

**Reset session** restores credits and stats but keeps jackpots, VIP, collections
and achievements.

## Architecture

Plain ES modules, no bundler. `shared/arcade.js` loads as a classic script and
exposes the global `R2`. Everything under `src/` is pure except `main.js`.

| File | Role |
|---|---|
| `src/config.js` | palettes, jackpots, XP/VIP, calendar, missions, achievements, collections |
| `src/machines/` | one data-only definition per machine + registry + builder |
| `src/rng.js` | seedable RNG, weighted strips, daily seeds |
| `src/engine.js` | lines / ways / cluster evaluation, cascades, Hold & Win, jackpot growth |
| `src/features.js` | wild variants, mystery, Hold & Win sequence, gamble |
| `src/modes/` | twelve-mode registry, score modes, tournament, rush, quest |
| `src/art/symbols.js` | vector symbol art for every symbol |
| `src/art/backgrounds.js` | animated theme backdrops |
| `src/effects.js` | banners, shake, flash, particles, theme signatures |
| `src/state.js` | wallet, VIP, mode state, persistence, per-machine stats |
| `src/meta.js` | dailies, calendar, missions, achievements, collections, challenge |
| `src/spin.js` | outcome-first reel deceleration (near-misses, turbo) |
| `src/render.js` | canvas cabinet, reel highlights, effects, hit regions |
| `src/render3d.js` | Three.js WebGL reel overlay for Cristallo 3D (vendor/three.module.js) |
| `src/ui.js` | lobby tabs, HUD and all DOM panels |
| `src/main.js` | bootstrap, mode sessions and the single game loop |

## Development

```bash
npm test                          # 78 unit tests
npm run smoke                     # 48 headless mobile checks incl. offline reload
node scripts/balance.mjs 20000    # per-machine RTP report
npm run assets                    # regenerate SVG + PNG icons/screens (sharp in ../bucio)
```

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../../LICENSE).
