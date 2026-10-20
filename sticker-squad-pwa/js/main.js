// ============================================================
// MAIN — Bootstrap, Service Worker, Mobile Lifecycle
// ============================================================
function main() {
  audioInit();
  engineInit();     // includes device detection + quality presets
  playerInit();
  inputInit();
  uiInit();
  gameInit();
  touchInit();      // mobile controls (no-op on desktop)
  batteryWatch();   // auto battery-saver below 20%

  loadLevel0();
  animate();
}

// ── Instant resume: backgrounding the app must never cause a physics jump ──
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    gameResetClock(); // discard the stale delta
    resumeAudio();
  }
});

// Desktop: unlock audio on first click (mobile unlock happens in touch.js)
window.addEventListener('mousedown', resumeAudio);

// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.error('SW failed:', err));
}

main();
