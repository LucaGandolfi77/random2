import type { Localized, QuestId } from './types';

export const QUEST_ORDER: QuestId[] = ['bread', 'letters', 'flowers', 'bell'];

export interface QuestMeta {
  name: Localized;
  description: Localized;
}

export const QUESTS: Record<QuestId, QuestMeta> = {
  bread: {
    name: { it: 'Il pane della festa', en: 'Bread for the feast' },
    description: {
      it: 'Porta il pane caldo di Ada al tavolo della festa, in piazza.',
      en: "Bring Ada's warm loaf to the festival table in the piazza."
    }
  },
  letters: {
    name: { it: 'Le lettere smarrite', en: 'The lost letters' },
    description: {
      it: 'Elio ha perso tre lettere lungo i vicoli. Ritrovale e riportagliele.',
      en: 'Elio lost three letters along the lanes. Find them and bring them back.'
    }
  },
  flowers: {
    name: { it: 'Fiori per la passeggiata', en: 'Flowers for the walk' },
    description: {
      it: 'Marta aspetta cinque fiori di campo per la sera.',
      en: 'Marta is waiting for five wildflowers for the evening.'
    }
  },
  bell: {
    name: { it: "La campana dell'imbrunire", en: 'The dusk bell' },
    description: {
      it: "Quando il paese è pronto, suona la campana di Santa Lena.",
      en: 'When the town is ready, ring the bell of Santa Lena.'
    }
  }
};
