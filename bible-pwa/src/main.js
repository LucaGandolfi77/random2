import CONFIG from './config.js';
import { loadState, saveState, addNote } from './storage.js';
import { initRender, clearScreen } from './render.js';
import { initAudio, playScripture } from './audio.js';

const BIBLE_BOOKS = {
  genesis: {
    title: { en: 'Genesis — Creation & Covenant', it: 'Genesi — Creazione e Alleanza' },
    speaker: 'Scripture',
    chapters: [
      {
        speaker: { en: 'Genesis 1:1–2', it: 'Genesi 1:1–2' },
        text: { en: 'In the beginning God created the heavens and the earth. Now the earth was formless and empty — darkness covered the face of the deep waters. And the Spirit of God hovered over the waters.', it: 'Nel principio Dio creò i cieli e la terra. Ora la terra era informe e vuota — le tenebre coprivano la faccia delle acque profonde. E lo Spirito di Dio aleggiava sulle acque.' },
        stat: { mem: 2, mel: 1, art: 2 },
        choices: [
          { text: { en: 'Hear the first word: "Let there be light"', it: 'Ascolta la prima parola: «Sia la luce»' }, eff: { mem: 3, mel: 0, art: 2 } },
          { text: { en: 'Contemplate the Spirit hovering over the deep', it: 'Contempla lo Spirito che aleggia sulle acque' }, eff: { mem: 2, mel: 2, art: 3 } }
        ]
      },
      {
        speaker: { en: 'Genesis 1:3–4', it: 'Genesi 1:3–4' },
        text: { en: 'And God said, Let there be light — and there was light. God saw that the light was good, and separated the light from the darkness.', it: 'E Dio disse, Sia la luce — e la luce fu. Dio vide che la luce era buona, e separò la luce dalle tenebre.' },
        stat: { mem: 4, mel: 1, art: 2 }
      },
      {
        speaker: { en: 'Genesis 1:16', it: 'Genesi 1:16' },
        text: { en: 'God made two great lights — the sun to rule the day and the moon to rule the night. He also made the stars.', it: 'Dio fece due grandi luci — il sole per governare il giorno e la luna per governare la notte. Fece anche le stelle.' },
        stat: { mem: 3, mel: 2, art: 3 }
      },
      {
        speaker: { en: 'Genesis 1:27', it: 'Genesi 1:27' },
        text: { en: 'So God created mankind in his own image — in the image of God he created them; male and female he created them. And God blessed them.', it: 'Così Dio creò l\'umanità a sua immagine — a immagine di Dio li creò; maschio e femmina li creò. E Dio li benedisse.' },
        stat: { mem: 5, mel: 1, art: 4 }
      },
      {
        speaker: { en: 'Genesis 3:8–9', it: 'Genesi 3:8–9' },
        text: { en: 'They heard the sound of the Lord God walking in the garden in the cool of the day, and they hid among the trees. And the Lord God called unto Adam: "Where are you?"', it: 'Udirono il passo del Signore Dio che passeggiava nel giardino alla brezza del giorno, e si nascosero tra gli alberi. E il Signore Dio chiamò Adamo: «Dove sei?»' },
        stat: { mem: 5, mel: 4, art: 3 }
      },
      {
        speaker: { en: 'Genesis 15:5', it: 'Genesi 15:5' },
        text: { en: 'God brought Abraham outside at night and said: Look now toward heaven, and count the stars, if you are able to number them. So shall your descendants be.', it: 'Dio condusse fuori Abramo nella notte e gli disse: Guarda in cielo e conta le stelle, se riesci a contarle. Tale sarà la tua discendenza.' },
        stat: { mem: 6, mel: 2, art: 6 }
      },
      {
        speaker: { en: 'Genesis 50:20', it: 'Genesi 50:20' },
        text: { en: 'Joseph wept and said to his brothers in Egypt: Do not be afraid. You intended evil against me, but God intended it for good, to preserve many lives.', it: 'Giuseppe pianse e disse ai suoi fratelli in Egitto: Non temete. Voi avevate pensato del male contro di me, ma Dio ha pensato di convertirlo in bene, per salvare la vita a un popolo numeroso.' },
        stat: { mem: 8, mel: 3, art: 6 }
      }
    ]
  },
  exodus: {
    title: { en: 'Exodus — Liberation', it: 'Esodo — Liberazione' },
    speaker: 'Scripture',
    chapters: [
      {
        speaker: { en: 'Exodus 3:2–5', it: 'Esodo 3:2–5' },
        text: { en: 'The bush burned with fire, and yet the bush was not consumed. God called from the flame: Take off your sandals, Moses, for the place where you stand is holy ground.', it: 'Il roveto ardeva nel fuoco, ma quel roveto non si consumava. Dio chiamò dalla fiamma: Togliti i sandali dai piedi, Mosè, poiché il luogo sul quale tu stai è suolo santo.' },
        stat: { mem: 4, mel: 4, art: 3 }
      },
      {
        speaker: { en: 'Exodus 3:14', it: 'Esodo 3:14' },
        text: { en: 'God said to Moses: I AM WHO I AM. Tell the children of Israel: I Have Heard Your Cry in Egypt, and I have come down to deliver you.', it: 'Dio disse a Mosè: IO SONO COLUI CHE SONO. Di\' ai figli d\'Israele: Ho udito il vostro grido in Egitto, e sono sceso per liberarvi.' },
        stat: { mem: 6, mel: 3, art: 4 }
      },
      {
        speaker: { en: 'Exodus 14:21–22', it: 'Esodo 14:21–22' },
        text: { en: 'Moses stretched out his hand over the sea. The waters were divided, and the people of Israel walked through the midst of the sea on dry ground, with a wall of water on their right and on their left.', it: 'Mosè stese la mano sul mare. Le acque si divisero, e i figli d\'Israele entrarono in mezzo al mare sull\'asciutto, e le acque erano per loro come un muro a destra e a sinistra.' },
        stat: { mem: 8, mel: 3, art: 5 },
        action: 'red_sea'
      },
      {
        speaker: { en: 'Exodus 20:1–3', it: 'Esodo 20:1–3' },
        text: { en: 'On Mount Sinai, in thunder and cloud, God spoke all these words: I am the Lord your God, who brought you out of the house of bondage. You shall have no other gods before me.', it: 'Sul monte Sinai, tra tuoni e nube, Dio pronunciò tutte queste parole: Io sono il Signore tuo Dio, che ti ho fatto uscire dalla casa di schiavitù. Non avrai altri dèi di fronte a me.' },
        stat: { mem: 6, mel: 3, art: 6 }
      }
    ]
  },
  psalms: {
    title: { en: 'Psalms — Prayer', it: 'Salmi — Preghiera' },
    speaker: 'Scripture',
    chapters: [
      {
        speaker: { en: 'Psalm 23', it: 'Salmo 23' },
        text: { en: 'The Lord is my shepherd, I shall not want. He makes me lie down in green pastures; he leads me beside still waters; he restores my soul. Even though I walk through the valley of the shadow of death, I will fear no evil.', it: 'Il Signore è il mio pastore, non manco di nulla. Su pascoli erbosi mi fa riposare, ad acque tranquille mi conduce; rinfranca l\'anima mia. Anche se vado per una valle oscura, non temo alcun male.' },
        stat: { mem: 7, mel: 2, art: 5 }
      },
      {
        speaker: { en: 'Psalm 51', it: 'Salmo 51' },
        text: { en: 'Create in me a clean heart, O God, and renew a right spirit within me. Cast me not away from your presence; a broken and contrite heart, O God, you will not despise.', it: 'Crea in me, o Dio, un cuore puro, rinnova in me uno spirito saldo. Non scacciarmi dalla tua presenza; uno spirito contrito e un cuore affranto, o Dio, tu non disprezzi.' },
        stat: { mem: 8, mel: 5, art: 5 }
      },
      {
        speaker: { en: 'Psalm 137', it: 'Salmo 137' },
        text: { en: 'By the rivers of Babylon we sat and wept, when we remembered Zion. On the willows there we hung up our harps. If I forget you, O Jerusalem, let my right hand wither.', it: 'Sui fiumi di Babilonia, là sedevamo e piangevamo ricordandoci di Sion. Ai salici di quella terra appendemmo le nostre cetre. Se ti dimentico, Gerusalemme, si paralizzi la mia destra.' },
        stat: { mem: 9, mel: 7, art: 6 }
      }
    ]
  },
  gospels: {
    title: { en: 'Gospels — The Word', it: 'Vangeli — La Parola' },
    speaker: 'Scripture',
    chapters: [
      {
        speaker: { en: 'John 1:1–5', it: 'Giovanni 1:1–5' },
        text: { en: 'In the beginning was the Word, and the Word was with God, and the Word was God. In him was life, and that life was the light of all mankind. The light shines in the darkness, and the darkness has not overcome it.', it: 'In principio era il Verbo, e il Verbo era presso Dio e il Verbo era Dio. In lui era la vita e la vita era la luce degli uomini; la luce splende nelle tenebre e le tenebre non l\'hanno vinta.' },
        stat: { mem: 10, mel: 1, art: 8 }
      },
      {
        speaker: { en: 'Matthew 5:3–8', it: 'Matteo 5:3–8' },
        text: { en: 'Blessed are the poor in spirit, for theirs is the kingdom of heaven. Blessed are those who mourn, for they shall be comforted. Blessed are the pure in heart, for they shall see God.', it: 'Beati i poveri in spirito, perché di essi è il regno dei cieli. Beati quelli che sono nel pianto, perché saranno consolati. Beati i puri di cuore, perché vedranno Dio.' },
        stat: { mem: 7, mel: 3, art: 6 }
      },
      {
        speaker: { en: 'Luke 10:33–34', it: 'Luca 10:33–34' },
        text: { en: 'A Samaritan, as he traveled, came where the wounded man was; and when he saw him, he took pity on him. He bound up his wounds, pouring on oil and wine, and brought him to an inn.', it: 'Un Samaritano, che era in viaggio, passandogli accanto lo vide e ne ebbe compassione. Gli si fece vicino, gli fasciò le ferite versandovi olio e vino, e lo portò in una locanda.' },
        stat: { mem: 8, mel: 2, art: 6 }
      },
      {
        speaker: { en: 'Luke 23:34 & 24:5–6', it: 'Luca 23:34 & 24:5–6' },
        text: { en: 'From the cross he said: "Father, forgive them, for they do not know what they are doing." And on the first day of the week, at early dawn, the stone was rolled away: "Why do you seek the living among the dead? He is not here, but has risen."', it: 'Dalla croce disse: «Padre, perdona loro perché non sanno quello che fanno». E il primo giorno della settimana, di buon mattino, la pietra era stata rotolata via: «Perché cercate tra i morti colui che è vivo? Non è qui, è risorto».' },
        stat: { mem: 10, mel: 2, art: 9 },
        action: 'resurrection'
      }
    ]
  },
  acts: {
    title: { en: 'Acts — The Spirit', it: 'Atti — Lo Spirito' },
    speaker: 'Scripture',
    chapters: [
      {
        speaker: { en: 'Acts 2:1–4', it: 'Atti 2:1–4' },
        text: { en: 'When the day of Pentecost arrived, they were all together in one place. Suddenly a sound like the blowing of a violent wind came from heaven, and tongues as of fire rested on each one of them.', it: 'Mentre stava compiendosi il giorno della Pentecoste, si trovavano tutti insieme nello stesso luogo. Venne all\'improvviso dal cielo un fragore, quasi un vento che si abbatte impetuoso, e apparvero loro lingue come di fuoco.' },
        stat: { mem: 6, mel: 2, art: 6 }
      },
      {
        speaker: { en: 'Acts 2:42 & 1 Cor 13', it: 'Atti 2:42 & 1 Cor 13' },
        text: { en: 'They devoted themselves to the apostles\' teaching and to the breaking of bread. For now we see in a mirror dimly, but then face to face. Now abide faith, hope, love, these three; but the greatest of these is love.', it: 'Erano perseveranti nell\'insegnamento degli apostoli e nello spezzare il pane. Poiché ora vediamo come in uno specchio, in maniera confusa; ma allora vedremo faccia a faccia. Ora dunque rimangono queste tre cose: la fede, la speranza e la carità; ma di tutte più grande è la carità.' },
        stat: { mem: 8, mel: 2, art: 8 }
      }
    ]
  },
  revelation: {
    title: { en: 'Revelation — The End & New Creation', it: 'Apocalisse — La Fine e la Nuova Creazione' },
    speaker: 'Scripture',
    chapters: [
      {
        speaker: { en: 'Revelation 21:1–4', it: 'Apocalisse 21:1–4' },
        text: { en: 'Then I saw a new heaven and a new earth. And he will wipe away every tear from their eyes, and death shall be no more, neither shall there be mourning, nor crying, nor pain anymore, for the former things have passed away.', it: 'Vidi poi un nuovo cielo e una nuova terra. Ed egli asciugherà ogni lacrima dai loro occhi e non vi sarà più la morte, né lutto, né lamento, né affanno, perché le cose di prima sono passate.' },
        stat: { mem: 12, mel: 0, art: 10 }
      },
      {
        speaker: { en: 'Revelation 22:13–17', it: 'Apocalisse 22:13–17' },
        text: { en: 'I am the Alpha and the Omega, the first and the last, the beginning and the end. The Spirit and the Bride say, "Come." And let the one who is thirsty come; let the one who desires take the water of life without price.', it: 'Io sono l\'Alfa e l\'Omega, il Primo e l\'Ultimo, il Principio e la Fine. Lo Spirito e la Sposa dicono: «Vieni!». E chi ha sete venga; chi vuole, prenda gratuitamente l\'acqua della vita.' },
        stat: { mem: 14, mel: 0, art: 12 }
      }
    ]
  }
};

let state = { language: 'en', currentBook: 'genesis', chapterIndex: 0, mem: 4, mel: 3, art: 6, notes: [], readTime: 0, visited: ['genesis'] };

function syncLang() {
  try {
    const a = JSON.parse(localStorage.getItem('anthology-state') || '{}');
    if (a && (a.language === 'it' || a.language === 'en')) {
      state.language = a.language;
      CONFIG.language = a.language;
    }
  } catch (e) {}
}

function getNextBook(current) {
  const order = ['genesis', 'exodus', 'psalms', 'gospels', 'acts', 'revelation'];
  const idx = order.indexOf(current);
  if (idx >= 0 && idx < order.length - 1) return order[idx + 1];
  return null;
}

function applyStatEffect(effect) {
  if (!effect) return;
  state.mem = Math.max(0, Math.min(99, (state.mem || 0) + (effect.mem || 0)));
  state.mel = Math.max(0, Math.min(99, (state.mel || 0) + (effect.mel || 0)));
  state.art = Math.max(0, Math.min(99, (state.art || 0) + (effect.art || 0)));
  saveState(state);
}

function showFlashIndicator(msg) {
  const ind = document.getElementById('memory-indicator');
  if (!ind) return;
  ind.textContent = msg;
  ind.classList.remove('hidden');
  setTimeout(() => ind.classList.add('hidden'), 1400);
}

function renderBook(bookName, chIndex) {
  if (!BIBLE_BOOKS[bookName]) bookName = 'genesis';
  const book = BIBLE_BOOKS[bookName];
  if (!book.chapters[chIndex]) chIndex = 0;
  state.currentBook = bookName;
  state.chapterIndex = chIndex;

  const ch = book.chapters[chIndex];
  const lang = CONFIG.language || 'en';
  const bookTitle = lang === 'it' ? book.title.it : book.title.en;

  const bLbl = document.getElementById('book-label');
  if (bLbl) bLbl.textContent = bookTitle.split(' — ')[0];
  const chLbl = document.getElementById('ch-label');
  if (chLbl) chLbl.textContent = chIndex + 1;
  const vsLbl = document.getElementById('vs-label');
  if (vsLbl) vsLbl.textContent = book.chapters.length;

  const spk = typeof ch.speaker === 'object' ? (ch.speaker[lang] || ch.speaker.en) : (ch.speaker || 'Scripture');
  document.getElementById('speaker').textContent = spk;
  const vRef = document.getElementById('verse-ref');
  if (vRef) vRef.textContent = `${bookTitle} · (${chIndex + 1}/${book.chapters.length})`;
  document.getElementById('dialogue-text').textContent = ch.text[lang] || ch.text.en;

  clearScreen(bookName);

  const memEl = document.getElementById('mem');
  const melEl = document.getElementById('mel');
  const artEl = document.getElementById('art');
  if (memEl) memEl.textContent = state.mem;
  if (melEl) melEl.textContent = state.mel;
  if (artEl) artEl.textContent = state.art;

  const btnLang = document.getElementById('btn-lang');
  if (btnLang) btnLang.textContent = lang === 'it' ? 'Language: English' : 'Lingua: Italiano';
  const btnLib = document.getElementById('btn-lib');
  if (btnLib) btnLib.textContent = lang === 'it' ? '← La Biblioteca' : '← The Library';
  const btnBooks = document.getElementById('btn-books');
  if (btnBooks) btnBooks.textContent = lang === 'it' ? '☰ Libri' : '☰ Books';

  addChoiceButtons(ch);
}

function advancePassage(eff) {
  applyStatEffect(eff);
  playScripture(261.63 + (state.chapterIndex * 22), 1.8);
  state.readTime += 25000;
  const bookName = state.currentBook;
  const nextIndex = state.chapterIndex + 1;
  const bookData = BIBLE_BOOKS[bookName];

  if (bookData && bookData.chapters[nextIndex]) {
    renderBook(bookName, nextIndex);
  } else {
    const nextBook = getNextBook(bookName);
    if (nextBook) {
      renderBook(nextBook, 0);
    } else {
      renderBook('genesis', 0);
    }
  }
}

function addChoiceButtons(ch) {
  const container = document.getElementById('choices');
  if (!container) return;
  container.innerHTML = '';
  const lang = CONFIG.language || 'en';
  const baseStat = ch.stat || ch.statEffect || { mem: 3, mel: 1, art: 2 };

  if (Array.isArray(ch.choices) && ch.choices.length) {
    ch.choices.forEach((c) => {
      const btn = document.createElement('button');
      btn.innerHTML = `<span>${c.text[lang] || c.text.en}</span><span class="eff-tag">+${(c.eff && c.eff.mem) || 2} ${lang === 'it' ? 'Memoria' : 'Memory'}</span>`;
      btn.onclick = () => advancePassage(c.eff || baseStat);
      container.appendChild(btn);
    });
  } else {
    const isLastOfAll = state.currentBook === 'revelation' && state.chapterIndex === BIBLE_BOOKS.revelation.chapters.length - 1;
    const btnNext = document.createElement('button');
    if (isLastOfAll) {
      btnNext.innerHTML = `<span>${lang === 'it' ? '↻ Ricomincia dalla Genesi' : '↻ Begin Anew from Genesis'}</span><span class="eff-tag">Alpha & Omega</span>`;
    } else {
      btnNext.innerHTML = `<span>${lang === 'it' ? 'Prosegui nella Scrittura ▸' : 'Continue in Scripture ▸'}</span><span class="eff-tag">+${baseStat.mem || 2} ${lang === 'it' ? 'Memoria' : 'Memory'}</span>`;
    }
    btnNext.onclick = () => advancePassage(baseStat);
    container.appendChild(btnNext);
  }

  const btnPrayer = document.createElement('button');
  btnPrayer.innerHTML = `<span>${lang === 'it' ? '✧ Meditazione silenziosa sul versetto' : '✧ Silent Contemplation on this Verse'}</span><span class="eff-tag">+3 ${lang === 'it' ? 'Grazia' : 'Grace'}</span>`;
  btnPrayer.onclick = () => {
    playScripture(329.63, 2.4);
    applyStatEffect({ mem: 2, mel: 1, art: 3 });
    addNote('Contemplated: ' + state.currentBook + ' ' + (state.chapterIndex + 1));
    showFlashIndicator(lang === 'it' ? 'Verso custodito nella memoria' : 'Verse kept in memory');
    const memEl = document.getElementById('mem');
    const melEl = document.getElementById('mel');
    const artEl = document.getElementById('art');
    if (memEl) memEl.textContent = state.mem;
    if (melEl) melEl.textContent = state.mel;
    if (artEl) artEl.textContent = state.art;
  };
  container.appendChild(btnPrayer);
}

export function initMain() {
  initRender();
  initAudio();
  const saved = loadState();
  if (saved) state = { ...state, ...saved };
  syncLang();
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
    renderBook(state.currentBook, state.chapterIndex);
  };

  window.startBible = () => {
    const sm = document.getElementById('start-menu');
    if (sm) sm.classList.add('hidden');
    playScripture(220, 2);
  };

  window.showIndex = () => {
    document.getElementById('start-menu')?.classList.add('hidden');
    document.getElementById('about-menu')?.classList.add('hidden');
    document.getElementById('chapter-menu')?.classList.remove('hidden');
  };

  window.hideChapterMenu = () => {
    document.getElementById('chapter-menu')?.classList.add('hidden');
  };

  window.goToChapter = (bookName) => {
    document.getElementById('chapter-menu')?.classList.add('hidden');
    document.getElementById('start-menu')?.classList.add('hidden');
    renderBook(bookName, 0);
    saveState(state);
    playScripture(293.66, 2);
  };

  window.openChapter = window.goToChapter;

  window.showAbout = () => {
    document.getElementById('start-menu')?.classList.add('hidden');
    document.getElementById('chapter-menu')?.classList.add('hidden');
    document.getElementById('about-menu')?.classList.remove('hidden');
  };

  window.backToLibrary = () => {
    document.getElementById('about-menu')?.classList.add('hidden');
  };

  renderBook(state.currentBook, state.chapterIndex);
}

export default { initMain };

initMain();
