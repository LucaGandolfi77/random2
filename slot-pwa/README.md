# Slot Machine

> One payline. Three reels. A jackpot meter that grows with every spin you have
> already paid for. Twenty-five lines of hand-written JS with a deliberate
> mathematical confession behind it.

*3-reel casino.* No build step. No dependencies. No art assets — the reels,
the lever and the particles are drawn on canvas.

**Play it:** <https://lucagandolfi77.github.io/random2/slot-pwa/>

```bash
python3 -m http.server 8080
# open http://localhost:8080/slot-pwa/
```

---

## The one rule

**The centre row of three reels, and every symbol is equally likely.**

Three identical symbols pay `payoutTable[symbol] × bet`. Three 💰 pay the
entire accumulated jackpot and reset it to 500. Three ⭐ grant 5 free spins that
auto-play every 800ms.

The mathematical confession: each reel is `Array(30).fill(symbols).flat()` — 240
entries with every symbol appearing exactly 30 times. So all eight symbols have
**identical 1-in-8 odds**, while the payout table runs from 2 (cherry-style) to
50 (clover). A flat, house-losing payout curve. Because the landing offset is
re-randomised into `[10, 229]` on stop, the win chance per reel is pure uniform.

| | |
|---|---|
| 🍇 | ×5 |
| 🍎 | ×4 |
| 🍊 | ×3 |
| 🍋 | ×2 |
| 🔔 | ×10 |
| ⭐ | ×15 |
| 💰 | ×20 |
| 🍀 | ×50 |

## The systems

| | Rule, as implemented |
|---|---|
| **Jackpot meter** | grows `5 × bet` on every paid spin. Persisted **globally per browser** in `localStorage["slot-jackpot"]` |
| **Reels** | 3, random start offset, `speed = rand(0.08, 0.3)`, `stopAt = now + rand(500, 1500)` |
| **Free spins** | 5 per ⭐, auto-playing on an 800ms interval |
| **Sound** | `spinTick` every 200ms while spinning; a jackpot arpeggio 523/659/784/1047 with 40 gold particles on 💰 |
| **Bet** | 1–10, raising it raises the jackpot growth but not the odds |

## The numbers

Canvas 300×200 · 3 reels · 8 symbols · 30 of each per reel · `baseJackpot 500` ·
`jackpotStep 5` · bet 1–10 · 5 free spins.

## Controls

| Action | |
|---|---|
| Spin | the SPIN button, or `Space` |
| Raise the bet | BET, cycling 1→10 |
| Change theme | the theme button, cycling 4 palettes |

No touch handlers on the canvas — everything is a DOM button, which is the
right shape for this one.

## Saving

`localStorage["slot-pwa"]` → `{highScore, theme}` and
`localStorage["slot-jackpot"]` → the meter. Plus `slot-install-dismissed`.

## Known limits

- 🟡 **No loss path at all.** `state.gameOver` and `state.paused` are declared
  and never set. `#overlay-stats`, `#final-score` and `#final-high` are cached
  and never filled. `stopAllReels()` is dead code — the loop stops reels inline.
- 🟡 **Spinning never costs anything.** The bet feeds the jackpot but is never
  deducted, so there is no bankroll and no bankruptcy — the one thing a slot
  machine has.
- ⚪ `config.spinDuration`, `config.tickRate` and `config.lineWidth` are unused.
- ⚪ `saveHighScore()` only fires on a win, so the highest score of a session
  that ends on a losing spin is never written.

## What's next

- 🟠 **Charge for spins.** A bankroll that can go to zero is the entire
  tension of the form. With free spins and a global jackpot meter, the game
  already has the currency — it just never takes it back.
- 🟡 **Weight the reels.** Give the payouts a curve that matches the odds, or
  make the rarity explicit to the player. Flat 1/8 with a ×50 top prize is a
  mathematical oddity worth either fixing or stating.
- 🟡 Drag-to-spin on the canvas: grabbing the reels and pulling would be more
  satisfying than a button, and it is idle motion anyway.
- 🟢 Multiple paylines (the engine supports 3 reels — a 5-line variant is a
  loop, not a rewrite).
- 🟢 Sound for the near-miss: reels slowing a symbol short of the jackpot.
- ⚪ Remove the unused config keys and the dead overlay elements.

## Copyright & licence

**© 2026 Luca Gandolfi.** Code released under the **MIT** licence — see
[`LICENSE`](../../LICENSE).
