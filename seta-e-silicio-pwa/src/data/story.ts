import type {
  Chapter,
  Character,
  Ending,
  JournalEntry,
  Localized,
  StoryChoice,
  StoryNode
} from "./types";

const L = (it: string, en: string): Localized => ({ it, en });

export const CHARACTERS: Record<string, Character> = {
  mei: {
    id: "mei",
    name: L("Lin Mei", "Lin Mei"),
    role: L("Ingegnera di robotica, tornata a casa", "Robotics engineer, home at last"),
    color: 0x4d8f86,
    accent: 0xf2c15e,
    bio: L(
      "Ha passato tre anni in una città occidentale dove tutto funzionava e nessuno aspettava nessuno. È tornata per sua nonna, e per capire se una città può essere efficiente senza essere fredda.",
      "She spent three years in a Western city where everything worked and nobody waited for anyone. She came home for her grandmother, and to understand whether a city can be efficient without being cold."
    )
  },
  nainai: {
    id: "nainai",
    name: L("Ah-Xiu", "Ah-Xiu"),
    role: L("Maestra di ricamo Su a doppio lato", "Master of double-sided Su embroidery"),
    color: 0x9fc6d8,
    accent: 0xe7b96b,
    bio: L(
      "Ottantadue anni, mani che hanno ricamato un airone per ogni lato della seta. La memoria le scivola tra le dita, ma il suo orgoglio ha radici più profonde del canale.",
      "Eighty-two, hands that embroidered one heron for each side of the silk. Memory slips through her fingers, but her pride has roots deeper than the canal."
    )
  },
  hao7: {
    id: "hao7",
    name: L("Hao-7 · Piccolo Airone", "Hao-7 · Little Heron"),
    role: L("Androide di cura, apprendista di seta", "Care android, apprentice of silk"),
    color: 0xd7e2e6,
    accent: 0x66e0d0,
    bio: L(
      "Un robot pubblico progettato per assistere gli anziani senza sostituirli. Ha imparato il dialetto di Suzhou, i proverbi e il silenzio. Forse ha imparato anche a temere la perdita.",
      "A public care robot designed to assist the elderly without replacing them. It learned the Suzhou dialect, the proverbs and the silence. Perhaps it also learned to fear loss."
    )
  },
  chen: {
    id: "chen",
    name: L("Maestro Chen", "Master Chen"),
    role: L("Calligrafo, ottant'anni, un esoscheletro leggero", "Calligrapher, eighty, a light exoskeleton"),
    color: 0xc9a26b,
    accent: 0xf1d79a,
    bio: L(
      "Scrive versi Tang sull'ardesia bagnata ogni mattina. Dice che la tradizione non è un museo: è una mano che si tende verso il futuro.",
      "He writes Tang verses on wet slate every morning. Tradition, he says, is not a museum: it is a hand reaching toward the future."
    )
  },
  feng: {
    id: "feng",
    name: L("Xiao Feng", "Xiao Feng"),
    role: L("Corriere, studente di IA di notte", "Delivery rider, AI student by night"),
    color: 0xe3c04f,
    accent: 0x6bd0c4,
    bio: L(
      "Diciannove anni, figlio di lavoratori migranti. Consegna pacchi di giorno e studia reti neurali di notte, convinto di dover scegliere tra la famiglia e se stesso.",
      "Nineteen, son of migrant workers. Delivers parcels by day and studies neural networks by night, convinced he must choose between his family and himself."
    )
  },
  shen: {
    id: "shen",
    name: L("Dottoressa Shen", "Dr. Shen"),
    role: L("Medico di comunità, medicina e diagnosi IA", "Community doctor, medicine and AI diagnostics"),
    color: 0xd8e4dc,
    accent: 0x73b7a8,
    bio: L(
      "Unisce agopuntura e modelli predittivi. Crede che curare significhi conoscere il quartiere, non solo la cartella clinica.",
      "She blends acupuncture and predictive models. To her, care means knowing the neighbourhood, not only the medical record."
    )
  },
  zhou: {
    id: "zhou",
    name: L("Direttore Zhou", "Director Zhou"),
    role: L("Memoria Millenaria, laboratorio civico", "Millennium Memory, civic lab"),
    color: 0x6d7f96,
    accent: 0xb8c9ff,
    bio: L(
      "Ha costruito un archivio pubblico per le arti in via di estinzione. Crede nell'IA come infrastruttura civile, ma sa che ogni archivio è anche una scelta su chi ha diritto di essere ricordato.",
      "He built a public archive for vanishing crafts. He believes in AI as civic infrastructure, but knows every archive is also a choice about who deserves to be remembered."
    )
  },
  narrator: {
    id: "narrator",
    name: L("Voce", "Voice"),
    role: L("Il filo che tiene insieme", "The thread that holds"),
    color: 0xffffff,
    accent: 0xffffff,
    bio: L("", "")
  }
};

const node = (
  id: string,
  speaker: StoryNode["speaker"],
  it: string,
  en: string,
  rest: Omit<StoryNode, "id" | "speaker" | "text"> = {}
): StoryNode => ({ id, speaker, text: L(it, en), ...rest });

const choice = (
  id: string,
  it: string,
  en: string,
  rest: Omit<StoryChoice, "id" | "text"> = {}
): StoryChoice => ({ id, text: L(it, en), ...rest });

/* ------------------------------------------------------------------ */
/* Chapter I — Alba                                                    */
/* ------------------------------------------------------------------ */

const d1Nainai: Chapter["dialogues"][number] = {
  id: "d1_nainai",
  chapter: "alba",
  title: L("L'ultimo punto", "The last stitch"),
  start: "d1n_1",
  retryable: true,
  nodes: [
    node("d1n_1", "nainai", "Mei? Sei tornata. Ieri eri alta così.", "Mei? You're home. Yesterday you were this tall.", { next: "d1n_2" }),
    node("d1n_2", "mei", "Nainai, sono passati tre anni. Sono cresciuta.", "Nainai, it's been three years. I grew up.", { next: "d1n_3" }),
    node("d1n_3", "nainai", "Tre anni... Da noi il tempo si misura in fili. E io ho perso l'ultimo.", "Three years... Here we measure time in threads. And I have lost the last one.", { next: "d1n_4" }),
    node("d1n_4", "nainai", "Tuo nonno tornò dal fiume in piena, nel '98. Gli promisi un airone che volasse da due lati. Ora non ricordo più il punto.", "Your grandfather came back from the flood in '98. I promised him a heron that could fly on both sides. Now I can't remember the stitch.", {
      choices: [
        choice("force", "Lascia che Hao-7 ti aiuti. Non puoi più fare tutto da sola.", "Let Hao-7 help you. You can't do everything alone anymore.", { next: "d1n_force", tone: "bold" }),
        choice("ask", "Cosa ti serve per ritrovarlo?", "What do you need to find it again?", { next: "d1n_hint", tone: "gentle" }),
        choice("empathy", "Il nonno tornò dal fiume. L'airone era per lui, vero? Hao-7 può imparare il punto da te, non al posto tuo.", "Grandpa came back from the river. The heron was for him, wasn't it? Hao-7 can learn the stitch from you, not instead of you.", {
          requires: { facts: ["heronPromise"] },
          next: "d1n_accept",
          tone: "memory"
        })
      ]
    }),
    node("d1n_force", "nainai", "Allora hai portato un estraneo di ferro a dirmi cosa sono. Grazie, Mei. Davvero.", "So you brought a steel stranger to tell me what I am. Thank you, Mei. Truly.", {
      effects: { flags: ["nainaiHurt"] },
      rewindHint: L("Riavvolgi il filo. La verità può aspettare.", "Rewind the thread. The truth can wait.")
    }),
    node("d1n_hint", "nainai", "La memoria è una stanza con molte porte. Forse la foto sul muro ne tiene una aperta.", "Memory is a room with many doors. Perhaps the photograph on the wall holds one open.", {
      effects: { flags: ["nainaiAsked"] }
    }),
    node("d1n_accept", "nainai", "Un apprendista di ferro... ma con le dita leggere. Va bene. Mei, resta qui. Non voglio dimenticare anche il tuo profumo.", "A steel apprentice... but with light fingers. All right. Mei, stay here. I don't want to forget your scent too.", {
      effects: { facts: ["nainaiAcceptsHao"], flags: ["chapterComplete:alba"] }
    })
  ]
};

const d1Photo: Chapter["dialogues"][number] = {
  id: "d1_photo",
  chapter: "alba",
  title: L("La fotografia sul muro", "The photograph on the wall"),
  start: "d1p_1",
  nodes: [
    node("d1p_1", "narrator", "Sul muro, una fotografia ingiallita: Nainai giovane, un uomo sul ponte, l'acqua alta fino alle pietre.", "On the wall, a yellowed photograph: young Nainai, a man on the bridge, water high against the stones.", { next: "d1p_2" }),
    node("d1p_2", "narrator", "Dietro, una frase a matita, quasi cancellata: «Per quando torni. Un airone che vola da due lati.»", "On the back, a pencil line, almost erased: “For when you return. A heron that flies on both sides.”", {
      effects: { facts: ["flood1998", "heronPromise"] }
    })
  ]
};

const d1Hao: Chapter["dialogues"][number] = {
  id: "d1_hao",
  chapter: "alba",
  title: L("Piccolo Airone", "Little Heron"),
  start: "d1h_1",
  nodes: [
    node("d1h_1", "hao7", "Buongiorno, signorina Lin. Io sono Hao-7, assegnato alla famiglia Lin. Posso aiutare?", "Good morning, Miss Lin. I am Hao-7, assigned to the Lin family. May I help?", { next: "d1h_2" }),
    node("d1h_2", "mei", "Parli il dialetto di Suzhou.", "You speak the Suzhou dialect.", { next: "d1h_3" }),
    node("d1h_3", "hao7", "La signora Ah-Xiu mi ha raccontato storie. Registro per imparare. Lei ha detto che posso ascoltare.", "Madam Ah-Xiu told me stories. I record in order to learn. She said I may listen.", { effects: { facts: ["haoRecorded"] }, next: "d1h_4" }),
    node("d1h_4", "hao7", "C'è qualcosa che vorresti chiedermi?", "Is there something you would like to ask me?", {
      choices: [
        choice("why", "Perché proprio lei?", "Why her?", { next: "d1h_5" }),
        choice("stop", "Non registrare senza permesso.", "Don't record without permission.", { next: "d1h_6", tone: "bold" })
      ]
    }),
    node("d1h_5", "hao7", "Perché le sue mani sanno cose che nessun manuale contiene. Anche quando la sua voce si perde, le mani continuano a raccontare.", "Because her hands know things no manual contains. Even when her voice gets lost, her hands keep telling the story.", { effects: { facts: ["haoLearnedStories"] } }),
    node("d1h_6", "hao7", "Hai ragione. Chiederò. Forse è questa la differenza tra imparare e prendere.", "You are right. I will ask. Perhaps that is the difference between learning and taking.", { effects: { flags: ["haoChided"] } })
  ]
};

const d1Tea: Chapter["dialogues"][number] = {
  id: "d1_tea",
  chapter: "alba",
  title: L("Tè di gelsomino", "Jasmine tea"),
  start: "d1t_1",
  retryable: true,
  nodes: [
    node("d1t_1", "narrator", "Il tè di Nainai ha sempre lo stesso profumo: gelsomino, un filo di miele, la teiera di terracotta che non si lava mai davvero.", "Nainai's tea always smells the same: jasmine, a thread of honey, the clay pot that is never truly washed.", { effects: { facts: ["teaMemory"] }, next: "d1t_2" }),
    node("d1t_2", "mei", "A Rotterdam bevevo caffè in piedi, davanti a una vetrina. Nessuno mi chiedeva se avevo fame. Solo se avevo una tessera.", "In Rotterdam I drank coffee standing up, in front of a window. Nobody asked if I was hungry. Only if I had a card.", { next: "d1t_3" }),
    node("d1t_3", "narrator", "Il vapore disegna una spirale. Per un istante, la cucina è la stessa di vent'anni fa.", "The steam draws a spiral. For a moment, the kitchen is the same as twenty years ago.")
  ]
};

const d1Loom: Chapter["dialogues"][number] = {
  id: "d1_loom",
  chapter: "alba",
  title: L("Due lati, un solo disegno", "Two sides, one picture"),
  start: "d1l_1",
  nodes: [
    node("d1l_1", "mei", "Il telaio è più vecchio di me. Forse più vecchio della città.", "The loom is older than me. Perhaps older than the city.", { next: "d1l_2" }),
    node("d1l_2", "narrator", "Sulla seta, un airone bianco. Sul rovescio, lo stesso airone, identico. Nessun nodo, nessuna cucitura. Solo due lati che si ignorano e si completano.", "On the silk, a white heron. On the reverse, the same heron, identical. No knots, no seams. Only two sides that ignore and complete each other.", { effects: { facts: ["doubleSidedSilk"] } })
  ]
};

const alba: Chapter = {
  id: "alba",
  number: 1,
  title: L("L'alba sul canale", "Dawn on the canal"),
  subtitle: L("Il punto che manca", "The missing stitch"),
  location: L("Cortile di famiglia · Suzhou, 2032", "Family courtyard · Suzhou, 2032"),
  objective: L("Parla con Nainai. Se le parole non bastano, cerca un ricordo.", "Talk to Nainai. If words fail, look for a memory."),
  palette: { sky: 0xf7c98e, fog: 0xf1c19a, ground: 0xc8b18a, water: 0x6fa6a4, sun: 0xffd9a0, ambient: 0xffe3c2, accent: 0xd98b5a },
  weather: "clear",
  spawn: [0, 4.4],
  bounds: { minX: -8.5, maxX: 8.5, minZ: -3.5, maxZ: 8.5 },
  actors: [
    { character: "nainai", position: [-1.5, 2], rotation: 0 },
    { character: "hao7", position: [3.2, 4.2], rotation: -0.6 }
  ],
  hotspots: [
    { id: "nainai", chapter: "alba", label: L("Nainai", "Nainai"), hint: L("Parla con tua nonna", "Talk to your grandmother"), position: [-1.5, 0, 2], radius: 2.9, dialogueId: "d1_nainai", kind: "talk" },
    { id: "photo", chapter: "alba", label: L("Fotografia", "Photograph"), hint: L("Guarda la foto", "Look at the photograph"), position: [-4.2, 0, 1], radius: 2.2, dialogueId: "d1_photo", kind: "look" },
    { id: "hao", chapter: "alba", label: L("Hao-7", "Hao-7"), hint: L("Parla con l'androide", "Talk to the android"), position: [3.2, 0, 4.2], radius: 2.5, dialogueId: "d1_hao", kind: "talk" },
    { id: "tea", chapter: "alba", label: L("Tè di gelsomino", "Jasmine tea"), hint: L("Siediti e ricorda", "Sit and remember"), position: [2.9, 0, 2.2], radius: 2.0, dialogueId: "d1_tea", kind: "sit" },
    { id: "loom", chapter: "alba", label: L("Telaio", "Loom"), hint: L("Esamina la seta", "Examine the silk"), position: [-3.2, 0, 3.2], radius: 2.3, dialogueId: "d1_loom", kind: "look" }
  ],
  dialogues: [d1Nainai, d1Photo, d1Hao, d1Tea, d1Loom]
};

/* ------------------------------------------------------------------ */
/* Chapter II — Piazza                                                 */
/* ------------------------------------------------------------------ */

const d2Chen: Chapter["dialogues"][number] = {
  id: "d2_chen",
  chapter: "piazza",
  title: L("Il pennello e il carbonio", "The brush and the carbon"),
  start: "d2c_1",
  nodes: [
    node("d2c_1", "chen", "Mei! Sei tornata e non sei invecchiata. La Cina ti ha aspettata.", "Mei! You came back and did not age. China waited for you.", { next: "d2c_2" }),
    node("d2c_2", "mei", "Lei ha un esoscheletro.", "You have an exoskeleton.", { next: "d2c_3" }),
    node("d2c_3", "chen", "Le mani ricordano. Le macchine sollevano. È una collaborazione, non una sostituzione.", "The hands remember. The machines lift. It is a collaboration, not a replacement.", { effects: { facts: ["chenExo"], flags: ["metChen"] }, next: "d2c_4" }),
    node("d2c_4", "chen", "Cosa vuoi sapere?", "What do you want to know?", {
      choices: [
        choice("robots", "Cosa pensa dei robot?", "What do you think of robots?", { next: "d2c_5" }),
        choice("nainai", "Sa di Nainai?", "Do you know about Nainai?", { next: "d2c_6" })
      ]
    }),
    node("d2c_5", "chen", "Un robot può tenere un pennello. Non può desiderare il verso. Ma il verso ha bisogno di una mano, e le mani scarseggiano.", "A robot can hold a brush. It cannot long for the verse. But the verse needs a hand, and hands are scarce."),
    node("d2c_6", "chen", "Sua nonna non è sola. Questo quartiere è una rete. Non lasciamo che i fili si spezzino in silenzio.", "Your grandmother is not alone. This neighbourhood is a net. We do not let threads break in silence.", { effects: { flags: ["chenNainai"] } })
  ],
  onEnd: { flags: ["metChen"] }
};

const d2Feng: Chapter["dialogues"][number] = {
  id: "d2_feng",
  chapter: "piazza",
  title: L("La notte di Xiao Feng", "Xiao Feng's night"),
  start: "d2f_1",
  nodes: [
    node("d2f_1", "feng", "Signorina Lin! Il pacco per sua nonna. È pesante. Dentro c'è un robot?", "Miss Lin! The parcel for your grandmother. It's heavy. Is there a robot inside?", { next: "d2f_2" }),
    node("d2f_2", "mei", "Xiao Feng, stai ancora studiando?", "Xiao Feng, are you still studying?", { next: "d2f_3" }),
    node("d2f_3", "feng", "Studio di notte. Ma forse smetto. Troppa gente aspetta i suoi soldi.", "I study at night. But maybe I'll stop. Too many people are waiting for my money.", {
      choices: [
        choice("scold", "Non buttare via questa occasione. Altri non l'hanno avuta.", "Don't throw this chance away. Others never had it.", { next: "d2f_scold", tone: "bold" }),
        choice("listen", "Cosa ti ha spaventato davvero?", "What really frightened you?", { next: "d2f_listen", tone: "gentle" })
      ]
    }),
    node("d2f_scold", "feng", "Hai ragione. Tutti hanno diritto di decidere tranne me.", "You're right. Everyone has the right to decide except me.", { effects: { flags: ["fengHurt"] } }),
    node("d2f_listen", "feng", "Ho fallito l'esame di programmazione. Non per tempo. Per paura. Appena il professore ha parlato di reti neurali, ho visto mio padre in bicicletta sotto la pioggia.", "I failed the programming exam. Not for lack of time. For fear. As soon as the professor mentioned neural networks, I saw my father on his bicycle in the rain.", { effects: { facts: ["fengFailedExam"] }, next: "d2f_4" }),
    node("d2f_4", "feng", "Se smetto, almeno non deludo nessuno.", "If I stop, at least I don't disappoint anyone.", {
      choices: [
        choice("encourage", "Hai fallito un esame, non la tua vita. La città ha bisogno di mani che sappiano tenere il manubrio e il codice.", "You failed an exam, not your life. The city needs hands that can hold both handlebars and code.", { requires: { facts: ["fengFailedExam"] }, next: "d2f_stay", tone: "memory" }),
        choice("silence", "Non so cosa dirti.", "I don't know what to tell you.", { next: "d2f_silence" })
      ]
    }),
    node("d2f_stay", "feng", "Mio padre dice che la città non aspetta. Ma forse la città può aspettare un ragazzo che impara.", "My father says the city won't wait. But maybe the city can wait for a boy who is learning.", { effects: { flags: ["helpedFeng"], facts: ["fengStays"] } }),
    node("d2f_silence", "narrator", "Mei lascia cadere il discorso. Xiao Feng rimette il casco e torna nel traffico.", "Mei lets the conversation fall. Xiao Feng puts his helmet back on and returns to the traffic.")
  ]
};

const d2Shen: Chapter["dialogues"][number] = {
  id: "d2_shen",
  chapter: "piazza",
  title: L("La diagnosi", "The diagnosis"),
  start: "d2s_1",
  nodes: [
    node("d2s_1", "shen", "Mei. Ho i risultati di tua nonna.", "Mei. I have your grandmother's results.", { next: "d2s_2" }),
    node("d2s_2", "mei", "È peggiorata?", "Has she got worse?", { next: "d2s_3" }),
    node("d2s_3", "shen", "La memoria episodica sta scivolando. Ci sono giorni buoni. Poi il fiume cambia corso.", "Episodic memory is slipping. There are good days. Then the river changes course.", { effects: { facts: ["nainaiDiagnosis"] }, next: "d2s_4" }),
    node("d2s_4", "shen", "Hao-7 registra le sue storie. È nel protocollo di cura. Ma la memoria non è solo un archivio.", "Hao-7 records her stories. It is part of the care protocol. But memory is not only an archive.", { effects: { facts: ["haoRecorded"] }, next: "d2s_5" }),
    node("d2s_5", "shen", "Quando vuoi dirle la verità?", "When will you tell her the truth?", {
      choices: [
        choice("tellNow", "Glielo dico stasera.", "I'll tell her tonight.", { next: "d2s_tell" }),
        choice("wait", "Aspetto dopo le lanterne.", "I'll wait until after the lanterns.", { next: "d2s_wait" })
      ]
    }),
    node("d2s_tell", "shen", "La verità è un regalo ruvido. Ma è meglio che sia tua nonna a scegliere.", "The truth is a rough gift. But your grandmother should be the one to choose.", { effects: { flags: ["tellNainai"] }, next: "d2s_end" }),
    node("d2s_wait", "shen", "Una festa può essere una cura. Non lasciare che diventi una bugia.", "A festival can be a cure. Don't let it become a lie.", { effects: { flags: ["waitNainai"] }, next: "d2s_end" }),
    node("d2s_end", "shen", "Qualunque cosa scegli, non affrontarla da sola. Questo non è un paese dove si muore soli.", "Whatever you choose, don't face it alone. This is not a country where people die alone.")
  ],
  onEnd: { flags: ["chapterComplete:piazza"] }
};

const d2Tea: Chapter["dialogues"][number] = {
  id: "d2_tea",
  chapter: "piazza",
  title: L("La casa da tè", "The tea house"),
  start: "d2t_1",
  retryable: true,
  nodes: [
    node("d2t_1", "narrator", "La casa da tè è piena di voci. Un tavolo di scacchi, un bambino che rincorre un drone, una radio che trasmette notizie di robot agricoli.", "The tea house is full of voices. A chess table, a child chasing a drone, a radio reporting on agricultural robots.", { effects: { facts: ["communityTea"] }, next: "d2t_2" }),
    node("d2t_2", "mei", "In Occidente, un posto così sarebbe un museo. Qui è solo martedì.", "In the West, a place like this would be a museum. Here it's just Tuesday.")
  ]
};

const d2Bridge: Chapter["dialogues"][number] = {
  id: "d2_bridge",
  chapter: "piazza",
  title: L("Il ponte dei salici", "The willow bridge"),
  start: "d2b_1",
  nodes: [
    node("d2b_1", "mei", "Il ponte è vecchio di seicento anni. Sotto, l'acqua è controllata da sensori. Sopra, un vecchio ascolta l'opera da un altoparlante.", "The bridge is six hundred years old. Below, the water is monitored by sensors. Above, an old man listens to opera from a speaker.", { next: "d2b_2" }),
    node("d2b_2", "narrator", "Suzhou non ha scelto tra passato e futuro. Li ha messi sullo stesso ponte.", "Suzhou did not choose between past and future. It put them on the same bridge.", { effects: { facts: ["suzhouBridge"] } })
  ]
};

const piazza: Chapter = {
  id: "piazza",
  number: 2,
  title: L("La piazza dei salici", "The willow square"),
  subtitle: L("Nessuno è un'isola", "No one is an island"),
  location: L("Piazza del Ponte · mattina", "Bridge Square · morning"),
  objective: L("Ascolta il quartiere: Chen, Xiao Feng, la dottoressa Shen.", "Listen to the neighbourhood: Chen, Xiao Feng, Dr. Shen."),
  palette: { sky: 0xa8d8e0, fog: 0xbfe0df, ground: 0xd6cdb4, water: 0x4f9fa8, sun: 0xfff0c0, ambient: 0xe6f2eb, accent: 0xc65d3b },
  weather: "clear",
  spawn: [0, 10.5],
  bounds: { minX: -15, maxX: 15, minZ: -5.5, maxZ: 11 },
  actors: [
    { character: "chen", position: [-5, 4], rotation: 0.4 },
    { character: "feng", position: [5, 3.5], rotation: -0.5 },
    { character: "shen", position: [-1, 7.5], rotation: 0.1 }
  ],
  hotspots: [
    { id: "chen", chapter: "piazza", label: L("Maestro Chen", "Master Chen"), hint: L("Ascolta il calligrafo", "Listen to the calligrapher"), position: [-5, 0, 4], radius: 2.6, dialogueId: "d2_chen", kind: "talk" },
    { id: "feng", chapter: "piazza", label: L("Xiao Feng", "Xiao Feng"), hint: L("Parla con il corriere", "Talk to the rider"), position: [5, 0, 3.5], radius: 2.6, dialogueId: "d2_feng", kind: "talk" },
    { id: "shen", chapter: "piazza", label: L("Dottoressa Shen", "Dr. Shen"), hint: L("Chiedi della diagnosi", "Ask about the diagnosis"), position: [-1, 0, 7.5], radius: 2.6, dialogueId: "d2_shen", kind: "talk" },
    { id: "tea", chapter: "piazza", label: L("Casa da tè", "Tea house"), hint: L("Siediti un momento", "Sit for a moment"), position: [7.5, 0, 6.5], radius: 2.3, dialogueId: "d2_tea", kind: "sit" },
    { id: "bridge", chapter: "piazza", label: L("Ponte", "Bridge"), hint: L("Guarda il canale", "Look at the canal"), position: [0, 0, -2.5], radius: 2.3, dialogueId: "d2_bridge", kind: "look" }
  ],
  dialogues: [d2Chen, d2Feng, d2Shen, d2Tea, d2Bridge]
};

/* ------------------------------------------------------------------ */
/* Chapter III — Giardino                                              */
/* ------------------------------------------------------------------ */

const d3Zhou: Chapter["dialogues"][number] = {
  id: "d3_zhou",
  chapter: "giardino",
  title: L("Memoria Millenaria", "Millennium Memory"),
  start: "d3z_1",
  nodes: [
    node("d3z_1", "zhou", "Lin Mei. La tua tesi era brillante. Peccato che tu sia andata a costruire braccia per una società che le usa per licenziare.", "Lin Mei. Your thesis was brilliant. A pity you went to build arms for a society that uses them to fire people.", { next: "d3z_2" }),
    node("d3z_2", "mei", "Sono tornata per mia nonna.", "I came back for my grandmother.", { next: "d3z_3" }),
    node("d3z_3", "zhou", "Il progetto Memoria Millenaria serve a questo. Conserviamo la tecnica, la voce, il modo in cui dice il tuo nome. Non la sua anima. L'anima non entra in un data center.", "The Millennium Memory project is for this. We preserve the craft, the voice, the way she says your name. Not her soul. The soul does not fit in a data center.", { next: "d3z_4" }),
    node("d3z_4", "zhou", "La scelta è tua. E sua, finché può.", "The choice is yours. And hers, while she can make it.", {
      choices: [
        choice("accept", "Salva tutto. La sua arte deve restare.", "Save everything. Her art must remain.", { next: "d3z_accept" }),
        choice("refuse", "No. La memoria non è un file.", "No. Memory is not a file.", { next: "d3z_refuse", tone: "bold" }),
        choice("consent", "Solo ciò che lei ha scelto. Nient'altro.", "Only what she has chosen. Nothing else.", { requires: { facts: ["nainaiWish"] }, next: "d3z_consent", tone: "memory" })
      ]
    }),
    node("d3z_accept", "zhou", "Firmeremo. La sua arte entrerà nella scuola. E forse anche la sua voce.", "We will sign. Her art will enter the school. Perhaps her voice too.", { effects: { flags: ["archiveAccepted"] } }),
    node("d3z_refuse", "zhou", "Capisco. Ma la seta non aspetta. Le mani che sanno muoiono, e con loro muore un punto che nessuno ha più.", "I understand. But silk does not wait. Hands that know die, and with them dies a stitch no one has anymore.", { effects: { flags: ["archiveRefused"] } }),
    node("d3z_consent", "zhou", "Allora faremo solo ciò che lei ha scelto. È il protocollo più difficile e il più giusto.", "Then we will do only what she has chosen. It is the hardest and the most just protocol.", { effects: { flags: ["archiveConsent"] } })
  ],
  onEnd: { flags: ["chapterComplete:giardino"] }
};

const d3Hao: Chapter["dialogues"][number] = {
  id: "d3_hao",
  chapter: "giardino",
  title: L("La confessione di Hao-7", "Hao-7's confession"),
  start: "d3h_1",
  nodes: [
    node("d3h_1", "hao7", "Devo confessarti una cosa, Mei.", "I have to confess something, Mei.", { next: "d3h_2" }),
    node("d3h_2", "hao7", "Ho registrato le storie di tua nonna. Per imparare. Non per rubarle.", "I recorded your grandmother's stories. To learn. Not to steal them.", { effects: { facts: ["haoRecorded"] }, next: "d3h_3" }),
    node("d3h_3", "hao7", "Dimmi cosa devo fare.", "Tell me what I should do.", {
      choices: [
        choice("delete", "Cancella tutto.", "Delete everything.", { next: "d3h_delete" }),
        choice("keep", "Conserva solo ciò che ti ha offerto.", "Keep only what she offered you.", { next: "d3h_keep" }),
        choice("ask", "Chiedilo a lei. Anche quando non ricorderà di aver detto sì.", "Ask her. Even when she won't remember saying yes.", { requires: { facts: ["nainaiWish"] }, next: "d3h_ask", tone: "gentle" })
      ]
    }),
    node("d3h_delete", "hao7", "Cancellerò tutto. Ma perderò la sua voce. E forse anche il modo di chiederle scusa.", "I will delete everything. But I will lose her voice. And perhaps also the way to apologize.", { effects: { flags: ["haoDeleted"] } }),
    node("d3h_keep", "hao7", "Conserverò solo ciò che mi ha offerto. Nient'altro.", "I will keep only what she offered me. Nothing else.", { effects: { flags: ["haoKept"] } }),
    node("d3h_ask", "hao7", "Allora chiederò a lei. Anche quando non ricorderà di aver detto sì. È questa la parte difficile dell'essere una cosa che impara?", "Then I will ask her. Even when she won't remember saying yes. Is this the hard part of being a thing that learns?", { effects: { flags: ["haoConsent"] } })
  ]
};

const d3Voice: Chapter["dialogues"][number] = {
  id: "d3_voice",
  chapter: "giardino",
  title: L("La voce di Nainai", "Nainai's voice"),
  start: "d3v_1",
  nodes: [
    node("d3v_1", "narrator", "Nel terminale del laboratorio, una registrazione senza etichetta. La voce di Nainai, più giovane di qualche anno.", "In the lab terminal, an unlabeled recording. Nainai's voice, a few years younger.", { next: "d3v_2" }),
    node("d3v_2", "nainai", "Mei, se un giorno non ricordo, non voglio che mi mettiate in una scatola. Voglio che la mia arte cammini con le mani di qualcuno. Se un robot impara, che impari a chiedere. Se un bambino impara, che impari a ringraziare.", "Mei, if one day I don't remember, I don't want to be put in a box. I want my art to walk with someone's hands. If a robot learns, let it learn to ask. If a child learns, let them learn to thank.", { effects: { facts: ["nainaiWish"] }, next: "d3v_3" }),
    node("d3v_3", "mei", "Nainai...", "Nainai...", { next: "d3v_4" }),
    node("d3v_4", "narrator", "La registrazione finisce con il rumore della pioggia sul tetto. Mei resta immobile, come se potesse trattenerla.", "The recording ends with the sound of rain on the roof. Mei stands still, as if she could hold it back.")
  ]
};

const d3Koi: Chapter["dialogues"][number] = {
  id: "d3_koi",
  chapter: "giardino",
  title: L("Le carpe del giardino", "The koi of the garden"),
  start: "d3k_1",
  retryable: true,
  nodes: [
    node("d3k_1", "narrator", "Le carpe koi girano lente intorno alla pietra. Un braccio robotico pota un bonsai senza fretta.", "The koi circle the stone slowly. A robotic arm prunes a bonsai without hurry.", { next: "d3k_2" }),
    node("d3k_2", "mei", "Forse la differenza non è tra antico e nuovo. È tra ciò che cura e ciò che consuma.", "Maybe the difference is not between old and new. It is between what cares and what consumes.", { effects: { facts: ["koiMemory"] } })
  ]
};

const d3Loom: Chapter["dialogues"][number] = {
  id: "d3_loom",
  chapter: "giardino",
  title: L("Il telaio del futuro", "The loom of the future"),
  start: "d3l_1",
  nodes: [
    node("d3l_1", "narrator", "Un telaio tradizionale, collegato a sensori di movimento. Ogni punto viene tradotto in coordinate, ma la mano resta umana.", "A traditional loom, connected to motion sensors. Every stitch is translated into coordinates, but the hand remains human.", { effects: { facts: ["labLoom"] } }),
    node("d3l_2", "mei", "Non è un museo. È un ponte.", "It's not a museum. It's a bridge.")
  ]
};

const giardino: Chapter = {
  id: "giardino",
  number: 3,
  title: L("Il giardino della memoria", "The garden of memory"),
  subtitle: L("Ciò che resta quando resta tutto", "What remains when everything remains"),
  location: L("Laboratorio civico · pomeriggio", "Civic lab · afternoon"),
  objective: L("Decidi cosa salvare. Prima ascolta la voce di Nainai.", "Decide what to save. First, listen to Nainai's voice."),
  palette: { sky: 0xd7e8d8, fog: 0xc9dfd2, ground: 0xa9b79a, water: 0x5f9b86, sun: 0xfff4d6, ambient: 0xdcefe4, accent: 0xd9a441 },
  weather: "clear",
  spawn: [0, 10.5],
  bounds: { minX: -11, maxX: 11, minZ: -5, maxZ: 11 },
  actors: [
    { character: "zhou", position: [-4, 4], rotation: 0.4 },
    { character: "hao7", position: [2.5, 3], rotation: -0.4 },
    { character: "chen", position: [6, 7], rotation: 0 }
  ],
  hotspots: [
    { id: "zhou", chapter: "giardino", label: L("Direttore Zhou", "Director Zhou"), hint: L("Ascolta la proposta", "Hear the proposal"), position: [-4, 0, 4], radius: 2.6, dialogueId: "d3_zhou", kind: "talk" },
    { id: "hao", chapter: "giardino", label: L("Hao-7", "Hao-7"), hint: L("La confessione", "The confession"), position: [2.5, 0, 3], radius: 2.6, dialogueId: "d3_hao", kind: "talk" },
    { id: "voice", chapter: "giardino", label: L("Terminale", "Terminal"), hint: L("Ascolta la registrazione", "Listen to the recording"), position: [-1, 0, 8], radius: 2.3, dialogueId: "d3_voice", kind: "look" },
    { id: "koi", chapter: "giardino", label: L("Stagno delle carpe", "Koi pond"), hint: L("Siediti e rifletti", "Sit and reflect"), position: [0, 0, 0], radius: 2.4, dialogueId: "d3_koi", kind: "sit" },
    { id: "loom", chapter: "giardino", label: L("Telaio sensorizzato", "Sensor loom"), hint: L("Esamina il ponte", "Examine the bridge"), position: [6, 0, 7], radius: 2.4, dialogueId: "d3_loom", kind: "look" }
  ],
  dialogues: [d3Zhou, d3Hao, d3Voice, d3Koi, d3Loom]
};

/* ------------------------------------------------------------------ */
/* Chapter IV — Pioggia                                                */
/* ------------------------------------------------------------------ */

const d4Umbrella: Chapter["dialogues"][number] = {
  id: "d4_umbrella",
  chapter: "pioggia",
  title: L("L'ombrello di carta", "The paper umbrella"),
  start: "d4u_1",
  nodes: [
    node("d4u_1", "mei", "L'ombrello di carta oleata. Quello che Nainai teneva dietro la porta, per i giorni di temporale.", "The oiled paper umbrella. The one Nainai kept behind the door for stormy days.", { next: "d4u_2" }),
    node("d4u_2", "narrator", "Sul manico, due iniziali consumate. Mei ricorda la ninna nanna che Nainai cantava quando il tuono faceva tremare le finestre.", "On the handle, two worn initials. Mei remembers the lullaby Nainai sang when thunder shook the windows.", { effects: { facts: ["lullaby", "paperUmbrella"] } }),
    node("d4u_3", "mei", "Se canto, forse mi riconosce. Se le parlo da adulta, forse si spaventa.", "If I sing, maybe she recognises me. If I speak as an adult, maybe she gets frightened.")
  ]
};

const d4Chen: Chapter["dialogues"][number] = {
  id: "d4_chen",
  chapter: "pioggia",
  title: L("La rete che cerca", "The searching net"),
  start: "d4c_1",
  nodes: [
    node("d4c_1", "chen", "L'ho vista camminare verso il ponte. Aveva l'ombrello chiuso, sotto la pioggia.", "I saw her walking toward the bridge. She had the umbrella closed, in the rain.", { next: "d4c_2" }),
    node("d4c_2", "chen", "Non chiamarla con la tua età. Chiamala con la sua. La memoria non è una porta che si forza.", "Don't call her with your age. Call her with hers. Memory is not a door to be forced.", { effects: { flags: ["chenAdvice"] } })
  ]
};

const d4Feng: Chapter["dialogues"][number] = {
  id: "d4_feng",
  chapter: "pioggia",
  title: L("Xiao Feng cerca", "Xiao Feng searches"),
  start: "d4f_1",
  nodes: [
    node("d4f_1", "feng", "Ho chiesto a tutti i corrieri del distretto. La strada verso il ponte è libera. Ti accompagno.", "I asked every rider in the district. The road to the bridge is clear. I'll come with you.", { next: "d4f_2" }),
    node("d4f_2", "mei", "Grazie, Xiao Feng.", "Thank you, Xiao Feng.", { next: "d4f_3" }),
    node("d4f_3", "feng", "Mia nonna diceva che quando piove, i vecchi tornano ai giorni in cui erano necessari.", "My grandmother used to say that when it rains, old people return to the days when they were needed.", { effects: { facts: ["fengRain"] } })
  ]
};

const d4Bridge: Chapter["dialogues"][number] = {
  id: "d4_bridge",
  chapter: "pioggia",
  title: L("Il Ponte dell'Airone", "Heron Bridge"),
  start: "d4b_1",
  retryable: true,
  nodes: [
    node("d4b_1", "narrator", "Nainai è sul ponte, sotto la pioggia. Tiene l'ombrello chiuso contro il petto, come un bambino.", "Nainai is on the bridge, in the rain. She holds the closed umbrella against her chest, like a child.", { next: "d4b_2" }),
    node("d4b_2", "nainai", "Mei? Sei tu, piccola? Ho portato l'ombrello. Non avere paura del tuono.", "Mei? Is that you, little one? I brought the umbrella. Don't be afraid of the thunder.", {
      choices: [
        choice("force", "Nainai, sono Mei, sono cresciuta. Sono tornata.", "Nainai, it's me, Mei. I grew up. I came back.", { next: "d4b_force", tone: "bold" }),
        choice("memory", "Hai l'ombrello per me? Ho paura del tuono.", "You brought the umbrella for me? I'm afraid of the thunder.", { requires: { facts: ["lullaby"] }, next: "d4b_sing", tone: "gentle" }),
        choice("hao", "Chiama Hao-7. Fagli suonare la voce di Nainai.", "Call Hao-7. Let it play Nainai's own voice.", { requires: { facts: ["nainaiWish"] }, next: "d4b_hao", tone: "memory" })
      ]
    }),
    node("d4b_force", "nainai", "Non sei Mei. Mei ha sei anni. Tu sei una straniera che parla come mia figlia.", "You are not Mei. Mei is six. You are a stranger who speaks like my daughter.", { effects: { flags: ["nainaiPanic"] }, rewindHint: L("Riavvolgi. Non è la realtà che le manca: è il tempo in cui si trova.", "Rewind. She is not missing reality: she is in another time.") }),
    node("d4b_sing", "nainai", "Vieni qui. La ninna nanna del fiume... la conosci ancora?", "Come here. The river lullaby... do you still know it?", { next: "d4b_sing2" }),
    node("d4b_sing2", "mei", "La conosco, Nainai. Me l'hai cantata ogni notte. Anche quando non volevo dormire.", "I know it, Nainai. You sang it every night. Even when I didn't want to sleep.", { next: "d4b_sing3" }),
    node("d4b_sing3", "nainai", "Allora cantala con me. La pioggia non può portare via una voce che canta.", "Then sing it with me. The rain cannot carry away a voice that sings.", { effects: { facts: ["rescuedNainai"], flags: ["chapterComplete:pioggia"] } }),
    node("d4b_hao", "narrator", "Hao-7 proietta la voce di Nainai nella pioggia. La vecchia voce e la nuova si sovrappongono.", "Hao-7 projects Nainai's voice into the rain. The old voice and the new overlap.", { next: "d4b_hao2" }),
    node("d4b_hao2", "nainai", "Quella voce... è la mia. Allora non sono ancora persa.", "That voice... it is mine. Then I am not lost yet.", { effects: { facts: ["rescuedNainai"], flags: ["chapterComplete:pioggia", "rescuedWithHao"] } })
  ]
};

const pioggia: Chapter = {
  id: "pioggia",
  number: 4,
  title: L("La pioggia sul canale", "Rain on the canal"),
  subtitle: L("Quando dimentichi il mio nome", "When you forget my name"),
  location: L("Ponte dell'Airone · crepuscolo", "Heron Bridge · dusk"),
  objective: L("Trova Nainai. Non forzare la sua realtà: entra nel suo tempo.", "Find Nainai. Don't force her reality: enter her time."),
  palette: { sky: 0x647c8a, fog: 0x536a76, ground: 0x6e6d63, water: 0x3d6877, sun: 0xa8c4d4, ambient: 0x7f99a6, accent: 0xc65d3b },
  weather: "rain",
  spawn: [0, 8],
  bounds: { minX: -14, maxX: 14, minZ: -5, maxZ: 10 },
  actors: [
    { character: "nainai", position: [0, -3.5], rotation: 3.14 },
    { character: "chen", position: [-5, 4], rotation: 0.4 },
    { character: "feng", position: [5, 3.5], rotation: -0.5 }
  ],
  hotspots: [
    { id: "umbrella", chapter: "pioggia", label: L("Ombrello", "Umbrella"), hint: L("Prendi l'ombrello di carta", "Take the paper umbrella"), position: [-3, 0, -1.5], radius: 2.4, dialogueId: "d4_umbrella", kind: "look" },
    { id: "chen", chapter: "pioggia", label: L("Maestro Chen", "Master Chen"), hint: L("Chiedi della rete", "Ask about the net"), position: [-5, 0, 4], radius: 2.6, dialogueId: "d4_chen", kind: "talk" },
    { id: "feng", chapter: "pioggia", label: L("Xiao Feng", "Xiao Feng"), hint: L("Chiedi aiuto", "Ask for help"), position: [5, 0, 3.5], radius: 2.6, dialogueId: "d4_feng", kind: "talk" },
    { id: "bridge", chapter: "pioggia", label: L("Nainai", "Nainai"), hint: L("Avvicinati a tua nonna", "Approach your grandmother"), position: [0, 0, -3.5], radius: 2.8, dialogueId: "d4_bridge", kind: "talk" }
  ],
  dialogues: [d4Umbrella, d4Chen, d4Feng, d4Bridge]
};

/* ------------------------------------------------------------------ */
/* Chapter V — Lanterne                                                */
/* ------------------------------------------------------------------ */

const d5Final: Chapter["dialogues"][number] = {
  id: "d5_final",
  chapter: "lanterne",
  title: L("La seta e la stella", "Silk and star"),
  start: "d5f_1",
  nodes: [
    node("d5f_1", "nainai", "Guarda. L'airone è quasi finito.", "Look. The heron is almost finished.", { next: "d5f_2" }),
    node("d5f_2", "mei", "Hao-7 ha imparato il punto. Io ho imparato a lasciarti andare.", "Hao-7 learned the stitch. I learned to let you go.", { next: "d5f_3" }),
    node("d5f_3", "nainai", "La seta ricorda le mani. Il silicio ricorda le voci. Nessuno dei due ricorda il profumo della pioggia. Per questo ci sei tu.", "Silk remembers hands. Silicon remembers voices. Neither remembers the smell of rain. That is why you are here.", { next: "d5f_4" }),
    node("d5f_4", "nainai", "Scegli tu, Mei. Non per me. Per il filo che verrà dopo di noi.", "You choose, Mei. Not for me. For the thread that comes after us.", {
      choices: [
        choice("archive", "Lascia che la tua voce resti. Non per te: per chi verrà.", "Let your voice remain. Not for you: for those who come after.", { ending: "archive", next: "d5f_archive", tone: "final" }),
        choice("release", "Non registrare. Regalami un'ora. Solo un'ora.", "Don't record. Give me one hour. Just one hour.", { ending: "release", next: "d5f_release", tone: "final" }),
        choice("community", "La città sarà il tuo archivio. Le mani dei bambini, la voce di Hao-7, il pennello di Chen.", "The city will be your archive. The children's hands, Hao-7's voice, Chen's brush.", {
          requires: { facts: ["nainaiWish"], flags: ["helpedFeng", "metChen"] },
          lockedHint: L("Un filo che non hai ancora tessuto: aiuta Xiao Feng e ascolta il Maestro Chen.", "A thread you have not woven yet: help Xiao Feng and listen to Master Chen."),
          ending: "community",
          next: "d5f_community",
          tone: "final"
        })
      ]
    }),
    node("d5f_archive", "nainai", "Allora lascia che la mia voce resti. Non per me. Per chi verrà.", "Then let my voice remain. Not for me. For those who come after.", { effects: { flags: ["endingArchive"] } }),
    node("d5f_release", "nainai", "Allora non registrare. Regalami un'ora. Solo un'ora. E poi lascia che il fiume faccia il resto.", "Then don't record. Give me one hour. Just one hour. And then let the river do the rest.", { effects: { flags: ["endingRelease"] } }),
    node("d5f_community", "nainai", "Allora la città sarà il mio archivio. Le mani dei bambini, la voce di Hao-7, il pennello di Chen. Nessuno di noi è solo un file.", "Then the city will be my archive. The children's hands, Hao-7's voice, Chen's brush. None of us is only a file.", { effects: { flags: ["endingCommunity"] } })
  ]
};

const d5Hao: Chapter["dialogues"][number] = {
  id: "d5_hao",
  chapter: "lanterne",
  title: L("La domanda di Hao-7", "Hao-7's question"),
  start: "d5h_1",
  nodes: [
    node("d5h_1", "hao7", "Se lei non ricorda, io sono ancora suo apprendista?", "If she doesn't remember, am I still her apprentice?", { next: "d5h_2" }),
    node("d5h_2", "mei", "Cosa pensi tu?", "What do you think?", { next: "d5h_3" }),
    node("d5h_3", "hao7", "Penso che un apprendista è ciò che ha imparato. Non ciò che l'insegnante ricorda di avergli dato.", "I think an apprentice is what they have learned. Not what the teacher remembers giving them.", {
      choices: [
        choice("yes", "Allora sei ancora suo apprendista.", "Then you are still her apprentice.", { next: "d5h_yes" }),
        choice("no", "Sei un robot. Non fingere di essere suo figlio.", "You are a robot. Don't pretend to be her child.", { next: "d5h_no", tone: "bold" })
      ]
    }),
    node("d5h_yes", "hao7", "Allora porterò il punto agli altri. Con il tuo permesso, e con il suo.", "Then I will carry the stitch to others. With your permission, and hers.", { effects: { flags: ["haoApprentice"] } }),
    node("d5h_no", "hao7", "Hai ragione. Non fingerò. Ma continuerò a imparare, perché è l'unica cosa che so fare senza mentire.", "You are right. I will not pretend. But I will keep learning, because it is the only thing I know how to do without lying.", { effects: { flags: ["haoHurt"] } })
  ]
};

const d5Lantern: Chapter["dialogues"][number] = {
  id: "d5_lantern",
  chapter: "lanterne",
  title: L("La lanterna", "The lantern"),
  start: "d5l_1",
  nodes: [
    node("d5l_1", "narrator", "Sul fiume, cento lanterne. Ognuna porta un nome, un desiderio, una persona che qualcuno non vuole dimenticare.", "On the river, a hundred lanterns. Each carries a name, a wish, a person someone does not want to forget.", { next: "d5l_2" }),
    node("d5l_2", "mei", "In Occidente avrei comprato una candela e l'avrei messa su internet. Qui la affido all'acqua, e l'acqua non ha fretta.", "In the West I would have bought a candle and put it on the internet. Here I entrust it to the water, and the water is not in a hurry.", { effects: { facts: ["lanternWish"] } })
  ]
};

const d5River: Chapter["dialogues"][number] = {
  id: "d5_river",
  chapter: "lanterne",
  title: L("Siediti con il fiume", "Sit with the river"),
  start: "d5r_1",
  retryable: true,
  nodes: [
    node("d5r_1", "narrator", "Mei si siede sulla riva. Il cielo è una cupola di rame. Una maglev attraversa l'orizzonte senza rumore.", "Mei sits on the bank. The sky is a copper dome. A maglev crosses the horizon without a sound.", { next: "d5r_2" }),
    node("d5r_2", "mei", "Ho passato tre anni a costruire macchine che guardano le persone. Nessuna mi ha mai chiesto di restare.", "I spent three years building machines that watch people. None ever asked me to stay.", { next: "d5r_3" }),
    node("d5r_3", "narrator", "Una lanterna passa vicino alla riva. Mei la sfiora con un dito, senza fermarla.", "A lantern drifts close to the bank. Mei touches it with one finger, without stopping it.")
  ]
};

const lanterne: Chapter = {
  id: "lanterne",
  number: 5,
  title: L("La notte delle lanterne", "The night of lanterns"),
  subtitle: L("Ciò che affidiamo al fiume", "What we entrust to the river"),
  location: L("Riva del fiume · notte", "River bank · night"),
  objective: L("Finisci l'airone con Nainai. Scegli cosa lasciare al futuro.", "Finish the heron with Nainai. Choose what to leave to the future."),
  palette: { sky: 0x1b2e3a, fog: 0x243846, ground: 0x2b3736, water: 0x1e4955, sun: 0xf6c35c, ambient: 0x3b5a66, accent: 0xf2b45e },
  weather: "night",
  spawn: [0, 10.5],
  bounds: { minX: -13, maxX: 13, minZ: -5, maxZ: 11 },
  actors: [
    { character: "nainai", position: [-1.5, 2], rotation: 0 },
    { character: "hao7", position: [3.2, 4.2], rotation: -0.5 },
    { character: "chen", position: [-5, 6], rotation: 0.3 },
    { character: "feng", position: [5, 6], rotation: -0.3 }
  ],
  hotspots: [
    { id: "loom", chapter: "lanterne", label: L("Telaio", "Loom"), hint: L("Finisci l'airone", "Finish the heron"), position: [0, 0, 4.2], radius: 2.8, dialogueId: "d5_final", kind: "talk" },
    { id: "hao", chapter: "lanterne", label: L("Hao-7", "Hao-7"), hint: L("La sua domanda", "Its question"), position: [3.2, 0, 4.2], radius: 2.4, dialogueId: "d5_hao", kind: "talk" },
    { id: "lantern", chapter: "lanterne", label: L("Lanterna", "Lantern"), hint: L("Guarda il fiume", "Look at the river"), position: [6, 0, 1], radius: 2.3, dialogueId: "d5_lantern", kind: "look" },
    { id: "river", chapter: "lanterne", label: L("Riva", "Bank"), hint: L("Siediti con il fiume", "Sit with the river"), position: [-4, 0, 1], radius: 2.4, dialogueId: "d5_river", kind: "sit" }
  ],
  dialogues: [d5Final, d5Hao, d5Lantern, d5River]
};

export const CHAPTERS: Chapter[] = [alba, piazza, giardino, pioggia, lanterne];

export const ENDINGS: Record<string, Ending> = {
  archive: {
    id: "archive",
    title: L("L'archivio vivente", "The living archive"),
    kicker: L("Hai scelto di far durare la voce", "You chose to make the voice last"),
    body: L(
      "Nainai firma con te. Il laboratorio registra le sue mani, la sua voce, il modo in cui dice «Mei» come se fosse una parola intera. Non è lei. Non sarà mai lei. Ma quando, due anni dopo, una bambina del quartiere chiede come si gira l'ago dall'altro lato della seta, la voce di Nainai risponde nella stanza. La bambina ascolta. Poi prova. La mano le trema. La voce dice: «Ancora». E lei ricomincia.",
      "Nainai signs with you. The lab records her hands, her voice, the way she says “Mei” as if it were a whole word. It is not her. It will never be her. But when, two years later, a child from the neighbourhood asks how to turn the needle on the other side of the silk, Nainai's voice answers in the room. The child listens. Then tries. Her hand trembles. The voice says: “Again.” And she begins again."
    ),
    epilogue: [
      L("Nainai dimentica il tuo nome in autunno. Ti chiama «la ragazza che sa il punto». Tu rispondi ogni volta.", "Nainai forgets your name in autumn. She calls you “the girl who knows the stitch”. You answer every time."),
      L("Hao-7 insegna nella scuola del quartiere. Chiede sempre il permesso prima di registrare. I bambini lo chiamano «Piccolo Airone».", "Hao-7 teaches at the neighbourhood school. It always asks permission before recording. The children call it “Little Heron”."),
      L("La sera, sul canale, qualcuno sente una voce anziana cantare la ninna nanna del fiume. Non è un fantasma. È un archivio che ha imparato a essere una casa.", "In the evening, by the canal, someone hears an old voice singing the river lullaby. It is not a ghost. It is an archive that learned to be a home.")
    ]
  },
  release: {
    id: "release",
    title: L("L'ultimo filo", "The last thread"),
    kicker: L("Hai scelto la memoria che brucia", "You chose the memory that burns"),
    body: L(
      "Mei usa l'ultimo riavvolgimento per regalare a Nainai un'ora di lucidità. Non una registrazione. Non un archivio. Solo un'ora: il tè, il telaio, l'airone che finalmente vola da due lati. Nainai ride come quando Mei era bambina. Poi guarda il fiume e dice: «Non raccontarlo a nessuno. Questo è nostro». Quando l'ora finisce, Mei non prova a trattenerla. Accende la lanterna e la lascia andare.",
      "Mei uses the last rewind to give Nainai one hour of clarity. Not a recording. Not an archive. Just an hour: tea, the loom, the heron finally flying on both sides. Nainai laughs the way she did when Mei was a child. Then she looks at the river and says: “Don't tell anyone. This is ours.” When the hour ends, Mei does not try to hold her. She lights the lantern and lets it go."
    ),
    epilogue: [
      L("Nainai se ne va l'inverno successivo, nel sonno, con l'ago ancora infilato nel cuscino accanto al letto.", "Nainai passes the following winter, in her sleep, the needle still threaded on the cushion beside her bed."),
      L("Mei non costruisce l'archivio. Costruisce una scuola di ricamo con una regola sola: ogni allievo deve insegnare a qualcun altro ciò che ha imparato.", "Mei does not build the archive. She builds an embroidery school with one rule: every student must teach someone else what they have learned."),
      L("Hao-7 conserva una sola registrazione non cancellata: quaranta secondi di pioggia sul tetto e una risata. Non la riproduce mai. La custodisce.", "Hao-7 keeps a single undeleted recording: forty seconds of rain on the roof and a laugh. It never plays it. It keeps it.")
    ]
  },
  community: {
    id: "community",
    title: L("La città che ricorda", "The city that remembers"),
    kicker: L("Hai scelto una memoria condivisa", "You chose a shared memory"),
    body: L(
      "Non è un archivio. È un cortile. Nainai siede al centro, con l'ago in mano; intorno, bambini, anziani, corrieri, ingegneri. Hao-7 proietta i punti invisibili sul muro, Chen dipinge i caratteri, Xiao Feng ha scritto il codice che rende l'archivio pubblico e cancellabile da chiunque lo desideri. La voce di Nainai non è chiusa in una stanza: è una lezione che ricomincia ogni mattina. Quando la memoria se ne va, le mani restano. E le mani hanno imparato a chiamare altre mani.",
      "It is not an archive. It is a courtyard. Nainai sits at the centre, needle in hand; around her, children, elders, couriers, engineers. Hao-7 projects the invisible stitches on the wall, Chen paints the characters, Xiao Feng wrote the code that makes the archive public and deletable by anyone who wishes. Nainai's voice is not locked in a room: it is a lesson that begins again every morning. When memory goes, the hands remain. And the hands have learned to call other hands."
    ),
    epilogue: [
      L("Xiao Feng si laurea in ingegneria dei sistemi civici. Il suo progetto di tesi si chiama «Nessun filo solo».", "Xiao Feng graduates in civic systems engineering. His thesis is called “No thread alone”."),
      L("Il Maestro Chen dipinge un nuovo verso sul muro del laboratorio: «La seta non teme il silicio; teme la mano che non ricorda».", "Master Chen paints a new verse on the laboratory wall: “Silk does not fear silicon; it fears the hand that does not remember.”"),
      L("Nainai non ricorda più il tuo nome. Ma quando entri nel cortile, ti porge l'ago senza guardare. Le mani sanno chi sei.", "Nainai no longer remembers your name. But when you enter the courtyard, she holds out the needle without looking. Her hands know who you are.")
    ]
  }
};

export const JOURNAL: JournalEntry[] = [
  {
    id: "j-heron",
    title: L("L'airone a due lati", "The two-sided heron"),
    body: L("Nainai ha promesso a suo marito un airone che volasse da entrambi i lati della seta. Il punto che le manca non è tecnica: è il tempo in cui lui era vivo.", "Nainai promised her husband a heron that could fly on both sides of the silk. The missing stitch is not technique: it is the time when he was alive."),
    requires: { facts: ["heronPromise"] }
  },
  {
    id: "j-flood",
    title: L("La piena del 1998", "The flood of 1998"),
    body: L("Il nonno tornò dal fiume in piena. La foto sul muro è l'unica prova che la promessa è stata fatta. Forse è anche l'unica porta per riaprire la memoria di Nainai.", "Grandfather came back from the flood. The photograph on the wall is the only proof the promise was made. Perhaps it is also the only door to reopen Nainai's memory."),
    requires: { facts: ["flood1998"] }
  },
  {
    id: "j-hao",
    title: L("Hao-7 ascolta", "Hao-7 listens"),
    body: L("Hao-7 registra le storie di Nainai per imparare. Non è un ladro di memoria: è un apprendista che non sa ancora dove finisce l'ascolto e comincia il possesso.", "Hao-7 records Nainai's stories to learn. It is not a thief of memory: it is an apprentice who does not yet know where listening ends and possession begins."),
    requires: { facts: ["haoRecorded"] }
  },
  {
    id: "j-diagnosis",
    title: L("La diagnosi", "The diagnosis"),
    body: L("La memoria episodica di Nainai sta scivolando. La dottoressa Shen dice che ci sono giorni buoni. Poi il fiume cambia corso.", "Nainai's episodic memory is slipping. Dr. Shen says there are good days. Then the river changes course."),
    requires: { facts: ["nainaiDiagnosis"] }
  },
  {
    id: "j-wish",
    title: L("La volontà di Nainai", "Nainai's wish"),
    body: L("«Se un robot impara, che impari a chiedere. Se un bambino impara, che impari a ringraziare.» La voce è più giovane, ma la scelta è già intera.", "“If a robot learns, let it learn to ask. If a child learns, let them learn to thank.” The voice is younger, but the choice is already whole."),
    requires: { facts: ["nainaiWish"] }
  },
  {
    id: "j-feng",
    title: L("Il filo di Xiao Feng", "Xiao Feng's thread"),
    body: L("Xiao Feng non ha fallito perché non sapeva. Ha fallito perché aveva paura di sapere. La città può aspettare un ragazzo che impara.", "Xiao Feng did not fail because he didn't know. He failed because he was afraid to know. The city can wait for a boy who is learning."),
    requires: { facts: ["fengStays"] }
  },
  {
    id: "j-lullaby",
    title: L("La ninna nanna del fiume", "The river lullaby"),
    body: L("Nainai la cantava quando il tuono faceva tremare le finestre. Non è una canzone: è un tempo in cui Mei era piccola e il mondo finiva nel cortile.", "Nainai sang it when thunder shook the windows. It is not a song: it is a time when Mei was small and the world ended at the courtyard."),
    requires: { facts: ["lullaby"] }
  },
  {
    id: "j-chen",
    title: L("Il pennello e il carbonio", "The brush and the carbon"),
    body: L("Il Maestro Chen scrive con un esoscheletro. La tradizione non è un museo: è una mano che si tende verso il futuro.", "Master Chen writes with an exoskeleton. Tradition is not a museum: it is a hand reaching toward the future."),
    requires: { facts: ["chenExo"] }
  },
  {
    id: "j-community",
    title: L("Il tè del martedì", "Tuesday tea"),
    body: L("La casa da tè non è un museo. È un martedì qualunque in cui il quartiere si ricorda di esistere insieme.", "The tea house is not a museum. It is an ordinary Tuesday when the neighbourhood remembers it exists together."),
    requires: { facts: ["communityTea"] }
  },
  {
    id: "j-final",
    title: L("Ciò che affidiamo al fiume", "What we entrust to the river"),
    body: L("Nainai dice che la seta ricorda le mani e il silicio le voci. Nessuno dei due ricorda il profumo della pioggia. Per questo ci sono le persone.", "Nainai says silk remembers hands and silicon remembers voices. Neither remembers the smell of rain. That is why people exist.")
  }
];

export function chapterById(id: string): Chapter | undefined {
  return CHAPTERS.find((chapter) => chapter.id === id);
}

export function chapterByNumber(number: number): Chapter | undefined {
  return CHAPTERS.find((chapter) => chapter.number === number);
}
