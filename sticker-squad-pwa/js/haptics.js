// ============================================================
// HAPTICS — Vibration API presets (the invisible juice)
// ============================================================
const HAPTICS = {
  enabled: true,
  // Patterns in milliseconds. Subtle = good. Nauseating = bug.
  presets: {
    tick:    [8],                    // landing, button press
    stick:   [18],                   // wall grab, decal place
    peel:    [10, 40, 14],           // the hero moment — triple buzz
    collect: [12],                   // glitter sticker pickup
    damage:  [70],                   // ouch — one long buzz
    win:     [20, 60, 20, 60, 80],   // fanfare rhythm
  },
};

function haptic(name) {
  if (!HAPTICS.enabled || !navigator.vibrate) return;
  const p = HAPTICS.presets[name];
  if (!p) return;
  try { navigator.vibrate(p); } catch (e) { /* some browsers throw on odd patterns */ }
}

function hapticsToggle() {
  HAPTICS.enabled = !HAPTICS.enabled;
  if (HAPTICS.enabled) haptic('tick');
}
