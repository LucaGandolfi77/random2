export interface DialogueEffects {
  unlock?: string;
  morale?: number;
  flag?: string;
  startBattle?: boolean;
  nextChapter?: boolean;
  ending?: string;
  retry?: boolean;
}

export interface DialogueNode {
  speaker: string;
  portrait: string;
  text: string;
  choices: { text: string; next?: string; effects?: DialogueEffects }[];
}

const n = (speaker: string, portrait: string, text: string, choices: DialogueNode['choices']): DialogueNode => ({ speaker, portrait, text, choices });
const fight = (text: string, effects: DialogueEffects = {}): DialogueNode['choices'][number] => ({ text, effects: { ...effects, startBattle: true } });
const advance = (text: string, effects: DialogueEffects = {}): DialogueNode['choices'][number] => ({ text, effects: { ...effects, nextChapter: true } });

export const DIALOGUE: Record<string, DialogueNode> = {
  // ---------------- CHAPTER 1 ----------------
  c1_intro: n('NARRATOR', 'narrator', 'A sealed letter waits on your bunk. The wax seal bears a crown of gold.', [
    { text: '"Break the seal."', next: 'c1_intro2', effects: { flag: 'letter_opened' } },
    { text: '"Leave it. We sail at dawn."', next: 'c1_intro2', effects: { morale: 1, flag: 'letter_ignored' } }
  ]),
  c1_intro2: n('MENTOR', 'gold', '"The harbour is already burning. Someone moved before us, and they know your name."', [
    fight('"Then we move now."'),
    { text: '"Who is behind this?"', next: 'c1_intro3' }
  ]),
  c1_intro3: n('INFORMANT', 'specter', '"A captain in gold. He bought the dock, the guards, and half the harbour master\'s debts."', [
    fight('"We stop him here."', { flag: 'knows_gold' }),
    fight('"Not alone. Wake the crew."', { morale: 2, flag: 'crew_rally' })
  ]),
  c1_win: n('MENTOR', 'gold', '"First blood. The port is ours until sunset. But look at the sky — more ships are coming."', [
    advance('"Then we keep moving."', { flag: 'port_safe' }),
    advance('"Let the crew rest. One hour."', { morale: 2, flag: 'rested' })
  ]),
  c1_lose: n('NARRATOR', 'narrator', 'The harbour guard drags you back to the alley. The letter is gone from your pocket.', [
    { text: '"We try again. Same ground."', effects: { retry: true } },
    { text: '"Regroup. We lost because we rushed."', effects: { retry: true, morale: 1 } }
  ]),

  // ---------------- CHAPTER 2 ----------------
  c2_intro: n('INFORMANT', 'specter', '"The Iron Gate has six levels. Your opponent lives on the bottom one and never lost a fight there."', [
    fight('"Then we take him to the top."'),
    { text: '"What does he want?"', next: 'c2_intro2' }
  ]),
  c2_intro2: n('BRUTE', 'giant', '"I want the girl who wrote that letter. Step aside and nobody bleeds."', [
    fight('"She is family. No."', { flag: 'defended_mentor' }),
    fight('"You will have to go through me."', { morale: 1 })
  ]),
  c2_win: n('MENTOR', 'gold', '"He folded like cheap steel. Take his Basin people with us — they know the lower tunnels."', [
    advance('"Welcome aboard."', { unlock: 'desert', flag: 'basin_recruited' }),
    advance('"We do not need them."', { morale: -1, flag: 'basin_refused' })
  ]),
  c2_lose: n('BRUTE', 'giant', '"Down here the walls are your future. Try climbing out."', [
    { text: '"We learn the tunnels."', effects: { retry: true, flag: 'tunnels_learned' } },
    { text: '"Fall back."', effects: { retry: true } }
  ]),

  // ---------------- CHAPTER 3 ----------------
  c3_intro: n('NARRATOR', 'narrator', 'The floating market is closed, but every stall light is on. Someone is waiting between the awnings.', [
    fight('"We go in together."'),
    { text: '"You stay behind me."', next: 'c3_intro2', effects: { morale: 1 } }
  ]),
  c3_intro2: n('SPECTER', 'specter', '"Careful. The blade you are looking for does not belong to a man. It belongs to a memory."', [
    fight('"I can handle memories."', { flag: 'specter_trust' }),
    fight('"Then help me handle it."', { unlock: 'specter', morale: 1 })
  ]),
  c3_win: n('SPECTER', 'specter', '"You won. Odd. Most people who come here leave something behind. You did not."', [
    advance('"Come with us."', { unlock: 'specter', flag: 'specter_joined' }),
    advance('"Stay here. Watch the market."', { morale: -1, flag: 'specter_watching' })
  ]),
  c3_lose: n('SPECTER', 'specter', '"The memory won. It always does. But I saw how you fought — again, with more time."', [
    { text: '"One more round."', effects: { retry: true } },
    { text: '"Tell me what you saw."', effects: { retry: true, flag: 'memory_clue' } }
  ]),

  // ---------------- CHAPTER 4 ----------------
  c4_intro: n('MENTOR', 'gold', '"The gun merchant sold us out. He is guarding the only bridge out of the dock."', [
    fight('"Then we cross it."'),
    { text: "\"He was a friend.\"", next: 'c4_intro2' }
  ]),
  c4_intro2: n('GUNNER', 'guns', '"Friends do not sell friends. But business is business. Try to cross."', [
    fight('"I am not crossing alone."', { morale: 1 }),
    fight('"Move aside."', { flag: 'bridge_forced' })
  ]),
  c4_win: n('GUNNER', 'guns', '"Fine. You win the bridge. Take my old pair of pistols too — they are loud enough for both of us."', [
    advance('"We can use loud."', { unlock: 'guns', flag: 'guns_joined' }),
    advance('"Keep them. We travel light."', { morale: 1, flag: 'guns_declined' })
  ]),
  c4_lose: n('GUNNER', 'guns', '"The bridge stays closed. Come back when you have something worth trading."', [
    { text: '"We train, then return."', effects: { retry: true, morale: 1 } },
    { text: '"We go around."', effects: { retry: true, flag: 'detour' } }
  ]),

  // ---------------- CHAPTER 5 ----------------
  c5_intro: n('NARRATOR', 'narrator', 'The forge has not cooled in forty years. Sparks fall like rain over the arena floor.', [
    fight('"Let him hear us coming."'),
    { text: "\"He cannot hear anything in there.\"", next: 'c5_intro2' }
  ]),
  c5_intro2: n('MENTOR', 'gold', '"The mechanic who forged my blade is on the other side. He taught me everything I know."', [
    fight('"Then I will beat his student."', { flag: 'mentor_watched' }),
    fight('"Teach me his weakness."', { morale: 2, flag: 'weakness_known' })
  ]),
  c5_win: n('MENTOR', 'gold', '"He let you win. Do not look so proud — he always did that for people he believed in."', [
    advance('"Then I earn it properly next time."', { unlock: 'giant', morale: 1, flag: 'giant_respect' }),
    advance('"Thank you, teacher."', { unlock: 'giant', flag: 'mentor_thanks' })
  ]),
  c5_lose: n('GIANT MECHANIC', 'giant', '"Too eager. The forge punishes that. Come back with patience."', [
    { text: '"I will."', effects: { retry: true, morale: 1 } },
    { text: '"Patience is not my gift."', effects: { retry: true } }
  ]),

  // ---------------- CHAPTER 6 ----------------
  c6_intro: n('MOON PRIESTESS', 'moon', '"The sky fortress is a lie. It is a ship that never learned to land."', [
    fight('"Then we bring it down."'),
    { text: '"Why are you here?"', next: 'c6_intro2' }
  ]),
  c6_intro2: n('MOON PRIESTESS', 'moon', '"Because the moon told me you would lose without me. It is rarely wrong."', [
    fight('"Prove it."', { morale: 1 }),
    fight('"Then stand beside me."', { unlock: 'moon', flag: 'moon_joined' })
  ]),
  c6_win: n('MOON PRIESTESS', 'moon', '"The fortress is falling. I read the tide tonight — it runs toward the ruins."', [
    advance('"Then we follow the tide."', { unlock: 'moon', flag: 'ruins_hint' }),
    advance('"First, we rest."', { morale: 2 })
  ]),
  c6_lose: n('MOON PRIESTESS', 'moon', '"The sky was against us. Next time, wait for my signal."', [
    { text: '"I will wait."', effects: { retry: true, morale: 1 } },
    { text: '"Signals are for people who hesitate."', effects: { retry: true, flag: 'reckless' } }
  ]),

  // ---------------- CHAPTER 7 ----------------
  c7_intro: n('INFORMANT', 'specter', '"The wharf is frozen solid. The sentinel standing there has not moved in three days."', [
    fight('"Something moved. Look again."'),
    { text: '"How do you beat a statue?"', next: 'c7_intro2' }
  ]),
  c7_intro2: n('BERSERKER', 'berserker', '"You break statues by hitting them. Simple."', [
    fight('"Then hit with me."', { morale: 1, flag: 'berserker_pact' }),
    fight('"I handle this one."', { flag: 'solo_pride' })
  ]),
  c7_win: n('BERSERKER', 'berserker', '"Hah! The ice remembers that hit. You fight like the sea — no plan, all force."', [
    advance('"There is a plan. You just cannot see it."', { unlock: 'berserker', flag: 'berserker_joined' }),
    advance('"Keep the ice broken."', { unlock: 'berserker', morale: 1 })
  ]),
  c7_lose: n('BERSERKER', 'berserker', '"The cold got into your bones. Mine too. Again — warmer this time."', [
    { text: '"Again."', effects: { retry: true } },
    { text: '"Bring the others."', effects: { retry: true, morale: 1 } }
  ]),

  // ---------------- CHAPTER 8 ----------------
  c8_intro: n('NARRATOR', 'narrator', 'Beneath the ruins, a wall of photographs shows the same night over and over: 1998.', [
    fight('"We finish this."'),
    { text: "\"That is my mother's face.\"", next: 'c8_intro2', effects: { flag: 'mother_photo' } }
  ]),
  c8_intro2: n('HUNTER', 'venom', '"She was the first to keep the line open. You inherited more than her courage."', [
    fight('"Then tell me the rest."', { flag: 'truth_hunter' }),
    fight('"No more riddles."', { morale: -1, flag: 'truth_refused' })
  ]),
  c8_win: n('HUNTER', 'venom', '"The venom is gone. So is the lie we told about 1998. Take my blade — you earned the truth."', [
    advance('"We end this at the harbour."', { unlock: 'venom', flag: 'truth_known', morale: 2 }),
    advance('"Some truths should stay buried."', { unlock: 'venom', flag: 'truth_buried' })
  ]),
  c8_lose: n('HUNTER', 'venom', '"The ruins keep their secret. But the photo of your mother did not change. Neither did your name."', [
    { text: '"Try me again."', effects: { retry: true } },
    { text: '"What did she do?"', effects: { retry: true, flag: 'mother_clue' } }
  ]),

  // ---------------- CHAPTER 9 ----------------
  c9_intro: n('GOLDEN CAPTAIN', 'gold', '"You carry my letter like a badge. I wrote it because I wanted you to come."', [
    fight('"Then I am here."'),
    { text: '"Why the trials?"', next: 'c9_intro2' }
  ]),
  c9_intro2: n('GOLDEN CAPTAIN', 'gold', '"To find someone who could still trust a voice on the other end of a line. Every rival you beat was a test."', [
    fight('"Then test me properly."', { flag: 'boss_challenge' }),
    fight('"Tests end when people get hurt."', { morale: 2, flag: 'boss_reproach' })
  ]),
  c9_win: n('GOLDEN CAPTAIN', 'gold', '"You won the room and the argument. Take my colours. The last fight is not mine to give."', [
    advance('"Who is waiting?"', { unlock: 'gold', flag: 'gold_colours', morale: 1 }),
    advance('"No colours. I earned my own."', { unlock: 'gold', flag: 'own_colours', morale: 2 })
  ]),
  c9_lose: n('GOLDEN CAPTAIN', 'gold', '"Almost. You fought like someone who needed to win. The last fight needs someone who wants to come home."', [
    { text: '"I will be ready."', effects: { retry: true, morale: 1 } },
    { text: '"Teach me what you saw."', effects: { retry: true, flag: 'boss_lesson' } }
  ]),

  // ---------------- CHAPTER 10 ----------------
  c10_intro: n('NARRATOR', 'narrator', 'Dawn is an hour away. Every ally you called is somewhere in the crowd. The final rival steps into the light.', [
    fight('"Keep the line open."'),
    { text: '"Look at the crowd first."', next: 'c10_intro2', effects: { morale: 1 } }
  ]),
  c10_intro2: n('MENTOR', 'gold', '"Voices. That is all they ever were. Listen — you can hear them now."', [
    fight('"I can. Let us go."', { flag: 'final_listen' }),
    fight('"Then stay on the line with me."', { morale: 3, flag: 'final_together' })
  ]),
  c10_win: n('NARRATOR', 'narrator', 'Six o\'clock. The harbour is quiet, and every voice you called answers. The long night is over.', [
    { text: '"Go home."', effects: { ending: 'legend', flag: 'ending_legend' } },
    { text: '"Stay until everyone is safe."', effects: { ending: 'loyal', flag: 'ending_loyal' } },
    { text: '"Write the letter I never sent."', effects: { ending: 'truth', flag: 'ending_truth' } }
  ]),
  c10_lose: n('NARRATOR', 'narrator', 'The line goes quiet. Someone picks up the phone and says your name in a voice you almost recognise.', [
    { text: '"Answer it."', effects: { ending: 'fallen', flag: 'ending_fallen' } },
    { text: '"One more fight."', effects: { retry: true, morale: 1 } }
  ])
};

export const STORY_ENDINGS: Record<string, { title: string; text: string }> = {
  legend: { title: 'A LEGEND AT DAWN', text: 'The harbour tells the story of the captain who kept the line open for eight hours and came back with every friend. Your name outlives the night.' },
  loyal: { title: 'EVERY VOICE ANSWERS', text: 'You stayed until the last boat was safe. Nobody was left on the pier, and nobody had to call alone again.' },
  truth: { title: 'THE LETTER YOU NEVER SENT', text: 'You wrote it down: the rule, the year, the voices. Someone will read it in another twenty years and know what to do.' },
  fallen: { title: 'THE QUIET LINE', text: 'The connection broke. In the morning the harbour was bright and ordinary, and a phone rang once in an empty room.' }
};
