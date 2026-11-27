import test from "node:test";import assert from "node:assert/strict";import{applyMove,circularDistance,isRingLocked,isSolved,legalMoves,normalizeOffset}from"../src/rules.js";
const level={rings:2,segments:6,offsets:[1,0],links:[{a:0,b:1,relation:-1}],locks:[]};
test("offsets wrap around the ring",()=>{assert.equal(normalizeOffset(-1,6),5);assert.equal(circularDistance(5,6),1);});
test("linked rings move in opposite directions",()=>{const next=applyMove(level.offsets,level,{ring:0,delta:1});assert.deepEqual(next,[2,5]);});
test("locked rings have no legal moves until their dependency aligns",()=>{const locked={rings:2,segments:6,offsets:[2,1],links:[],locks:[{ring:1,dependsOn:0}]};assert.equal(isRingLocked(1,locked.offsets,locked),true);assert.equal(legalMoves(locked.offsets,locked).some(m=>m.ring===1),false);const next=applyMove(applyMove(locked.offsets,locked,{ring:0,delta:-1}),locked,{ring:0,delta:-1});assert.equal(isRingLocked(1,next,locked),false);});
test("all zero offsets solve the atlas",()=>{assert.equal(isSolved([0,0,0],6),true);assert.equal(isSolved([0,1,0],6),false);});
