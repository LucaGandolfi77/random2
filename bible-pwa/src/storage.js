import CONFIG from './config.js';
const SK='bible-state';
const SETS='bible-settings';
function loadJSON(k,f){try{const r=localStorage.getItem(k);return r===null?f:JSON.parse(r);}catch(e){return f;}}
function saveJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
export function getDefaultState(){return {language:'en',currentBook:'genesis',currentChapter:0,readTime:0,startTime:Date.now(),notes:[],visitedBooks:['genesis','gospels'],visitedChapters:[]};}
export function loadState(){return loadJSON(SK,getDefaultState());}
export function saveState(s){saveJSON(SK,s);}
export function loadSettings(){return loadJSON(SETS,{language:'en',music:true,sound:true,autoSave:true,textSpeed:'slow'});}
export function saveSettings(s){saveJSON(SETS,s);}
export function addNote(t){const s=loadState();if(!s.notes)s.notes=[];s.notes.push({text:t,time:Date.now()});saveState(s);}
