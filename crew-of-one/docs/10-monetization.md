# 10 — Monetization

## Model

Free download. Free prologue. Free daily heist forever. Revenue comes only from **in-game microtransactions**.

No ads. No energy. No loot boxes. No gacha. No pay-to-win. No external merch.

## Free

- Prologue: 3 vaults, ~20–30 minutes.
- Daily Heist + leaderboard, forever.
- Limited hints earned by play.
- Some cosmetics earned through ranks/streaks.

## Paid

| Item | Price | Contents |
|---|---|---|
| Chapter 2 | $1.99 | 4 vaults |
| Chapter 3 | $2.99 | 4 vaults |
| Chapter 4 | $2.99 | 4 vaults + finale |
| Full Campaign Bundle | $4.99 | All 12 paid vaults + challenge modes |
| Cosmetic Pack | $0.99–$2.99 | Ghost trails, watch skins, UI themes |
| Supporter Pack | $4.99 | All cosmetics + OST + credits |

Launch offer: bundle $3.99 for the first week.

## Never sell

- Extra echoes.
- Easier puzzles.
- Leaderboard advantages.
- Paid hints that solve puzzles.
- Ads, energy, loot boxes, gacha.

## Paywall UX

- After vault 3, chapter-complete screen with story cliffhanger.
- Bundle shown as best value; chapters available separately.
- One tap to purchase; one tap to restore.
- No countdown timers, no fake discounts, no nagging.

## Web checkout

- In-game store → Lemon Squeezy Checkout.
- Webhook → Cloudflare Worker → entitlement.
- License key or magic return link.
- Offline grace 30 days.
- Restore via license key/email.

## Mobile IAP

- Free download.
- Apple/Google IAP via RevenueCat.
- Restore purchases.
- No external payment links on iOS.
- Store-compliant wording.

## Entitlements

- One schema: `prologue`, `chapter-2`, `chapter-3`, `chapter-4`, `full-campaign`, `cosmetics`, `supporter`.
- Signed token stored locally.
- Server validation; offline grace.
- Content flags in `packages/content`.

## Pricing experiments

- Web can A/B price the bundle ($3.99 vs $4.99).
- Mobile pricing is harder to test; use soft-launch regions.
- Track conversion by paywall placement.
- Don’t A/B the core game.

## Metrics

- Demo start → vault 3 complete.
- Paywall view → purchase.
- ARPPU.
- Refund rate.
- D1/D7 retention.
- Share rate.
- Cosmetic attach rate.

## Reality check

Microtransactions need volume. A niche puzzle game may convert 2–5% of demo players. The free daily + share cards are the growth engine; the campaign bundle is the conversion. If conversion is weak, test a single “Full Unlock” IAP at $3.99–$4.99. If it remains weak, the game may be better as a premium title—revisit after soft launch.

## Ethics

- Transparent prices.
- No pressure.
- No gambling mechanics.
- No selling solutions.
- No leaderboard advantage.
- Easy restore and refunds per platform policy.
