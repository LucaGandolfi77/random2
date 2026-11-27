import { ATLASES, LEVELS_PER_ATLAS, STORAGE_KEY } from "./config.js";
const SETTINGS_KEY="ring-atlas-settings-v1",RESUME_KEY="ring-atlas-resume-v1";
function read(k,f){try{const r=localStorage.getItem(k);return r?JSON.parse(r):f;}catch{return f;}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{return false;}}
export function loadProgress(){const r=read(STORAGE_KEY,null),p=r&&typeof r==="object"?r:{};return{unlocked:Math.max(1,Math.min(100,Number(p.unlocked)||1)),stars:p.stars&&typeof p.stars==="object"?p.stars:{},bestMoves:p.bestMoves&&typeof p.bestMoves==="object"?p.bestMoves:{},daily:p.daily&&typeof p.daily==="object"?p.daily:{}};}
export function saveProgress(p){return write(STORAGE_KEY,p);}
export function recordWin(p,level,state){const prev=Number(p.stars[level.id])||0;p.stars[level.id]=Math.max(prev,state.stars||0);p.bestMoves[level.id]=Math.min(Number(p.bestMoves[level.id])||Infinity,state.moves);if(level.kind==="campaign"){const flat=level.atlasIndex*LEVELS_PER_ATLAS+level.stage+1;p.unlocked=Math.max(p.unlocked,Math.min(ATLASES.length*LEVELS_PER_ATLAS,flat+1));}if(level.kind==="daily"){const old=p.daily[level.id]||{};p.daily[level.id]={stars:Math.max(old.stars||0,state.stars||0),moves:Math.min(old.moves||Infinity,state.moves)};}saveProgress(p);}
export function loadSettings(){const r=read(SETTINGS_KEY,null),s=r&&typeof r==="object"?r:{};return{sound:s.sound!==false,reducedMotion:s.reducedMotion===true};}
export function saveSettings(s){return write(SETTINGS_KEY,s);}
export function loadResume(){const r=read(RESUME_KEY,null);return r&&typeof r==="object"?r:null;}
export function saveResume(level,snapshot){return write(RESUME_KEY,{level,snapshot,savedAt:Date.now()});}
export function clearResume(){try{localStorage.removeItem(RESUME_KEY);}catch{}}
export function resumeIsValid(level,snapshot){if(!level||!snapshot||snapshot.specId!==level.id||snapshot.status!=="playing")return false;if(!Array.isArray(snapshot.offsets)||snapshot.offsets.length!==level.rings)return false;return snapshot.offsets.every(o=>Number.isInteger(o)&&o>=0&&o<level.segments);}
