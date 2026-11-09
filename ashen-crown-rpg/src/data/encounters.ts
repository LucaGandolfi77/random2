import type { EncounterDef } from '@/core/types';

const makeBattlefield = (theme: string, variant: number) => {
  const w = 14;
  const h = 10;
  const g = Array.from({ length: h }, () => Array.from({ length: w }, () => '.'));
  for (let x = 0; x < w; x++) {
    g[0][x] = '#';
    g[h - 1][x] = '#';
  }
  for (let y = 0; y < h; y++) {
    g[y][0] = '#';
    g[y][w - 1] = '#';
  }
  const set = (x: number, y: number, ch: string) => {
    if (x > 0 && x < w - 1 && y > 0 && y < h - 1) g[y][x] = ch;
  };

  if (theme === 'bastion') {
    set(6, 2, '^'); set(7, 2, '^'); set(5, 3, 'o'); set(6, 4, 'f'); set(7, 6, 'o');
    set(5, 7, '^'); set(8, 4, '~'); set(8, 5, '~'); set(3, 2, '^'); set(11, 8, '^');
    if (variant > 1) { set(5, 4, 'o'); set(8, 6, 'f'); }
  } else if (theme === 'village') {
    set(5, 2, 'o'); set(6, 7, 'o'); set(7, 4, '~'); set(7, 5, '~'); set(8, 3, '^');
    set(4, 8, '^'); set(10, 2, '^'); set(3, 4, 'o');
  } else if (theme === 'forest') {
    set(4, 2, 'T'); set(5, 2, 'T'); set(4, 7, 'T'); set(5, 8, 'T');
    set(7, 3, '~'); set(7, 4, '~'); set(8, 4, '~'); set(6, 6, 'o'); set(9, 7, 'T');
    set(3, 5, ','); set(10, 3, ','); set(11, 6, 'T'); set(6, 2, 'T');
  } else if (theme === 'temple') {
    set(5, 2, '~'); set(5, 3, '~'); set(6, 3, '~'); set(7, 6, '~'); set(8, 6, '~'); set(8, 7, '~');
    set(4, 5, '^'); set(9, 2, '^'); set(10, 7, '^'); set(5, 8, '~'); set(6, 8, '~'); set(3, 3, 'i');
    if (variant > 1) { set(7, 4, 'i'); set(6, 5, '~'); set(9, 5, '~'); }
  } else {
    set(5, 3, 'f'); set(6, 3, 'f'); set(7, 6, 'f'); set(8, 6, 'f'); set(4, 5, 'a');
    set(9, 2, '^'); set(10, 7, '^'); set(6, 8, 'a'); set(3, 3, 'o'); set(11, 4, '^');
    if (variant > 2) { set(7, 4, 'f'); set(8, 5, 'f'); }
  }
  return g.map((r) => r.join(''));
};

export const encounters: EncounterDef[] = [
  {
    id: 'enc_bastion_raiders', name: 'Ash on the Wind', mapTheme: 'bastion', width: 14, height: 10,
    rows: makeBattlefield('bastion', 1),
    enemies: [
      { enemyId: 'hollow_thrall', x: 10, y: 3, name: 'Hollow Thrall' },
      { enemyId: 'ash_raider', x: 11, y: 5, name: 'Ash Raider' },
      { enemyId: 'hollow_thrall', x: 9, y: 7, name: 'Hollow Thrall' }
    ],
    objective: 'Defeat the raiders before they reach the road.', rewardGold: 32, rewardXp: 135, rewardItems: ['healing_potion'],
    music: 'combat', intro: 'Three shapes rise from the rubble. The wind carries the smell of hot iron.'
  },
  {
    id: 'enc_ash_warden', name: 'The Keeper of the Gate', mapTheme: 'bastion', width: 14, height: 10,
    rows: makeBattlefield('bastion', 2),
    enemies: [
      { enemyId: 'ash_warden', x: 10, y: 4, name: 'The Ash-Warden' },
      { enemyId: 'hollow_thrall', x: 9, y: 2, name: 'Hollow Thrall' },
      { enemyId: 'hollow_thrall', x: 9, y: 7, name: 'Hollow Thrall' }
    ],
    objective: 'Break the Warden’s hold on the gate.', rewardGold: 70, rewardXp: 360, rewardItems: ['warden_cinder', 'greater_healing'],
    boss: true, music: 'boss', intro: 'The gate has grown a body. It has been waiting a long time for someone worth stopping.',
    victoryText: 'The Warden collapses into slag. Beyond the gate, the road to Greymoor opens under a sky the color of old bruises.'
  },
  {
    id: 'enc_choir_cell', name: 'Hymns in the Cellar', mapTheme: 'village', width: 14, height: 10,
    rows: makeBattlefield('village', 1),
    enemies: [
      { enemyId: 'ember_adept', x: 10, y: 3, name: 'Choir Ember-Adept' },
      { enemyId: 'ember_adept', x: 11, y: 6, name: 'Choir Ember-Adept' },
      { enemyId: 'ash_raider', x: 9, y: 5, name: 'Choir Zealot' },
      { enemyId: 'ash_raider', x: 8, y: 7, name: 'Choir Zealot' }
    ],
    objective: 'Break the Choir cell before they can burn the village records.', rewardGold: 55, rewardXp: 220, rewardItems: ['scroll_chain_lightning'],
    music: 'combat', intro: 'The cellar smells of incense and accelerant. A hymn rises, off-key and fervent.'
  },
  {
    id: 'enc_woods_hounds', name: 'The Path Remembers Blood', mapTheme: 'forest', width: 14, height: 10,
    rows: makeBattlefield('forest', 1),
    enemies: [
      { enemyId: 'mire_hound', x: 9, y: 3, name: 'Mire Hound' },
      { enemyId: 'mire_hound', x: 10, y: 5, name: 'Mire Hound' },
      { enemyId: 'mire_hound', x: 9, y: 7, name: 'Mire Hound' }
    ],
    objective: 'Drive the mire hounds from the old path.', rewardGold: 28, rewardXp: 150,
    music: 'combat', intro: 'The undergrowth goes quiet. Then three pairs of pale eyes open between the roots.'
  },
  {
    id: 'enc_antlered_silence', name: 'The Antlered Silence', mapTheme: 'forest', width: 14, height: 10,
    rows: makeBattlefield('forest', 2),
    enemies: [
      { enemyId: 'antlered_silence', x: 10, y: 4, name: 'The Antlered Silence' },
      { enemyId: 'thornling', x: 8, y: 2, name: 'Thornling' },
      { enemyId: 'thornling', x: 11, y: 7, name: 'Thornling' }
    ],
    objective: 'Survive the grove’s judgment and break the Silence.', rewardGold: 90, rewardXp: 450, rewardItems: ['silence_antler', 'root_key'],
    boss: true, music: 'boss', intro: 'The forest stops pretending to be a forest. Something vast lowers its antlers.',
    victoryText: 'The Silence kneels, then becomes ordinary shadow. The grove exhales. A living key lies in the moss.'
  },
  {
    id: 'enc_thorned_shade', name: 'A Debt in Shadow', mapTheme: 'forest', width: 14, height: 10,
    rows: makeBattlefield('forest', 3),
    enemies: [
      { enemyId: 'thorn_shade', x: 10, y: 4, name: 'Sable’s Shadow' },
      { enemyId: 'shade_assassin', x: 9, y: 2, name: 'Thorned Attendant' },
      { enemyId: 'shade_assassin', x: 11, y: 7, name: 'Thorned Attendant' }
    ],
    objective: 'Face the shadow that wears Sable’s face.', rewardGold: 80, rewardXp: 380, rewardItems: ['sable_shadow'],
    music: 'boss', intro: 'It has her stance. Her scars. Her smile. It says your name the way she would if she had never learned kindness.'
  },
  {
    id: 'enc_bell_wraith', name: 'The Silent Bell', mapTheme: 'village', width: 14, height: 10,
    rows: makeBattlefield('village', 2),
    enemies: [
      { enemyId: 'shade_assassin', x: 10, y: 4, name: 'Bell-Wraith' },
      { enemyId: 'shade_assassin', x: 9, y: 2, name: 'Bell-Wraith' },
      { enemyId: 'bone_summoner', x: 12, y: 6, name: 'The Sexton' }
    ],
    objective: 'Silence the bell and the thing that rings it.', rewardGold: 65, rewardXp: 260, rewardItems: ['circlet_of_echoes'],
    music: 'boss', intro: 'The bell has no clapper. The sound comes from behind your eyes.'
  },
  {
    id: 'enc_temple_guardians', name: 'The Temple Remembers', mapTheme: 'temple', width: 14, height: 10,
    rows: makeBattlefield('temple', 1),
    enemies: [
      { enemyId: 'covenant_sentinel', x: 10, y: 3, name: 'Othren Sentinel' },
      { enemyId: 'covenant_sentinel', x: 10, y: 6, name: 'Othren Sentinel' },
      { enemyId: 'bone_summoner', x: 12, y: 4, name: 'Drowned Sexton' }
    ],
    objective: 'Reach the inner sanctum.', rewardGold: 110, rewardXp: 330, rewardItems: ['greater_healing', 'focus_tonic'],
    music: 'boss', intro: 'Three statues turn their heads. Water runs upward along the walls.'
  },
  {
    id: 'enc_drowned_saint', name: 'The Drowned Saint', mapTheme: 'temple', width: 14, height: 10,
    rows: makeBattlefield('temple', 2),
    enemies: [
      { enemyId: 'drowned_saint', x: 10, y: 4, name: 'The Drowned Saint' },
      { enemyId: 'crown_echo', x: 8, y: 2, name: 'Othren Echo' },
      { enemyId: 'crown_echo', x: 12, y: 7, name: 'Othren Echo' }
    ],
    objective: 'Release the Saint from her vigil.', rewardGold: 150, rewardXp: 650, rewardItems: ['crown_fragment', 'drowned_seal', 'saints_tear'],
    boss: true, music: 'boss', intro: 'She has been holding the door closed for six hundred years. She is still apologizing for it.',
    victoryText: 'The Saint sinks beneath the water, smiling. The crown fragment rises from her hands, warm as a living thing.'
  },
  {
    id: 'enc_citadel_echoes', name: 'Every Version of You', mapTheme: 'citadel', width: 14, height: 10,
    rows: makeBattlefield('citadel', 1),
    enemies: [
      { enemyId: 'shade_assassin', x: 10, y: 3, name: 'Echo of a Life Unlived' },
      { enemyId: 'ember_adept', x: 11, y: 5, name: 'Echo of the Choir' },
      { enemyId: 'covenant_sentinel', x: 9, y: 7, name: 'Echo of the Covenant' }
    ],
    objective: 'Climb the Citadel’s memory.', rewardGold: 120, rewardXp: 420, rewardItems: ['greater_healing'],
    music: 'boss', intro: 'The corridor shows you three deaths. You have not lived long enough to have made those choices. Yet.'
  },
  {
    id: 'enc_crownbound', name: 'The Crownbound', mapTheme: 'citadel', width: 14, height: 10,
    rows: makeBattlefield('citadel', 3),
    enemies: [
      { enemyId: 'crownbound_veyra', x: 10, y: 4, name: 'Veyra, the Crownbound' },
      { enemyId: 'crown_echo', x: 8, y: 2, name: 'Crown Echo' },
      { enemyId: 'crown_echo', x: 12, y: 2, name: 'Crown Echo' },
      { enemyId: 'bone_summoner', x: 12, y: 7, name: 'The Last Sexton' }
    ],
    objective: 'End the Crown’s hold on Veyra — and on the world.', rewardGold: 250, rewardXp: 1200, rewardItems: ['first_memory', 'crown_of_ashes'],
    boss: true, music: 'finalboss', intro: 'The Crown opens like an eye. Veyra speaks with two voices, and only one of them is hers.',
    victoryText: 'The Crown falls. For the first time since the world was written, the silence belongs to no one.'
  }
];

export const encounterById = Object.fromEntries(encounters.map((e) => [e.id, e]));
