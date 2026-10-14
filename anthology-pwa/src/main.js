import CONFIG from './config.js';
import { loadState, saveState, addNote } from './storage.js';
import { initRender, clearScreen } from './render.js';
import { initAudio, playMemory } from './audio.js';

export function initMain(){
  initRender();initAudio();
  const saved=loadState();
  const langBtn=document.getElementById('language-switch');
  if(saved&&saved.language){CONFIG.language=saved.language;}
  else{CONFIG.language='en';}
  renderLibrary();
  playMemory(165,2);
  window.switchLang=()=>{
    CONFIG.language=CONFIG.language==='en'?'it':'en';
    const s=loadState();s.language=CONFIG.language;saveState(s);
    renderLibrary();
  };
  window.openVN=(id)=>{
    const story=CONFIG.library.find(s=>s.id===id);
    if(story){
      addNote('Selected: '+(CONFIG.language==='it'?story.title.it:story.title.en));
      document.getElementById('start-menu').classList.add('hidden');
      document.getElementById('start-menu').style.display='none';
      document.getElementById('start-menu').innerHTML='<h2 style="text-align:center;font-family:\'Cormorant Garamond\',serif;color:#c9b0a0;margin-top:10vh;font-size:2rem;font-weight:300;letter-spacing:0.1em;">'+(CONFIG.language==='it'?story.title.it:story.title.en)+'</h2><p style="text-align:center;font-style:italic;color:#9a8876;margin-top:1rem;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.6;">'+(CONFIG.language==='it'?story.author.it:story.author.en)+'</p><button style="display:block;margin:3rem auto;padding:1rem 2rem;background:#bfa07a22;border:1px solid #bfa07a55;color:#c9b8a8;border-radius:6px;font-family:\'Cormorant Garamond\',serif;font-size:1.1rem;cursor:pointer;transition:all 0.25s;" onclick="window.location.href=\'../'+id+'-pwa/\';">Inizia — Open Story</button>';
      document.getElementById('start-menu').classList.remove('hidden');
    }
  };
  window.showAbout=()=>{document.getElementById('start-menu').classList.add('hidden');document.getElementById('start-menu').style.display='none';document.getElementById('about-menu').classList.remove('hidden');document.getElementById('about-menu').style.display='flex';};
  window.showMultiverse=()=>{
    document.getElementById('start-menu').classList.add('hidden');
    document.getElementById('start-menu').style.display='none';
    document.getElementById('start-menu').innerHTML='<h2 style="text-align:center;font-family:\'Cormorant Garamond\',serif;color:#bfa07a;margin-top:10vh;font-size:2.2rem;font-weight:300;letter-spacing:0.1em;">Multiversi</h2><p style="text-align:center;font-style:italic;color:#9a8876;margin-top:1rem;max-width:520px;margin-left:auto;margin-right:auto;line-height:1.7;font-size:1rem;">Versioni alternative delle opere classiche — nuovi mondi, nuove situazioni, nuovi personaggi, ma la stessa profondità filosofica. Ogni universo esplora un\'altra faccia della verità.</p><button style="display:block;margin:3rem auto;padding:1rem 2rem;background:#bfa07a22;border:1px solid #bfa07a55;color:#c9b8a8;border-radius:6px;font-family:\'Cormorant Garamond\',serif;font-size:1rem;cursor:pointer;transition:all 0.25s;" onclick="window.backToLibrary();">Ritorna — Back</button>';
    document.getElementById('start-menu').classList.remove('hidden');
  };
  window.backToLibrary=()=>{document.getElementById('about-menu').classList.add('hidden');document.getElementById('start-menu').classList.remove('hidden');document.getElementById('start-menu').style.display='flex';};
  document.getElementById('start-menu').classList.remove('hidden');
}
function renderLibrary(){clearScreen();}
