export const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const angleDelta=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
export function moveToward(value,target,maxDelta){return value+clamp(target-value,-maxDelta,maxDelta)}
