# 08 — PWA Spec

## Goals

- Installable on Android and iOS.
- Works offline after first load.
- Cold start under 1.5s on a mid-range phone.
- Fullscreen portrait, safe-area aware.
- Shareable deep links.
- In-game store with web checkout at launch.

## Manifest

```json
{
  "name": "Crew of One",
  "short_name": "Crew of One",
  "description": "A one-screen time-loop heist. Your past runs are your crew.",
  "start_url": "/",
  "scope": "/",
  "display": "fullscreen",
  "display_override": ["fullscreen", "standalone"],
  "orientation": "portrait",
  "background_color": "#0B132B",
  "theme_color": "#0B132B",
  "categories": ["games", "puzzle"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/vault.png", "sizes": "720x1280", "type": "image/png", "form_factor": "narrow" }
  ]
}
```

## Service worker

- `vite-plugin-pwa` with generated service worker.
- Precache app shell, JS/CSS, fonts, icons, level JSON.
- Runtime cache for optional audio.
- `navigateFallback: "index.html"`.
- Versioned cache; prompt after results, never mid-heist.
- Update flow: check on launch, toast after results, reload on tap.

## Install

- Play immediately; no install wall.
- After vault 1, a subtle card: “Install for offline heists.”
- Android: `beforeinstallprompt`.
- iOS: instructions with the share icon.
- Settings: “Install app” / “Installed.”
- Custom icon and splash.

## Layout

- `viewport-fit=cover`, `100dvh`, `env(safe-area-inset-*)`.
- `touch-action: none` on the canvas; no double-tap zoom; no text selection; no long-press callout.
- Portrait lock in manifest; Android fullscreen orientation lock; iOS landscape overlay if needed.
- Canvas fits the screen; board centered with integer zoom.
- DOM overlay for menus/results/store respects safe areas.

## Audio

- Unlock on first gesture.
- Suspend on `visibilitychange`; resume on return.
- Mute toggle; visual cues for important sounds.
- Test iOS silent switch; document behavior.

## Performance

- DPR cap 2 (1.5 low-end).
- Pre-render static rooms.
- Object pools for particles and trails.
- No full-screen shaders.
- Pause on hidden.
- Optional 30fps battery saver.
- Lighthouse PWA audit; real-device tests.

## Offline

- Full campaign playable offline after first load.
- Daily heist cached for the current UTC day.
- Offline runs queue for submission; if the daily has passed, mark as offline only.
- Store disabled offline with a clear message; entitlements cached with grace.

## Deep links

- `?vault=03` → open vault.
- `?daily=2026-10-26` → open daily.
- `?utm=...` → marketing attribution.
- `?unlock=...` → license unlock flow.

## Share

- Daily share card generated client-side (canvas → PNG).
- `navigator.share` for link and image where supported.
- Fallback: download image + copy link.
- OG image per vault for social previews.

## Store and checkout

- In-game store screen; no external links on iOS.
- Web: “Unlock” → Lemon Squeezy Checkout in a new tab or overlay.
- Return via `?unlock=...` or license entry; validate with Worker; store entitlement.
- Restore purchases on mobile via store account.

## Testing

- Lighthouse PWA.
- Install on Android Chrome and iOS Safari.
- Airplane mode after first load.
- Kill and relaunch; save persists.
- Update flow.
- Safe areas on notched devices.
- Low-end Android performance.
