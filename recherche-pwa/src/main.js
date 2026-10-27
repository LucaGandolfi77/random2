import CONFIG from './config.js';
import { loadState, saveState, addNote } from './storage.js';
import { initRender, clearScreen } from './render.js';
import { playMemory, initAudio } from './audio.js';

const SCENES = {
  combray: {
    volume: { en: 'Vol. I · Du côté de chez Swann — Combray', it: 'Vol. I · Dalla parte di Swann — Combray' },
    speaker: { en: 'Marcel', it: 'Marcel' },
    speakerName: { en: 'Marcel', it: 'Marcel' },
    text: { en: 'The madeleine... the taste of it brought back everything. Not like a photograph — something deeper, something that lived inside me, waiting, trembling in the depths of my being.', it: 'La madeleine... il suo sapore ha riportato tutto. Non come una fotografia — qualcosa di più profondo, qualcosa che viveva dentro di me, in attesa, tremante nelle profondità del mio essere.' },
    background: 'memory',
    next: 'madeleine',
    statEffect: { mem: 5, mel: 2, art: 1 },
    choices: [
      { text: { en: 'Drink a second spoonful of tea and listen inward', it: 'Bere un secondo cucchiaino di tè e ascoltare dentro di sé' }, next: 'madeleine', eff: { mem: 4, mel: 1, art: 2 } },
      { text: { en: 'Recall the bedtime drama of the goodnight kiss', it: 'Ricordare il dramma serale del bacio della buonanotte' }, next: 'madeleine', eff: { mem: 3, mel: 3, art: 1 } }
    ]
  },
  madeleine: {
    volume: { en: 'Vol. I · Involuntary Recollection', it: 'Vol. I · La memoria involontaria' },
    speaker: { en: 'Marcel', it: 'Marcel' },
    text: { en: 'And suddenly the memory revealed itself. The whole of Combray and its surroundings — the church, the gardens, the river — all came forth from the cup of tea, complete and intact, as if they had never been lost.', it: 'E improvvisamente la memoria si è rivelata. Tutta Combray e i suoi dintorni — la chiesa, i giardini, il fiume — tutto è emerso dalla tazza di tè, completo e intatto, come se non fosse mai stato perduto.' },
    background: 'memory',
    next: 'church',
    statEffect: { mem: 6, mel: 2, art: 3 },
    choices: [
      { text: { en: 'Walk toward the Church of Saint-Hilaire at Combray', it: 'Camminare verso la chiesa di Saint-Hilaire a Combray' }, next: 'church', eff: { mem: 3, mel: 1, art: 3 } },
      { text: { en: 'Follow the pink hawthorn hedge along Swann\'s Way', it: 'Seguire la siepe di biancospini rosa lungo la parte di Swann' }, next: 'hawthorn', eff: { mem: 4, mel: 2, art: 2 } }
    ]
  },
  church: {
    volume: { en: 'Vol. I · The Steeple of Saint-Hilaire', it: 'Vol. I · Il campanile di Saint-Hilaire' },
    speaker: { en: 'Narrator', it: 'Narratore' },
    text: { en: 'The church at Combray... its steeple pierced the sky like an arrow. From within, the sound of the organ — not mere sound, but architecture made audible, faith and a fourth dimension — that of Time — made material in stone.', it: 'La chiesa di Combray... il suo campanile forava il cielo come una freccia. Dall\'interno, il suono dell\'organo — non un semplice suono, ma architettura resa udibile, fede e una quarta dimensione — quella del Tempo — rese materiali nella pietra.' },
    background: 'memory',
    next: 'hawthorn',
    statEffect: { mem: 4, mel: 2, art: 4 },
    choices: [
      { text: { en: 'Step out onto the path of the hawthorns in May', it: 'Uscire sul sentiero dei biancospini in fiore a maggio' }, next: 'hawthorn', eff: { mem: 3, mel: 1, art: 2 } }
    ]
  },
  hawthorn: {
    volume: { en: 'Vol. I · The Hawthorn Path & Gilberte', it: 'Vol. I · Il sentiero dei biancospini e Gilberte' },
    speaker: { en: 'Marcel', it: 'Marcel' },
    text: { en: 'The hawthorn... its scent in Combray. Not just a smell — it was the very essence of a moment that had vanished, preserved like an amber bead, holding the past intact where Gilberte first appeared behind the hedge.', it: 'Il biancospino... il suo profumo a Combray. Non solo un odore — era l\'essenza stessa di un momento che era svanito, conservato come una perla d\'ambra, che teneva intatto il passato là dove Gilberte apparve per la prima volta dietro la siepe.' },
    background: 'memory',
    next: 'vantueil',
    statEffect: { mem: 5, mel: 3, art: 3 },
    choices: [
      { text: { en: 'Listen to Vinteuil\'s sonata in Madame Verdurin\'s salon', it: 'Ascoltare la sonata di Vinteuil nel salotto di Madame Verdurin' }, next: 'vantueil', eff: { mem: 3, mel: 2, art: 4 } },
      { text: { en: 'Hear the name of Gilberte spoken in the Champs-Élysées', it: 'Udire il nome di Gilberte ai Champs-Élysées' }, next: 'swann_name', eff: { mem: 4, mel: 2, art: 2 } }
    ]
  },
  vantueil: {
    volume: { en: 'Vol. I · Un amour de Swann', it: 'Vol. I · Un amore di Swann' },
    speaker: { en: 'Marcel', it: 'Marcel' },
    text: { en: 'Vinteuil\'s sonata — the music was not just sound. The little phrase of five notes was the national anthem of Swann and Odette\'s love: the recovery of a feeling he had not known he had lost, returning like a captive spirit.', it: 'La sonata di Vinteuil — la musica non era solo suono. La piccola frase di cinque note era l\'inno nazionale dell\'amore di Swann e Odette: il recupero di un sentimento che non sapeva di aver perduto, ritornato come uno spirito prigioniero.' },
    background: 'redemption',
    next: 'swann',
    statEffect: { mem: 4, mel: 3, art: 5 },
    choices: [
      { text: { en: 'Reflect on Swann\'s jealousy and the illusion of love', it: 'Riflettere sulla gelosia di Swann e sull\'illusione dell\'amore' }, next: 'swann', eff: { mem: 3, mel: 4, art: 2 } }
    ]
  },
  swann_name: {
    volume: { en: 'Vol. II · À l\'ombre des jeunes filles en fleurs', it: 'Vol. II · All\'ombra delle fanciulle in fiore' },
    speaker: { en: 'Swann', it: 'Swann' },
    text: { en: 'The name of Gilberte — just hearing it transforms everything. The ordinary becomes luminous. The past, which I believed lost, returns not as a picture but as a breath of air, a color of light.', it: 'Il nome di Gilberte — solo sentirlo trasforma tutto. L\'ordinario diventa luminoso. Il passato, che credevo perduto, ritorna non come un\'immagine ma come un alito d\'aria, un colore di luce.' },
    background: 'memory',
    next: 'balbec',
    statEffect: { mem: 4, mel: 2, art: 3 },
    choices: [
      { text: { en: 'Board the train to the coast of Balbec with your grandmother', it: 'Salire sul treno per la costa di Balbec con la nonna' }, next: 'balbec', eff: { mem: 4, mel: 2, art: 3 } }
    ]
  },
  swann: {
    volume: { en: 'Vol. I · Swann in Love', it: 'Vol. I · Un amore di Swann' },
    speaker: { en: 'Marcel', it: 'Marcel' },
    text: { en: 'Swann... he loved Odette as I would love Albertine — through an illusion created by art, by a sonata, by the light of a salon. And yet, through that very illusion, something true was born: art itself, the only real recovery of what time has lost.', it: 'Swann... amava Odette come io avrei amato Albertine — attraverso un\'illusione creata dall\'arte, da una sonata, dalla luce di un salotto. Eppure, proprio attraverso quella illusione, qualcosa di vero nacque: l\'arte stessa, l\'unico vero recupero di ciò che il tempo ha perduto.' },
    background: 'memory',
    next: 'balbec',
    statEffect: { mem: 4, mel: 3, art: 4 },
    choices: [
      { text: { en: 'Travel to the Normandy sea at Balbec', it: 'Viaggiare verso il mare di Normandia a Balbec' }, next: 'balbec', eff: { mem: 4, mel: 1, art: 3 } }
    ]
  },
  balbec: {
    volume: { en: 'Vol. II · Within a Budding Grove — Balbec', it: 'Vol. II · All\'ombra delle fanciulle in fiore — Balbec' },
    speaker: { en: 'Marcel', it: 'Marcel' },
    text: { en: 'The beach at Balbec — the sea, vast and indifferent, and the little band of girls walking along the esplanade like a flock of seagulls. Among them, dark-haired Albertine glanced at me, and the air smelled of salt and unlived time.', it: 'La spiaggia di Balbec — il mare, vasto e indifferente, e la piccola banda di fanciulle che camminavano lungo la diga come uno stormo di gabbiani. Tra loro, Albertine dai capelli bruni mi lanciò uno sguardo, e l\'aria odorava di sale e di tempo non ancora vissuto.' },
    background: 'sea',
    next: 'guermantes',
    statEffect: { mem: 5, mel: 3, art: 4 },
    choices: [
      { text: { en: 'Enter the aristocratic salons of the Guermantes Way', it: 'Entrare nei salotti aristocratici dei Guermantes' }, next: 'guermantes', eff: { mem: 3, mel: 2, art: 3 } },
      { text: { en: 'Follow Albertine into the mystery of captivity and flight', it: 'Seguire Albertine nel mistero della prigionia e della fuga' }, next: 'albertine', eff: { mem: 4, mel: 4, art: 2 } }
    ]
  },
  guermantes: {
    volume: { en: 'Vol. III · Le Côté de Guermantes', it: 'Vol. III · I Guermantes' },
    speaker: { en: 'Duchess', it: 'Duchessa' },
    text: { en: 'The way to Guermantes is not a mere road, my dear. It is the path of the imagination — the longing for names that glowed like stained glass in childhood, and the discovery that society is made of ordinary clay.', it: 'La via verso Guermantes non è una semplice strada, mio caro. È il sentiero dell\'immaginazione — il desiderio di nomi che brillavano come vetrate nell\'infanzia, e la scoperta che il bel mondo è fatto di creta comune.' },
    background: 'memory',
    next: 'albertine',
    statEffect: { mem: 4, mel: 3, art: 3 },
    choices: [
      { text: { en: 'Return to the Paris apartment where Albertine waits', it: 'Tornare nell\'appartamento di Parigi dove attende Albertine' }, next: 'albertine', eff: { mem: 3, mel: 4, art: 2 } }
    ]
  },
  albertine: {
    volume: { en: 'Vol. V & VI · La Prisonnière & Albertine disparue', it: 'Vol. V & VI · La prigioniera e La fuggitiva' },
    speaker: { en: 'Marcel', it: 'Marcel' },
    text: { en: 'Albertine... she was the mystery itself. To possess her was impossible — to understand her, even less so. Only when Françoise entered one morning and said "Mademoiselle Albertine has gone" did I learn that suffering is the true measure of love.', it: 'Albertine... lei era il mistero stesso. Possederla era impossibile — comprenderla, ancora meno. Solo quando una mattina Françoise entrò a dire «La signorina Albertine è partita» compresi che la sofferenza è la vera misura dell\'amore.' },
    background: 'redemption',
    next: 'art_final',
    statEffect: { mem: 6, mel: 5, art: 4 },
    choices: [
      { text: { en: 'Step onto the uneven flagstones in the Guermantes courtyard', it: 'Inciampare sul selciato ineguale nel cortile dei Guermantes' }, next: 'art_final', eff: { mem: 5, mel: -2, art: 5 } }
    ]
  },
  art_final: {
    volume: { en: 'Vol. VII · Le Temps retrouvé — Time Regained', it: 'Vol. VII · Il tempo ritrovato' },
    speaker: { en: 'Marcel', it: 'Marcel' },
    text: { en: 'Two uneven paving stones in the courtyard, the clink of a spoon against a plate, the stiffness of a napkin — and Balbec, Venice, and Combray rose within me freed from the order of time! Art is the only way to recover the past in its true, luminous form.', it: 'Due lastre ineguali nel cortile, il tintinnio di un cucchiaino contro un piatto, la ruvidezza di un tovagliolo — e Balbec, Venezia e Combray risorsero in me liberati dall\'ordine del tempo! L\'arte è l\'unico modo per recuperare il passato nella sua vera, luminosa forma.' },
    background: 'redemption',
    next: 'ending',
    statEffect: { mem: 6, mel: -1, art: 6 },
    choices: [
      { text: { en: 'Begin writing the book before time runs out', it: 'Cominciare a scrivere il libro prima che il tempo finisca' }, next: 'ending', eff: { mem: 5, mel: 0, art: 6 } }
    ]
  },
  ending: {
    volume: { en: 'Vol. VII · In Time', it: 'Vol. VII · Nel Tempo' },
    speaker: { en: 'Marcel', it: 'Marcel' },
    text: { en: 'The past is not dead — it is not even past. It lives in art, in involuntary memory, in the taste of a madeleine dipped in tea. Standing like giants plunged into the years, we touch simultaneously the distant epochs of our lives — in Time.', it: 'Il passato non è morto — non è nemmeno passato. Vive nell\'arte, nella memoria involontaria, nel sapore di una madeleine immersa nel tè. In piedi come giganti immersi negli anni, tocchiamo simultaneamente le epoche lontane della nostra vita — nel Tempo.' },
    background: 'redemption',
    next: null,
    statEffect: { mem: 8, mel: 0, art: 8 }
  }
};

let state = { scene: 'combray', language: 'en', mem: 8, mel: 6, art: 4, choices: [], notes: [], readTime: 0 };

function syncLang() {
  try {
    const a = JSON.parse(localStorage.getItem('anthology-state') || '{}');
    if (a && (a.language === 'it' || a.language === 'en')) {
      state.language = a.language;
      CONFIG.language = a.language;
    }
  } catch (e) {}
}

function updateChromeLabels() {
  const lang = CONFIG.language || 'en';
  const sl = CONFIG.statsLabels[lang] || CONFIG.statsLabels.en;
  const lMem = document.getElementById('lbl-mem');
  const lMel = document.getElementById('lbl-mel');
  const lArt = document.getElementById('lbl-art');
  if (lMem) lMem.textContent = sl.mem;
  if (lMel) lMel.textContent = sl.mel;
  if (lArt) lArt.textContent = sl.art;

  const hudLang = document.getElementById('hud-lang-btn');
  if (hudLang) hudLang.textContent = lang === 'it' ? 'Language: English' : 'Lingua: Italiano';
  const backLink = document.getElementById('lib-back-link');
  if (backLink) backLink.textContent = lang === 'it' ? '← La Biblioteca' : '← The Library';
  const menuBtn = document.getElementById('hud-menu-btn');
  if (menuBtn) menuBtn.textContent = lang === 'it' ? '☰ Volumi' : '☰ Volumes';
}

function renderScene(key) {
  if (!SCENES[key]) key = 'combray';
  state.scene = key;
  const s = SCENES[key];
  const lang = CONFIG.language || 'en';
  updateChromeLabels();

  document.getElementById('speaker').textContent = s.speaker[lang] || s.speaker.en || 'Marcel';
  const volEl = document.getElementById('volume-label');
  if (volEl && s.volume) volEl.textContent = s.volume[lang] || s.volume.en;
  document.getElementById('dialogue-text').textContent = s.text[lang] || s.text.en;
  clearScreen(s.background || 'memory');

  const ind = document.getElementById('memory-indicator');
  if (ind) {
    ind.classList.add('active');
    ind.textContent = (CONFIG.themes[lang] && CONFIG.themes[lang].memory) || 'Involuntary Memory';
  }
  document.getElementById('mem').textContent = state.mem;
  document.getElementById('mel').textContent = state.mel;
  document.getElementById('art').textContent = state.art;
  addChoiceButtons(key);
}

function fmtEff(eff, lang) {
  if (!eff) return '';
  const sl = CONFIG.statsLabels[lang] || CONFIG.statsLabels.en;
  const out = [];
  if (eff.mem) out.push((eff.mem > 0 ? '+' : '') + eff.mem + ' ' + sl.mem);
  if (eff.mel) out.push((eff.mel > 0 ? '+' : '') + eff.mel + ' ' + sl.mel);
  if (eff.art) out.push((eff.art > 0 ? '+' : '') + eff.art + ' ' + sl.art);
  return out.join(' · ');
}

function addChoiceButtons(key) {
  const s = SCENES[key];
  const container = document.getElementById('choices');
  if (!s || !container) return;
  const lang = CONFIG.language || 'en';
  container.innerHTML = '';

  if (key === 'ending' || !s.next) {
    const bAgain = document.createElement('button');
    bAgain.innerHTML = `<span>${lang === 'it' ? '↻ Rileggere da Combray' : '↻ Read Again from Combray'}</span><span class="eff-pill">Vol. I</span>`;
    bAgain.onclick = () => window.restartVN();
    container.appendChild(bAgain);

    const bLib = document.createElement('button');
    bLib.innerHTML = `<span>${lang === 'it' ? '← Ritorna alla Biblioteca' : '← Return to The Library'}</span><span class="eff-pill">Anthology</span>`;
    bLib.onclick = () => { window.location.href = '../anthology-pwa/'; };
    container.appendChild(bLib);
    return;
  }

  const list = Array.isArray(s.choices) && s.choices.length
    ? s.choices
    : [{ text: { en: 'Proceed to the next recollection', it: 'Procedere verso il prossimo ricordo' }, next: s.next, eff: s.statEffect }];

  list.forEach((ch) => {
    const btn = document.createElement('button');
    const txtSpan = document.createElement('span');
    txtSpan.textContent = (ch.text && (ch.text[lang] || ch.text.en)) || '';
    const effSpan = document.createElement('span');
    effSpan.className = 'eff-pill';
    effSpan.textContent = fmtEff(ch.eff || s.statEffect, lang);
    btn.appendChild(txtSpan);
    btn.appendChild(effSpan);
    btn.onclick = () => applyChoice(key, ch);
    container.appendChild(btn);
  });
}

function applyChoice(sceneKey, choiceObj) {
  const s = SCENES[sceneKey];
  if (!s) return;
  const eff = (choiceObj && choiceObj.eff) || s.statEffect || { mem: 3, mel: 1, art: 2 };
  state.mem = Math.max(0, Math.min(99, (state.mem || 0) + (eff.mem || 0)));
  state.mel = Math.max(0, Math.min(99, (state.mel || 0) + (eff.mel || 0)));
  state.art = Math.max(0, Math.min(99, (state.art || 0) + (eff.art || 0)));
  state.readTime += 30000;

  const nextKey = (choiceObj && choiceObj.next) || s.next || 'ending';
  addNote('Memory: ' + nextKey);
  playMemory(220 + (state.mem % 5) * 25, 2.2);
  renderScene(nextKey);
  saveState(state);
}

export function initMain() {
  initRender();
  initAudio();
  const saved = loadState();
  if (saved) state = { ...state, ...saved };
  syncLang();
  CONFIG.language = state.language || 'en';
  if (!SCENES[state.scene]) state.scene = 'combray';

  window.startVN = () => {
    const m = document.getElementById('start-menu');
    if (m) { m.classList.add('hidden'); m.style.display = 'none'; }
    playMemory(196, 2.5);
  };

  window.openMenuModal = () => {
    const m = document.getElementById('start-menu');
    if (m) { m.classList.remove('hidden'); m.style.display = 'flex'; }
  };

  window.restartVN = () => {
    state.scene = 'combray';
    state.mem = 8;
    state.mel = 6;
    state.art = 4;
    saveState(state);
    renderScene('combray');
    window.startVN();
  };

  window.switchLanguage = () => {
    CONFIG.language = CONFIG.language === 'en' ? 'it' : 'en';
    state.language = CONFIG.language;
    saveState(state);
    try {
      const a = JSON.parse(localStorage.getItem('anthology-state') || '{}');
      a.language = CONFIG.language;
      localStorage.setItem('anthology-state', JSON.stringify(a));
    } catch (e) {}
    renderScene(state.scene);
  };

  window.loadSlot = () => {
    const s = loadState();
    if (s) {
      state = { ...state, ...s };
      CONFIG.language = state.language || 'en';
      renderScene(state.scene);
    }
    window.startVN();
  };

  window.showAbout = () => {
    document.getElementById('start-menu')?.classList.add('hidden');
    const ab = document.getElementById('about-menu');
    if (ab) { ab.classList.remove('hidden'); ab.style.display = 'flex'; }
  };

  window.backToMenu = () => {
    document.getElementById('about-menu')?.classList.add('hidden');
    window.openMenuModal();
  };

  renderScene(state.scene);
}

export default { initMain };

initMain();
