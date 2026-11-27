import { applyMove, heuristic, isSolved, legalMoves, stateKey } from "./rules.js";

class MinHeap {
  constructor() { this.items=[]; }
  get size(){return this.items.length;}
  push(item){const a=this.items;a.push(item);let i=a.length-1;while(i>0){const p=(i-1)>>1;if(a[p].priority<=item.priority)break;a[i]=a[p];i=p;}a[i]=item;}
  pop(){const a=this.items;if(!a.length)return null;const top=a[0],last=a.pop();if(a.length){let i=0;while(true){const l=i*2+1,r=l+1;if(l>=a.length)break;let c=l;if(r<a.length&&a[r].priority<a[l].priority)c=r;if(a[c].priority>=last.priority)break;a[i]=a[c];i=c;}a[i]=last;}return top;}
}

export function solveLevel(level, options={}) {
  const start=(options.offsets||level.offsets).slice();
  if(isSolved(start,level.segments))return{ok:true,nodes:0,solution:[]};
  const maxNodes=options.maxNodes||500000,maxMoves=options.maxMoves||120;
  const heap=new MinHeap(),best=new Map();
  const root={offsets:start,moves:0,priority:heuristic(start,level),parent:null,move:null};
  heap.push(root);best.set(stateKey(start),0);let nodes=0;
  while(heap.size&&nodes<maxNodes){
    const node=heap.pop();const key=stateKey(node.offsets);
    if(node.moves>(best.get(key)??Infinity))continue;nodes++;
    if(isSolved(node.offsets,level.segments)){
      const solution=[];let cursor=node;while(cursor.parent){solution.push(cursor.move);cursor=cursor.parent;}solution.reverse();return{ok:true,nodes,solution};
    }
    if(node.moves>=maxMoves)continue;
    for(const move of legalMoves(node.offsets,level)){
      const offsets=applyMove(node.offsets,level,move),nextKey=stateKey(offsets),moves=node.moves+1;
      if(moves>=(best.get(nextKey)??Infinity))continue;best.set(nextKey,moves);
      heap.push({offsets,moves,priority:moves+heuristic(offsets,level),parent:node,move});
    }
  }
  return{ok:false,nodes,reason:heap.size?"node-limit":"dead-end"};
}
