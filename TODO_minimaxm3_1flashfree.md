# TODO — Portfolio expansion plan

> A working plan for turning `portfolio/` from a beautiful art project into a
> document a hiring manager can act on.
>
> **Scope decided:** additive + honest edits. No full restructure. Timeline
> section explicitly **dropped**. Phases 0 and 1 lead.
>
> **Everything below was verified against the repository**, not assumed. The
> "ground truth" column was produced by running the checks, and the commands
> are the ones used to produce it.

---

## How to use this file

- [ ] **Status legend.** `⬜` = not started · `🟡` = in progress · `✅` = done
      · `⚠️` = blocked or deliberately skipped (say which, and why).
- [ ] **One phase per commit.** Every phase is independently revertible. The
      CSS extraction (1.1) in particular must land in its own commit.
- [ ] **Never hand-edit a generated file.** `portfolio/verify.html` and
      `portfolio/audit/report.html` are outputs. Edit the generator, re-run it.
- [ ] **A claim is only true if the ledger says so.** Do not type a number
      onto the page without adding it to `tools/verify.mjs` in the same
      change. If a number appears on the page and is not in the ledger, that
      is a bug.
- [ ] **Bilingual by default.** Every new string ships in EN and IT as
      sibling `.en` / `.it` elements, in the same markup, not behind a JS
      toggle. See Appendix C for the CSS rules and the trap.

---

# Phase 0 — Corrections to the claims

Five claims on the page do not survive an audit. All five are on a page whose
thesis is *"the numbers don't lie"*, so each one is a trust leak.

The page's whole argument is **verifiable numbers**. It cannot afford a
counter-example.

## 0.1 — Project count `48` → `44`

- [ ] ⬜ `portfolio/index.html:717`
- [ ] **Ground truth:** 44 project folders contain an `index.html` (45
      counting `portfolio/`). The hub grid lists 30; the root `README.md`
      table lists 33. Nothing in the repository enumerates 48.
- [ ] **Do:** replace the tile, and add `data-claim` (Phase 1.5).

```html
<!-- BEFORE -->
        <div class="stat"><b>48</b>
          <span class="lbl en">Projects shipped</span>
          <span class="lbl it" lang="it">Progetti pubblicati</span>
        </div>

<!-- AFTER -->
        <div class="stat" data-claim="projects"><b>44</b>
          <span class="lbl en">Projects shipped</span>
          <span class="lbl it" lang="it">Progetti pubblicati</span>
        </div>
```

## 0.2 — Runtime dependencies `0` → `42/44`

- [ ] ⬜ `portfolio/index.html:721-724`
- [ ] **Ground truth:** 42 of 44. `bucio/package.json` → `three: ^0.186.1`;
      `snap-pwa/vendor/` vendors MediaPipe. `new-star-soccer` has *zero*
      runtime dependencies (Vite + TypeScript are devDependencies only).
- [ ] **Do:** replace the tile, add the footnote, add the `.of` CSS rule.

```html
<!-- BEFORE -->
        <div class="stat"><b>0</b>
          <span class="lbl en">Runtime dependencies</span>
          <span class="lbl it" lang="it">Dipendenze runtime</span>
        </div>

<!-- AFTER -->
        <div class="stat" data-claim="zero_dep"><b>42<span class="of">/44</span></b>
          <span class="lbl en">Zero runtime dependencies</span>
          <span class="lbl it" lang="it">Zero dipendenze runtime</span>
        </div>
```

- [ ] ⬜ Add the footnote directly after `</div>` closing `.stats` (line 733).
      It is a plain `<p>`: **do not** give it a rule that sets `display` on a
      `.en` / `.it` child, or both languages show at once (Appendix C).

```html
      <p class="stat-note">
        <span class="en">The two exceptions: <a href="https://github.com/LucaGandolfi77/random2/tree/main/bucio">bucio</a> ships three.js and <a href="https://github.com/LucaGandolfi77/random2/tree/main/snap-pwa">snap-pwa</a> vendors MediaPipe. The other forty-two need nothing but a browser.</span>
        <span class="it" lang="it">Le due eccezioni: <a href="https://github.com/LucaGandolfi77/random2/tree/main/bucio">bucio</a> distribuisce three.js e <a href="https://github.com/LucaGandolfi77/random2/tree/main/snap-pwa">snap-pwa</a> include MediaPipe. Gli altri quarantadue si affidano solo al browser.</span>
      </p>
```

- [ ] ⬜ Add the CSS for both new elements, next to the existing `.stat`
      rules (`portfolio/index.html:328-366`):

```css
  /* The fraction in "42/44" is secondary: the big number is the story. */
  .stat b .of {
    font-size: 0.52em;
    font-weight: 700;
    letter-spacing: 0;
    opacity: 0.62;
  }
  .stat-note {
    margin-top: 12px;
    max-width: 62ch;
    font-size: 13px;
    color: var(--muted);
  }
  .stat-note a { color: var(--text); text-decoration: underline; }
```

## 0.3 — The hero paragraph

- [ ] ⬜ `portfolio/index.html:684` (EN) and `:690` (IT)
- [ ] **Current:** *"Forty-eight shipped projects, **every one of them**
      without a runtime dependency — and six of them worth reading the numbers
      on."*
- [ ] **Ground truth:** same as 0.1 and 0.2. "six" is the case-study count
      and must become 9 in Phase 4.

```html
<!-- BEFORE (EN) -->
          I design and build interfaces that stay fast, accessible and usable
          with the network off. Forty-eight shipped projects, every one of them
          without a runtime dependency — and six of them worth reading the
          numbers on.

<!-- AFTER (EN) -->
          I design and build interfaces that stay fast, accessible and usable
          with the network off. Forty-four shipped projects. Two of them use a
          third-party library; the other forty-two need nothing but a browser —
          and six of them are worth reading the numbers on.

<!-- BEFORE (IT) -->
          Progetto interfacce che restano veloci, accessibili e utilizzabili anche
          senza rete. Quarantotto progetti pubblicati, nessuno con dipendenze a
          runtime — e sei di loro meritano la pena di leggerne i numeri.

<!-- AFTER (IT) -->
          Progetto interfacce che restano veloci, accessibili e utilizzabili anche
          senza rete. Quarantaquattro progetti pubblicati. Due usano una libreria
          di terze parti; gli altri quarantadue si affidano solo al browser —
          e sei di loro meritano la pena di leggerne i numeri.
```

## 0.4 — The PNG claim in the Craft panel

- [ ] ⬜ `portfolio/index.html:1242`
- [ ] **Ground truth:** 46 published PNGs are app icons; **+7** case-study
      screenshots in `portfolio/shots/` = 53 images on the site; 68 PNGs in
      the repository (46 icons + 20 in `*/shots/` + 2 in
      `bucio/public/screens/`).

```html
<!-- BEFORE (EN) -->
            <span class="en">Procedural art means there is not one sprite sheet to download — the entire arcade ships 44 PNGs and every one of them is an app icon. Draw-call counts are asserted by tests, because a frame that quietly got more expensive is the failure mode nobody notices until a phone is in someone's hand.</span>

<!-- AFTER (EN) -->
            <span class="en">Procedural art means there is not one sprite sheet to download — the arcade's 46 published PNGs are all app icons, and the only other images on this site are the seven case-study screenshots below. Draw-call counts are asserted by tests, because a frame that quietly got more expensive is the failure mode nobody notices until a phone is in someone's hand.</span>
```

- [ ] ⬜ Mirror in IT: `44 PNG` → `46 PNG`, and add the clause about the seven
      screenshots (*"le sette screenshot dei case study qui sotto"*).

## 0.5 — The offline claim in the Craft panel

- [ ] ⬜ `portfolio/index.html:1253`
- [ ] **Ground truth:** 34 of 44 have a service worker (32 hand-written
      in-tree + 2 generated by `vite-plugin-pwa` at build time). **10 have
      none:** `anna-karenina-pwa`, `bible-pwa`, `brothers-karamazov-pwa`,
      `crime-and-punishment-pwa`, `divine-comedy-pwa`, `dorian-gray-pwa`,
      `invisible-cities-pwa`, `ivan-ilyich-pwa`, `les-miserables-pwa`,
      `recherche-pwa`, `the-trial-pwa`, `underground-pwa` (9 literary) and
      `tiny-tower-pwa`.

```html
<!-- BEFORE (EN) -->
            <span class="en">Every project is an installable PWA with its own service worker and its own cache, so installing one never interferes with another. State lives in localStorage and IndexedDB on the device; there is no server-side state anywhere in the whole repository.</span>

<!-- AFTER (EN) -->
            <span class="en">Thirty-four of the forty-four are installable PWAs, each with its own service worker and its own cache, so installing one never interferes with another. The other ten are static documents with nothing to cache. State lives in localStorage and IndexedDB on the device; there is no server-side state anywhere in the whole repository.</span>
```

- [ ] ⬜ Mirror in IT: *"Ogni progetto è una PWA installabile…"* → *"Trentaquattro
      dei quarantaquattro sono PWA installabili…"*.

## 0.6 — The "Also built" cloud is incomplete

- [ ] ⬜ `portfolio/index.html:1412-1446`
- [ ] **Ground truth:** the cloud links **30** of the 44 projects, but the
      section claims to be *"Everything else in the arcade"*. Missing 13:
      `anna-karenina-pwa`, `bible-pwa`, `brothers-karamazov-pwa`,
      `crime-and-punishment-pwa`, `divine-comedy-pwa`, `dorian-gray-pwa`,
      `example-pwa`, `invisible-cities-pwa`, `ivan-ilyich-pwa`,
      `les-miserables-pwa`, `recherche-pwa`, `the-trial-pwa`,
      `underground-pwa`.
- [ ] **Do:** add one compact row grouping the 12 literary adaptations, plus
      `example-pwa` (Star Explorer).
- [ ] ⬜ Also add `stats-pwa` — it is case study 02 but is absent from the
      cloud, while `census-pwa` is in the cloud *and* a case study.
      Inconsistent; pick one rule. Recommendation: case studies live in the
      case list, so the cloud should list the rest — which means removing
      `census-pwa`, `bucio`, `sector7-pwa`, `ironfall-pwa` and `pulse-pwa`
      from the cloud, and adding `stats-pwa`. Either way, make it consistent
      and say in the section intro which rule you used.

## 0.7 — Root `README.md` table mistakes

- [ ] ⬜ Duplicate `| 16 |` at rows 76–77 (New Star Soccer, ALVEARE).
- [ ] ⬜ `28` and `29` swapped at rows 89–90 (STATS is 29, EADS is 28).

## 0.8 — Optional: fix the work, not just the words

- [ ] ⬜ *(optional, better than rewording)* Add a ~20-line service worker to
      the 10 projects that lack one, so the original "every project" claim
      becomes *true* instead of reworded. The pattern already exists in 32
      folders. The difference between "I corrected the copy" and "I fixed the
      work".
- [ ] ⬜ If done, update `service_workers` in the ledger to 42 and revert 0.5.

## 0.9 — Leave these two tiles unchanged

- [ ] ✅ Verified true; do not touch.
  - `0 Binary art assets` — the only files under `bucio/public/` and
    `new-star-soccer/public/` are `favicon.svg`, `manifest.json`,
    `service-worker.js` and PNG icons. No binary art anywhere.
  - `0 Trackers & ads` — grepping every `src=`, `href=`, `fetch(` and
    `import` across the repository returns **zero** external resource loads,
    zero remote fonts, zero CDN scripts. The only outbound URLs are
    `rel="canonical"`, `rel="license"` and author/GitHub links.

---

# Phase 1 — The verification layer

The keystone. Everything after this writes numbers onto the page; the ledger
is what keeps them true.

## 1.1 — Extract the shared shell *(enabler for every later page)*

- [ ] ⬜ Create `portfolio/assets/portfolio.css` from `portfolio/index.html`
      lines **32–624** — the content of the `<style>` block at line 31,
      verbatim, no edits.
- [ ] ⬜ Create `portfolio/assets/portfolio.js` from `portfolio/index.html`
      lines **1504–1592** — the content of the inline `<script>` at line
      1503, verbatim, no edits.
- [ ] ⬜ In `portfolio/index.html`: delete the `<style>…</style>` block
      (31–625) and replace with a `<link>` in the `<head>`; delete the
      inline `<script>…</script>` (1503–1593) and replace with a `<script src>`.
- [ ] ⬜ **Keep the classic-script position** (after the markup) so the DOM is
      parsed before the script runs. Do not add `defer`/`async`.
- [ ] ⬜ **Own commit, trivially revertible.** This touches the file that
      currently works.
- [ ] ⬜ This preserves the README's *actual* stated reason for
      self-containment — "it would tie the folder to this repository's
      layout", which was about `shared/arcade.js`, not about sibling files.
      The folder stays liftable to its own domain unchanged.
- [ ] ⬜ Update `portfolio/README.md` §"How it is built" — the file tree
      changes, and the claim "everything: shell, CSS, both languages" is now
      wrong.
- [ ] ⚠️ **Watch the bilingual trap** (Appendix C): any new block that styles
      a bilingual element must be checked in both languages.

## 1.2 — `tools/verify.mjs`, the claim registry

- [ ] ⬜ New file `tools/verify.mjs`. One registry, no dependencies, Node
      built-ins only — the house rule.
- [ ] ⬜ Each claim carries: `id`, EN/IT labels, `compute()`, `how` (the
      shell command a reader can paste), and where it is used on the page.
- [ ] ⬜ CLI:
      ```
      node tools/verify.mjs            # human-readable table
      node tools/verify.mjs --json     # machine-readable ledger
      node tools/verify.mjs --check    # exit 1 if any value drifted
      node tools/verify.mjs --html portfolio/verify.html
      ```

### The ledger, as it stands

| id | Value | How it is computed |
|---|---|---|
| `projects` | 44 | dirs with `index.html`, minus `portfolio/` |
| `pwa_manifests` | 44 | `manifest.json` / `*.webmanifest` per project |
| `service_workers` | 32 | `service-worker.js` in-tree (+2 generated at build) |
| `zero_dep_projects` | 42 / 44 | every `package.json` `dependencies` + vendored libs |
| `png_published` | 46 | PNGs outside `*/shots/` and `*/screens/` |
| `png_total` | 68 | all PNGs (46 icons + 20 shots + 2 bucio screens) |
| `svg_total` | 84 | all SVGs |
| `loc_total` | 127,063 | html 9,168 · css 11,687 · js 90,101 · mjs 7,915 · ts 2,635 · py 5,557 |
| `loc_js` | 98,016 | js 90,101 + mjs 7,915 |
| `test_files` | 17 | `*.test.mjs` · `*.test.js` · `test.py` · `smoke.mjs` |
| `external_loads` | 0 | external `src=` / `href=` / `fetch(` origins |
| `case_studies` | 6 → 9 | `article.case` in `index.html` |
| `cloud_links` | 30 → 44 | unique `../` project links in the "Also built" cloud |

## 1.3 — Two kinds of check, because two kinds of claim

- [ ] ⬜ **Numeric claims are scraped out of the rendered page**, so the ledger
      verifies *the page*, not a parallel copy of it.
- [ ] ⬜ `portfolio/index.html` gains `data-claim` attributes on the stat
      tiles (Phase 0 already adds them):
      ```html
      <div class="stat" data-claim="projects"><b>44</b> …</div>
      ```
- [ ] ⬜ `verify.mjs --check` parses `index.html`, pulls the `<b>` out of each
      `data-claim` element, and compares it to the computed value. If someone
      edits a number on the page without reality changing, **CI goes red**.
- [ ] ⬜ **Prose claims cannot be parsed reliably** → use a **stale-literal
      lint**. The ledger carries a `stale` list:
      `"Forty-eight"`, `"Quarantotto"`, `"48"`, `"44 PNGs"`,
      `"every one of them"`, `"Every project is an installable PWA"`.
      If any appears anywhere in `index.html`, the check fails with a message
      naming the claim.
- [ ] ⬜ Simple, robust, self-documenting — and it catches exactly the class
      of bug Phase 0 just found.

## 1.4 — `portfolio/verify.html`, the ledger rendered

- [ ] ⬜ **Generated by the tool, never hand-edited**, so it cannot lie.
- [ ] ⬜ Contents:
  - EN/IT heading, same tokens and typography as the main page
  - A table: `claim → value → PASS/FAIL → where it is used on the page →
    the exact command to reproduce it`
  - The command column is a `<code>` block with a copy button — plain text
    without JS, so it works with JavaScript off
  - A summary line: *"N claims · M pass · K fail"*
  - A link back to the portfolio
- [ ] ⬜ **No timestamps in the generated file.** Deliberate: it makes the
      output byte-for-byte deterministic, so CI can regenerate and diff it and
      fail if the committed copy is stale. Same rule will apply to the Phase 5
      audit report.
- [ ] ⬜ Add it to the portfolio service worker's precache list (Phase
      cross-cutting).

## 1.5 — Wiring the page to the ledger

- [ ] ⬜ Each hero stat tile gets a small `⧉` affordance linking to
      `verify.html#<claim-id>` — a `title` attribute plus a focusable link,
      obeying the same 48px-target and focus-ring rules as everything else.
- [ ] ⬜ The Craft panel's corrected sentence gets a trailing *"→ see the
      ledger"* link.

## 1.6 — CI

- [ ] ⬜ Add to `.github/workflows/ci.yml`, after "Analysis tooling tests":
      ```yaml
            - name: The portfolio's claims are true
              run: |
                set -euo pipefail
                node tools/verify.mjs --check
                node tools/verify.mjs --html /tmp/verify.html --quiet
                diff -u portfolio/verify.html /tmp/verify.html
      ```
- [ ] ⬜ Three checks in one step: every value true, the prose lint clean, the
      committed report not stale.
- [ ] ⬜ Runs in about a second — no browser, no network, no dependencies.

## 1.7 — Docs

- [ ] ⬜ `portfolio/README.md` — add a "The claims ledger" section: how to run
      it, how to add a claim, what `stale` is for. Rewrite "Known limits" so it
      no longer leads with the empty client slots. Update the file tree.
- [ ] ⬜ Root `README.md` — add a line about the ledger in the portfolio
      section.
- [ ] ⬜ `llms.txt` — mention the ledger's existence, so an AI reading the
      repo knows the numbers are machine-checked.

---

# Phase 2 — Proof links and honest self-critique

The six cases *describe* their evidence but never *link* it.

- [ ] ⬜ Add a proof row to each case's `.case-actions`:

| Case | Link to |
|---|---|
| 01 CENSUS | `census-pwa/sim.test.mjs` — the 60-seed coverage test |
| 02 STATS | `stats-pwa/smoke.mjs` + the 26 save schemas |
| 03 BUCIO | *no test suite* → say so, and say why |
| 04 SECTOR 7 | `sector7-pwa/tests/` — 4 suites |
| 05 IRONFALL | `ironfall-pwa/tests/render.test.js` — the draw-call budget |
| 06 PULSE | `pulse-pwa/sim.test.mjs` — 500 seeds |

- [ ] ⬜ Add **"What I'd do differently"** — one honest self-critique line per
      case, in both languages. The page is currently too flawless to be
      believable; one line per case reads as seniority.
- [ ] ⬜ Add **"The constraint"**, **"Stack"** and **"Shipped"** lines to each
      case, so all nine read the same way.
- [ ] ⬜ Link the proof rows to `file:line` on GitHub, matching the existing
      `cite` style in the Process section.

---

# Phase 3 — CV and hireability

- [ ] ⬜ `portfolio/cv.html` — a real one-page CV with a `@media print`
      stylesheet and a "Save as PDF" button calling `window.print()`.
      - Dense, one page, A4, no build step, links `assets/portfolio.css`.
      - Print rules: hide the topbar, the toggles, the "Also built" cloud and
        the footer chrome; set `@page { margin: 14mm }`; force
        `print-color-adjust: exact` so the accent gradient survives.
      - *Today a recruiter can get a vibe but not a CV — this is the biggest
        missing artefact in the repo.*
- [ ] ⬜ `#services` section — replaces the three empty `#clients` slots with
      *what you can be hired for*: interface work / performance & accessibility
      audits / PWA builds. Turns a visible weakness into a sales page; a real
      client swaps the copy later.
  - Note: `.panel.placeholder` + `.todo` badge + the `FILL` comments
    (lines 1147-1174) all go away with this section.
- [ ] ⬜ `#stack` section — skills, each linking to the project that proves it.
      No self-scored bars:
      *WebAudio → PULSE · three.js → BUCIO · TypeScript → New Star Soccer ·
      Python → tools/balance · Service Workers → all 44 · Monte-Carlo → the
      balance lab.*
- [ ] ⬜ **Availability + working model** — where you are, time zone, engagement
      shape, and (daring) your rates. Publishing rates filters out bad fits
      and signals you're a professional, not a hobbyist.
- [ ] ⬜ **Timeline section: DROPPED.** The case studies and the CV carry the
      credibility. A timeline without a client history may read as padding.

---

# Phase 4 — Three more case studies

All six current cases are *products*. The most hire-relevant artefacts are
*tools*.

- [ ] ⬜ **07 · THE BALANCE LAB** (`tools/balance/`) — a Monte-Carlo harness:
      Node drives `metro-pwa/sim.js` headless over 5,000 seeded sessions;
      Python (stdlib only) writes an HTML report with inline SVG. Testing,
      simulation, reproducibility, tooling. A frontend hire cares more about
      this than another shoot-em-up. *Screenshot: the generated report — it is
      already an HTML page.*
  - The report HTML is gitignored today (`tools/balance/out/`). For the case
    study you need it published: add a `!portfolio/shots/balance.png`
    exception, or copy the report into `portfolio/shots/`.
- [ ] ⬜ **08 · THE SHARED ENGINE** (`shared/arcade.js` + `shared/chart.js`) —
      one audio helper, one seeded RNG, one chart library, used by 40+ apps.
      The architectural story: how you avoid 40 copies of a beep. This is the
      case that says "I think in systems."
- [ ] ⬜ **09 · EADS STUDIO** (`EADS/`, Flask + gdb/MI) — the root `README.md`
      already flags it as the top gap. No screenshot possible (needs a
      toolchain), so: **an architecture diagram in inline SVG instead**. A case
      study with a diagram instead of a photo reads as confident, not as a
      workaround.
- [ ] ⬜ Each new case gets the same proof links (Phase 2) and the same
      Problem → What I built → Result shape.
- [ ] ⬜ Update `case_studies` in the ledger to 9, and the hero `sub` copy
      ("six of them" → "nine") in both languages.
- [ ] ⬜ The case-study numbering becomes 01–09; check the `.case-num` values
      and the `case` / `case flip` alternation still reads.

---

# Phase 5 — Published self-audits

Nobody publishes a self-audit that finds its own bugs. That is the whole idea.

- [ ] ⬜ `tools/audit/a11y.mjs` — loads each of the 44 apps over the DevTools
      Protocol (the harness `portfolio/scripts/shots.mjs` already speaks), then
      checks in-page:
  - images without `alt`
  - controls without accessible names (button/link/role with no text and no
    `aria-label`)
  - computed contrast ratios of text vs. background (WCAG formula, Appendix C)
  - tap targets < 48px
  - heading-order gaps (`h1 → h3`)
  - `html[lang]` present and valid
  - `aria-live` on status regions in canvas games
  - form controls without labels
  - duplicate `id` attributes
  - `outline: none` on focusables
  - `lang` attribute on inline non-English text
- [ ] ⬜ `tools/audit/perf.mjs` — per-app transfer bytes, request count,
      DOMContentLoaded / load timings. CDP domains: `Network.enable`,
      `Page.enable`, `Performance.enable` (Appendix C).
- [ ] ⬜ `portfolio/audit/report.html` — **generated and committed** (same
      `.gitignore` exception pattern as `portfolio/shots/`), with **the
      failures shown, not hidden**.
- [ ] ⬜ It will find real bugs. Fix them, and let the report show
      before/after. This lands perfectly on the STATS story: *"I will not
      flatter your data."*
- [ ] ⬜ Both scripts **skip cleanly without a browser**, matching the repo's
      existing smoke-test philosophy. They must never turn the build red for a
      missing Chromium.
- [ ] ⬜ Do not put a timestamp in the report — same determinism rule as
      `verify.html`.

---

# Phase 6 — Bold and interactive

- [ ] ⬜ **Live procedural canvas in the hero.** The claim "0 binary art assets"
      is currently text. Put a running canvas on the page and the page
      *performs* the claim. Better: a 60-second playable micro-game — "the
      portfolio is a game too" is memorable.
  - Respect `prefers-reduced-motion`: the page already stops every animation
    for it. The canvas must stop too.
  - Keep the canvas `aria-hidden="true"` and provide a text alternative, or
    the Phase 5 audit will (correctly) flag it.
- [ ] ⬜ **Install-to-phone button.** The portfolio is *already* a PWA
      (manifest + service worker + SVG icons) with no install affordance.
      ~10 lines of `beforeinstallprompt`. Hide the button when the event does
      not fire (iOS has no install event) — a dead button is worse than none.
- [ ] ⬜ `portfolio/notes/` — 3–4 short bilingual essays from material already
      written (Appendix H).
- [ ] ⬜ `portfolio/now.html` — what's shipping this month, availability, last
      updated. Fresh, human, cheap to maintain.
- [ ] ⬜ *(Optional)* a hidden terminal easter egg — behind a link, never in
      front of the case studies. A recruiter who has to play before they can
      read will not read.

---

# Cross-cutting — once, at the end

- [ ] ⬜ Bump the portfolio service worker to `portfolio-v2` and precache the new
      pages.
- [ ] ⬜ Add the new URLs to `sitemap.xml` — whose `lastmod` values are already
      stale (portfolio says 2026-10-18, the rest say 2026-10-14). Generate them
      from git.
- [ ] ⬜ `portfolio/404.html` (the root one already exists).
- [ ] ⬜ `llms.txt` — add the portfolio's services and availability.
- [ ] ⬜ Update `portfolio/README.md`, root `README.md` and `TODOs.md`.

---

# Appendix A — Edit index

Every file and line this plan touches, in one place.

| File | Lines | Phase | What |
|---|---|---|---|
| `portfolio/index.html` | 31–625 | 1.1 | `<style>` → `assets/portfolio.css` |
| `portfolio/index.html` | 684, 690 | 0.3 | hero `sub` EN + IT |
| `portfolio/index.html` | 716–733 | 0.1, 0.2, 1.5 | stat tiles + `data-claim` + footnote |
| `portfolio/index.html` | 328–366 | 0.2 | `.stat b .of` + `.stat-note` CSS |
| `portfolio/index.html` | 1210–1256 | 0.4, 0.5 | Craft panels 5 and 6 |
| `portfolio/index.html` | 1147–1174 | 3 | `#clients` placeholders → `#services` |
| `portfolio/index.html` | 1412–1446 | 0.6 | "Also built" cloud |
| `portfolio/index.html` | 1503–1593 | 1.1 | inline `<script>` → `assets/portfolio.js` |
| `portfolio/verify.html` | — | 1.4 | **generated** |
| `portfolio/assets/portfolio.css` | — | 1.1 | **new**, extracted |
| `portfolio/assets/portfolio.js` | — | 1.1 | **new**, extracted |
| `portfolio/cv.html` | — | 3 | **new** |
| `portfolio/notes/*.html` | — | 6 | **new** |
| `portfolio/now.html` | — | 6 | **new** |
| `portfolio/audit/report.html` | — | 5 | **generated** |
| `tools/verify.mjs` | — | 1.2 | **new** |
| `tools/audit/a11y.mjs` | — | 5 | **new** |
| `tools/audit/perf.mjs` | — | 5 | **new** |
| `.github/workflows/ci.yml` | after 116 | 1.6, 5 | new CI steps |
| `.gitignore` | — | 5 | `!portfolio/audit/` exception |
| `README.md` | 76–77, 89–90 | 0.7 | duplicate `16`, swapped `28`/`29` |
| `portfolio/README.md` | — | 1.7 | new ledger section, file tree |
| `llms.txt` | — | 1.7, cross | ledger + services |
| `sitemap.xml` | — | cross | new URLs, fresh `lastmod` |

# Appendix B — Implementation sketches

## B.1 — `tools/verify.mjs`

```js
/*
 * tools/verify.mjs — the claims ledger.
 *
 * Every number the portfolio states is recomputed here from the repository
 * and compared against the number the page actually renders. If a claim
 * drifts, CI fails. That is the whole point: the page argues for itself with
 * numbers, so the numbers had better be true.
 *
 *   node tools/verify.mjs            # table
 *   node tools/verify.mjs --json     # machine-readable
 *   node tools/verify.mjs --check    # exit 1 on drift
 *   node tools/verify.mjs --html out.html
 *
 * No dependencies. The house rule is that a static page ships zero of them,
 * and a tool that audits it should not be the exception.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/* A claim is: an id, a value, a way to compute it, and the shell command a
   reader can paste into a terminal to reproduce it. The `how` string is the
   part that matters most — it is what turns an assertion into a fact. */
const CLAIMS = [
  {
    id: "projects",
    label: "Projects shipped",
    labelIt: "Progetti pubblicati",
    how: "ls -d */ | while read d; do [ -f \"$d/index.html\" ] && echo $d; done | grep -v '^portfolio/$' | wc -l",
    compute: () => projectDirs().length,
  },
  /* ... one entry per row of the ledger table ... */
];

/* Numbers that appear in the prose rather than in a data-claim attribute.
   A literal that shows up in the page means the page is out of date. */
const STALE = [
  "Forty-eight", "Quarantotto", "48",
  "44 PNGs", "44 PNG",
  "every one of them", "Every project is an installable PWA",
];
```

- [ ] ⬜ `compute()` for each claim must be a pure function of the repository
      state — no network, no clock, no randomness. The output has to be
      reproducible.
- [ ] ⬜ `how` must be a command that a reader can paste and get the same
      number. Write it, then run it, and check the two agree.

## B.2 — The page scraper

```js
/* Numeric claims are read out of the page, not out of a copy of the page.
   The stat tiles carry data-claim="<id>", so the check is: does the number
   the reader sees equal the number the repository produces? */
function scrapeStat(html, id) {
  const re = new RegExp(
    `data-claim="${id}"[^>]*>\\s*<b>([\\s\\S]*?)</b>`, "i");
  const m = html.match(re);
  if (!m) return null;
  return m[1].replace(/<[^>]+>/g, "").trim();   // "42<span class="of">/44</span>" -> "42/44"
}
```

- [ ] ⬜ Strip inner tags before comparing, so `42/44` written as two spans
      still compares equal to the string `"42/44"`.
- [ ] ⬜ A `data-claim` with no matching tile is a **failure**, not a skip. A
      claim that has left the page has not become true.

## B.3 — The stale-literal lint

```js
function staleHits(html) {
  return STALE
    .map((s) => [s, html.includes(s)])
    .filter(([, found]) => found)
    .map(([s]) => s);
}
```

- [ ] ⬜ Report the offending literal *and* the claim it contradicts, so the
      fix is obvious.
- [ ] ⬜ When a claim legitimately changes, remove its old literal from
      `STALE` in the same commit that updates the page. Otherwise the lint
      becomes noise and people start ignoring it.

## B.4 — CI

```yaml
      - name: The portfolio's claims are true
        run: |
          set -euo pipefail
          node tools/verify.mjs --check
          node tools/verify.mjs --html /tmp/verify.html --quiet
          diff -u portfolio/verify.html /tmp/verify.html
```

## B.5 — The a11y audit, via CDP

The DevTools Protocol client already exists in
`portfolio/scripts/shots.mjs` (lines 68–280). Reuse it rather than writing a
second one — it is a promise-per-id client over Node's built-in `WebSocket`,
and it already handles `Target.createTarget` / `Target.attachToTarget` /
flat sessions.

```js
/* The checks run inside the page, because that is the only place the real
   computed styles live. The audit script injects this and reads the result
   back as JSON. */
const AUDIT = `(() => {
  const out = { alt: [], names: [], contrast: [], targets: [], headings: [],
                lang: null, live: [], labels: [], ids: [], focus: [] };
  /* ... per-check collection ... */
  return JSON.stringify(out);
})()`;
```

- [ ] ⬜ Run the audit against the *served* pages, not `file://` — service
      workers and `fetch` behave differently.
- [ ] ⬜ Skip cleanly when no Chromium is found (the `findChromium()` helper
      already exists in `shots.mjs`).
- [ ] ⬜ Record which app each finding came from, so the report can group by
      project and by rule.

# Appendix C — Reference

## C.1 — The bilingual CSS contract

```css
.it { display: none; }
[data-lang="it"] .en { display: none; }
[data-lang="it"] .it { display: revert; }
```

**The trap:** any rule that sets `display` on an element carrying `.en`/`.it`
outranks the language switch, because it has higher specificity — and then
**both** languages appear at once. That is why the stat labels carry their
own explicit pair:

```css
[data-lang] .stat .lbl { display: none; }
[data-lang="en"] .stat .lbl.en { display: block; }
[data-lang="it"] .stat .lbl.it { display: block; }
```

- [ ] ⬜ Rule of thumb for new blocks: **do not set `display` on a `.en`/`.it`
      element**. Put the layout on a wrapper instead.
- [ ] ⬜ Check every new bilingual block in both languages before committing.

## C.2 — WCAG contrast ratio

```js
/* Relative luminance, per WCAG 2.x. sRGB channel c in [0,1]. */
function luminance(r, g, b) {
  const f = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(fg, bg) {
  const a = luminance(...fg), b = luminance(...bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}
```

- [ ] ⬜ AA thresholds: 4.5:1 for normal text, 3:1 for large text (≥18.66px
      bold or ≥24px) and for UI component boundaries.
- [ ] ⬜ Finding the background means walking ancestors until a non-transparent
      `background-color` is found. `rgba(0,0,0,0)` is transparent; a
      gradient is not measurable this way — flag it as "manual check" rather
      than guessing.

## C.3 — CDP domains needed

| Purpose | Domains / methods |
|---|---|
| Navigate & wait | `Target.createTarget`, `Target.attachToTarget`, `Page.enable`, `Page.navigate`, `Page.loadEventFired` |
| Inject before page scripts | `Page.addScriptToEvaluateOnNewDocument` |
| Evaluate in page | `Runtime.enable`, `Runtime.evaluate` |
| Screenshot | `Page.captureScreenshot` |
| Viewport & DPR | `Emulation.setDeviceMetricsOverride` |
| Network bytes | `Network.enable`, `Network.loadingFinished` (`encodedDataLength`) |
| Timing | `Performance.enable`, `Performance.getMetrics` |

- [ ] ⬜ For the perf audit use `deviceScaleFactor: 1` and a fixed viewport,
      so the numbers are comparable between runs.
- [ ] ⬜ Note the same caveat as `shots.mjs`: at 2× the screenshots were
      1.9 MB, which would have undercut the performance claim the page is
      making. Payload numbers must not be inflated by the measurement.

## C.4 — House rules this plan obeys

- [ ] Plain HTML, CSS and JS. No bundler, no package.json, no dependencies.
- [ ] Zero binary art assets. Zero trackers. Works offline.
- [ ] Bilingual EN/IT in the markup as sibling `.en` / `.it` elements, so the
      page is complete and crawlable with JavaScript off.
- [ ] One service worker cache per app.
- [ ] Any new tool must skip cleanly when its prerequisite is missing
      (browser, toolchain) rather than failing the build.
- [ ] 48px minimum touch targets, visible focus rings, `aria-pressed` on
      toggles, `aria-live` on status.
- [ ] `prefers-reduced-motion` stops animations rather than shortening them.
- [ ] Safe-area insets are CSS variables, so a notch does not break layout.

# Appendix D — Definition of Done, per phase

| Phase | Done when |
|---|---|
| 0 | Every claim on the page is true; `node tools/verify.mjs` (once 1.2 exists) reports zero failures; both languages updated together; the README table is correct. |
| 1 | `node tools/verify.mjs --check` exits 0; `portfolio/verify.html` is committed and byte-identical to a fresh regeneration; CI runs both checks; the README and `llms.txt` describe the ledger; no timestamp in the generated file. |
| 2 | Every case links a real, existing artifact; "What I'd do differently" appears on all of them in both languages. |
| 3 | `portfolio/cv.html` prints to exactly one A4 page; the PDF is readable; `#services` and `#stack` exist; the `.todo` placeholders are gone. |
| 4 | Nine cases; the ledger says 9; the hero copy says nine; each new case has proof links and a screenshot or a diagram. |
| 5 | `portfolio/audit/report.html` is committed, shows failures, regenerates byte-identically, and the audit skips cleanly with no browser. |
| 6 | The install button never dead-ends; the canvas respects reduced motion; every new page is bilingual and offline-capable. |

# Appendix E — Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| CSS extraction breaks the page | Medium | High | Own commit; compare the extracted file byte-for-byte with the original block before switching; revert is one `git revert`. |
| The `42/44` tile reads as a weaker claim than `0` | Medium | Low | Say so in the copy, not the tile: the footnote names both exceptions. Revisit if it reads wrong. |
| The ledger goes stale because new numbers are typed directly on the page | **High** | High | The house rule at the top of this file: no number on the page without a ledger entry in the same change. The `data-claim` scrape catches the stat tiles; the `stale` lint catches the prose. |
| `verify.html` diff fails on an unrelated change | Low | Medium | No timestamps, no random ordering — sort every collection before rendering. |
| The a11y audit finds too many issues to fix | **High** | Medium | Report them, fix the cheap ones, and publish the rest. A visible failure count is more persuasive than a fake 100%. |
| New pages drift from the portfolio's visual language | Medium | Medium | They all link `assets/portfolio.css`; no page gets its own copy of the design. |
| Scope creep — Phases 4–6 land half-finished | Medium | High | One phase per commit; each phase's Definition of Done is independent. A half-built case study is worse than no case study. |
| The page grows heavy and the "fast" claim weakens | Low | Medium | The ledger reports `loc_total`; the perf audit in Phase 5 measures the portfolio's own payload. Measure it, like everything else. |

# Appendix F — What runs where

| Task | Local | CI | Needs a browser | Committed output |
|---|---|---|---|---|
| `tools/verify.mjs` | ✅ | ✅ | no | `portfolio/verify.html` |
| `tools/audit/a11y.mjs` | ✅ | ✅ (skips) | yes | `portfolio/audit/report.html` |
| `tools/audit/perf.mjs` | ✅ | ✅ (skips) | yes | `portfolio/audit/report.html` |
| `portfolio/scripts/shots.mjs` | ✅ | ❌ | yes | `portfolio/shots/*.png` |
| `tools/balance/run.mjs` | ✅ | ✅ (1,200 sessions) | no | `tools/balance/out/` (gitignored) |
| `tools/corpora/extract.mjs` | ✅ | ✅ | no | `tools/corpora/out/` (gitignored) |

- [ ] ⬜ Browser-dependent scripts must print `SKIP` and exit 0 when no
      Chromium is present. The repo's existing rule: *"a missing browser makes
      them skip rather than fail, so they can never be the reason CI goes
      red."*

# Appendix G — Glossary

| Term | Meaning here |
|---|---|
| **Claim** | A number the page states, with a way to check it. |
| **Ledger** | `tools/verify.mjs` + its claim registry: every claim, its value, and how to reproduce it. |
| **Stale literal** | A phrase that, if found in the page, proves a claim is out of date. |
| **Proof link** | A link from a case study to the test file or CI job that substantiates it. |
| **Bilingual block** | A pair of sibling `.en` / `.it` elements, both in the markup, one shown by CSS. |
| **Case study** | A Problem → What I built → Result writeup with real numbers. Currently 6; target 9. |
| **PWA** | Installable, offline-capable app with its own manifest and service worker. 34 of 44 here. |
| **The house rule** | Plain HTML/CSS/JS, no dependencies, no build step, no binary art, no trackers. |

# Appendix H — Source material for the Notes essays (Phase 6)

Already written, already bilingual, already yours:

- [ ] ⬜ `PWA_COPY_GUIDE.md` (13 KB) — the writing voice. The best starting
      point for "how I write copy for a game".
- [ ] ⬜ `BEST_PWA_ANALYSIS.md` (7 KB) — the comparative analysis.
- [ ] ⬜ `tools/corpora/` — the corpus lab that measures your *own* prose:
      sentence lengths, type/token ratio, hapax legomena, Zipf fits, EN/IT
      overlap. A piece called *"What my own corpus says about my writing"*,
      with the real numbers from the tool, would be the most distinctive
      essay on the site.
- [ ] ⬜ The `cite` blockquotes in the Process section (6 of them) are already
      essay-shaped — they are the seeds.
- [ ] ⬜ `portfolio/README.md` "Known limits" and "What's next" — short,
      honest, and exactly the register an essay wants.

# Appendix I — Verification commands

Every number in this file came from running these.

```bash
# project count -> 44 (45 including portfolio/)
for d in */; do d=${d%/}; [ -f "$d/index.html" ] && echo "$d"; done | wc -l

# PNGs -> 68 total / 46 published
find . -name '*.png' -not -path '*/node_modules/*' -not -path '*/dist/*' | wc -l
find . -name '*.png' -not -path '*/node_modules/*' -not -path '*/dist/*' \
     -not -path '*/shots/*' -not -path './bucio/public/screens/*' | wc -l

# SVGs -> 84
find . -name '*.svg' -not -path '*/node_modules/*' -not -path '*/dist/*' | wc -l

# lines of code -> 127,063
find . \( -name '*.js' -o -name '*.mjs' -o -name '*.ts' \
       -o -name '*.html' -o -name '*.css' -o -name '*.py' \) \
     -not -path '*/node_modules/*' -not -path '*/dist/*' \
     -not -path '*/.venv/*' -not -path '*/__pycache__/*' \
  | xargs wc -l | tail -1

# runtime dependencies -> bucio has three.js, everything else none
python3 -c "import json;print(json.load(open('bucio/package.json'))['dependencies'])"

# external loads -> 0 (the "0 trackers" claim)
grep -rnE '(src|href)="https?://|fetch\("https?://|from "https?://' \
     --include='*.html' --include='*.js' --include='*.mjs' . \
  | grep -v node_modules | grep -v '/dist/'

# service workers -> 32 in-tree, 2 generated at build
for d in */; do d=${d%/}; [ -f "$d/index.html" ] && [ -f "$d/service-worker.js" ] \
  && echo "$d"; done | wc -l
for d in */; do d=${d%/}; [ -f "$d/index.html" ] && [ ! -f "$d/service-worker.js" ] \
  && echo -n "$d "; done; echo

# projects missing from the portfolio "Also built" cloud -> 13
python3 - <<'PY'
import os, re
projs = sorted(d for d in os.listdir('.') if os.path.isdir(d)
               and os.path.isfile(os.path.join(d,'index.html')) and d != 'portfolio')
html = open('portfolio/index.html', encoding='utf-8').read()
cloud = html.split('<div class="cloud">')[1].split('</div>')[0]
linked = set(re.findall(r'href="\.\./([^/"]+)/?"', cloud))
print([p for p in projs if p not in linked])
PY
```

# Appendix J — Why this order

Phase 1 first because **every later phase writes numbers onto the page** —
case-study line counts, audit pass rates, benchmark figures, skill claims.
Build the ledger *before* the new content lands, and the new content inherits
the check for free. Otherwise you write nine case studies' worth of numbers
with no machine watching them, and you are back here in a month fixing drift
by hand.

Phase 0 first because it is ~30 minutes and it removes the five ways the
current page can be called out.

---

## Two things to watch

- [ ] The CSS extraction (1.1) — mechanical, but it touches the file that
      currently works. Hence its own commit.
- [ ] The "42/44" tile (0.2) — the fraction is less punchy than a lone `0`,
      and the honesty is worth more. Revisit if it reads wrong.

---

**Status: nothing implemented yet. Phases 0 and 1 first.**
