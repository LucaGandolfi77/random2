import CONFIG from './config.js';
const SK='anthology-state';
const SETS='anthology-settings';
function loadJSON(k,f){try{const r=localStorage.getItem(k);return r===null?f:JSON.parse(r);}catch(e){return f;}}
function saveJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
export function getDefaultState(){return {language:'en',visited:['miserables','crime_punishment','recherche','brothers_karamazov','divine_comedy','the_trial'],libraryStats:{mem:0,mel:0,art:0},currentStory:null,startTime:Date.now(),readTime:0,notes:[]};}
export function loadState(){return loadJSON(SK,getDefaultState());}
export function saveState(s){saveJSON(SK,s);}
export function loadSettings(){return loadJSON(SETS,{language:'en',music:true,sound:true,autoSave:true,textSpeed:'slow'});}
export function saveSettings(s){saveJSON(SETS,s);}
export function addNote(t){const s=loadState();if(!s.notes)s.notes=[];s.notes.push({text:t,time:Date.now()});saveState(s);}
