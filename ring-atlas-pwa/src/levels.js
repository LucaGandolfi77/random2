import { ATLASES, LEVELS_PER_ATLAS } from "./config.js";
import { LEVEL_DATA } from "./level-data.js";
import { applyMove, isSolved, legalMoves } from "./rules.js";

export function mulberry32(seed){let a=seed>>>0;return function(){a|=0;a=(a+0x6d2b79f5)|0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296;};}
function shuffled(list,rng){for(let i=list.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;}

export function makeCandidate(atlasIndex,stage,seed){
  const atlas=ATLASES[atlasIndex]||ATLASES[0],rng=mulberry32(seed>>>0),rings=atlas.rings,segments=atlas.segments;
  const pairs=[];for(let a=0;a<rings;a++)for(let b=a+1;b<rings;b++)pairs.push([a,b]);
  const links=shuffled(pairs.slice(),rng).slice(0,Math.min(atlas.links,pairs.length)).map(([a,b])=>({a,b,relation:rng()<.5?-1:1}));
  const locks=[];for(let i=0;i<Math.min(atlas.locks,rings-1);i++){const ring=1+Math.floor(rng()*(rings-1));if(locks.some(l=>l.ring===ring))continue;locks.push({ring,dependsOn:Math.floor(rng()*ring)});}
  const mirrors=shuffled(Array.from({length:rings},(_,i)=>i),rng).slice(0,Math.min(atlas.mirrors,rings));
  const offsets=Array.from({length:rings},()=>Math.floor(rng()*segments));
  if(isSolved(offsets,segments))offsets[0]=1%segments;
  return{id:`${atlas.id}-${stage+1}`,kind:"campaign",atlasIndex,atlasName:atlas.name,stage,number:atlasIndex*LEVELS_PER_ATLAS+stage+1,name:`${atlas.name} · ${stage+1}`,seed:seed>>>0,rings,segments,offsets,links,locks,mirrors};
}
function cloneLevel(level){return{...level,offsets:level.offsets.slice(),links:level.links.map(l=>({...l})),locks:level.locks.map(l=>({...l})),mirrors:level.mirrors.slice(),solution:level.solution.map(m=>({...m})),shuffleOffsets:level.shuffleOffsets.slice(),shuffleSolution:level.shuffleSolution.map(m=>({...m}))};}
export function makeLevel(atlasIndex,stage){const a=Math.max(0,Math.min(ATLASES.length-1,atlasIndex|0)),s=Math.max(0,Math.min(LEVELS_PER_ATLAS-1,stage|0)),level=LEVEL_DATA[a*LEVELS_PER_ATLAS+s];if(!level)throw new Error(`Missing validated level ${a+1}.${s+1}`);return cloneLevel(level);}
export function dailyLevel(dateKey){let h=2166136261;for(const c of dateKey)h=Math.imul(h^c.charCodeAt(0),16777619);const i=(h>>>0)%LEVEL_DATA.length,level=makeLevel(Math.floor(i/LEVELS_PER_ATLAS),i%LEVELS_PER_ATLAS);return{...level,id:`daily-${dateKey}`,kind:"daily",name:"Atlante del giorno"};}
function replay(level,offsets,solution){let state=offsets.slice();for(const move of solution){if(!legalMoves(state,level).some(m=>m.ring===move.ring&&m.delta===move.delta))return null;state=applyMove(state,level,move);}return isSolved(state,level.segments)?state:null;}
export function validateLevel(level){const errors=[];if(!level||!level.offsets||!level.solution)return["missing level data"];if(level.offsets.length!==level.rings)errors.push("wrong ring count");if(level.offsets.some(o=>o<0||o>=level.segments))errors.push("offset out of range");for(const l of level.links){if(l.a<0||l.b<0||l.a>=level.rings||l.b>=level.rings||l.a===l.b)errors.push("invalid link");}for(const l of level.locks){if(l.ring<0||l.dependsOn<0||l.ring>=level.rings||l.dependsOn>=level.rings||l.ring===l.dependsOn)errors.push("invalid lock");}if(level.mirrors.some(r=>r<0||r>=level.rings))errors.push("invalid mirror");if(!replay(level,level.offsets,level.solution))errors.push("stored solution does not solve level");if(!replay(level,level.shuffleOffsets,level.shuffleSolution))errors.push("shuffle state is not solvable");if(isSolved(level.offsets,level.segments))errors.push("level already solved");return errors;}
export function totalLevels(){return ATLASES.length*LEVELS_PER_ATLAS;}
