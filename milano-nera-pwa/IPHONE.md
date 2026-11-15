# iPhone verification — MILANO NERA '77

Target: **iOS 16.4+**, Safari and Chrome iOS. Chrome on iOS uses WebKit, so layout/input fixes apply to both browsers; only installation wording differs.

## Automated checks

Start a static server, then run:

```sh
python3 -m http.server 8099
node milano-nera-pwa/iphone-smoke.mjs http://localhost:8099/milano-nera-pwa/
```

The test uses a Chrome iOS user agent, touch emulation and DPR 3 for layout checks. It verifies:

- iPhone startup-image links;
- iOS install guide;
- no horizontal overflow;
- portrait view `216x300` and portrait canvas backing buffer;
- portrait frame fully inside the viewport;
- visible touch controls;
- rotation to landscape restores `384x216` and the landscape UI;
- no console exceptions.

It writes:

- `shots/iphone-title.png`
- `shots/iphone-portrait.png`
- `shots/iphone-landscape.png`

Chrome CDP cannot emulate `env(safe-area-inset-*)` or WebKit rendering, so the following checks are required on a real iPhone.

## Manual device checklist

Test at least one notched iPhone and one smaller iPhone:

- iPhone 15/16 Pro — 393×852 CSS, DPR 3
- iPhone 14/15 — 390×844 CSS, DPR 3
- iPhone SE — 375×667 CSS, DPR 2
- iPhone 15/16 Pro Max — 430×932 CSS, DPR 3

For each device, test **Safari** and **Chrome iOS**.

### Launch and installation

- Open in Safari, Share → Add to Home Screen.
- Launch from the Home Screen icon.
- Confirm the startup image matches the dark Milan key art and does not flash white.
- Confirm the standalone window fills the screen and the status bar content is readable.
- Open in Chrome iOS and confirm the page runs; Chrome may add a Home Screen shortcut rather than a full standalone PWA, so use Safari for the standalone experience.
- Confirm the settings screen shows the iPhone install guide.

### Portrait

- Start Chapter 1 and confirm the game uses the tall camera view.
- Confirm the objective, health, weapon and pause button are below the notch/status bar.
- Confirm the left stick, right stick and five action buttons are above the home indicator.
- Move, aim, fire, roll, reload, use cover and throw a molotov.
- Open pause, settings, chapter select, intro and result screens; all must scroll and remain reachable.
- Confirm the game does not scroll, rubber-band, select text or show the iOS callout menu while dragging.

### Landscape

- Rotate during play; the frame should switch to the widescreen camera without a blank or stretched canvas.
- Confirm the notch does not cover the game frame, HUD, pause button or sticks.
- Confirm the home indicator does not cover the prompt, sticks or action buttons.
- Rotate back to portrait and confirm the tall camera view returns.

### Audio

- Tap once to unlock audio, then start a chapter.
- Confirm music and SFX play after the first gesture.
- Put the app in the background for a few seconds and return; it should be paused and resume audio after tapping Resume.
- Test the silent switch; iOS may mute WebAudio according to device state. Haptics are not available through `navigator.vibrate` on Safari iOS.

### PWA and offline

- Install from Safari, then turn on Airplane Mode.
- Cold-launch from the Home Screen; the title screen, chapter select, chapter 1 and settings must load.
- Finish or leave a chapter and relaunch; profile progress must persist.
- Confirm the service worker update does not leave an old cache in control after a reload.

### Visual and accessibility

- Check text sizes in portrait and landscape; menus must not be clipped at 200% Dynamic Type/browser text zoom.
- Check that the game works with Reduce Motion enabled.
- Confirm focus outlines are visible with an external keyboard if available.
- Confirm the portrait title, chapters and settings screens do not overflow horizontally.

## Known iOS limitations

- `navigator.vibrate` is unavailable on Safari iOS.
- `beforeinstallprompt` is unavailable on iOS; the install guide replaces it.
- Chrome iOS renders with WebKit and cannot provide a guaranteed standalone PWA mode.
- `screen.orientation.lock` is not a reliable requirement; the layout adapts instead.
- Startup images are generated for the listed iPhone sizes; unknown future sizes fall back to the app background color.
