import CONFIG from './config.js';
let ac,masterGain;
function initCtx(){if(!ac)try{const AC=window.AudioContext||window.webkitAudioContext;ac=new AC();masterGain=ac.createGain();masterGain.connect(ac.destination);masterGain.gain.value=CONFIG.audio.masterVolume;}catch(e){}}
export function initAudio(){initCtx();}
export function playScripture(f=165,d=4){initCtx();if(!ac)return;try{const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(masterGain);o.type='triangle';o.frequency.setValueAtTime(f,ac.currentTime);g.gain.setValueAtTime(CONFIG.audio.musicVolume,ac.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+d);o.start();o.stop(ac.currentTime+d);}catch(e){}}
export function updateAudio(s){CONFIG.audio.masterVolume=s.masterVolume||0.55;CONFIG.audio.musicVolume=s.musicVolume||0.3;if(masterGain)masterGain.gain.setValueAtTime(CONFIG.audio.masterVolume,ac?.currentTime||0);}
