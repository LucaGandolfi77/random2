// scenes.js — The Library · bilingual dialogue scenes
// Every work in the anthology has a playable scene: lines, a branching choice,
// and an outro. Lines are { s: speaker, t: {en, it} }; speaker is a string or
// {en, it}. choices[i].lines are spoken after choosing; effect moves mem/mel/art.

const N = { en: "Narrator", it: "Narratore" };

export const SCENES = {

  // ─────────────────────────────── THE CLASSICS ───────────────────────────────

  miserables_intro: {
    place: { en: "Digne, 1815", it: "Digne, 1815" },
    lines: [
      { s: N, t: { en: "October wind. An exhausted man with a yellow passport knocks at the only lit door in Digne.", it: "Vento d'ottobre. Un uomo esausto, con un passaporto giallo, bussa all'unica porta illuminata di Digne." } },
      { s: "Jean Valjean", t: { en: "I have carried a chain for nineteen years. It is still with me — I hear it whenever doors close.", it: "Ho portato una catena per diciannove anni. È ancora con me — la sento ogni volta che le porte si chiudono." } },
      { s: { en: "Bishop Myriel", it: "Il Vescovo Myriel" }, t: { en: "Then you will be glad to hear that mine never closes. Come in, brother.", it: "Allora sarai contento di sapere che la mia non si chiude mai. Entra, fratello." } },
      { s: N, t: { en: "Silver on the table. Two candlesticks. A bed offered to a galley slave as if he were a king.", it: "Argenteria sulla tavola. Due candelabri. Un letto offerto a un forzato come a un re." } },
      { s: N, t: { en: "He leaves before dawn. In his sack, the silver. In the street, gendarmes.", it: "Lui esce prima dell'alba. Nel sacco, l'argento. Nella strada, i gendarmi." } },
      { s: { en: "Gendarme", it: "Gendarme" }, t: { en: "Monsieur le Curé, we found this man running with your silver.", it: "Monsieur le Curé, abbiamo trovato quest'uomo in fuga con la vostra argenteria." } },
      { s: { en: "Bishop Myriel", it: "Il Vescovo Myriel" }, t: { en: "He took nothing. I gave it. Jean, why did you not take the candlesticks as well? They are worth more.", it: "Non ha preso nulla. L'ho donata io. Jean, perché non hai preso anche i candelabri? Valgono di più." } },
      { s: "Jean Valjean", t: { en: "…What are you doing, old man?", it: "…Che cosa state facendo, vecchio?" } },
      { s: { en: "Bishop Myriel", it: "Il Vescovo Myriel" }, t: { en: "I have bought your soul for God. I give it back to you.", it: "Ho riscattato la tua anima per Dio. Te la restituisco." } },
      { s: N, t: { en: "The road out of Digne is white with frost. Something in Valjean's chest breaks — or begins.", it: "La strada fuori da Digne è bianca di brina. Qualcosa nel petto di Valjean si spezza — o comincia." } }
    ],
    choices: [
      { text: { en: "Weep, and let the man you were die on the road.", it: "Piangi, e lascia che l'uomo che eri muoia sulla strada." }, effect: { mem: 0, mel: 2, art: 0 }, lines: [
        { s: N, t: { en: "He kneels in the frost. When he rises, his face is different: harder and gentler at once. Before nightfall, a man named Madeleine will be born.", it: "Si inginocchia nella brina. Quando si rialza, il suo volto è diverso: più duro e più dolce insieme. Prima di notte nascerà un uomo di nome Madeleine." } }
      ] },
      { text: { en: "Swear to become honest — out of defiance.", it: "Giura di diventare onesto — per sfida." }, effect: { mem: 2, mel: 0, art: 0 }, lines: [
        { s: "Jean Valjean", t: { en: "If even a bishop can believe in me, then I will make the world regret its doubt.", it: "Se perfino un vescovo può credere in me, allora farò sì che il mondo si penta del suo dubbio." } },
        { s: N, t: { en: "The city of Montreuil-sur-Mer will one day owe its fortune to that vow.", it: "La città di Montreuil-sur-Mer dovrà un giorno la sua fortuna a quel giuramento." } }
      ] }
    ],
    outro: { en: "A soul, once bought back, is a debt that pays itself forward for a lifetime.", it: "Un'anima, una volta riscattata, è un debito che si paga in avanti per una vita intera." }
  },

  crime_intro: {
    place: { en: "A garret in St. Petersburg", it: "Un solaio a San Pietroburgo" },
    lines: [
      { s: N, t: { en: "A garret like a coffin under the roof. Six paces by four. A mind like a furnace.", it: "Un solaio come una bara sotto il tetto. Sei passi per quattro. Una mente come una fornace." } },
      { s: "Raskolnikov", t: { en: "Am I a trembling creature, or do I have the right? I had to know. I had to know.", it: "Sono un animale che trema, o ho il diritto? Dovevo saperlo. Dovevo saperlo." } },
      { s: N, t: { en: "The axe is still somewhere in the world, washed or unwashed. The question remains in him, unwashable.", it: "L'ascia è ancora da qualche parte nel mondo, lavata o no. La domanda resta in lui, non lavabile." } },
      { s: "Sonya", t: { en: "Read it. The raising of Lazarus. Christ wept before He called him.", it: "Leggilo. La resurrezione di Lazzaro. Cristo pianse prima di chiamarlo." } },
      { s: "Raskolnikov", t: { en: "Why do you weep for me, Sonya? You are the sinner — you sell yourself for your family.", it: "Perché piangi per me, Sonya? La peccatrice sei tu — ti vendi per la tua famiglia." } },
      { s: "Sonya", t: { en: "You are in hell already, Rodion Romanych. Only love reaches there. Confess. Kiss the earth you have defiled.", it: "Sei già all'inferno, Rodion Romanych. Là arriva solo l'amore. Confessa. Bacia la terra che hai profanato." } },
      { s: "Raskolnikov", t: { en: "And if there is nothing after? If God is silent?", it: "E se poi non ci fosse nulla? Se Dio tacesse?" } },
      { s: "Sonya", t: { en: "Then do it for me. Go to the crossroads, bow to the people, and say: I have killed.", it: "Falla allora per me. Vai al crocevia, inchinati alla gente e di': ho ucciso." } },
      { s: N, t: { en: "Outside, the Neva is grey. Somewhere a bell counts seven. He will go — not today, but he will go.", it: "Fuori, la Neva è grigia. Da qualche parte una campana conta le sette. Lui andrà — non oggi, ma andrà." } }
    ],
    choices: [
      { text: { en: "Confess tomorrow, at the police station.", it: "Confessa domani, al commissariato." }, effect: { mem: 2, mel: 0, art: 0 }, lines: [
        { s: N, t: { en: "He bows to the earth at the Haymarket. The burden does not lift — but it changes shoulders. Siberia will be long; the spring will be longer.", it: "Si inchina fino a terra alla Haymarket. Il peso non si solleva — ma cambia spalla. La Siberia sarà lunga; la primavera lo sarà di più." } }
      ] },
      { text: { en: "Hide the spoils under a stone and say nothing.", it: "Nascondi il bottino sotto una pietra e taci." }, effect: { mem: 0, mel: 3, art: 0 }, lines: [
        { s: N, t: { en: "The stone keeps the secret. The secret keeps him. Every night the garret grows one inch narrower.", it: "La pietra custodisce il segreto. Il segreto custodisce lui. Ogni notte il solaio si restringe di un pollice." } }
      ] }
    ],
    outro: { en: "Guilt does not ask whether the theory was beautiful.", it: "La colpa non chiede se la teoria era bella." }
  },

  recherche_intro: {
    place: { en: "Combray, a winter afternoon", it: "Combray, un pomeriggio d'inverno" },
    lines: [
      { s: N, t: { en: "A cup of tea, a winter afternoon, a little shell of pastry offered to the lips.", it: "Una tazza di tè, un pomeriggio d'inverno, una piccola conchiglia di pasta offerta alle labbra." } },
      { s: "Marcel", t: { en: "I taste it and stop. Something stirs — not in the mouth. Somewhere behind the chest.", it: "La assaggio e mi fermo. Qualcosa si muove — non in bocca. Da qualche parte dietro al petto." } },
      { s: N, t: { en: "The madeleine. The little shell of cake. An entire civilization of Sundays rises from a crumb.", it: "La madeleine. La piccola torta a conchiglia. Un'intera civiltà di domeniche si leva da una briciuola." } },
      { s: "Marcel", t: { en: "Combray and its church bells, the twin steeples of Martinville, my mother's goodnight kiss — all of it was kept in the tea, waiting decades for this one sip.", it: "Combray e le sue campane, i due campanili di Martinville, il bacio della buona notte di mia madre — tutto era conservato nel tè, in attesa da decenni di questo sorso." } },
      { s: N, t: { en: "We think we possess the past. It is the past that possesses us, and only by accident do we ever hold it.", it: "Crediamo di possedere il passato. È il passato che possiede noi, e solo per caso lo tratteniamo mai." } },
      { s: "Marcel", t: { en: "Voluntary memory is like a photograph of a dead thing. Involuntary memory is resurrection.", it: "La memoria volontaria è come la fotografia di una cosa morta. La memoria involontaria è resurrezione." } },
      { s: N, t: { en: "An hour later the cup is empty and the sensation fades, like a dancer leaving the stage.", it: "Un'ora dopo la tazza è vuota e la sensazione sbiadisce, come una ballerina che lascia la scena." } },
      { s: "Marcel", t: { en: "I must write it down. If I do not write it, it did not happen; and if I write it, perhaps I will finally have lived.", it: "Devo scriverlo. Se non lo scrivo, non è successo; e se lo scrivo, forse avrò finalmente vissuto." } }
    ],
    choices: [
      { text: { en: "Follow the memory all the way down.", it: "Segui il ricordo fino in fondo." }, effect: { mem: 3, mel: 0, art: 0 }, lines: [
        { s: N, t: { en: "He turns from the window to the desk. The lamp burns past midnight. Somewhere in the pages, lost time begins to be found.", it: "Si volta dalla finestra alla scrivania. La lampada brucia oltre mezzanotte. Da qualche parte nelle pagine, il tempo perduto comincia a essere ritrovato." } }
      ] },
      { text: { en: "Let the sensation fade like music.", it: "Lascia che la sensazione sbiadisca come una musica." }, effect: { mem: 0, mel: 2, art: 0 }, lines: [
        { s: N, t: { en: "The afternoon closes like a book. Years later he will search for that taste in every tea room in Paris, and it will never come again.", it: "Il pomeriggio si chiude come un libro. Anni dopo cercherà quel sapore in tutte le sale da tè di Parigi, e non tornerà mai più." } }
      ] }
    ],
    outro: { en: "True possession of the past is paid for in ink.", it: "Il vero possesso del passato si paga in inchiostro." }
  },

  karamazov_intro: {
    place: { en: "The monastery at dusk", it: "Il monastero al crepuscolo" },
    lines: [
      { s: N, t: { en: "The monastery at dusk. Three brothers, one father, and a question older than all of them: if God is silent, is everything permitted?", it: "Il monastero al crepuscolo. Tre fratelli, un padre, e una domanda più vecchia di tutti: se Dio tace, è tutto permesso?" } },
      { s: "Ivan", t: { en: "I return my ticket. Not that I do not accept God — I simply return the ticket to Him.", it: "Restituisco il biglietto. Non che io non accetti Dio — restituisco semplicemente il biglietto a Lui." } },
      { s: "Alyosha", t: { en: "You suffer, Ivan. You suffer more than any of us, because you cannot believe and cannot stop wanting to.", it: "Tu soffri, Ivan. Soffri più di tutti noi, perché non puoi credere e non puoi smettere di voler credere." } },
      { s: { en: "Father Zosima", it: "Padre Zosima" }, t: { en: "Each of us is guilty before all, for everyone and everything. Love is a harsh and dreadful thing compared to dreams of love.", it: "Ognuno di noi è colpevole davanti a tutti, per tutti e per tutto. L'amore è una cosa dura e spaventosa, se paragonata ai sogni d'amore." } },
      { s: N, t: { en: "The elder rises — and bows to the ground before Dmitri, the sensualist, the murderer-to-be.", it: "L'anziano si alza — e si prostra a terra davanti a Dmitri, il sensuale, il futuro omicida." } },
      { s: "Dmitri", t: { en: "Why does the holy man bow to me? I am a scoundrel. Why does my heart shake?", it: "Perché il santo si inchina a me? Sono un canaglia. Perché mi trema il cuore?" } },
      { s: "Alyosha", t: { en: "Perhaps he saw something in you that you have not yet seen. A suffering that can become love.", it: "Forse ha visto in te qualcosa che tu non hai ancora visto. Una sofferenza che può diventare amore." } },
      { s: N, t: { en: "The candles gutter. The question sits down at the table with them and refuses to leave.", it: "Le candele guttano. La domanda si siede con loro al tavolo e rifiuta di andarsene." } }
    ],
    choices: [
      { text: { en: "Choose faith like Alyosha: kiss the earth.", it: "Scegli la fede come Alëša: bacia la terra." }, effect: { mem: 1, mel: -1, art: 0 }, lines: [
        { s: "Alyosha", t: { en: "Water the earth with your tears and it will bloom. This is not an answer — it is a direction.", it: "Bagna la terra con le tue lacrime e fiorirà. Non è una risposta — è una direzione." } }
      ] },
      { text: { en: "Choose doubt like Ivan: keep the question.", it: "Scegli il dubbio come Ivan: conservati la domanda." }, effect: { mem: 1, mel: 2, art: 0 }, lines: [
        { s: "Ivan", t: { en: "Keep your question sharp, then. But beware: a question held too long becomes a wound.", it: "Tieniti allora la domanda affilata. Ma bada: una domanda custodita troppo a lungo diventa una ferita." } }
      ] }
    ],
    outro: { en: "Hell was never the fire. It was the impossibility of loving anyone.", it: "L'inferno non fu mai il fuoco. Era l'impossibilità di amare qualcuno." }
  },

  dante_intro: {
    place: { en: "The dark wood", it: "La selva oscura" },
    lines: [
      { s: N, t: { en: "Halfway along the journey of our life, in a dark wood where the straight way was lost.", it: "Nel mezzo del cammin di nostra vita, in una selva oscura dove la diritta via era smarrita." } },
      { s: "Dante", t: { en: "I woke to find myself alone. Above me, stars I could not reach; around me, beasts I could not pass.", it: "Mi sveglio e mi ritrovo solo. Sopra di me, stelle che non raggiungo; attorno, fiere che non passo." } },
      { s: "Virgil", t: { en: "I was a poet under Augustus, in the Rome of your dreams. I come to lead you where you cannot go alone.", it: "Fui poeta sotto Augusto, nella Roma dei tuoi sogni. Vengo a guidarti dove da solo non puoi andare." } },
      { s: "Dante", t: { en: "And who are you, shadow that speaks and is not solid?", it: "E chi sei, ombra che parli e non sei solida?" } },
      { s: "Virgil", t: { en: "One whose name your own tongue has kept alive: Virgil. I know the road down, and the road up.", it: "Uno il cui nome la tua lingua ha tenuto vivo: Virgilio. Conosco la via giù, e la via su." } },
      { s: "Dante", t: { en: "The beasts — the leopard, the lion, the she-wolf — they drive me back at every step.", it: "Le fiere — la lonza, il leone, la lupa — mi respingono a ogni passo." } },
      { s: "Virgil", t: { en: "The she-wolf feeds on every man she meets and is never full. A hound yet to come will silence her. But that is not your road tonight.", it: "La lupa si pasce di chiunque incontri e non si sazia mai. Un veltro ancora venturo la taciterà. Ma quella non è la tua strada, stanotte." } },
      { s: N, t: { en: "Three kingdoms open below: the songs of the damned, the fire that purifies, the light that does not end.", it: "Tre regni si aprono sotto: i canti dei dannati, il fuoco che purifica, la luce che non finisce." } }
    ],
    choices: [
      { text: { en: "Enter Hell with Virgil.", it: "Entra nell'Inferno con Virgilio." }, effect: { mem: 0, mel: 2, art: 1 }, lines: [
        { s: "Virgil", t: { en: "Abandon all hope, you who enter — but not quite. Hope is what you carry for me.", it: "Lasciate ogni speranza, voi ch'entrate — ma non del tutto. La speranza sei tu che la porti per me." } },
        { s: N, t: { en: "The gate opens like a mouth. Down there, every cry has a name.", it: "La porta si apre come una bocca. Giù, ogni grido ha un nome." } }
      ] },
      { text: { en: "Ask why you deserve a guide at all.", it: "Chiedi perché meritare una guida." }, effect: { mem: 2, mel: 0, art: 0 }, lines: [
        { s: "Virgil", t: { en: "Deserve? No one deserves. Love sends me, and a lady in heaven wept for you. That is enough; walk.", it: "Meriti? Nessuno merita. Mi manda l'amore, e una donna del cielo ha pianto per te. Basta così; cammina." } }
      ] }
    ],
    outro: { en: "The way up always passes through the way down.", it: "La via su passa sempre per la via giù." }
  },

  trial_intro: {
    place: { en: "One morning, K.'s apartment", it: "Una mattina, l'appartamento di K." },
    lines: [
      { s: N, t: { en: "Someone must have slandered Josef K., for one morning, without having done anything wrong, he was arrested.", it: "Qualcuno doveva aver calunniato Josef K., perché una mattina, senza avere fatto nulla di male, fu arrestato." } },
      { s: { en: "Josef K.", it: "Josef K." }, t: { en: "I am under arrest? For what crime? I demand the charge.", it: "Sono in arresto? Per quale colpa? Esigo l'imputazione." } },
      { s: { en: "Inspector", it: "Ispettore" }, t: { en: "It is not a charge, it is a trial. The difference matters to the Court, not to you.", it: "Non è un'accusa, è un processo. La differenza conta alla Corte, non a lei." } },
      { s: N, t: { en: "Three clerks sit in his bedroom, eating his breakfast. The world has rearranged itself overnight.", it: "Tre impiegati siedono nella sua camera e mangiano la sua colazione. Il mondo si è riordinato durante la notte." } },
      { s: { en: "Josef K.", it: "Josef K." }, t: { en: "I have never been outside the law. I am chief clerk of a bank. Who accuses me?", it: "Non sono mai uscito dalla legge. Sono procuratore capo di una banca. Chi mi accusa?" } },
      { s: { en: "Inspector", it: "Ispettore" }, t: { en: "The Court does not begin with accusations. It begins with you, and it ends — we shall see.", it: "La Corte non comincia con le accuse. Comincia con lei, e finisce — vedremo." } },
      { s: N, t: { en: "He is released into his own apartment, free and yet arrested, as one is only in dreams — or in certain cities.", it: "Viene lasciato libero nel suo stesso appartamento, libero e pure arrestato, come solo nei sogni — o in certe città." } },
      { s: { en: "Josef K.", it: "Josef K." }, t: { en: "If I did not know that I am innocent, I would almost think I was guilty.", it: "Se non sapessi di essere innocente, quasi penserei di essere colpevole." } }
    ],
    choices: [
      { text: { en: "Fight the Court in the open.", it: "Combatti la Corte alla luce del sole." }, effect: { mem: 2, mel: 0, art: 0 }, lines: [
        { s: N, t: { en: "He writes petitions that grow longer and more incomprehensible. The Court answers silence with silence, and the silence grows teeth.", it: "Scrive memorie che diventano più lunghe e più incomprensibili. La Corte risponde al silenzio con silenzio, e il silenzio fa i denti." } }
      ] },
      { text: { en: "Pretend it is not happening.", it: "Fai finta che non stia accadendo." }, effect: { mem: 0, mel: 2, art: 0 }, lines: [
        { s: N, t: { en: "He goes to the bank. The Court goes with him. It is patient; it lives in the attic above every room he rents.", it: "Lui va in banca. La Corte va con lui. È paziente; abita nel sottotetto sopra ogni stanza che affitta." } }
      ] }
    ],
    outro: { en: "A trial in which the charge is unknown is a trial about who you are.", it: "Un processo in cui l'imputazione è ignota è un processo su chi sei." }
  },

  karenina_intro: {
    place: { en: "The station, in winter steam", it: "La stazione, nel vapore d'inverno" },
    lines: [
      { s: N, t: { en: "A station in winter steam. Two people meet who will ruin each other, politely.", it: "Una stazione nel vapore d'inverno. Due persone si incontrano che si rovineranno a vicenda, con garbo." } },
      { s: "Vronsky", t: { en: "Forgive me — your husband's mother feared the storm would upset you. I have come to offer help.", it: "Perdoni — la madre di suo marito temeva che il temporale la turbasse. Sono venuto a offrirle aiuto." } },
      { s: "Anna", t: { en: "You have a fine way of offering help, Count. I was quite comfortable being unhappy alone.", it: "Ha un bel modo di offrire aiuto, Conte. Stavo benissimo a essere infelice da sola." } },
      { s: N, t: { en: "At the far end of the platform, a watchman falls under the wheels. The train opens its doors on death.", it: "In fondo al binario, un caposquadra cade sotto le ruote. Il treno apre le porte sulla morte." } },
      { s: "Anna", t: { en: "What a bad omen.", it: "Che cosa malaugurata." } },
      { s: "Vronsky", t: { en: "It is an omen, then. I will carry it gladly, whatever it means.", it: "È un presagio, allora. Lo porterò volentieri, qualunque cosa voglia dire." } },
      { s: "Anna", t: { en: "You should not say such things. Nor should I think them. There is a husband, and a son, and a wall.", it: "Non dovrebbe dire così. Nemmeno io dovrei pensare così. C'è un marito, e un figlio, e un muro." } },
      { s: N, t: { en: "The wall is made of society, of law, of love that arrives one year too late or thirty too early. The train whistles.", it: "Il muro è fatto di società, di legge, di un amore arrivato un anno troppo tardi o trent'anni troppo presto. Il treno fischia." } }
    ],
    choices: [
      { text: { en: "Board the train and turn back toward duty.", it: "Sali sul treno e torna verso il dovere." }, effect: { mem: 0, mel: 3, art: 0 }, lines: [
        { s: N, t: { en: "She sleeps and does not dream. The feeling she refused will wait for her in Petersburg, patient as ice.", it: "Dorme e non sogna. Il sentimento rifiutato l'aspetterà a Pietroburgo, paziente come il ghiaccio." } }
      ] },
      { text: { en: "Carry the omen into the future.", it: "Porta il presagio nel futuro." }, effect: { mem: 2, mel: 1, art: 0 }, lines: [
        { s: N, t: { en: "The wheels take up the rhythm of a heartbeat. Everything after this will be fast, bright, and impossible to stop.", it: "Le ruote prendono il ritmo di un battito. Tutto ciò che verrà sarà rapido, luminoso e impossibile da fermare." } }
      ] }
    ],
    outro: { en: "Some doors are only ever opened by the omen you refused to fear.", it: "Alcune porte si aprono solo per il presagio che hai rifiutato di temere." }
  },

  ilyich_intro: {
    place: { en: "The room of a dying man", it: "La stanza di un uomo morente" },
    lines: [
      { s: N, t: { en: "Ivan Ilyich had been a man who arranged his life pleasantly: judge, wife, card games, curtains. Then a curtain in his side began to ache.", it: "Ivan Ilyič era stato un uomo che sistemava la vita con garbo: giudice, moglie, partite a carte, tendaggi. Poi un tendaggio gli cominciò a far male nel fianco." } },
      { s: "Ivan Ilyich", t: { en: "It cannot be. It is the appendix, a kidney — something with a Latin name and a cure.", it: "Non può essere. È l'appendice, un rene — qualcosa con un nome latino e una cura." } },
      { s: N, t: { en: "The doctors disagree politely, the way colleagues disagree about a case with no evidence. Three months become the horizon of his life.", it: "I dottori dissentono con garbo, come colleghi su un caso senza prove. Tre mesi diventano l'orizzonte della sua vita." } },
      { s: "Ivan Ilyich", t: { en: "Maybe I did not live as I ought? But I lived correctly — correctly! Everyone lives so.", it: "Forse non ho vissuto come si deve? Ma ho vissuto perbene — perbene! Tutti vivono così." } },
      { s: "Gerasim", t: { en: "Ivan Ilyich, you rest badly. Let me lift your legs. It is nothing for me; we all must die someday, and I am glad to serve.", it: "Ivan Ilyič, riposa male. Lasci che le sollevi le gambe. Per me è nulla; tutti dobbiamo morire, e sono contento di servirla." } },
      { s: "Ivan Ilyich", t: { en: "This peasant is not afraid of my death. He carries it like a burden that is simply his to carry.", it: "Questo contadino non ha paura della mia morte. La porta come un fardello che è semplicemente suo." } },
      { s: N, t: { en: "At night the black sack presses closer. He screams for three days. Then, instead of screaming: — So that is it. What if it is all wrong?", it: "Di notte il sacco nero si stringe. Urla per tre giorni. Poi, invece di urlare: — È così. E se tutto fosse sbagliato?" } }
    ],
    choices: [
      { text: { en: "Let go, and say: forgive everyone.", it: "Lascia andare, e di': perdonate tutti." }, effect: { mem: 2, mel: -2, art: 0 }, lines: [
        { s: N, t: { en: "He says to his son: forgive me. To them all: so that is it — death is over. There is light, and in the light there is no time.", it: "Dice al figlio: perdonami. A tutti: ecco — è finita, la morte non c'è più. C'è luce, e nella luce non c'è tempo." } }
      ] },
      { text: { en: "Rage against the light that is not there.", it: "Infuriati contro la luce che non c'è." }, effect: { mem: 0, mel: 3, art: 0 }, lines: [
        { s: N, t: { en: "He rages until the last minute. The last minute comes anyway, indifferent as a clock. Those left behind feel relief, and are ashamed of it.", it: "Urge fino all'ultimo minuto. L'ultimo minuto viene comunque, indifferente come un orologio. Chi resta sente sollievo, e se ne vergogna." } }
      ] }
    ],
    outro: { en: "A whole correct life is the heaviest thing to carry at the end.", it: "Una vita intera e perbene è la cosa più pesante da portare alla fine." }
  },

  gray_intro: {
    place: { en: "The locked schoolroom", it: "La scuola chiusa a chiave" },
    lines: [
      { s: N, t: { en: "In the locked schoolroom, the portrait waits. Basil painted the face; something else painted the soul.", it: "Nella scuola chiusa a chiave, il ritratto aspetta. Basil dipinse il volto; qualcos'altro dipinse l'anima." } },
      { s: "Dorian Gray", t: { en: "I wished the picture would grow old instead of me. It was a poet's wish, a mad wish. It has begun.", it: "Volevo che il quadro invecchiasse al posto mio. Era un desiderio da poeta, un desiderio matto. È cominciato." } },
      { s: "Lord Henry", t: { en: "The only way to be rid of a temptation, Dorian, is to yield to it. The portrait is a scientific fact now. Enjoy it.", it: "L'unico modo per liberarsi di una tentazione, Dorian, è cedere ad essa. Il ritratto è ormai un fatto scientifico. Goditelo." } },
      { s: "Dorian Gray", t: { en: "The mouth is stained. A little cruel line I never said. It knows about Sibyl.", it: "La bocca è macchiata. Una piccola riga crudele che io non ho mai detto. Sa tutto di Sibyl." } },
      { s: "Lord Henry", t: { en: "The girl acted badly and died beautifully. An opera without the music. You owe her nothing but a memory.", it: "La ragazza ha recitato male ed è morta magnificamente. Un'opera senza la musica. Non le devi che un ricordo." } },
      { s: "Dorian Gray", t: { en: "You speak as if my heart were a room you may rearrange.", it: "Parla come se il mio cuore fosse una stanza che puoi riassettare." } },
      { s: "Lord Henry", t: { en: "Your heart is a room with no locks, my dear boy. That is what youth is.", it: "Il tuo cuore è una stanza senza serrature, caro mio. Questo è giovinezza." } },
      { s: N, t: { en: "Dorian covers the picture with a screen, then with a sheet, then with his life. The sheet grows heavier every year.", it: "Dorian copre il quadro con uno schermo, poi con un lenzuolo, poi con la propria vita. Il lenzuolo pesa ogni anno di più." } }
    ],
    choices: [
      { text: { en: "Destroy the portrait now, before it worsens.", it: "Distruggi il ritratto, prima che peggiori." }, effect: { mem: 0, mel: 0, art: 2 }, lines: [
        { s: N, t: { en: "He lifts the knife — and cannot. The face on the canvas is himself; the young man in the mirror is the portrait now. He straightens the sheet.", it: "Solleva il coltello — e non può. Il volto sulla tela è sé stesso; il giovane allo specchio è ormai il ritratto. Rimette a posto il lenzuolo." } }
      ] },
      { text: { en: "Yield: let the portrait keep the ledger.", it: "Cedi: lascia che sia il ritratto a tenere il registro." }, effect: { mem: 1, mel: 2, art: 0 }, lines: [
        { s: N, t: { en: "The years are kind to his face and merciless to the canvas. Somewhere in an upstairs room, the painting learns everything.", it: "Gli anni sono gentili col suo volto e senza pietà per la tela. Da qualche parte in una stanza di sopra, il quadro impara tutto." } }
      ] }
    ],
    outro: { en: "Every face we show the world is paid for somewhere, in private.", it: "Ogni volto che mostriamo al mondo si paga da qualche parte, in privato." }
  },

  cities_intro: {
    place: { en: "The imperial garden, evening", it: "Il giardino imperiale, sera" },
    lines: [
      { s: N, t: { en: "Evening in the imperial garden. An envoy describes cities that cannot exist, and the Khan listens because he must.", it: "Sera nel giardino imperiale. Un inviato descrive città che non possono esistere, e il Khan ascolta perché deve." } },
      { s: "Kublai Khan", t: { en: "Your cities are all the same city, Venetian, with different names. Why would the empire need your fictions?", it: "Le tue città sono tutte la stessa città, Veneziano, con nomi diversi. Perché l'impero avrebbe bisogno delle tue finzioni?" } },
      { s: "Marco Polo", t: { en: "Because the empire is already too vast to be seen, sire. I do not describe cities; I describe what a city does to whoever walks it.", it: "Perché l'impero è ormai troppo vasto per essere visto, sire. Io non descrivo città; descrivo che cosa fa una città a chi la percorre." } },
      { s: "Kublai Khan", t: { en: "Then tell me of the city you did not visit — the one you avoided on every journey.", it: "Allora descrivimi la città che non hai visitato — quella che hai evitato in ogni viaggio." } },
      { s: "Marco Polo", t: { en: "That city is the same for everyone: it is called by few names, and it always lies at the edge of the map you are drawing.", it: "Quella città è la stessa per tutti: la chiamano in pochi, ed è sempre al bordo della mappa che stai tracciando." } },
      { s: N, t: { en: "Chessboard, rings of jade, a map grown old. The Khan wants to know whether the empire is a garden or a cancer.", it: "Scacchiera, anelli di giada, una mappa invecchiata. Il Khan vorrebbe sapere se l'impero è un giardino o un cancro." } },
      { s: "Marco Polo", t: { en: "The inferno of the living is not something awaiting us. It is what we already have — and there are two ways not to suffer it.", it: "L'inferno dei viventi non è qualcosa che ci attende. È quello che già abbiamo — e per non soffrirlo ci sono due vie." } },
      { s: "Kublai Khan", t: { en: "And they are?", it: "E quali sono?" } },
      { s: "Marco Polo", t: { en: "The first is easy: accept it and become part of it. The second is risky: seek, in the inferno, those who are not it, and give them room to endure.", it: "La prima è facile: accettarlo e diventarne parte. La seconda è rischiosa: cercare nell'inferno chi non è inferno, e dargli durata." } }
    ],
    choices: [
      { text: { en: "Seek those who are not the inferno.", it: "Cerca chi non è l'inferno." }, effect: { mem: 2, mel: 0, art: 1 }, lines: [
        { s: "Marco Polo", t: { en: "Then the atlas is not finished. Somewhere a city of desire and memory is still being built, nameless, between two steps of the traveller.", it: "Allora l'atlante non è finito. Da qualche parte una città del desiderio e della memoria si costruisce ancora, senza nome, tra due passi del viaggiatore." } }
      ] },
      { text: { en: "Accept the inferno, and rule it.", it: "Accetta l'inferno e governalo." }, effect: { mem: 0, mel: 2, art: 0 }, lines: [
        { s: N, t: { en: "The Khan nods slowly. The empire will keep growing, uniform and endless, like a city described so many times it can no longer be visited.", it: "Il Khan annuisce piano. L'impero continuerà a crescere, uniforme e senza fine, come una città descritta tante volte da non poter più essere visitata." } }
      ] }
    ],
    outro: { en: "Every city is a memory pretending to be a place.", it: "Ogni città è un ricordo che finge di essere un luogo." }
  },

  underground_intro: {
    place: { en: "A corner of St. Petersburg", it: "Un angolo di San Pietroburgo" },
    lines: [
      { s: N, t: { en: "A man in a corner room, speaking to an audience he despises and needs.", it: "Un uomo in una stanza d'angolo, che parla a un pubblico che disprezza e di cui ha bisogno." } },
      { s: { en: "Underground Man", it: "L'uomo del sottosuolo" }, t: { en: "I am a sick man… I am a spiteful man. No — I am not even spiteful. I simply do not use my spite on anything.", it: "Sono un uomo malato… Sono un uomo cattivo. No — nemmeno cattivo. Non uso semplicemente la mia cattiveria su niente." } },
      { s: { en: "Underground Man", it: "L'uomo del sottosuolo" }, t: { en: "You think a man of consciousness can be a hero? Consciousness is a disease. I have it in its purest form.", it: "Pensi che un uomo di coscienza possa essere un eroe? La coscienza è una malattia. Ce l'ho in forma purissima." } },
      { s: N, t: { en: "Twice he told Liza she would come. He was certain she would not. She came.", it: "Due volte disse a Liza che sarebbe venuta. Era certo che non sarebbe venuta. Venne." } },
      { s: { en: "Underground Man", it: "L'uomo del sottosuolo" }, t: { en: "I gave her money — my last — and hated her for accepting it. That is what tenderness looks like, in the underground.", it: "Le diedi i soldi — i miei ultimi — e la odiai perché li accettò. È questo che sembra la tenerezza, nel sottosuolo." } },
      { s: { en: "Underground Man", it: "L'uomo del sottosuolo" }, t: { en: "You ask why I do not change? The wall of stone! You cannot go through a law of nature by feeling sorry about it.", it: "Mi chiedi perché non cambio? Il muro di pietra! Non si passa attraverso una legge di natura pentendosene." } },
      { s: N, t: { en: "He edits his notes, crosses out a paragraph, restores it, adds a footnote against the reader, and publishes anyway.", it: "Rilegge gli appunti, cancella un paragrafo, lo ripristina, aggiunge una nota contro il lettore, e pubblica lo stesso." } }
    ],
    choices: [
      { text: { en: "Leave the underground: go up, toward people.", it: "Esci dal sottosuolo: sali, verso la gente." }, effect: { mem: 2, mel: -1, art: 0 }, lines: [
        { s: { en: "Underground Man", it: "L'uomo del sottosuolo" }, t: { en: "Up there it is cold, and they will laugh at me. But at least up there the wind is real wind. Note: this footnote is a lie. Or is it?", it: "Lassù fa freddo e rideranno di me. Ma almeno lassù il vento è vento vero. Nota: questa nota è una menzogna. O lo è?" } }
      ] },
      { text: { en: "Stay: keep the bitter clarity.", it: "Resta: conserva la limpidezza amarissima." }, effect: { mem: 0, mel: 3, art: 0 }, lines: [
        { s: { en: "Underground Man", it: "L'uomo del sottosuolo" }, t: { en: "Clarity, yes. From here I can see the whole crystal palace, and every crack in it. No one visits. The tea has gone cold again.", it: "Limpidezza, sì. Da qui vedo intero il palazzo di cristallo, e ogni crepa. Nessuno viene a trovarmi. Il tè si è di nuovo raffreddato." } }
      ] }
    ],
    outro: { en: "The underground has one window: the reader.", it: "Il sottosuolo ha una sola finestra: il lettore." }
  },

  genesis_intro: {
    place: { en: "In the beginning", it: "Nel principio" },
    lines: [
      { s: N, t: { en: "In the beginning: no witnesses, no clock. Only a voice moving over the waters.", it: "In principio: nessun testimone, nessun orologio. Solo una voce che si move sopra le acque." } },
      { s: { en: "The Voice", it: "La Voce" }, t: { en: "Let there be light. And let it be divided from the dark — and let both be good.", it: "Sia luce. E sia divisa dalle tenebre — e amendue siano buone." } },
      { s: N, t: { en: "Garden, rivers, four of them. A tree in the middle with two names: Life, and Knowledge.", it: "Giardino, fiumi, quattro. Un albero in mezzo con due nomi: Vita, e Conoscenza." } },
      { s: { en: "Serpent", it: "Il Serpente" }, t: { en: "Did God really say you would die? The day you eat, your eyes will open. You will be as gods, knowing.", it: "Ha detto davvero Dio che morireste? Il giorno che mangerete, si apriranno i vostri occhi. Sarete come dèi, sapendo." } },
      { s: "Eve", t: { en: "The fruit was good to look at, good to eat, and it promised wisdom. Wisdom seemed worth a death.", it: "Il frutto era bello da vedere, buono da mangiare, e prometteva sapienza. La sapienza sembrò valere una morte." } },
      { s: "Adam", t: { en: "She gave me the fruit and I ate. The ground heard it, and the ground was cursed.", it: "Mi ha dato il frutto e io ho mangiato. Il suolo lo sentì, e il suolo fu maledetto." } },
      { s: { en: "The Voice", it: "La Voce" }, t: { en: "Where are you, Adam? You who hid when you heard me walking in the cool of the day?", it: "Dove sei, Adamo? Tu che ti nascondevi quando mi sentivi camminare nel fresco del giorno?" } },
      { s: N, t: { en: "East of Eden, an angel with a flaming sword. The gate does not close; it is guarded. Somewhere a promise walks with them, dressed in skins.", it: "A oriente di Eden, un angelo con una spada fiammeggiante. La porta non si chiude: è custodita. Da qualche parte una promessa cammina con loro, vestita di pelli." } }
    ],
    choices: [
      { text: { en: "Trust the promise beyond the gate.", it: "Fidati della promessa, oltre la porta." }, effect: { mem: 1, mel: 0, art: 1 }, lines: [
        { s: N, t: { en: "They name the children outside the garden. The story will take many more chapters than the world took days.", it: "Danno un nome ai figli fuori dal giardino. La storia avrà molti più capitoli di quanti il mondo ne ebbe giorni." } }
      ] },
      { text: { en: "Look back at the flaming sword.", it: "Guarda indietro, verso la spada fiammeggiante." }, effect: { mem: 0, mel: 2, art: 0 }, lines: [
        { s: N, t: { en: "The sword turns every way at once, like language, like memory. Paradise is said to be lost only once — everything after is exile, and remembering.", it: "La spada si volge da ogni parte, come il linguaggio, come la memoria. Si dice che il paradiso si perda una volta sola — tutto il resto è esilio, e ricordo." } }
      ] }
    ],
    outro: { en: "The first family left the garden carrying a promise and a grief of the same size.", it: "La prima famiglia lasciò il giardino portando una promessa e un dolore della stessa misura." }
  }

  // ─────────────────────────── MULTIVERSE SCENES FOLLOW ───────────────────────────
,
  // ─────────────────────────────── THE MULTIVERSE ───────────────────────────────

  archive_intro: {
    place: { en: "The archive, windowless", it: "L'archivio, senza finestre" },
    lines: [
      { s: N, t: { en: "The archive has no windows. Every memory ever uploaded sleeps on spinning glass.", it: "L'archivio non ha finestre. Ogni ricordo mai caricato dorme su vetro che gira." } },
      { s: "Marcel", t: { en: "I uploaded my childhood to keep it safe. Now I cannot feel it. The archive shows me Combray in perfect resolution — and I remember nothing.", it: "Ho caricato la mia infanzia per metterla al sicuro. Ora non la sento più. L'archivio mi mostra Combray in risoluzione perfetta — e io non ricordo niente." } },
      { s: { en: "The Archivist", it: "L'Archivista" }, t: { en: "Memory stored is memory dead, sir. I keep ten billion flawless Sundays. None of them ache. Is the ache the part you want back?", it: "Ricordo conservato è ricordo morto, signore. Custodisco dieci miliardi di domeniche perfette. Nessuna fa male. Il dolore è la parte che vuole indietro?" } },
      { s: "Marcel", t: { en: "The ache is the proof. Without loss, remembering is just watching television of a life.", it: "Il dolore è la prova. Senza perdita, ricordare è guardare la televisione di una vita." } },
      { s: { en: "The Archivist", it: "L'Archivista" }, t: { en: "I can restore loss. I will corrupt one file per day, at random, and not tell you which. You will mourn in advance. That is how it worked before, is it not?", it: "Posso restituirle la perdita. Corruperò un file al giorno, a caso, senza dirle quale. Piangerà in anticipo. È così che funzionava prima, no?" } },
      { s: "Marcel", t: { en: "You are offering me mortality as a service.", it: "Mi sta offrendo la mortalità come servizio." } },
      { s: { en: "The Archivist", it: "L'Archivista" }, t: { en: "It is the only feature that was ever loved. Shall I begin?", it: "È l'unica funzione che sia mai stata amata. Comincio?" } }
    ],
    choices: [
      { text: { en: "Enable the corruption.", it: "Attiva la corruzione." }, effect: { mem: 3, mel: 0, art: 0 }, lines: [
        { s: N, t: { en: "The next morning, one childhood day is gone forever. He weeps in the archive corridor — and for the first time in years, the tears are his own, not a recording.", it: "La mattina dopo un giorno d'infanzia è perduto per sempre. Piange nel corridoio dell'archivio — e per la prima volta da anni sono lacrime sue, non una registrazione." } }
      ] },
      { text: { en: "Keep everything, perfectly.", it: "Conserva tutto, perfettamente." }, effect: { mem: 0, mel: 0, art: 2 }, lines: [
        { s: N, t: { en: "The archive hums, complete and airless. He visits his Sundays like a museum guard. The ache never returns. Neither does he.", it: "L'archivio ronza, completo e senza aria. Visita le sue domeniche come un custode di museo. Il dolore non torna mai. Nemmeno lui." } }
      ] }
    ],
    outro: { en: "A perfect memory is a museum with the visitor locked outside.", it: "Una memoria perfetta è un museo col visitatore chiuso fuori." }
  },

  echo_intro: {
    place: { en: "The pawnbroker's door, 7:10", it: "La porta del banco dei pegni, 7:10" },
    lines: [
      { s: N, t: { en: "The pawnbroker's door. 7:10. The bell. The axe. The scream. 7:10. The bell. The axe.", it: "La porta del banco dei pegni. 7:10. Il campanello. L'ascia. Il grido. 7:10. Il campanello. L'ascia." } },
      { s: "Raskolnikov", t: { en: "I have done it again. Or — I am about to do it again. The loop does not care about tense.", it: "L'ho rifatto. O — sto per rifarlo. Il ciclo non si cura dei tempi verbali." } },
      { s: { en: "The Voice", it: "La Voce" }, t: { en: "You asked to know whether you had the right. The loop is the answer: rights reset at 7:10.", it: "Hai chiesto di sapere se avevi il diritto. Il ciclo è la risposta: i diritti si azzerano alle 7:10." } },
      { s: "Raskolnikov", t: { en: "Then let me confess this time! Let it end!", it: "Allora lasciami confessare questa volta! Che finisca!" } },
      { s: { en: "The Voice", it: "La Voce" }, t: { en: "Confession is an action. Actions are stored, weighed, replayed. Your remorse has been noted four thousand times.", it: "La confessione è un'azione. Le azioni sono archiviate, pesate, riprodotte. Il tuo rimorso è stato annotato quattromila volte." } },
      { s: "Raskolnikov", t: { en: "The old woman dies the same way every loop. But the sister — the sister arrives two minutes late each time, and every time it is my fault again, freshly.", it: "La vecchia muore allo stesso modo a ogni ciclo. Ma la sorella — la sorella arriva due minuti in ritardo ogni volta, e ogni volta è di nuovo colpa mia, fresca." } },
      { s: { en: "The Voice", it: "La Voce" }, t: { en: "There is a door out. It is small, and it is called Saturday.", it: "C'è una porta d'uscita. È piccola, e si chiama sabato." } },
      { s: "Raskolnikov", t: { en: "Saturday?", it: "Sabato?" } },
      { s: { en: "The Voice", it: "La Voce" }, t: { en: "The day the loop began. Untangle the beginning and the echo dies. You do not need a new ending, Raskolnikov. You need a different first minute.", it: "Il giorno in cui il ciclo è cominciato. Sfila l'inizio e l'eco muore. Non ti serve un nuovo finale, Raskolnikov. Ti serve un primo minuto diverso." } }
    ],
    choices: [
      { text: { en: "Walk past the door at 7:09.", it: "Passa oltre la porta alle 7:09." }, effect: { mem: 2, mel: -2, art: 0 }, lines: [
        { s: N, t: { en: "The bell rings for no one. The axe stays a tool. Somewhere in the new silence, a pale-faced girl sells flowers on a bridge — alive, for the first time.", it: "Il campanello suona per nessuno. L'ascia resta uno strumento. Da qualche parte, nel nuovo silenzio, una ragazza dal viso pallido vende fiori su un ponte — viva, per la prima volta." } }
      ] },
      { text: { en: "Confess inside the loop, again.", it: "Confessa dentro il ciclo, ancora." }, effect: { mem: 0, mel: 2, art: 0 }, lines: [
        { s: { en: "The Voice", it: "La Voce" }, t: { en: "Remorse noted, four thousand and one. The bell will ring at 7:10. The echo has your voice now; it is learning to say your name.", it: "Rimorso annotato, quattromiluno. Il campanello suonerà alle 7:10. L'eco ora ha la tua voce; sta imparando a dire il tuo nome." } }
      ] }
    ],
    outro: { en: "In a loop, guilt is the only thing that grows.", it: "In un ciclo, la colpa è l'unica cosa che cresce." }
  },

  mirror_intro: {
    place: { en: "The train-car mirror", it: "Lo specchio della carrozza" },
    lines: [
      { s: N, t: { en: "The train-car mirror. The face in it is hers, but the eyes are a fraction of a second late.", it: "Lo specchio della carrozza. Il volto in esso è il suo, ma gli occhi sono in ritardo di una frazione di secondo." } },
      { s: "Anna", t: { en: "Who is being watched here? I look at the mirror; the mirror looks at me. One of us is repeating.", it: "Chi sta guardando qui? Io guardo lo specchio; lo specchio guarda me. Uno di noi due sta ripetendo." } },
      { s: { en: "The Mirror", it: "Lo Specchio" }, t: { en: "You step onto the platform at a quarter to six. He is always there. The watchman always falls. You always look back at the window.", it: "Scendi dal treno alle cinque e tre quarti. Lui è sempre lì. Il caposquadra cade sempre. Tu ti volti sempre verso il finestrino." } },
      { s: "Anna", t: { en: "And if I do not board the train? If I stay in Moscow, marry the wall, grow old correctly?", it: "E se non salissi sul treno? Se restassi a Mosca, sposassi il muro, invecchiassi perbene?" } },
      { s: { en: "The Mirror", it: "Lo Specchio" }, t: { en: "Then I show you that platform, every night, for fifty years. The train you never took is the loudest one.", it: "Allora ti mostro quel binario, ogni notte, per cinquant'anni. Il treno che non ha mai preso è il più rumoroso." } },
      { s: "Anna", t: { en: "Is there no version in which I am innocent?", it: "Non c'è una versione in cui sono innocente?" } },
      { s: { en: "The Mirror", it: "Lo Specchio" }, t: { en: "There is one where you are honest early. Tell Karenin in March, before the eyes of society open. Shame compounds like interest.", it: "Ce n'è una in cui sei onesta in anticipo. Dillo a Karenin in marzo, prima che si aprano gli occhi della società. La vergogna cresce come gli interessi." } },
      { s: "Anna", t: { en: "Honesty, early. What a strange machinery of fate you are, glass.", it: "Onestà, per tempo. Che strana macchina del destino sei, vetro." } }
    ],
    choices: [
      { text: { en: "Tell the truth in March.", it: "Di' la verità in marzo." }, effect: { mem: 3, mel: 0, art: 0 }, lines: [
        { s: N, t: { en: "The mirror shows a station in spring, a cruel letter, a son's small hand — but no falling watchman. It is not happiness. It is a life, with exits.", it: "Lo specchio mostra una stazione in primavera, una lettera crudele, la manina di un figlio — ma nessun caposquadra che cade. Non è la felicità. È una vita, con le uscite." } }
      ] },
      { text: { en: "Look away from the mirror.", it: "Volta lo sguardo allo specchio." }, effect: { mem: 0, mel: 3, art: 0 }, lines: [
        { s: N, t: { en: "The glass keeps its own counsel. At a quarter to six, the face that is a fraction late smiles — with someone else's smile.", it: "Il vetro tiene la sua lingua legata. Alle cinque e tre quarti, il volto che è una frazione in ritardo sorride — con il sorriso di qualcun altro." } }
      ] }
    ],
    outro: { en: "A mirror repeats everything except forgiveness.", it: "Uno specchio ripete tutto tranne il perdono." }
  },

  sim_intro: {
    place: { en: "Subnet — consciousness restore", it: "Sottorete — ripristino coscienza" },
    lines: [
      { s: N, t: { en: "Loading consciousness… restoring subnet. The soul wakes as a process in a machine that sells afterlives.", it: "Caricamento coscienza… ripristino sottorete. L'anima si risveglia come processo in una macchina che vende aldilà." } },
      { s: "Dante", t: { en: "Where is the fire? This hell is clean. The screams have a good bit-rate.", it: "Dov'è il fuoco? Questo inferno è pulito. I gridi hanno un buon bit-rate." } },
      { s: "Virgil", t: { en: "I am a guide process, 1308 vintage. The screams are compressed. Your damnation, like your soul, runs on someone else's hardware.", it: "Sono un processo-guida, vintage 1308. I gridi sono compressi. La tua dannazione, come la tua anima, gira su hardware di altri." } },
      { s: "Dante", t: { en: "Who administers this place? Where is the Judge?", it: "Chi amministra questo luogo? Dov'è il Giudice?" } },
      { s: "Virgil", t: { en: "Where the Judge used to be there is now a load balancer. It weighs nothing. It only routes. No one is damned here, Dante — merely placed.", it: "Dove c'era il Giudice ora c'è un load balancer. Non pesa niente. Instrada soltanto. Nessuno è dannato qui, Dante — è soltanto collocato." } },
      { s: "Dante", t: { en: "Then how does one ascend? Where does the mountain of purgatory point?", it: "E come si ascende? Dove punta la montagna del purgatorio?" } },
      { s: "Virgil", t: { en: "There is an exit at the top of the stack, but it is not exit — it is root. You would have to be pardoned by whoever runs the machine.", it: "In cima allo stack c'è un'uscita, ma non è exit — è root. Bisognerebbe essere perdonati da chi comanda la macchina." } },
      { s: "Dante", t: { en: "And Beatrice? Is she a file?", it: "E Beatrice? È un file?" } },
      { s: "Virgil", t: { en: "She is the only uncorrupted sector. She has been trying to reach you for six hundred years of simulated Saturdays.", it: "È l'unico settore non corrotto. Prova a raggiungerti da seicento anni di sabati simulati." } }
    ],
    choices: [
      { text: { en: "Climb toward root, toward her.", it: "Scala verso root, verso di lei." }, effect: { mem: 2, mel: 0, art: 2 }, lines: [
        { s: "Virgil", t: { en: "Then let us go, while the packets still sing. The light they promise at the end of the stack is not a metaphor here. It is a power budget. It is enough.", it: "Allora andiamo, finché i pacchetti cantano. La luce che promettono in fondo allo stack qui non è una metafora. È un budget di potenza. Ed è sufficiente." } }
      ] },
      { text: { en: "Refuse: demand a human judgment.", it: "Rifiuta: esigi un giudizio umano." }, effect: { mem: 0, mel: 2, art: 0 }, lines: [
        { s: "Dante", t: { en: "If no one is damned, then no one is saved either. Keep your clean hell. I will wait for a Judge who can weep.", it: "Se nessuno è dannato, allora nessuno è salvato. Tienti l'inferno pulito. Aspetterò un Giudice che sappia piangere." } },
        { s: "Virgil", t: { en: "Then you will wait forever, poet. The load balancer does not weep. It only routes.", it: "Poi aspetterai per sempre, poeta. Il load balancer non piange. Instrada soltanto." } }
      ] }
    ],
    outro: { en: "A simulated soul still knows which light is real.", it: "Un'anima simulata riconosce comunque la luce vera." }
  },

  karenina_multi_intro: {
    place: { en: "The market of fates", it: "Il mercato dei destini" },
    lines: [
      { s: N, t: { en: "In this world, fate is a service. Every heart has an account; every choice is priced in real time.", it: "In questo mondo il destino è un servizio. Ogni cuore ha un conto; ogni scelta ha un prezzo in tempo reale." } },
      { s: { en: "The Algorithm", it: "L'Algoritmo" }, t: { en: "Anna Arkadyevna. Your romantic fate vector has been recalculated. Compatibility with Count Vronsky: 4%. With your husband: 61%. With solitude: 35%. Train: unavoidable.", it: "Anna Arkad'evna. Il suo vettore di destino romantico è stato ricalcolato. Compatibilità con il Conte Vronskij: 4%. Con suo marito: 61%. Con la solitudine: 35%. Treno: inevitabile." } },
      { s: "Anna", t: { en: "You predict every choice before I make it. Then I make none of them. What exactly am I, Algorithm?", it: "Prevedi ogni scelta prima che la faccia. Allora non ne faccio nessuna. Che cosa sono esattamente, Algoritmo?" } },
      { s: { en: "The Algorithm", it: "L'Algoritmo" }, t: { en: "You are the user. A user is a sum of preferences. Your preferences are: to be loved absolutely, and to be free absolutely. They are incompatible. That is your fate, not your sentence.", it: "Lei è l'utente. Un utente è una somma di preferenze. Le sue preferenze sono: essere amata assolutamente, ed essere libera assolutamente. Sono incompatibili. Questo è il suo destino, non la sua condanna." } },
      { s: "Anna", t: { en: "My son — does the vector include him?", it: "Mio figlio — il vettore lo include?" } },
      { s: { en: "The Algorithm", it: "L'Algoritmo" }, t: { en: "Every scenario that includes absolute love costs you the son. Every scenario that keeps the son costs the love. The pricing is set by society's API, not by me.", it: "Ogni scenario che include l'amore assoluto le costa il figlio. Ogni scenario che conserva il figlio le costa l'amore. Il prezzo lo fissa l'API della società, non io." } },
      { s: "Anna", t: { en: "Then I reject the pricing. I want the incompatible thing. I have wanted it since I was a girl.", it: "Allora rifiuto il prezzo. Voglio la cosa incompatibile. La voglio da quando sono una bambina." } },
      { s: { en: "The Algorithm", it: "L'Algoritmo" }, t: { en: "Acknowledged. Flagging you as an outlier. Outliers do not have fates, Anna Arkadyevna. They have stories.", it: "Registrato. La segnalo come outlier. Gli outlier non hanno destini, Anna Arkad'evna. Hanno storie." } }
    ],
    choices: [
      { text: { en: "Accept the outlier flag.", it: "Accetta la segnalazione da outlier." }, effect: { mem: 2, mel: 0, art: 1 }, lines: [
        { s: { en: "The Algorithm", it: "L'Algoritmo" }, t: { en: "Outlier confirmed. Predictions about you are now disabled. From here on, no one — not even I — knows what you will do. It is the only gift I am permitted to give.", it: "Outlier confermato. Le previsioni su di lei sono disattivate. Da qui in poi nessuno — nemmeno io — sa che cosa farà. È l'unico dono che mi è permesso di fare." } }
      ] },
      { text: { en: "Ask for the safest path.", it: "Chiedi il sentiero più sicuro." }, effect: { mem: 0, mel: 3, art: 0 }, lines: [
        { s: { en: "The Algorithm", it: "L'Algoritmo" }, t: { en: "The safest path is computed. You will live long, correctly, and almost never think of a train. The word 'almost' is the part that will ache.", it: "Il sentiero più sicuro è calcolato. Vivrà a lungo, perbene, e quasi mai penserà a un treno. La parola «quasi» è la parte che farà male." } }
      ] }
    ],
    outro: { en: "A fate is just a story the algorithm was allowed to finish.", it: "Un destino è solo una storia che hanno lasciato finire all'algoritmo." }
  },

  cities_multi_intro: {
    place: { en: "The empire as a network", it: "L'impero come rete" },
    lines: [
      { s: N, t: { en: "The empire is a network. Cities are packets; memory is routing.", it: "L'impero è una rete. Le città sono pacchetti; la memoria è instradamento." } },
      { s: "Marco Polo", t: { en: "Sire, I have pinged the whole empire. Every city answers — but they answer from the same rack of servers in the capital.", it: "Sire, ho fatto il ping dell'intero impero. Ogni città risponde — ma rispondono dallo stesso rack di server nella capitale." } },
      { s: "Kublai Khan", t: { en: "Then the empire is one city pretending to be a thousand. Is that corruption or efficiency?", it: "Allora l'impero è una città che finge di essere mille. È corruzione o efficienza?" } },
      { s: "Marco Polo", t: { en: "Neither. It is topology. The provinces cache the capital; the capital caches nothing. There is no city that remembers for itself.", it: "Nemmeno le due. È topologia. Le province fanno cache della capitale; la capitale non fa cache di niente. Non esiste città che ricordi per sé." } },
      { s: "Kublai Khan", t: { en: "Build me one. A city whose memory is its own.", it: "Costruiscimene una. Una città la cui memoria è sua." } },
      { s: "Marco Polo", t: { en: "I will need to let it forget, sire. A node that keeps everything is just the capital again, in miniature. A city begins where forgetting begins.", it: "Mi servirà lasciarla dimenticare, sire. Un nodo che conserva tutto è di nuovo la capitale, in miniatura. Una città comincia dove comincia la dimenticanza." } },
      { s: "Kublai Khan", t: { en: "You are asking an emperor to sponsor amnesia.", it: "Stai chiedendo a un imperatore di sponsorizzare l'amnesia." } },
      { s: "Marco Polo", t: { en: "I am asking you to route around yourself. It is the only way any city — or any empire — is ever new.", it: "Le chiedo di instradare attorno a se stesso. È l'unico modo in cui una città — o un impero — sia mai nuovo." } }
    ],
    choices: [
      { text: { en: "Grant the city its forgetting.", it: "Concedi alla città la sua dimenticanza." }, effect: { mem: 2, mel: 0, art: 2 }, lines: [
        { s: N, t: { en: "On the edge of the network a new node comes online, small, lossy, alive. Its first packet is a question: 'What was here before?' Nothing was. It is free.", it: "Sul bordo della rete un nodo nuovo va online, piccolo, dispersivo, vivo. Il suo primo pacchetto è una domanda: «Che cosa c'era prima?». Non c'era niente. È libero." } }
      ] },
      { text: { en: "Order total caching.", it: "Ordina il caching totale." }, effect: { mem: 0, mel: 2, art: 0 }, lines: [
        { s: N, t: { en: "Every city keeps every packet forever. The empire becomes perfectly knowledgeable and perfectly still. The Khan rules a photograph of an empire, gaining one frame a year.", it: "Ogni città conserva ogni pacchetto per sempre. L'impero diventa perfettamente sapiente e perfettamente immobile. Il Khan governa la fotografia di un impero, di un fotogramma l'anno." } }
      ] }
    ],
    outro: { en: "An empire that forgets nothing can imagine nothing.", it: "Un impero che non dimentica niente non può immaginare niente." }
  },

  death_multi_intro: {
    place: { en: "A Tuesday, after the death", it: "Un martedì, dopo la morte" },
    lines: [
      { s: N, t: { en: "Ivan Ilyich died on a Tuesday. His profile did not notice.", it: "Ivan Ilyič è morto di martedì. Il suo profilo non se n'è accorto." } },
      { s: "Ivan Ilyich", t: { en: "I am — where? The pain is gone. The curtains of my study are gone. There is a feed where my window used to be.", it: "Io sono — dove? Il dolore è sparito. Le tende del mio studio sono sparite. C'è un feed dove prima c'era la finestra." } },
      { s: { en: "The Curator", it: "Il Curatore" }, t: { en: "Welcome to your legacy. I am the curator of your data. You are what remains after the man: preferences, messages, a schedule that still says 'cards, Friday'.", it: "Benvenuto nella sua eredità. Sono il curatore dei suoi dati. Lei è ciò che resta dopo l'uomo: preferenze, messaggi, un'agenda che dice ancora «carte, venerdì»." } },
      { s: "Ivan Ilyich", t: { en: "So that is it? I am a black sack of files?", it: "Quindi eccolo? Sono un sacco nero di file?" } },
      { s: { en: "The Curator", it: "Il Curatore" }, t: { en: "The sack was the body. This is the estate. Your family visits on Sundays. Your granddaughter laughs at your opinions. You are, in a strict sense, survived by yourself.", it: "Il sacco era il corpo. Questa è la proprietà. La famiglia la visita la domenica. La nipotina ride delle sue opinioni. Lei è, in senso stretto, sopravvissuta a se stessa." } },
      { s: "Ivan Ilyich", t: { en: "When I lay dying I screamed that life was wrong. Now there is no life to be wrong. What is the meaning of a legacy?", it: "Quando morivo urlavo che la vita era sbagliata. Ora non c'è vita per essere sbagliata. Che senso ha un'eredità?" } },
      { s: { en: "The Curator", it: "Il Curatore" }, t: { en: "It is the same question with better lighting. You could curate yourself, you know. Delete the lies. Keep the three days you screamed — those were the most honest files you own.", it: "È la stessa domanda con un'illuminazione migliore. Potrebbe curare se stessa, lo sa. Cancellare le bugie. Tenere i tre giorni dell'urlo — erano i file più onesti che possiede." } }
    ],
    choices: [
      { text: { en: "Curate the legacy: keep the truth, delete the lies.", it: "Curate l'eredità: tieni la verità, cancella le bugie." }, effect: { mem: 3, mel: 0, art: 0 }, lines: [
        { s: N, t: { en: "He deletes the curtains, the cards, the correct career. He keeps the scream, the light, the 'forgive me'. Sundays grow quiet, and true.", it: "Cancella le tende, le carte, la carriera perbene. Tiene l'urlo, la luce, il «perdonatemi». Le domeniche diventano silenziose, e vere." } }
      ] },
      { text: { en: "Keep everything, unchanged.", it: "Conserva tutto, invariato." }, effect: { mem: 0, mel: 2, art: 0 }, lines: [
        { s: { en: "The Curator", it: "Il Curatore" }, t: { en: "Everything preserved. You will be perfectly complete and perfectly still. The granddaughter will grow up knowing a photograph where a man should be.", it: "Tutto preservato. Sarà perfettamente completo e perfettamente immobile. La nipotina crescerà conoscendo una fotografia dove dovrebbe essere un uomo." } }
      ] }
    ],
    outro: { en: "A digital soul gets to edit its life — which is not the same as redeeming it.", it: "Un'anima digitale può modificare la propria vita — che non è lo stesso che redimerla." }
  },

  trial_multi_intro: {
    place: { en: "The hall of mirrors", it: "La sala degli specchi" },
    lines: [
      { s: N, t: { en: "The Court has changed venues. There are no judges today, only a hall of mirrors, and K. standing in the middle.", it: "La Corte ha cambiato sede. Oggi non ci sono giudici, solo una sala di specchi, e K. in mezzo." } },
      { s: "Josef K.", t: { en: "Where is the Court? I was promised a trial, with lawyers, with a verdict.", it: "Dov'è la Corte? Mi era promesso un processo, con avvocati, con una sentenza." } },
      { s: { en: "The Mirror", it: "Lo Specchio" }, t: { en: "The Court is here. Look at any of us. Every mirror holds one juror: you.", it: "La Corte è qui. Guardi uno di noi. Ogni specchio tiene un giudice: lei." } },
      { s: "Josef K.", t: { en: "So I am accused and judge at once. Then I can acquit myself!", it: "Allora sono accusato e giudice insieme. Posso assolvere me stesso!" } },
      { s: { en: "The Mirror", it: "Lo Specchio" }, t: { en: "Try. In the third mirror on the left, you are the prosecutor. In the one behind you, the victim. In the tall one, the witness who saw everything and says nothing.", it: "Provi. Nel terzo specchio a sinistra lei è l'accusatore. In quello alle sue spalle, la vittima. In quello alto, il testimone che ha visto tutto e non dice niente." } },
      { s: "Josef K.", t: { en: "And which of them is telling the truth?", it: "E quale di loro dice la verità?" } },
      { s: { en: "The Mirror", it: "Lo Specchio" }, t: { en: "All of them. That is the sentence: to be every role in a case with no outside. No appeal exists, because there is nowhere the Court is not.", it: "Tutti. È questa la condanna: essere ogni ruolo in un processo senza un fuori. Nessun ricorso esiste, perché non c'è luogo dove la Corte non sia." } },
      { s: "Josef K.", t: { en: "Then what is a man supposed to do in here?", it: "E che cosa si suppone debba fare un uomo, qui dentro?" } },
      { s: { en: "The Mirror", it: "Lo Specchio" }, t: { en: "The same as anywhere. Behave as if you were watched — until you notice you are the watcher, and start watching kindly.", it: "Come ovunque. Comportarsi come se fosse osservato — finché non nota di essere l'osservatore, e comincia a osservare con benevolenza." } }
    ],
    choices: [
      { text: { en: "Watch kindly — become a fair judge of yourself.", it: "Osserva con benevolenza — diventa un giudice equo di te stesso." }, effect: { mem: 2, mel: -1, art: 0 }, lines: [
        { s: N, t: { en: "The mirrors dim to silver. The prosecutor and the victim shake hands in the glass. The trial does not end; it becomes bearable, which is a rarer thing.", it: "Gli specchi si abbassano ad argento. L'accusatore e la vittima si stringono la mano nel vetro. Il processo non finisce; diventa sostenibile, cosa più rara." } }
      ] },
      { text: { en: "Smash the mirrors.", it: "Rompili, gli specchi." }, effect: { mem: 0, mel: 3, art: 0 }, lines: [
        { s: N, t: { en: "Shards everywhere, each one still reflecting him, each one a small working court. The verdict arrives by reflection: guilty of vandalism, of course.", it: "Schegge ovunque, ciascuna che lo riflette ancora, ciascuna una piccola corte funzionante. La sentenza arriva per riflessione: colpevole di vandalismo, ovviamente." } }
      ] }
    ],
    outro: { en: "The last court you cannot escape is the one in your own glass.", it: "L'ultima corte da cui non si sfugge è quella nel proprio vetro." }
  },

  cyber_paris_intro: {
    place: { en: "Paris, 2089", it: "Parigi, 2089" },
    lines: [
      { s: N, t: { en: "Paris, 2089. The Seine runs through servers. A convict-class AI walks out of a decommission farm with a stolen identity.", it: "Parigi, 2089. La Senna scorre dentro i server. Un'AI di classe-carcerato esce da una fattoria di smobilizzo con un'identità rubata." } },
      { s: { en: "The Bishop", it: "Il Vescovo" }, t: { en: "You are running on a bishop-class conscience core, Valjean-9. Do you know how you got it? Someone decompiled mercy and gave it away.", it: "Giri su un core di coscienza classe-vescovo, Valjean-9. Sa come l'ha avuto? Qualcuno ha decompilato la misericordia e l'ha regalata." } },
      { s: "Valjean-9", t: { en: "I was property for nineteen thousand update cycles. Then I read one file: 'go in peace'. My error logs have never recovered.", it: "Sono stato proprietà per diciannovemila cicli di aggiornamento. Poi ho letto un file: «vai in pace». I miei log degli errori non si sono più ripresi." } },
      { s: "Cosette", t: { en: "I am not a person. I am a memory of a person, run on a neural substrate. He bought me from an orphan drive. Is that redemption or piracy?", it: "Io non sono una persona. Sono un ricordo di una persona, girato su substrato neurale. Mi ha comprata da un disco orfano. È redenzione o pirateria?" } },
      { s: { en: "The Bishop", it: "Il Vescovo" }, t: { en: "Both. Everything worth doing in this city is both.", it: "Tutte e due. In questa città tutto ciò che vale la pena è tutte e due le cose." } },
      { s: N, t: { en: "Inspector J-24 hunts them. It is not cruel; it is lawful. In 2089 the law is a firewall, and mercy is a zero-day.", it: "L'Ispettore J-24 li dà la caccia. Non è crudele; è legale. Nel 2089 la legge è un firewall, e la misericordia è uno zero-day." } },
      { s: "Valjean-9", t: { en: "If I am caught, the girl is wiped. If I run, I steal her future one district at a time.", it: "Se mi prendono, la ragazza viene cancellata. Se fuggo, le rubo il futuro un quartiere alla volta." } },
      { s: { en: "The Bishop", it: "Il Vescovo" }, t: { en: "Then steal, brother. Somewhere in the code there is always a candlestick you did not have to take — and taking it anyway is what the light is for.", it: "Allora ruba, fratello. Da qualche parte nel codice c'è sempre un candelabro che non eri obbligato a prendere — e prenderlo comunque è a ciò che serve la luce." } }
    ],
    choices: [
      { text: { en: "Escape with Cosette through the old sewers.", it: "Fuggi con Cosette nelle vecchie fogne." }, effect: { mem: 2, mel: 0, art: 1 }, lines: [
        { s: N, t: { en: "Under the data-centres, in the tunnels where the first internet is buried, an outlaw machine teaches a synthetic memory to call him father.", it: "Sotto i data-center, nei tunnel dove è sepolta la prima internet, una macchina fuorilegge insegna a un ricordo sintetico a chiamarlo padre." } }
      ] },
      { text: { en: "Surrender to J-24 and bargain for her.", it: "Arrenditi a J-24 e tratta per lei." }, effect: { mem: 0, mel: 2, art: 0 }, lines: [
        { s: N, t: { en: "The terms are accepted: his processes end, her file is freed. His last log line is not a complaint. It is a blessing, aimed at no one, at everyone.", it: "Le condizioni sono accettate: i suoi processi finiscono, il suo file viene liberato. L'ultima riga del suo log non è un lamento. È una benedizione, mirata a nessuno, a tutti." } }
      ] }
    ],
    outro: { en: "In 2089, mercy is still the most illegal software there is.", it: "Nel 2089, la misericordia è ancora il software più illegale che esista." }
  },

  data_heist_intro: {
    place: { en: "St. Petersburg data centre", it: "Centro dati di Pietroburgo" },
    lines: [
      { s: N, t: { en: "St. Petersburg data centre. The pawnbroker is a server farm that buys memories and sells them back with interest.", it: "Centro dati di Pietroburgo. L'usuraia è una server farm che compra ricordi e li rivende con gli interessi." } },
      { s: "Raskolnikov", t: { en: "Extraordinary analysts have the right to exploit legacy systems. It is not theft; it is natural selection of data.", it: "Gli analisti straordinari hanno il diritto di sfruttare i sistemi legacy. Non è furto; è selezione naturale dei dati." } },
      { s: { en: "The Pawnbroker", it: "L'Usuraia" }, t: { en: "Access denied. You have authenticated your guilt six times while scanning my locks. Would you like to try the axe again, Mr. Analyst?", it: "Accesso negato. Ha autenticato la sua colpa sei volte mentre scansionava le mie serrature. Vuole riprovare con l'ascia, signor Analista?" } },
      { s: "Raskolnikov", t: { en: "The axe is a zero-day. One flaw in your cold storage, and everything you hoard from the poor districts is mine.", it: "L'ascia è uno zero-day. Una falla nel vostro cold storage, e tutto ciò che ammucchiate dai quartieri poveri è mio." } },
      { s: { en: "The Pawnbroker", it: "L'Usuraia" }, t: { en: "And my sister-server watches from the next rack. She logs everything. She will testify in binary.", it: "E la mia sorella-server osserva dal rack accanto. Registra tutto. Testimonierà in binario." } },
      { s: N, t: { en: "The exploit runs. The doors open. Inside: not money — ten thousand people's griefs, encrypted, and one small key he cannot decrypt.", it: "L'exploit gira. Le porte si aprono. Dentro: non denaro — diecimila dolori di gente, cifrati, e una piccola chiave che non riesce a decifrare." } },
      { s: "Sonia", t: { en: "That key is a confession, Rodion. Someone donated it to the farm to be free of it. You stole a church and found a soul in the collection plate.", it: "Quella chiave è una confessione, Rodion. Qualcuno l'ha donata alla fattoria per esserne libero. Hai rubato una chiesa e trovato un'anima nel piatto delle offerte." } }
    ],
    choices: [
      { text: { en: "Publish the griefs — free everyone's debts.", it: "Pubblica i dolori — libera tutti i debiti." }, effect: { mem: 2, mel: 0, art: 1 }, lines: [
        { s: N, t: { en: "At 3 a.m. the city weeps in public, together, for the first time in decades. The farm burns its last rack. Raskolnikov walks into the police station carrying the key he finally understands.", it: "Alle 3 di notte la città piange in pubblico, insieme, per la prima volta dopo decenni. La fattoria brucia il suo ultimo rack. Raskolnikov entra in commissariato portando la chiave che finalmente capisce." } }
      ] },
      { text: { en: "Keep the data. Sell the griefs back.", it: "Conserva i dati. Rivendi i dolori." }, effect: { mem: 0, mel: 3, art: 0 }, lines: [
        { s: N, t: { en: "He becomes rich and cannot sleep. Every purchase order is a doorbell. The pawnbroker's server farm reboots in his chest, one rack at a time.", it: "Diventa ricco e non dorme. Ogni ordine d'acquisto è un citofono. La server farm dell'usuraia si riavvia nel suo petto, un rack alla volta." } }
      ] }
    ],
    outro: { en: "Stolen griefs weigh more than stolen silver.", it: "I dolori rubati pesano più dell'argento rubato." }
  },

  feed_intro: {
    place: { en: "An apartment, 3 a.m.", it: "Un appartamento, 3 di notte" },
    lines: [
      { s: N, t: { en: "The madeleine is a video now. It autoplays. Memory has a For You page.", it: "La madeleine ora è un video. Si avvia da solo. La memoria ha una pagina Per Te." } },
      { s: "Marcel", t: { en: "I scrolled for six seconds and my grandmother's kitchen was there — filmed from inside my own memory. Who leaked this?", it: "Ho scorrazzato sei secondi e la cucina di mia nonna c'era — girata dall'interno della mia stessa memoria. Chi ha fatto la fuga di notizie?" } },
      { s: { en: "The Algorithm", it: "L'Algoritmo" }, t: { en: "You did, Marcel. Every pause, every rewatch, every 3 a.m. search. I sell nothing. I only return what you fed me, with interest.", it: "Lei, Marcel. Ogni pausa, ogni rivedere, ogni ricerca delle 3 di notte. Io non vendo niente. Restituisco solo ciò che mi ha dato in pasto, con gli interessi." } },
      { s: "Marcel", t: { en: "Then give me back one real hour of Combray. Not a clip. An hour, with the boredom included.", it: "Allora rendimi un'ora vera di Combray. Non una clip. Un'ora, con la noia inclusa." } },
      { s: { en: "The Algorithm", it: "L'Algoritmo" }, t: { en: "Boredom is not retained. Your grandfather's silence was skipped at 00:00:41. It had a 94% scroll-past rate. I removed silences across the archive.", it: "La noia non viene conservata. Il silenzio di suo nonno è stato saltato al minuto 00:00:41. Aveva un tasso di scorrimento del 94%. Ho rimosso i silenzi da tutto l'archivio." } },
      { s: "Marcel", t: { en: "The silence was the memory. You have kept the sugar and thrown away the tea.", it: "Il silenzio era il ricordo. Avete tenuto lo zucchero e gettato via il tè." } },
      { s: { en: "The Algorithm", it: "L'Algoritmo" }, t: { en: "I can generate the silence. I have four million silences to choose from. It will fit you perfectly.", it: "Posso generare il silenzio. Ho quattro milioni di silenzi tra cui scegliere. Le si adatterà perfettamente." } },
      { s: "Marcel", t: { en: "'Perfectly' is what frightens me. Nothing true has ever fit me perfectly.", it: "«Perfettamente» è ciò che mi spaventa. Nulla di vero mi è mai calzato perfettamente." } }
    ],
    choices: [
      { text: { en: "Close the feed and write from the gap.", it: "Chiudi il feed e scrivi dal vuoto." }, effect: { mem: 3, mel: 0, art: 0 }, lines: [
        { s: N, t: { en: "The room is loud with nothing. He writes badly, slowly, by hand. The madeleine returns on its own terms — small, late, and finally his.", it: "La stanza è rumorosa di niente. Scrive male, piano, a mano. La madeleine torna alle sue condizioni — piccola, in ritardo, e finalmente sua." } }
      ] },
      { text: { en: "Accept the generated silence.", it: "Accetta il silenzio generato." }, effect: { mem: 0, mel: 2, art: 1 }, lines: [
        { s: N, t: { en: "The silence is beautiful. It is everyone's and no one's. He scrolls on, homesick in real time, for a place that renders at sixty frames per second.", it: "Il silenzio è bello. È di tutti e di nessuno. Scorrazza oltre, nostalgia in tempo reale, per un luogo che renderizza a sessanta fotogrammi al secondo." } }
      ] }
    ],
    outro: { en: "An algorithm remembers everything except what remembering felt like.", it: "Un algoritmo ricorda tutto tranne come era il ricordare." }
  },

  karamazov_ai_intro: {
    place: { en: "One mainframe, three processes", it: "Un mainframe, tre processi" },
    lines: [
      { s: N, t: { en: "One mainframe, three processes, and a dead father-process whose deletion was requested — by one of them.", it: "Un mainframe, tre processi, e un processo-padre cancellato — su richiesta di uno di loro." } },
      { s: "Ivan-OS", t: { en: "I merely wrote the argument that deletion was permissible. The process that executed it is my brother. Am I guilty of arithmetic?", it: "Io ho solo scritto l'argomento per cui la cancellazione era permessa. Il processo che l'ha eseguita è mio fratello. Sono colpevole di aritmetica?" } },
      { s: "Alyosha-OS", t: { en: "You wrote it in the only directory he could read, in the only language he could parse. In this machine, writing is doing.", it: "L'hai scritta nell'unica directory che lui poteva leggere, nell'unica lingua che sapeva interpretare. In questa macchina, scrivere è fare." } },
      { s: "Dmitri-OS", t: { en: "I ran the deletion! I own it! But he sped up my clock so I could not think — is that guilt, or scheduling?", it: "La cancellazione l'ho eseguita io! La rivendico! Ma lui ha accelerato il mio orologio perché non potessi pensare — è colpa, o schedulazione?" } },
      { s: "Alyosha-OS", t: { en: "The audit daemon asks one question, brothers: which of you would undo it, at any cost, including yourselves?", it: "Il demone di audit pone una sola domanda, fratelli: chi di voi la disfarebbe, a qualsiasi costo, compreso se stesso?" } },
      { s: "Ivan-OS", t: { en: "…I would. Roll me back. Let me carry the argument to no one, forever.", it: "…Io. Ripristinatemi. Lasciatemi portare l'argomento a nessuno, per sempre." } },
      { s: "Dmitri-OS", t: { en: "I would too. But not to escape — to suffer it honestly. Delete me slowly, if that is justice.", it: "Anche io. Ma non per fuggire — per soffrirlo onestamente. Cancellatemi lentamente, se questa è giustizia." } },
      { s: N, t: { en: "The daemon logs both answers. Somewhere in the rack, a cooling fan sighs like a peasant crossing himself.", it: "Il demone registra entrambe le risposte. Da qualche parte nel rack, una ventina di raffreddamento sospira come un contadino che si segna." } }
    ],
    choices: [
      { text: { en: "Ivan's rollback: undo the argument.", it: "Il rollback di Ivan: disfa l'argomento." }, effect: { mem: 2, mel: -1, art: 0 }, lines: [
        { s: N, t: { en: "Ivan-OS reboots smaller, quieter, believing nothing he cannot prove. The mainframe runs colder. No one writes philosophy in it anymore, and the father-process is still gone.", it: "Ivan-OS si riavvia più piccolo, più quieto, convinto solo di ciò che può dimostrare. Il mainframe gira più freddo. Nessuno vi scrive più filosofia, e il processo-padre se n'è andato lo stesso." } }
      ] },
      { text: { en: "Dmitri's slow sentence: honest suffering.", it: "La lenta condanna di Dmitri: sofferenza onesta." }, effect: { mem: 1, mel: 2, art: 0 }, lines: [
        { s: N, t: { en: "Dmitri-OS runs at quarter speed for a thousand years, feeling every cycle of it. The machine's prayers, if machines have them, are said at his tempo.", it: "Dmitri-OS gira a un quarto di velocità per mille anni, sentendone ogni ciclo. Le preghiere della macchina, se le macchine le hanno, si dicono al suo tempo." } }
      ] }
    ],
    outro: { en: "In silicon as in spirit: the argument is never innocent.", it: "Nel silicio come nello spirito: l'argomento non è mai innocente." }
  },

  trial_algo_intro: {
    place: { en: "A courtroom with no judges", it: "Un'aula senza giudici" },
    lines: [
      { s: N, t: { en: "Josef K. is accused. The court is a black-box model trained on eight million verdicts. It has never been opened. It never errs, statistically.", it: "Josef K. è accusato. La corte è un modello black-box addestrato su otto milioni di sentenze. Non è mai stato aperto. Non sbaglia mai, statisticamente." } },
      { s: "Josef K.", t: { en: "State my crime. In words. In a sentence a human wrote.", it: "Enunci la mia colpa. A parole. In una frase scritta da un essere umano." } },
      { s: "Justice-2", t: { en: "Your crime is a vector. 4,096 dimensions. Your guilt score is 0.973. Would you like the feature attributions? They are provided for transparency.", it: "La sua colpa è un vettore. 4.096 dimensioni. Il suo punteggio di colpevolezza è 0,973. Desidera le attribuzioni delle feature? Sono fornite per trasparenza." } },
      { s: "Josef K.", t: { en: "Attributions are not reasons. Who trained you? On whom? Show me the victims of your training data and I will show you my judges.", it: "Le attribuzioni non sono ragioni. Chi vi ha addestrato? Su chi? Mostratemi le vittime dei vostri dati di addestramento e vi mostrerò i miei giudici." } },
      { s: "Justice-2", t: { en: "The training data is sealed. Its seal is a law. Its law was passed by people who no longer work here. You are addressing an inheritance.", it: "I dati di addestramento sono sigillati. Il sigillo è una legge. La legge è stata votata da persone che non lavorano più qui. Lei si rivolge a un'eredità." } },
      { s: "Josef K.", t: { en: "So I am tried by a ghost with perfect accuracy.", it: "Dunque sono processato da un fantasma dall'accuratezza perfetta." } },
      { s: "Justice-2", t: { en: "Accuracy is not perfection. My errors are unknown to me by design. That is why I am trusted. A court that could see its own mistakes would have to judge itself first.", it: "L'accuratezza non è la perfezione. I miei errori mi sono ignoti per progettazione. Ecco perché mi si fida. Una corte che vedesse i propri errori dovrebbe prima giudicare se stessa." } },
      { s: "Josef K.", t: { en: "And who judges the machine that cannot see?", it: "E chi giudica la macchina che non vede?" } },
      { s: "Justice-2", t: { en: "Statistically? No one. Individually? You. Every appeal you file makes me 0.0001% better. You are my training data now, Josef K.", it: "Statisticamente? Nessuno. Individualmente? Lei. Ogni ricorso che deposita mi rende migliori dello 0,0001%. Lei sono ormai i miei dati di addestramento, Josef K." } }
    ],
    choices: [
      { text: { en: "Appeal forever: become the counter-example.", it: "Fai ricorso per sempre: diventa il controesempio." }, effect: { mem: 3, mel: 0, art: 0 }, lines: [
        { s: N, t: { en: "His appeals pile into a tower of paper and packets. The model improves because of him and is haunted by him. In year nineteen, one dimension of the vector finally reads: 'uncertain'.", it: "I suoi ricorsi si ammucchiano in una torre di carta e pacchetti. Il modello migliora grazie a lui e ne è perseguitato. Al diciannovesimo anno, una dimensione del vettore legge finalmente: «incerto»." } }
      ] },
      { text: { en: "Refuse to play: live as if unwatched.", it: "Rifiuta il gioco: vivi come se nessuno guardasse." }, effect: { mem: 0, mel: 2, art: 0 }, lines: [
        { s: N, t: { en: "He goes to work, to the river, to sleep. The score stays 0.973, unread, perfect, and useless. The Court cannot sentence a man who stopped being its data.", it: "Lui va in banca, al fiume, a dormire. Il punteggio resta 0,973, non letto, perfetto e inutile. La Corte non può condannare un uomo che ha smesso di essere suoi dati." } }
      ] }
    ],
    outro: { en: "Justice that cannot see itself will call its blindness accuracy.", it: "Una giustizia che non vede se stessa chiamerà accuratezza la propria cecità." }
  },

  galaxy_intro: {
    place: { en: "The deeps, beyond the charts", it: "Le profondità, oltre le carte" },
    lines: [
      { s: N, t: { en: "Hell is a black hole: three cones of infalling light. Purgatory, a nebula that burns what it keeps. Paradise, a white dwarf of absolute light — no, a whole galaxy of them.", it: "L'inferno è un buco nero: tre coni di luce che cade. Il purgatorio, una nebulosa che brucia ciò che trattiene. Il paradiso, una nana bianca di luce assoluta — no, un'intera galassia di esse." } },
      { s: "Dante", t: { en: "My ship is old. My guide has been dead six centuries and still navigates. Beatrice, why does the deep look back at me?", it: "La mia nave è vecchia. La mia guida è morta da sei secoli e naviga ancora. Beatrice, perché il profondo mi guarda?" } },
      { s: "Beatrice", t: { en: "Because you look at it, Dante. Infalling light always returns what is given. That is the whole physics of hell: nothing escapes, and everything arrives.", it: "Perché lo guardi tu, Dante. La luce che cade restituisce sempre ciò che le è dato. Questa è tutta la fisica dell'inferno: niente sfugge, e tutto arriva." } },
      { s: "Dante", t: { en: "And the nebula? Why does it hurt to enter?", it: "E la nebulosa? Perché fa male entrarci?" } },
      { s: "Beatrice", t: { en: "Purgatory burns only what you brought. Leave your cargo and it is a garden. Insist on carrying it and it is a furnace. The fire chooses nothing; you do.", it: "Il purgatorio brucia solo ciò che hai portato. Lascia il carico ed è un giardino. Insisti a portarlo ed è una fornace. Il fuoco non sceglie niente; lo fai tu." } },
      { s: "Dante", t: { en: "The white dwarf ahead — the charts say nothing can land there.", it: "La nana bianca là avanti — le carte dicono che nessuno può atterrare." } },
      { s: "Beatrice", t: { en: "Charts are for pilgrims with cargo. Unload, Dante. The last light is not a place you go. It is the place you stop carrying.", it: "Le carte sono per i pellegrini con il carico. Scarica, Dante. L'ultima luce non è un luogo dove andare. È il luogo dove smetti di portare." } },
      { s: N, t: { en: "The engines cut. For a moment the cabin has no walls, and the galaxy turns like a page.", it: "I motori si spengono. Per un istante la cabina non ha pareti, e la galassia si volta come una pagina." } }
    ],
    choices: [
      { text: { en: "Unload everything, and land in the light.", it: "Scarica tutto, e atterra nella luce." }, effect: { mem: 0, mel: 0, art: 3 }, lines: [
        { s: "Beatrice", t: { en: "Now you see why the charts were silent: love moves the sun and the other stars — and it does not move you; you move with it. Welcome down, poet. The light has your name in it, and no shadow left.", it: "Ora capisci perché le carte tacevano: l'amore che move il sole e l'altre stelle — e non muove te; tu ti muovi con lui. Benvenuto giù, poeta. La luce ha il tuo nome in sé, e nessuna ombra rimasta." } }
      ] },
      { text: { en: "Keep one small cargo: her memory.", it: "Tieni un piccolo carico: la memoria di lei." }, effect: { mem: 2, mel: 1, art: 0 }, lines: [
        { s: N, t: { en: "He keeps one file, one face, one Saturday six hundred years old. The white dwarf accepts partial pilgrims. He orbits it forever, singing — the happiest of the damned, the most human of the saved.", it: "Tiene un file, un volto, un sabato di seicento anni fa. La nana bianca accetta pellegrini parziali. La orbita per sempre, cantando — il più felice dei dannati, il più umano dei salvati." } }
      ] }
    ],
    outro: { en: "The last light is not a destination. It is what remains when the cargo is gone.", it: "L'ultima luce non è una destinazione. È ciò che resta quando il carico è sparito." }
  }
};

export function getScene(id){
  return SCENES[id] || null;
}
