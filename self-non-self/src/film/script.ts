import type { ClinicalOverlay, Cue, Text } from './types';

/**
 * The whole spoken film. One line at a time, never overlapping.
 * Times are absolute seconds in the 780-second timeline.
 */
export const CUES: Cue[] = [
  // Prologue — The Country
  {
    id: 'p01',
    start: 5,
    end: 11,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'Every body is a country that never voted for its borders.',
      it: 'Ogni corpo è un paese che non ha mai votato i propri confini.',
    },
  },
  {
    id: 'p02',
    start: 15,
    end: 22,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'At the end, it does not fall silent all at once.',
      it: 'Alla fine, non tace tutto in una volta.',
    },
  },
  {
    id: 'p03',
    start: 24,
    end: 30,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'It goes out room by room.',
      it: 'Si spegne stanza per stanza.',
    },
  },
  {
    id: 'p04',
    start: 36,
    end: 45,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'I was made to carry a warning. I am sorry it arrives so late.',
      it: 'Sono stato creato per portare un avvertimento. Mi dispiace che arrivi così tardi.',
    },
  },

  // I — The Watch
  {
    id: 'w01',
    start: 64,
    end: 73,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'I have no name. I have a surface full of everything the body has survived.',
      it: 'Non ho un nome. Ho una superficie piena di tutto ciò che il corpo ha superato.',
    },
  },
  {
    id: 'w02',
    start: 80,
    end: 89,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'This is the watch: a current, a breath, a door that knows whom to open.',
      it: 'Questa è la veglia: una corrente, un respiro, una porta che sa a chi aprirsi.',
    },
  },
  {
    id: 'w03',
    start: 96,
    end: 105,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'I carry pieces of the world to the ones who can read them.',
      it: 'Porto pezzi del mondo a chi sa leggerli.',
    },
  },
  {
    id: 'w04',
    start: 110,
    end: 118,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'The T cells answer in light. For a while, I believed the light would never end.',
      it: 'I linfociti T rispondono con la luce. Per un po’ ho creduto che la luce non sarebbe mai finita.',
    },
  },
  {
    id: 'w05',
    start: 126,
    end: 137,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'Once, a splinter entered. The body burned, closed, and kept a small gold scar. To survive is to remember.',
      it: 'Una volta entrò una scheggia. Il corpo bruciò, si chiuse e conservò una piccola cicatrice d’oro. Sopravvivere è ricordare.',
    },
  },
  {
    id: 'w06',
    start: 144,
    end: 152,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'I did not know I was living in the last ordinary day.',
      it: 'Non sapevo di vivere l’ultimo giorno ordinario.',
    },
  },

  // II — The First Silence
  {
    id: 's01',
    start: 164,
    end: 173,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'The first silence is not the absence of sound. It is the absence of an answer.',
      it: 'Il primo silenzio non è assenza di suono. È assenza di risposta.',
    },
  },
  {
    id: 's02',
    start: 180,
    end: 188,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'The river slows. The red cells beach like boats at low tide.',
      it: 'Il fiume rallenta. I globuli rossi si arenano come barche con la bassa marea.',
    },
  },
  {
    id: 's03',
    start: 196,
    end: 204,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'The marrow, which made us all, has nothing left to send.',
      it: 'Il midollo, che ci ha creati tutti, non ha più nulla da mandare.',
    },
  },
  {
    id: 's04',
    start: 212,
    end: 220,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'I call. The node returns my own voice.',
      it: 'Chiamo. Il linfonodo mi restituisce la mia stessa voce.',
    },
  },
  {
    id: 's05',
    start: 226,
    end: 234,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'Oxygen 71 percent. Neutrophils 0.3. The numbers are not a story. They are a countdown.',
      it: 'Ossigeno 71 per cento. Neutrofili 0,3. I numeri non sono una storia. Sono un conto alla rovescia.',
    },
  },
  {
    id: 's06',
    start: 237,
    end: 244,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'There is no one coming.',
      it: 'Non sta arrivando nessuno.',
    },
  },

  // III — The Breach
  {
    id: 'b01',
    start: 250,
    end: 258,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'Then the wall that kept the world out becomes the wall that keeps us in.',
      it: 'Allora il muro che teneva fuori il mondo diventa il muro che ci tiene dentro.',
    },
  },
  {
    id: 'b02',
    start: 264,
    end: 272,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'The gut is a cathedral of light. Its columns hold a forest that has lived with us since the first swallow.',
      it: 'L’intestino è una cattedrale di luce. Le sue colonne sostengono una foresta che vive con noi dal primo boccone.',
    },
  },
  {
    id: 'b03',
    start: 282,
    end: 290,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'When the barrier fails, they do not invade. They simply stop being kept.',
      it: 'Quando la barriera cede, non invadono. Smettono soltanto di essere trattenuti.',
    },
  },
  {
    id: 'b04',
    start: 294,
    end: 302,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'We called them guests while the walls held. When the walls failed, we called them the flood.',
      it: 'Li chiamavamo ospiti finché i muri reggevano. Quando i muri cedettero, li chiamammo diluvio.',
    },
  },
  {
    id: 'b05',
    start: 308,
    end: 316,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'The first one I take is almost gentle. Phagocytosis is an embrace with no way back.',
      it: 'Il primo che prendo è quasi gentile. La fagocitosi è un abbraccio senza via di ritorno.',
    },
  },
  {
    id: 'b06',
    start: 320,
    end: 328,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'I was made to speak. But there is no one left to speak to.',
      it: 'Sono stato creato per parlare. Ma non è rimasto nessuno con cui parlare.',
    },
  },

  // IV — The Residents
  {
    id: 'r01',
    start: 340,
    end: 346,
    kind: 'dialogue',
    speaker: 'resident',
    text: {
      en: 'You kept us in the dark.',
      it: 'Ci avete tenuti nel buio.',
    },
  },
  {
    id: 'r02',
    start: 348,
    end: 354,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'The dark was not mine.',
      it: 'Il buio non era mio.',
    },
  },
  {
    id: 'r03',
    start: 356,
    end: 362,
    kind: 'dialogue',
    speaker: 'resident',
    text: {
      en: 'Then whose?',
      it: 'Di chi era, allora?',
    },
  },
  {
    id: 'r04',
    start: 364,
    end: 370,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'Yours. Mine. The same.',
      it: 'Tuo. Mio. Lo stesso.',
    },
  },
  {
    id: 'r05',
    start: 378,
    end: 388,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'Before the first breath, they were already arriving. The body’s first act was not war. It was tolerance.',
      it: 'Prima del primo respiro, stavano già arrivando. Il primo atto del corpo non fu la guerra. Fu la tolleranza.',
    },
  },
  {
    id: 'r06',
    start: 394,
    end: 400,
    kind: 'dialogue',
    speaker: 'resident',
    text: {
      en: 'You called us other.',
      it: 'Ci avete chiamati altro.',
    },
  },
  {
    id: 'r07',
    start: 402,
    end: 408,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'I called you what the border told me.',
      it: 'Vi ho chiamati come mi diceva il confine.',
    },
  },
  {
    id: 'r08',
    start: 410,
    end: 416,
    kind: 'dialogue',
    speaker: 'resident',
    text: {
      en: 'And now?',
      it: 'E adesso?',
    },
  },
  {
    id: 'r09',
    start: 418,
    end: 424,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'Now the border is tired.',
      it: 'Adesso il confine è stanco.',
    },
  },
  {
    id: 'r10',
    start: 426,
    end: 430,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'To be a self is to know what to let in.',
      it: 'Essere sé stessi è sapere cosa lasciar entrare.',
    },
  },

  // V — The Last Signal
  {
    id: 'g01',
    start: 434,
    end: 442,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'I send the warning. It goes out like a ring in water. There is no one to receive it.',
      it: 'Mando l’avvertimento. Esce come un cerchio nell’acqua. Non c’è nessuno a riceverlo.',
    },
  },
  {
    id: 'g02',
    start: 448,
    end: 456,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'So I fight. Not because I can win. Because stopping would be a kind of agreement.',
      it: 'Quindi combatto. Non perché possa vincere. Perché fermarmi sarebbe una specie di accordo.',
    },
  },
  {
    id: 'g03',
    start: 466,
    end: 474,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'A dendrite tears away. I feel it leave the way a sentence loses a word.',
      it: 'Un dendrite si strappa. Lo sento andarsene come una frase che perde una parola.',
    },
  },
  {
    id: 'g04',
    start: 484,
    end: 490,
    kind: 'dialogue',
    speaker: 'resident',
    text: {
      en: 'Why do you still stand?',
      it: 'Perché resti ancora in piedi?',
    },
  },
  {
    id: 'g05',
    start: 492,
    end: 498,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'Because the dark is not yet finished.',
      it: 'Perché il buio non ha ancora finito.',
    },
  },
  {
    id: 'g06',
    start: 504,
    end: 512,
    kind: 'dialogue',
    speaker: 'resident',
    text: {
      en: 'I have the last meal of this body inside me. I only want to go home.',
      it: 'Ho dentro di me l’ultimo pasto di questo corpo. Voglio solo tornare a casa.',
    },
  },
  {
    id: 'g07',
    start: 514,
    end: 522,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'There is no home. Go where the light is.',
      it: 'Non c’è una casa. Vai dove c’è la luce.',
    },
  },

  // VI — The Empty City
  {
    id: 'e01',
    start: 530,
    end: 538,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'The city goes out room by room. The heart is the last lamp.',
      it: 'La città si spegne stanza per stanza. Il cuore è l’ultima lampada.',
    },
  },
  {
    id: 'e02',
    start: 544,
    end: 552,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'I visit the scar. It still remembers being whole.',
      it: 'Visito la cicatrice. Ricorda ancora di essere stata intera.',
    },
  },
  {
    id: 'e03',
    start: 558,
    end: 566,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'I visit the lung. It still remembers cold air, and the shape of a word.',
      it: 'Visito il polmone. Ricorda ancora l’aria fredda e la forma di una parola.',
    },
  },
  {
    id: 'e04',
    start: 576,
    end: 584,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'I visit the node. The lanterns are dark. The chairs are empty.',
      it: 'Visito il linfonodo. Le lanterne sono spente. Le sedie sono vuote.',
    },
  },
  {
    id: 'e05',
    start: 590,
    end: 598,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'A library with no readers. But the books still glow.',
      it: 'Una biblioteca senza lettori. Ma i libri brillano ancora.',
    },
  },
  {
    id: 'e06',
    start: 602,
    end: 610,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'I have carried the world. Now I would like to put it down.',
      it: 'Ho portato il mondo. Ora vorrei posarlo.',
    },
  },

  // VII — The Surface
  {
    id: 'u01',
    start: 618,
    end: 626,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'I climb toward the surface. Collagen cables, the white ceiling of the skin.',
      it: 'Salgo verso la superficie. Cavi di collagene, il soffitto bianco della pelle.',
    },
  },
  {
    id: 'u02',
    start: 634,
    end: 642,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'Beyond it: a window. Snow. A hand on a sheet.',
      it: 'Oltre: una finestra. Neve. Una mano su un lenzuolo.',
    },
  },
  {
    id: 'u03',
    start: 650,
    end: 658,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'I press against the glass. I cannot reach you.',
      it: 'Premo contro il vetro. Non posso raggiungerti.',
    },
  },
  {
    id: 'u04',
    start: 660,
    end: 668,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'I was inside you, but I never met you.',
      it: 'Ero dentro di te, ma non ti ho mai incontrato.',
    },
  },
  {
    id: 'u05',
    start: 674,
    end: 682,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'You were never my patient. You were my weather.',
      it: 'Non sei mai stato mio paziente. Sei stato il mio clima.',
    },
  },
  {
    id: 'u06',
    start: 684,
    end: 692,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'I was never the protagonist. I was the body’s way of knowing itself for a while.',
      it: 'Non sono mai stato il protagonista. Sono stato il modo in cui il corpo ha conosciuto se stesso per un po’.',
    },
  },

  // VIII — Apoptosis
  {
    id: 'a01',
    start: 698,
    end: 706,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'Apoptosis is not a defeat. It is a sentence ending on purpose.',
      it: 'L’apoptosi non è una sconfitta. È una frase che finisce di proposito.',
    },
  },
  {
    id: 'a02',
    start: 710,
    end: 718,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'I open. Everything I kept leaves me in a small gold weather.',
      it: 'Mi apro. Tutto ciò che ho conservato mi lascia in un piccolo clima d’oro.',
    },
  },
  {
    id: 'a03',
    start: 724,
    end: 731,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'The residents gather. Not to take. To receive.',
      it: 'I residenti si radunano. Non per prendere. Per ricevere.',
    },
  },
  {
    id: 'a04',
    start: 736,
    end: 742,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'I was the body’s way of saying: not yet.',
      it: 'Sono stato il modo del corpo di dire: non ancora.',
    },
  },
  {
    id: 'a05',
    start: 743,
    end: 749,
    kind: 'dialogue',
    speaker: 'messenger',
    text: {
      en: 'Now I am how it says: come in.',
      it: 'Ora sono il modo in cui dice: entra.',
    },
  },

  // IX — The Garden
  {
    id: 'z01',
    start: 754,
    end: 762,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'They divide in the dark, carrying my colors. The garden does not mourn. It grows.',
      it: 'Si dividono nel buio, portando i miei colori. Il giardino non piange. Cresce.',
    },
  },
  {
    id: 'z02',
    start: 764,
    end: 772,
    kind: 'narration',
    speaker: 'none',
    text: {
      en: 'The body is not a fortress. It is a garden that learned, for a little while, to say I.',
      it: 'Il corpo non è una fortezza. È un giardino che ha imparato, per un po’, a dire io.',
    },
  },
  {
    id: 'z03',
    start: 774,
    end: 780,
    kind: 'dedication',
    speaker: 'none',
    text: {
      en: 'For everyone who stayed until the end.',
      it: 'Per tutti quelli che sono rimasti fino alla fine.',
    },
  },
];

export const CLINICAL: ClinicalOverlay[] = [
  { id: 'c01', start: 166, end: 178, label: 'O₂ SAT', value: '94%' },
  { id: 'c02', start: 190, end: 202, label: 'O₂ SAT', value: '71%' },
  { id: 'c03', start: 208, end: 220, label: 'NEUTROPHILS', value: '0.3 ×10⁹/L' },
  { id: 'c04', start: 228, end: 240, label: 'pH', value: '7.11' },
  { id: 'c05', start: 300, end: 312, label: 'BARRIER INTEGRITY', value: '0%' },
  { id: 'c06', start: 452, end: 464, label: 'TIME SINCE LAST SIGNAL', value: '00:03:11' },
  { id: 'c07', start: 540, end: 552, label: 'CARDIAC OUTPUT', value: '2.1 L/MIN' },
  { id: 'c08', start: 700, end: 712, label: 'APOPTOSIS', value: 'PROGRAMMED' },
];

/** The film's essential lines, kept here so tests can protect them. */
export const THESIS_LINES: Text[] = [
  {
    en: 'Every body is a country that never voted for its borders.',
    it: 'Ogni corpo è un paese che non ha mai votato i propri confini.',
  },
  {
    en: 'To be a self is to know what to let in.',
    it: 'Essere sé stessi è sapere cosa lasciar entrare.',
  },
  {
    en: 'I was the body’s way of saying: not yet. Now I am how it says: come in.',
    it: 'Sono stato il modo del corpo di dire: non ancora. Ora sono il modo in cui dice: entra.',
  },
  {
    en: 'The body is not a fortress. It is a garden that learned, for a little while, to say I.',
    it: 'Il corpo non è una fortezza. È un giardino che ha imparato, per un po’, a dire io.',
  },
];
