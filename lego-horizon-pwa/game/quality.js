/* Device-tier detection and adaptive quality settings. No dependencies. */
export const QUALITY = Object.freeze({
  low: { particles: 0.35, shake: false, fps: 30, effects: false },
  medium: { particles: 0.7, shake: true, fps: 60, effects: true },
  high: { particles: 1, shake: true, fps: 60, effects: true },
});

export function detectTier() {
  const forced = new URLSearchParams(location.search).get("quality");
  if (QUALITY[forced]) return forced;
  const cores = navigator.hardwareConcurrency || 4;
  const memory = navigator.deviceMemory || 4;
  const smallScreen = Math.min(window.innerWidth, window.innerHeight) < 390;
  if (cores <= 2 || memory <= 2 || smallScreen) return "low";
  if (cores <= 4 || memory <= 4) return "medium";
  return "high";
}

export function qualityFor(tier) {
  return QUALITY[tier] || QUALITY.medium;
}
