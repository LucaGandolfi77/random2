/**
 * Le modalità di BUCIO. Ogni modalità è un oggetto autosufficiente: dice
 * quanto è grande il mondo, quanto dura la partita, che regole valgono per
 * i rivali e quanto cibo c'è da mangiare. Il resto del gioco lo legge da
 * qui, così aggiungerne una non significa toccare il regista.
 */

export const MODES = {
  citta: {
    id: 'citta',
    name: 'Città',
    emoji: '🏙️',
    pitch: 'La cittadina come l’hai sempre vista: 2 minuti, i rivali si rimettono in gioco.',
    scale: 1,
    time: 120,
    knockout: false,
    density: 1,
    goldEvery: 22,
    powerEvery: 15,
    rivals: 4,
  },
  continente: {
    id: 'continente',
    name: 'Continente',
    emoji: '🌍',
    pitch: 'Mondo quasi doppio, 3 minuti: chi viene divorato sparisce per sempre.',
    scale: 1.8,
    time: 180,
    knockout: true,
    density: 2.6,
    goldEvery: 40,
    powerEvery: 26,
    rivals: 4,
  },
};

export const MODE_IDS = Object.keys(MODES);

export const DEFAULT_MODE = 'citta';

/** Regole del divoramento quando il morso è definitivo. */
export const KO = {
  steal: 0.5, // metà dei punti del perdente
  bonus: 250, // più un bonus fisso: inseguire un rivale deve valere
  massShare: 0.55, // quanto della sua massa ti resta
  massRatio: 1.15, // serve molto meno vantaggio per divorarlo
  threatRatio: 1.2, // e per sentirsi in pericolo
  reach: 0.92, // e il morso arriva più lontano
};

/** Ritmo di caccia dei rivali in modalità eliminatoria. */
export const KO_AI = { huntMul: 1.55, fearMul: 0.5 };

/** La modalità attiva, con fallback sulla città. */
export function mode(id) {
  return MODES[id] ?? MODES[DEFAULT_MODE];
}

/** Il moltiplicatore di densità reale: qualità grafica × modalità. */
export function propDensity(qualityDensity, id) {
  return qualityDensity * mode(id).density;
}