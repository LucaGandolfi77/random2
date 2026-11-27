/* Arrow Foundry — dependency-free browser smoke test. */
import { launch, sleep } from "../tools/cdp.mjs";
const base=(process.argv[2]||"http://localhost:8099/arrow-foundry-pwa/").replace(/\/$/,"")+"/";
const browser=await launch(); if(!browser){console.log("arrow-foundry smoke: skipped (no Chromium)");process.exit(0);}
const {cdp,sessionId}=browser; const send=(m,p={})=>cdp.send(m,p,sessionId);
const evaluate=async(expression)=>{const r=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const failures=[];let passed=0;const check=(n,ok,d)=>{if(ok)passed++;else failures.push(n+(d?" — "+d:""));};const errors=[];
cdp.on("Runtime.exceptionThrown",(e)=>errors.push(JSON.stringify(e.exceptionDetails)));
try{
  await send("Page.enable");await send("Runtime.enable");await send("Network.enable");await send("Emulation.setDeviceMetricsOverride",{width:390,height:844,deviceScaleFactor:2,mobile:true});await send("Page.navigate",{url:base+"index.html"});
  let booted=false;for(let i=0;i<40;i++){booted=await evaluate(`!!window.ArrowFoundry`);if(booted)break;await sleep(100);}
  const boot=await evaluate(`({app:!!window.ArrowFoundry,menu:!document.getElementById('menuScreen').classList.contains('hidden'),manifest:!!document.querySelector('link[rel="manifest"]')})`);
  check("app booted",boot.app);check("menu visible",boot.menu);check("manifest linked",boot.manifest);
  const started=await evaluate(`(()=>{window.ArrowFoundry.startLevel(window.ArrowFoundry.makeLevel(0,0));return{screen:window.ArrowFoundry.state.screen,arrows:window.ArrowFoundry.game.state.arrows.length};})()`);
  check("game screen active",started.screen==="game");check("arrows created",started.arrows===12);await sleep(150);
  const played=await evaluate(`(()=>{const h=window.ArrowFoundry.game.hint();if(!h)return{ok:false};const r=window.ArrowFoundry.game.hit(h.index);return{ok:r.ok,moves:window.ArrowFoundry.game.state.moves,removed:r.removed};})()`);
  check("hinted arrow hit works",played.ok&&played.moves===1,JSON.stringify(played));
  const undone=await evaluate(`(()=>{document.getElementById('undoButton').click();return window.ArrowFoundry.game.state.moves===0&&window.ArrowFoundry.game.state.undosLeft===4;})()`);check("undo works",undone===true);
  const scanned=await evaluate(`(()=>{document.getElementById('scanButton').click();return window.ArrowFoundry.game.state.highlight.length>0&&window.ArrowFoundry.game.state.scansLeft===2;})()`);check("scan works",scanned===true);
  const hammered=await evaluate(`(()=>{const i=window.ArrowFoundry.game.state.arrows.findIndex(a=>a.status!=='removed');window.ArrowFoundry.game.hammer(i);return window.ArrowFoundry.game.state.arrows[i].status==='removed'&&window.ArrowFoundry.game.state.hammersLeft===1;})()`);check("hammer works",hammered===true);
  const painted=await evaluate(`document.getElementById('gameCanvas').toDataURL().length>1000`);check("canvas painted",painted===true);
  const paused=await evaluate(`(()=>{document.getElementById('pauseButton').click();return window.ArrowFoundry.state.paused&&!document.getElementById('pauseDialog').classList.contains('hidden');})()`);check("pause dialog works",paused===true);
  await evaluate(`document.getElementById('resumeButton').click();window.ArrowFoundry.returnToMenu();document.getElementById('factoriesButton').click()`);
  const factories=await evaluate(`({tabs:document.querySelectorAll('#areaTabs button').length,levels:document.getElementById('levelGrid').children.length})`);check("ten factories listed",factories.tabs===10);check("ten levels listed",factories.levels===10);await evaluate(`document.querySelector('[data-close="factoriesDialog"]').click()`);
  const sw=await evaluate(`navigator.serviceWorker.ready.then(()=>true).catch(()=>false)`);check("service worker active",sw===true);let controlled=false;for(let i=0;i<30;i++){controlled=await evaluate(`!!navigator.serviceWorker?.controller`);if(controlled)break;await sleep(100);}check("service worker controls page",controlled===true);
  await send("Network.emulateNetworkConditions",{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});await send("Page.reload",{});await sleep(800);const offline=await evaluate(`!!window.ArrowFoundry&&!document.getElementById('menuScreen').classList.contains('hidden')`);check("offline reload boots",offline===true);check("no runtime exceptions",errors.length===0,errors.slice(0,2).join(" | "));
}catch(e){failures.push("smoke exception — "+e.message);if(errors.length)failures.push("runtime — "+errors.slice(0,3).join(" | "));}finally{try{browser.close();}catch{}}
for(const f of failures)console.error("FAIL "+f);console.log(`arrow-foundry smoke: ${passed} passed, ${failures.length} failed`);process.exit(failures.length?1:0);
