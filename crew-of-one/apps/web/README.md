# Crew of One Web

Phaser PWA prototype.

```bash
pnpm --filter @crew-of-one/web dev
```

## Controls

- Drag anywhere on the board to move.
- `R` or the on-screen REWIND button to rewind and leave an echo.
- `E` or ACT to whistle / use a lever / grab the gem.
- `Shift`, `Space`, or DASH to dash.
- `U` or UNDO to remove the newest echo.
- `P` or ▶ CREW to preview the recorded crew at 2×.
- `Backspace` or the top-right RESET label to reset the heist.
- `1`–`0` load vaults 1–10 directly for debugging.
- **LEFT-HANDED** in the menu footer mirrors the action bar and persists across sessions.
- **LARGE TEXT** in the menu footer scales the HUD and menus and persists across sessions.
- `Esc` opens the heist menu.
- `♪` in the top bar toggles placeholder sound.

## Offline / install

The generated service worker precaches the app shell. Load once, then test offline in browser devtools. Chromium shows **INSTALL APP** in the menu footer; iOS Safari shows **ADD TO HOME** instructions. The first launch opens **HOW TO PLAY**; it stays available in the menu footer. The daily leaderboard falls back to a saved local best when the Worker is unreachable.

## Current state

The full ten-vault rectangle slice runs on the real deterministic sim. The web shell includes level select, saved bests and ranks, a daily heist, server-verified daily submissions with an offline fallback, a leaderboard with nicknames, and a 2× ghost preview. Art and audio are still placeholders; the next step is a pixel-art vertical slice.
