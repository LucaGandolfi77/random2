import type { Conversation, DialogueContext, Localized, NpcId, QuestPhase } from './types';

function ready(phase: QuestPhase): boolean {
  return phase === 'objective';
}

export function conversationFor(npc: NpcId, ctx: DialogueContext): Conversation {
  switch (npc) {
    case 'ada':
      return adaConversation(ctx);
    case 'elio':
      return elioConversation(ctx);
    case 'marta':
      return martaConversation(ctx);
    case 'nino':
      return ninoConversation(ctx);
  }
}

/* Conversations carry both languages so a language switch never has to
   rebuild the tree; the UI picks one at render time. */

function line(it: string, en: string): Localized {
  return { it, en };
}

function adaConversation(ctx: DialogueContext): Conversation {
  const speaker = 'Ada';
  const phase = ctx.quests.bread;

  if (phase === 'available') {
    return {
      speaker,
      lines: [
        line(
          'Sei tu il forestiero? Bene, sei arrivato giusto in tempo. Il pane della festa è pronto, ma io non posso lasciare il forno.',
          "You're the visitor? Good, you came at the right time. The feast bread is ready, but I can't leave the oven."
        ),
        line(
          'È sul bancone, ancora caldo. Portalo al tavolo grande in piazza, sotto il gelso.',
          "It's on the counter, still warm. Take it to the big table in the piazza, under the mulberry."
        )
      ],
      choices: [
        { label: line('Lo porto io.', "I'll take it."), action: 'accept-bread' },
        { label: line('Più tardi.', 'Later.'), action: 'close' }
      ]
    };
  }

  if (phase === 'active') {
    return {
      speaker,
      lines: [
        line(
          'Il tavolo è in piazza, davanti alla fontana. Non farlo raffreddare, per favore.',
          "The table is in the piazza, in front of the fountain. Don't let it go cold, please."
        )
      ]
    };
  }

  if (phase === 'done') {
    if (ctx.finaleSeen) {
      return {
        speaker,
        lines: [
          line(
            'Hai sentito la campana? Adesso sì che è festa. Questa sera si balla, e tu hai un posto a tavola.',
            'Did you hear the bell? Now it is a real feast. Tonight we dance, and you have a seat at the table.'
          )
        ]
      };
    }
    return {
      speaker,
      lines: [
        line(
          "L'hai consegnato? Sento già il profumo da qui. Grazie, forestiero.",
          'Delivered? I can smell it from here. Thank you, wayfarer.'
        ),
        line(
          'Se trovi una tessera del mosaico, non lasciarla lì. Il paese ricorda chi lo guarda davvero.',
          "If you find a mosaic tile, don't leave it lying there. The town remembers those who truly look."
        )
      ]
    };
  }

  return {
    speaker,
    lines: [line('Il forno è caldo, ma la festa comincia quando arriva la gente.', 'The oven is warm, but the feast begins when the people arrive.')]
  };
}

function elioConversation(ctx: DialogueContext): Conversation {
  const speaker = 'Elio';
  const phase = ctx.quests.letters;

  if (phase === 'available') {
    return {
      speaker,
      lines: [
        line(
          'Tre lettere mi sono volate via dal cestino. Tre! E io ho le gambe di un altro secolo.',
          'Three letters blew out of my basket. Three! And I have another century’s legs.'
        ),
        line(
          'Guarda nei vicoli, dove gira il vento. E se le trovi, non leggerle: sono storie di altri.',
          "Look in the lanes where the wind turns. And if you find them, don't read them: they're other people's stories."
        )
      ],
      choices: [
        { label: line('Le cerco io.', "I'll find them."), action: 'accept-letters' },
        { label: line('Non ora.', 'Not now.'), action: 'close' }
      ]
    };
  }

  if (phase === 'active') {
    return {
      speaker,
      lines: [
        line(
          `Ne hai trovate ${ctx.letters} su tre. Il vento le porta sempre dove non guardi.`,
          `You've found ${ctx.letters} of three. The wind always takes them where you aren't looking.`
        )
      ]
    };
  }

  if (ready(phase)) {
    return {
      speaker,
      lines: [
        line(
          'Tutte e tre? Anche quella per la signora De Vita? Sei meglio del servizio postale.',
          'All three? Even the one for Signora De Vita? You’re better than the postal service.'
        )
      ],
      choices: [
        { label: line('Ecco le lettere.', 'Here are the letters.'), action: 'complete-letters' },
        { label: line('Le tengo ancora un po’.', 'I’ll keep them a little longer.'), action: 'close' }
      ]
    };
  }

  if (phase === 'done') {
    return {
      speaker,
      lines: [
        line(
          ctx.finaleSeen
            ? 'Una lettera alla volta, il mondo resta in contatto. Buona passeggiata, forestiero.'
            : 'Se passi dal belvedere, salutami il mare. Non si vede, ma c’è.',
          ctx.finaleSeen
            ? 'One letter at a time, the world stays in touch. Enjoy the walk, wayfarer.'
            : "If you pass the belvedere, say hello to the sea for me. You can't see it, but it's there."
        )
      ]
    };
  }

  return {
    speaker,
    lines: [line('Il vento di stasera ha una fretta strana.', 'Tonight’s wind is in a strange hurry.')]
  };
}

function martaConversation(ctx: DialogueContext): Conversation {
  const speaker = 'Marta';
  const phase = ctx.quests.flowers;

  if (phase === 'available') {
    return {
      speaker,
      lines: [
        line(
          'La passeggiata comincia quando il sole tocca i tetti. Mi mancano cinque fiori di campo.',
          'The walk begins when the sun touches the roofs. I’m five wildflowers short.'
        ),
        line(
          'Crescono lungo i muri e nell’oliveto. Raccogli quelli che profumano di sera.',
          'They grow along the walls and in the olive grove. Pick the ones that smell of evening.'
        )
      ],
      choices: [
        { label: line('Ci penso io.', "I'll see to it."), action: 'accept-flowers' },
        { label: line('Forse dopo.', 'Maybe later.'), action: 'close' }
      ]
    };
  }

  if (phase === 'active') {
    return {
      speaker,
      lines: [
        line(
          `Ne hai ${ctx.flowers} su cinque. Non serve che siano perfetti: serve che siano di stasera.`,
          `You have ${ctx.flowers} of five. They don't need to be perfect: they need to be from tonight.`
        )
      ]
    };
  }

  if (ready(phase)) {
    return {
      speaker,
      lines: [
        line(
          'Cinque? Guarda che belle. La piazza sarà un quadro.',
          'Five? Look how lovely. The piazza will be a painting.'
        )
      ],
      choices: [
        { label: line('Ecco i fiori.', 'Here are the flowers.'), action: 'complete-flowers' },
        { label: line('Ancora un momento.', 'One more moment.'), action: 'close' }
      ]
    };
  }

  if (phase === 'done') {
    return {
      speaker,
      lines: [
        line(
          ctx.finaleSeen
            ? 'Tieni un petalo. Porta fortuna a chi cammina, dice mia nonna.'
            : 'Tieni un petalo. Porta fortuna a chi cammina.',
          ctx.finaleSeen
            ? 'Keep a petal. It brings luck to those who walk, my grandmother used to say.'
            : 'Keep a petal. It brings luck to those who walk.'
        )
      ]
    };
  }

  return {
    speaker,
    lines: [line('I fiori aspettano il momento giusto. Come tutto, qui.', 'The flowers wait for the right moment. Like everything here.')]
  };
}

function ninoConversation(ctx: DialogueContext): Conversation {
  const speaker = 'Nino';
  const phase = ctx.quests.bell;

  if (phase === 'locked') {
    return {
      speaker,
      lines: [
        line(
          'La campana suona solo quando il paese è pronto. Prima Ada, Elio e Marta devono avere ciò che chiedono.',
          'The bell only rings when the town is ready. First Ada, Elio and Marta must have what they ask for.'
        ),
        line(
          'Io scaldo la corda. Tu pensa al resto.',
          'I’ll keep the rope warm. You see to the rest.'
        )
      ]
    };
  }

  if (phase === 'available') {
    return {
      speaker,
      lines: [
        line(
          'Senti l’aria? È l’ora. La corda è lì, nella torre. Suona piano, poi lascia che faccia il resto.',
          'Feel the air? It’s time. The rope is there, in the tower. Ring softly, then let it do the rest.'
        )
      ],
      choices: [
        { label: line('Suono io.', "I'll ring it."), action: 'accept-bell' },
        { label: line('Ancora un momento.', 'One more moment.'), action: 'close' }
      ]
    };
  }

  if (phase === 'active') {
    return {
      speaker,
      lines: [
        line(
          'La corda ti aspetta. E il paese aspetta te.',
          'The rope is waiting. And the town is waiting for you.'
        )
      ]
    };
  }

  return {
    speaker,
    lines: [
      line(
        'Hai sentito? Tutto il paese ha sentito. Adesso la sera è nostra.',
        'Did you hear? The whole town heard. Now the evening is ours.'
      )
    ]
  };
}
