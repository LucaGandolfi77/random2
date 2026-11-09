export interface FinalChoiceDef {
  id: 'warn' | 'barricade' | 'run' | 'confront' | 'accept';
  title: string;
  description: string;
  risk: string;
  requiresFlag?: string;
  requiresClues?: number;
  effects: {
    minutes: number;
    threat: number;
    shield: number;
    flags: string[];
    barricadeAll?: boolean;
  };
}

export const finalChoices: FinalChoiceDef[] = [
  {
    id: 'warn',
    title: 'Call everyone. Warn them from the porch.',
    description:
      'Spend the last half hour doing what you have done all night: calling names, keeping voices on the line, making the street answer to a chorus of people who remember you.',
    risk: 'Requires the people you call to still trust you.',
    effects: {
      minutes: 5,
      threat: -18,
      shield: 90,
      flags: ['final_warned']
    }
  },
  {
    id: 'barricade',
    title: 'Get inside. Lock the door. Wait for dawn.',
    description:
      'Cross the porch, throw every bolt, and make the house small enough to defend. No more street. No more chances for the wrong voice to get in.',
    risk: 'You will face the last minutes with only your own voice.',
    effects: {
      minutes: 8,
      threat: -12,
      shield: 70,
      flags: ['final_barricade'],
      barricadeAll: true
    }
  },
  {
    id: 'run',
    title: 'Turn around and run.',
    description:
      'Leave the porch, the warm window, and the phone behind. The road is only a road if you believe in it. You are not sure you believe in anything anymore.',
    risk: 'The street may not let you reach the next corner.',
    effects: {
      minutes: 20,
      threat: 14,
      shield: 20,
      flags: ['final_ran']
    }
  },
  {
    id: 'confront',
    title: 'Follow the old line into the house.',
    description:
      'Take the flashlight and the names you have gathered. Find where the old line leaves the road and enters the foundation. Cut it. See what is waiting at the other end.',
    risk: 'Requires enough of the truth to survive what answers.',
    requiresClues: 4,
    effects: {
      minutes: 10,
      threat: -8,
      shield: 55,
      flags: ['final_confront']
    }
  },
  {
    id: 'accept',
    title: 'Accept the last call.',
    description:
      'Let the thing that has followed you all night hear the name underneath your name. Give it something to remember besides hunger.',
    risk: 'Only the secret path can survive this.',
    requiresFlag: 'unknown_contact_unlocked',
    effects: {
      minutes: 8,
      threat: -20,
      shield: 95,
      flags: ['final_accept']
    }
  }
];

export const finalChoiceById = Object.fromEntries(finalChoices.map((choice) => [choice.id, choice]));
