import type { EnemyDef } from '@/core/types';

export const enemies: EnemyDef[] = [
  {
    id: 'hollow_thrall', name: 'Hollow Thrall', role: 'melee',
    description: 'A person-shaped absence in rusted armor. It attacks in silence.',
    hp: 18, ac: 12, attackBonus: 4, damage: '1d6+2', initiativeBonus: 0, speed: 5,
    abilities: ['enemy_strike'], ai: 'aggressive', color: '#6d6b62', portraitIcon: '☠', xp: 30
  },
  {
    id: 'ash_raider', name: 'Ash Raider', role: 'melee',
    description: 'A scavenger of the Ashen Marches, wrapped in soot-stained cloth.',
    hp: 26, ac: 13, attackBonus: 5, damage: '1d8+2', initiativeBonus: 1, speed: 6,
    abilities: ['enemy_strike'], ai: 'tactical', color: '#8f4e33', portraitIcon: '⚔', xp: 45
  },
  {
    id: 'hollow_archer', name: 'Hollow Archer', role: 'archer',
    description: 'A bow drawn by fingers that are no longer there. It aims for the throat.',
    hp: 20, ac: 12, attackBonus: 5, damage: '1d8+2', initiativeBonus: 2, speed: 5,
    abilities: ['enemy_shot'], ai: 'ranged', color: '#6e745d', portraitIcon: '➶', xp: 50
  },
  {
    id: 'ember_adept', name: 'Ember Adept', role: 'mage',
    description: 'A Choir heretic whose skin is cracked with living fire.',
    hp: 22, ac: 12, attackBonus: 5, damage: '1d8+1', initiativeBonus: 1, speed: 5,
    abilities: ['enemy_firebolt', 'enemy_curse'], ai: 'tactical', color: '#b35a30', portraitIcon: '🔥', xp: 65
  },
  {
    id: 'shade_assassin', name: 'Shade Assassin', role: 'assassin',
    description: 'A silhouette with two knives and no shadow of its own.',
    hp: 24, ac: 14, attackBonus: 7, damage: '1d8+3', initiativeBonus: 4, speed: 7,
    abilities: ['enemy_strike', 'enemy_shadowstep'], ai: 'tactical', color: '#4c4358', portraitIcon: '🗡', xp: 75
  },
  {
    id: 'bone_summoner', name: 'Bone Summoner', role: 'summoner',
    description: 'A Choir priest in a mask of fused finger bones. The air bends around them.',
    hp: 30, ac: 13, attackBonus: 4, damage: '1d6', initiativeBonus: 2, speed: 5,
    abilities: ['enemy_curse', 'enemy_summon', 'enemy_heal'], ai: 'support', color: '#7e6b57', portraitIcon: '◌', xp: 90
  },
  {
    id: 'covenant_sentinel', name: 'Covenant Sentinel', role: 'elite',
    description: 'A temple guardian of grey stone and older promises.',
    hp: 55, ac: 17, attackBonus: 7, damage: '1d10+3', initiativeBonus: 0, speed: 4,
    abilities: ['enemy_strike', 'enemy_curse'], ai: 'tactical', color: '#7c7f87', portraitIcon: '⛨', xp: 120
  },
  {
    id: 'mire_hound', name: 'Mire Hound', role: 'melee',
    description: 'A hound of the drowned lowlands, its fur slick with something older than water.',
    hp: 22, ac: 13, attackBonus: 5, damage: '1d6+3', initiativeBonus: 3, speed: 7,
    abilities: ['enemy_strike'], ai: 'aggressive', color: '#4e6259', portraitIcon: '🐺', xp: 50
  },
  {
    id: 'thornling', name: 'Thornling', role: 'melee',
    description: 'A knot of thorn and hunger, grown around the memory of a deer.',
    hp: 28, ac: 12, attackBonus: 5, damage: '1d8+2', initiativeBonus: 1, speed: 5,
    abilities: ['enemy_strike'], ai: 'aggressive', color: '#5d6a3b', portraitIcon: '🌿', xp: 55
  },
  {
    id: 'crown_echo', name: 'Crown Echo', role: 'mage',
    description: 'A memory of a person who once wore the Crown. It repeats their last spell.',
    hp: 20, ac: 13, attackBonus: 5, damage: '1d8', initiativeBonus: 2, speed: 5,
    abilities: ['enemy_curse', 'enemy_firebolt'], ai: 'ranged', color: '#b8a269', portraitIcon: '◉', xp: 60
  },
  {
    id: 'thorn_shade', name: 'Thorned Shade', role: 'assassin',
    description: 'Sable’s shadow, wearing a crown of briars. It smiles when she does not.',
    hp: 48, ac: 15, attackBonus: 7, damage: '1d8+4', initiativeBonus: 4, speed: 7,
    abilities: ['enemy_strike', 'enemy_shadowstep', 'enemy_curse'], ai: 'tactical', color: '#3d3347', portraitIcon: '◐', xp: 150
  },
  {
    id: 'ash_warden', name: 'The Ash-Warden', role: 'boss',
    description: 'The Fallen Bastion’s keeper, fused to its gate. A crown of iron stakes rises from its skull.',
    hp: 95, ac: 16, attackBonus: 7, damage: '1d10+3', initiativeBonus: 1, speed: 4,
    abilities: ['enemy_strike', 'boss_sweep', 'enemy_curse'], ai: 'boss', color: '#a26a43', portraitIcon: '♜',
    xp: 300, boss: true, phases: 2
  },
  {
    id: 'antlered_silence', name: 'The Antlered Silence', role: 'boss',
    description: 'A great stag of black wood and listening. Where it walks, sound forgets to follow.',
    hp: 130, ac: 16, attackBonus: 8, damage: '1d12+4', initiativeBonus: 3, speed: 6,
    abilities: ['boss_roots', 'enemy_strike', 'boss_wail'], ai: 'boss', color: '#5f6f52', portraitIcon: '🦌',
    xp: 420, boss: true, phases: 2
  },
  {
    id: 'drowned_saint', name: 'The Drowned Saint', role: 'boss',
    description: 'The Othren saint who held the temple’s last door. Her grief has become weather.',
    hp: 150, ac: 17, attackBonus: 8, damage: '1d10+4', initiativeBonus: 2, speed: 4,
    abilities: ['boss_wail', 'enemy_curse', 'enemy_summon', 'boss_crownfire'], ai: 'boss', color: '#5d8c8f', portraitIcon: '◌',
    xp: 520, boss: true, phases: 2
  },
  {
    id: 'crownbound_veyra', name: 'Veyra, the Crownbound', role: 'boss',
    description: 'Magistrate Veyra Sol, her body lit from within by a broken crown. Behind her eyes, an older king is waking.',
    hp: 210, ac: 18, attackBonus: 9, damage: '1d12+5', initiativeBonus: 3, speed: 5,
    abilities: ['boss_crownfire', 'boss_sweep', 'enemy_summon', 'boss_wail'], ai: 'boss', color: '#c49248', portraitIcon: '♛',
    xp: 900, boss: true, phases: 3
  }
];

export const enemyById = Object.fromEntries(enemies.map((e) => [e.id, e]));
