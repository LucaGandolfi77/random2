import CONFIG from './config.js';
let ctx=null;
function ensureCtx(){if(!ctx){try{const AC=window.AudioContext||window.webkitAudioContext;ctx=new AC();}catch(e){}}}
export function playMood(mood,duration=2){ensureCtx();if(!ctx)return;try{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);const freq={dark:[55,82,110],redemption:[110,165,220],conscience:[165,220,330],guilt:[40,55,82]}[mood]||[82];osc.type='triangle';osc.frequency.setValueAtTime(freq[0],ctx.currentTime);gain.gain.setValueAtTime(CONFIG.audio.musicVolume,duration>0?ctx.currentTime+duration*0.3:ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+duration);osc.start();osc.stop(ctx.currentTime+duration);}catch(e){}}
export function playTone(f,d){ensureCtx();if(!ctx)return;try{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.type='sine';o.frequency.setValueAtTime(f,ctx.currentTime);g.gain.setValueAtTime(CONFIG.audio.masterVolume,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+d);o.start();o.stop(ctx.currentTime+d);}catch(e){}}
export function updateAudio(s){CONFIG.audio={...CONFIG.audio,...s};if(ctx)ctx.destination.gain.value=s.masterVolume||CONFIG.audio.masterVolume;}
export function initAudio(){ensureCtx();}
