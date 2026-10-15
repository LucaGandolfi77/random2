# STATS

> Your arcade, measured. Every game in this repo already writes your records,
> playtime and runs to this device — this page reads them and draws them.
> Nothing leaves the browser.

No build step. No dependencies. No art assets: every chart is drawn on a
canvas by `shared/chart.js`.

This is the page that makes the "zero trackers" claim checkable. The data is
on the device, and the page will hand it to you as JSON.

**Play it:** <https://lucagandolfi77.github.io/random2/stats-pwa/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/stats-pwa/
```

---

## What it reads

Four sources, and the page is explicit about which is which:

| Key | What it holds | How it's read |
|---|---|---|
| `random2-runs` | one record per finished run, newest-first, capped at 1000 | `R2.stats.runs()` |
| `random2-runs-by-day` | rolled-up per day per game | `R2.stats.days()` |
| `random2-playtime` | seconds per game, plus `byHour[24]` and `byDay[7]` | `R2.loadPlaytime()` |
| `random2-last-played` | last time each game was opened | direct |
| 26 legacy keys | the per-game save files, in their own shapes | `R2.stats.legacy()` |

A returning player has legacy saves but no run log — the log only exists from
the version that started writing it. So the page shows what it has and says
plainly when a chart has nothing to draw, and why.

## The panels

**Overview** — runs per day, minutes per logged day, score distribution (mean
marked, median stated), running maximum of best score, runs by outcome.

**Runs** — per selected game: histogram, outcomes, wave reached, and a scatter
of run length against score with a least-squares trend line. Plus the 40 most
recent runs in a table.

**Time** — the heatmap: rows Monday→Sunday, columns 00:00→23:00.

**Library** — every game with runs, its best / mean / median, time spent, and
when it was last played.

**Records** — the raw per-game save files, fields flattened. Deliberately
ununiform: these are 26 different schemas and the page doesn't pretend
otherwise.

**Data** — export, import, erase. And an enumeration of every key in local
storage with its byte size, so "what is stored" is a question with an answer.

## The honest bits

Three places where the page could have lied and doesn't:

**The heatmap is an estimate, and says so.** `trackPlaytime` stores the hour
marginal and the weekday marginal, not a joint distribution. Each cell is the
hour share × the weekday share — which is wrong for a genuinely correlated
habit (a player who plays at 9pm Friday also plays at 9pm Saturday). The
caption reads: *"treat it as a rough shape, not a measurement."*

**The score distribution mixes incompatible scoreboards.** Snake scoring and
a 20,000-pax metro network are not comparable. The caption says so.

**An empty chart draws its own placeholder.** It does not zero `canvas.width`
— which was the earlier behaviour and which permanently collapses the element,
since once width is 0 there is no layout box to measure on the next draw.

## Charts

`shared/chart.js` — zero-dependency Canvas 2D: line, area, bar, histogram,
scatter, boxplot, heatmap, sparkline. Shared `scale`/`ticks`/`axis` core,
DPR-aware, honours `prefers-reduced-motion`, and reads its colours from CSS
custom properties at draw time so a theme switch is just a redraw.

Canvas cannot parse `var(--accent)` — assigning it to `strokeStyle` leaves the
previous colour in place, which on a light card means black. `resolveColor()`
resolves theme tokens, and the palette is copied per series rather than shared.

Category bar charts suppress the numeric x ticks, which would otherwise print
on the same baseline and overprint the category labels. Bar labels skip
forward rather than collide when the chart is narrow.

## How it's built

```
stats-pwa/
├── app.js          panels, data access, formatting
├── index.html      page shell
├── styles.css      theme tokens + --chart-* pair for shared/chart.js
├── manifest.json
├── service-worker.js
├── icons/          SVG + maskable
├── smoke.mjs       Playwright: seeded store, every panel, empty state
└── shot.mjs        one PNG per panel + light mode + mobile
```

Canvases inside a hidden panel measure zero, so every tab switch redraws
*after* the panel becomes visible. Without that, every chart on an
unvisited tab would come out blank.

## Saving

Reads only — and one write: `random2-stats-theme`, the light/dark choice.
Follows the OS preference until you toggle it.

**Export** bundles 6 keys to `random2-stats-YYYY-MM-DD.json`.
**Import** accepts only a file with a `data` block, refuses invalid JSON with a
message, and re-reads everything on success.
**Erase** removes the run log, the daily rollup and the event counters, and
leaves every game's own personal bests alone. It asks first.

## Tests

```bash
node stats-pwa/smoke.mjs   # in-browser, needs a local server + playwright
```

## Known limits

- 🟡 **Export is lossy.** `EXPORT_KEYS` omits `random2-stats-theme` and every
  legacy save key, so an export → import round-trip loses the theme and all
  per-game records. `shot.mjs` also only screenshots 5 of the 6 panels.
- 🟡 **The time-by-day series needs two logged days.** Playtime is tracked
  without dates, so a per-day series only exists from the run log onwards.
  Below that the panel degrades with an explanation rather than inventing one.
- 🟡 The heatmap is a product of marginals, as above — a real joint
  distribution would need the playtime tracker to bucket into `(hour, day)`
  cells.
- ⚪ No keyboard navigation of the tabs and no ARIA `tablist` semantics beyond
  `role="tablist"`.

## What's next

- 🟠 **Make export complete** — include `random2-stats-theme` and every legacy
  key, so "export, wipe, import" is a real backup.
- 🟠 **A joint playtime histogram.** Add a 7×24 cell grid to
  `trackPlaytime` and the heatmap stops being an estimate.
- 🟡 **A leaderboard per game.** The data is all in `random2-runs`; it currently
  only shows "best".
- 🟡 **A week/year view.** 1,000 capped runs over a year is a thin sample; the
  rollup already has the shape for a longer horizon.
- 🟢 **Keyboard tab navigation** and real `aria-selected` handling.
- 🟢 Coverage badge per game: how many of its runs are scored at all.
- ⚪ Screenshot all six panels in `shot.mjs`.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../../LICENSE).

No network requests, no analytics, no cookies. The only page that runs is the
one you opened.
