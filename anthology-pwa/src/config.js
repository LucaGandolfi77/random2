const CONFIG = {
  canvas: { width: 900, height: 640 },
  language: 'en',
  library: [
    { id: 'les_miserables', title: { en: 'Les Miserables', it: 'I Miserabili' }, author: { en: 'Victor Hugo', it: 'Victor Hugo' }, tags: ['French','Redemption','Justice'], scene: 'miserables_intro', statInit: { mem: 3, mel: 8, art: 2 } },
    { id: 'crime_punishment', title: { en: 'Crime and Punishment', it: 'Delitto e Castigo' }, author: { en: 'Fyodor Dostoevsky', it: 'Fedor Dostoevskij' }, tags: ['Russian','Psychology','Guilt'], scene: 'crime_intro', statInit: { mem: 2, mel: 10, art: 1 } },
    { id: 'recherche', title: { en: 'A la recherche', it: 'Alla ricerca' }, author: { en: 'Marcel Proust', it: 'Marcel Proust' }, tags: ['French','Memory','Contemplation'], scene: 'recherche_intro', statInit: { mem: 8, mel: 6, art: 4 } },
    { id: 'brothers_karamazov', title: { en: 'The Brothers Karamazov', it: 'I Fratelli Karamazov' }, author: { en: 'Fyodor Dostoevsky', it: 'Fedor Dostoevskij' }, tags: ['Russian','Philosophy','Faith'], scene: 'karamazov_intro', statInit: { mem: 4, mel: 7, art: 3 } },
    { id: 'divine_comedy', title: { en: 'Divina Commedia', it: 'Divina Commedia' }, author: { en: 'Dante Alighieri', it: 'Dante Alighieri' }, tags: ['Italian','Transcendence','Faith'], scene: 'dante_intro', statInit: { mem: 7, mel: 4, art: 6 } },
    { id: 'the_trial', title: { en: 'The Trial', it: 'Il Processo' }, author: { en: 'Franz Kafka', it: 'Franz Kafka' }, tags: ['German','Absurd','Melancholy'], scene: 'trial_intro', statInit: { mem: 1, mel: 11, art: 1 } },
    { id: 'anna_karenina', title: { en: 'Anna Karenina', it: 'Anna Karenina' }, author: { en: 'Leo Tolstoy', it: 'Lev Tolstoj' }, tags: ['Russian','Love','Fate','Tragedy'], scene: 'karenina_intro', statInit: { mem: 3, mel: 9, art: 3 } },
    { id: 'ivan_ilyich', title: { en: 'Death of Ivan Ilyich', it: 'La Morte di Ivan Ilic' }, author: { en: 'Leo Tolstoy', it: 'Lev Tolstoj' }, tags: ['Russian','Mortality','Contemplation','Melancholy'], scene: 'ilyich_intro', statInit: { mem: 9, mel: 12, art: 4 } },
    { id: 'dorian_gray', title: { en: 'The Picture of Dorian Gray', it: 'Il Ritratto di Dorian Gray' }, author: { en: 'Oscar Wilde', it: 'Oscar Wilde' }, tags: ['Irish','Beauty','Art','Moral Decay'], scene: 'gray_intro', statInit: { mem: 3, mel: 7, art: 9 } },
    { id: 'invisible_cities', title: { en: 'Invisible Cities', it: 'Le Citta Invisibili' }, author: { en: 'Italo Calvino', it: 'Italo Calvino' }, tags: ['Italian','Contemplation','Imagination','Memory'], scene: 'cities_intro', statInit: { mem: 11, mel: 3, art: 10 } },
    { id: 'underground', title: { en: 'Notes from Underground', it: 'Appunti dal Sottosuolo' }, author: { en: 'Fyodor Dostoevsky', it: 'Fedor Dostoevskij' }, tags: ['Russian','Isolation','Psychology','Deep'], scene: 'underground_intro', statInit: { mem: 2, mel: 14, art: 1 } },
    { id: 'recherche_archive', title: { en: 'Recherche: The Archive', it: 'Ricerca: L\'Archivio' }, author: { en: 'Marcel Proust / Multiverso', it: 'Marcel Proust / Multiverso' }, tags: ['Multiverse','Archive','Data','Memory'], scene: 'archive_intro', statInit: { mem: 12, mel: 4, art: 9 } },
    { id: 'crime_echo', title: { en: 'Crime: The Echo', it: 'Delitto: L\'Eco' }, author: { en: 'Dostoevsky / Multiverso', it: 'Dostoevskij / Multiverso' }, tags: ['Multiverse','Echo','Time','Guilt'], scene: 'echo_intro', statInit: { mem: 1, mel: 13, art: 2 } },
    { id: 'karenina_mirror', title: { en: 'Anna Karenina: The Mirror', it: 'Anna Karenina: Lo Specchio' }, author: { en: 'Tolstoy / Multiverso', it: 'Tolstoj / Multiverso' }, tags: ['Multiverse','Mirror','Loop','Fate'], scene: 'mirror_intro', statInit: { mem: 5, mel: 8, art: 4 } },
    { id: 'divina_simulation', title: { en: 'Divina: The Simulation', it: 'Divina: La Simulazione' }, author: { en: 'Dante / Multiverso', it: 'Dante / Multiverso' }, tags: ['Multiverse','Simulation','Reality','Transcendence'], scene: 'sim_intro', statInit: { mem: 6, mel: 5, art: 8 } },
    { id: 'karenina_multiverse', title: { en: 'Anna Karenina: The Algorithm', it: 'Anna Karenina: L\'Algoritmo' }, author: { en: 'Leo Tolstoy / Multiverse', it: 'Lev Tolstoj / Multiverso' }, tags: ['Multiverse','AI','Fate','Algorithm'], scene: 'karenina_multi_intro', statInit: { mem: 4, mel: 6, art: 5 } },
    { id: 'cities_multiverse', title: { en: 'Invisible Cities: The Network', it: 'Le Citta Invisibili: La Rete' }, author: { en: 'Italo Calvino / Multiverse', it: 'Italo Calvino / Multiverso' }, tags: ['Multiverse','Digital','Network','Urban'], scene: 'cities_multi_intro', statInit: { mem: 10, mel: 2, art: 11 } },
    { id: 'death_multiverse', title: { en: 'Death: The Digital Legacy', it: 'La Morte: L\'Eredita Digitale' }, author: { en: 'Leo Tolstoy / Multiverse', it: 'Lev Tolstoj / Multiverso' }, tags: ['Multiverse','Digital','Legacy','Data'], scene: 'death_multi_intro', statInit: { mem: 5, mel: 10, art: 3 } },
    { id: 'trial_multiverse', title: { en: 'The Trial: The Mirror', it: 'Il Processo: Lo Specchio' }, author: { en: 'Franz Kafka / Multiverse', it: 'Franz Kafka / Multiverso' }, tags: ['Multiverse','Mirror','Reflection','Identity'], scene: 'trial_multi_intro', statInit: { mem: 3, mel: 8, art: 4 } },
    { id: 'bible', title: { en: 'The Bible', it: 'La Bibbia' }, author: { en: 'Scripture', it: 'Scrittura Sacra' }, tags: ['Scripture','Contemplation','Very Long','Bilingual'], scene: 'genesis_intro', statInit: { mem: 4, mel: 3, art: 6 } }
  ],
  themes: { en: { memory: 'Involuntary Memory', art: 'Art', time: 'Lost Time', guilt: 'Conscience', faith: 'Transcendence' }, it: { memory: 'Memoria Involontaria', art: 'Arte', time: 'Tempo Perduto', guilt: 'Coscienza', faith: 'Trascendenza' } },
  audio: { masterVolume: 0.5, musicVolume: 0.3 }
};
export default CONFIG;
