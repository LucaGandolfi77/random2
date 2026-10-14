import CONFIG from './config.js';
const STORAGE_KEY = 'crime-state';
const SETTINGS_KEY = 'crime-settings';
function loadJSON(key,fallback){try{const r=localStorage.getItem(key);return r===null?fallback:JSON.parse(r);}catch(e){return fallback;}}
function saveJSON(key,val){try{localStorage.setItem(key,JSON.stringify(val));}catch(e){}}
function getDefaultState(){return {language:'en',chapter:'intro',conscience:12,guilt:85,hope:8,choicesMade:[],visitedScenes:['intro'],readTime:0,startTime:Date.now(),moralAxis:{rational:50,spiritual:50},notes:[]};}
export function loadState(){return loadJSON(STORAGE_KEY,getDefaultState());}
export function saveState(s){saveJSON(STORAGE_KEY,s);}
export function loadSettings(){return loadJSON(SETTINGS_KEY,{language:'en',music:true,sound:true,autoSave:true,textSpeed:'normal'});}
export function saveSettings(s){saveJSON(SETTINGS_KEY,s);}
export function addNote(t){const s=loadState();if(!s.notes)s.notes=[];s.notes.push({text:t,time:Date.now()});saveState(s);}
