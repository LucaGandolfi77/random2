/* ===== DIAMOND POLY '99 · Configuration & Tunables ===== */
const CONFIG = {
  field: {
    baseDist: 27.43,       // 90 ft in world meters
    moundDist: 18.44,      // 60 ft 6 in
    fenceCenter: 122.0,    // 400 ft center-field wall, in world meters
    fenceCorner: 100.0,    // 328 ft foul poles, in world meters
    wallHeight: 4.2,
    gravity: 9.81
  },

  pitches: [
    { id: "fastball", name: "4-SEAM FASTBALL", mphMin: 94, mphMax: 101, speed: 41.5, breakX: 0.0, breakZ: 0.12, color: "#f97316" },
    { id: "slider",   name: "SHARP SLIDER",    mphMin: 84, mphMax: 89,  speed: 36.5, breakX: -0.68, breakZ: -0.28, color: "#38bdf8" },
    { id: "curve",    name: "12-6 CURVEBALL",  mphMin: 76, mphMax: 82,  speed: 32.8, breakX: 0.18, breakZ: -0.82, color: "#a855f7" },
    { id: "changeup", name: "CIRCLE CHANGE",   mphMin: 80, mphMax: 85,  speed: 34.2, breakX: 0.35, breakZ: -0.38, color: "#22c55e" },
    { id: "splitter", name: "SPLITTER",        mphMin: 86, mphMax: 91,  speed: 37.8, breakX: -0.15, breakZ: -0.64, color: "#eab308" }
  ],

  teams: [
    { id: "tokyo",    abbr: "TKY", name: "Tokyo Cyber-Carp",     primary: "#ef4444", secondary: "#f8fafc", rating: 1.0 },
    { id: "brooklyn", abbr: "BKN", name: "Brooklyn Poly-Knights", primary: "#3b82f6", secondary: "#fde047", rating: 0.95 },
    { id: "havana",   abbr: "HAV", name: "Havana Sugar Kings",    primary: "#10b981", secondary: "#fef08a", rating: 1.05 },
    { id: "seoul",    abbr: "SEL", name: "Seoul Neon Tigers",     primary: "#a855f7", secondary: "#38bdf8", rating: 1.1 },
    { id: "osaka",    abbr: "OSK", name: "Osaka Shogun Nine",     primary: "#f59e0b", secondary: "#1e293b", rating: 1.15 },
    { id: "sanju",    abbr: "SJU", name: "San Juan Cangrejeros",  primary: "#ec4899", secondary: "#fef9c3", rating: 1.08 }
  ],

  bats: [
    { id: "ash",    name: "Classic Maple Wood", power: 1.00, sweetSpot: 1.00, color: "#d97706", cost: 0 },
    { id: "alloy",  name: "Aero Alloy '99",     power: 1.06, sweetSpot: 1.08, color: "#38bdf8", cost: 50 },
    { id: "carbon", name: "Stealth Carbon Pro", power: 1.10, sweetSpot: 1.12, color: "#a855f7", cost: 120 },
    { id: "gold",   name: "24K Legend Slugger", power: 1.16, sweetSpot: 1.15, color: "#fbbf24", cost: 250 }
  ],

  skies: {
    day: {
      top: "#0c4a6e", mid: "#0284c7", horizon: "#7dd3fc",
      sun: [0.35, -0.55, 0.75], ambient: 0.52, turfA: "#16a34a", turfB: "#15803d", dirt: "#b45309"
    },
    sunset: {
      top: "#1e1b4b", mid: "#9d174d", horizon: "#f97316",
      sun: [0.55, -0.45, 0.70], ambient: 0.46, turfA: "#15803d", turfB: "#166534", dirt: "#9a3412"
    },
    night: {
      top: "#020617", mid: "#0f172a", horizon: "#1e293b",
      sun: [0.20, -0.35, 0.91], ambient: 0.48, turfA: "#14532d", turfB: "#064e3b", dirt: "#78350f"
    }
  }
};

export default CONFIG;
