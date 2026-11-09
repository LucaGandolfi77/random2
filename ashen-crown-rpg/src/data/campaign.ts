export const introSlides = [
  {
    kicker: 'ELARION · THE NINTH AGE',
    title: 'The Covenant Is Breaking',
    text: 'For a thousand years, the Nine Shapers have held every soul in Elarion to a single promise: the world will keep its shape. Lately, the promise has begun to stutter. Cities vanish from maps. The dead speak in dreams. People wake with memories that belong to strangers.'
  },
  {
    kicker: 'THE ASHEN MARCHES',
    title: 'A Road That Forgets',
    text: 'You came to the Fallen Bastion chasing a rumour: a relic called the Ashen Crown, and a war that never ended. What you found was a ruin full of ash, a gate that would not open, and a man who had been waiting longer than he cared to admit.'
  },
  {
    kicker: 'THE NIGHT OF THE MARK',
    title: 'You Died. Briefly.',
    text: 'Something came out of the dark. It had no face, only a voice like a page turning. It put its hand where your heart should be and said: “You are not in the book.” When you woke, the ruin was quieter, Kaelen was watching you, and a mark had appeared on your soul.'
  },
  {
    kicker: 'GREYMOOR VALE',
    title: 'Two Shadows Over One Village',
    text: 'The Covenant calls the mark a crime. The Ashen Choir calls it a blessing. The Rootbound say the woods remember a time before either. Somewhere beneath it all, the Crown is waking — and every faction in Elarion wants to be holding it when it opens its eyes.'
  },
  {
    kicker: 'CHAPTER ONE',
    title: 'The Crown of Cinders',
    text: 'Your choices will decide who rules Greymoor, which truths survive, who stands beside you, and what shape the world takes when the Covenant finally breaks. Choose carefully. The Crown remembers everything — even the things you would rather forget.'
  }
];

export interface EndingDef {
  id: string;
  title: string;
  subtitle: string;
  text: string;
  epilogue: string;
  color: string;
}

export const endings: EndingDef[] = [
  {
    id: 'reforge',
    title: 'The Shape of Mercy',
    subtitle: 'The Covenant is reforged.',
    text: 'You give the Crown your memories. It takes them gently, the way a river takes a name written in sand. The mark closes. The world settles back into its old shape, scarred but whole. You wake in Greymoor with no memory of the Bastion, the temple, or the people who followed you into the dark.',
    epilogue: 'Somewhere in the village, a grey knight keeps a room ready for someone who never arrives. The Covenant endures. The erased remain erased. And on quiet nights, you almost remember a voice saying: “You are not in the book.”',
    color: '#c9a96a'
  },
  {
    id: 'shatter',
    title: 'The Unmaking',
    subtitle: 'The Crown is broken.',
    text: 'The Crown breaks like a held breath. Every erased soul returns at once — a flood of names, faces, cities, and griefs pouring back into a world too small to hold them. Magic goes wild. The sky fills with impossible weather. People remember lives they never lived and weep for both.',
    epilogue: 'Elarion survives, but not unchanged. The Covenant is gone. The dead walk among the living until they find their names. The Nine are silent. In the ruins of the Ashen Citadel, a new generation learns that freedom is another word for weather.',
    color: '#b95f55'
  },
  {
    id: 'bear',
    title: 'The Crownbearer',
    subtitle: 'You take the Crown for yourself.',
    text: 'You place the Crown on your head. Its voice fills you: every king, every child, every forgotten age. You hold the world together by becoming the hinge it turns on. The mark blazes once, then settles into a steady glow. You are no longer only yourself.',
    epilogue: 'The Citadel becomes a quiet place. Pilgrims come with questions; you answer only some. Your companions stay as long as they can. One by one, they grow old. You do not. Somewhere beyond the walls, the Covenant begins again — smaller, kinder, still built on a throne.',
    color: '#7f9c9a'
  },
  {
    id: 'unwritten',
    title: 'The Unwritten',
    subtitle: 'You choose a fourth fate.',
    text: 'You speak your true name into the Crown. The name is not a word the Covenant knows. It is not a name the Nine gave you, or one the Choir tried to take. It is yours. The Crown tries to write you into its story and finds no page wide enough. It opens, and for the first time in a thousand years, the story is not about a crown at all.',
    epilogue: 'The erased do not return all at once. They return as choices: a child remembers a mother, a city remembers its streets, a god remembers being mortal. The Covenant does not break and does not mend. It becomes a question. You walk out of the Citadel with your companions and no destiny waiting for you. The road is open. The road is yours.',
    color: '#d4c48f'
  }
];

export const endingById = Object.fromEntries(endings.map((e) => [e.id, e]));
