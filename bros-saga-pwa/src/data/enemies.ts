import type { EnemyDef } from '../game/types';

export const ENEMIES: EnemyDef[] = [
  {
    id: 'grubbo', name: 'GRUBBO', hp: 22, attack: 8, defense: 3, speed: 5, xp: 12,
    weak: 'jump', resist: 'hammer', boss: false,
    colors: { body: '#8b6b4a', accent: '#e0c090', eye: '#20202a' }, telegraph: 'jump',
    dialogue: 'A round little fellow. It bounces when you poke it.'
  },
  {
    id: 'snapper', name: 'SNAPPER', hp: 30, attack: 11, defense: 5, speed: 7, xp: 16,
    weak: 'hammer', resist: 'fire', boss: false,
    colors: { body: '#c85a4a', accent: '#f0d0a0', eye: '#20202a' }, telegraph: 'hammer',
    dialogue: 'Its jaw is a perfectly timed trap. Hammer timing matters.'
  },
  {
    id: 'flitta', name: 'FLITTA', hp: 26, attack: 9, defense: 2, speed: 11, xp: 15,
    weak: 'thunder', resist: 'jump', boss: false,
    colors: { body: '#7fc8e8', accent: '#e0f8ff', eye: '#20202a' }, telegraph: 'blast',
    dialogue: 'It hovers just out of jumping range. Try an elemental hand.'
  },
  {
    id: 'emberling', name: 'EMBERLING', hp: 34, attack: 12, defense: 6, speed: 6, xp: 20,
    weak: 'thunder', resist: 'fire', boss: false,
    colors: { body: '#e8823a', accent: '#ffe0a0', eye: '#20202a' }, telegraph: 'blast',
    dialogue: 'Warm to the touch. Extremely warm.'
  },
  {
    id: 'shroom', name: 'SHROOM', hp: 40, attack: 10, defense: 8, speed: 4, xp: 22,
    weak: 'fire', resist: 'thunder', boss: false,
    colors: { body: '#b05ac8', accent: '#f0d8f8', eye: '#20202a' }, telegraph: 'jump',
    dialogue: 'It looks friendly. It is not.'
  },
  {
    id: 'pebble', name: 'PEBBLE', hp: 46, attack: 13, defense: 11, speed: 3, xp: 25,
    weak: 'hammer', resist: 'jump', boss: false,
    colors: { body: '#7a8290', accent: '#b8c0cc', eye: '#20202a' }, telegraph: 'hammer',
    dialogue: 'A rock with opinions.'
  },
  {
    id: 'gusto', name: 'GUSTO', hp: 38, attack: 14, defense: 4, speed: 12, xp: 27,
    weak: 'fire', resist: 'thunder', boss: false,
    colors: { body: '#a8d8e8', accent: '#ffffff', eye: '#20202a' }, telegraph: 'blast',
    dialogue: 'You can hear it coming. You still cannot dodge it.'
  },
  {
    id: 'mimicap', name: 'MIMICAP', hp: 44, attack: 15, defense: 7, speed: 8, xp: 30,
    weak: 'hammer', resist: 'fire', boss: false,
    colors: { body: '#d0a860', accent: '#fff0c0', eye: '#20202a' }, telegraph: 'jump',
    dialogue: 'It impersonates a treasure chest. Rudely.'
  },
  {
    id: 'copper', name: 'COPPER CAP', hp: 120, attack: 17, defense: 9, speed: 8, xp: 90,
    weak: 'thunder', resist: 'hammer', boss: true,
    colors: { body: '#c0703a', accent: '#ffe0a0', eye: '#501020' }, telegraph: 'hammer',
    dialogue: 'The guard of the harbour. It takes its job very seriously.'
  },
  {
    id: 'vapor', name: 'VAPOR KING', hp: 150, attack: 19, defense: 10, speed: 10, xp: 120,
    weak: 'fire', resist: 'jump', boss: true,
    colors: { body: '#7a9ad0', accent: '#e0f0ff', eye: '#201040' }, telegraph: 'blast',
    dialogue: 'A cloud with a grudge and excellent timing.'
  },
  {
    id: 'starling', name: 'STARLING', hp: 190, attack: 22, defense: 12, speed: 11, xp: 180,
    weak: 'hammer', resist: 'thunder', boss: true,
    colors: { body: '#f0c850', accent: '#fff8d0', eye: '#402010' }, telegraph: 'blast',
    dialogue: 'The guardian of the last star. It knows every trick you know.'
  },
  {
    id: 'sandworm', name: 'SANDWORM', hp: 52, attack: 16, defense: 8, speed: 7, xp: 34,
    weak: 'fire', resist: 'hammer', boss: false,
    colors: { body: '#d8b46a', accent: '#f6e0a8', eye: '#402810' }, telegraph: 'blast',
    dialogue: 'It swims through the sand. Very rude.'
  },
  {
    id: 'iceling', name: 'ICELING', hp: 58, attack: 17, defense: 9, speed: 9, xp: 38,
    weak: 'fire', resist: 'thunder', boss: false,
    colors: { body: '#a8d8f0', accent: '#ffffff', eye: '#203050' }, telegraph: 'hammer',
    dialogue: 'Cold to the touch. Colder to the timing.'
  },
  {
    id: 'skyfin', name: 'SKYFIN', hp: 62, attack: 18, defense: 7, speed: 12, xp: 42,
    weak: 'thunder', resist: 'jump', boss: false,
    colors: { body: '#c8b8f0', accent: '#f0e8ff', eye: '#302050' }, telegraph: 'blast',
    dialogue: 'A fish out of water, and very annoyed about it.'
  },
  {
    id: 'duneking', name: 'DUNE KING', hp: 220, attack: 23, defense: 13, speed: 9, xp: 210,
    weak: 'fire', resist: 'thunder', boss: true,
    colors: { body: '#d8a850', accent: '#fff0b0', eye: '#402010' }, telegraph: 'hammer',
    dialogue: 'The desert has a king. He does not like visitors.'
  },
  {
    id: 'frostwarden', name: 'FROST WARDEN', hp: 250, attack: 25, defense: 15, speed: 10, xp: 250,
    weak: 'fire', resist: 'hammer', boss: true,
    colors: { body: '#9fc8e8', accent: '#ffffff', eye: '#203050' }, telegraph: 'blast',
    dialogue: 'It has guarded the peak for a thousand winters.'
  },
  {
    id: 'skytyrant', name: 'SKY TYRANT', hp: 300, attack: 28, defense: 16, speed: 13, xp: 320,
    weak: 'thunder', resist: 'fire', boss: true,
    colors: { body: '#8f7ad8', accent: '#f0e8ff', eye: '#301050' }, telegraph: 'blast',
    dialogue: 'The storm above the keep. It has never lost.'
  },
  {
    id: 'crystalbug', name: 'CRYSTAL BUG', hp: 70, attack: 20, defense: 11, speed: 10, xp: 48,
    weak: 'hammer', resist: 'thunder', boss: false,
    colors: { body: '#8fd8e8', accent: '#e0ffff', eye: '#203050' }, telegraph: 'blast',
    dialogue: 'Its shell rings when you hit it. Pleasantly, then less so.'
  },
  {
    id: 'ashgolem', name: 'ASH GOLEM', hp: 84, attack: 23, defense: 15, speed: 5, xp: 55,
    weak: 'thunder', resist: 'fire', boss: false,
    colors: { body: '#5a5a5e', accent: '#ff8a4a', eye: '#401010' }, telegraph: 'hammer',
    dialogue: 'Still warm from a fire that went out centuries ago.'
  },
  {
    id: 'tidewraith', name: 'TIDE WRAITH', hp: 76, attack: 22, defense: 9, speed: 13, xp: 58,
    weak: 'fire', resist: 'jump', boss: false,
    colors: { body: '#5f8fb8', accent: '#c8e8ff', eye: '#102040' }, telegraph: 'blast',
    dialogue: 'A sailor who forgot to come home.'
  },
  {
    id: 'voidmoth', name: 'VOID MOTH', hp: 82, attack: 24, defense: 10, speed: 14, xp: 62,
    weak: 'fire', resist: 'hammer', boss: false,
    colors: { body: '#6a5a8a', accent: '#d8c8ff', eye: '#301040' }, telegraph: 'blast',
    dialogue: 'It eats light. Bring a flame.'
  },
  {
    id: 'sunkenwarden', name: 'SUNKEN WARDEN', hp: 340, attack: 30, defense: 19, speed: 11, xp: 380,
    weak: 'fire', resist: 'thunder', boss: true,
    colors: { body: '#4a7a8a', accent: '#c8e8f0', eye: '#102030' }, telegraph: 'hammer',
    dialogue: 'It was a lighthouse once. Now it guards the drowned road.'
  },
  {
    id: 'clockworkduo', name: 'CLOCKWORK DUO', hp: 380, attack: 32, defense: 18, speed: 14, xp: 420,
    weak: 'thunder', resist: 'fire', boss: true,
    colors: { body: '#b8a06a', accent: '#f6e0a8', eye: '#302010' }, telegraph: 'blast',
    dialogue: 'Two machines that finish each other\'s sentences.'
  },
  {
    id: 'stormherald', name: 'STORM HERALD', hp: 420, attack: 35, defense: 20, speed: 15, xp: 470,
    weak: 'hammer', resist: 'thunder', boss: true,
    colors: { body: '#7a8ac8', accent: '#e8f0ff', eye: '#202050' }, telegraph: 'blast',
    dialogue: 'The sky sends its announcement. It is not good news.'
  },
  {
    id: 'nightemperor', name: 'NIGHT EMPEROR', hp: 520, attack: 38, defense: 22, speed: 16, xp: 600,
    weak: 'bros', resist: 'fire', boss: true,
    colors: { body: '#3a2a58', accent: '#f4c542', eye: '#ff4060' }, telegraph: 'blast',
    dialogue: 'The one who wrote the letter. It has been waiting for you.'
  }
];

export const ENEMY_BY_ID = Object.fromEntries(ENEMIES.map((e) => [e.id, e])) as Record<string, EnemyDef>;
