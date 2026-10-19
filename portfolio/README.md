# PORTFOLIO

> A UI/UX and frontend portfolio for Luca Gandolfi, bilingual EN/IT.

*One page, no build step, no dependencies.* It exists because the arcade
presents 48 projects as a list of things to play, and that is the wrong shape
for someone deciding whether to hire you. This page presents six of them as
problems that were solved.

**Live:** <https://lucagandolfi77.github.io/random2/portfolio/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/portfolio/
```

---

## Before you publish: three things to fill in

The page ships with these blank on purpose, so that a half-written section
cannot go live by accident. Search the file for `FILL`:

| Where | What | How |
|---|---|---|
| Hero + Contact | **Email** | `href="mailto:you@example.com"` and delete `hidden` |
| Hero + Contact | **LinkedIn** | `href="https://www.linkedin.com/in/you"` and delete `hidden` |
| `#clients` | **Three client slots** | Replace the `.panel.placeholder` blocks and delete the `.todo` badge |

The contact buttons also have a safety net: any `[data-fill]` link still
pointing at `#` is hidden by the script at the bottom of the page, so filling
in only the href and forgetting to remove `hidden` still ships a dead button.
The GitHub link works today and needs no editing.

---

## The six case studies

Each is written as **Problem → What I built → Result**, with real numbers.

| # | Project | Why it is on this page |
|--:|---|---|
| 01 | `census-pwa` | Real sampling theory, and a 60-seed test proving a claimed 95% interval covers ~75% under bias. The strongest "I can prove a claim" story. |
| 02 | `stats-pwa` | A dashboard that labels its own heatmap an estimate and refuses to mix scoreboards. The strongest "I will not flatter your data" story. |
| 03 | `bucio` | ~1,800 objects in ~30 draw calls. The only WebGL project, so it shows a different part of the range. |
| 04 | `sector7-pwa` | 16k lines, a two-pool damage model, no build step. The biggest no-build project. |
| 05 | `ironfall-pwa` | A draw-call budget test and two simulation/renderer invariants. The strongest "engineering discipline" story. |
| 06 | `pulse-pwa` | A rhythm game with zero audio assets, seeded and reproducible. The most unusual project. |

`EADS/`, `new-star-soccer/`, `snap-pwa/` and `pokesurvivor-bot/` are linked from
the catalogue instead. They are strong but none of them screenshots
themselves into a case study: EADS is a Flask app that this repository does
not serve, New Star Soccer needs a build to run, Snap Cam needs a camera, and
the bot is a terminal program.

---

## The sections

| Section | What it is for |
|---|---|
| Hero | Positioning plus four numbers that are easy to verify. |
| Six projects | The case studies above. |
| Client work | Placeholders. Delete the ones you cannot fill. |
| Craft | Design tokens, accessibility, responsive, motion, performance budgets, offline — the parts that apply to every project. |
| Process | Six design decisions **quoted from the source**, with `file:line` references. There are no Figma files behind this work; the reasoning survives in the code instead. |
| Also built | The remaining catalogue, linking into the arcade. |

---

## How it is built

Plain HTML, CSS and one inline `<script>`. No package.json, no bundler, no
dependencies — the same rule every other project in this repository follows.

```
portfolio/
├── index.html          everything: shell, CSS, both languages
├── manifest.json       PWA manifest (CI requires manifest ↔ index.html link)
├── service-worker.js   cache-first shell, one cache per app
├── icons/              192 + 512, SVG like every other project here
├── scripts/
│   └── shots.mjs       generates shots/ — see below
├── shots/              committed; the site is static
└── README.md
```

**Both languages live in the markup** as sibling elements:

```html
<span class="en">See the work</span>
<span class="it" lang="it">Vedi i lavori</span>
```

CSS shows one and hides the other, so the page is complete and fully
crawlable with JavaScript switched off, and an Italian sentence keeps its own
`<strong>` instead of being flattened into a text swap. The script only
remembers the choice and keeps `lang` on `<html>` honest for screen readers.

> **One trap worth knowing about.** Any layout rule that sets `display` on an
> element carrying `.en`/`.it` outranks the language switch, because
> `.stat span` (0,1,1) beats `.it` (0,1,0) — and both languages appear at
> once. That is why the stat labels carry an explicit `.lbl` rule pair. If you
> add a new block that styles a bilingual element, check it in both languages.

### What it deliberately does not load

`shared/arcade.js` is the one file this repository lets projects share. This
page does not load it. It would cost ~17 KB for a single media query, and it
would tie the folder to this repository's layout — which matters because the
page is otherwise self-contained and could be lifted into its own repo or
domain later without changes.

---

## Regenerating the screenshots

The games draw themselves procedurally, so there is nothing to capture until
one is running.

```bash
python3 -m http.server 8099 &          # from the repository root
node portfolio/scripts/shots.mjs http://localhost:8099
node portfolio/scripts/shots.mjs http://localhost:8099 pulse   # just one
```

`shots.mjs` has **no dependencies**. It drives a Chromium over the DevTools
Protocol using Node's built-in `WebSocket`, and exits cleanly with `SKIP` if
no browser is installed. It follows the same shape as `census-pwa/shot.mjs`.

Each entry sets `before`/`after` to put the app into a state worth
photographing, because a title screen proves nothing:

- **census** — drives the game to a *published* return, so the screenshot is
  the rejected verdict with its per-ward breakdown.
- **stats** — seeds `localStorage` through `Page.addScriptToEvaluateOnNewDocument`
  before any page script runs. The real run schema is
  `{t, slug, score, durMs, wave, outcome}`; getting `slug` wrong renders every
  chart empty, because the dashboard groups by slug before drawing.
- **sector7 / ironfall / pulse** — clicks the start button and waits for real
  frames rather than a fixed delay.

Two flags matter. `--autoplay-policy=no-user-gesture-required`, because PULSE
schedules its note chart against `audioCtx.currentTime` and a suspended
headless context never advances. And `deviceScaleFactor: 1.5` rather than `2` —
at 2x the six shots were 1.9 MB, which would have undercut the performance
claim the page is making.

`bucio` is not generated: it is the one project built with a bundler, so its
page does not run from the repository root. Its case study reuses the
committed screenshot in `bucio/public/screens/`, copied to `shots/bucio.png`
because `bucio/public/` is not what gets published.

---

## Accessibility and performance notes

- 48px minimum touch targets, visible focus rings, `aria-pressed` on toggles.
- `prefers-reduced-motion` stops every animation rather than shortening it.
- Safe-area insets are CSS variables, so a notch does not break the layout.
- Light and dark themes are one custom-property block apart; charts read their
  colours from CSS at draw time, so a theme switch is a repaint.
- Every screenshot is lazy-loaded and carries intrinsic `width`/`height`, so
  the images do not shift the page as they arrive.
- Text uses `--muted` rather than `--faint`. `--faint` is about 3.5:1 on the
  dark card, which does not pass for body copy.

## Known limits

- 🟡 **Three empty client slots.** Intentionally visible, and they should stay
  that way until real projects exist.
- 🟡 **Email and LinkedIn are not set**, so the two hero CTAs are hidden. The
  page is still usable — it links to GitHub and to every case study.
- 🟠 **The URL is `/random2/portfolio/`.** The page is self-contained and can
  be moved to its own repository or domain by copying the folder; nothing
  outside it would need to change.

## What's next

- 🟢 Fill in the client work.
- 🟢 Consider a separate domain, since this one is under the arcade's path.
- 🟡 A case study for `EADS/`, which is the strongest non-web project here and
  the one that currently has no screenshot because this repository does not
  serve Flask apps.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../LICENSE).