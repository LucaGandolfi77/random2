# PORTFOLIO

> A UI/UX and frontend portfolio for Luca Gandolfi, bilingual EN/IT.

*One page, no build step, no dependencies.* It exists because the arcade
presents 44 projects as a list of things to play, and that is the wrong shape
for someone deciding whether to hire you. This page presents nine of them as
problems that were solved.

**Live:** <https://lucagandolfi77.github.io/random2/portfolio/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/portfolio/
```

---

## Before you publish: four things to fill in

The page ships with these blank on purpose, so that a half-written section
cannot go live by accident. Search the file for `FILL`:

| Where | What | How |
|---|---|---|
| Hero + Contact | **Email** | `href="mailto:you@example.com"` and delete `hidden` |
| Hero + Contact | **LinkedIn** | `href="https://www.linkedin.com/in/you"` and delete `hidden` |
| `#services` | **Where** | replace the `FILL:` text inside the `data-fill-text` span |
| `#services` | **Time zone** | as above |
| `#services` | **Day rate** | as above |
| `#services` | **Engagement** | as above |

The contact buttons also have a safety net: any `[data-fill]` link still
pointing at `#` is hidden by the script at the bottom of the page, so filling
in only the href and forgetting to remove `hidden` still ships a dead button.
The GitHub link works today and needs no editing.

The four facts in `#services` are the ones the repository cannot answer —
only you know where you are and what you charge. They carry `data-fill-text`
instead of `data-fill`, because they are not links: the script leaves them
styled as unfinished while their text still starts with `FILL`, and the
attribute comes off the moment you replace it. Until then the panel is
dashed and carries a `TODO` badge, so nobody can mistake it for a fact.

---

## The CV

[`cv.html`](cv.html) is a one-page CV that prints to exactly one A4 sheet.
It links `assets/portfolio.css` for the design and `assets/cv.css` for the
page itself, and it has a **Save as PDF** button that calls `window.print()`
— the browser's own print dialog, with "Save as PDF" as one of its targets.

```bash
python3 -m http.server 8099 &          # from the repository root
# open http://localhost:8099/portfolio/cv.html
```

The print rules live in `assets/portfolio.css`, not in the CV, because they
are the same rules for the whole site: the chrome goes, the type gets a
paper palette, `@page { margin: 14mm }` and `print-color-adjust: exact` keep
the accent gradient alive on white paper.

The CV is bilingual like everything else here. The language switch is CSS,
so only one of the two languages is ever on the page — which is what makes
it fit on one sheet.

---

## The nine case studies

Each is written as **Problem → What I built → Result**, with real numbers, and
each carries the same three lines — the constraint, the stack, what shipped —
plus one honest fault of its own and a **proof**: the file and the line that
substantiate the claim.

| # | Project | Why it is on this page |
|--:|---|---|
| 01 | `census-pwa` | Real sampling theory, and a 60-seed test proving a claimed 95% interval covers ~75% under bias. The strongest "I can prove a claim" story. |
| 02 | `stats-pwa` | A dashboard that labels its own heatmap an estimate and refuses to mix scoreboards. The strongest "I will not flatter your data" story. |
| 03 | `bucio` | ~1,800 objects in ~30 draw calls. The only WebGL project, so it shows a different part of the range. |
| 04 | `sector7-pwa` | 20k lines, a two-pool damage model, no build step. The biggest no-build project. |
| 05 | `ironfall-pwa` | A draw-call budget test and two simulation/renderer invariants. The strongest "engineering discipline" story. |
| 06 | `pulse-pwa` | A rhythm game with zero audio assets, seeded and reproducible. The most unusual project. |
| 07 | `tools/balance/` | A Monte-Carlo harness that plays 5,000 seeded sessions of the real simulation. The strongest "I measure instead of guessing" story. |
| 08 | `shared/` | One audio helper, one seeded RNG and one chart library, used by 36 projects. The strongest "I think in systems" story. |
| 09 | `EADS/` | An embedded debugger speaking gdb/MI over a serial link. The strongest non-web project here. |

`new-star-soccer/`, `snap-pwa/` and `pokesurvivor-bot/` are linked from the
catalogue instead. They are strong but none of them screenshots themselves
into a case study: New Star Soccer needs a build to run, Snap Cam needs a
camera, and the bot is a terminal program.

---

## The sections

| Section | What it is for |
|---|---|
| Hero | Positioning plus four numbers that are easy to verify. |
| Nine projects | The case studies above. |
| Services | What you can hire him for: interface work, performance and accessibility audits, offline-first PWA builds — plus the availability facts only the author can fill in. |
| Stack | Every skill linked to the project that proves it. No self-scored bars. |
| Craft | Design tokens, accessibility, responsive, motion, performance budgets, offline — the parts that apply to every project. |
| Process | Six design decisions **quoted from the source**, with `file:line` references. There are no Figma files behind this work; the reasoning survives in the code instead. |
| Also built | The whole catalogue, linking into the arcade. |

---

## The claims ledger

The page argues for itself with numbers, so the numbers had better be true.
`tools/verify.mjs` recomputes every one of them from the repository and
compares it with the number the page actually renders.

```bash
node tools/verify.mjs              # the table, on the terminal
node tools/verify.mjs --json       # the same thing, machine-readable
node tools/verify.mjs --check      # exit 1 if anything drifted
node tools/verify.mjs --audit      # run every `how` command and compare
node tools/verify.mjs --html portfolio/verify.html   # regenerate the page
```

The ledger is published at [`verify.html`](verify.html), next to the page it
checks. Each row carries the claim, the value, whether it passes, where the
number is used on the page, and **the command that reproduces it** — paste it
into a terminal and you get the same answer.

### Two kinds of check, because two kinds of claim

- **Numbers in tiles.** The four stat tiles carry `data-claim="<id>"`. The
  tool parses the `<b>` out of the tile and compares it with the value
  computed from the repository. Edit the number on the page without changing
  the repository and CI goes red.
- **Numbers in prose.** Prose cannot be parsed reliably, so the registry
  carries a `stale` list of literals that would prove a claim is out of date
  — `"Forty-eight"`, `"44 PNG"`, `"every one of them"`. If one appears
  anywhere in `index.html`, the check fails and names the claim it
  contradicts. When a claim legitimately changes, remove its old literal in
  the same commit that updates the page, or the lint becomes noise.

### Adding a claim

One entry in the `CLAIMS` array in `tools/verify.mjs`:

```js
{
  id: "projects",
  label: "Projects shipped",
  labelIt: "Progetti pubblicati",
  where: "the first stat tile",
  whereIt: "la prima cifra",
  expect: "44",                       // what the page has to show
  how: "the command a reader can paste",
  compute: () => projects().length,
}
```

`expect` is what the page must show; leave it out for a supporting number
that is not stated on the page. `how` is the command that produces the same
number — write it, run it, check the two agree. `node tools/verify.mjs
--audit` does exactly that for every claim in the registry.

> **The house rule:** a claim is only true if the ledger says so. Do not type
> a number onto the page without adding it to the registry in the same
> change. A tile the ledger does not know about is a failure, not a detail.

### The committed copy

`portfolio/verify.html` is generated and committed, and CI fails if it is out
of date. It carries **no timestamp**, on purpose: the file has to be
byte-for-byte reproducible, so CI regenerates it and diffs it.

One exception: the line counts move with every commit, so they sit in a
marked-off section that the comparison skips. A committed copy that goes
stale the moment anything else is touched is a copy nobody keeps up to date.

---

## How it is built

Plain HTML, CSS and one classic `<script>`. No package.json, no bundler, no
dependencies — the same rule every other project in this repository follows.

```
portfolio/
├── index.html          the shell: markup, both languages, the links
├── cv.html             one-page CV, prints to one A4 sheet
├── assets/
│   ├── portfolio.css   the stylesheet, extracted from index.html verbatim
│   ├── portfolio.js    the progressive enhancement, extracted verbatim
│   ├── ledger.css      the claims ledger's table
│   ├── ledger.js       the ledger's copy buttons
│   ├── cv.css          the CV's layout and its print rules
│   └── cv.js           the CV's print button
├── verify.html         the claims ledger — GENERATED, never hand-edited
├── manifest.json       PWA manifest (CI requires manifest ↔ index.html link)
├── service-worker.js   cache-first shell, one cache per app
├── icons/              192 + 512, SVG like every other project here
├── scripts/
│   └── shots.mjs       generates shots/ — see below
├── shots/              committed; the site is static
└── README.md
```

The CSS and the JS live in `assets/` rather than inline, because Phase 1 of
the expansion plan added a claims ledger and a print stylesheet, and by then
the inline block was 600 lines of stylesheet hiding inside a markup file.
Neither file was edited during the move: the extraction is byte-for-byte.

`assets/portfolio.js` is loaded as a classic script at the end of `<body>`,
without `defer` and without `async`, so the DOM above it is parsed before it
runs. It is the only script on the page, and it is still optional — with
JavaScript off the page is complete, bilingual and readable.

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

The two files in `assets/` are not a counter-example to that: they live
inside the folder, they travel with it, and nothing outside the folder is
required to render the page.

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

- 🟡 **Email and LinkedIn are not set**, so the two hero CTAs are hidden. The
  page is still usable — it links to GitHub and to every case study.
- 🟡 **The claims ledger checks the numbers, not the prose.** A sentence that
  states a number without a `data-claim` tile is only covered by the stale
  literal lint, which catches the literals it knows about and nothing else.
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