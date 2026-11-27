/* Traffic Tessera — dependency-free browser smoke test. */
import { launch, sleep } from "../tools/cdp.mjs";

const base = (process.argv[2] || "http://localhost:8099/traffic-tessera-pwa/").replace(/\/$/, "") + "/";
const browser = await launch();
if (!browser) {
  console.log("traffic-tessera smoke: skipped (no Chromium)");
  process.exit(0);
}
const { cdp, sessionId } = browser;
const send = (method, params = {}) => cdp.send(method, params, sessionId);
const evaluate = async expression => {
  const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
};
const failures = [];
let passed = 0;
const errors = [];
const check = (name, ok, detail) => { if (ok) passed++; else failures.push(name + (detail ? " — " + detail : "")); };
cdp.on("Runtime.exceptionThrown", event => errors.push(JSON.stringify(event.exceptionDetails)));

try {
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send("Page.navigate", { url: base + "index.html" });
  let booted = false;
  for (let i = 0; i < 40; i++) {
    booted = await evaluate("!!window.TrafficTessera");
    if (booted) break;
    await sleep(100);
  }
  const boot = await evaluate(`({app:!!window.TrafficTessera,menu:!document.getElementById('menuScreen').classList.contains('hidden'),manifest:!!document.querySelector('link[rel="manifest"]')})`);
  check("app booted", boot.app);
  check("menu visible", boot.menu);
  check("manifest linked", boot.manifest);

  const started = await evaluate(`(()=>{window.TrafficTessera.startLevel(window.TrafficTessera.makeLevel(0,0));return{screen:window.TrafficTessera.state.screen,vehicles:window.TrafficTessera.game.state.vehicles.length};})()`);
  check("game screen active", started.screen === "game");
  check("vehicles created", started.vehicles === 6);
  await sleep(200);

  const drag = await evaluate(`(async()=>{const {legalMoves}=await import('./src/rules.js');const app=window.TrafficTessera.state;const renderer=app.renderer;const game=app.game;const level=app.currentLevel;const cell=renderer.layout.board/game.state.size;const rect=document.getElementById('gameCanvas').getBoundingClientRect();const move=legalMoves(game.state.vehicles,level).find(item=>item.type==='move');if(!move)return null;const vehicle=game.state.vehicles.find(item=>item.id===move.id);return{x:rect.left+renderer.layout.x+(vehicle.x+.5)*cell,y:rect.top+renderer.layout.y+(vehicle.y+.5)*cell,tx:rect.left+renderer.layout.x+(move.x+.5)*cell,ty:rect.top+renderer.layout.y+(move.y+.5)*cell,id:vehicle.id};})()`);
  if (drag) {
    await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: drag.x, y: drag.y }] });
    await sleep(30);
    await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: drag.tx, y: drag.ty }] });
    await sleep(30);
    await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await sleep(80);
  }
  const dragged = await evaluate(`window.TrafficTessera.game.state.moves===1`);
  check("touch drag moves a vehicle", dragged === true);
  await evaluate(`window.TrafficTessera.startLevel(window.TrafficTessera.makeLevel(0,0))`);
  await sleep(120);

  const hinted = await evaluate(`(()=>{const move=window.TrafficTessera.game.hint();if(!move)return{ok:false};const result=move.type==='exit'?window.TrafficTessera.game.exitVehicle(move.id):window.TrafficTessera.game.moveVehicle(move.id,move.x,move.y);return{ok:result.ok,moves:window.TrafficTessera.game.state.moves};})()`);
  check("hinted action works", hinted.ok && hinted.moves === 1, JSON.stringify(hinted));
  await sleep(80);
  const undone = await evaluate(`(()=>{document.getElementById('undoButton').click();return window.TrafficTessera.game.state.moves===0&&window.TrafficTessera.game.state.undosLeft===4;})()`);
  check("undo works", undone === true);
  await sleep(80);

  const towed = await evaluate(`(()=>{const game=window.TrafficTessera.game;const vehicle=game.state.vehicles.find(v=>v.status!=='exited');if(!vehicle)return false;game.select(vehicle.id);document.getElementById('towButton').click();return game.state.towsLeft===1;})()`);
  check("tow booster works", towed === true);
  const shuffled = await evaluate(`(()=>{document.getElementById('shuffleButton').click();return window.TrafficTessera.game.state.shufflesLeft===0;})()`);
  check("shuffle works", shuffled === true);
  const painted = await evaluate(`document.getElementById('gameCanvas').toDataURL().length>1000`);
  check("canvas painted", painted === true);

  const paused = await evaluate(`(()=>{document.getElementById('pauseButton').click();return window.TrafficTessera.state.paused&&!document.getElementById('pauseDialog').classList.contains('hidden');})()`);
  check("pause dialog works", paused === true);
  await evaluate(`document.getElementById('resumeButton').click();window.TrafficTessera.returnToMenu();document.getElementById('districtsButton').click()`);
  const districts = await evaluate(`({tabs:document.querySelectorAll('#areaTabs button').length,levels:document.getElementById('levelGrid').children.length})`);
  check("ten districts listed", districts.tabs === 10);
  check("ten levels listed", districts.levels === 10);
  await evaluate(`document.querySelector('[data-close="districtsDialog"]').click()`);

  const mechanics = await evaluate(`(async()=>{const level=window.TrafficTessera.makeLevel(3,0);const {VEHICLE_COLORS}=await import('./src/config.js');return{oneWay:level.terminals.some(t=>t.oneWay),dock:level.terminals.some(t=>t.requiresDock),reposition:level.solution.some(m=>m.type==='move'),symbols:new Set(VEHICLE_COLORS.map(c=>c.symbol)).size};})()`);
  check("one-way lanes present", mechanics.oneWay === true);
  check("precision docks present", mechanics.dock === true);
  check("advanced solution repositions", mechanics.reposition === true);
  check("colour symbols are distinct", mechanics.symbols === 6);

  const solved = await evaluate(`(()=>{const level=window.TrafficTessera.makeLevel(0,0);window.TrafficTessera.startLevel(level);const game=window.TrafficTessera.game;for(const move of level.solution){const result=move.type==='exit'?game.exitVehicle(move.id):game.moveVehicle(move.id,move.x,move.y);if(!result.ok)return false;}return game.state.status==='won';})()`);
  check("stored solution wins", solved === true);
  await sleep(150);
  const resultOpen = await evaluate(`!document.getElementById('resultDialog').classList.contains('hidden')`);
  check("result dialog opens", resultOpen === true);

  const worker = await evaluate(`navigator.serviceWorker.ready.then(()=>true).catch(()=>false)`);
  check("service worker active", worker === true);
  let controlled = false;
  for (let i = 0; i < 30; i++) {
    controlled = await evaluate(`!!navigator.serviceWorker?.controller`);
    if (controlled) break;
    await sleep(100);
  }
  check("service worker controls page", controlled === true);
  await send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await send("Page.reload", {});
  await sleep(800);
  const offline = await evaluate(`!!window.TrafficTessera&&!document.getElementById('menuScreen').classList.contains('hidden')`);
  check("offline reload boots", offline === true);
  check("no runtime exceptions", errors.length === 0, errors.slice(0, 2).join(" | "));
} catch (error) {
  failures.push("smoke exception — " + error.message);
  if (errors.length) failures.push("runtime — " + errors.slice(0, 3).join(" | "));
} finally {
  try { browser.close(); } catch {}
}
for (const failure of failures) console.error("FAIL " + failure);
console.log(`traffic-tessera smoke: ${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
