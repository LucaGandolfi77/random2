import type { SubclassDef } from '@/core/types';

/**
 * Specializations are chosen at level 3. Each one grants a unique ability and
 * a small passive identity bonus. They are deliberately data-driven so more
 * paths can be added without touching the combat engine.
 */
export const subclasses: SubclassDef[] = [
  // ── Warrior ────────────────────────────────────────────────────────────────
  {
    id: 'vanguard',
    classId: 'warrior',
    name: 'Vanguard',
    epithet: 'The Unbroken Line',
    description:
      'You are the place where the line holds. Allies stand easier beside you; enemies measure the distance to your shield before they measure the distance to anyone else.',
    trait: 'Gain 8 maximum health and +1 AC. Bulwark Stance grants Warded for three turns.',
    abilityId: 'bulwark_stance',
    bonuses: { hp: 8, ac: 1 }
  },
  {
    id: 'berserker',
    classId: 'warrior',
    name: 'Berserker',
    epithet: 'The Red Harvest',
    description:
      'You do not fight the fire. You become the room it burns in. The old Cindral smiths would recognize the look in your eyes and put away the good tools.',
    trait: 'Gain +1 attack and +2 Resolve. Blood Frenzy grants Enraged for three turns.',
    abilityId: 'blood_frenzy',
    bonuses: { attack: 1, resource: 2 }
  },

  // ── Rogue ─────────────────────────────────────────────────────────────────
  {
    id: 'assassin',
    classId: 'rogue',
    name: 'Assassin',
    epithet: 'The Quiet Verdict',
    description:
      'You have learned that most people die between one breath and the next, and that the space between is a professional courtesy. You can make it very small.',
    trait: 'Gain +1 attack and +2 initiative. Pale Thread causes Bleeding.',
    abilityId: 'pale_thread',
    bonuses: { attack: 1, initiative: 2 }
  },
  {
    id: 'trickster',
    classId: 'rogue',
    name: 'Trickster',
    epithet: 'The Borrowed Face',
    description:
      'A lie is a door if you paint it convincingly enough. You have painted so many doors that the Choir has stopped trusting its own walls.',
    trait: 'Gain +1 AC and +2 Guile. Mirror Feint deals psychic damage and Frightens.',
    abilityId: 'mirror_feint',
    bonuses: { ac: 1, resource: 2 }
  },

  // ── Mage ──────────────────────────────────────────────────────────────────
  {
    id: 'evoker',
    classId: 'mage',
    name: 'Evoker',
    epithet: 'The Storm’s Hand',
    description:
      'Some mages read the world. You have decided that reading is preparation, and preparation is over. The page burns before the sentence finishes.',
    trait: 'Gain +1 attack and +1 Arcana. Meteor Sigil leaves the ground burning.',
    abilityId: 'meteor_sigil',
    bonuses: { attack: 1, resource: 1 }
  },
  {
    id: 'chronomancer',
    classId: 'mage',
    name: 'Chronomancer',
    epithet: 'The Borrowed Hour',
    description:
      'Every spell is a small argument with time. You have learned to win by borrowing an hour you have not lived yet, then paying it back in someone else’s future.',
    trait: 'Gain +2 Arcana and +1 initiative. Time Slip grants Hasted.',
    abilityId: 'time_slip',
    bonuses: { resource: 2, initiative: 1 }
  },

  // ── Cleric ────────────────────────────────────────────────────────────────
  {
    id: 'lightbringer',
    classId: 'cleric',
    name: 'Lightbringer',
    epithet: 'The Lantern of Nine',
    description:
      'You carry a light that is not the Covenant’s. It is smaller, hotter, and much older. It does not ask anyone to kneel. It asks them to open their eyes.',
    trait: 'Gain +1 AC and +2 Faith. Sunburst burns enemies in a wide area.',
    abilityId: 'sunburst',
    bonuses: { ac: 1, resource: 2 }
  },
  {
    id: 'gravewarden',
    classId: 'cleric',
    name: 'Gravewarden',
    epithet: 'The Keeper of Thresholds',
    description:
      'You have learned that the dead are not a different kind of people. They are simply people who have stopped being interrupted. You stand at the door and decide who enters.',
    trait: 'Gain 8 maximum health and +1 attack. Grave Ward heals and grants Regenerating.',
    abilityId: 'grave_ward',
    bonuses: { hp: 8, attack: 1 }
  },

  // ── Ranger ────────────────────────────────────────────────────────────────
  {
    id: 'warden',
    classId: 'ranger',
    name: 'Warden',
    epithet: 'The Root and Horn',
    description:
      'The forest does not need you to save it. It needs you to remember where the paths are, which roots are sleeping, and which promises should not be broken twice.',
    trait: 'Gain +1 AC and +4 maximum health. Thornwall damages and Roots enemies.',
    abilityId: 'thornwall',
    bonuses: { ac: 1, hp: 4 }
  },
  {
    id: 'beastmaster',
    classId: 'ranger',
    name: 'Beastmaster',
    epithet: 'The Second Hunt',
    description:
      'You have learned that a pack is not a family and a hunt is not a war. Something with four legs has decided you are worth following anyway. Try not to disappoint it.',
    trait: 'Gain +1 attack and +2 initiative. Call the Wolf summons a grey wolf ally.',
    abilityId: 'beast_call',
    bonuses: { attack: 1, initiative: 2 }
  },

  // ── Warlock ───────────────────────────────────────────────────────────────
  {
    id: 'hexblade',
    classId: 'warlock',
    name: 'Hexblade',
    epithet: 'The Edge of the Pact',
    description:
      'Your patron did not give you a weapon. It gave you a question, and the answer turned out to have an edge. Every cut is a clause in a contract neither of you has finished reading.',
    trait: 'Gain +1 attack and +1 initiative. Hexblade Cleave strikes adjacent enemies and causes Bleeding.',
    abilityId: 'hexblade_cleave',
    bonuses: { attack: 1, initiative: 1 }
  },
  {
    id: 'voidcaller',
    classId: 'warlock',
    name: 'Voidcaller',
    epithet: 'The Mouth Behind the Sky',
    description:
      'You have heard the quiet between stars. It is not empty. It is listening. You have learned to answer without offering it your name.',
    trait: 'Gain +1 AC and +2 Pact. Void Rift damages and Curses enemies in an area.',
    abilityId: 'void_rift',
    bonuses: { ac: 1, resource: 2 }
  }
];

export const subclassById = Object.fromEntries(subclasses.map((entry) => [entry.id, entry]));

export const subclassesForClass = (classId: string): SubclassDef[] =>
  subclasses.filter((entry) => entry.classId === classId);
