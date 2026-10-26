/*
 * INNER CIRCLE — the eleven friends
 * --------------------------------
 * The ladder is shared by the engine, the renderer and the squad editor.
 * Radii are in the engine's 400 x 600 world. Every disc is circular; the
 * ring colour and pattern are a second cue so tiers never rely on size alone.
 */

export const TIERS = [
  {
    name: "New Face",
    short: "New",
    radius: 16,
    color: "#ff6b6b",
    soft: "#ffd7d4",
    ring: "solid",
    note: "A name you just learned.",
  },
  {
    name: "Coffee Pal",
    short: "Coffee",
    radius: 21,
    color: "#f59e2f",
    soft: "#ffe3ba",
    ring: "dots",
    note: "You know their order.",
  },
  {
    name: "Group Chat",
    short: "Chat",
    radius: 27,
    color: "#a3ce4a",
    soft: "#e5f3bd",
    ring: "dash",
    note: "The chat never really sleeps.",
  },
  {
    name: "Inside Joke",
    short: "Joke",
    radius: 34,
    color: "#21bfa7",
    soft: "#c5f5e9",
    ring: "double",
    note: "Two words and you both lose it.",
  },
  {
    name: "Plus One",
    short: "Plus 1",
    radius: 42,
    color: "#45a9f5",
    soft: "#cfe9ff",
    ring: "wave",
    note: "Always on the guest list.",
  },
  {
    name: "Road Trip",
    short: "Trip",
    radius: 51,
    color: "#6c7bff",
    soft: "#dfe2ff",
    ring: "stars",
    note: "Six hours, one playlist.",
  },
  {
    name: "Ride or Die",
    short: "Ride",
    radius: 62,
    color: "#a96bff",
    soft: "#eadbff",
    ring: "checker",
    note: "They answer at 3 a.m.",
  },
  {
    name: "Bestie",
    short: "Bestie",
    radius: 75,
    color: "#f06bb0",
    soft: "#ffd8ee",
    ring: "double",
    note: "Your favourite person to do nothing with.",
  },
  {
    name: "Soul Friend",
    short: "Soul",
    radius: 90,
    color: "#ef5a5a",
    soft: "#ffd4d4",
    ring: "sun",
    note: "No catch-up needed.",
  },
  {
    name: "Inner Circle",
    short: "Circle",
    radius: 107,
    color: "#e7a51b",
    soft: "#ffedbd",
    ring: "stars",
    note: "The ones who know the whole story.",
  },
  {
    name: "The Whole Crew",
    short: "Crew",
    radius: 125,
    color: "#393178",
    soft: "#dcd7ff",
    ring: "burst",
    note: "Everybody in one ridiculous photo.",
  },
];

export const MAX_TIER = TIERS.length - 1;

export const VIBES = [
  { id: "sunshine", name: "Sunshine", emoji: "☀️", note: "Sweet, sincere, slightly too awake." },
  { id: "chaos", name: "Chaos", emoji: "🌪️", note: "No plan, excellent instincts." },
  { id: "deadpan", name: "Deadpan", emoji: "😐", note: "Devastating one-liners." },
  { id: "feral", name: "Feral", emoji: "🐺", note: "Will absolutely start something." },
  { id: "softie", name: "Softie", emoji: "🧸", note: "Emotional support friend." },
  { id: "hype", name: "Hype", emoji: "📣", note: "Every merge is a season finale." },
];

export function defaultVibeForTier(index) {
  return VIBES[index % VIBES.length].id;
}

export function vibeById(id) {
  return VIBES.find((vibe) => vibe.id === id) || VIBES[0];
}

export const STORAGE = {
  squad: "inner-circle-squad-v1",
  progress: "inner-circle-progress-v1",
  tutorial: "inner-circle-tutorial-v1",
  chat: "inner-circle-chat-v1",
  playerName: "inner-circle-player-name",
};

export const BADGES = [
  { id: "first-merge", name: "The spark", note: "Make your first merge." },
  { id: "chain-4", name: "Chain reaction", note: "Land a x4 chain." },
  { id: "tier-5", name: "The inner five", note: "Reach Plus One." },
  { id: "tier-8", name: "Best friends", note: "Reach Bestie." },
  { id: "tier-10", name: "Inner Circle", note: "Reach the Inner Circle." },
  { id: "whole-crew", name: "Whole Crew", note: "Reach The Whole Crew." },
  { id: "legendary", name: "Legendary group photo", note: "Merge two Whole Crew discs." },
  { id: "score-2500", name: "Party starter", note: "Score 2,500 in one run." },
  { id: "score-10000", name: "Life of the party", note: "Score 10,000 in one run." },
  { id: "daily-3", name: "Three days running", note: "Play the Daily Circle 3 days in a row." },
];

export function tierAt(index) {
  return TIERS[Math.max(0, Math.min(MAX_TIER, index))];
}

export function emptySquad() {
  return Array.from({ length: TIERS.length }, (_, i) => ({
    photo: "",
    name: "",
    vibe: defaultVibeForTier(i),
    line: "",
  }));
}

/*
 * Keep stored roster data safe to render. A bad/old localStorage entry
 * should degrade to illustrated avatars, never to a broken game.
 */
export function sanitizeSquad(raw) {
  const clean = emptySquad();
  if (!Array.isArray(raw)) return clean;
  const vibeIds = new Set(VIBES.map((vibe) => vibe.id));
  for (let i = 0; i < TIERS.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") continue;
    const photo = typeof item.photo === "string" &&
      /^data:image\/(png|jpeg|webp|avif);base64,/i.test(item.photo) &&
      item.photo.length < 900000
      ? item.photo
      : "";
    const name = typeof item.name === "string"
      ? item.name.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 22)
      : "";
    const vibe = typeof item.vibe === "string" && vibeIds.has(item.vibe)
      ? item.vibe
      : defaultVibeForTier(i);
    const line = typeof item.line === "string"
      ? item.line.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 90)
      : "";
    clean[i] = { photo, name, vibe, line };
  }
  return clean;
}

export function countCustomPhotos(squad) {
  return sanitizeSquad(squad).filter((slot) => !!slot.photo).length;
}

/* A small, deterministic hash for cache-busting/fallback faces. */
export function nameSeed(name, fallback) {
  const text = (name || "") + "|" + fallback;
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
