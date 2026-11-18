/**
 * Fidenza da Giocare v2.13 — abitanti e dialoghi
 *
 * NPC fissi e camminanti con battute originali. Le coordinate sono punti di
 * partenza vicino ai luoghi; il mondo cerca poi uno spot libero e, per i
 * camminanti, la strada pedonale più vicina.
 */

export const NPC_FIXED = [
  {
    id: 'blue-bartender',
    name: 'Blue',
    role: 'Barista del Bar Blu Piramide',
    area: 'Le Azalee',
    x: 2078, z: 788,
    shirt: '#2f6fa8', pants: '#1d2b3a', skin: '#d8aa85', hair: '#2d2119',
    lines: [
      'Benvenuto al Bar Blu Piramide, l’ultimo bancone prima della campagna.',
      'Qui passano corrieri, ciclisti e gente che ha voglia di raccontare una storia.',
      'Se ti fermi al tramonto, l’insegna blu si accende e la piazza diventa un set fotografico.'
    ],
    hint: 'Consiglio: apri il Diario di Fidenza dal menu pausa e leggi la Gazzetta.'
  },
  {
    id: 'giulia-duomo',
    name: 'Giulia',
    role: 'Guida del Duomo',
    area: 'Piazza Duomo',
    x: -283, z: 8,
    shirt: '#7a5a8a', pants: '#3a3f46', skin: '#d8aa85', hair: '#3a2a20',
    lines: [
      'Benvenuto davanti al Duomo di San Donnino. La facciata racconta secoli di fede e di cantiere.',
      'Il rosone e i bassorilievi meritano una sosta: qui la pietra diventa un libro illustrato.',
      'Se vuoi vedere la città dall’alto, prova il volo: si apre un panorama che pochi conoscono.'
    ],
    hint: 'Consiglio: premi V per volare e osservare Piazza Duomo dall’alto.'
  },
  {
    id: 'marco-fotografo',
    name: 'Marco',
    role: 'Fotografo',
    area: 'Piazza Duomo',
    x: -305, z: 12,
    shirt: '#4f8fa8', pants: '#2f4a3c', skin: '#c99a78', hair: '#2d2119',
    lines: [
      'La luce migliore per la facciata arriva nel pomeriggio, quando il marmo si scalda.',
      'Con la modalità foto puoi scegliere ora, stagione e cornice: ogni scatto diventa una cartolina.',
      'Se fotografi il Duomo, il gioco se ne ricorda.'
    ],
    hint: 'Consiglio: premi P per aprire la modalità foto.'
  },
  {
    id: 'rosa-mercato',
    name: 'Rosa',
    role: 'Contadina del mercato',
    area: 'Piazza Duomo',
    x: -290, z: -18,
    shirt: '#c2684b', pants: '#5b4a3a', skin: '#d8aa85', hair: '#4a3326',
    lines: [
      'Il mercato del mercoledì e del sabato riempie la piazza di profumi e voci.',
      'Torta fritta, culatello e gnocco fritto: qui si viene per mangiare, non solo per guardare.',
      'A San Donnino la festa è ancora più grande: processione, bancarelle e fuochi.'
    ],
    hint: 'Consiglio: controlla la card “Oggi in città” per gli eventi.'
  },
  {
    id: 'pietro-giornalaio',
    name: 'Pietro',
    role: 'Giornalaio',
    area: 'Piazza Garibaldi',
    x: 8, z: -16,
    shirt: '#5c6b5f', pants: '#3a3f46', skin: '#c99a78', hair: '#3a2a20',
    lines: [
      'Le notizie migliori arrivano sempre a piedi, tra una piazza e l’altra.',
      'Se cerchi qualcosa da fare, il tabellone delle missioni è il posto giusto.',
      'E se vedi una bici, salta in sella: in centro è il modo più svelto di muoversi.'
    ],
    hint: 'Consiglio: apri le missioni con F.'
  },
  {
    id: 'anna-artigiana',
    name: 'Anna',
    role: 'Artigiana',
    area: 'Piazza Garibaldi',
    x: 24, z: -28,
    shirt: '#c99a3f', pants: '#2f4a3c', skin: '#d8aa85', hair: '#2d2119',
    lines: [
      'Le mie mani lavorano la ceramica, ma la fantasia gira per tutta Fidenza.',
      'Ogni insegna del centro racconta un mestiere: guardale mentre passeggi.',
      'Le storie migliori non sono nei libri, sono nelle persone che incontri.'
    ],
    hint: 'Consiglio: parla con gli abitanti che hanno l’icona 💬.'
  },
  {
    id: 'luca-teatro',
    name: 'Luca',
    role: 'Maschera del teatro',
    area: 'Teatro Magnani',
    x: -86, z: 64,
    shirt: '#3f5f7a', pants: '#2f4a3c', skin: '#c99a78', hair: '#2d2119',
    lines: [
      'Il Teatro Girolamo Magnani si accende nelle serate speciali.',
      'Se vedi il tappeto rosso, c’è uno spettacolo in arrivo.',
      'Il nome del teatro ricorda uno scenografo fidentino famoso in tutto il mondo.'
    ],
    hint: 'Consiglio: gli eventi al teatro aggiungono lavori speciali.'
  },
  {
    id: 'chiara-stazione',
    name: 'Chiara',
    role: 'Capostazione',
    area: 'Stazione di Fidenza',
    x: 181, z: -117,
    shirt: '#2f6b4f', pants: '#3a3f46', skin: '#d8aa85', hair: '#3a2a20',
    lines: [
      'La stazione è il cuore dei viaggi: da qui parte chi va verso Parma, Piacenza o Cremona.',
      'La navetta urbana collega stazione, Duomo, Teatro e Gran Madre.',
      'All’ora di punta la banchina si riempie: è il momento più vivo della giornata.'
    ],
    hint: 'Consiglio: prova le missioni Coincidenza e Ultimo treno.'
  },
  {
    id: 'bianca-parco',
    name: 'Bianca',
    role: 'Jogger',
    area: 'Parco Vittorio Veneto',
    x: -228, z: 602,
    shirt: '#c2684b', pants: '#3a3f46', skin: '#d8aa85', hair: '#2d2119',
    lines: [
      'Corro qui ogni mattina: l’aria del parco è tutta un’altra cosa.',
      'Le bici sono il modo migliore per esplorare i viali senza stancarsi.',
      'Se trovi una bici libera, salta in sella e raggiungi il centro in pochi minuti.'
    ],
    hint: 'Consiglio: usa il pulsante Bici su mobile o E vicino a una bici.'
  },
  {
    id: 'samuele-parco',
    name: 'Samuele',
    role: 'Nonno del parco',
    area: 'Parco Vittorio Veneto',
    x: -244, z: 626,
    shirt: '#7c8d5b', pants: '#5b4a3a', skin: '#c99a78', hair: '#d9d2c4',
    lines: [
      'Da ragazzo il parco era un prato, oggi è il polmone verde della città.',
      'Il torrente Stirone scorre lì vicino e dà il nome al parco regionale.',
      'Cammina piano, guarda gli alberi e ascolta: Fidenza ha sempre qualcosa da raccontare.'
    ],
    hint: 'Consiglio: cerca le stelle nascoste tra gli alberi.'
  },
  {
    id: 'paolo-granmadre',
    name: 'Paolo',
    role: 'Volontario',
    area: 'Gran Madre',
    x: 407, z: 141,
    shirt: '#8a6a3a', pants: '#2f4a3c', skin: '#d8aa85', hair: '#3a2a20',
    lines: [
      'La Gran Madre è un santuario caro ai fidentini.',
      'Chi arriva da lontano si ferma qui prima di entrare in città.',
      'Se hai tempo, sali fino alla chiesa: la vista ripaga la camminata.'
    ],
    hint: 'Consiglio: scopri il luogo con E e poi scatta una foto.'
  },
  {
    id: 'francesca-verdi',
    name: 'Francesca',
    role: 'Commessa',
    area: 'Piazza Verdi',
    x: -12, z: 100,
    shirt: '#7a5a8a', pants: '#3a3f46', skin: '#c99a78', hair: '#2d2119',
    lines: [
      'Piazza Verdi è un salotto tranquillo, lontano dal traffico.',
      'Qui le botteghe conoscono i clienti per nome.',
      'Se cerchi un regalo, guarda le insegne: ognuna ha una storia.'
    ],
    hint: 'Consiglio: esplora le piazze minori per trovare stelle e luoghi.'
  },
  {
    id: 'nadia-farmacia',
    name: 'Nadia',
    role: 'Farmacista',
    area: 'Farmacia Cavour',
    x: -62, z: -2,
    shirt: '#2f6b4f', pants: '#3a3f46', skin: '#d8aa85', hair: '#4a3326',
    lines: [
      'La Farmacia Cavour è un punto di riferimento per tutto il centro.',
      'Le consegne urgenti all’ospedale partono spesso da qui.',
      'Se accetti un lavoro da corriere, ricorda: la fretta non deve farti sbagliare strada.'
    ],
    hint: 'Consiglio: la missione Consegna urgente parte dalla farmacia.'
  }
];

export const NPC_WALKERS = [
  {
    id: 'sofia-studentessa',
    name: 'Sofia',
    role: 'Studentessa',
    area: 'Via Emilia',
    x: -150, z: 0,
    shirt: '#4f8fa8', pants: '#3a3f46', skin: '#d8aa85', hair: '#2d2119',
    lines: [
      'Vado all’università a piedi: il centro è tutto a portata.',
      'La Via Francigena passa da Fidenza: i pellegrini si riconoscono dallo zaino.',
      'Se incontri un pellegrino, aiutalo: la strada è lunga.'
    ],
    hint: 'Consiglio: la missione Il pellegrino parte dalla stazione.'
  },
  {
    id: 'davide-barista',
    name: 'Davide',
    role: 'Barista',
    area: 'Piazza Duomo',
    x: -296, z: -4,
    shirt: '#c2684b', pants: '#2f4a3c', skin: '#c99a78', hair: '#3a2a20',
    lines: [
      'Un caffè al banco e la giornata parte meglio.',
      'Il mercoledì e il sabato la piazza si riempie di bancarelle.',
      'I clienti più mattinieri conoscono tutti i segreti del centro.'
    ],
    hint: 'Consiglio: parla con chi incontri al mercato.'
  },
  {
    id: 'omar-pendolare',
    name: 'Omar',
    role: 'Pendolare',
    area: 'Stazione',
    x: 186, z: -102,
    shirt: '#5c6b5f', pants: '#3a3f46', skin: '#c99a78', hair: '#2d2119',
    lines: [
      'Prendo il treno ogni giorno: la stazione è la mia seconda casa.',
      'La navetta è comoda, ma la bici è più veloce per le vie del centro.',
      'Se perdi una coincidenza, guarda il tabellone: c’è sempre un’altra corsa.'
    ],
    hint: 'Consiglio: la navetta passa da quattro fermate.'
  },
  {
    id: 'enrico-ciclista',
    name: 'Enrico',
    role: 'Ciclista urbano',
    area: 'Piazza Matteotti',
    x: 44, z: 109,
    shirt: '#c99a3f', pants: '#2f4a3c', skin: '#d8aa85', hair: '#3a2a20',
    lines: [
      'In bici scopri angoli che in auto non vedresti mai.',
      'Le bici sono segnate in oro sulla mappa: cercale quando sei a piedi.',
      'Se sei su mobile, il pulsante Bici ti porta in sella alla più vicina.'
    ],
    hint: 'Consiglio: il pulsante Bici funziona entro 8 metri.'
  },
  {
    id: 'elena-fioraia',
    name: 'Elena',
    role: 'Fioraia',
    area: 'Piazza Matteotti',
    x: 50, z: 100,
    shirt: '#b18bd0', pants: '#5b4a3a', skin: '#d8aa85', hair: '#4a3326',
    lines: [
      'I fiori cambiano colore con le stagioni, come la città.',
      'In primavera le piazze si riempiono di profumi.',
      'Se scatti una foto ai fiori, scegli la stagione giusta.'
    ],
    hint: 'Consiglio: cambia stagione dal menu pausa.'
  },
  {
    id: 'marta-libraia',
    name: 'Marta',
    role: 'Libraia',
    area: 'Piazza Repubblica',
    x: 195, z: -103,
    shirt: '#7a5a8a', pants: '#3a3f46', skin: '#c99a78', hair: '#2d2119',
    lines: [
      'I libri e le mappe hanno una cosa in comune: ti fanno viaggiare.',
      'La mappa grande mostra stelle, luoghi, POI e bici.',
      'Se ti perdi, aprila con N: Fidenza è più piccola di quanto sembri.'
    ],
    hint: 'Consiglio: apri la mappa con N o dal menu rapido.'
  }
];

export const NPC_ALL = [...NPC_FIXED, ...NPC_WALKERS];
