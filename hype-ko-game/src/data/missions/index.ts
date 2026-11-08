export type MissionType =
  | 'matches'
  | 'wins'
  | 'combo'
  | 'supers'
  | 'finishers'
  | 'damage'
  | 'streak'
  | 'perfect'
  | 'teamWin'
  | 'rumbleWin';

export interface MissionDefinition {
  id: string;
  name: string;
  description: string;
  type: MissionType;
  target: number;
  xp: number;
  credits: number;
  icon: string;
}

export const MISSIONS: MissionDefinition[] = [
  {
    id: 'first-blood',
    name: 'PRIMA VOLTA',
    description: 'Vinci il tuo primo combattimento.',
    type: 'wins',
    target: 1,
    xp: 120,
    credits: 80,
    icon: '★'
  },
  {
    id: 'warm-up',
    name: 'RISCALDAMENTO',
    description: 'Disputa 5 combattimenti.',
    type: 'matches',
    target: 5,
    xp: 180,
    credits: 120,
    icon: '▶'
  },
  {
    id: 'combo-machine',
    name: 'COMBO MACHINE',
    description: 'Metti a segno una combo da 10 colpi.',
    type: 'combo',
    target: 10,
    xp: 250,
    credits: 160,
    icon: '∞'
  },
  {
    id: 'superstar',
    name: 'SUPERSTAR',
    description: 'Usa 5 mosse Super.',
    type: 'supers',
    target: 5,
    xp: 220,
    credits: 140,
    icon: '⚡'
  },
  {
    id: 'hype-finish',
    name: 'HYPE FINISH',
    description: 'Esegui un Hype Finish.',
    type: 'finishers',
    target: 1,
    xp: 300,
    credits: 200,
    icon: '☠'
  },
  {
    id: 'damage-dealer',
    name: 'DEMOLITORE',
    description: 'Infliggi 5000 danni totali.',
    type: 'damage',
    target: 5000,
    xp: 320,
    credits: 220,
    icon: '✹'
  },
  {
    id: 'streak-3',
    name: 'IN SERIE',
    description: 'Ottieni una serie di 3 vittorie.',
    type: 'streak',
    target: 3,
    xp: 350,
    credits: 240,
    icon: '▲'
  },
  {
    id: 'flawless',
    name: 'SENZA GRAFFI',
    description: 'Vinci un round senza subire danni.',
    type: 'perfect',
    target: 1,
    xp: 280,
    credits: 180,
    icon: '◇'
  },
  {
    id: 'tag-team',
    name: 'TAG TEAM',
    description: 'Vinci un combattimento a squadre.',
    type: 'teamWin',
    target: 1,
    xp: 260,
    credits: 180,
    icon: '⇄'
  },
  {
    id: 'rumble-king',
    name: 'RE DEL RUMBLE',
    description: 'Vinci un Royal Rumble.',
    type: 'rumbleWin',
    target: 1,
    xp: 400,
    credits: 280,
    icon: '♛'
  },
  {
    id: 'veteran',
    name: 'VETERANO',
    description: 'Vinci 10 combattimenti.',
    type: 'wins',
    target: 10,
    xp: 600,
    credits: 400,
    icon: '✦'
  }
];

export const MISSION_BY_ID: Record<string, MissionDefinition> = Object.fromEntries(
  MISSIONS.map((mission) => [mission.id, mission])
);
