import CONFIG from './config.js';
import { loadState, saveState, addNote } from './storage.js';
import { initRender, clearScreen, drawDialogueText, showChoices } from './render.js';
import { playTone, playMood, initAudio, updateAudio } from './audio.js';

const storyData = {
  scenes: {
    intro: {
      speaker: 'Raskolnikov',
      textEn: "The heat in the room was stifling. A small room with a bed, a table, and nothing more. I had been thinking... about the crime. About whether a great man might transcend ordinary morality.",
      textIt: "Il caldo nella stanza era soffocante. Una piccola stanza con un letto, un tavolo, e nient'altro. Stavo pensando... al crimine. Se un grande uomo potesse trascendere la morale ordinaria.",
      background: 'dark',
      choicesEn: [
        { text: "Reflect on the extraordinary man's right", effect: { scene:'philosophy', conscience:-3, guilt:+5, hope:-1 }, sceneTextEn: "One extraordinary crime... it clears the way for a thousand good deeds.", sceneTextIt: "Un crimine straordinario... apre la strada a mille buone azioni." },
        { text: "Consider the weight of conscience", effect: { scene:'philosophy', conscience:+5, guilt:-2, hope:+2 }, sceneTextEn: "Can any theory truly silence the human conscience?", sceneTextIt: "Può una teoria davvero silenziare la coscienza umana?" }
      ],
      choicesIt: [
        { text: "Riflettere sul diritto dell'uomo straordinario", effect: { scene:'philosophy', conscience:-3, guilt:+5, hope:-1 }, sceneTextEn: "One extraordinary crime... it clears the way for a thousand good deeds.", sceneTextIt: "Un crimine straordinario... apre la strada a mille buone azioni." },
        { text: "Considerare il peso della coscienza", effect: { scene:'philosophy', conscience:+5, guilt:-2, hope:+2 }, sceneTextEn: "Can any theory truly silence the human conscience?", sceneTextIt: "Può una teoria davvero silenziare la coscienza umana?" }
      ]
    },
    philosophy: {
      speaker: 'Raskolnikov',
      textEn: "The article I wrote... it divided humanity into the ordinary and the extraordinary. The latter have the right — even the duty — to overstep the law. Napoleon... he was not bound by ordinary morality.",
      textIt: "L'articolo che ho scritto... divide l'umanità tra l'ordinario e lo straordinario. Questi ultimi hanno il diritto — persino il dovere — di oltrepassare la legge. Napoleone... non era vincolato dalla morale ordinaria.",
      background: 'redemption',
      choicesEn: [
        { text: "Plan the act of liberation", effect: { scene:'before_murder', conscience:-5, guilt:+8, hope:-3 }, sceneTextEn: "She is useless, a louse on the earth. The money... it could serve a thousand lives.", sceneTextIt: "Lei è inutile, una pidocchio sulla terra. Il denaro... potrebbe servire mille vite." },
        { text: "Turn away from violence", effect: { scene:'before_murder', conscience:+3, guilt:-1, hope:+4 }, sceneTextEn: "But what am I? A trembling creature... or a man with the right to transcend.", sceneTextIt: "Ma chi sono io? Una creatura tremante... o un uomo con il diritto di trascendere." }
      ],
      choicesIt: [
        { text: "Pianificare l'atto di liberazione", effect: { scene:'before_murder', conscience:-5, guilt:+8, hope:-3 }, sceneTextEn: "She is useless, a louse on the earth. The money... it could serve a thousand lives.", sceneTextIt: "Lei è inutile, una pidocchio sulla terra. Il denaro... potrebbe servire mille vite." },
        { text: "Allontanarsi dalla violenza", effect: { scene:'before_murder', conscience:+3, guilt:-1, hope:+4 }, sceneTextEn: "But what am I? A trembling creature... or a man with the right to transcend.", sceneTextIt: "Ma chi sono io? Una creatura tremante... o un uomo con il diritto di trascendere." }
      ]
    },
    before_murder: {
      speaker: 'Raskolnikov',
      textEn: "The old pawnbroker... Alyona Ivanovna. Her money... it would save my family. My mother writes of debts. Dunya suffers. And Sonia... Sonia sells her soul for bread.",
      textIt: "La vecchia usuraia... Alyona Ivanovna. Il suo denaro... salverebbe la mia famiglia. Mia madre scrive dei debiti. Dunya soffre. E Sonia... Sonia vende la sua anima per il pane.",
      background: 'murder',
      choicesEn: [
        { text: "Proceed with the axe", effect: { scene:'after_murder', conscience:-8, guilt:+15, hope:-5 }, sceneTextEn: "The blood... the blood is warm. I must hide it. The crime is done.", sceneTextIt: "Il sangue... il sangue è caldo. Devo nasconderlo. Il crimine è compiuto." },
        { text: "Walk away from the house", effect: { scene:'after_murder', conscience:+8, guilt:-10, hope:+6 }, sceneTextEn: "I cannot cross that threshold. I am not Napoleon. I am a trembling creature.", sceneTextIt: "Non posso varcare quella soglia. Non sono Napoleone. Sono una creatura tremante." }
      ],
      choicesIt: [
        { text: "Procedere con l'ascia", effect: { scene:'after_murder', conscience:-8, guilt:+15, hope:-5 }, sceneTextEn: "The blood... the blood is warm. I must hide it. The crime is done.", sceneTextIt: "Il sangue... il sangue è caldo. Devo nasconderlo. Il crimine è compiuto." },
        { text: "Allontanarsi dalla casa", effect: { scene:'after_murder', conscience:+8, guilt:-10, hope:+6 }, sceneTextEn: "I cannot cross that threshold. I am not Napoleon. I am a trembling creature.", sceneTextIt: "Non posso varcare quella soglia. Non sono Napoleone. Sono una creatura tremante." }
      ]
    },
    after_murder: {
      speaker: 'Raskolnikov',
      textEn: "The old woman's blood... it stains everything. Even my hands feel it. Sonia... she sees something in me. She sees suffering. Not the crime — but the suffering of a soul that has lost itself.",
      textIt: "Il sangue della vecchia... macchia tutto. Persino le mie mani lo sentono. Sonia... lei vede qualcosa in me. Vede la sofferenza. Non il crimine — ma la sofferenza di un'anima che si è perduta.",
      background: 'redemption',
      choicesEn: [
        { text: "Seek Sonia's forgiveness", effect: { scene:'redemption_start', conscience:+5, guilt:-3, hope:+8 }, sceneTextEn: "Sonia... can you see me? Not the murderer — but the suffering creature that cries for understanding.", sceneTextIt: "Sonia... mi vedi? Non l'assassino — ma la creatura sofferente che piange per comprensione." },
        { text: "Flee into isolation", effect: { scene:'redemption_start', conscience:-3, guilt:+3, hope:-2 }, sceneTextEn: "They will never understand. The extraordinary man — if he exists — walks alone.", sceneTextIt: "Non capiranno mai. L'uomo straordinario — se esiste — cammina da solo." }
      ],
      choicesIt: [
        { text: "Cercare il perdono di Sonia", effect: { scene:'redemption_start', conscience:+5, guilt:-3, hope:+8 }, sceneTextEn: "Sonia... can you see me? Not the murderer — but the suffering creature that cries for understanding.", sceneTextIt: "Sonia... mi vedi? Non l'assassino — ma la creatura sofferente che piange per comprensione." },
        { text: "Fuggire nell'isolamento", effect: { scene:'redemption_start', conscience:-3, guilt:+3, hope:-2 }, sceneTextEn: "They will never understand. The extraordinary man — if he exists — walks alone.", sceneTextIt: "Non capiranno mai. L'uomo straordinario — se esiste — cammina da solo." }
      ]
    },
    redemption_start: {
      speaker: 'Sonia',
      textEn: "You suffer so much... but suffering can be redeemed. You must confess, Rodion. Confession is not defeat — it is the only path to freedom. The soul that confesses finds peace, even in the darkest cell.",
      textIt: "Soffri così tanto... ma la sofferenza può essere redenta. Devi confessare, Rodion. La confessione non è sconfitta — è l'unica via verso la libertà. L'anima che confessa trova pace, anche nella cella più buia.",
      background: 'redemption',
      choicesEn: [
        { text: "Confess to Sonia and seek redemption", effect: { scene:'ending_redemption', conscience:+10, guilt:-8, hope:+10 }, sceneTextEn: "Sonia... I confess. The crime was mine. The guilt is mine. But the redemption — help me find it.", sceneTextIt: "Sonia... confesso. Il crimine era mio. La colpa è mia. Ma la redenzione — aiutami a trovarla." },
        { text: "Keep the secret and endure alone", effect: { scene:'ending_isolation', conscience:-2, guilt:+2, hope:-5 }, sceneTextEn: "No one can help me. Not even God. I am the extraordinary man, and I must bear this alone.", sceneTextIt: "Nessuno può aiutarmi. Neanche Dio. Sono l'uomo straordinario, e devo sopportare questo da solo." },
        { text: "Surrender to the police and face justice", effect: { scene:'ending_justice', conscience:+6, guilt:+4, hope:+3 }, sceneTextEn: "Porfiry... I have come to confess. The axe... the pawnbroker... it was me. Let justice take its course.", sceneTextIt: "Porfiry... sono venuto a confessare. L'ascia... l'usuraia... ero io. Che la giustizia faccia il suo corso." }
      ],
      choicesIt: [
        { text: "Confessare a Sonia e cercare redenzione", effect: { scene:'ending_redemption', conscience:+10, guilt:-8, hope:+10 }, sceneTextEn: "Sonia... I confess. The crime was mine. The guilt is mine. But the redemption — help me find it.", sceneTextIt: "Sonia... confesso. Il crimine era mio. La colpa è mia. Ma la redenzione — aiutami a trovarla." },
        { text: "Mantenere il segreto e sopportare da solo", effect: { scene:'ending_isolation', conscience:-2, guilt:+2, hope:-5 }, sceneTextEn: "No one can help me. Not even God. I am the extraordinary man, and I must bear this alone.", sceneTextIt: "Nessuno può aiutarmi. Neanche Dio. Sono l'uomo straordinario, e devo sopportare questo da solo." },
        { text: "Arrendersi alla polizia e affrontare la giustizia", effect: { scene:'ending_justice', conscience:+6, guilt:+4, hope:+3 }, sceneTextEn: "Porfiry... I have come to confess. The axe... the pawnbroker... it was me. Let justice take its course.", sceneTextIt: "Porfiry... sono venuto a confessare. L'ascia... l'usuraia... ero io. Che la giustizia faccia il suo corso." }
      ]
    },
    ending_redemption: { speaker:'Sonia', textEn:'You have found the path. The suffering... it was not meaningless. Through it, you have learned to love. And love... love is the only law that truly matters.', textIt:'Hai trovato il sentiero. La sofferenza... non era priva di significato. Attraverso di essa, hai imparato ad amare. E l\'amore... l\'amore è l\'unica legge che conta veramente.' },
    ending_isolation: { speaker:'Raskolnikov', textEn:'I am alone. The weight... the weight is crushing me. There is no redemption — only the endless solitude of conscience without forgiveness.', textIt:'Sono solo. Il peso... il peso mi schiaccia. Non c\'è redenzione — solo la solitudine senza fine della coscienza senza perdono.' },
    ending_justice: { speaker:'Porfiry', textEn:'Justice... it is not punishment alone. It is recognition. You have confessed. Now you must serve, work, and find redemption through action.', textIt:'La giustizia... non è solo punizione. È riconoscimento. Hai confessato. Ora devi servire, lavorare, e trovare redenzione attraverso l\'azione.' }
  }
};

let state = { language:'en', scene:'intro', conscience:12, guilt:85, hope:8, notes:[] };
function renderScene(){clearScreen();const scene=storyData.scenes[state.scene];if(!scene)return;document.getElementById('speaker').textContent=scene.speaker;const lang=CONFIG.language||state.language||'en';const text=lang==='it'?(scene.textIt||scene.textEn):(scene.textEn||scene.textIt);document.getElementById('dialogue-text').textContent=text;drawSpeaker(state.scene);updateStats();}
function updateStats(){document.getElementById('conscience-val').textContent=state.conscience;document.getElementById('guilt-val').textContent=state.guilt;document.getElementById('hope-val').textContent=state.hope;}
function drawSpeaker(s){document.getElementById('speaker').textContent=storyData.scenes[s]?.speaker||'Narrator';}

export function initMain(){initRender();initAudio();clearScreen('dark');const saved=loadState();if(saved)state={...state,...saved};renderScene();if(state.scene==='intro')playMood('dark');updateStats();addChoiceButtons();}

function addChoiceButtons(){
  const current=storyData.scenes[state.scene];
  if(!current) return;
  const lang=CONFIG.language||state.language||'en';
  const choices=lang==='it'?(current.choicesIt||current.choicesEn):(current.choicesEn||current.choicesIt);
  const container=document.getElementById('choices');
  container.innerHTML='';
  choices.forEach((c,i)=>{
    const btn=document.createElement('button');
    btn.textContent=(lang==='it'?c.text.split(' — ')[0]:c.text.split(' — ')[0])||c.text;
    btn.onclick=()=>{applyChoice(c);};
    container.appendChild(btn);
  });
}

function applyChoice(choice){
  state.conscience+=choice.effect.conscience||0;
  state.guilt+=choice.effect.guilt||0;
  state.hope+=choice.effect.hope||0;
  state.scene=choice.effect.scene;
  state.conscience=Math.max(0,Math.min(100,state.conscience));
  state.guilt=Math.max(0,Math.min(100,state.guilt));
  state.hope=Math.max(0,Math.min(100,state.hope));
  saveState(state);
  playTone(330,0.15);
  renderScene();
  addChoiceButtons();
  if(state.scene.includes('ending'))updateStats();
}

export function showDialogue(text,speaker='Narrator'){document.getElementById('dialogue-text').textContent=text;document.getElementById('speaker').textContent=speaker;}
export default { initMain, showDialogue };

/* Entry point: this file is loaded as a module, so nothing runs until we
   call it explicitly. Module scripts are deferred, so the DOM is ready. */
initMain();
