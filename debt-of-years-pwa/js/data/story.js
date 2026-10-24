export const OPENING = [
  { who: 'narrator', text: 'Little Ember bought its lamps with borrowed years. The lamps are still lit.' },
  { who: 'sable', text: 'You are the year-keeper now. The contract was signed before you were born. Someone has to turn other people\'s days into something useful.' },
  { who: 'collector', text: 'Six years by the fifth night. I do not enjoy this. I am simply the arithmetic.' },
  { who: 'narrator', text: 'You are Wren. You have forty years of your own. Everyone else has fewer than they think.' },
  { who: 'sable', text: 'Magic takes years. Not from the air. From the ledger. You will choose whose.' },
  { who: 'narrator', text: 'Talk to the village. Walk the road. When the gate opens, someone pays.' }
];

export const NGPLUS_OPENING = [
  { who: 'narrator', text: 'The ledger remembers you. It has been waiting for the page to turn.' },
  { who: 'sable', text: 'You came back. The village is smaller, or you are.' },
  { who: 'collector', text: 'The arithmetic has been adjusted. Four more years each season. A courtesy.' },
  { who: 'narrator', text: 'You are Wren again. You know how this ends. That is the problem.' },
  { who: 'sable', text: 'Some doors stay open. You carried one with you.' },
  { who: 'narrator', text: 'Walk the village. The gate is still open.' }
];

export const VILLAGER_TALK = {
  maren: {
    intro: [
      { who: 'maren', text: 'I am sixty-two and I have four years left. The clerk showed me the arithmetic. He was very kind about it.' },
      { who: 'maren', text: 'I signed because my granddaughter needed medicine. She is nine now. She has a name like a bell.' },
      { who: 'maren', text: 'Take mine when you must. I only ask to see one more spring.' },
      { who: 'you', text: 'It may be more than one year.' },
      { who: 'maren', text: 'Then I will plant fewer bulbs.' }
    ],
    repeat: [
      { who: 'maren', text: 'The bread is smaller this week. The oven does not know why. I do.' }
    ],
    drawn: (s, v) => [
      { who: 'maren', text: `You have taken ${v.drawn} from me. My knees know before I do.` }
    ],
    low: (s, v) => [
      { who: 'maren', text: `I have ${v.years} year${v.years === 1 ? '' : 's'} left. Do not spend it on a fight you could walk away from.` }
    ]
  },
  ivo: {
    intro: [
      { who: 'ivo', text: 'Fifty years. The clerk called it a fortune. I thought that meant I was rich.' },
      { who: 'ivo', text: 'I am saving them. For a boat. For a wife, maybe. For a life.' },
      { who: 'you', text: 'Ivo. Those years are already spent. The city is spending them now.' },
      { who: 'ivo', text: 'That is not how fortunes work.' },
      { who: 'narrator', text: 'He laughs. You do not.' }
    ],
    repeat: [
      { who: 'ivo', text: 'When I get my fifty years back, I am buying a boat. A green one. And a dog.' }
    ],
    drawn: (s, v) => [
      { who: 'ivo', text: `You took ${v.drawn} of my years. The boat is smaller now. I have not decided what it looks like.` }
    ],
    low: (s, v) => [
      { who: 'ivo', text: `I have ${v.years} left. The boat is very small now. It fits in my hand.` }
    ]
  },
  wick: {
    intro: [
      { who: 'wick', text: 'Eighty. The well is older. Take the year. Keep the water clean.' },
      { who: 'wick', text: 'I have buried three keepers and one village. I am not afraid of arithmetic.' },
      { who: 'you', text: 'A year is all you have.' },
      { who: 'wick', text: 'Then it is all I have to give.' }
    ],
    repeat: [
      { who: 'wick', text: 'The water is still clean. That is the whole of my theology.' }
    ],
    drawn: (s, v) => [
      { who: 'wick', text: `One year in the ledger and my hands are cold. The well is warmer than I am.` }
    ],
    low: (s, v) => [
      { who: 'wick', text: 'Do not weep for the last year. Weep for the ones who never counted theirs.' }
    ]
  },
  sable: {
    intro: [
      { who: 'sable', text: 'Do not look at me like that. I only write what the city tells me to write.' },
      { who: 'sable', text: 'I was born here. I left. I came back with a stamp.' },
      { who: 'sable', text: 'There are ways to make the quota lighter. None of them are clean.' }
    ],
    repeat: [
      { who: 'sable', text: 'The ledger does not care who is kind. It only cares who pays.' }
    ],
    drawn: (s, v) => [
      { who: 'sable', text: `I watched you take ${v.drawn} from me. You did not even open the page. It was already marked.` }
    ],
    low: (s, v) => [
      { who: 'sable', text: 'I have enough left to finish the books. That is all I asked for.' }
    ]
  },
  mayor: {
    intro: [
      { who: 'mayor', text: 'Prosperity has a price. I signed so the children would have lamps.' },
      { who: 'mayor', text: 'You would have signed too. That is the part no one says aloud.' },
      { who: 'mayor', text: 'The city paid me in years. I have two left of my own and forty in a drawer.' },
      { who: 'you', text: 'Then pay from the drawer.' },
      { who: 'mayor', text: 'The drawer is not pledged. That is the difference between us and them.' }
    ],
    repeat: [
      { who: 'mayor', text: 'The lamps are brighter than the chapel. That is what progress looks like.' }
    ],
    drawn: (s, v) => [
      { who: 'mayor', text: `You took ${v.drawn} years from a man with two. The drawer stays shut. It is a very good drawer.` }
    ],
    low: (s, v) => [
      { who: 'mayor', text: `I have ${v.years} left. The drawer has forty. We are both still here.` }
    ]
  },
  nessa: {
    intro: [
      { who: 'nessa', text: 'The chapel keeps no ledger. That is its only miracle.' },
      { who: 'nessa', text: 'I have counted every funeral in this village for twenty years. I know what the city is doing.' },
      { who: 'nessa', text: 'Bring them to me when they fall. I will remember them even if the town does not.' }
    ],
    repeat: [
      { who: 'nessa', text: 'A name spoken is a year returned.' }
    ],
    drawn: (s, v) => [
      { who: 'nessa', text: `You took ${v.drawn} years from me. I will not put it in the sermon. The chapel keeps no ledger.` }
    ],
    low: (s, v) => [
      { who: 'nessa', text: `I have ${v.years} left. Enough for one more winter of funerals. Perhaps two.` }
    ]
  },
  tomas: {
    intro: [
      { who: 'tomas', text: 'Gate\'s closed after dark. Not that it matters. Nothing out there is poorer than us.' },
      { who: 'tomas', text: 'I have twelve years, the clerk said. I guard a gate that sold me.' },
      { who: 'you', text: 'You know?' },
      { who: 'tomas', text: 'I know the way a man knows rain. Without being told.' }
    ],
    repeat: [
      { who: 'tomas', text: 'If the collector comes through, I will open the gate. That is my job. That is the whole of it.' }
    ],
    drawn: (s, v) => [
      { who: 'tomas', text: `You took ${v.drawn} years. I felt the gate get heavier. That is not a thing that should be possible.` }
    ],
    low: (s, v) => [
      { who: 'tomas', text: `I have ${v.years} left on the wall. I would like to spend one of them sitting down.` }
    ]
  },
  lira: {
    intro: [
      { who: 'lira', text: 'I sew shrouds now. It is steady work.' },
      { who: 'lira', text: 'Eight years, they tell me. Enough for eight more shrouds, if I am careful.' },
      { who: 'lira', text: 'I will not give them. Not one. Let the lamps go dark.' },
      { who: 'you', text: 'And if the quota goes unpaid?' },
      { who: 'lira', text: 'Then we will be poor and alive. I have been poor before. I have not been dead.' }
    ],
    repeat: [
      { who: 'lira', text: 'The city calls it debt. I call it a dress with no body in it.' }
    ],
    drawn: (s, v) => [
      { who: 'lira', text: `You took ${v.drawn} years from a woman who told you no. I will remember that. Someone should.` }
    ],
    low: (s, v) => [
      { who: 'lira', text: `I have ${v.years} left. The needle is still warm. Do not mistake that for permission.` }
    ]
  },
  nel: {
    intro: [
      { who: 'nel', text: 'The grown-ups say I am worth sixty years. Is that a lot? It sounds like a lot.' },
      { who: 'nel', text: 'I found a ribbon in the road. It is the color of the lamps.' },
      { who: 'narrator', text: 'You do not open the ledger for her. Some pages you leave shut.' },
      { who: 'nel', text: 'Will you stay for supper? Maren is making bread.' }
    ],
    repeat: [
      { who: 'nel', text: 'I tied the ribbon on the well. Make a wish. It only works if you mean it.' }
    ],
    drawn: () => [
      { who: 'nel', text: 'You did not take anything from me. I would have felt it. I am glad.' }
    ],
    low: () => [
      { who: 'nel', text: 'You look tired. I have sixty years. You can borrow one, if you want. I would not tell.' }
    ]
  },
  perrin: {
    intro: [
      { who: 'perrin', text: 'I am Perrin Ash. Nel\'s father. I have been away buying a boat that never arrived.' },
      { who: 'perrin', text: 'Twenty years for passage. The city took them at the dock and gave me a receipt.' },
      { who: 'perrin', text: 'She has sixty. The city will find her eventually. I would rather be the one who takes her somewhere else.' }
    ],
    repeat: [
      { who: 'perrin', text: 'The river is the only road the city has not paved.' }
    ],
    drawn: (s, v) => [
      { who: 'perrin', text: `You took ${v.drawn} years from me. The boat is still not here. Nel is still here. That is something.` }
    ],
    low: (s, v) => [
      { who: 'perrin', text: `I have ${v.years} left. Enough to row. Not enough to argue.` }
    ]
  },
  joss: {
    intro: [
      { who: 'joss', text: 'Joss Vey. Sable\'s brother. The one she does not mention.' },
      { who: 'joss', text: 'The ferry runs at night. The city thinks the river is a boundary. It is a door.' },
      { who: 'joss', text: 'I can take eight people across. The boat does not care who is on the ledger.' }
    ],
    repeat: [
      { who: 'joss', text: 'The river is high. The city is not looking.' }
    ],
    drawn: (s, v) => [
      { who: 'joss', text: `You took ${v.drawn} years from me. The ferry still floats. I do not know how.` }
    ],
    low: (s, v) => [
      { who: 'joss', text: `I have ${v.years} left. The river does not charge interest.` }
    ]
  },
  ottil: {
    intro: [
      { who: 'ottil', text: 'I keep the Charter House. It is mostly dust and the first page.' },
      { who: 'ottil', text: 'The city taught us that debt is a law of nature. It is not. It is handwriting.' },
      { who: 'ottil', text: 'I can show you the original contract. I cannot promise you will like the terms.' }
    ],
    repeat: [
      { who: 'ottil', text: 'Paper is patient. The city is not.' }
    ],
    drawn: (s, v) => [
      { who: 'ottil', text: `You took ${v.drawn} years from me. The page is older than both of us. It will outlast the argument.` }
    ],
    low: (s, v) => [
      { who: 'ottil', text: `I have ${v.years} left. Enough to read one more clause.` }
    ]
  },
  orin: {
    intro: [
      { who: 'orin', text: 'I was the year-keeper here before the Collector. Before Iven.' },
      { who: 'orin', text: 'The city does not make collectors. It takes a keeper, gives him a chair, and calls it a promotion.' },
      { who: 'orin', text: 'I have one year left. I have been saving it for a confession.' }
    ],
    repeat: [
      { who: 'orin', text: 'The chair is still empty. It is always empty. That is the trick.' }
    ],
    drawn: (s, v) => [
      { who: 'orin', text: `You took ${v.drawn} from me. I have been dying slowly for eighty years. You are not the first arithmetic.` }
    ],
    low: (s, v) => [
      { who: 'orin', text: 'One year. Enough for one name. Say it when you need it.' }
    ]
  }
};

export const SABLE_OFFER = {
  lines: [
    { who: 'sable', text: 'There are names the city never registered. People who owe nothing because no one wrote them down.' },
    { who: 'sable', text: 'I can add them. The quota would be lighter for everyone you know.' },
    { who: 'sable', text: 'They would not be asked. That is the point of them.' }
  ],
  options: [
    { label: 'Expose her.', value: 'expose' },
    { label: 'Tell her to stop.', value: 'stop' },
    { label: 'Let her write the names.', value: 'quiet' }
  ]
};

export const SABLE_RESULT = {
  expose: [
    { who: 'you', text: 'I will read every name aloud at the gate.' },
    { who: 'sable', text: 'You will regret being honest. Honesty is expensive here.' },
    { who: 'narrator', text: 'The quota grows by two. The village looks at you differently. Some of them look grateful.' }
  ],
  stop: [
    { who: 'you', text: 'Stop. We are not going to save ourselves with people no one will miss.' },
    { who: 'sable', text: 'There is no one no one would miss. That is the only lie the ledger tells.' },
    { who: 'narrator', text: 'She closes the book. The quota stays exactly where it was.' }
  ],
  quiet: [
    { who: 'you', text: 'Write them.' },
    { who: 'sable', text: 'You are learning. That is the sad part.' },
    { who: 'narrator', text: 'At the gate, she adds a page. You do not read it. The number is smaller.' }
  ]
};

export const FUNERAL = {
  lines: [
    { who: 'nessa', text: 'We bury them twice here. Once in the ground, once in the ledger.' },
    { who: 'nessa', text: 'The town has already begun to forget. I can hear it in the way people say "the baker" instead of her name.' },
    { who: 'nessa', text: 'I can read the forgotten names aloud. It is not much. It is what the chapel has.' }
  ],
  options: [
    { label: 'Read the forgotten names.', value: 'name' },
    { label: 'Let them rest.', value: 'rest' }
  ]
};

export const FUNERAL_RESULT = {
  name: [
    { who: 'narrator', text: 'She reads the names from a list she was not supposed to keep. The town remembers, a little.' }
  ],
  rest: [
    { who: 'narrator', text: 'She folds the list and puts it in her sleeve. The bells ring once. The paper does not make a sound.' }
  ]
};

export const AUDIT = {
  lines: [
    { who: 'crane', text: 'I am Auditor Crane. The city requires an audit of its mercy.' },
    { who: 'crane', text: 'Sixteen years were paid. Twelve names were not. The margins are very full.' },
    { who: 'sable', text: 'The margins are not part of the ledger.' },
    { who: 'crane', text: 'Everything written is part of the ledger. That is what a margin is for.' }
  ],
  options: [
    { label: 'Give Sable to the auditor.', value: 'scapegoat' },
    { label: 'Hide the pages.', value: 'defy' },
    { label: 'Confess that you allowed it.', value: 'confess' }
  ]
};

export const AUDIT_RESULT = {
  scapegoat: [
    { who: 'you', text: 'The margins are hers. I only signed the quota.' },
    { who: 'sable', text: 'Of course. The clerk always keeps the knife.' },
    { who: 'narrator', text: 'Crane takes Sable\'s book. The quota falls by two years. The village calls it justice because it is cheaper.' }
  ],
  defy: [
    { who: 'you', text: 'There are no margins. There is only the page you were given.' },
    { who: 'crane', text: 'Then the city will inspect every page again. It will charge for the reading.' },
    { who: 'narrator', text: 'The quota rises by two. Sable looks at you as if you have finally learned her language.' }
  ],
  confess: [
    { who: 'you', text: 'I knew. I let her write them. The arithmetic was mine too.' },
    { who: 'crane', text: 'Honesty is expensive. The city will make an example of the village.' },
    { who: 'narrator', text: 'The quota rises by four. Around the square, people stand a little straighter. No one thanks you aloud.' }
  ]
};

export const PERRIN_CLAIM = {
  lines: [
    { who: 'perrin', text: 'I sold twenty years for passage. I have been paying for the same boat ever since.' },
    { who: 'perrin', text: 'Nel has sixty. The city will take them anyway. Let me take her somewhere they count differently.' },
    { who: 'nel', text: 'Papa says the city has a river that goes both ways.' }
  ],
  options: [
    { label: 'Let Perrin take Nel.', value: 'leave' },
    { label: 'Hide Nel in the chapel.', value: 'hide' },
    { label: 'Pay Perrin\'s debt with five of your years.', value: 'pay' }
  ]
};

export const PERRIN_RESULT = {
  leave: [
    { who: 'you', text: 'Take her. Do not come back for the ledger.' },
    { who: 'perrin', text: 'I have never come back for anything.' },
    { who: 'narrator', text: 'They leave before dawn. Nel ties her ribbon to the gate. The village is smaller by one name that no one will collect.' }
  ],
  hide: [
    { who: 'you', text: 'She stays. The chapel keeps no ledger.' },
    { who: 'perrin', text: 'Then I hope the chapel can feed her.' },
    { who: 'narrator', text: 'Perrin goes back to the dock. Nel stays in the chapel after dark. The city sends no one. Yet.' }
  ],
  pay: [
    { who: 'you', text: 'Five years. Take them from me and leave her.' },
    { who: 'perrin', text: 'You are buying a debt with a debt. The city would be proud.' },
    { who: 'narrator', text: 'He takes the years. His boat stays at the dock. Nel stays home. Nothing is settled, but no one leaves.' }
  ]
};

export const CHARTER = {
  lines: [
    { who: 'ottil', text: 'The first page is older than the gate. It says the village is not the debtor. The village is the collateral.' },
    { who: 'ottil', text: 'A contract can be burned. But the magic is in the paper. Burn it and the lamps go out.' },
    { who: 'you', text: 'And the years?' },
    { who: 'ottil', text: 'They come back. All of them. The city will not forgive that.' }
  ],
  options: [
    { label: 'Take the first page.', value: 'take' },
    { label: 'Ask Ottil to keep it safe.', value: 'keep' }
  ]
};

export const CHARTER_RESULT = {
  take: [
    { who: 'you', text: 'I will carry it. If it burns, it burns at the gate.' },
    { who: 'ottil', text: 'Then the city will know it is missing by morning.' },
    { who: 'narrator', text: 'The page is warm in your coat. The quota grows by two while the city searches.' }
  ],
  keep: [
    { who: 'you', text: 'Keep it. I only need to know it exists.' },
    { who: 'ottil', text: 'Knowledge is a poor weapon. But it is lighter than a sword.' },
    { who: 'narrator', text: 'She hides the page inside a hymnal. The city does not search the chapel. Not yet.' }
  ]
};

export const ORIN = {
  lines: [
    { who: 'orin', text: 'I was the year-keeper here before the Collector. Before Iven.' },
    { who: 'orin', text: 'The city does not make collectors. It takes a keeper, gives him a chair, and calls it a promotion.' },
    { who: 'orin', text: 'Iven Ash took the chair to save his son. The son grew up, had a daughter, and the city came back for her.' },
    { who: 'you', text: 'Nel.' },
    { who: 'orin', text: 'Nel. The Collector is her grandfather. He has been counting toward her his whole long life.' }
  ],
  options: [
    { label: 'Ask Orin to testify at the gate.', value: 'testify' },
    { label: 'Give Orin the death he has been saving.', value: 'rest' },
    { label: 'Say nothing. Let him sleep.', value: 'silence' }
  ]
};

export const ORIN_RESULT = {
  testify: [
    { who: 'orin', text: 'I will say his name. I will say mine. Let the village hear what a chair costs.' },
    { who: 'narrator', text: 'He writes a statement in a hand that has not held a pen in years. It is enough to make the Collector look away.' }
  ],
  rest: [
    { who: 'you', text: 'You have paid enough. Rest.' },
    { who: 'orin', text: 'One year. Spend it on the living.' },
    { who: 'narrator', text: 'He closes his eyes. The chapel bell rings once, though no one pulls it.' }
  ],
  silence: [
    { who: 'narrator', text: 'You let him sleep. Some confessions are heavier when they are carried by two people.' }
  ]
};

export const FERRY = {
  lines: [
    { who: 'joss', text: 'Sable writes names. I move people. One of us was always going to be the useful one.' },
    { who: 'joss', text: 'The ferry holds eight. The city does not know the river is on our side.' },
    { who: 'joss', text: 'It costs eight years. Not mine. I already spent mine on the boat.' }
  ],
  options: [
    { label: 'Pay eight of your years.', value: 'pay' },
    { label: 'Promise the village\'s future.', value: 'promise' },
    { label: 'Refuse. The river is not an answer.', value: 'refuse' }
  ]
};

export const FERRY_RESULT = {
  pay: [
    { who: 'you', text: 'Eight years. Keep the boat ready.' },
    { who: 'joss', text: 'You are lighter than you were. The river will not notice.' },
    { who: 'narrator', text: 'The ferry waits under the dock. Eight seats. No questions. The city does not count the river.' }
  ],
  promise: [
    { who: 'you', text: 'I cannot pay you now. I can promise you the village will remember.' },
    { who: 'joss', text: 'The village remembers everything. That is the problem.' },
    { who: 'narrator', text: 'He spits in his palm and holds out his hand. The ferry waits. The debt waits with it.' }
  ],
  refuse: [
    { who: 'you', text: 'We do not run. If we run, the city wins the arithmetic.' },
    { who: 'joss', text: 'The city wins either way. At least the river is honest.' },
    { who: 'narrator', text: 'He unties the boat and lets it drift. The dock feels emptier than before.' }
  ]
};

export const NOMINATION = {
  lines: [
    { who: 'sable', text: 'The council has voted. They want to send Nel. Sixty years would cover the renewal twice.' },
    { who: 'perrin', text: 'She is nine. I did not sell her.' },
    { who: 'nessa', text: 'The chapel will not write her name.' },
    { who: 'narrator', text: 'The village waits. The Collector waits. The arithmetic waits.' }
  ],
  options: [
    { label: 'Protect Nel. The village can pay another way.', value: 'protect' },
    { label: 'Offer yourself to the renewal.', value: 'self' },
    { label: 'Let the council decide.', value: 'council' }
  ]
};

export const NOMINATION_RESULT = {
  protect: [
    { who: 'you', text: 'Nel stays. Put her name back in the margin where it belongs.' },
    { who: 'sable', text: 'The city will not like it.' },
    { who: 'you', text: 'The city can learn.' },
    { who: 'narrator', text: 'The council folds the nomination. Nel goes home. The village looks at you as if you have broken a law it was just beginning to love.' }
  ],
  self: [
    { who: 'you', text: 'Take my name instead. I am the keeper. The ledger is mine to balance.' },
    { who: 'nessa', text: 'You do not have to do this.' },
    { who: 'you', text: 'I know. That is why it counts.' },
    { who: 'narrator', text: 'The council writes your name. The Collector does not look surprised. That is the worst part.' }
  ],
  council: [
    { who: 'narrator', text: 'You say nothing. The council takes that as permission.' },
    { who: 'sable', text: 'Nel Ash. Sixty years. The renewal is covered.' },
    { who: 'perrin', text: 'No. No, no, no.' },
    { who: 'narrator', text: 'They take her before the lamps are lit. The ribbon stays on the gate. No one removes it.' }
  ]
};

export const FERRY_FINAL = [
  { who: 'joss', text: 'The boat is ready. Eight seats. The city can count what is left.' },
  { who: 'narrator', text: 'You take the ones who will come. The ones who will not stand on the dock and watch the lamps until the river bends.' },
  { who: 'narrator', text: 'The village goes dark behind you. No one on the ferry looks back for long.' }
];

export const SECOND_CHAIR_FINAL = [
  { who: 'collector', text: 'The chair is warm. It has been waiting for someone who knows what it costs.' },
  { who: 'you', text: 'The village keeps its years. I keep the ledger.' },
  { who: 'narrator', text: 'You sit. The brass case settles into your hands like it was measured for them. Iven Ash walks out through the gate, an old man with nowhere to be.' }
];

export const RENEWAL_FINAL = [
  { who: 'collector', text: 'The city is pleased. The village will have light for another generation.' },
  { who: 'you', text: 'And the ledger?' },
  { who: 'collector', text: 'The ledger always needs a keeper. You have been very good at the arithmetic.' },
  { who: 'narrator', text: 'You sign the renewal. The ink is warm. Somewhere behind you, a child is learning to count.' }
];

export const PARLEY = {
  lines: [
    { who: 'crane', text: 'The city has authorized me to negotiate. That is what it calls an audit with a chair.' },
    { who: 'crane', text: 'You have a village, a ledger, and a river. The city would like two of them.' },
    { who: 'nessa', text: 'And if we refuse?' },
    { who: 'crane', text: 'Then the city will send someone less polite.' }
  ],
  options: [
    { label: 'Publish the audit at the gate.', value: 'public' },
    { label: 'Trade the ledger for a lighter quota.', value: 'ledger' },
    { label: 'Send Crane back to the city.', value: 'refuse' }
  ]
};

export const PARLEY_RESULT = {
  public: [
    { who: 'you', text: 'Every name in the ledger gets read at the gate. Every year. Every payer.' },
    { who: 'crane', text: 'That is not a negotiation. That is a confession with witnesses.' },
    { who: 'narrator', text: 'Crane leaves the writ on the table. By morning, copies of the audit are nailed to every door in the village.' }
  ],
  ledger: [
    { who: 'you', text: 'Take the ledger. Leave the village six more years.' },
    { who: 'crane', text: 'The city accepts. It will keep the ledger somewhere very dry.' },
    { who: 'narrator', text: 'The quota falls. The page leaves your hands. You feel lighter and less honest.' }
  ],
  refuse: [
    { who: 'you', text: 'No. The village will not negotiate with a bill collector.' },
    { who: 'crane', text: 'Then we will do this the expensive way.' },
    { who: 'narrator', text: 'He folds the writ. The gate seems smaller after he leaves.' }
  ]
};

export const PARLEY_FINAL = [
  { who: 'narrator', text: 'The audit is read aloud at the gate. Crane does not stop it. The Collector does not stop it.' },
  { who: 'narrator', text: 'The city sends soldiers, then lawyers, then nothing. A ledger cannot be unread once it is public.' },
  { who: 'narrator', text: 'The village keeps its years. The city keeps its distance. You keep every name.' }
];

export const FINAL_GATE = {
  lines: [
    { who: 'collector', text: 'Twenty-eight years, and the contract is fulfilled. The city offers renewal.' },
    { who: 'collector', text: 'I was Iven Ash once. I took this chair so my son could eat. Now the city wants my granddaughter.' },
    { who: 'collector', text: 'There are other doors. The charter. The ferry. My chair. I do not recommend any of them.' },
    { who: 'narrator', text: 'Behind him, the Charter House is open. The river is loud. The second chair is empty.' },
    { who: 'narrator', text: 'The Collector looks at you as if he has read this page before.' }
  ],
  options: []
};

export const BOSS_WIN = [
  { who: 'collector', text: 'He sits down on the step. The brass case is still open. He does not reach for it.' },
  { who: 'collector', text: 'You have broken the arithmetic. It will not hold. But it is broken tonight.' },
  { who: 'narrator', text: 'The carriage leaves without him. He stays. For the first time, he is not counting.' }
];

export const AUDITOR_WIN = [
  { who: 'crane', text: 'He drops the measuring chain. It coils on the stones like a dead snake.' },
  { who: 'crane', text: 'You cannot audit a village that refuses to be a number.' },
  { who: 'narrator', text: 'The city\'s ledger is open on the ground. Every name in it is still legible. For now.' }
];

export const CONTRACT_WIN = [
  { who: 'narrator', text: 'The first page burns. Not like paper. Like a winter that has been waiting to end.' },
  { who: 'collector', text: 'You have taken the magic out of the world. The lamps will go out.' },
  { who: 'you', text: 'Then we will learn to light them.' },
  { who: 'narrator', text: 'The brass case cools. Somewhere in the village, someone takes a breath they did not know they had saved.' }
];

export const FINALE_WIN = {
  collector: BOSS_WIN,
  auditor: AUDITOR_WIN,
  contract: CONTRACT_WIN
};

export const DEFAULT_LINE = [
  { who: 'narrator', text: 'You close the gate. The collector waits, then writes something small in the corner of the page.' },
  { who: 'collector', text: 'Understood. The city will send no one. You will have to live here.' }
];
