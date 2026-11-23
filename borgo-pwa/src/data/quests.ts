import type { Localized, QuestId } from './types';

export const QUEST_ORDER: QuestId[] = [
  'bread',
  'letters',
  'flowers',
  'newspaper',
  'book',
  'coffee',
  'bell'
];

export const CORE_QUESTS: QuestId[] = ['bread', 'letters', 'flowers'];
export const DELIVERY_QUESTS: QuestId[] = ['bread', 'newspaper', 'book', 'coffee'];

export interface QuestMeta {
  name: Localized;
  description: Localized;
  giver: string;
}

export const QUESTS: Record<QuestId, QuestMeta> = {
  bread: {
    name: { it: 'Il pane del teatro', en: 'Bread for the theatre' },
    description: {
      it: 'Porta il pane caldo di Ada al Teatro Magnani, prima che si raffreddi.',
      en: "Bring Ada's warm bread to the Teatro Magnani before it goes cold."
    },
    giver: 'Ada'
  },
  letters: {
    name: { it: 'Le lettere smarrite', en: 'The lost letters' },
    description: {
      it: 'Tre lettere sono volate via lungo Via Emilia. Ritrovale e riportale a Elio.',
      en: 'Three letters blew away along the Via Emilia. Find them and bring them back to Elio.'
    },
    giver: 'Elio'
  },
  flowers: {
    name: { it: 'Fiori per la sera', en: 'Flowers for the evening' },
    description: {
      it: 'Marta aspetta cinque fiori di campo per la passeggiata.',
      en: 'Marta is waiting for five wildflowers for the evening walk.'
    },
    giver: 'Marta'
  },
  newspaper: {
    name: { it: 'Il giornale del mattino', en: 'The morning paper' },
    description: {
      it: "Porta il giornale di Beppe alla stazione: qualcuno aspetta le notizie prima del treno.",
      en: "Take Beppe's newspaper to the station: someone is waiting for the news before the train."
    },
    giver: 'Beppe'
  },
  book: {
    name: { it: 'Il libro dimenticato', en: 'The forgotten book' },
    description: {
      it: 'Lidia ha trovato un libro con una dedica. Va riportato a San Pietro.',
      en: 'Lidia found a book with an inscription. It belongs back at San Pietro.'
    },
    giver: 'Lidia'
  },
  coffee: {
    name: { it: 'Un caffè per il Comune', en: 'A coffee for the Town Hall' },
    description: {
      it: 'Sara prepara un caffè per l’impiegato del Palazzo Comunale. Consegnalo ancora caldo.',
      en: 'Sara is making a coffee for the clerk at the Town Hall. Deliver it while it is still hot.'
    },
    giver: 'Sara'
  },
  bell: {
    name: { it: "La campana dell'imbrunire", en: 'The dusk bell' },
    description: {
      it: 'Quando il centro è pronto, suona la campana del campanile accanto al Duomo.',
      en: 'When the centre is ready, ring the bell in the tower beside the cathedral.'
    },
    giver: 'Nino'
  }
};
