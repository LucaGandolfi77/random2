import type { Conversation, DialogueContext, Localized, NpcId, QuestPhase } from './types';

function ready(phase: QuestPhase): boolean {
  return phase === 'objective';
}

function line(it: string, en: string): Localized {
  return { it, en };
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
    case 'beppe':
      return beppeConversation(ctx);
    case 'lidia':
      return lidiaConversation(ctx);
    case 'sara':
      return saraConversation(ctx);
  }
}

function adaConversation(ctx: DialogueContext): Conversation {
  const speaker = 'Ada';
  const phase = ctx.quests.bread;

  if (phase === 'available') {
    return {
      speaker,
      lines: [
        line(
          'Sei arrivato col profumo del forno, vero? Il pane per il teatro è pronto, ma io non posso lasciare la madia.',
          'You arrived with the smell of the oven, didn’t you? The bread for the theatre is ready, but I can’t leave the counter.'
        ),
        line(
          'Portalo al Teatro Magnani, dall’altra parte del centro. Chiedi di Lidia, lei sa dove metterlo.',
          'Take it to the Teatro Magnani, on the other side of the centre. Ask for Lidia, she’ll know where it goes.'
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
          'Il teatro è oltre Piazza Garibaldi, verso sud-est. Non farlo raffreddare.',
          'The theatre is past Piazza Garibaldi, to the south-east. Don’t let it go cold.'
        )
      ]
    };
  }

  if (phase === 'done') {
    return {
      speaker,
      lines: [
        line(
          ctx.finaleSeen
            ? 'Hai sentito la campana? Adesso sì che è sera. Il pane è arrivato e il teatro è pieno.'
            : 'L’hai consegnato? Sento già il profumo fin qui. Grazie, forestiero.',
          ctx.finaleSeen
            ? 'Did you hear the bell? Now it really is evening. The bread arrived and the theatre is full.'
            : 'Delivered? I can smell it from here. Thank you, wayfarer.'
        )
      ]
    };
  }

  return {
    speaker,
    lines: [line('Il forno è caldo. La città comincia quando qualcuno ha fame.', 'The oven is warm. The town begins when someone is hungry.')]
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
          'Tre lettere mi sono volate via dal cestino, tra la Porta e la stazione. Tre! E io ho le gambe di un altro secolo.',
          'Three letters blew out of my basket, between the Porta and the station. Three! And I have another century’s legs.'
        ),
        line(
          'Guarda lungo Via Emilia e intorno a Piazza Garibaldi. Non leggerle: sono storie di altri.',
          'Look along the Via Emilia and around Piazza Garibaldi. Don’t read them: they’re other people’s stories.'
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
          `You’ve found ${ctx.letters} of three. The wind always takes them where you aren’t looking.`
        )
      ]
    };
  }

  if (ready(phase)) {
    return {
      speaker,
      lines: [
        line(
          'Tutte e tre? Anche quella per la stazione? Sei meglio del servizio postale.',
          'All three? Even the one for the station? You’re better than the postal service.'
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
            : 'Se passi dalla stazione, salutami i treni. Partono sempre senza di me.',
          ctx.finaleSeen
            ? 'One letter at a time, the world stays in touch. Enjoy the walk, wayfarer.'
            : 'If you pass the station, say hello to the trains for me. They always leave without me.'
        )
      ]
    };
  }

  return {
    speaker,
    lines: [line('Il vento di oggi ha una fretta strana.', 'Today’s wind is in a strange hurry.')]
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
          'Crescono al Parco all’aperto e verso Piazza Verdi. Raccogli quelli che profumano di sera.',
          'They grow in the open-air park and towards Piazza Verdi. Pick the ones that smell of evening.'
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
          `You have ${ctx.flowers} of five. They don’t need to be perfect: they need to be from tonight.`
        )
      ]
    };
  }

  if (ready(phase)) {
    return {
      speaker,
      lines: [
        line(
          'Cinque? Guarda che belle. Piazza Verdi sarà un quadro.',
          'Five? Look how lovely. Piazza Verdi will be a painting.'
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

function beppeConversation(ctx: DialogueContext): Conversation {
  const speaker = 'Beppe';
  const phase = ctx.quests.newspaper;

  if (phase === 'available') {
    return {
      speaker,
      lines: [
        line(
          'Edicola aperta, testa già altrove. Ho un giornale per il capostazione, ma se mi allontano chiudo il banco.',
          'Newsstand open, head already elsewhere. I have a newspaper for the stationmaster, but if I leave the stall closes.'
        ),
        line(
          'La stazione è in fondo a Piazza della Repubblica. Consegna e torna a raccontarmi la faccia che ha fatto.',
          'The station is at the end of Piazza della Repubblica. Deliver it and come back to tell me the face he made.'
        )
      ],
      choices: [
        { label: line('Vado io.', "I'll go."), action: 'accept-newspaper' },
        { label: line('Non ora.', 'Not now.'), action: 'close' }
      ]
    };
  }

  if (phase === 'active') {
    return {
      speaker,
      lines: [
        line(
          'La stazione, binario uno. Se vedi Sara al bar, dille che il caffè è ancora mio.',
          'The station, platform one. If you see Sara at the bar, tell her the coffee is still on me.'
        )
      ]
    };
  }

  return {
    speaker,
    lines: [
      line(
        ctx.finaleSeen
          ? 'La città stasera ha più notizie del giornale. Buona passeggiata.'
          : 'Giornale consegnato? Allora la giornata può cominciare.',
        ctx.finaleSeen
          ? 'Tonight the town has more news than the paper. Enjoy the walk.'
          : 'Paper delivered? Then the day can begin.'
      )
    ]
  };
}

function lidiaConversation(ctx: DialogueContext): Conversation {
  const speaker = 'Lidia';
  const phase = ctx.quests.book;

  if (phase === 'available') {
    return {
      speaker,
      lines: [
        line(
          'Ho trovato un libro con una dedica sul retro. Non è mio, e non è della biblioteca.',
          'I found a book with an inscription inside. It isn’t mine, and it isn’t the library’s.'
        ),
        line(
          'La dedica parla di San Pietro. Portalo là, qualcuno lo sta aspettando da troppo tempo.',
          'The inscription mentions San Pietro. Take it there, someone has been waiting far too long.'
        )
      ],
      choices: [
        { label: line('Lo riporto io.', "I'll take it back."), action: 'accept-book' },
        { label: line('Più tardi.', 'Later.'), action: 'close' }
      ]
    };
  }

  if (phase === 'active') {
    return {
      speaker,
      lines: [
        line(
          'San Pietro è a sud, oltre Via Emilia. La chiesa è silenziosa: bussa piano.',
          'San Pietro is south, beyond the Via Emilia. The church is quiet: knock softly.'
        )
      ]
    };
  }

  return {
    speaker,
    lines: [
      line(
        ctx.finaleSeen
          ? 'Un libro torna a casa e la città ricorda una voce in più. Grazie.'
          : 'Il libro è tornato? Allora stasera posso leggere qualcos’altro.',
        ctx.finaleSeen
          ? 'A book comes home and the town remembers one more voice. Thank you.'
          : 'The book is back? Then tonight I can read something else.'
      )
    ]
  };
}

function saraConversation(ctx: DialogueContext): Conversation {
  const speaker = 'Sara';
  const phase = ctx.quests.coffee;

  if (phase === 'available') {
    return {
      speaker,
      lines: [
        line(
          'Il treno delle sette ha portato ritardo e buone maniere. Il caffè per il Comune è pronto, ma il banco non si muove.',
          'The seven o’clock train brought delays and good manners. The coffee for the Town Hall is ready, but the counter doesn’t move.'
        ),
        line(
          'Palazzo Comunale, Piazza Garibaldi. Consegnalo ancora caldo, o tanto vale berlo io.',
          'Town Hall, Piazza Garibaldi. Deliver it while it’s hot, or I might as well drink it.'
        )
      ],
      choices: [
        { label: line('Lo porto io.', "I'll take it."), action: 'accept-coffee' },
        { label: line('Non ora.', 'Not now.'), action: 'close' }
      ]
    };
  }

  if (phase === 'active') {
    return {
      speaker,
      lines: [
        line(
          'Il Comune è dietro Piazza Garibaldi. Se arrivi freddo, non dire che sei passato da me.',
          'The Town Hall is behind Piazza Garibaldi. If it arrives cold, don’t say you came from me.'
        )
      ]
    };
  }

  return {
    speaker,
    lines: [
      line(
        ctx.finaleSeen
          ? 'La sera è lunga e il caffè è finito. Ne preparo un altro?'
          : 'Caffè consegnato? Allora il Comune è sveglio. Per oggi.',
        ctx.finaleSeen
          ? 'The evening is long and the coffee is gone. Shall I make another?'
          : 'Coffee delivered? Then the Town Hall is awake. For today.'
      )
    ]
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
          'La campana suona solo quando il centro è pronto. Prima Ada, Elio e Marta devono avere ciò che chiedono.',
          'The bell only rings when the centre is ready. First Ada, Elio and Marta must have what they ask for.'
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
          'Senti l’aria? È l’ora. La corda è nel campanile accanto al Duomo. Suona piano, poi lascia che faccia il resto.',
          'Feel the air? It’s time. The rope is in the bell tower beside the cathedral. Ring softly, then let it do the rest.'
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
          'La corda ti aspetta. E il centro aspetta te.',
          'The rope is waiting. And the centre is waiting for you.'
        )
      ]
    };
  }

  return {
    speaker,
    lines: [
      line(
        'Hai sentito? Tutta Fidenza ha sentito. Adesso la sera è nostra.',
        'Did you hear? All of Fidenza heard. Now the evening is ours.'
      )
    ]
  };
}
