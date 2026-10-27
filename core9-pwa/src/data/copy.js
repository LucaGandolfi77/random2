/*
 * CORE 9 — player-facing copy.
 *
 * English only for now, but every string lives here so a second language is
 * a data change rather than a hunt through the renderer.
 */

export const COPY = {
  title: "CORE 9",
  subtitle: "Nuclear Idle Tycoon · Network",
  tagline: "The grid is hungry. The valley is watching. Try not to make the news.",
  intro: {
    kicker: "SHIFT 01 · 06:12",
    title: "Take command",
    body: "The previous director left in a hurry. The reactor still works, the fence still has a hole in it, and the city needs power by Friday.",
    start: "Enter the control room",
    resume: "Continue shift",
    note: "Installable · offline · no trackers",
  },
  hud: {
    credits: "Credits",
    output: "Output",
    heat: "Heat",
    waste: "Waste",
    data: "Data",
    collect: "Collect",
    collectShort: "Collect",
    cashout: "Collect from the grid",
    perSecond: "/s",
    mw: "MW",
    heatShort: "HEAT",
    wasteShort: "WASTE",
    grid: "GRID",
    nextStage: "Next stage",
    auto: "AUTO",
    online: "Plant online",
    offline: "Plant offline",
    paused: "Paused",
  },
  nav: {
    map: "Map",
    plants: "Plant",
    research: "Research",
    goals: "Goals",
  },
  sheet: {
    build: "Build",
    upgrade: "Upgrade",
    max: "Maximum level",
    locked: "Locked",
    requires: "Requires",
    level: "Level",
    next: "Next level",
    effect: "Effect",
    cost: "Cost",
    notEnough: "Not enough credits",
    built: "Built",
    underConstruction: "Under construction",
    stage: "Stage",
    role: "Role",
    collectHint: "Credits accumulate in the switchyard. Collect them before you spend.",
    close: "Close",
    inspect: "Inspect",
    reactor: "Reactor",
    output: "Plant output",
    nextTier: "New silhouette at level",
  },
  research: {
    title: "Research",
    subtitle: "Permanent upgrades for the whole network. Data is produced by every lab and by missions.",
    empty: "Build the research lab to start generating data.",
    buy: "Research",
    owned: "Installed",
    locked: "Lab level",
    data: "data",
    resetNote: "Research is global and permanent across every site. It does not reset on prestige.",
  },
  goals: {
    title: "Shift goals",
    subtitle: "Three active objectives. Complete one and the next comes off the board.",
    reward: "Reward",
    done: "Done",
    empty: "All current goals complete. The plant is running itself now.",
  },
  plants: {
    title: "Plant register",
    subtitle: "Every plot, its role and its current contribution.",
    status: "Status",
    open: "Open",
    locked: "Locked",
    built: "Online",
    empty: "Not built",
  },
  prestige: {
    title: "New generation",
    subtitle: "Decommission this plant, keep the isotopes, and build a cleaner machine from the same footprint.",
    require: "Reach this site's MW threshold to unlock.",
    gain: "Isotopes on reset",
    confirm: "Start a new generation?",
    body: "This site's zones, credits, bank, waste and battery reset. Research, crew, data, isotopes and the other sites remain.",
    yes: "Decommission",
    no: "Not yet",
    done: "Generation",
    multiplier: "Output bonus",
  },
  events: {
    banner: "Grid event",
    settle: "Settle",
    expired: "Event ended",
    demand: {
      name: "Demand spike",
      body: "The city turns on every air conditioner at once. Grid price +50%.",
    },
    heatwave: {
      name: "Heatwave",
      body: "The river is warm and the towers cannot keep up. Cooling −20%.",
    },
    strike: {
      name: "Night shift strike",
      body: "The night shift wants a better coffee machine. Output −25% until settled.",
    },
    inspection: {
      name: "Safety inspection",
      body: "A clipboard has entered the facility. Security level decides whether it is a bonus or a fine.",
    },
    grant: {
      name: "Research grant",
      body: "Someone in the capital believes in you. Research data received.",
    },
  },
  offline: {
    title: "Shift report",
    body: "The plant kept running while you were away.",
    earned: "Banked",
    data: "Research data",
    time: "Time away",
    capped: "Capped at 8 hours",
    close: "Back to work",
    now: "Nothing to report.",
  },
  settings: {
    title: "Settings",
    sound: "Sound",
    motion: "Reduced motion",
    exportSave: "Export save",
    importSave: "Import save",
    reset: "Reset save",
    resetConfirm: "Delete this plant and start over?",
    about: "CORE 9: NETWORK is a free, offline-first PWA. Three sites, one crew, everything drawn procedurally and nothing uploaded.",
    credits: "Design & code: Luca Gandolfi · MIT licence",
    close: "Close",
    on: "On",
    off: "Off",
  },
  tutorial: {
    skip: "Skip tips",
    next: "Next",
    done: "Start the shift",
    built: "Built",
  },
  toast: {
    built: "built",
    upgraded: "upgraded to",
    collected: "collected",
    research: "Research installed",
    locked: "Locked",
    max: "Already at maximum level",
    noCredits: "Not enough credits",
    newStage: "New silhouette online",
    prestige: "New generation online",
    saved: "Shift saved",
    imported: "Save imported",
    importError: "That file is not a CORE 9 save",
    reset: "Plant reset",
    event: "Grid event",
    goal: "Goal complete",
    auto: "Automatic collection online",
  },
};

export function formatNumber(value, digits = 0) {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 1e9) return (value / 1e9).toFixed(2).replace(/\.00$/, "") + "B";
  if (Math.abs(value) >= 1e6) return (value / 1e6).toFixed(2).replace(/\.00$/, "") + "M";
  if (Math.abs(value) >= 1e4) return (value / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
  if (digits > 0) return value.toLocaleString("en-US", { maximumFractionDigits: digits });
  return Math.round(value).toLocaleString("en-US");
}

export function formatMoney(value) {
  return "€" + formatNumber(value);
}

export function formatMW(value) {
  if (value >= 1000) return (value / 1000).toFixed(value >= 10000 ? 1 : 2) + " GW";
  if (value >= 100) return Math.round(value) + " MW";
  return value.toFixed(1) + " MW";
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return h + "h " + m + "m";
  if (m > 0) return m + "m " + r + "s";
  return r + "s";
}
