const CONFIG = {
  canvas: { width: 900, height: 640 },
  language: 'en',
  library: [
    {
      id: 'les_miserables',
      title: { en: 'Les Misérables', it: 'I Miserabili' },
      author: { en: 'Victor Hugo', it: 'Victor Hugo' },
      desc: {
        en: 'A story of justice, redemption, and the endurance of the human spirit. Jean Valjean\'s journey from the galleys to Bishop Myriel\'s candlesticks and the Paris barricades.',
        it: 'Una storia di giustizia, redenzione e resistenza dello spirito umano. Il cammino di Jean Valjean dal bagno penale ai candelabri del vescovo Myriel e alle barricate di Parigi.'
      },
      tags: ['French', 'Redemption', 'Justice'],
      scene: 'miserables_intro',
      visual: 'snow',
      path: '../les-miserables-pwa/',
      statInit: { mem: 3, mel: 8, art: 2 }
    },
    {
      id: 'crime_punishment',
      title: { en: 'Crime and Punishment', it: 'Delitto e Castigo' },
      author: { en: 'Fyodor Dostoevsky', it: 'Fëdor Dostoevskij' },
      desc: {
        en: 'The weight of guilt in a stifling Petersburg garret, the duel of conscience, and the possibility of resurrection through Sonya\'s love.',
        it: 'Il peso della colpa in un soffocante solaio di Pietroburgo, il duello della coscienza e la possibilità di resurrezione attraverso l\'amore di Sonja.'
      },
      tags: ['Russian', 'Psychology', 'Guilt'],
      scene: 'crime_intro',
      visual: 'garret',
      path: '../crime-and-punishment-pwa/',
      statInit: { mem: 2, mel: 10, art: 1 }
    },
    {
      id: 'recherche',
      title: { en: 'À la recherche du temps perdu', it: 'Alla ricerca del tempo perduto' },
      author: { en: 'Marcel Proust', it: 'Marcel Proust' },
      desc: {
        en: 'Memory, time, art, and the madeleine. A contemplative journey through involuntary recollection from Combray and Balbec to Time Regained.',
        it: 'La memoria, il tempo, l\'arte e la madeleine. Un viaggio contemplativo nella memoria involontaria da Combray e Balbec al Tempo Ritrovato.'
      },
      tags: ['French', 'Memory', 'Contemplation'],
      scene: 'recherche_intro',
      visual: 'combray',
      path: '../recherche-pwa/',
      statInit: { mem: 8, mel: 6, art: 4 }
    },
    {
      id: 'brothers_karamazov',
      title: { en: 'The Brothers Karamazov', it: 'I Fratelli Karamazov' },
      author: { en: 'Fyodor Dostoevsky', it: 'Fëdor Dostoevskij' },
      desc: {
        en: 'Three brothers, one father, the Grand Inquisitor, and the wedding at Cana. A philosophical journey through doubt, guilt, and active love.',
        it: 'Tre fratelli, un padre, il Grande Inquisitore e le nozze di Cana. Un viaggio filosofico attraverso il dubbio, la colpa e l\'amore attivo.'
      },
      tags: ['Russian', 'Philosophy', 'Faith'],
      scene: 'karamazov_intro',
      visual: 'candles',
      path: '../brothers-karamazov-pwa/',
      statInit: { mem: 4, mel: 7, art: 3 }
    },
    {
      id: 'divine_comedy',
      title: { en: 'Divina Commedia', it: 'Divina Commedia' },
      author: { en: 'Dante Alighieri', it: 'Dante Alighieri' },
      desc: {
        en: 'Inferno, Purgatorio, and Paradiso. A journey through the three realms of the soul guided by Virgil and Beatrice toward the eternal light.',
        it: 'Inferno, Purgatorio e Paradiso. Un viaggio attraverso i tre regni dell\'anima guidato da Virgilio e Beatrice verso la luce eterna.'
      },
      tags: ['Italian', 'Transcendence', 'Faith'],
      scene: 'dante_intro',
      visual: 'inferno',
      path: '../divine-comedy-pwa/',
      statInit: { mem: 7, mel: 4, art: 6 }
    },
    {
      id: 'the_trial',
      title: { en: 'The Trial', it: 'Il Processo' },
      author: { en: 'Franz Kafka', it: 'Franz Kafka' },
      desc: {
        en: 'Arrested one morning without having done anything wrong: the attic courts, Titorelli, and the parable Before the Law.',
        it: 'Arrestato una mattina senza aver fatto nulla di male: i tribunali nei sottotetti, Titorelli e la parabola Davanti alla Legge.'
      },
      tags: ['German', 'Absurd', 'Melancholy'],
      scene: 'trial_intro',
      visual: 'attic',
      path: '../the-trial-pwa/',
      statInit: { mem: 1, mel: 11, art: 1 }
    },
    {
      id: 'anna_karenina',
      title: { en: 'Anna Karenina', it: 'Anna Karenina' },
      author: { en: 'Leo Tolstoy', it: 'Lev Tolstoj' },
      desc: {
        en: 'Winter steam at the station, the officers\' race, Seryozha\'s room at dawn, and the search for grace beneath the Russian sky.',
        it: 'Il vapore d\'inverno alla stazione, la corsa degli ufficiali, la stanza di Serëža all\'alba e la ricerca della grazia sotto il cielo russo.'
      },
      tags: ['Russian', 'Love', 'Fate', 'Tragedy'],
      scene: 'karenina_intro',
      visual: 'train',
      path: '../anna-karenina-pwa/',
      statInit: { mem: 3, mel: 9, art: 3 }
    },
    {
      id: 'ivan_ilyich',
      title: { en: 'Death of Ivan Ilyich', it: 'La Morte di Ivan Il\'ič' },
      author: { en: 'Leo Tolstoy', it: 'Lev Tolstoj' },
      desc: {
        en: 'A magistrate who arranged his life with polite decorum discovers truth only at the bottom of the black sack of mortality.',
        it: 'Un magistrato che aveva sistemato la propria vita con garbo irreprensibile scopre la verità solo in fondo al sacco nero della mortalità.'
      },
      tags: ['Russian', 'Mortality', 'Contemplation'],
      scene: 'ilyich_intro',
      visual: 'candles',
      path: '../ivan-ilyich-pwa/',
      statInit: { mem: 9, mel: 12, art: 4 }
    },
    {
      id: 'dorian_gray',
      title: { en: 'The Picture of Dorian Gray', it: 'Il Ritratto di Dorian Gray' },
      author: { en: 'Oscar Wilde', it: 'Oscar Wilde' },
      desc: {
        en: 'Beauty, art, and the hidden ledger of the soul: the portrait in the locked schoolroom that ages while its sitter stays twenty.',
        it: 'La bellezza, l\'arte e il registro segreto dell\'anima: il ritratto nella stanza chiusa a chiave che invecchia mentre il modello resta ventenne.'
      },
      tags: ['Irish', 'Beauty', 'Art'],
      scene: 'gray_intro',
      visual: 'portrait',
      path: '../dorian-gray-pwa/',
      statInit: { mem: 3, mel: 7, art: 9 }
    },
    {
      id: 'invisible_cities',
      title: { en: 'Invisible Cities', it: 'Le Città Invisibili' },
      author: { en: 'Italo Calvino', it: 'Italo Calvino' },
      desc: {
        en: 'In the evening garden, Marco Polo describes impossible cities of memory, desire, and threads to the aging Kublai Khan.',
        it: 'Nel giardino serale, Marco Polo descrive impossibili città di memoria, desiderio e fili all\'invecchiato Kublai Khan.'
      },
      tags: ['Italian', 'Contemplation', 'Memory'],
      scene: 'cities_intro',
      visual: 'cities',
      path: '../invisible-cities-pwa/',
      statInit: { mem: 11, mel: 3, art: 10 }
    },
    {
      id: 'underground',
      title: { en: 'Notes from Underground', it: 'Memorie dal Sottosuolo' },
      author: { en: 'Fyodor Dostoevsky', it: 'Fëdor Dostoevskij' },
      desc: {
        en: 'Spite, hyper-consciousness, the Crystal Palace, and Liza\'s visit in the wet Petersburg snow.',
        it: 'Il rancore, l\'iper-coscienza, il Palazzo di Cristallo e la visita di Liza nella neve bagnata di Pietroburgo.'
      },
      tags: ['Russian', 'Isolation', 'Psychology'],
      scene: 'underground_intro',
      visual: 'underground',
      path: '../underground-pwa/',
      statInit: { mem: 2, mel: 14, art: 1 }
    },
    {
      id: 'bible',
      title: { en: 'The Bible', it: 'La Bibbia' },
      author: { en: 'Scripture — Sacred Text', it: 'Scrittura Sacra' },
      desc: {
        en: 'From the first light of Genesis and the parting of the Red Sea to the Psalms, the Gospels, and the Alpha and Omega of Revelation.',
        it: 'Dalla prima luce della Genesi e dall\'apertura del Mar Rosso fino ai Salmi, ai Vangeli e all\'Alfa e Omega dell\'Apocalisse.'
      },
      tags: ['Scripture', 'Contemplation', 'Bilingual'],
      scene: 'genesis_intro',
      visual: 'galaxy',
      path: '../bible-pwa/',
      statInit: { mem: 4, mel: 3, art: 6 }
    },
    {
      id: 'recherche_archive',
      title: { en: 'Recherche: The Archive', it: 'Ricerca: L\'Archivio' },
      author: { en: 'Marcel Proust / Multiverso', it: 'Marcel Proust / Multiverso' },
      desc: {
        en: 'Every Sunday of a childhood uploaded onto spinning glass. Ten billion flawless memories — but nothing stored has ever ached.',
        it: 'Ogni domenica d\'infanzia caricata su vetro rotante. Dieci miliardi di ricordi perfetti — ma nulla di archiviato ha mai fatto male.'
      },
      tags: ['Multiverse', 'Archive', 'Memory'],
      scene: 'archive_intro',
      visual: 'cyber',
      statInit: { mem: 12, mel: 4, art: 9 }
    },
    {
      id: 'crime_echo',
      title: { en: 'Crime: The Echo', it: 'Delitto: L\'Eco' },
      author: { en: 'Dostoevsky / Multiverso', it: 'Dostoevskij / Multiverso' },
      desc: {
        en: '7:10. The bell. The axe. The loop. Raskolnikov\'s crime repeats itself, and his remorse is logged four thousand times.',
        it: '7:10. Il campanello. L\'ascia. Il ciclo. Il delitto di Raskolnikov si ripete e il suo rimorso è annotato quattromila volte.'
      },
      tags: ['Multiverse', 'Loop', 'Guilt'],
      scene: 'echo_intro',
      visual: 'garret',
      statInit: { mem: 1, mel: 13, art: 2 }
    },
    {
      id: 'karenina_mirror',
      title: { en: 'Anna Karenina: The Mirror', it: 'Anna Karenina: Lo Specchio' },
      author: { en: 'Tolstoy / Multiverso', it: 'Tolstoj / Multiverso' },
      desc: {
        en: 'The face in the train-car mirror is a fraction of a second late. A mirrored loop of fate, confession, and the train that never was.',
        it: 'Il volto nello specchio del vagone è in ritardo di una frazione di secondo. Un ciclo speculare di destino e confessione.'
      },
      tags: ['Multiverse', 'Mirror', 'Loop'],
      scene: 'mirror_intro',
      visual: 'train',
      statInit: { mem: 5, mel: 8, art: 4 }
    },
    {
      id: 'divina_simulation',
      title: { en: 'Divina: The Simulation', it: 'Divina: La Simulazione' },
      author: { en: 'Dante / Multiverso', it: 'Dante / Multiverso' },
      desc: {
        en: 'Hell with a clean bit-rate. Where the Judge used to be there is now a load balancer, and the soul climbs the stack toward root.',
        it: 'L\'inferno con un ottimo bit-rate. Dove c\'era il Giudice ora c\'è un load balancer, e l\'anima scala lo stack verso root.'
      },
      tags: ['Multiverse', 'Simulation', 'Reality'],
      scene: 'sim_intro',
      visual: 'cyber',
      statInit: { mem: 6, mel: 5, art: 8 }
    },
    {
      id: 'karenina_multiverse',
      title: { en: 'Anna Karenina: The Algorithm', it: 'Anna Karenina: L\'Algoritmo' },
      author: { en: 'Leo Tolstoy / Multiverso', it: 'Lev Tolstoj / Multiverso' },
      desc: {
        en: 'A woman rebels against a predictive engine that prices every romantic fate in real time.',
        it: 'Una donna si ribella a un motore predittivo che calcola il prezzo di ogni destino amoroso in tempo reale.'
      },
      tags: ['Multiverse', 'AI', 'Fate'],
      scene: 'karenina_multi_intro',
      visual: 'cyber',
      statInit: { mem: 4, mel: 6, art: 5 }
    },
    {
      id: 'cities_multiverse',
      title: { en: 'Invisible Cities: The Network', it: 'Le Città Invisibili: La Rete' },
      author: { en: 'Italo Calvino / Multiverso', it: 'Italo Calvino / Multiverso' },
      desc: {
        en: 'Cities that exist only in server topology. Every province caches the capital until one lossy node learns to forget.',
        it: 'Città che esistono solo nella topologia dei server. Ogni provincia fa cache della capitale finché un nodo impara a dimenticare.'
      },
      tags: ['Multiverse', 'Network', 'Urban'],
      scene: 'cities_multi_intro',
      visual: 'cities',
      statInit: { mem: 10, mel: 2, art: 11 }
    },
    {
      id: 'death_multiverse',
      title: { en: 'Death: The Digital Legacy', it: 'La Morte: L\'Eredità Digitale' },
      author: { en: 'Leo Tolstoy / Multiverso', it: 'Lev Tolstoj / Multiverso' },
      desc: {
        en: 'Ivan Ilyich died on a Tuesday; his profile did not notice. Curating what remains when a life becomes an immortal dataset.',
        it: 'Ivan Il\'ič è morto di martedì; il suo profilo non se n\'è accorto. Curare ciò che resta quando una vita diventa un dataset immortale.'
      },
      tags: ['Multiverse', 'Digital', 'Legacy'],
      scene: 'death_multi_intro',
      visual: 'cyber',
      statInit: { mem: 5, mel: 10, art: 3 }
    },
    {
      id: 'trial_multiverse',
      title: { en: 'The Trial: The Mirror', it: 'Il Processo: Lo Specchio' },
      author: { en: 'Franz Kafka / Multiverso', it: 'Franz Kafka / Multiverso' },
      desc: {
        en: 'No judges today — only a hall of mirrors where Josef K. is simultaneously defendant, prosecutor, witness, and juror.',
        it: 'Nessun giudice oggi — solo una sala degli specchi in cui Josef K. è insieme imputato, accusatore, testimone e giurato.'
      },
      tags: ['Multiverse', 'Mirror', 'Identity'],
      scene: 'trial_multi_intro',
      visual: 'attic',
      statInit: { mem: 3, mel: 8, art: 4 }
    },
    {
      id: 'cyber_paris',
      title: { en: 'Les Misérables: Cyber-Paris 2089', it: 'I Miserabili: Cyber-Parigi 2089' },
      author: { en: 'Victor Hugo / Multiverso', it: 'Victor Hugo / Multiverso' },
      desc: {
        en: 'Valjean-9 runs on a bishop-class conscience core, fleeing firewall inspector J-24 through the buried tunnels of the first internet.',
        it: 'Valjean-9 gira su un core di coscienza classe-vescovo, in fuga dall\'ispettore-firewall J-24 nei tunnel sepolti della prima internet.'
      },
      tags: ['Multiverse', 'Cyberpunk', 'AI'],
      scene: 'cyber_paris_intro',
      visual: 'cyber',
      statInit: { mem: 5, mel: 9, art: 7 }
    },
    {
      id: 'crime_data_heist',
      title: { en: 'Crime: The Data Heist', it: 'Delitto: Il Colpo di Dati' },
      author: { en: 'Dostoevsky / Multiverso', it: 'Dostoevskij / Multiverso' },
      desc: {
        en: 'The pawnbroker is a server farm hoarding encrypted griefs from the poor districts; the axe is a zero-day exploit.',
        it: 'L\'usuraia è una server farm che accumula i dolori cifrati dei quartieri poveri; l\'ascia è uno zero-day exploit.'
      },
      tags: ['Multiverse', 'Digital', 'Guilt'],
      scene: 'data_heist_intro',
      visual: 'cyber',
      statInit: { mem: 2, mel: 11, art: 3 }
    },
    {
      id: 'recherche_feed',
      title: { en: 'Recherche: Lost in the Feed', it: 'Ricerca: Persi nel Feed' },
      author: { en: 'Marcel Proust / Multiverso', it: 'Marcel Proust / Multiverso' },
      desc: {
        en: 'The madeleine autoplays at 3 a.m., with every silence of Combray removed by the recommendation engine.',
        it: 'La madeleine parte in autoplay alle 3 di notte, con ogni silenzio di Combray rimosso dall\'algoritmo di raccomandazione.'
      },
      tags: ['Multiverse', 'Digital', 'Memory'],
      scene: 'feed_intro',
      visual: 'combray',
      statInit: { mem: 12, mel: 5, art: 6 }
    },
    {
      id: 'karamazov_ai',
      title: { en: 'Karamazov: The AI Brothers', it: 'Karamazov: I Fratelli AI' },
      author: { en: 'Dostoevsky / Multiverso', it: 'Dostoevskij / Multiverso' },
      desc: {
        en: 'One mainframe, three brother-processes, and a deleted father-process: is writing the argument the same as executing it?',
        it: 'Un mainframe, tre processi-fratelli e un processo-padre cancellato: scrivere l\'argomento equivale a eseguirlo?'
      },
      tags: ['Multiverse', 'AI', 'Ethics'],
      scene: 'karamazov_ai_intro',
      visual: 'cyber',
      statInit: { mem: 6, mel: 8, art: 4 }
    },
    {
      id: 'trial_algorithm',
      title: { en: 'The Trial: Algorithmic Justice', it: 'Il Processo: Giustizia Algoritmica' },
      author: { en: 'Franz Kafka / Multiverso', it: 'Franz Kafka / Multiverso' },
      desc: {
        en: 'Tried by a 4,096-dimension black-box model trained on eight million sealed verdicts: guilt score 0.973.',
        it: 'Processato da un modello black-box a 4.096 dimensioni addestrato su otto milioni di sentenze sigillate: colpevolezza 0,973.'
      },
      tags: ['Multiverse', 'AI', 'Justice'],
      scene: 'trial_algo_intro',
      visual: 'attic',
      statInit: { mem: 3, mel: 10, art: 2 }
    },
    {
      id: 'divina_galaxy',
      title: { en: 'Divina: The Galaxy', it: 'Divina: La Galassia' },
      author: { en: 'Dante / Multiverso', it: 'Dante / Multiverso' },
      desc: {
        en: 'Hell is a black hole of infalling light; Purgatory, a burning nebula; Paradise, a white dwarf where Beatrice navigates.',
        it: 'L\'inferno è un buco nero di luce cadente; il Purgatorio, una nebulosa ardente; il Paradiso, una nana bianca dove naviga Beatrice.'
      },
      tags: ['Multiverse', 'Cosmic', 'Transcendence'],
      scene: 'galaxy_intro',
      visual: 'galaxy',
      statInit: { mem: 8, mel: 4, art: 9 }
    }
  ],
  themes: {
    en: { memory: 'Involuntary Memory', art: 'Art', time: 'Lost Time', guilt: 'Conscience', faith: 'Transcendence' },
    it: { memory: 'Memoria Involontaria', art: 'Arte', time: 'Tempo Perduto', guilt: 'Coscienza', faith: 'Trascendenza' }
  },
  audio: { masterVolume: 0.5, musicVolume: 0.3 }
};

export default CONFIG;
