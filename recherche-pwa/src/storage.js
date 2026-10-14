import CONFIG from './config.js';
const SK = 'recherche-state';
const SETS = 'recherche-settings';
function loadJSON(k,f){try{const r=localStorage.getItem(k);return r===null?f:JSON.parse(r);}catch(e){return f;}}
function saveJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
export function getDefaultState(){return {language:'en',chapter:'combray',mem:0,mel:5,art:0,choicesMade:[],visited:['combray','madeleine'],notes:[],startTime:Date.now(),readTime:0};}
export function loadState(){return loadJSON(SK,getDefaultState());}
export function saveState(s){saveJSON(SK,s);}
export function loadSettings(){return loadJSON(SETS,{language:'en',music:true,sound:true,autoSave:true,textSpeed:'slow'});}
export function saveSettings(s){saveJSON(SETS,s);}
export function addNote(text){const s=loadState();if(!s.notes)s.notes=[];s.notes.push({text,time:Date.now()});saveState(s);}
