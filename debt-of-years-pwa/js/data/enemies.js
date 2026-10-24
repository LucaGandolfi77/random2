export const ENEMIES = {
  clerk: {
    id: 'clerk',
    name: 'Hollow Clerk',
    hp: 30,
    min: 6,
    max: 9,
    drain: 0,
    lines: [
      'It reads from a book with no pages.',
      '"Unpaid," it says, and swings.',
      'Its pen scratches a name you cannot see.'
    ]
  },
  hound: {
    id: 'hound',
    name: 'Ledger Hound',
    hp: 26,
    min: 8,
    max: 11,
    drain: 0,
    lines: [
      'It smells the years on you.',
      'It growls in numbers.',
      'It circles the warmest pocket of your coat.'
    ]
  },
  wraith: {
    id: 'wraith',
    name: 'Interest Wraith',
    hp: 40,
    min: 5,
    max: 8,
    drain: 1,
    lines: [
      'It reaches past you, toward the village.',
      'A year peels away somewhere behind you.',
      'It whispers the interest rate like a prayer.'
    ]
  },
  notary: {
    id: 'notary',
    name: 'Hollow Notary',
    hp: 34,
    min: 7,
    max: 10,
    drain: 1,
    lines: [
      'It carries a stamp where its face should be.',
      'Every blow lands with a date attached.',
      'It asks for a signature. It does not wait for one.'
    ]
  },
  yearEater: {
    id: 'yearEater',
    name: 'Year Eater',
    hp: 48,
    min: 9,
    max: 13,
    drain: 2,
    lines: [
      'It has too many mouths and all of them are counting.',
      'A year goes out of the village somewhere behind you.',
      'It chews the interest first.'
    ]
  },
  collector: {
    id: 'collector',
    name: 'The Collector',
    hp: 90,
    min: 10,
    max: 14,
    drain: 0,
    boss: true,
    lines: [
      'He sets down his case.',
      '"I am not your enemy. I am the sum."',
      'He counts under his breath. He is always counting.'
    ]
  },
  auditor: {
    id: 'auditor',
    name: 'Auditor Crane',
    hp: 120,
    min: 11,
    max: 16,
    drain: 1,
    boss: true,
    lines: [
      'He unrolls a measuring chain that is longer than the road.',
      '"The city requires an account of this resistance."',
      'He marks every wound in a column. The column is already full.'
    ]
  },
  contract: {
    id: 'contract',
    name: 'The Contract',
    hp: 150,
    min: 12,
    max: 18,
    drain: 2,
    boss: true,
    lines: [
      'The first page stands up without a hand to hold it.',
      'The writing crawls. Every clause is a mouth.',
      '"You agreed," it says, in the voice of everyone who ever signed.'
    ]
  }
};

export const CHAPTER_ENCOUNTERS = {
  1: [
    {
      id: 'ch1-road-1',
      title: 'The Road, First Night',
      enemies: ['clerk'],
      intro: [
        'A figure waits where the lamps end. It holds a ledger open to your village.',
        'It does not look up. It knows how many of you there are.'
      ]
    },
    {
      id: 'ch1-road-2',
      title: 'The Road, Second Night',
      enemies: ['hound'],
      intro: [
        'Something follows the smell of the bakery.',
        'It has too many teeth for a dog and too few for a debt.'
      ]
    }
  ],
  2: [
    {
      id: 'ch2-road-1',
      title: 'The Road, Hollow Season',
      enemies: ['hound', 'clerk'],
      intro: [
        'Two shapes wait at the milestone. One of them is writing.',
        'The other has already decided how this ends.'
      ]
    },
    {
      id: 'ch2-road-2',
      title: 'The Road, Interest',
      enemies: ['wraith'],
      intro: [
        'The air is cold in the shape of a person.',
        'Behind you, in the village, someone feels a year go out.'
      ]
    },
    {
      id: 'ch2-road-3',
      title: 'The Road, Collection Day',
      enemies: ['clerk', 'hound'],
      intro: [
        'They have brought a smaller ledger for the children.',
        'You do not let them reach the gate.'
      ]
    }
  ],
  3: [
    {
      id: 'ch3-road-1',
      title: 'The Road, Audited',
      enemies: ['notary'],
      intro: [
        'A figure waits where the lamps end. It carries a stamp and a measuring chain.',
        'The road has been reclassified as a debt.'
      ]
    },
    {
      id: 'ch3-road-2',
      title: 'The Road, Hollow Season',
      enemies: ['yearEater', 'hound'],
      intro: [
        'The air is cold in the shape of a mouth.',
        'Behind you, in the village, someone feels a year go out.'
      ]
    },
    {
      id: 'ch3-road-3',
      title: 'The Road, The Auditor\'s Escort',
      enemies: ['notary', 'clerk'],
      intro: [
        'They have brought a smaller ledger for the chapel.',
        'You do not let them reach the gate.'
      ]
    }
  ],
  4: [
    {
      id: 'ch4-road-1',
      title: 'The Road, The Second Chair',
      enemies: ['wraith', 'notary'],
      intro: [
        'A carriage waits at the bend. It has a second chair, empty.',
        'The hollows are only the paperwork.'
      ]
    },
    {
      id: 'ch4-road-2',
      title: 'The Road, Renewal',
      enemies: ['yearEater', 'clerk', 'hound'],
      intro: [
        'The city has sent a preview of the renewal.',
        'It has teeth enough for three names.'
      ]
    },
    {
      id: 'ch4-road-3',
      title: 'The Road, What the Chair Costs',
      enemies: ['wraith', 'yearEater'],
      intro: [
        'The road is bright with borrowed light.',
        'Every step forward is deducted from someone behind you.'
      ]
    }
  ],
  5: [
    {
      id: 'ch5-road-1',
      title: 'The Road, Last Light',
      enemies: ['yearEater', 'notary'],
      intro: [
        'The lamps are so bright the road looks like day.',
        'The hollows are not impressed. They were paid for with the same light.'
      ]
    },
    {
      id: 'ch5-road-2',
      title: 'The Road, The Renewal',
      enemies: ['wraith', 'notary', 'yearEater'],
      intro: [
        'The carriage is closer than it was. The second chair is still empty.',
        'The city has begun to count the chairs as well as the years.'
      ]
    }
  ]
};

export const FINAL_ENCOUNTERS = {
  collector: {
    id: 'collector',
    title: 'The Collector',
    enemies: ['collector'],
    intro: [
      'He does not summon anything. He simply opens the case.',
      '"I was Iven Ash once," he says. "The chair does not care what you were."',
      '"Choose after you are dead, if that helps."'
    ]
  },
  auditor: {
    id: 'auditor',
    title: 'Auditor Crane',
    enemies: ['auditor'],
    intro: [
      'Crane does not draw a weapon. He unrolls the city\'s ledger.',
      '"Every name you have hidden will be audited," he says. "Starting with yours."',
      'The measuring chain tightens around the gate.'
    ]
  },
  contract: {
    id: 'contract',
    title: 'The Contract',
    enemies: ['contract'],
    intro: [
      'The first page rises from the charter like a held breath.',
      'It has no face. It does not need one. It has everyone\'s signature.',
      '"You agreed," it says. "You are still agreeing."'
    ]
  }
};

export const BOSS_ENCOUNTER = FINAL_ENCOUNTERS.collector;
