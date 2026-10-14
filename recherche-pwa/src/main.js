import CONFIG from './config.js';
import { loadState, saveState, addNote } from './storage.js';
import { initRender, clearScreen, updateUI } from './render.js';
import { playMemory, updateAudio, initAudio } from './audio.js';

const SCENES = {
  combray: {
    speaker: { en: 'Marcel', it: 'Marcel' },
    speakerName: { en: 'Marcel', it: 'Marcel' },
    text: { en: 'The madeleine... the taste of it brought back everything. Not like a photograph — something deeper, something that lived inside me, waiting, trembling in the depths of my being.', it: 'La madeleine... il suo sapore ha riportato tutto. Non come una fotografia — qualcosa di più profondo, qualcosa che viveva dentro di me, in attesa, tremante nelle profondità del mio essere.' },
    background: 'memory',
    next: 'madeleine',
    statEffect: { mem: 5, mel: 2, art: 1 }
  },
  madeleine: {
    speaker: { en: 'Marcel', it: 'Marcel' },
    text: { en: 'And suddenly the memory revealed itself. The whole of Combray and its surroundings — the church, the gardens, the river — all came forth from the cup of tea, complete and intact, as if they had never been lost.', it: 'E improvvisamente la memoria si è rivelata. Tutta Combray e i suoi dintorni — la chiesa, i giardini, il fiume — tutto è emerso dalla tazza di tè, completo e intatto, come se non fosse mai stato perduto.' },
    background: 'memory',
    next: 'guermantes',
    statEffect: { mem: 10, mel: 4, art: 3 }
  },
  guermantes: {
    speaker: { en: 'Duchess', it: 'Duchessa' },
    text: { en: 'The way to Guermantes is not a mere road, my dear. It is the path of the imagination — the longing for something we have never possessed, for a life we have only glimpsed in dreams.', it: 'La via verso Guermantes non è una semplice strada, mio caro. È il sentiero dell\'immaginazione — il desiderio di qualcosa che non abbiamo mai posseduto, per una vita che abbiamo solo intravisto nei sogni.' },
    background: 'memory',
    next: 'albertine',
    statEffect: { mem: 6, mel: 5, art: 4 }
  },
  albertine: {
    speaker: { en: 'Marcel', it: 'Marcel' },
    text: { en: 'Albertine... she was the mystery itself. To possess her was impossible — to understand her, even less so. She existed in a world beyond my comprehension, and yet I loved her with all the intensity of a soul seeking to recover lost time.', it: 'Albertine... lei era il mistero stesso. Possederla era impossibile — comprenderla, ancora meno. Esisteva in un mondo oltre la mia comprensione, eppure la amavo con tutta l\'intensità di un\'anima che cerca di recuperare il tempo perduto.' },
    background: 'redemption',
    next: 'hawthorn',
    statEffect: { mem: 12, mel: 7, art: 6 }
  },
  hawthorn: {
    speaker: { en: 'Marcel', it: 'Marcel' },
    text: { en: 'The hawthorn... its scent in Combray. Not just a smell — it was the very essence of a moment that had vanished, preserved like an amber bead, holding the past intact.', it: 'Il biancospino... il suo profumo a Combray. Non solo un odore — era l\'essenza stessa di un momento che era svanito, conservato come una perla d\'ambra, che teneva intatto il passato.' },
    background: 'memory',
    next: 'church',
    statEffect: { mem: 8, mel: 3, art: 5 }
  },
  church: {
    speaker: { en: 'Narrator', it: 'Narratore' },
    text: { en: 'The church at Combray... its steeple pierced the sky like an arrow. From within, the sound of the organ — not mere sound, but architecture made audible, faith made material.', it: 'La chiesa di Combray... il suo campanile forava il cielo come una freccia. Dall\'interno, il suono dell\'organo — non un semplice suono, ma architettura resa udibile, fede resa materiale.' },
    background: 'memory',
    next: 'art_final',
    statEffect: { mem: 6, mel: 3, art: 4 }
  },
  art_final: {
    speaker: { en: 'Marcel', it: 'Marcel' },
    text: { en: 'Art is the only way to recover the past. Not through ordinary memory — which is dead — but through involuntary recollection. Only art can capture what time has stolen, and return it to us in its true, luminous form.', it: 'L\'arte è l\'unico modo per recuperare il passato. Non attraverso la memoria ordinaria — che è morta — ma attraverso la ricordo involontario. Solo l\'arte può catturare ciò che il tempo ha rubato, e restituircelo nella sua vera, luminosa forma.' },
    background: 'redemption',
    next: 'swann',
    statEffect: { mem: 15, mel: 3, art: 12 }
  },
  swann: {
    speaker: { en: 'Marcel', it: 'Marcel' },
    text: { en: 'Swann... he loved Odette as I loved Albertine — through an illusion created by art, by a sonata, by the light of a salon. And yet, through that very illusion, something true was born: art itself, the only real recovery of what time has lost.', it: 'Swann... amava Odette come io amavo Albertine — attraverso un\'illusione creata dall\'arte, da una sonata, dalla luce di un salotto. Eppure, proprio attraverso quella illusione, qualcosa di vero nacque: l\'arte stessa, l\'unico vero recupero di ciò che il tempo ha perduto.' },
    background: 'memory',
    next: 'ending',
    statEffect: { mem: 10, mel: 4, art: 8 }
  },
  ending: {
    speaker: { en: 'Marcel', it: 'Marcel' },
    text: { en: 'The past is not dead — it is not even past. It lives in art, in the involuntary memory, in the taste of a madeleine dipped in tea. And through art, we may finally recover the lost time.', it: 'Il passato non è morto — non è nemmeno passato. Vive nell\'arte, nella memoria involontaria, nel sapore di una madeleine immersa nel tè. E attraverso l\'arte, possiamo finalmente recuperare il tempo perduto.' },
    background: 'redemption',
    next: null,
    statEffect: { mem: 20, mel: 2, art: 15 }
  }
};

let state = { scene: 'combray', language: 'en', mem: 0, mel: 0, art: 0, choices: [], notes: [], readTime: 0 };

export function initMain(){
  initRender();
  initAudio();
  const saved = loadState();
  if(saved){state={...state,...saved};CONFIG.language=state.language||'en';}
  else{CONFIG.language=state.language||'en';}
  renderScene(state.scene);
  addChoiceButtons(state.scene);
  playMemory(165,4);
  document.getElementById('mem').textContent=state.mem;
  document.getElementById('mel').textContent=state.mel;
  document.getElementById('art').textContent=state.art;
  window.startVN=()=>{document.getElementById('start-menu').classList.add('hidden');document.getElementById('start-menu').style.display='none';};
  window.switchLanguage=()=>{CONFIG.language=CONFIG.language==='en'?'it':'en';state.language=CONFIG.language;renderScene(state.scene);addChoiceButtons(state.scene);document.getElementById('dialogue-text').textContent=SCENES[state.scene].text[CONFIG.language];document.getElementById('speaker').textContent=SCENES[state.scene].speaker[CONFIG.language]||SCENES[state.scene].speaker.en;};
  window.loadSlot=()=>{const saved=loadState();if(saved){state={...state,...saved};CONFIG.language=state.language||'en';renderScene(state.scene);addChoiceButtons(state.scene);document.getElementById('start-menu').classList.add('hidden');}};
  window.showAbout=()=>{document.getElementById('start-menu').classList.add('hidden');document.getElementById('about-menu').classList.remove('hidden');};
  window.backToMenu=()=>{document.getElementById('about-menu').classList.add('hidden');document.getElementById('start-menu').classList.remove('hidden');};
  if(window.R2 && window.R2.play) window.R2.play(220,0.1,'triangle');
  // Additional scene navigation for expanded content
  window.openExtra = (key) => {
    if(EXTRA_SCENES[key]){
      document.getElementById('speaker').textContent = EXTRA_SCENES[key].speaker.en;
      document.getElementById('dialogue-text').textContent = (CONFIG.language === 'it' && EXTRA_SCENES[key].text.it) ? EXTRA_SCENES[key].text.it : EXTRA_SCENES[key].text.en;
      document.getElementById('memory-indicator').classList.remove('hidden');
      document.getElementById('memory-indicator').textContent = 'Memory — Expanded';
      window.addEventListener('click',()=>{if(window.EXTRA_SCENES && EXTRA_SCENES[key]){state.mem+=EXTRA_SCENES[key].statEffect.mem||0;state.mel+=EXTRA_SCENES[key].statEffect.mel||0;state.art+=EXTRA_SCENES[key].statEffect.art||0;document.getElementById('mem').textContent=state.mem;document.getElementById('mel').textContent=state.mel;document.getElementById('art').textContent=state.art;saveState(state);}});
    }
  };
  document.getElementById('start-menu').classList.remove('hidden');
}

function renderScene(key){
  state.scene=key;const s=SCENES[key];if(!s)return;
  const lang=CONFIG.language||'en';
  document.getElementById('speaker').textContent=s.speaker[lang]||s.speaker.en||'Marcel';
  document.getElementById('dialogue-text').textContent=s.text[lang]||s.text.en;
  clearScreen(s.background||'memory');
  const ind=document.getElementById('memory-indicator');
  if(s.background==='memory'||key==='madeleine'||key==='combray'){ind.classList.add('active');ind.textContent=CONFIG.themes[lang].memory||'Memory';}else{ind.classList.remove('active');ind.textContent='';}
}

function addChoiceButtons(key){
  const s=SCENES[key];if(!s||!s.choices||!s.next||key==='ending'){
    if(key==='ending'){document.getElementById('choices').innerHTML='<button onclick="window.location.reload()">Read Again — Relire</button>';
    document.getElementById('choices').style.display='flex';}else{
    const lang=CONFIG.language||'en';
    const ch=(lang==='it'&&SCENES[s.next])?SCENES[s.next].choicesIt||SCENES[s.next].choicesEn||[]:(SCENES[s.next]?.choicesEn||SCENES[s.next]?.choicesIt||[]);
    const container=document.getElementById('choices');
    container.innerHTML='';
    // Simplified choices for Proust: two contemplative paths
    const btn1=document.createElement('button');
    btn1.textContent=(lang==='it')?`Contemplare il ricordo`:`Contemplate the memory`;
    btn1.onclick=()=>{applyChoice(s);};
    container.appendChild(btn1);
    const btn2=document.createElement('button');
    btn2.textContent=(lang==='it')?`Procedere verso il prossimo ricordo`:`Proceed to the next recollection`;
    btn2.onclick=()=>{applyChoice(s);};
    container.appendChild(btn2);
  }
}

function applyChoice(scene){
  const s=SCENES[scene];
  if(s.statEffect){
    state.mem+=s.statEffect.mem||0;state.mel+=s.statEffect.mel||0;state.art+=s.statEffect.art||0;
    state.mem=Math.max(0,Math.min(25,state.mem));state.mel=Math.max(0,Math.min(25,state.mel));state.art=Math.max(0,Math.min(25,state.art));
  }
  state.readTime+=30000;addNote('Memory: '+(SCENES[s.next]?.text.en||SCENES[s.next]?.text.it||'').substring(0,60));
  if(s.next){if(SCENES[s.next]){renderScene(s.next);addChoiceButtons(s.next);}}else{renderScene('ending');addChoiceButtons('ending');}
  document.getElementById('mem').textContent=state.mem;document.getElementById('mel').textContent=state.mel;document.getElementById('art').textContent=state.art;
  saveState(state);
  document.getElementById('memory-indicator').classList.remove('hidden');
  setTimeout(()=>{document.getElementById('memory-indicator').classList.add('hidden');},800);
}

export default { initMain };

// ADDITIONAL SCENES — expanded Proust content
const EXTRA_SCENES = {
  vantueil: {
    speaker: { en: 'Marcel', it: 'Marcel' },
    text: { en: 'Vinteuil\'s sonata — the music was not just sound. It was the recovery of a feeling I had not known I had lost. The first notes brought back not a memory, but the very sensation of memory itself.', it: 'La sonata di Vinteuil — la musica non era solo suono. Era il recupero di un sentimento che non sapevo di aver perduto. Le prime note riportarono non un ricordo, ma la stessa sensazione del ricordo.' },
    background: 'redemption',
    next: 'swann_name',
    statEffect: { mem: 14, mel: 2, art: 13 }
  },
  swann_name: {
    speaker: { en: 'Swann', it: 'Swann' },
    text: { en: 'The name of Gilberte — just hearing it transforms everything. The ordinary becomes luminous. The past, which I believed lost, returns not as a picture but as a breath of air, a color of light.', it: 'Il nome di Gilberte — solo sentirlo trasforma tutto. L\'ordinario diventa luminoso. Il passato, che credevo perduto, ritorna non come un\'immagine ma come un alito d\'aria, un colore di luce.' },
    background: 'memory',
    next: 'balbec',
    statEffect: { mem: 11, mel: 3, art: 7 }
  },
  balbec: {
    speaker: { en: 'Marcel', it: 'Marcel' },
    text: { en: 'The beach at Balbec — the sea, vast and indifferent, and the girls in white dresses walking along the shore. The air smelled of salt and time. I felt as if I had returned to a place that never existed except in my longing.', it: 'La spiaggia di Balbec — il mare, vasto e indifferente, e le ragazze in abito bianco che camminavano lungo la riva. L\'aria odorava di sale e di tempo. Mi sembrava di aver ritrovato un luogo che non era mai esistito se non nel mio desiderio.' },
    background: 'redemption',
    next: 'ending',
    statEffect: { mem: 13, mel: 4, art: 9 }
  }
};
