# 16 — QA Test Plan

## Unit

- Fixed timestep determinism.
- Record/replay equality.
- Ghost tape truncation and fade.
- Plate hold/latch.
- Door open/close.
- Lever toggle.
- Gem first-grab-wins.
- Guard vision cone, line-of-sight, suspicion decay.
- Noise investigation.
- Echo distraction.
- Win/lose conditions.
- Rank calculation.
- Vault schema validation.

## Integration

- Every vault solution tape wins headlessly.
- Invalid tape rejected by the Worker.
- Wall clipping rejected.
- Impossible speed rejected.
- Duplicate tape rejected.
- Daily config window.
- Entitlement unlock/restore.
- Leaderboard ranking and percentile.

## E2E

- First launch → vault 1 → rewind → win.
- Paywall after vault 3.
- Web checkout unlock.
- Mobile restore purchases.
- Offline play after first load.
- Install prompt.
- Update flow.
- Pause/resume after a phone call.
- Landscape overlay.
- Safe areas on notched devices.

## Device matrix

- iPhone SE (small screen).
- iPhone 15 (notch/Dynamic Island).
- Low-end Android (Moto G class).
- Mid-range Android.
- iPad.
- Desktop Chrome/Safari/Firefox.

## Performance

- 60 fps target; 30 fps minimum.
- CPU throttle 6×.
- Battery drain over 15 minutes.
- Cold start <1.5s.
- Memory stable over 30 minutes.

## Accessibility

- Reduced motion.
- Colorblind symbols.
- Left/right-handed layout.
- Tap-to-move alternative.
- Assist mode.
- Large text.
- Pause anywhere.
- No timed text.
- Screen reader for DOM menus; gameplay is visual (document limitation).

## Purchase/leaderboard abuse

- Forged tape.
- Replay with impossible speed.
- Replay with wall clipping.
- Replay with invalid interactions.
- Duplicate submissions.
- Rate limits.
- Offensive nickname.
- Timezone boundary at daily reset.

## Release checklist

- [ ] All tests pass.
- [ ] Lighthouse PWA audit.
- [ ] Install on iOS/Android.
- [ ] Offline test.
- [ ] Purchase/restore test.
- [ ] Leaderboard validation test.
- [ ] Save export/import.
- [ ] Privacy/terms links.
- [ ] Store screenshots and metadata.
- [ ] Crash-free smoke test.
