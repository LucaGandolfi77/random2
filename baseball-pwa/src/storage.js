/* ===== DIAMOND POLY '99 · Local Storage & Hub Integration ===== */
const KEY = "baseball-pwa-save-v1";

function defaults() {
  return {
    stars: 40,
    hrs: 0,
    hits: 0,
    longestFt: 0,
    slides: 0,
    wins: 0,
    games: 0,
    unlockedBats: ["ash"],
    selectedBat: "ash",
    selectedTeam: "tokyo",
    selectedSky: "day",
    selectedMode: "match"
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    return { ...defaults(), ...parsed };
  } catch (e) {
    return defaults();
  }
}

export function writeSave(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {}
}

export function recordGameRun(score, outcome, durMs, meta) {
  try {
    if (window.R2 && window.R2.markPlayed) {
      window.R2.markPlayed("baseball-pwa/");
    }
    if (window.R2 && window.R2.stats && window.R2.stats.run) {
      window.R2.stats.run({
        slug: "baseball-pwa/",
        score: score,
        durMs: durMs || 60000,
        outcome: outcome || "win",
        meta: meta || {}
      });
    }
  } catch (e) {}
}
