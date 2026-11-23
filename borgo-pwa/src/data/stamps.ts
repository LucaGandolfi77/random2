import type { Localized } from './types';

export interface StampSpec {
  id: string;
  name: Localized;
  description: Localized;
  /** Every listed discovery must be found before the stamp is earned. */
  placeIds: string[];
}

export const STAMPS: StampSpec[] = [
  {
    id: 'stamp-monica',
    name: { it: 'Timbro di Monica', en: 'Monica stamp' },
    description: {
      it: 'La stazione, le valigie e le prime case di Fidenza che si allungano verso est.',
      en: 'The station, the suitcases and the first houses of Fidenza reaching east.'
    },
    placeIds: ['monica']
  },
  {
    id: 'stamp-sanlazzaro',
    name: { it: 'Timbro di San Lazzaro', en: 'San Lazzaro stamp' },
    description: {
      it: 'Giardini, scuola e villette: il quartiere che vive appena fuori dal centro.',
      en: 'Gardens, a school and small houses: the neighbourhood just beyond the centre.'
    },
    placeIds: ['sanlazzaro']
  },
  {
    id: 'stamp-granmadre',
    name: { it: 'Timbro della Gran Madre', en: 'Gran Madre stamp' },
    description: {
      it: 'La cupola del santuario si vede da lontano, sopra i tetti della periferia.',
      en: 'The sanctuary dome can be seen from afar, above the rooftops of the outskirts.'
    },
    placeIds: ['granmadre']
  },
  {
    id: 'stamp-musini',
    name: { it: 'Timbro del Museo Musini', en: 'Musini Museum stamp' },
    description: {
      it: 'Una piccola porta sulla storia del Risorgimento e della città.',
      en: 'A small doorway into the history of the Risorgimento and the town.'
    },
    placeIds: ['musini']
  },
  {
    id: 'stamp-parchi',
    name: { it: 'Timbro dei Parchi del Sud', en: 'Southern Parks stamp' },
    description: {
      it: 'Due parchi, un solo respiro: Vittorio Veneto e Parco della Pace.',
      en: 'Two parks, one breath: Vittorio Veneto and Parco della Pace.'
    },
    placeIds: ['parco-vittorio', 'parco-pace']
  },
  {
    id: 'stamp-corea',
    name: { it: 'Timbro di Corea', en: 'Corea stamp' },
    description: {
      it: 'Viali, campi e case basse dove la città lascia spazio alla pianura.',
      en: 'Avenues, fields and low houses where the town gives way to the plain.'
    },
    placeIds: ['corea']
  },
  {
    id: 'stamp-luce',
    name: { it: 'Timbro di Luce', en: 'Luce stamp' },
    description: {
      it: 'Il quartiere ovest, tra viali larghi, scuole e piccoli negozi.',
      en: 'The western neighbourhood, among wide avenues, schools and small shops.'
    },
    placeIds: ['luce']
  },
  {
    id: 'stamp-sanpaolo',
    name: { it: 'Timbro di San Paolo', en: 'San Paolo stamp' },
    description: {
      it: 'La chiesa, il sagrato e le case basse del quartiere sud-ovest.',
      en: 'The church, its parvis and the low houses of the south-western neighbourhood.'
    },
    placeIds: ['sanpaolo']
  },
  {
    id: 'stamp-santantonio',
    name: { it: "Timbro di Sant'Antonio", en: "Sant'Antonio stamp" },
    description: {
      it: 'Una chiesa raccolta tra le case e i campi che guardano lo Stirone.',
      en: 'A small church among houses and fields looking towards the Stirone.'
    },
    placeIds: ['santantonio']
  }
];

export function stampEarned(stamp: StampSpec, discovered: string[]): boolean {
  return stamp.placeIds.every((id) => discovered.includes(id));
}
