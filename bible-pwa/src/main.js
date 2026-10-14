import CONFIG from './config.js';
import { loadState, saveState, addNote } from './storage.js';
import { initRender, clearScreen } from './render.js';
import { initAudio, playScripture, updateAudio } from './audio.js';

const BIBLE_BOOKS = {
  genesis: {
    title: { en: 'Genesis — Creation', it: 'Genesi — Creazione' },
    speaker: 'Scripture',
    chapters: [
      { speaker: 'Genesis', text: { en: 'In the beginning God created the heavens and the earth. Now the earth was formless and empty — darkness covered the face of the deep waters. And the Spirit of God hovered over the waters.', it: 'Nel principio Dio creò i cieli e la terra. Ora la terra era informe e vuota — le tenebre coprivano la faccia delle acque profonde. E lo Spirito di Dio aleggiava sulle acque.' }, stat: { mem: 2, mel: 0, art: 1 } },
      { speaker: 'Genesis', text: { en: 'And God said, Let there be light — and there was light. God saw that the light was good, and separated the light from the darkness.', it: 'E Dio disse, Sia la luce — e la luce fu. Dio vide che la luce era buona, e separò la luce dalle tenebre.' }, stat: { mem: 4, mel: 1, art: 2 } },
      { speaker: 'Genesis', text: { en: 'God made two great lights — the sun to rule the day and the moon to rule the night. He also made the stars.', it: 'Dio fece due grandi luci — il sole per governare il giorno e la luna per governare la notte. Fece anche le stelle.' }, stat: { mem: 3, mel: 2, art: 3 } },
      { speaker: 'Genesis', text: { en: 'God created the great sea creatures and every living thing that moves in the waters, according to their kinds. And God saw that it was good.', it: 'Dio creò i grandi mostri marini e ogni creatura vivente che si muove nelle acque, secondo le loro specie. E Dio vide che era buono.' }, stat: { mem: 7, mel: 2, art: 5 } },
      { speaker: 'Genesis', text: { en: 'So God created mankind in his own image — male and female he created them. And God blessed them.', it: 'Così Dio creò l\'umanità a sua immagine — maschio e femmina li creò. E Dio li benedisse.' }, stat: { mem: 5, mel: 1, art: 4 } },
      { speaker: 'Genesis', text: { en: 'The Lord appeared to Abraham by the oaks of Mamre. Abraham lifted his eyes and saw three men standing nearby. He bowed down and said: My Lord, if I have found favor in your sight.', it: 'Il Signore apparve ad Abramo presso le querce di Mamre. Abramo alzò gli occhi e vide tre uomini in piedi vicino a lui. Si prostrò e disse: Mio Signore, se ho trovato grazia ai tuoi occhi.' }, stat: { mem: 4, mel: 2, art: 6 } },
      { speaker: 'Genesis', text: { en: 'God made a covenant with Abraham: Your descendants shall be as numerous as the stars in the sky. In you all families of the earth shall be blessed.', it: 'Dio fece un patto con Abramo: I tuoi discendenti saranno numerosi come le stelle del cielo. In te tutte le famiglie della terra saranno benedette.' }, stat: { mem: 6, mel: 3, art: 8 } },
      { speaker: 'Genesis', text: { en: 'Joseph was sold into slavery by his brothers. But the Lord was with Joseph in Egypt, and he rose to be ruler over all the land — saving many lives through the wisdom given to him.', it: 'Giuseppe fu venduto in schiavitù dai suoi fratelli. Ma il Signore era con Giuseppe in Egitto, ed egli salì a governare tutta la terra — salvando molte vite attraverso la saggezza che gli era stata data.' }, stat: { mem: 8, mel: 5, art: 10 } }
    ]
  },
  exodus: {
    title: { en: 'Exodus — Liberation', it: 'Esodo — Liberazione' },
    speaker: 'Scripture',
    chapters: [
      { speaker: 'Exodus', text: { en: 'Now a new king arose over Egypt, who did not know Joseph. He said to his people: The Israelites are too many. Let us deal shrewdly with them.', it: 'Ora sorse un nuovo re in Egitto, che non conosceva Giuseppe. Disse al suo popolo: Gli Israeliti sono troppi. Trattiamoli con astuzia.' }, stat: { mem: 2, mel: 5, art: 1 } },
      { speaker: 'Exodus', text: { en: 'The burning bush — God spoke to Moses from the flames that did not consume. I am the God of your fathers. I have heard their cry. I will deliver them.', it: 'Il roveto ardente — Dio parlò a Mosè dalle fiamme che non consumavano. Io sono il Dio dei tuoi padri. Ho udito il loro grido. Li libererò.' }, stat: { mem: 4, mel: 6, art: 3 } },
      { speaker: 'Exodus', text: { en: 'Then the Lord said: I have seen the affliction of my people in Egypt, and I have heard their cry. I will deliver them from slavery.', it: 'Allora il Signore disse: Ho visto l\'afflizione del mio popolo in Egitto, e ho udito il loro grido. Li libererò dalla schiavitù.' }, stat: { mem: 6, mel: 4, art: 2 } },
      { speaker: 'Exodus', text: { en: 'The sea parted. The people walked through on dry land. The waters stood as a wall to them on the right and on the left.', it: 'Il mare si aprì. Il popolo passò sull\'asciutto. Le acque stettero come un muro alla loro destra e alla loro sinistra.' }, stat: { mem: 8, mel: 6, art: 5 } },
      { speaker: 'Exodus', text: { en: 'You shall have no other gods before me. You shall not make for yourself an image. I am a jealous God, showing steadfast love.', it: 'Non avrai altri dei davanti a me. Non ti farai immagini. Io sono un Dio geloso, che mostra un amore costante.' }, stat: { mem: 5, mel: 3, art: 7 } }
    ]
  },
  psalms: {
    title: { en: 'Psalms — Prayer', it: 'Salmi — Preghiera' },
    speaker: 'Scripture',
    chapters: [
      { speaker: 'Psalm', text: { en: 'The Lord is my shepherd, I shall not want. He makes me lie down in green pastures. Even though I walk through the valley of the shadow of death, I will fear no evil.', it: 'Il Signore è il mio pastore, non manco di nulla. Mi fa riposare in pascoli verdi. Anche se cammino nella valle dell\'ombra della morte, non temerò alcun male.' }, stat: { mem: 7, mel: 3, art: 2 } },
      { speaker: 'Psalm', text: { en: 'Create in me a clean heart, O God, and renew a right spirit within me. Cast me not away from your presence.', it: 'Crea in me un cuore puro, o Dio, e rinnova in me uno spirito retto. Non respingermi dalla tua presenza.' }, stat: { mem: 10, mel: 5, art: 4 } },
      { speaker: 'Psalm', text: { en: 'By the rivers of Babylon we sat and wept, when we remembered Zion. If I forget you, O Jerusalem, let my right hand wither.', it: 'Presso i fiumi di Babilonia ci sedemmo e piangemmo, quando ci ricordammo di Sion. Se ti dimentico, o Gerusalemme, che la mia destra si inaridisca.' }, stat: { mem: 8, mel: 8, art: 6 } }
    ]
  },
  gospels: {
    title: { en: 'Gospels — The Word', it: 'Vangeli — La Parola' },
    speaker: 'Scripture',
    chapters: [
      { speaker: 'Matthew', text: { en: 'Blessed are those who mourn, for they shall be comforted. Blessed are the pure in heart, for they shall see God.', it: 'Beati quelli che fanno cordoglio, perché saranno consolati. Beati i puri di cuore, perché vedranno Dio.' }, stat: { mem: 6, mel: 3, art: 5 } },
      { speaker: 'Mark', text: { en: 'He said to them: Follow me, and I will make you become fishers of men. Immediately they left their nets and followed him.', it: 'Disse loro: Seguitemi, e vi farò diventare pescatori di uomini. Immediatamente lasciarono le reti e lo seguirono.' }, stat: { mem: 7, mel: 4, art: 6 } },
      { speaker: 'Luke', text: { en: 'A good Samaritan, moved with compassion, came to a wounded man. He bound up his wounds, brought him to an inn, and cared for him.', it: 'Un buon Samaritano, mosso da compassione, venne da un uomo ferito. Gli fasciò le ferite, lo portò in una locanda e si prese cura di lui.' }, stat: { mem: 9, mel: 2, art: 7 } },
      { speaker: 'John', text: { en: 'In the beginning was the Word, and the Word was with God, and the Word was God. The true light gives light to everyone.', it: 'Nel principio era la Parola, e la Parola era con Dio, e la Parola era Dio. La vera luce illumina ogni uomo.' }, stat: { mem: 12, mel: 1, art: 9 } },
      { speaker: 'Matthew', text: { en: 'The star came to rest over the place where the child was. They saw the child with Mary his mother, and fell down and worshipped him.', it: 'La stella venne a fermarsi sopra il luogo dove era il bambino. Videro il bambino con Maria sua madre, e si prostrarono e lo adorarono.' }, stat: { mem: 9, mel: 2, art: 8 } },
      { speaker: 'Luke', text: { en: 'A Savior is born to you — Christ the Lord. Glory to God in the highest, and on earth peace to those with whom he is pleased.', it: 'Un Salvatore è nato per voi — Cristo il Signore. Gloria a Dio nell\'alto dei cieli, e pace in terra agli uomini che egli gradisce.' }, stat: { mem: 8, mel: 2, art: 7 } }
    ]
  },
  acts: {
    title: { en: 'Acts — The Spirit', it: 'Atti — Lo Spirito' },
    speaker: 'Scripture',
    chapters: [
      { speaker: 'Acts', text: { en: 'You shall receive power when the Holy Spirit comes upon you, and you shall be my witnesses — in Jerusalem, Judea, Samaria, and to the ends of the earth.', it: 'Riceverete potenza quando lo Spirito Santo verrà su di voi, e sarete i miei testimoni — in Gerusalemme, Giudea, Samaria, e fino ai confini della terra.' }, stat: { mem: 5, mel: 4, art: 6 } },
      { speaker: 'Acts', text: { en: 'They devoted themselves to the apostles\' teaching, to fellowship, to the breaking of bread, and to prayer. And awe came upon every soul.', it: 'Si dedicarono all\'insegnamento degli apostoli, alla comunione, alla frazione del pane e alla preghiera. E il timore venne su ogni anima.' }, stat: { mem: 7, mel: 3, art: 7 } }
    ]
  },
  revelation: {
    title: { en: 'Revelation — The End', it: 'Apocalisse — La Fine' },
    speaker: 'Scripture',
    chapters: [
      { speaker: 'Revelation', text: { en: 'He will wipe away every tear from their eyes, and death shall be no more. Neither mourning, nor crying, nor pain anymore, for the former things have passed away. Behold, I am making all things new.', it: 'Asciugherà ogni lacrima dai loro occhi, e la morte non sarà più. Né lutto, né pianto, né dolore ci sarà più, perché le cose di prima sono passate. Ecco, faccio nuove tutte le cose.' }, stat: { mem: 16, mel: 1, art: 14 }, choicesEn: ['Contemplate the new creation — Contempla la nuova creazione','Ask for deeper revelation — Chiedi una rivelazione più profonda'], choicesIt: ['Contempla la nuova creazione','Chiedi una rivelazione più profonda'] },
      { speaker: 'Revelation', text: { en: 'The Alpha and the Omega — the beginning and the end. To the thirsty I will give from the spring of the water of life without payment.', it: 'L\'Alfa e l\'Omega — il principio e la fine. A chi ha sete darò dalla fonte dell\'acqua della vita senza pagamento.' }, stat: { mem: 20, mel: 0, art: 16 } }
    ]
  }
};

let state = { language: 'en', currentBook: 'genesis', chapterIndex: 0, mem: 0, mel: 0, art: 0, notes: [], readTime: 0, visited: ['genesis'] };

export function initMain(){
  initRender(); initAudio();
  const saved = loadState();
  if(saved){ state = { ...state, ...saved }; CONFIG.language = state.language || 'en'; }
  else{ CONFIG.language = state.language || 'en'; }
  renderBook(state.currentBook, state.chapterIndex);
  document.getElementById('memory-indicator').classList.remove('hidden');
  window.switchLang = () => {
    CONFIG.language = CONFIG.language === 'en' ? 'it' : 'en'; state.language = CONFIG.language; saveState(state);
    renderBook(state.currentBook, state.chapterIndex);
  };
  window.startBible = () => {
    document.getElementById('start-menu').classList.add('hidden');
    document.getElementById('start-menu').style.display = 'none';
  };
  window.openChapter = (bookName) => {
    state.currentBook = bookName; state.chapterIndex = 0; saveState(state);
    renderBook(bookName, 0);
  };
  document.getElementById('start-menu').classList.remove('hidden');
}

function renderBook(bookName, chIndex){
  state.currentBook = bookName; state.chapterIndex = chIndex;
  const book = BIBLE_BOOKS[bookName];
  if(!book || !book.chapters[chIndex]) return;
  const ch = book.chapters[chIndex];
  const lang = CONFIG.language || 'en';
  document.getElementById('book-label').textContent = (CONFIG.language === 'it' ? book.title.it : book.title.en);
  document.getElementById('ch-label').textContent = ch.number ? ch.number : (chIndex + 1);
  document.getElementById('vs-label').textContent = ch.verse || (chIndex + 1);
  document.getElementById('speaker').textContent = ch.speaker[lang] || ch.speaker.en || 'Scripture';
  document.getElementById('dialogue-text').textContent = ch.text[lang] || ch.text.en;
  clearScreen(book.background || 'scripture');
  const ind = document.getElementById('memory-indicator');
  ind.classList.remove('hidden'); ind.textContent = (CONFIG.language === 'it' ? 'Memoria' : 'Memory');
  document.getElementById('mem').textContent = state.mem; document.getElementById('mel').textContent = state.mel; document.getElementById('art').textContent = state.art;
  addChoiceButtons(ch);
}

function addChoiceButtons(ch){
  const container = document.getElementById('choices');
  container.innerHTML = '';
  const btnNext = document.createElement('button');
  btnNext.textContent = (CONFIG.language === 'it') ? 'Prosegui nella Scrittura' : 'Continue in Scripture';
  btnNext.onclick = () => {
    if(ch.statEffect) applyStatEffect(ch.statEffect);
    state.readTime += 35000; addNote('Scripture: ' + (CONFIG.language === 'it' ? BIBLE_BOOKS[state.currentBook].title.it : BIBLE_BOOKS[state.currentBook].title.en) + ' — Chapter ' + (state.chapterIndex + 1));
    const bookName = state.currentBook;
    const nextIndex = state.chapterIndex + 1;
    const bookData = BIBLE_BOOKS[bookName];
    if(bookData && bookData.chapters[nextIndex]){
      renderBook(bookName, nextIndex);
    } else {
      const nextBook = getNextBook(bookName);
      if(nextBook){
        state.currentBook = nextBook; state.chapterIndex = 0;
        renderBook(nextBook, 0);
      } else {
        renderBook('revelation', 0);
      }
    }
  };
  container.appendChild(btnNext);
  const btnReflect = document.createElement('button');
  btnReflect.textContent = (CONFIG.language === 'it') ? 'Rifletti e annota' : 'Reflect and note';
  btnReflect.onclick = () => {
    addNote('Reflection on ' + (CONFIG.language === 'it' ? BIBLE_BOOKS[state.currentBook].title.it : BIBLE_BOOKS[state.currentBook].title.en));
    if(ch.statEffect) applyStatEffect(ch.statEffect);
    document.getElementById('memory-indicator').classList.remove('hidden');
    setTimeout(() => document.getElementById('memory-indicator').classList.add('hidden'), 800);
  };
  container.appendChild(btnReflect);
}

function applyStatEffect(effect){
  state.mem += effect.mem || 0; state.mel += effect.mel || 0; state.art += effect.art || 0;
  state.mem = Math.max(0, Math.min(20, state.mem)); state.mel = Math.max(0, Math.min(20, state.mel)); state.art = Math.max(0, Math.min(20, state.art));
  saveState(state);
}

// ACTION SEQUENCES — interactive dramatic scenes
function triggerActionSequence(actionType){
  const overlay=document.createElement('div');
  overlay.id='action-overlay';
  overlay.style.cssText='position:fixed;inset:0;background:rgba(6,4,8,0.92);z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2.5rem;animation:fadeIn 0.4s ease;';
  let content='';
  if(actionType==='red_sea'){
    content='<h2 style="font-family:\'Cinzel Decorative\',serif;color:#bfa07a;font-size:2rem;margin-bottom:1rem;">The Sea Parts</h2><p style="font-style:italic;color:#c8b8a8;font-size:1.1rem;text-align:center;max-width:500px;line-height:1.7;margin-bottom:2rem;">Click rapidly to cross before the waters close. The people must pass before the walls fall.</p><button onclick="completeAction(\'red_sea\',5)" style="padding:1rem 2.5rem;background:#bfa07a22;border:1px solid #bfa07a55;color:#c9b8a8;border-radius:6px;font-family:\'Cormorant Garamond\',serif;font-size:1.1rem;cursor:pointer;">Cross the Waters</button>';
  }else if(actionType==='plagues'){
    content='<h2 style="font-family:\'Cinzel Decorative\',serif;color:#bfa07a;font-size:2rem;margin-bottom:1rem;">The Plagues Descend</h2><p style="font-style:italic;color:#c8b8a8;font-size:1.1rem;text-align:center;max-width:500px;line-height:1.7;margin-bottom:2rem;">Choose quickly — the darkness, the hail, the fire. Each choice shapes the liberation.</p><div style="display:flex;gap:1rem;flex-wrap:wrap;justify-content:center;">'+
    '<button onclick="completeAction(\'plagues\',3,\'darkness\')" style="padding:0.7rem 1.2rem;background:#0e0a12;border:1px solid #4a3a25;color:#c8b8a8;border-radius:4px;cursor:pointer;font-family:\'Cormorant Garamond\',serif;">Darkness</button>'+
    '<button onclick="completeAction(\'plagues\',3,\'hail\')" style="padding:0.7rem 1.2rem;background:#0e0a12;border:1px solid #6a5a35;color:#c8b8a8;border-radius:4px;cursor:pointer;font-family:\'Cormorant Garamond\',serif;">Hail</button>'+
    '<button onclick="completeAction(\'plagues\',3,\'fire\')" style="padding:0.7rem 1.2rem;background:#0e0a12;border:1px solid #8a4a25;color:#c8b8a8;border-radius:4px;cursor:pointer;font-family:\'Cormorant Garamond\',serif;">Fire</button></div>';
  }else if(actionType==='resurrection'){
    content='<h2 style="font-family:\'Cinzel Decorative\',serif;color:#bfa07a;font-size:2rem;margin-bottom:1rem;">The Light Breaks Forth</h2><p style="font-style:italic;color:#c8b8a8;font-size:1.1rem;text-align:center;max-width:500px;line-height:1.7;margin-bottom:2rem;">The stone rolls away. Click to witness the empty tomb. Death is swallowed in victory.</p><button onclick="completeAction(\'resurrection\',10)" style="padding:1rem 2.5rem;background:#bfa07a22;border:1px solid #bfa07a55;color:#c9b8a8;border-radius:6px;font-family:\'Cormorant Garamond\',serif;font-size:1.1rem;cursor:pointer;">Witness the Empty Tomb</button>';
  }else if(actionType==='david'){
    content='<h2 style="font-family:\'Cinzel Decorative\',serif;color:#bfa07a;font-size:2rem;margin-bottom:1rem;">The Stone Flies</h2><p style="font-style:italic;color:#c8b8a8;font-size:1.1rem;text-align:center;max-width:500px;line-height:1.7;margin-bottom:2rem;">Aim and click to release the stone. The small defeats the giant. Faith overcomes the impossible.</p><button onclick="completeAction(\'david\',6)" style="padding:1rem 2.5rem;background:#bfa07a22;border:1px solid #bfa07a55;color:#c9b8a8;border-radius:6px;font-family:\'Cormorant Garamond\',serif;font-size:1.1rem;cursor:pointer;">Release the Stone</button>';
  }else{
    content='<h2 style="font-family:\'Cinzel Decorative\',serif;color:#bfa07a;font-size:2rem;margin-bottom:1rem;">The Moment Reveals Itself</h2><p style="font-style:italic;color:#c9b8a8;font-size:1.1rem;text-align:center;max-width:500px;line-height:1.7;margin-bottom:2rem;">Contemplate this scene slowly. Let the depth of the Scripture reveal itself through your patience and attention.</p><button onclick="closeAction()" style="padding:1rem 2rem;background:#bfa07a22;border:1px solid #bfa07a55;color:#c9b8a8;border-radius:6px;font-family:\'Cormorant Garamond\',serif;font-size:1rem;cursor:pointer;">Continue Contemplating</button>';
  }
  overlay.innerHTML=content;
  document.body.appendChild(overlay);
}

window.completeAction=(type,b,spec)=>{
  const overlay=document.getElementById('action-overlay');
  if(overlay)overlay.remove();
  playTone(440,0.2);playTone(523,0.3);
  const s=loadState();
  s.mem += b||3; s.mel += Math.floor(b/3)||1; s.art += Math.floor(b/2)||1;
  s.mem=Math.max(0,Math.min(20,s.mem));s.mel=Math.max(0,Math.min(20,s.mel));s.art=Math.max(0,Math.min(20,s.art));
  saveState(s);
  document.getElementById('mem').textContent=s.mem;
  document.getElementById('mel').textContent=s.mel;
  document.getElementById('art').textContent=s.art;
  document.getElementById('memory-indicator').classList.remove('hidden');
  document.getElementById('memory-indicator').textContent='Action Completed';
  setTimeout(()=>{document.getElementById('memory-indicator').classList.add('hidden');},1500);
};
window.closeAction=()=>{
  const overlay=document.getElementById('action-overlay');
  if(overlay)overlay.remove();
};

function getNextBook(current){
  const order = ['genesis','exodus','psalms','gospels','acts','revelation'];
  const idx = order.indexOf(current);
  if(idx >= 0 && idx < order.length - 1) return order[idx + 1];
  return null;
}

export default { initMain };
