import test from "node:test";
import assert from "node:assert/strict";
import { createGame } from "../src/engine.js";
import { makeLevel } from "../src/levels.js";

test("the stored solution removes every arrow and wins", () => {
  const level=makeLevel(0,0); const game=createGame(level);
  for(const move of level.solution){const result=game.hit(move.index);assert.equal(result.ok,true,`${level.id} move ${move.index}`);}
  assert.equal(game.state.status,"won"); assert.ok(game.state.stars>=1&&game.state.stars<=3);
});

test("a blocked arrow cannot be removed", () => {
  const level=makeLevel(0,0); const game=createGame(level);
  const blocked=game.state.arrows.findIndex((_,i)=>!game.clearPath(i)); assert.ok(blocked>=0);
  assert.equal(game.hit(blocked).ok,false); assert.equal(game.state.moves,0);
});

test("heavy arrows need two hits", () => {
  const level={id:"heavy",kind:"campaign",size:3,arrows:[{id:"h",x:1,y:1,dir:0,heavy:true}],walls:[],doors:[],solution:[{index:0,type:"hit"},{index:0,type:"remove"}],par:2};
  const game=createGame(level); assert.equal(game.hit(0).removed,false); assert.equal(game.hit(0).removed,true); assert.equal(game.state.status,"won");
});

test("doors open after their required arrow is removed", () => {
  const level={id:"doors",kind:"campaign",size:4,arrows:[{id:"a",x:0,y:3,dir:0,heavy:false},{id:"b",x:1,y:0,dir:1,heavy:false}],walls:[],doors:[{id:"d",x:2,y:0,key:2,requires:["a"]}],solution:[{index:0,type:"remove"},{index:1,type:"remove"}],par:2};
  const game=createGame(level); assert.equal(game.clearPath(1),false); game.hit(0); assert.equal(game.clearPath(1),true); game.hit(1); assert.equal(game.state.status,"won");
});

test("undo restores the previous arrow states", () => {
  const level=makeLevel(0,0); const game=createGame(level); const before=JSON.stringify(game.state.arrows); game.hit(level.solution[0].index); assert.equal(game.undo(),true); assert.equal(JSON.stringify(game.state.arrows),before);
});

test("hammer removes a blocked arrow and consumes a charge", () => {
  const level=makeLevel(0,0); const game=createGame(level); const blocked=game.state.arrows.findIndex((_,i)=>!game.clearPath(i)); assert.equal(game.hammer(blocked),true); assert.equal(game.state.arrows[blocked].status,"removed"); assert.equal(game.state.hammersLeft,1);
});

test("scan highlights legal arrows and hint returns a legal move", () => {
  const level=makeLevel(0,0); const game=createGame(level); assert.equal(game.scan(),true); assert.ok(game.state.highlight.length>0); const hint=game.hint(); assert.ok(hint); assert.equal(game.clearPath(hint.index),true);
});
