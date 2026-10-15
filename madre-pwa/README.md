# MADRE

> A fermentation house. **Real time is the ingredient.** The maturation curves
> are evaluated from wall-clock timestamps: close the app on Wednesday, reopen
> it on Sunday, and the cheese is four days older. It has also, if you forgot
> it, rotted.

*Casa di fermentazione.* No build step, no dependencies, no art assets — the
curves, the rooms and the batches are drawn from primitives.

**Play it:** <https://lucagandolfi77.github.io/random2/madre-pwa/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/madre-pwa/
```

---

## The one rule

**Forgetting a batch is an economic decision, not a mistake.**

Quality is a pure function of elapsed real time — including time the app was
closed — against a per-room multiplier. Nothing is ticked while you are away:
`processOffline()` recomputes every batch from `Date.now()` on load and shows a
"while you were away" report of what peaked and what spoiled. The offline
window other games treat as free is here the process itself, and it runs toward
masterpiece or rot with equal indifference.

`load()` also guards against the clock going backwards, which is the one way
the model can be cheated.

## The systems

| | Rule, as implemented |
|---|---|
| **Maturation** | `te = age × room.mult`. Rise `0.25 + 0.75(te/peak)^0.8`, then `1 − ((te−peak)/(spoil−peak))^1.4` down to 0 |
| **Peak window** | `0.9·peak … 1.3·peak` |
| **Rooms change the clock** | pantry ×1.0, cellar ×0.6 (£200), warm room ×1.6 (£350). Warm races to the peak *and* to ruin; cold stretches the selling window |
| **Contracts** | `2 + floor(rep/40)` per day from `mulberry32(R2.dailySeed())`. Pay `qty × price × 1.5 × (0.6 + rep/100·0.9)`, deadline 30–44h out. Miss = −12 reputation |
| **Delivery** | needs batches at quality ≥ 0.65, pays ×repMult, +8 reputation |
| **Market** | every 300,000ms of real time, `mult += rand(−0.08, 0.10)` then `mult += (1−mult)·0.04` — mean reversion, clamped 0.65–1.65. The closed app still counts real time, so the market catches up in chunks of at most 16 |
| **Starvation** | honey-equivalent `pop × 0.015 × (1 + 0.08(year−1))` per second; a bee lost every 3s below zero |

## The numbers

Five recipes, and the spread is the game: kefir peaks in **5 minutes** and
spoils in 11.7; kombucha 30/70 minutes; yogurt 4/9 hours; formaggio 24/60 hours;
pecorino **4 days / 8.3 days**, €1,100/£430.

Start: £60, reputation 50 (0–100), 5 slots. Unlocks £0·40·120·450·1600. Expand
+3 slots at £70 per room.

## How it's built

```
madre-pwa/
├── game.js     DOM-driven UI + small canvas curves for the batches
├── index.html
├── styles.css
├── manifest.json
├── service-worker.js
└── icons/
```

The clock is `tick()` on a 500ms interval, skipped while the tab is hidden, with
`save()` on `pagehide` and `visibilitychange`. Batch state is never advanced by
frame time — every read goes through `qualityAt(b, now)`.

## Controls

Three tabs — *cantina*, *contratti*, *mercato*. Everything is a delegated click
on `#view`: new batch, place, learn, buy room, expand slots, sell, discard,
deliver. Plus notify, help and sound buttons. Pure DOM, no canvas interaction,
no keyboard.

## Saving

`localStorage["madre-pwa"]` → the entire state under `{v:1, money, rep, recipes,
rooms, batches, contracts, market, dailySeed, lastSeen, stats, notifyOn}`, and
`localStorage["madre-records"]` → `{highScore}`. One of the few games in the
repo with a genuinely complete save.

## Known limits

- 🟡 **The peak notification is unreachable.** `notify()` requires
  `document.hidden`, but its only caller (`checkPeakNotifications` via `tick()`)
  is gated on `!document.hidden`. A Notification can therefore only fire while
  the tab is visible — the one case where nobody needs it.
- 🟡 **No fail state.** No bankruptcy, no game over. Reputation can reach 0
  with no consequence, and every purchase is affordability-gated so money
  never goes negative.
- 🟡 `processOffline()` compares `away` (milliseconds) against `120` — an
  off-by-1000 that makes the "while you were away" modal fire on almost every
  relaunch.
- 🟡 `state.firstDay = state.lastSeen` resets the "Giornata" chip to 1 on every
  reload.
- ⚪ `qualityAt()` and `qualityCurve()` are duplicate implementations of the
  same curve. `var firstRun` is written and never read.

## What's next

- 🟠 **Fix the notification gate.** Notifications should fire from
  `processOffline()` — the moment the player returns and has something to
  know — not from a visible tab.
- 🟠 **Give it a fail state.** Reputation at 0 should close contracts; an
  unsellable batch should cost more than its margin. Right now nothing can be
  lost.
- 🟡 Correct the `away` comparison to milliseconds and the `firstDay` reset.
- 🟡 Strains that mutate after N generations, and micro-climates that make two
  rooms of the same strain diverge — `qualityAt()` already takes the room, so
  this is a data change.
- 🟢 A visual cellar: batches as objects on shelves with the curve as a live
  line, rather than a list.
- 🟢 Sound for the peak window — a soft chime when a batch enters it.
- ⚪ Deduplicate `qualityAt`/`qualityCurve`.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../../LICENSE).
