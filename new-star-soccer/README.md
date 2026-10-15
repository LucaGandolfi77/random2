# New Star Soccer — Career

A mobile-first football career RPG for the browser: play out your matches in
canvas minigames, train five skills, manage wages, sponsors, relationships and
transfers — from a non-league debut at 16 to a decorated retirement.
Built with **TypeScript**, **HTML5 Canvas**, **WebAudio** and **Vite**.
Zero runtime dependencies. Installable **PWA** — works fully offline.

## The career loop

- **Match day**: a live ticker with four interactive minigames at the critical
  moments — aiming (passes/shots), free kicks (curve it over the wall, beat the
  moving keeper), and interceptions (tap-timing).
- **A real league**: all 20 clubs play a proper 38-week double round-robin.
  Every result is simulated from club strengths — the table is alive, and the
  title race is not just about you.
- **Training**: Pace, Power, Technique, Vision and Free Kicks (0–100), with
  light/medium/hard sessions that cost energy and impress or annoy people.
- **Life**: nights out, dates, spa days — energy and relationships are finite,
  and a low Boss relationship gets you **benched**.
- **Money**: weekly wage, win/goal/assist bonuses, fan- and glamour-driven
  **sponsor income**, a shop (boots, luxuries, gifts) and a casino (that the
  boss occasionally hears about).
- **Transfers**: perform well and smaller-club summers end with offers from
  bigger clubs — fee, salary, and a fresh start.
- **Aging**: from 30 the pace fades season by season. Retire at 35 (or early)
  into a career summary: goals, earnings, peak value, trophy cabinet.

## PWA

- Installable on iOS/Android/desktop (manifest + maskable icons).
- Service worker: app-shell precache + cache-first runtime — after the first
  load, matches play offline.
- Autosaves every week to device-local storage (save v2 schema); the career
  reloads automatically on the next visit.

## Development

```bash
cd new-star-soccer
npm install
npm run dev        # http://localhost:3000
npm run build      # tsc + vite build → dist/
```

CI (`.github/workflows/pages.yml`) builds it the same way and publishes
`dist/` under `/new-star-soccer/` on GitHub Pages, next to BUCIO.

## Headless simulation test

The whole career engine can be played without a browser:

```bash
node /tmp/nss-sim-test.mjs   # fixtures, league table, transfers, aging,
                             # retirement, save/load v2, benching
```

## Project structure

```
new-star-soccer/
├── index.html              # entry, manifest + apple-touch-icon links
├── public/                 # copied to dist/ verbatim
│   ├── manifest.json       # PWA manifest (icons, maskable, portrait)
│   ├── service-worker.js   # offline cache
│   └── icons/              # 192/512 + maskable + apple-touch (generated)
├── src/
│   ├── main.ts             # UI renderer, screen router, event wiring
│   ├── audio.ts            # WebAudio synth: whistle, cheer, thud, blip
│   ├── style.css           # mobile-first styles
│   ├── types/index.ts      # types + clubs (with strengths) + items
│   ├── state/GameState.ts  # fixtures, league sim, transfers, aging, save
│   └── match/MatchCanvas.ts# canvas minigames (aim, free kick, intercept)
├── package.json
├── tsconfig.json
└── vite.config.ts          # base: './' for Pages subpath serving
```

## Architecture notes

- **Fixtures**: circle-method round-robin, mirrored for the second half —
  190 unique pairings, each played home and away.
- **Simulation**: expected goals derived from club strength differentials;
  minigame thresholds scale with skill, energy (`matchSkillModifier()`) and
  opponent strength.
- **Benching**: Boss < 45% risks the bench; below 30% it is likely. Benched
  matches simulate without you and the fans notice.
- **Season wrap** is deferred until you continue past the last match, so the
  final table stays readable; then: champion, Golden Boot race, aging, salary
  bump, transfer offers, retirement check.
- **Saves**: versioned (`version: 2`); older saves are ignored cleanly.

Based on the same PWA architecture as SECTOR 7 and BUCIO — installable,
offline, no accounts, no tracking.
