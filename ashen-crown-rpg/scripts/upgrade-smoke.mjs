import { chromium } from 'playwright-core';
import fs from 'node:fs';
const out='smoke'; fs.mkdirSync(out,{recursive:true});
const appearance={seed:11,skin:'#c69b79',hair:'#3a2820',hairStyle:2,eyes:'#6f8a6a',marking:'none',accent:'#b08b51',outfit:'#2f2b2a'};
const draft={name:'Aren Voss',ancestry:'erdan',classId:'warrior',background:'soldier',attributes:{str:15,dex:12,con:14,int:8,wis:10,cha:13},appearance,difficulty:'balanced'};
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
await page.goto(process.env.ASHEN_URL ?? 'http://localhost:5173',{waitUntil:'networkidle'});
await page.waitForFunction(()=>Boolean(window.__ASHEN_STORE__));
await page.evaluate(v=>{window.__ASHEN_STORE__.getState().newGame(v);window.__ASHEN_STORE__.getState().skipIntro();},draft);
await page.waitForSelector('.game-screen'); await page.waitForTimeout(1500);
await page.evaluate(()=>{
  const s=window.__ASHEN_STORE__; const g=s.getState().game; const p=g.characters[g.playerId];
  s.setState({game:{...g,characters:{...g.characters,[g.playerId]:{...p,level:3,xp:500}}}});
  s.getState().openModal('character','player');
});
await page.waitForTimeout(500);
await page.screenshot({path:`${out}/70-character-subclass.png`});
await page.getByRole('button',{name:/Choose a specialization/i}).click();
await page.waitForSelector('.subclass-layout');
await page.waitForTimeout(400);
await page.screenshot({path:`${out}/71-subclass-modal.png`});
await page.locator('.subclass-card .btn-primary').first().click();
await page.waitForTimeout(600);
console.log('subclass', await page.evaluate(()=>{
  const s=window.__ASHEN_STORE__.getState(); const g=s.game; return {subclass:g.characters[g.playerId].subclass, modal:s.modal, abilities:g.characters[g.playerId].abilities};
}));
await page.evaluate(()=>window.__ASHEN_STORE__.getState().openModal('character','player'));
await page.waitForTimeout(400);
await page.screenshot({path:`${out}/72-character-with-subclass.png`});
await page.evaluate(()=>{window.__ASHEN_STORE__.getState().closeModal();window.__ASHEN_STORE__.getState().startCombat('enc_bastion_raiders');});
await page.waitForSelector('.combat-toolbar'); await page.waitForTimeout(1600);
await page.screenshot({path:`${out}/73-combat-actions.png`});
const apBefore=await page.evaluate(()=>{const c=window.__ASHEN_STORE__.getState().combat; const u=c.order[c.turnIndex]; return c.units.find(x=>x.id===u).ap;});
await page.locator('.combat-action-button').filter({hasText:'Dash'}).click();
await page.waitForTimeout(400);
const apAfter=await page.evaluate(()=>{const c=window.__ASHEN_STORE__.getState().combat; const u=c.order[c.turnIndex]; return c.units.find(x=>x.id===u).ap;});
console.log('dash AP',apBefore,'->',apAfter);
await page.locator('.combat-action-button').filter({hasText:'Shove'}).click();
await page.waitForTimeout(300);
console.log('selected action', await page.evaluate(()=>window.__ASHEN_STORE__.getState().combat.selectedAction));
await page.screenshot({path:`${out}/74-shove-selected.png`});

// Settings persistence across reload.
await page.evaluate(()=>window.__ASHEN_STORE__.getState().updateSettings({musicVolume:0.33}));
await page.reload({waitUntil:'networkidle'});
await page.waitForFunction(()=>Boolean(window.__ASHEN_STORE__));
console.log('persisted music', await page.evaluate(()=>window.__ASHEN_STORE__.getState().settings.musicVolume));

// Mobile subclass and combat action layout.
const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
mobile.on('pageerror',e=>errors.push(e.message));
await mobile.goto(process.env.ASHEN_URL ?? 'http://localhost:5173',{waitUntil:'networkidle'});
await mobile.waitForFunction(()=>Boolean(window.__ASHEN_STORE__));
await mobile.evaluate(v=>{window.__ASHEN_STORE__.getState().newGame(v);window.__ASHEN_STORE__.getState().skipIntro();},draft);
await mobile.waitForSelector('.game-screen'); await mobile.waitForTimeout(1200);
await mobile.evaluate(()=>{const s=window.__ASHEN_STORE__; const g=s.getState().game; const p=g.characters[g.playerId]; s.setState({game:{...g,characters:{...g.characters,[g.playerId]:{...p,level:3,xp:500}}}}); s.getState().openModal('subclass','player');});
await mobile.waitForTimeout(500);
await mobile.screenshot({path:`${out}/75-mobile-subclass.png`});
await mobile.evaluate(()=>{window.__ASHEN_STORE__.getState().closeModal();window.__ASHEN_STORE__.getState().startCombat('enc_bastion_raiders');});
await mobile.waitForSelector('.combat-toolbar'); await mobile.waitForTimeout(900);
await mobile.evaluate(()=>{
  const s=window.__ASHEN_STORE__; const c=s.getState().combat;
  const party=c.units.find(u=>u.side==='party' && !u.downed);
  if(party) s.setState({combat:{...c,turnIndex:c.order.indexOf(party.id),waitingForAi:false,selectedAction:null,selectedAbility:null}});
});
await mobile.waitForTimeout(900);
await mobile.screenshot({path:`${out}/76-mobile-combat-actions.png`});
console.log('errors',errors);
await browser.close();
