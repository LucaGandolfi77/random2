export interface RivalryLine {
  speaker: 'a' | 'b';
  text: string;
}

export interface Rivalry {
  id: string;
  a: string;
  b: string;
  title: string;
  stageHint: string;
  lines: RivalryLine[];
  outro: RivalryLine[];
}

export const RIVALRIES: Rivalry[] = [
  {
    id: 'trono-regina',
    a: '808nero',
    b: 'reinari',
    title: 'IL TRONO E LA REGINA',
    stageHint: 'the-last-festival',
    lines: [
      { speaker: 'a', text: 'Il trono l’ho costruito con le view. Tu porti solo il ventaglio.' },
      { speaker: 'b', text: 'Tesoro, le view le ho inventate io. Tu le hai solo contate.' },
      { speaker: 'a', text: 'Allora stasera ti conto le costole.' }
    ],
    outro: [
      { speaker: 'b', text: 'Il trono è vuoto. La regina è qui.' },
      { speaker: 'a', text: 'Goditi la scena. Il prossimo live è mio.' }
    ]
  },
  {
    id: 'analogico-digitale',
    a: 'tastieranera',
    b: 'glitchetta',
    title: 'ANALOGICO CONTRO DIGITALE',
    stageHint: 'studio-9b',
    lines: [
      { speaker: 'a', text: 'Le mie note pesano. Le tue esistono solo in cache.' },
      { speaker: 'b', text: 'Le tue note le ho campionate tre anni fa. Pure il tuo dolore.' },
      { speaker: 'a', text: 'Allora stasera te lo ricampiono dal vivo.' }
    ],
    outro: [
      { speaker: 'a', text: 'Il pianoforte non mente mai.' },
      { speaker: 'b', text: 'Il mio prossimo remix si chiama “Tastiera Nera”.' }
    ]
  },
  {
    id: 'luce-buio',
    a: 'velvetvera',
    b: 'nocturna',
    title: 'LUCE CONTRO BUIO',
    stageHint: 'club-verticale',
    lines: [
      { speaker: 'a', text: 'Sei bellissima quando non ti vedo.' },
      { speaker: 'b', text: 'Sei sopportabile quando non parli.' },
      { speaker: 'a', text: 'Stasera ti spengo il pubblico.' }
    ],
    outro: [
      { speaker: 'b', text: 'La luce si spegne. Il buio resta.' },
      { speaker: 'a', text: 'Il buio è solo un palco vuoto. Io lo riempio.' }
    ]
  },
  {
    id: 'assolo-coro',
    a: 'cuorestorto',
    b: 'ilcoro',
    title: 'ASSOLO CONTRO CORO',
    stageHint: 'metro-0317',
    lines: [
      { speaker: 'a', text: 'Mi avete fischiato per anni. Ora fischi il mio nome.' },
      { speaker: 'b', text: 'NOI SIAMO IL NOME. TU SEI IL FISCHIO.' },
      { speaker: 'a', text: 'Allora stasera vi faccio cantare in playback.' }
    ],
    outro: [
      { speaker: 'a', text: 'Il coro è andato a casa. L’assolo resta.' },
      { speaker: 'b', text: 'IL CORO TORNA SEMPRE. ANCHE IN BIS.' }
    ]
  },
  {
    id: 'commento-silenzio',
    a: 'commentina',
    b: 'npc404',
    title: 'IL COMMENTO CONTRO IL SILENZIO',
    stageHint: 'stadio-dei-commenti',
    lines: [
      { speaker: 'a', text: 'Sei lo sfondo. Gli sfondi non parlano.' },
      { speaker: 'b', text: 'Ciao. Sono lo sfondo. Sì, ti sto ascoltando.' },
      { speaker: 'a', text: 'Stasera ti metto in primo piano. Senza filtri.' }
    ],
    outro: [
      { speaker: 'b', text: 'Il loop è finito. Il main event sono io.' },
      { speaker: 'a', text: 'Ti do un punto. Uno. Per l’impegno.' }
    ]
  },
  {
    id: 'zia-marchio',
    a: 'zialive',
    b: 'thebrand',
    title: 'LA ZIA CONTRO IL MARCHIO',
    stageHint: 'mall-of-tomorrow',
    lines: [
      { speaker: 'a', text: 'Tesoro, tu vendi cose. Io vendo verità.' },
      { speaker: 'b', text: 'La verità è un prodotto con un ottimo margine.' },
      { speaker: 'a', text: 'Allora stasera te lo faccio un preventivo.' }
    ],
    outro: [
      { speaker: 'a', text: 'Niente pubblicità. Solo battute e disinfettante.' },
      { speaker: 'b', text: 'Questo combattimento è stato offerto da me. Comunque.' }
    ]
  },
  {
    id: 'alta-moda-bmovie',
    a: 'fashionerror',
    b: 'mrtrailer',
    title: 'ALTA MODA CONTRO B-MOVIE',
    stageHint: 'neon-rodeo',
    lines: [
      { speaker: 'a', text: 'Il tuo film l’ho visto. Mi ha rovinato la retina.' },
      { speaker: 'b', text: 'Il mio film ha fatto incassare più del tuo atelier.' },
      { speaker: 'a', text: 'Stasera ti faccio un remake. Senza budget.' }
    ],
    outro: [
      { speaker: 'a', text: 'La bellezza vince. E non fa sequel.' },
      { speaker: 'b', text: 'Questa la teniamo nel blooper. Fa ridere.' }
    ]
  },
  {
    id: 'velocita-eternita',
    a: 'aceturbo',
    b: '808nero',
    title: 'VELOCITÀ CONTRO ETERNITÀ',
    stageHint: 'pit-lane',
    lines: [
      { speaker: 'a', text: 'Tu vai lento pure in trend.' },
      { speaker: 'b', text: 'Io sono eterno. Tu sei già la scia di ieri.' },
      { speaker: 'a', text: 'Stasera ti supero in curva. E nella storia.' }
    ],
    outro: [
      { speaker: 'a', text: 'Bandiera a scacchi. Il futuro ha fretta.' },
      { speaker: 'b', text: 'Il futuro passa. La corona resta.' }
    ]
  }
];

export function getRivalry(a: string, b: string): Rivalry | undefined {
  return RIVALRIES.find(
    (rivalry) =>
      (rivalry.a === a && rivalry.b === b) || (rivalry.a === b && rivalry.b === a)
  );
}

export function getRivalryLines(a: string, b: string): RivalryLine[] {
  return getRivalry(a, b)?.lines ?? [];
}

export function getRivalryOutro(a: string, b: string): RivalryLine[] {
  return getRivalry(a, b)?.outro ?? [];
}
