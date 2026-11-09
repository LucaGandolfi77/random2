import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = process.env.POD_URL ?? 'http://127.0.0.1:5199/';
const OUT = 'smoke';
fs.mkdirSync(OUT, { recursive: true });

const errors = [];
const logs = [];

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.on('console', (message) => {
  const text = `${message.type()}: ${message.text()}`;
  logs.push(text);
  if (message.type() === 'error') errors.push(text);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
  console.log(`screenshot ${name}`);
};

const state = () => page.evaluate(() => window.__PHONE_OR_DIE_STORE__.getState());

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('.menu-screen');
await shot('01-menu-desktop');
console.log('menu loaded; title:', await page.locator('.menu-title').innerText());

// New game flow.
await page.getByRole('button', { name: /New Night/i }).click();
await page.waitForSelector('.difficulty-panel');
await shot('02-difficulty');
await page.locator('.difficulty-card', { hasText: 'Normal' }).click();
await page.waitForSelector('.intro-screen');
await page.locator('.intro-origin button', { hasText: 'Late dinner' }).click();
const introOrigin = await page.evaluate(() => window.__PHONE_OR_DIE_STORE__.getState().game?.origin);
console.log('intro origin:', introOrigin);
await shot('03-intro');
for (let i = 0; i < 3; i++) {
  await page.locator('.intro-next').click();
  await page.waitForTimeout(300);
}
await page.waitForSelector('.game-screen');
await page.waitForTimeout(1500);
let s = await state();
console.log('game screen:', s.screen, 'chapter', s.game.chapter, 'threat', s.game.threat.toFixed(1));

const canvas = await page.locator('.game-canvas canvas').count();
console.log('phaser canvas count:', canvas);
const stepBefore = await state();
await page.keyboard.down('ArrowDown');
await page.waitForTimeout(650);
await page.keyboard.up('ArrowDown');
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(300);
await page.keyboard.up('ArrowRight');
s = await state();
console.log(
  'step pressure:',
  stepBefore.game.threat.toFixed(2),
  '->',
  s.game.threat.toFixed(2),
  'at',
  `${s.game.player.x},${s.game.player.y}`
);
if (s.game.threat <= stepBefore.game.threat) throw new Error('Walking did not raise fear');
await shot('04-game-desktop');

// High-threat presentation.
await page.evaluate(() => {
  const store = window.__PHONE_OR_DIE_STORE__;
  const g = store.getState().game;
  store.setState({ game: { ...g, threat: 82, shieldSeconds: 0, shieldSteps: 0 } });
});
await page.waitForTimeout(1300);
const callNow = await page.locator('.call-now').count();
console.log('call-now warning:', callNow);
await shot('04c-hunted');
await page.evaluate(() => {
  const store = window.__PHONE_OR_DIE_STORE__;
  const g = store.getState().game;
  store.setState({ game: { ...g, threat: 10, shieldSeconds: 0, shieldSteps: 0, idleSeconds: 0 } });
});

// Interaction: flashlight in the parked car.
await page.evaluate(() => {
  const store = window.__PHONE_OR_DIE_STORE__;
  const g = store.getState().game;
  store.setState({ game: { ...g, player: { x: 9, y: 29, zone: 'work' } } });
  store.getState().interact('parked_car_flashlight');
});
await page.waitForTimeout(400);
s = await state();
console.log('flashlight owned:', s.game.flashlightOwned, 'clues:', s.game.clues.length);

// Pause modal.
await page.keyboard.press('Escape');
await page.waitForSelector('.modal-shell');
await page.waitForTimeout(300);
const pauseOpacity = Number(await page.evaluate(() => { const el = document.querySelector('.modal-shell'); return el ? getComputedStyle(el).opacity : '0'; }));
console.log('pause modal opacity:', pauseOpacity);
if (pauseOpacity < 0.5) throw new Error('Pause modal is rendered but invisible');
await shot('04b-pause');
await page.getByRole('button', { name: /Resume/i }).click();
await page.waitForTimeout(250);

// Phone.
await page.evaluate(() => window.__PHONE_OR_DIE_STORE__.getState().openPhone('home'));
await page.waitForSelector('.phone-overlay');
await page.waitForTimeout(450);
await shot('05-phone-home');
console.log('phone nav badges:', (await page.locator('.phone-nav-badge').allInnerTexts()).join(','));
await page.locator('.phone-nav button', { hasText: 'Contacts' }).click();
await page.waitForTimeout(250);
await shot('06-phone-contacts');
await page.locator('.contact-row').first().click();
await page.waitForTimeout(250);
await shot('07-phone-contact-detail');

// Start a call and force it to answer.
await page.evaluate(() => {
  const store = window.__PHONE_OR_DIE_STORE__;
  store.getState().startCall('sophie');
  const runtime = store.getState().activeCall;
  store.setState({ activeCall: { ...runtime, ringingStartedAt: Date.now() - 5000 } });
  store.getState().tick(1);
});
await page.waitForTimeout(400);
s = await state();
console.log('call answered:', s.activeCall?.answered, 'node:', s.activeCall?.nodeId);
await shot('08-call-connected');

// Walk the call to completion.
await page.evaluate(() => {
  const store = window.__PHONE_OR_DIE_STORE__;
  store.getState().chooseCallChoice('outside');
});
await page.waitForTimeout(250);
await page.evaluate(() => {
  const store = window.__PHONE_OR_DIE_STORE__;
  store.getState().chooseCallChoice('shape');
});
await page.waitForTimeout(250);
await page.evaluate(() => {
  const store = window.__PHONE_OR_DIE_STORE__;
  store.getState().chooseCallChoice('end');
});
await page.waitForTimeout(250);
await page.evaluate(() => {
  const store = window.__PHONE_OR_DIE_STORE__;
  const node = store.getState().activeCall;
  if (node) store.getState().advanceCall();
});
await page.waitForTimeout(400);
s = await state();
console.log('call finished:', s.activeCall === null, 'threat:', s.game.threat.toFixed(1), 'shield:', s.game.shieldSeconds.toFixed(1));

// History view.
await page.locator('.phone-nav button', { hasText: 'History' }).click();
await page.waitForTimeout(300);
const historyRows = await page.locator('.history-row').count();
console.log('history rows:', historyRows);
await shot('08b-phone-history');

// Trigger a random event by forcing the schedule, then resolve the first choice.
await page.evaluate(() => {
  const store = window.__PHONE_OR_DIE_STORE__;
  store.getState().closePhone();
  const g = store.getState().game;
  store.setState({ game: { ...g, nightMinute: 150, chapter: 2, nextEventAt: 0 } });
  store.getState().tick(1);
});
await page.waitForTimeout(400);
s = await state();
console.log('event pending:', s.pendingEventId);
if (s.pendingEventId) {
  await shot('09-event');
  await page.locator('.event-choice').first().click();
  await page.waitForTimeout(400);
  s = await state();
  console.log('event resolved:', s.pendingEventId === null, 'threat:', s.game.threat.toFixed(1));
  await page.evaluate(() => {
    const store = window.__PHONE_OR_DIE_STORE__;
    if (store.getState().activeCall) store.getState().hangUpCall();
    if (store.getState().phoneOpen) store.getState().closePhone();
  });
  await page.waitForTimeout(300);
}

// Messages view.
await page.evaluate(() => window.__PHONE_OR_DIE_STORE__.getState().openPhone('messages'));
await page.waitForSelector('.phone-overlay');
await page.waitForTimeout(450);
await shot('09b-phone-messages');
await page.evaluate(() => window.__PHONE_OR_DIE_STORE__.getState().closePhone());
await page.waitForTimeout(300);

// Build truth flags/clues, trigger the final choice.
await page.evaluate(() => {
  const store = window.__PHONE_OR_DIE_STORE__;
  const g = store.getState().game;
  store.setState({
    game: {
      ...g,
      nightMinute: 200,
      threat: 28,
      shieldSeconds: 20,
      finalChoice: null,
      finalPhase: false,
      nextEventAt: 999,
      player: { x: 37, y: 4, zone: 'home-lane' },
      clues: ['quiet', 'unknown_truth', 'knows_weakness', 'jessica_truth'],
      flags: {
        ...g.flags,
        unknown_contact_unlocked: true,
        unknown_spoke: true,
        unknown_truth: true,
        knows_weakness: true,
        jessica_truth: true,
        unknown_invitation: true
      }
    }
  });
  store.getState().interact('home_door');
});
await page.waitForTimeout(600);
s = await state();
console.log('final choice open:', s.finalOpen, 'time after early porch:', s.game.nightMinute.toFixed(1));
await shot('10-final-choice');

await page.evaluate(() => window.__PHONE_OR_DIE_STORE__.getState().chooseFinal('confront'));
await page.waitForTimeout(500);
s = await state();
console.log('final phase:', s.game.finalPhase, 'final choice:', s.game.finalChoice, 'time:', s.game.nightMinute.toFixed(1));

// Save + load.
await page.evaluate(async () => {
  const store = window.__PHONE_OR_DIE_STORE__;
  await store.getState().saveToSlot('slot1');
});
await page.waitForTimeout(300);
const saves = (await state()).saves;
console.log('saves:', saves.map((entry) => entry.slot).join(','));

// Restore the save through the real IndexedDB path.
const restored = await page.evaluate(async () => {
  const store = window.__PHONE_OR_DIE_STORE__;
  const g = store.getState().game;
  store.setState({ game: { ...g, threat: 77 } });
  await store.getState().loadFromSlot('slot1');
  return { threat: store.getState().game?.threat, screen: store.getState().screen };
});
console.log('save restore:', JSON.stringify(restored));

// Force secret ending.
await page.evaluate(() => window.__PHONE_OR_DIE_STORE__.getState().resolveDawnWithEnding('secret'));
await page.waitForSelector('.ending-screen');
await page.waitForTimeout(700);
s = await state();
console.log('ending:', s.game.endingId);
await shot('11-ending-desktop');

// Game over presentation.
await page.evaluate(() => {
  const store = window.__PHONE_OR_DIE_STORE__;
  store.setState({ screen: 'game' });
  store.getState().capture();
});
await page.waitForSelector('.gameover-screen');
await page.waitForTimeout(400);
await shot('11b-gameover-desktop');

// Mobile layout.
const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const m = await mobile.newPage();
m.on('console', (message) => {
  if (message.type() === 'error') errors.push(`mobile ${message.type()}: ${message.text()}`);
});
m.on('pageerror', (error) => errors.push(`mobile pageerror: ${error.message}`));
await m.goto(BASE, { waitUntil: 'networkidle' });
await m.waitForSelector('.menu-screen');
await m.screenshot({ path: `${OUT}/12-menu-mobile.png` });
await m.getByRole('button', { name: /New Night/i }).click();
await m.locator('.difficulty-card', { hasText: 'Story' }).click();
await m.waitForSelector('.intro-screen');
for (let i = 0; i < 3; i++) {
  await m.locator('.intro-next').click();
  await m.waitForTimeout(250);
}
await m.waitForSelector('.game-screen');
await m.waitForTimeout(1200);
await m.screenshot({ path: `${OUT}/13-game-mobile.png` });
const joystick = await m.locator('.joystick').count();
console.log('mobile joystick:', joystick);
await m.locator('.mobile-action', { hasText: 'Phone' }).click();
await m.waitForTimeout(400);
await m.screenshot({ path: `${OUT}/14-phone-mobile.png` });

// Mobile call layout.
await m.evaluate(() => {
  const store = window.__PHONE_OR_DIE_STORE__;
  store.getState().startCall('sophie');
  const runtime = store.getState().activeCall;
  store.setState({ activeCall: { ...runtime, ringingStartedAt: Date.now() - 5000 } });
  const original = Math.random;
  Math.random = () => 0;
  store.getState().tick(1);
  Math.random = original;
});
await m.waitForTimeout(500);
await m.screenshot({ path: `${OUT}/14b-call-mobile.png` });
await m.evaluate(() => {
  const store = window.__PHONE_OR_DIE_STORE__;
  store.getState().hangUpCall();
  store.getState().closePhone();
});
await m.waitForTimeout(700);

// Joystick touch movement.
const joystickBox = await m.locator('.joystick').boundingBox();
const beforeMove = (await m.evaluate(() => window.__PHONE_OR_DIE_STORE__.getState().game.player));
if (joystickBox) {
  const cx = joystickBox.x + joystickBox.width / 2;
  const cy = joystickBox.y + joystickBox.height / 2;
  await m.mouse.move(cx, cy);
  await m.mouse.down();
  await m.mouse.move(cx, cy + 38, { steps: 4 });
  await m.waitForTimeout(900);
  await m.mouse.up();
}
await m.waitForTimeout(300);
const afterMove = (await m.evaluate(() => window.__PHONE_OR_DIE_STORE__.getState().game.player));
console.log('joystick moved:', JSON.stringify(beforeMove), '->', JSON.stringify(afterMove));

// Final choice on mobile.
await m.evaluate(() => {
  const store = window.__PHONE_OR_DIE_STORE__;
  const g = store.getState().game;
  store.setState({
    game: {
      ...g,
      nightMinute: 200,
      threat: 24,
      finalChoice: null,
      finalPhase: false,
      nextEventAt: 999,
      player: { x: 37, y: 4, zone: 'home-lane' },
      clues: ['a', 'b', 'c', 'd', 'e'],
      flags: { ...g.flags, unknown_contact_unlocked: true, unknown_spoke: true, jessica_truth: true, unknown_invitation: true }
    }
  });
  store.getState().interact('home_door');
});
await m.waitForTimeout(600);
await m.screenshot({ path: `${OUT}/14c-final-mobile.png` });

// Report.
console.log('\nERRORS:', errors.length);
for (const error of errors) console.log(error);
console.log('\nWARNINGS:', logs.filter((entry) => entry.startsWith('warning')).slice(0, 10).join('\n'));

await browser.close();
if (errors.length) process.exitCode = 1;
