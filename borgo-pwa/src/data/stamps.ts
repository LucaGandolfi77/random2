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
  },
  {
    id: 'stamp-stirone',
    name: { it: 'Timbro dello Stirone', en: 'Stirone stamp' },
    description: {
      it: 'Il fiume, il ponte di legno e il rumore dell’acqua tra gli argini.',
      en: 'The river, the wooden bridge and the sound of water between the banks.'
    },
    placeIds: ['stirone']
  },
  {
    id: 'stamp-pioppi',
    name: { it: 'Timbro dei Pioppi', en: 'Poplar stamp' },
    description: {
      it: 'Il bosco leggero, le radure e la torretta che guarda la pianura.',
      en: 'The light wood, its clearings and the outlook over the plain.'
    },
    placeIds: ['pioppi']
  },
  {
    id: 'stamp-azalee',
    name: { it: 'Timbro delle Azalee', en: 'Azalee stamp' },
    description: {
      it: 'Il quartiere est, la piazza nuova e il giardino tra le case.',
      en: 'The eastern district, its new square and the garden among the houses.'
    },
    placeIds: ['azalee', 'parco-azalee']
  },
  {
    id: 'stamp-centro',
    name: { it: 'Timbro del Centro', en: 'Shopping Centre stamp' },
    description: {
      it: 'Vetrine, parcheggi e il jet che ricorda il volo fidentino.',
      en: 'Shop windows, car parks and the jet that remembers Fidenza’s aviation history.'
    },
    placeIds: ['centro-commerciale', 'aermacchi']
  },
  {
    id: 'stamp-sport',
    name: { it: 'Timbro dello Sport', en: 'Sports stamp' },
    description: {
      it: 'Dalle rampe dello skatepark ai campi del Cigala: lo sport di quartiere.',
      en: 'From the skatepark ramps to the Cigala pitches: local sport.'
    },
    placeIds: ['skatepark', 'cigala']
  },
  {
    id: 'stamp-stadio',
    name: { it: 'Timbro dello Stadio', en: 'Stadium stamp' },
    description: {
      it: 'Il campo, le tribune e le torri faro dello stadio Ballotta.',
      en: 'The pitch, the stands and the floodlights of Ballotta Stadium.'
    },
    placeIds: ['stadio', 'centro-ballotta']
  },
  {
    id: 'stamp-pala',
    name: { it: 'Timbro del Pala', en: 'Sports Hall stamp' },
    description: {
      it: 'Il palazzetto e la piscina coperta, luci accese e corsie d’acqua.',
      en: 'The sports hall and the indoor pool, lights on and swimming lanes.'
    },
    placeIds: ['pala', 'piscina']
  },
  {
    id: 'stamp-piazzalapira',
    name: { it: 'Timbro di Piazza La Pira', en: 'Piazza La Pira stamp' },
    description: {
      it: 'La piazza di quartiere e il giardino di Charlie, tra alberi e giochi.',
      en: 'The neighbourhood square and Charlie’s Garden, among trees and playgrounds.'
    },
    placeIds: ['piazza-la-pira', 'giardino-charlie']
  },
  {
    id: 'stamp-agrario',
    name: { it: 'Timbro dell’Istituto Agrario', en: 'Agricultural Institute stamp' },
    description: {
      it: 'Le serre, i campi sperimentali e gli orti del Parco Nord.',
      en: 'The greenhouses, experimental fields and community gardens of North Park.'
    },
    placeIds: ['istituto-agrario', 'parco-nord']
  },
  {
    id: 'stamp-binari',
    name: { it: 'Timbro dei Binari', en: 'Railway stamp' },
    description: {
      it: 'Dai binari della stazione ai carri merci dello scalo.',
      en: 'From the station tracks to the freight wagons of the goods yard.'
    },
    placeIds: ['scalo', 'stazione']
  },
  {
    id: 'stamp-sacrocuore',
    name: { it: 'Timbro del Sacro Cuore', en: 'Sacred Heart stamp' },
    description: {
      it: 'Il sagrato tranquillo e gli alberi intorno alla chiesa del sud-ovest.',
      en: 'The quiet parvis and the trees around the south-western church.'
    },
    placeIds: ['sacro-cuore']
  },
  {
    id: 'stamp-giardini',
    name: { it: 'Timbro dei Giardini', en: 'Gardens stamp' },
    description: {
      it: 'Tre parchi, tre ombre diverse: Olmi, De Gasperi e Parcobaleno.',
      en: 'Three parks, three kinds of shade: Olmi, De Gasperi and Rainbow Park.'
    },
    placeIds: ['parco-olmi', 'parco-degasperi', 'parcobaleno']
  },
  {
    id: 'stamp-chieseminori',
    name: { it: 'Timbro delle Chiese Minori', en: 'Minor Churches stamp' },
    description: {
      it: 'Santa Maria Annunziata e San Michele: due chiese discrete nel tessuto della città.',
      en: 'Santa Maria Annunziata and San Michele: two quiet churches woven into the town.'
    },
    placeIds: ['santa-maria', 'san-michele']
  }
];

export function stampEarned(stamp: StampSpec, discovered: string[]): boolean {
  return stamp.placeIds.every((id) => discovered.includes(id));
}
