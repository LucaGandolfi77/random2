/*
 * Circle Stories - the group chat's voice
 * ---------------------------------------
 * Pure text selection: no DOM, no timers, no storage. The app decides when a
 * message is allowed; this module decides who speaks and what they say.
 */

import { TIERS, vibeById } from "./roster.js";

const EVENT_LINES = {
  start: [
    "Okay. Nobody embarrass me.",
    "The circle is open. Be normal.",
    "I brought snacks and poor judgement.",
    "Who put me in the jar again?",
    "Let's make this everyone's problem.",
  ],
  merge: [
    "Oh, we're doing this.",
    "That's one way to get closer.",
    "I felt that in the group chat.",
    "Personal space is a social construct.",
    "New friendship just dropped.",
  ],
  chain: [
    "WAIT. WAIT. WAIT.",
    "The physics are showing off.",
    "Do it again. I dare you.",
    "This is going suspiciously well.",
    "Somebody clip that.",
  ],
  danger: [
    "We are ON the ceiling.",
    "This is no longer a circle. This is a warning.",
    "I can see the top of the jar. That's bad.",
    "Someone please act normal.",
    "We're fine. We're fine. We're not fine.",
  ],
  swap: [
    "Trading places. Classic.",
    "I didn't agree to this seat.",
    "New hand, who dis?",
    "Fine, but I'm keeping the good side.",
  ],
  hug: [
    "WHY IS EVERYBODY SHAKING.",
    "Group hug! Emotionally and physically.",
    "This is either teamwork or an earthquake.",
    "Hold on to your faces.",
    "My whole life just shifted two pixels.",
  ],
  plus: [
    "Who invited the rainbow one?",
    "Plus one? I didn't approve the guest list.",
    "Mystery guest has main-character energy.",
    "They don't even have a tier yet. Iconic.",
    "This is going to be either genius or a lawsuit.",
  ],
  legendary: [
    "THE WHOLE CREW. SOMEONE TAKE A PHOTO.",
    "We did it. Nobody move.",
    "This is going straight in the yearbook.",
    "Frame it. Print it. Send it to everyone.",
    "Group photo! Everyone look vaguely normal.",
  ],
  end: [
    "And that's the group chat archive.",
    "We'll get 'em next time.",
    "Nobody speak of this again.",
    "I'm telling everyone about this.",
  ],
  dare: [
    "So we're doing this for an audience now?",
    "Beat the score. Protect the bit.",
    "I hope they're watching.",
    "Pressure makes diamonds. Or cracks.",
  ],
};

const VIBE_LINES = {
  sunshine: [
    "I'm just happy to be included.",
    "This is going beautifully.",
    "You're all doing amazing.",
    "Can we do a nice, calm merge?",
    "I love it here, actually.",
  ],
  chaos: [
    "Chaos is a strategy, technically.",
    "That should not have worked.",
    "Let's make it worse on purpose.",
    "I have no notes and no plan.",
    "Something is definitely on fire.",
  ],
  deadpan: [
    "Great.",
    "Cool.",
    "We're fine.",
    "That was a choice.",
    "I'll be in the group chat.",
  ],
  feral: [
    "MORE.",
    "Put me back in!",
    "I licked the glass.",
    "No thoughts. Only merge.",
    "I will start something.",
  ],
  softie: [
    "I'm so proud of us.",
    "Careful with that one.",
    "Emotional support friend, reporting in.",
    "Can everyone just be safe?",
    "That was actually kind of beautiful.",
  ],
  hype: [
    "LET'S GOOO.",
    "That's what I'm talking about!",
    "Turn it UP.",
    "Season finale energy.",
    "Somebody get me a microphone.",
  ],
};

export const CHAT_KINDS = [
  "start", "merge", "chain", "danger", "swap", "hug", "plus",
  "legendary", "end", "dare",
];

function pick(list, rng) {
  if (!Array.isArray(list) || !list.length) return "";
  return list[Math.floor(rng() * list.length) % list.length];
}

export function nameForTier(squad, index) {
  const slot = Array.isArray(squad) ? squad[index] : null;
  const custom = slot && typeof slot.name === "string" ? slot.name.trim() : "";
  return custom || (TIERS[index] ? TIERS[index].short : "Friend");
}

export function chooseChat({ kind = "merge", tier = 0, squad = [], rng = Math.random } = {}) {
  const index = Math.max(0, Math.min(TIERS.length - 1, Number(tier) || 0));
  const profile = Array.isArray(squad) && squad[index] ? squad[index] : {};
  const vibe = vibeById(profile.vibe);
  const custom = typeof profile.line === "string" ? profile.line.trim() : "";
  const customChance = kind === "merge" ? 0.48 : 0.68;
  let text;

  if (custom && rng() < customChance) {
    text = custom;
  } else if (rng() < 0.3) {
    text = pick(VIBE_LINES[vibe.id], rng) || pick(EVENT_LINES[kind], rng) || pick(EVENT_LINES.merge, rng);
  } else {
    text = pick(EVENT_LINES[kind], rng) || pick(EVENT_LINES.merge, rng) || "Hello?";
  }

  return {
    tier: index,
    name: nameForTier(squad, index),
    text: String(text).slice(0, 120),
    vibe: vibe.id,
    emoji: vibe.emoji,
    kind,
  };
}

export { EVENT_LINES, VIBE_LINES };
