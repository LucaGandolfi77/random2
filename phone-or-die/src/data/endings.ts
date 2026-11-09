import type { EndingDef, GameState } from '@/core/types';

export const endings: EndingDef[] = [
  {
    id: 'true_survival',
    title: 'The Porch Light',
    subtitle: 'You made it home before the road did.',
    text: 'Sunlight reaches the porch one inch at a time. The shadows do not vanish. They thin, like smoke remembering it used to be a fire. The phone goes quiet in your hand. Somewhere behind you, the street is a street again.',
    epilogue:
      'You do not remember every block. You remember the voices. Sophie crying with relief. Your mother saying your name like a prayer. The house warm behind you, its old line finally silent. You step inside and the morning is ordinary. It is the most beautiful thing you have ever seen.',
    color: '#d9b777',
    hint: 'Reach the porch with strong connections and make the final call count.'
  },
  {
    id: 'everyone_safe',
    title: 'Everyone Is Safe',
    subtitle: 'You warned them all from the porch, and they answered.',
    text: 'At 6:00 AM, the line opens for one last breath. You spend it saying names. Sophie. Mom. Dad. Daniel. Alex. Jessica. Mike. Priya. Every name is a window still lit. Every voice is a streetlight nobody can switch off.',
    epilogue:
      'The town wakes to eight missed calls and a road that no longer leads back to itself. None of you can explain what happened. All of you remember. On the first anniversary, you meet at the all-night diner and order too much coffee. Nobody answers their phone when it rings.',
    color: '#e5c98d',
    hint: 'Maintain high trust with the people you can reach and choose to warn them from the porch.'
  },
  {
    id: 'escape_alone',
    title: 'The Road Back',
    subtitle: 'You left the porch behind.',
    text: 'You run at 5:57 AM. The house does not chase you. It does not need to. By the time the sun touches the next street, you cannot remember the color of the front door. You cannot remember whether the voice on the last call was your mother or the thing pretending to be.',
    epilogue:
      'You survive. You move twice. You change your number. Sometimes a phone rings in an empty room and you do not answer. You are alive. You are alone. On good nights, that is enough. On bad nights, you wonder who is still walking the old road.',
    color: '#8998a4',
    hint: 'Run from the porch when the end comes, or reach dawn with too few connections.'
  },
  {
    id: 'the_truth',
    title: 'The Shape Under the Road',
    subtitle: 'You named what waited beneath the street.',
    text: 'You speak the truth of the thing in the line: the forgotten woman, the stolen daughter, the promise made by a grandmother who chose survival over mercy. The road listens. For the first time, it does not answer with a lie.',
    epilogue:
      'The line is cut at dawn. The shadows fade into a shape that could have been a woman. She looks at you with something almost like gratitude, then forgets herself into the first light. You keep the house. You keep the line disconnected. You keep the name.',
    color: '#bd8f74',
    hint: 'Discover the truth about the road, the old line, and the unknown caller.'
  },
  {
    id: 'secret',
    title: 'The Name Under the Name',
    subtitle: 'You gave the road a new story.',
    text: 'At the final call, you do not answer as Emma. You answer as the person you were before the world gave you a name. The thing on the other end recognizes itself. It remembers a mother. It remembers a field. It remembers being someone who did not want to walk home alone.',
    epilogue:
      'The sun rises over a street with no shadow. Somewhere beneath the pavement, an old line turns to ordinary wire. The erased do not return all at once. They return as choices. You walk inside with the morning behind you, carrying a name that is finally yours.',
    color: '#d8c78e',
    hint: 'Reach the unknown caller’s truth, learn Jessica’s secret, and accept the invitation at dawn.'
  },
  {
    id: 'shadows_win',
    title: 'The Quiet',
    subtitle: 'The road finished the sentence.',
    text: 'The shadows reach Emma before she finds the porch. Her phone falls to the pavement. The screen stays lit. On it, a call is still connected. The person on the other end keeps saying her name, but the street has already forgotten her.',
    epilogue:
      'The line is answered. The road gets what it wanted. Somewhere, a phone rings in another home. A voice asks a stranger: “Do you remember me?” Do not answer. Do not let the silence finish.',
    color: '#7c3c37',
    hint: 'Do not let the road take you before you reach the porch.'
  }
];

export const endingById = Object.fromEntries(endings.map((ending) => [ending.id, ending]));

export interface EndingInput {
  game: GameState;
  finalChoice: string | null;
}

export const resolveEnding = ({ game, finalChoice }: EndingInput): string => {
  if (game.threat >= 100) return 'shadows_win';
  if (game.endingId) return game.endingId;

  const flags = game.flags;
  const answered = Object.values(game.contacts).reduce((sum, contact) => sum + contact.answered, 0);
  const highTrust = Object.values(game.contacts).filter((contact) => contact.trust >= 6).length;
  const clueCount = game.clues.length;

  const secretReady =
    finalChoice === 'accept' &&
    Boolean(flags.unknown_spoke) &&
    Boolean(flags.jessica_truth) &&
    (Boolean(flags.unknown_invitation) || Boolean(flags.unknown_mara));

  if (secretReady) return 'secret';

  const truthReady =
    (finalChoice === 'confront' || finalChoice === 'accept') &&
    Boolean(flags.unknown_truth) &&
    (Boolean(flags.knows_weakness) || Boolean(flags.jessica_truth)) &&
    clueCount >= 6;

  if (truthReady) return 'the_truth';

  const everyoneSafe =
    finalChoice === 'warn' &&
    game.stats.contactsWarned >= 6 &&
    highTrust >= 4 &&
    game.threat < 80;

  if (everyoneSafe) return 'everyone_safe';

  if (finalChoice === 'run' || answered <= 2) return 'escape_alone';

  return 'true_survival';
};
