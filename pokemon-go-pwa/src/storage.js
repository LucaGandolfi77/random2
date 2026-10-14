import CONFIG from './config.js';
const SK='pokemon-state';
function loadJSON(k,f){try{const r=localStorage.getItem(k);return r===null?f:JSON.parse(r);}catch(e){return f;}}
function saveJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
export function getDefaultState(){return {language:'en',caught:[],flown:0,total:0,lastPlayed:Date.now(),library:0};}
export function loadState(){return loadJSON(SK,getDefaultState());}
export function saveState(s){saveJSON(SK,s);}
export function loadSettings(){return loadJSON('pokemon-settings',{language:'en',sound:true,haptics:true,autoSave:true});}
export function saveSettings(s){saveJSON('pokemon-settings',s);}
