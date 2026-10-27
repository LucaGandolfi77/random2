import CONFIG from './config.js';
import { loadState, saveState, addNote } from './storage.js';
import { initRender, clearScreen, drawDialogueText, showChoices } from './render.js';
import { playTone, playMood, initAudio } from './audio.js';

const storyData = {
  scenes: {
    intro: {
      speaker: 'Raskolnikov',
      chapterEn: 'Act I · The Garret near the Haymarket',
      chapterIt: 'Atto I · Il solaio presso Piazza del Fieno',
      textEn: "The heat in the street was terrible, and the airlessness, the bustle and the plaster, scaffolding, bricks, and dust all about him, and that special Petersburg stench... His garret was under the roof of a high, five-storied house and was more like a cupboard than a room. Six paces across, yellow wallpaper peeling from the walls, and one monstrous question burning inside his skull.",
      textIt: "Il caldo per la strada era terribile, e l'afa, la calca, la calce, le impalcature, i mattoni, la polvere dappertutto, e quel particolare fetore pietroburghese... Il suo stanzino si trovava proprio sotto il tetto d'una grande casa di cinque piani e somigliava più a un armadio che a un alloggio. Sei passi in tutto, la carta gialla che si staccava dalle pareti, e una sola mostruosa domanda che gli bruciava nel cranio.",
      background: 'dark',
      choicesEn: [
        { text: "Read your mother's letter about Dunya's sacrifice — proceed to the tavern", effect: { scene: 'marmeladov', conscience: +4, guilt: +2, hope: +2 }, sceneTextEn: "His mother's letter trembled in his hand: Dunya was selling herself into marriage with Luzhin just to send him money.", sceneTextIt: "La lettera di sua madre gli tremava nella mano: Dunja si vendeva in matrimonio a Lužin solo per mandargli del denaro." },
        { text: "Rehearse the theory of the extraordinary man", effect: { scene: 'philosophy', conscience: -3, guilt: +5, hope: -1 }, sceneTextEn: "One tiny crime... wiped out by a thousand good deeds. Is that not simple arithmetic?", sceneTextIt: "Un piccolo crimine... cancellato da mille buone azioni. Non è forse semplice aritmetica?" }
      ],
      choicesIt: [
        { text: "Leggere la lettera della madre sul sacrificio di Dunja — scendere in taverna", effect: { scene: 'marmeladov', conscience: +4, guilt: +2, hope: +2 }, sceneTextEn: "His mother's letter trembled in his hand: Dunya was selling herself into marriage with Luzhin just to send him money.", sceneTextIt: "La lettera di sua madre gli tremava nella mano: Dunja si vendeva in matrimonio a Lužin solo per mandargli del denaro." },
        { text: "Ripensare alla teoria dell'uomo straordinario", effect: { scene: 'philosophy', conscience: -3, guilt: +5, hope: -1 }, sceneTextEn: "One tiny crime... wiped out by a thousand good deeds. Is that not simple arithmetic?", sceneTextIt: "Un piccolo crimine... cancellato da mille buone azioni. Non è forse semplice aritmetica?" }
      ]
    },
    marmeladov: {
      speaker: 'Marmeladov',
      chapterEn: 'Act I · The Underground Tavern',
      chapterIt: 'Atto I · La bettola sotterranea',
      textEn: "Pity! Why should I be pitied? There is nothing to pity me for! I ought to be crucified, crucified on a cross, not pitied! Do you understand, sir, what it means when you have nowhere left to turn? My daughter Sonya went out on a yellow ticket so that the little ones might eat... And on the Last Day, He will say: 'Come forth, ye drunkards, ye weak ones, ye shameless ones — for not one of you believed yourself worthy!'",
      textIt: "Pietà! Perché aver pietà di me? Non c'è proprio di che aver pietà! Io devo essere crocifisso, crocifisso su una croce, e non compianto! Capisce, signore, che cosa significa quando non si ha più dove andare? Mia figlia Sonja è uscita col biglietto giallo perché i piccoli avessero da mangiare... E nell'Ultimo Giorno Egli dirà: «Venite avanti anche voi, ubriachi, deboli, svergognati — perché nessuno di voi si è creduto degno!»",
      background: 'dark',
      choicesEn: [
        { text: "Leave your last kopeks silently on the Marmeladovs' windowsill", effect: { scene: 'philosophy', conscience: +6, guilt: -2, hope: +4 }, sceneTextEn: "Descending the dark stairs from Katerina Ivanovna's room, he felt a strange, fierce surge of pity.", sceneTextIt: "Scendendo le scale buie dalla stanza di Katerina Ivanovna, sentì un'ondata strana e feroce di compassione." },
        { text: "Harden your heart: charity changes nothing without power", effect: { scene: 'philosophy', conscience: -4, guilt: +6, hope: -2 }, sceneTextEn: "What good are twenty kopeks when the whole world is built on the tears of Sonia and Dunya?", sceneTextIt: "A che servono venti copechi quando il mondo intero poggia sulle lacrime di Sonja e di Dunja?" }
      ],
      choicesIt: [
        { text: "Lasciare in silenzio gli ultimi copechi sul davanzale dei Marmeladov", effect: { scene: 'philosophy', conscience: +6, guilt: -2, hope: +4 }, sceneTextEn: "Descending the dark stairs from Katerina Ivanovna's room, he felt a strange, fierce surge of pity.", sceneTextIt: "Scendendo le scale buie dalla stanza di Katerina Ivanovna, sentì un'ondata strana e feroce di compassione." },
        { text: "Indurire il cuore: la carità non cambia nulla senza il potere", effect: { scene: 'philosophy', conscience: -4, guilt: +6, hope: -2 }, sceneTextEn: "What good are twenty kopeks when the whole world is built on the tears of Sonia and Dunya?", sceneTextIt: "A che servono venti copechi quando il mondo intero poggia sulle lacrime di Sonja e di Dunja?" }
      ]
    },
    philosophy: {
      speaker: 'Raskolnikov',
      chapterEn: 'Act II · The Article "On Crime"',
      chapterIt: 'Atto II · L\'articolo «Sul delitto»',
      textEn: "The article I wrote divided humanity into two categories: the ordinary material, who exist only to obey and reproduce their kind, and the extraordinary men — the Lycurguses, the Mahomets, the Napoleons — who have the right in their own conscience to step over certain obstacles if the fulfillment of their idea requires it.",
      textIt: "L'articolo che ho scritto divideva l'umanità in due categorie: il materiale ordinario, che esiste solo per obbedire e riprodurre i propri simili, e gli uomini straordinari — i Licurgo, i Maometto, i Napoleone — che hanno il diritto nella propria coscienza di scavalcare certi ostacoli se l'attuazione della loro idea lo esige.",
      background: 'interrogation',
      choicesEn: [
        { text: "Listen to the student in the tavern speaking of Alyona Ivanovna", effect: { scene: 'before_murder', conscience: -5, guilt: +8, hope: -3 }, sceneTextEn: "Why did that student in the tavern voice my exact thought at the exact same hour? It felt like predestination.", sceneTextIt: "Perché quello studente in taverna ha pronunciato il mio stesso identico pensiero nella stessa ora? Sembrava predestinazione." },
        { text: "Dream of the mare beaten to death in your childhood village", effect: { scene: 'before_murder', conscience: +5, guilt: -2, hope: +3 }, sceneTextEn: "He woke drenched in sweat: 'God, can it be that I will really take an axe and split her skull?'", sceneTextIt: "Si svegliò madido di sudore: «Dio, è possibile che io prenda davvero un'ascia e le spacchi il cranio?»" }
      ],
      choicesIt: [
        { text: "Ascoltare lo studente in taverna che parla di Alëna Ivanovna", effect: { scene: 'before_murder', conscience: -5, guilt: +8, hope: -3 }, sceneTextEn: "Why did that student in the tavern voice my exact thought at the exact same hour? It felt like predestination.", sceneTextIt: "Perché quello studente in taverna ha pronunciato il mio stesso identico pensiero nella stessa ora? Sembrava predestinazione." },
        { text: "Sognare la cavallina battuta a morte nel villaggio dell'infanzia", effect: { scene: 'before_murder', conscience: +5, guilt: -2, hope: +3 }, sceneTextEn: "He woke drenched in sweat: 'God, can it be that I will really take an axe and split her skull?'", sceneTextIt: "Si svegliò madido di sudore: «Dio, è possibile che io prenda davvero un'ascia e le spacchi il cranio?»" }
      ]
    },
    before_murder: {
      speaker: 'Raskolnikov',
      chapterEn: 'Act II · Seven Thirty in the Evening',
      chapterIt: 'Atto II · Le sette e mezzo di sera',
      textEn: "Seven hundred and thirty paces from my gate to the huge house facing the canal. The noose inside my coat holds the porter's axe. At seven o'clock Lizaveta will be in the Haymarket, and the old pawnbroker Alyona Ivanovna will be completely alone behind the bolted door.",
      textIt: "Settecentotrenta passi dal mio portone fino all'enorme casamento di fronte al canale. Il cappio cucito sotto il cappotto regge l'ascia del portinaio. Alle sette Lizaveta sarà a Piazza del Fieno, e la vecchia usuraia Alëna Ivanovna sarà completamente sola dietro la porta sbarrata.",
      background: 'murder',
      choicesEn: [
        { text: "Pull the bell-handle and cross the threshold", effect: { scene: 'after_murder', conscience: -8, guilt: +15, hope: -5 }, sceneTextEn: "The tinny bell rang once. Then Lizaveta walked into the room with her bundle — and the second, uncalculated blood was spilled.", sceneTextIt: "Il campanello di latta tintinnò una volta. Poi Lizaveta entrò nella stanza col suo fagotto — e fu versato il secondo sangue, non calcolato." },
        { text: "Tremble on the landing as the crime overtakes your will", effect: { scene: 'after_murder', conscience: +4, guilt: +10, hope: +2 }, sceneTextEn: "It was not reason that guided his feet up the stairs, but the mechanical delirium of a man caught in the teeth of a wheel.", sceneTextIt: "Non fu la ragione a guidare i suoi passi su per le scale, ma il delirio meccanico d'un uomo afferrato per il lembo del vestito dagli ingranaggi d'una ruota." }
      ],
      choicesIt: [
        { text: "Tirare il cordone del campanello e varcare la soglia", effect: { scene: 'after_murder', conscience: -8, guilt: +15, hope: -5 }, sceneTextEn: "The tinny bell rang once. Then Lizaveta walked into the room with her bundle — and the second, uncalculated blood was spilled.", sceneTextIt: "Il campanello di latta tintinnò una volta. Poi Lizaveta entrò nella stanza col suo fagotto — e fu versato il secondo sangue, non calcolato." },
        { text: "Tremare sul pianerottolo mentre il delitto travolge la volontà", effect: { scene: 'after_murder', conscience: +4, guilt: +10, hope: +2 }, sceneTextEn: "It was not reason that guided his feet up the stairs, but the mechanical delirium of a man caught in the teeth of a wheel.", sceneTextIt: "Non fu la ragione a guidare i suoi passi su per le scale, ma il delirio meccanico d'un uomo afferrato per il lembo del vestito dagli ingranaggi d'una ruota." }
      ]
    },
    after_murder: {
      speaker: 'Raskolnikov',
      chapterEn: 'Act III · The Stone & The Interrogation',
      chapterIt: 'Atto III · La pietra e l\'interrogatorio',
      textEn: "I buried the purse under a flat stone in a courtyard without even counting the rubles. Did I kill the old woman? No — I killed myself! And now Porfiry Petrovich circles me like a moth around a candle, smiling and tapping his cigarette case.",
      textIt: "Ho seppellito il borsellino sotto una pietra piatta in un cortile senza nemmeno contare i rubli. Ho forse ucciso la vecchia? No — ho ucciso me stesso! E ora Porfirij Petrovič mi gira intorno come una farfalla intorno alla candela, sorridendo e tamburellando sul portasigarette.",
      background: 'interrogation',
      choicesEn: [
        { text: "Confront Porfiry Petrovich in his office", effect: { scene: 'porfiry', conscience: +3, guilt: +4, hope: +2 }, sceneTextEn: "Porfiry winked slowly: 'And how does the extraordinary man distinguish himself from the ordinary, Rodion Romanovich? By some birthmark?'", sceneTextIt: "Porfirij ammiccò piano: «E come si distingue l'uomo straordinario dall'ordinario, Rodion Romanovič? Da qualche voglia sulla pelle?»" },
        { text: "Go directly to Sonya's room by the canal", effect: { scene: 'sonya_lazarus', conscience: +7, guilt: -3, hope: +6 }, sceneTextEn: "One candle burned in the crooked brass candlestick beside the worn New Testament Lizaveta had given her.", sceneTextIt: "Una sola candela bruciava nel candeliere d'ottone storto accanto al Vangelo logoro che Lizaveta le aveva regalato." }
      ],
      choicesIt: [
        { text: "Affrontare Porfirij Petrovič nel suo ufficio", effect: { scene: 'porfiry', conscience: +3, guilt: +4, hope: +2 }, sceneTextEn: "Porfiry winked slowly: 'And how does the extraordinary man distinguish himself from the ordinary, Rodion Romanovich? By some birthmark?'", sceneTextIt: "Porfirij ammiccò piano: «E come si distingue l'uomo straordinario dall'ordinario, Rodion Romanovič? Da qualche voglia sulla pelle?»" },
        { text: "Andare direttamente nella stanza di Sonja lungo il canale", effect: { scene: 'sonya_lazarus', conscience: +7, guilt: -3, hope: +6 }, sceneTextEn: "One candle burned in the crooked brass candlestick beside the worn New Testament Lizaveta had given her.", sceneTextIt: "Una sola candela bruciava nel candeliere d'ottone storto accanto al Vangelo logoro che Lizaveta le aveva regalato." }
      ]
    },
    porfiry: {
      speaker: 'Porfiry Petrovich',
      chapterEn: 'Act III · The Duel of Conscience',
      chapterIt: 'Atto III · Il duello della coscienza',
      textEn: "Why should I arrest you today, Rodion Romanovich? An ordinary criminal runs away; a man of psychology and pride cannot run away from himself. Even if you fled to the ends of the earth, you would come back on your own feet — because you need air, you need suffering! I give you forty-eight hours to walk in the sun.",
      textIt: "Perché dovrei arrestarla oggi, Rodion Romanovič? Un delinquente comune scappa; un uomo di psicologia e d'orgoglio non può scappare da se stesso. Anche se fuggisse in capo al mondo, tornerebbe con le sue gambe — perché lei ha bisogno d'aria, ha bisogno di soffrire! Le lascio quarantotto ore per camminare al sole.",
      background: 'interrogation',
      choicesEn: [
        { text: "Leave Porfiry and seek out Sonya to confess", effect: { scene: 'sonya_lazarus', conscience: +6, guilt: -2, hope: +6 }, sceneTextEn: "I must tell Sonya today. Without her, I cannot carry this stone another hour.", sceneTextIt: "Devo dirlo a Sonja oggi stesso. Senza di lei non posso portare questa pietra un'ora di più." }
      ],
      choicesIt: [
        { text: "Lasciare Porfirij e cercare Sonja per confessare", effect: { scene: 'sonya_lazarus', conscience: +6, guilt: -2, hope: +6 }, sceneTextEn: "I must tell Sonya today. Without her, I cannot carry this stone another hour.", sceneTextIt: "Devo dirlo a Sonja oggi stesso. Senza di lei non posso portare questa pietra un'ora di più." }
      ]
    },
    sonya_lazarus: {
      speaker: 'Sonya',
      chapterEn: 'Act IV · The Raising of Lazarus',
      chapterIt: 'Atto IV · La resurrezione di Lazzaro',
      textEn: "The candle end was flickering out in the battered candlestick, dimly lighting up in that poverty-stricken room the murderer and the harlot who had come together so strangely to read the eternal book. 'Jesus said unto her: I am the resurrection and the life... Lazarus, come forth!' And he that was dead came forth.",
      textIt: "Il moccolo si spegneva ormai nel candeliere storto, rischiarando fiocamente in quella misera stanza l'assassino e la peccatrice stranamente riuniti a leggere il libro eterno. «Gesù le disse: Io sono la risurrezione e la vita... Lazzaro, vieni fuori!» E il morto uscì.",
      background: 'redemption',
      choicesEn: [
        { text: "Look into Sonya's eyes until she guesses the truth without a word", effect: { scene: 'redemption_start', conscience: +8, guilt: -4, hope: +8 }, sceneTextEn: "'What have you done — what have you done to yourself!' she cried, flinging her arms around his neck. 'There is no one, no one in the whole world unhappier than you!'", sceneTextIt: "«Che avete fatto — che avete fatto a voi stesso!» gridò lei, gettandogli le braccia al collo. «Non c'è nessuno, nessuno al mondo più infelice di te!»" },
        { text: "Explain that you wanted to become a Napoleon", effect: { scene: 'redemption_start', conscience: +2, guilt: +4, hope: +3 }, sceneTextEn: "Sonya shook her head in horror: 'You turned away from God, and God has struck you down!'", sceneTextIt: "Sonja scosse il capo inorridita: «Vi siete allontanato da Dio, e Dio vi ha colpito!»" }
      ],
      choicesIt: [
        { text: "Guardare Sonja negli occhi finché non indovina la verità senza una parola", effect: { scene: 'redemption_start', conscience: +8, guilt: -4, hope: +8 }, sceneTextEn: "'What have you done — what have you done to yourself!' she cried, flinging her arms around his neck. 'There is no one, no one in the whole world unhappier than you!'", sceneTextIt: "«Che avete fatto — che avete fatto a voi stesso!» gridò lei, gettandogli le braccia al collo. «Non c'è nessuno, nessuno al mondo più infelice di te!»" },
        { text: "Spiegare che volevi diventare un Napoleone", effect: { scene: 'redemption_start', conscience: +2, guilt: +4, hope: +3 }, sceneTextEn: "Sonya shook her head in horror: 'You turned away from God, and God has struck you down!'", sceneTextIt: "Sonja scosse il capo inorridita: «Vi siete allontanato da Dio, e Dio vi ha colpito!»" }
      ]
    },
    redemption_start: {
      speaker: 'Sonya',
      chapterEn: 'Act IV · The Cypress Cross & The Haymarket',
      chapterIt: 'Atto IV · La croce di cipresso e Piazza del Fieno',
      textEn: "Go at once, this very minute, stand at the crossroads, bow down, first kiss the earth which you have defiled, and then bow to all the world and say to all men aloud: 'I am a murderer!' Then God will send you life again. Will you go? I will follow you to Siberia in chains!",
      textIt: "Va' subito, in questo stesso istante, fermati al crocevia, inchinati, bacia prima la terra che hai profanato, e poi inchinati a tutto il mondo, ai quattro punti cardinali, e di' a tutti ad alta voce: «Io ho ucciso!» Allora Dio ti manderà di nuovo la vita. Andrai? Io ti seguirò in Siberia, ai lavori forzati!",
      background: 'redemption',
      choicesEn: [
        { text: "Put on the cypress cross, kiss the earth at the Haymarket, and follow Sonya to Siberia", effect: { scene: 'ending_redemption', conscience: +12, guilt: -15, hope: +15 }, sceneTextEn: "He knelt in the middle of the square and kissed the muddy earth with sudden, inexplicable joy.", sceneTextIt: "S'inginocchiò in mezzo alla piazza e baciò quella terra fangosa con una gioia improvvisa e inesplicabile." },
        { text: "Walk into the police station and lay the confession before Ilya Petrovich", effect: { scene: 'ending_justice', conscience: +8, guilt: -8, hope: +8 }, sceneTextEn: "'It was I who killed the old official's widow and her sister Lizaveta with an axe and robbed them.'", sceneTextIt: "«Sono stato io a uccidere a colpi d'ascia la vecchia vedova dell'impiegato e sua sorella Lizaveta, e a derubarle.»" },
        { text: "Turn back from the stairs and lock yourself inside the theory", effect: { scene: 'ending_isolation', conscience: -6, guilt: +12, hope: -6 }, sceneTextEn: "Pride held his tongue at the threshold, and the garret closed around him like a coffin.", sceneTextIt: "L'orgoglio gli legò la lingua sulla soglia, e il solaio si richiuse intorno a lui come una bara." }
      ],
      choicesIt: [
        { text: "Mettere al collo la croce di cipresso, baciare la terra e seguire Sonja in Siberia", effect: { scene: 'ending_redemption', conscience: +12, guilt: -15, hope: +15 }, sceneTextEn: "He knelt in the middle of the square and kissed the muddy earth with sudden, inexplicable joy.", sceneTextIt: "S'inginocchiò in mezzo alla piazza e baciò quella terra fangosa con una gioia improvvisa e inesplicabile." },
        { text: "Entrare al commissariato e deporre la confessione davanti a Il'ja Petrovič", effect: { scene: 'ending_justice', conscience: +8, guilt: -8, hope: +8 }, sceneTextEn: "'It was I who killed the old official's widow and her sister Lizaveta with an axe and robbed them.'", sceneTextIt: "«Sono stato io a uccidere a colpi d'ascia la vecchia vedova dell'impiegato e sua sorella Lizaveta, e a derubarle.»" },
        { text: "Tornare indietro dalle scale e rinchiudersi nella propria teoria", effect: { scene: 'ending_isolation', conscience: -6, guilt: +12, hope: -6 }, sceneTextEn: "Pride held his tongue at the threshold, and the garret closed around him like a coffin.", sceneTextIt: "L'orgoglio gli legò la lingua sulla soglia, e il solaio si richiuse intorno a lui come una bara." }
      ]
    },
    ending_redemption: {
      speaker: 'Narrator',
      chapterEn: 'Epilogue · On the Banks of the Irtysh, Siberia',
      chapterIt: 'Epilogo · Sulle rive dell\'Irtyš, Siberia',
      background: 'siberia',
      textEn: "On the high bank of the wide Siberian river, in the pale spring sun after Easter, Sonya sat beside him. Suddenly something seemed to lift him and fling him at her feet. He wept and embraced her knees. In her eyes shone infinite happiness: the heart of one held an inexhaustible source of life for the heart of the other. Seven years remained — and they seemed to him like seven days.",
      textIt: "Sull'alta riva dell'ampio fiume siberiano, nel pallido sole di primavera dopo Pasqua, Sonja sedeva accanto a lui. D'un tratto qualcosa parve sollevarlo e gettarlo ai suoi piedi. Pianse e le abbracciò le ginocchia. Negli occhi di lei brillava una felicità infinita: il cuore dell'uno racchiudeva una fonte inesauribile di vita per il cuore dell'altro. Restavano sette anni — e gli sembrarono sette giorni."
    },
    ending_isolation: {
      speaker: 'Raskolnikov',
      chapterEn: 'Epilogue · The Eternal Garret',
      chapterIt: 'Epilogo · Il solaio eterno',
      background: 'murder',
      textEn: "I am alone. The theory was flawless on paper, yet a single drop of real blood has turned the air to lead. Without confession, even freedom is a cell six paces wide.",
      textIt: "Sono solo. La teoria era impeccabile sulla carta, eppure una sola goccia di sangue vero ha mutato l'aria in piombo. Senza confessione, persino la libertà è una cella larga sei passi."
    },
    ending_justice: {
      speaker: 'Porfiry Petrovich',
      chapterEn: 'Epilogue · Recognition & The Convoy East',
      chapterIt: 'Epilogo · Il riconoscimento e il convoglio verso Est',
      background: 'siberia',
      textEn: "Justice is not punishment alone, Rodion Romanovich — it is the end of the lie. Under your pillow in the prison hospital lies the New Testament she gave you. That is the beginning of a new story, the story of the gradual renewal of a man.",
      textIt: "La giustizia non è solo punizione, Rodion Romanovič — è la fine della menzogna. Sotto il suo cuscino nell'ospedale del carcere c'è il Vangelo che lei le ha donato. Qui comincia una nuova storia, la storia del graduale rinnovamento di un uomo."
    }
  }
};

let state = { language: 'en', scene: 'intro', conscience: 12, guilt: 85, hope: 8, notes: [], lastReactionEn: '', lastReactionIt: '' };

function syncLangFromAnthology() {
  try {
    const a = JSON.parse(localStorage.getItem('anthology-state') || '{}');
    if (a && (a.language === 'it' || a.language === 'en')) {
      state.language = a.language;
      CONFIG.language = a.language;
    }
  } catch (e) {}
}

function updateLabels() {
  const lang = CONFIG.language || state.language || 'en';
  const t = CONFIG.themes[lang] || CONFIG.themes.en;
  const cEl = document.getElementById('lbl-conscience');
  const gEl = document.getElementById('lbl-guilt');
  const hEl = document.getElementById('lbl-hope');
  if (cEl) cEl.textContent = t.conscienceLabel;
  if (gEl) gEl.textContent = t.guiltLabel;
  if (hEl) hEl.textContent = t.hopeLabel;
  const langBtn = document.getElementById('lang-btn');
  if (langBtn) langBtn.textContent = lang === 'it' ? 'Language: English' : 'Lingua: Italiano';
  const backBtn = document.getElementById('back-lib-btn');
  if (backBtn) backBtn.textContent = lang === 'it' ? '← La Biblioteca' : '← The Library';
  const restartBtn = document.getElementById('restart-btn');
  if (restartBtn) restartBtn.textContent = lang === 'it' ? '↻ Ricomincia' : '↻ Restart';
}

function renderScene() {
  const scene = storyData.scenes[state.scene] || storyData.scenes.intro;
  if (!scene) return;
  clearScreen(scene.background || 'dark');
  const lang = CONFIG.language || state.language || 'en';
  updateLabels();

  document.getElementById('speaker').textContent = scene.speaker;
  const chEl = document.getElementById('scene-chapter');
  if (chEl) chEl.textContent = lang === 'it' ? (scene.chapterIt || scene.chapterEn || '') : (scene.chapterEn || '');

  const reactBanner = document.getElementById('reaction-banner');
  if (reactBanner) {
    const rText = lang === 'it' ? state.lastReactionIt : state.lastReactionEn;
    if (rText) {
      reactBanner.textContent = rText;
      reactBanner.classList.remove('hidden');
    } else {
      reactBanner.classList.add('hidden');
    }
  }

  const text = lang === 'it' ? (scene.textIt || scene.textEn) : (scene.textEn || scene.textIt);
  drawDialogueText(text);
  updateStats();
  addChoiceButtons();
}

function updateStats() {
  document.getElementById('conscience-val').textContent = state.conscience;
  document.getElementById('guilt-val').textContent = state.guilt;
  document.getElementById('hope-val').textContent = state.hope;
}

function fmtEff(eff, lang) {
  if (!eff) return '';
  const labels = CONFIG.themes[lang] || CONFIG.themes.en;
  const parts = [];
  if (eff.conscience) parts.push((eff.conscience > 0 ? '+' : '') + eff.conscience + ' ' + labels.conscienceLabel);
  if (eff.guilt) parts.push((eff.guilt > 0 ? '+' : '') + eff.guilt + ' ' + labels.guiltLabel);
  if (eff.hope) parts.push((eff.hope > 0 ? '+' : '') + eff.hope + ' ' + labels.hopeLabel);
  return parts.join(' · ');
}

function addChoiceButtons() {
  const current = storyData.scenes[state.scene];
  const container = document.getElementById('choices');
  if (!current || !container) return;
  const lang = CONFIG.language || state.language || 'en';
  const choices = lang === 'it' ? (current.choicesIt || current.choicesEn) : (current.choicesEn || current.choicesIt);
  container.innerHTML = '';

  if (Array.isArray(choices) && choices.length > 0) {
    choices.forEach((c) => {
      const btn = document.createElement('button');
      const spanTxt = document.createElement('span');
      spanTxt.textContent = c.text;
      const spanEff = document.createElement('span');
      spanEff.className = 'eff-tag';
      spanEff.textContent = fmtEff(c.effect, lang);
      btn.appendChild(spanTxt);
      btn.appendChild(spanEff);
      btn.onclick = () => applyChoice(c);
      container.appendChild(btn);
    });
  } else {
    // Ending reached: offer Restart and Return to Library
    const btnRestart = document.createElement('button');
    btnRestart.innerHTML = `<span>${lang === 'it' ? '↻ Rileggi dall\'inizio' : '↻ Read Again from Act I'}</span><span class="eff-tag">Act I</span>`;
    btnRestart.onclick = () => window.restartStory();
    container.appendChild(btnRestart);

    const btnLib = document.createElement('button');
    btnLib.innerHTML = `<span>${lang === 'it' ? '← Ritorna alla Biblioteca' : '← Return to The Library'}</span><span class="eff-tag">Anthology</span>`;
    btnLib.onclick = () => { window.location.href = '../anthology-pwa/'; };
    container.appendChild(btnLib);
  }
}

function applyChoice(choice) {
  state.conscience += choice.effect.conscience || 0;
  state.guilt += choice.effect.guilt || 0;
  state.hope += choice.effect.hope || 0;
  state.scene = choice.effect.scene;
  state.lastReactionEn = choice.sceneTextEn || '';
  state.lastReactionIt = choice.sceneTextIt || '';
  state.conscience = Math.max(0, Math.min(100, state.conscience));
  state.guilt = Math.max(0, Math.min(100, state.guilt));
  state.hope = Math.max(0, Math.min(100, state.hope));
  addNote(choice.text);
  saveState(state);
  playTone(330, 0.18);
  renderScene();
}

export function initMain() {
  initRender();
  initAudio();
  const saved = loadState();
  if (saved) state = { ...state, ...saved };
  syncLangFromAnthology();
  if (!storyData.scenes[state.scene]) state.scene = 'intro';
  CONFIG.language = state.language || 'en';

  window.switchLang = () => {
    CONFIG.language = CONFIG.language === 'en' ? 'it' : 'en';
    state.language = CONFIG.language;
    saveState(state);
    try {
      const a = JSON.parse(localStorage.getItem('anthology-state') || '{}');
      a.language = CONFIG.language;
      localStorage.setItem('anthology-state', JSON.stringify(a));
    } catch (e) {}
    renderScene();
  };

  window.restartStory = () => {
    state.scene = 'intro';
    state.conscience = 12;
    state.guilt = 85;
    state.hope = 8;
    state.lastReactionEn = '';
    state.lastReactionIt = '';
    saveState(state);
    playTone(261.6, 0.25);
    renderScene();
  };

  renderScene();
  if (state.scene === 'intro') playMood('dark');
}

export function showDialogue(text, speaker = 'Narrator') {
  drawDialogueText(text);
  document.getElementById('speaker').textContent = speaker;
}

export default { initMain, showDialogue };

initMain();
