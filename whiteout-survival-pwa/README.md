# WHITEOUT: LAST EMBER

A mobile-first survival city builder inspired by **Whiteout Survival**, built as an
offline-ready PWA. Keep one furnace alive through an endless winter, assign the
survivors who remain, enact decrees, research heat-saving technology and send a
small expedition party into the frost.

The finished game is playable at:

**https://lucagandolfi77.github.io/random2/whiteout-survival-pwa/**

Everything is original: the buildings and settlement are drawn procedurally on
Canvas 2D, every interface icon is inline SVG, and all sound is synthesised with
the Web Audio API. There are no external images, fonts, audio files or network
requests after the first load.

> This is a fan-made, non-commercial tribute. It is not affiliated with or
> endorsed by Century Games.

---

## Play on a phone

1. Open the live URL on a phone.
2. On iPhone/iPad: **Share → Add to Home Screen**.
3. On Android: use the browser's **Install app** action.
4. Launch it from the home screen. The shell, icons and assets are cached, and
   the settlement continues while the app is closed.

The layout is designed for a 320–480 px portrait screen. On desktop it is
centred in a phone-sized frame.

---

## The loop

### The furnace

The central furnace consumes coal every second and stores heat. Stored heat
raises the city temperature, and the city temperature determines whether workers
can function and whether survivors freeze.

- Furnace levels 1–10 increase heat capacity and unlock new facilities.
- **Normal** mode is the efficient baseline.
- **Overdrive** burns 2× coal for much more heat. Use it during a whiteout.
- If coal reaches zero the furnace stalls and the city starts to cool.

### Weather

A warning always arrives before a blizzard. Calm weather, a 30-second warning
and a 50–75 second whiteout cycle forever. Ambient temperature falls toward
−70 °C in the worst storms. Survivors' warmth, production speed and health all
react to the inside temperature.

### Resources and facilities

| Resource | Source |
| --- | --- |
| Wood | Lumber Mill |
| Coal | Coal Mine |
| Raw Meat | Hunter's Hut |
| Cooked Meals | Cookhouse (2 raw meat → 1 meal) |
| Iron | Iron Seam or expedition first-clear loot |

Facilities unlock as the furnace grows:

- Furnace 1: Lumber Mill, Hunter's Hut, Shelters
- Furnace 2: Coal Mine
- Furnace 3: Cookhouse
- Furnace 4: Clinic
- Furnace 5: Iron Seam

Every facility has 1–8 levels and worker posts. Production depends on the
health, hunger, warmth and happiness of the people assigned there. Outdoor work
also depends on the weather and the city temperature.

### Survivors

Each survivor has Health, Hunger, Warmth and Happiness. Sick survivors cannot
work. The Clinic heals them only while staffed. A survivor whose health reaches
zero during active play is lost; offline mode is deliberately safer.

The day runs on an eight-real-minute cycle:

- **08:00–17:00 · Work** — full production.
- **17:00–20:00 · Eat** — reduced production; the meal call consumes meals.
- **20:00–08:00 · Sleep** — no production; warmth and health recover in beds.

### Decrees

One decree is active at a time:

- **Balanced Rule** — no modifiers.
- **Extended Shifts** — +20% production, lower happiness and faster hunger.
- **Hearty Meals** — +15 happiness, but two meals per survivor per day.

### Research

Eight permanent nodes cover insulation, combustion efficiency, gathering
output, clinic medicine, cookhouse yield and expedition gear. Prerequisites and
furnace levels gate the deeper branches.

### Expeditions

Recruit up to three heroes — Tank, Marksman and Support — and send the party
into ten auto-battler stages. Combat runs in real time with taunts, shields,
focused shots, heals, critical variance and deterministic seeds. Victory grants
resources and hero XP; the first clear gives bonus meals and Iron and opens the
next route.

---

## Offline progress

- The game autosaves every five seconds, immediately after actions, and when the
  page is hidden or closed.
- On return, missed time is simulated at **65% production efficiency**, capped
  at **8 hours**.
- Fuel and meals are still consumed. Blizzards still happen.
- Survivors can become sick, but **cannot freeze to death while the app is
  closed**. The return report lists all gains, spending, meals, storms, arrivals
  and sickness.
- If fewer than 15 seconds have passed, catch-up is applied silently.

Save data lives in `localStorage` under `whiteout-last-ember-save-v1`. It is
versioned, sanitised on load, and can be exported or imported from Settings.

---

## Architecture

```text
whiteout-survival-pwa/
├── index.html
├── vite.config.ts
├── package.json
├── public/
│   ├── manifest.json
│   └── icons/                 generated PWA and Apple icons
├── src/
│   ├── game/
│   │   ├── types.ts           state, survivors, combat and reports
│   │   ├── content.ts         balance tables, facilities, tech, heroes, stages
│   │   ├── initialState.ts
│   │   ├── engine.ts          clock, heat, weather, production, survival, offline
│   │   ├── actions.ts         upgrades, workers, decrees, research, recruitment
│   │   ├── expedition.ts      auto-battler, XP and rewards
│   │   ├── save.ts            sanitising, migration, export/import
│   │   ├── rng.ts             deterministic mulberry32
│   │   └── format.ts
│   ├── store/gameStore.ts     Zustand store, tick loop glue and UI state
│   ├── render/
│   │   ├── SettlementRenderer.ts   Canvas 2D scene, particles and weather
│   │   └── ...
│   ├── audio/AudioEngine.ts   Web Audio wind, crackle and cues
│   ├── components/            HUD, tabs, sheets, report, settings
│   ├── styles/index.css       Tailwind 4 entry + custom design system
│   ├── service-worker.ts      injected Workbox precache manifest
│   └── main.tsx
├── tests/                     engine, offline, expedition, save, PWA contract
├── tools/make_icons.py
├── scripts/smoke.mjs          headless production smoke test
└── README.md
```

The simulation is pure TypeScript and independent of React. React renders the
same state at 1 Hz; Canvas effects run on `requestAnimationFrame`. The service
worker is generated from `src/service-worker.ts` by `vite-plugin-pwa` with an
injected precache manifest, and emitted into `dist/service-worker.js`.

### Main commands

```bash
npm install
npm run dev          # development server
npm run typecheck    # app + service worker TypeScript
npm test             # Vitest simulation and PWA contract tests
npm run build        # typecheck + production bundle
npm run preview      # serve the production bundle
npm run smoke        # build must exist; drives Chrome through the real UI
npm run icons        # regenerate favicon, PWA and Apple icons
```

`npm run smoke` uses the repository's dependency-free CDP client. If Chromium is
unavailable it prints `SKIP` and exits successfully. It covers onboarding, tab
navigation, a furnace upgrade, a coal-mine build, an expedition retreat, save
persistence and an offline reload through the service worker.

---

## Design notes

- No external art, fonts, audio, analytics or accounts.
- Every string is English.
- `prefers-reduced-motion` reduces Canvas weather and CSS animation intensity.
- Canvas resolution is capped at 2× DPR. The scene is rendered once into an
  offscreen layer and only lights, smoke, snow and selection glows are redrawn.
- The UI holds a 480 px maximum width, uses safe-area padding and keeps primary
  controls in thumb reach.

## License

The game follows the repository license: see
[`../LICENSE`](../LICENSE).
