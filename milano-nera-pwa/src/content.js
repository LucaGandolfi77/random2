import { LEVELS, CHASE } from './levels.js';
import { ENEMIES, PALETTES, RANKS, WEAPONS } from './config.js';

export { CHASE, ENEMIES, LEVELS, PALETTES, RANKS, WEAPONS };

export const CHAPTERS = [
  {
    id: 1,
    act: 1,
    actTitle: 'Atto I · La vendetta',
    title: 'La Casa Chiusa',
    subtitle: 'Porta Venezia, 23:40',
    level: 'casa',
    parTime: 95,
    tagline: 'Un nastro. Una donna. Troppe pistole.',
    intro: [
      'Milano, 1977. La città brilla come una lametta nel buio.',
      'Rocco Vanni è uscito dal San Vittore con una sola certezza: qualcuno ha venduto il suo nome. La pista porta alla Casa Chiusa, dove la notte si compra a ore.',
      'Dentro c’è un nastro. Fuori c’è una città che non perdona.'
    ],
    outro: [
      'Il nastro gira nel registratore. La voce è quella di un uomo che Rocco conosce bene.',
      'Torre Velasca. Trentesimo piano. Il Ragioniere tiene i conti di mezza città.'
    ],
    objectiveText: 'Recupera il nastro'
  },
  {
    id: 2,
    act: 1,
    actTitle: 'Atto I · La vendetta',
    title: 'Torre Velasca',
    subtitle: 'Centro, 02:10',
    level: 'torre',
    parTime: 125,
    tagline: 'I conti non tornano mai. Le pallottole sì.',
    intro: [
      'La Torre Velasca sembra un fungo di cemento piantato nel cuore di Milano.',
      'Al trentesimo piano, il Ragioniere aspetta con due guardie del corpo, un cecchino e la solita faccia da contabile pulito.',
      'Rocco ha un revolver, sei colpi e nessuna intenzione di firmare una confessione.'
    ],
    outro: [
      'Il Ragioniere cade sulla moquette. Nella sua agenda c’è un solo nome cerchiato di rosso: Il Bianco.',
      'Ma prima c’è un corriere alla Stazione Centrale. Binario 7, Linea Rossa. Il registro deve cambiare mano all’alba.'
    ],
    objectiveText: 'Elimina Il Ragioniere'
  },
  {
    id: 3,
    act: 2,
    actTitle: 'Atto II · La pista',
    title: 'Metrò',
    subtitle: 'Stazione Centrale, 03:05',
    level: 'metro',
    parTime: 110,
    tagline: 'Sotto la città, il piombo non fa rumore.',
    intro: [
      'La Stazione Centrale dorme con le luci di emergenza accese. I binari tagliano la notte come cicatrici.',
      'Il corriere del Ragioniere porta un registro nero. Rocco lo segue nella Linea Rossa, tra piattaforme vuote e treni merci che non fermano mai.',
      'Un fischio, un rombo, e la città riapre gli occhi.'
    ],
    outro: [
      'Il registro è pieno di nomi, tangenti e una località cerchiata: Parco Lambro.',
      'La Iena aspetta lì. E la Iena non parla con le buone.'
    ],
    objectiveText: 'Recupera il registro'
  },
  {
    id: 4,
    act: 2,
    actTitle: 'Atto II · La pista',
    title: 'Parco Lambro',
    subtitle: 'Lambrate, 04:20',
    level: 'parco',
    parTime: 130,
    tagline: 'La pioggia cancella le impronte. Non i debiti.',
    intro: [
      'Il Parco Lambro è un polmone di erba bagnata e lampioni rotti. I cani fiutano Rocco prima delle guardie.',
      'La Iena lo aspetta vicino alla fontana, con un fucile e il sorriso di chi ha già scelto il finale.',
      'Nessun testimone. Solo pioggia, fango e una città che finge di dormire.'
    ],
    outro: [
      'La Iena sputa sangue e verità: Il Bianco è scappato in Tangenziale. Bagagliaio pieno, Darsena come ultima fermata.',
      'Rocco non ha più tempo per le domande. Ha solo una strada.'
    ],
    objectiveText: 'Elimina La Iena'
  },
  {
    id: 5,
    act: 3,
    actTitle: 'Atto III · L’ultima notte',
    title: 'Tangenziale',
    subtitle: 'Tangenziale Ovest, 03:25',
    level: null,
    chase: true,
    parTime: 60,
    tagline: 'L’ultima corsia è sempre la più sporca.',
    intro: [
      'La Tangenziale è una ferita che non si chiude. Il Bianco corre verso la Darsena con un’auto nera e il bagagliaio pieno di bugie.',
      'Rocco schiaccia l’acceleratore. Pioggia, neon, traffico e una pistola sul cruscotto.',
      'A Milano non esiste un posto dove sparire. Esiste solo un posto dove finire.'
    ],
    outro: [
      'L’auto del Bianco esce di strada e si ferma contro il guardrail. La Darsena è a due passi.',
      'Rocco scende. La notte non ha ancora finito.'
    ],
    objectiveText: 'Distruggi l’auto del Bianco'
  },
  {
    id: 6,
    act: 3,
    actTitle: 'Atto III · L’ultima notte',
    title: 'Darsena',
    subtitle: 'Navigli, 05:10',
    level: 'darsena',
    parTime: 85,
    tagline: 'La verità affonda sempre vicino alla riva.',
    intro: [
      'La Darsena riflette i lampioni come uno specchio crepato. Il Bianco è lì, ferito e ancora convinto di poter comprare il silenzio.',
      'Rocco ha il registro, la pistola e nessuna intenzione di trattare.',
      'L’alba è vicina. Il conto va chiuso prima che la città si svegli.'
    ],
    outro: [
      'Il Bianco è immobile sull’asfalto bagnato. La città non applaude; spegne le insegne, una a una.',
      'Rocco accende l’ultima sigaretta. Per la prima volta da anni, il nastro non gira più.'
    ],
    objectiveText: 'Chiudi i conti con Il Bianco'
  }
];

export const CHAPTER_BY_ID = Object.fromEntries(CHAPTERS.map((chapter) => [chapter.id, chapter]));
export const TOTAL_CHAPTERS = CHAPTERS.length;
export const FINAL_CHAPTER_ID = CHAPTERS[CHAPTERS.length - 1].id;

export const ACTS = [
  { id: 1, title: 'Atto I', subtitle: 'La vendetta', chapters: [1, 2] },
  { id: 2, title: 'Atto II', subtitle: 'La pista', chapters: [3, 4] },
  { id: 3, title: 'Atto III', subtitle: 'L’ultima notte', chapters: [5, 6] }
];

export const CHAPTER_THEMES = {
  1: 'casa',
  2: 'torre',
  3: 'metro',
  4: 'parco',
  5: 'chase',
  6: 'darsena'
};

export const EPILOGUE = [
  'Milano, 05:10. Le prime luci accendono il Duomo.',
  'Rocco Vanni non è un eroe. È solo un uomo che ha smesso di correre.',
  'Il registro è al sicuro. La verità, come sempre, costa più di una pallottola.'
];

export function rankFor(stats, chapter, deaths = 0) {
  let points = 0;
  if (stats.time <= chapter.parTime) points += 2;
  else if (stats.time <= chapter.parTime * 1.35) points += 1;
  if (stats.shots > 0 && stats.hits / stats.shots >= 0.55) points += 1;
  if (stats.stealthKills >= 1) points += 1;
  if (stats.damage <= 2) points += 1;
  if (deaths === 0) points += 1;
  const rank = points >= 6 ? 'S' : points >= 5 ? 'A' : points >= 3 ? 'B' : 'C';
  return RANKS[Math.max(0, RANKS.indexOf(rank))];
}

export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const rest = String(total % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}

export function chapterLabel(index) {
  return `Capitolo ${index}`;
}
