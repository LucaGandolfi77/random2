export const DURATION = 1200;
export const W = 720;
export const H = 1280;

export type Lang = 'en' | 'it';

export interface Translatable {
  en: string;
  it: string;
}

export type CueKind = 'caption' | 'quote';

export interface Cue {
  id: string;
  start: number;
  end: number;
  text: Translatable;
  kind: CueKind;
  french?: string;
}

export type SceneId =
  | 'prologue'
  | 'digne'
  | 'fantine'
  | 'montreuil'
  | 'cosette'
  | 'paris'
  | 'jardin'
  | 'barricade'
  | 'egout'
  | 'etoile'
  | 'pardon'
  | 'epilogue';

export interface Chapter {
  id: string;
  scene: SceneId;
  roman: string;
  ordinal: number;
  titleFr: string;
  title: Translatable;
  start: number;
  end: number;
  accent: string;
  cues: Cue[];
}

interface ChapterSeed {
  id: string;
  scene: SceneId;
  roman: string;
  ordinal: number;
  titleFr: string;
  title: Translatable;
  start: number;
  end: number;
  accent: string;
}

const seeds: ChapterSeed[] = [
  {
    id: 'prologue',
    scene: 'prologue',
    roman: 'PROLOGUE',
    ordinal: 0,
    titleFr: 'Le Fil d’Or',
    title: { en: 'The Golden Thread', it: 'Il Filo d’Oro' },
    start: 0,
    end: 90,
    accent: '#d9ad5b',
  },
  {
    id: 'digne',
    scene: 'digne',
    roman: 'I',
    ordinal: 1,
    titleFr: 'Le Juste',
    title: { en: 'The Just Man', it: 'L’Uomo Giusto' },
    start: 90,
    end: 210,
    accent: '#d9ad5b',
  },
  {
    id: 'fantine',
    scene: 'fantine',
    roman: 'II',
    ordinal: 2,
    titleFr: 'Fantine',
    title: { en: 'Fantine', it: 'Fantine' },
    start: 210,
    end: 330,
    accent: '#b96a5e',
  },
  {
    id: 'montreuil',
    scene: 'montreuil',
    roman: 'III',
    ordinal: 3,
    titleFr: '24601',
    title: { en: '24601', it: '24601' },
    start: 330,
    end: 440,
    accent: '#d3a354',
  },
  {
    id: 'cosette',
    scene: 'cosette',
    roman: 'IV',
    ordinal: 4,
    titleFr: 'Cosette',
    title: { en: 'Cosette', it: 'Cosette' },
    start: 440,
    end: 540,
    accent: '#e0a653',
  },
  {
    id: 'paris',
    scene: 'paris',
    roman: 'V',
    ordinal: 5,
    titleFr: 'Paris',
    title: { en: 'Paris', it: 'Parigi' },
    start: 540,
    end: 650,
    accent: '#c7824b',
  },
  {
    id: 'jardin',
    scene: 'jardin',
    roman: 'VI',
    ordinal: 6,
    titleFr: 'Le Jardin',
    title: { en: 'The Garden', it: 'Il Giardino' },
    start: 650,
    end: 760,
    accent: '#c08a75',
  },
  {
    id: 'barricade',
    scene: 'barricade',
    roman: 'VII',
    ordinal: 7,
    titleFr: 'La Barricade',
    title: { en: 'The Barricade', it: 'La Barricata' },
    start: 760,
    end: 890,
    accent: '#b3483e',
  },
  {
    id: 'egout',
    scene: 'egout',
    roman: 'VIII',
    ordinal: 8,
    titleFr: 'L’Égout',
    title: { en: 'The Sewer', it: 'La Fogna' },
    start: 890,
    end: 980,
    accent: '#8f9e6b',
  },
  {
    id: 'etoile',
    scene: 'etoile',
    roman: 'IX',
    ordinal: 9,
    titleFr: 'L’Étoile',
    title: { en: 'The Star', it: 'La Stella' },
    start: 980,
    end: 1060,
    accent: '#d8c78e',
  },
  {
    id: 'pardon',
    scene: 'pardon',
    roman: 'X',
    ordinal: 10,
    titleFr: 'Le Pardon',
    title: { en: 'Forgiveness', it: 'Il Perdono' },
    start: 1060,
    end: 1160,
    accent: '#e0b56a',
  },
  {
    id: 'epilogue',
    scene: 'epilogue',
    roman: 'ÉPILOGUE',
    ordinal: 11,
    titleFr: 'La Lumière',
    title: { en: 'The Light', it: 'La Luce' },
    start: 1160,
    end: 1200,
    accent: '#e8c98c',
  },
];

type CueSpec = [
  offset: number,
  duration: number,
  en: string,
  it: string,
  french?: string,
];

interface CueChapterSpec {
  id: string;
  cues: CueSpec[];
  quotes?: CueSpec[];
}

const cueSpecs: CueChapterSpec[] = [
  {
    id: 'prologue',
    cues: [
      [
        9,
        13,
        'In 1815, a convict was released from the galleys of Toulon. His name was Jean Valjean.',
        'Nel 1815, un forzato uscì dai bagni di Tolone. Il suo nome era Jean Valjean.',
      ],
      [
        25,
        14,
        'He carried a yellow passport, and every door in France closed on him.',
        'Portava un passaporto giallo, e ogni porta di Francia gli si chiudeva davanti.',
      ],
      [
        62,
        15,
        'In Digne, one man opened his door. The rest of the story began with a candle.',
        'A Digne, un uomo gli aprì la porta. Il resto della storia cominciò con una candela.',
      ],
    ],
    quotes: [
      [
        42,
        16,
        'As long as ignorance and misery remain on earth, books like this cannot be useless.',
        'Finché sulla terra esisteranno ignoranza e miseria, libri come questo non potranno essere inutili.',
        'Tant qu’il y aura sur la terre ignorance et misère, des livres de la nature de celui-ci ne pourront pas être inutiles.',
      ],
    ],
  },
  {
    id: 'digne',
    cues: [
      [
        8,
        17,
        'Digne, 1815. The bishop of the poor owned almost nothing — except two silver candlesticks.',
        'Digne, 1815. Il vescovo dei poveri possedeva quasi nulla — tranne due candelabri d’argento.',
      ],
      [
        30,
        15,
        'Jean Valjean ate at his table. In the night, he took the silver and ran.',
        'Jean Valjean sedette alla sua tavola. Nella notte prese l’argenteria e fuggì.',
      ],
      [
        50,
        18,
        'The gendarmes brought him back. The bishop said: “You forgot the candlesticks.”',
        'I gendarmi lo riportarono indietro. Il vescovo disse: «Hai dimenticato i candelabri.»',
      ],
      [
        92,
        17,
        'He walked into the dawn a free man. The first thread of gold began to shine.',
        'Camminò verso l’alba da uomo libero. Il primo filo d’oro cominciò a brillare.',
      ],
    ],
    quotes: [
      [
        72,
        16,
        'Jean Valjean, my brother, you no longer belong to evil, but to good.',
        'Jean Valjean, fratello mio, non appartieni più al male, ma al bene.',
        'Jean Valjean, mon frère, vous n’appartenez plus au mal, mais au bien.',
      ],
    ],
  },
  {
    id: 'fantine',
    cues: [
      [
        7,
        17,
        'Paris, 1823. Fantine loved a student who left her with a daughter and a letter.',
        'Parigi, 1823. Fantine amò uno studente che la lasciò con una figlia e una lettera.',
      ],
      [
        28,
        16,
        'At the factory, a foreman counted the women. A child without a father was a sin that cost a wage.',
        'Alla manifattura, un caporeparto contava le donne. Una figlia senza padre era un peccato che costava il salario.',
      ],
      [
        48,
        16,
        'She sold her hair. Then her teeth. Then the locket that held Cosette’s face.',
        'Vendette i capelli. Poi i denti. Poi il medaglione che custodiva il volto di Cosette.',
      ],
      [
        69,
        15,
        'Snow fell on a woman who had been taught that love was a debt.',
        'La neve cadeva su una donna a cui avevano insegnato che l’amore è un debito.',
      ],
      [
        88,
        16,
        'Javert arrested her in the street. The mayor of Montreuil-sur-Mer lifted her from the snow.',
        'Javert la arrestò per strada. Il sindaco di Montreuil-sur-Mer la sollevò dalla neve.',
      ],
      [
        107,
        10,
        'In the hospital, she made him promise: find my Cosette.',
        'In ospedale, gli fece promettere: trova la mia Cosette.',
      ],
    ],
  },
  {
    id: 'montreuil',
    cues: [
      [
        6,
        16,
        'Montreuil-sur-Mer. Convict 24601 had become Monsieur Madeleine: mayor, factory owner, a man with a past.',
        'Montreuil-sur-Mer. Il forzato 24601 era diventato il signor Madeleine: sindaco, industriale, un uomo con un passato.',
      ],
      [
        25,
        15,
        'A cart fell on old Fauchelevent. The mayor lifted it alone, and the crowd saw a strength from another life.',
        'Un carro travolse il vecchio Fauchelevent. Il sindaco lo sollevò da solo, e la folla vide una forza di un’altra vita.',
      ],
      [
        43,
        15,
        'At Arras, a man called Champmathieu was about to go to the galleys in his place.',
        'Ad Arras, un uomo chiamato Champmathieu stava per andare ai lavori forzati al suo posto.',
      ],
      [
        82,
        13,
        'Javert heard the number he had never forgotten: 24601.',
        'Javert udì il numero che non aveva mai dimenticato: 24601.',
      ],
      [
        99,
        10,
        'At Fantine’s bedside, he promised a child he had never met.',
        'Al capezzale di Fantine, promise una bambina che non aveva mai visto.',
      ],
    ],
    quotes: [
      [
        60,
        16,
        'I am Jean Valjean.',
        'Sono Jean Valjean.',
        'Je suis Jean Valjean.',
      ],
    ],
  },
  {
    id: 'cosette',
    cues: [
      [
        6,
        17,
        'Montfermeil, Christmas 1823. At the Thénardier inn, Cosette was eight years old and carried water twice her size.',
        'Montfermeil, Natale 1823. Alla locanda Thénardier, Cosette aveva otto anni e portava secchi d’acqua più grandi di lei.',
      ],
      [
        27,
        16,
        'On Christmas Eve she was sent into the forest alone, with a bucket and a lantern.',
        'La vigilia di Natale fu mandata da sola nel bosco, con un secchio e una lanterna.',
      ],
      [
        47,
        15,
        'A stranger took the bucket from her hand. He had promised her mother.',
        'Uno sconosciuto le tolse il secchio di mano. Aveva promesso a sua madre.',
      ],
      [
        65,
        14,
        'In the village, he bought the doll in the window — the most beautiful thing Cosette had ever seen.',
        'In paese comprò la bambola in vetrina — la cosa più bella che Cosette avesse mai visto.',
      ],
      [
        82,
        16,
        'Thénardier sold her for fifteen hundred francs, and smiled as if he had done a kindness.',
        'Thénardier la vendette per millecinquecento franchi, e sorrise come se avesse fatto un favore.',
      ],
    ],
  },
  {
    id: 'paris',
    cues: [
      [
        6,
        15,
        'Paris, 1832. A city of gaslight, stone, and hunger.',
        'Parigi, 1832. Una città di luce a gas, pietra e fame.',
      ],
      [
        25,
        16,
        'In the Gorbeau house, Thénardier’s gang waited in the dark. Valjean walked into the trap.',
        'Nella casa Gorbeau, la banda di Thénardier aspettava nel buio. Valjean cadde nella trappola.',
      ],
      [
        45,
        15,
        'He escaped by the roofs, with a rope and the night on his side.',
        'Fuggì sui tetti, con una corda e la notte dalla sua parte.',
      ],
      [
        63,
        16,
        'In the streets, a boy named Gavroche ruled the gutters. In the cafés, students spoke of a republic.',
        'Nelle strade, un ragazzo di nome Gavroche regnava sulle grondaie. Nei caffè, gli studenti parlavano di repubblica.',
      ],
      [
        83,
        15,
        'In the Luxembourg garden, Marius saw Cosette. The thread pulled tight.',
        'Nel giardino del Lussemburgo, Marius vide Cosette. Il filo si tese.',
      ],
      [
        101,
        9,
        'The funeral of General Lamarque became a river of flags. Paris was about to rise.',
        'I funerali del generale Lamarque divennero un fiume di bandiere. Parigi stava per insorgere.',
      ],
    ],
  },
  {
    id: 'jardin',
    cues: [
      [
        7,
        16,
        'Rue Plumet. Behind an iron gate, Cosette had grown into a young woman with a garden for a heart.',
        'Rue Plumet. Dietro un cancello di ferro, Cosette era diventata una giovane donna con un giardino al posto del cuore.',
      ],
      [
        27,
        16,
        'Marius came every evening. They spoke through the bars, as if love were a prisoner too.',
        'Marius veniva ogni sera. Parlavano attraverso le sbarre, come se anche l’amore fosse prigioniero.',
      ],
      [
        47,
        12,
        'Their hands met. One golden thread, two lives.',
        'Le loro mani si incontrarono. Un filo d’oro, due vite.',
      ],
      [
        63,
        15,
        'Eponine watched from the rain. She had loved Marius before the world gave him to anyone else.',
        'Eponine guardava dalla pioggia. Aveva amato Marius prima che il mondo lo desse a qualcun’altra.',
      ],
      [
        82,
        14,
        'Valjean saw them. Fear closed his hand around the gate.',
        'Valjean li vide. La paura gli chiuse la mano attorno al cancello.',
      ],
      [
        99,
        10,
        'He would take Cosette to England. Marius would go to the barricade.',
        'Avrebbe portato Cosette in Inghilterra. Marius sarebbe andato alla barricata.',
      ],
    ],
  },
  {
    id: 'barricade',
    cues: [
      [
        6,
        16,
        '5 June 1832. The students built a wall of carts, barrels and cobblestones.',
        '5 giugno 1832. Gli studenti costruirono un muro di carri, botti e sanpietrini.',
      ],
      [
        25,
        14,
        'Enjolras raised the red flag. This was the barricade of the people.',
        'Enjolras alzò la bandiera rossa. Era la barricata del popolo.',
      ],
      [
        43,
        16,
        'The National Guard came with cannon and rain. The street became a storm of smoke and light.',
        'La Guardia Nazionale arrivò con cannoni e pioggia. La strada divenne una tempesta di fumo e luce.',
      ],
      [
        63,
        15,
        'Eponine stepped in front of a bullet meant for Marius, and died with his name on her lips.',
        'Eponine si mise davanti a un proiettile destinato a Marius, e morì con il suo nome sulle labbra.',
      ],
      [
        82,
        16,
        'Gavroche went over the wall to gather cartridges, singing as he went. He did not come back.',
        'Gavroche scavalcò il muro per raccogliere cartucce, cantando. Non tornò.',
      ],
      [
        101,
        16,
        'Valjean found Javert tied to a post. He cut the rope and let the law go.',
        'Valjean trovò Javert legato a un palo. Tagliò la corda e lasciò andare la legge.',
      ],
      [
        120,
        8,
        'At dawn, the barricade fell. Valjean carried Marius into the dark.',
        'All’alba, la barricata cadde. Valjean portò Marius nel buio.',
      ],
    ],
  },
  {
    id: 'egout',
    cues: [
      [
        6,
        14,
        'The sewers of Paris. A river of shadow under the city.',
        'Le fogne di Parigi. Un fiume d’ombra sotto la città.',
      ],
      [
        25,
        13,
        'Valjean carried Marius on his back, one step at a time, toward the light.',
        'Valjean portava Marius sulle spalle, un passo alla volta, verso la luce.',
      ],
      [
        43,
        11,
        'In the black water, Thénardier stole from the wounded man and slipped away.',
        'Nell’acqua nera, Thénardier derubò il ferito e svanì.',
      ],
      [
        61,
        14,
        'The gold thread returned as a reflection — proof that even hell has a ceiling.',
        'Il filo d’oro tornò come riflesso — prova che anche l’inferno ha un soffitto.',
      ],
      [
        78,
        11,
        'At the riverbank, Javert waited. Valjean asked only for time to save the boy.',
        'Sulla riva, Javert aspettava. Valjean chiese solo il tempo di salvare il ragazzo.',
      ],
    ],
  },
  {
    id: 'etoile',
    cues: [
      [
        6,
        15,
        'Javert had lived by the law. Mercy had no article, no paragraph, no prison.',
        'Javert era vissuto secondo la legge. La misericordia non aveva articoli, commi, prigioni.',
      ],
      [
        25,
        15,
        'On the bridge, he looked at the river and at the stars.',
        'Sul ponte, guardò il fiume e le stelle.',
      ],
      [
        43,
        15,
        'A good man had spared him. The law could not survive it. Javert could not survive the law.',
        'Un uomo buono lo aveva risparmiato. La legge non poteva sopravvivere. Javert non poteva sopravvivere alla legge.',
      ],
      [
        61,
        12,
        'He left his hat, his notebook, and the only certainty he had ever owned.',
        'Lasciò il cappello, il taccuino e l’unica certezza che avesse mai avuto.',
      ],
    ],
    quotes: [
      [
        75,
        5,
        'The river closed. The stars stayed.',
        'Il fiume si chiuse. Le stelle restarono.',
      ],
    ],
  },
  {
    id: 'pardon',
    cues: [
      [
        6,
        16,
        'The wedding was white and gold. Cosette laughed; Marius held her hand; Valjean stayed in the shadow.',
        'Il matrimonio era bianco e oro. Cosette rideva; Marius le teneva la mano; Valjean restava nell’ombra.',
      ],
      [
        25,
        16,
        'Then Thénardier told Marius the truth he had kept: the man in the sewer was Valjean, and the body was Marius himself.',
        'Poi Thénardier rivelò a Marius la verità taciuta: l’uomo nella fogna era Valjean, e il corpo era Marius stesso.',
      ],
      [
        43,
        15,
        'Marius ran to the old man’s room. “You saved me. Why did you never say so?”',
        'Marius corse nella stanza del vecchio. «Mi hai salvato. Perché non me l’hai mai detto?»',
      ],
      [
        61,
        16,
        'Valjean confessed his whole life: the galleys, the lie, the stolen silver, the candlesticks.',
        'Valjean confessò tutta la sua vita: i lavori forzati, la menzogna, l’argento rubato, i candelabri.',
      ],
      [
        79,
        13,
        'Cosette took his hand. “You are my father,” she said. “You always were.”',
        'Cosette gli prese la mano. «Sei mio padre», disse. «Lo sei sempre stato.»',
      ],
    ],
    quotes: [
      [
        94,
        5,
        'To love is to act.',
        'Amare è agire.',
        'Aimer, c’est agir.',
      ],
    ],
  },
  {
    id: 'epilogue',
    cues: [
      [
        5,
        13,
        'He died with the candlesticks burning and the two children he had saved beside him.',
        'Morì con i candelabri accesi e i due ragazzi che aveva salvato accanto a lui.',
      ],
      [
        21,
        10,
        'The thread does not end. It only changes hands.',
        'Il filo non finisce. Cambia soltanto mani.',
      ],
    ],
  },
];

function buildCues(chapter: ChapterSeed, spec: CueChapterSpec): Cue[] {
  const all: Array<{ spec: CueSpec; kind: CueKind }> = [
    ...(spec.cues ?? []).map((s) => ({ spec: s, kind: 'caption' as const })),
    ...(spec.quotes ?? []).map((s) => ({ spec: s, kind: 'quote' as const })),
  ];

  return all
    .map(({ spec: s, kind }, i) => ({
      id: `${chapter.id}-${kind}-${i}`,
      start: chapter.start + s[0],
      end: chapter.start + s[0] + s[1],
      text: { en: s[2], it: s[3] },
      french: s[4],
      kind,
    }))
    .sort((a, b) => a.start - b.start);
}

export const CHAPTERS: Chapter[] = seeds.map((seed) => {
  const spec = cueSpecs.find((c) => c.id === seed.id);
  if (!spec) throw new Error(`Missing cue spec for ${seed.id}`);
  return { ...seed, cues: buildCues(seed, spec) };
});

export function chapterAt(time: number): Chapter {
  const t = Math.max(0, Math.min(DURATION - 0.0001, time));
  for (const chapter of CHAPTERS) {
    if (t >= chapter.start && t < chapter.end) return chapter;
  }
  return CHAPTERS[CHAPTERS.length - 1];
}

export function activeCue(time: number): Cue | null {
  const chapter = chapterAt(time);
  for (const cue of chapter.cues) {
    if (time >= cue.start && time < cue.end) return cue;
  }
  return null;
}

export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function cueProgress(cue: Cue, time: number): number {
  return Math.max(0, Math.min(1, (time - cue.start) / Math.max(0.001, cue.end - cue.start)));
}
