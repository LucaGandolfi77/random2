import { chromium } from 'playwright-core';
import fs from 'node:fs';

const out = 'smoke';
fs.mkdirSync(out, { recursive: true });
const appearance = {
  seed: 11,
  skin: '#c69b79',
  hair: '#3a2820',
  hairStyle: 2,
  eyes: '#6f8a6a',
  marking: 'none',
  accent: '#b08b51',
  outfit: '#2f2b2a'
};
const draft = {
  name: 'Aren Voss',
  ancestry: 'erdan',
  classId: 'warrior',
  background: 'soldier',
  attributes: { str: 15, dex: 12, con: 14, int: 8, wis: 10, cha: 13 },
  appearance,
  difficulty: 'balanced'
};

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox']
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text()}`);
});
page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

await page.goto(process.env.ASHEN_URL ?? 'http://localhost:5173', { waitUntil: 'networkidle' });
await page.waitForFunction(() => Boolean(window.__ASHEN_STORE__), { timeout: 15000 });
await page.evaluate((value) => {
  window.__ASHEN_STORE__.getState().newGame(value);
  window.__ASHEN_STORE__.getState().skipIntro();
}, draft);
await page.waitForSelector('.game-screen');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${out}/20-dev-game.png` });

// Save / mutate / load round trip.
await page.evaluate(async () => {
  await window.__ASHEN_STORE__.getState().saveToSlot('slot1');
});
await page.waitForTimeout(400);
const saveState = await page.evaluate(() => ({
  saves: window.__ASHEN_STORE__.getState().saves.map((save) => save.slot),
  hp: window.__ASHEN_STORE__.getState().game.characters.player.hp
}));
console.log('saves after write', saveState);
await page.evaluate(() => {
  const state = window.__ASHEN_STORE__.getState();
  window.__ASHEN_STORE__.setState({
    game: {
      ...state.game,
      characters: { ...state.game.characters, player: { ...state.game.characters.player, hp: 1 } }
    }
  });
});
await page.evaluate(async () => {
  await window.__ASHEN_STORE__.getState().loadFromSlot('slot1');
});
await page.waitForTimeout(700);
const loaded = await page.evaluate(() => ({
  hp: window.__ASHEN_STORE__.getState().game.characters.player.hp,
  screen: window.__ASHEN_STORE__.getState().screen
}));
console.log('loaded', loaded);

// Open common screens and capture them.
for (const [modal, file] of [
  ['journal', '21-journal.png'],
  ['party', '22-party.png'],
  ['character', '23-character.png'],
  ['map', '24-map.png']
]) {
  await page.evaluate((kind) => window.__ASHEN_STORE__.getState().openModal(kind), modal);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${file}` });
  await page.evaluate(() => window.__ASHEN_STORE__.getState().closeModal());
  await page.waitForTimeout(200);
}

// Shop and purchase.
await page.evaluate(() => window.__ASHEN_STORE__.getState().openShop('bree'));
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/25-shop.png` });
const purchase = await page.evaluate(() => {
  const before = window.__ASHEN_STORE__.getState().game.inventory.find((entry) => entry.itemId === 'healing_potion')?.quantity ?? 0;
  window.__ASHEN_STORE__.getState().buyItem('healing_potion');
  const after = window.__ASHEN_STORE__.getState().game.inventory.find((entry) => entry.itemId === 'healing_potion')?.quantity ?? 0;
  window.__ASHEN_STORE__.getState().closeShop();
  return { before, after };
});
console.log('purchase', purchase);

// Combat victory flow.
const beforeCombat = await page.evaluate(() => {
  const game = window.__ASHEN_STORE__.getState().game;
  window.__ASHEN_STORE__.getState().startCombat('enc_bastion_raiders');
  return {
    xp: game.characters[game.playerId].xp,
    gold: game.characters[game.playerId].gold
  };
});
await page.waitForSelector('.combat-toolbar', { timeout: 10000 });
await page.waitForTimeout(1400);
await page.screenshot({ path: `${out}/26-combat-scaled.png` });
await page.evaluate(() => {
  const store = window.__ASHEN_STORE__;
  const combat = store.getState().combat;
  store.setState({
    combat: {
      ...combat,
      units: combat.units.map((unit) =>
        unit.side === 'enemy' ? { ...unit, hp: 0, downed: true } : unit
      )
    }
  });
  store.getState().combatEndTurn();
});
await page.waitForSelector('.combat-result', { timeout: 10000 });
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/27-victory.png` });
const victoryText = await page.locator('.combat-result').innerText();
const afterCombat = await page.evaluate(() => {
  const game = window.__ASHEN_STORE__.getState().game;
  return {
    xp: game.characters[game.playerId].xp,
    gold: game.characters[game.playerId].gold,
    defeated: game.world.defeated,
    phase: window.__ASHEN_STORE__.getState().combat?.phase
  };
});
console.log('victory text', victoryText.slice(0, 160).replace(/\n/g, ' | '));
console.log('combat rewards', { beforeCombat, afterCombat });
await page.getByRole('button', { name: /Continue the Chronicle/i }).click();
await page.waitForTimeout(1200);
console.log('after close combat', await page.evaluate(() => ({
  combat: window.__ASHEN_STORE__.getState().combat,
  dialog: window.__ASHEN_STORE__.getState().dialogue
})));

// Defeat flow and autosave retry.
await page.evaluate(() => {
  const store = window.__ASHEN_STORE__;
  store.getState().startCombat('enc_bastion_raiders');
});
await page.waitForSelector('.combat-toolbar', { timeout: 10000 });
await page.waitForTimeout(1000);
await page.evaluate(() => {
  const store = window.__ASHEN_STORE__;
  const combat = store.getState().combat;
  store.setState({
    combat: {
      ...combat,
      units: combat.units.map((unit) =>
        unit.side === 'party' ? { ...unit, hp: 0, downed: true } : unit
      )
    }
  });
  store.getState().combatEndTurn();
});
await page.waitForSelector('.combat-result', { timeout: 10000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/28-defeat.png` });
const defeatText = await page.locator('.combat-result').innerText();
console.log('defeat text', defeatText.slice(0, 100).replace(/\n/g, ' | '));
await page.getByRole('button', { name: /Return to the Last Autosave/i }).click();
await page.waitForTimeout(1800);
console.log('after retry', await page.evaluate(() => ({
  combat: window.__ASHEN_STORE__.getState().combat,
  screen: window.__ASHEN_STORE__.getState().screen,
  hp: window.__ASHEN_STORE__.getState().game.characters.player.hp
})));

// Endings.
await page.evaluate(() => window.__ASHEN_STORE__.getState().setEnding('unwritten'));
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/29-ending.png`, fullPage: false });
console.log('ending heading', await page.locator('.ending-title').innerText());

console.log('errors', errors);
await browser.close();
