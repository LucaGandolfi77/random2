#!/usr/bin/env node
/* Mini-regression per Mini Tower: simula un DOM minimo e verifica
   le azioni chiave di gioco (assegnazione lavori, licenziamento,
   sfratto, missioni, assunzione rapida, VIP). */
'use strict';
const fs = require('fs');
const path = require('path');

function makeEl() {
  return {
    style: {}, dataset: {}, children: [], scrollTop: 0, scrollHeight: 1000,
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { this.children.push(c); return c; },
    querySelector() { return makeEl(); },
    querySelectorAll() { return []; },
    remove() {}, focus() {}, scrollTo() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 10, height: 10 }; },
    get firstChild() { return this.children[0] || null; }
  };
}

const elCache = {};
const storage = {};
const T = Date.now() / 1000;

storage['mini-tower-save-v1'] = JSON.stringify({
  v: 2, coins: 500, bux: 10, sound: false, lastSeen: T,
  nextArrival: T + 9999, nextReq: T + 9999, nextVip: T + 9999,
  floors: [
    { id: 0, type: 'lobby' },
    { id: 1, type: 'res', name: 'App Sole', built: true, rent: 0, cost: 0 },
    { id: 2, type: 'com', shop: 'pizzeria', built: true, cash: 0, stock: { item: 0, qty: 0, phase: 'empty', ends: 0, nextAt: 0 }, cost: 40 }
  ],
  bits: [
    { id: 'b1', name: 'Leo', skin: '#f8d8b8', hair: '#2b2b2b', shirt: '#e74c3c', home: 1, work: null, dream: 'pizzeria', skill: 3, seed: 1 },
    { id: 'b2', name: 'Mia', skin: '#eec39a', hair: '#4a2f1d', shirt: '#3498db', home: 1, work: null, dream: 'gelateria', skill: 2, seed: 2 }
  ],
  pending: [], vips: [{ id: 'v1', type: 'agent', name: 'Agente Fitz', exp: T + 120 }], req: [], feed: [],
  missions: [{ id: 'm1', type: 'rides', target: 2, base: 0, coins: 100, bux: 1, done: true }],
  missionLevel: 0, elevLvl: 0, discount: 0,
  stats: { earned: 0, rides: 0, floorsBuilt: 0, popBux: 0, stocks: 0, arrivals: 0, vips: 0 }
});

global.window = global;
Object.defineProperty(global, 'navigator', { value: {}, configurable: true });
global.location = { protocol: 'http:', reload() {} };
global.addEventListener = () => {};
global.localStorage = {
  getItem: (k) => (k in storage ? storage[k] : null),
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};
global.document = {
  querySelector: (s) => (elCache[s] || (elCache[s] = makeEl())),
  getElementById: (s) => (elCache['#' + s] || (elCache['#' + s] = makeEl())),
  createElement: () => makeEl(),
  addEventListener() {},
  hidden: false
};

let src = fs.readFileSync(path.join(__dirname, '..', 'game.js'), 'utf8');
src += '\n;globalThis.__G = { S: () => S, handleModalAction };';
eval(src);
const G = globalThis.__G;

let fail = 0;
function check(name, cond) {
  console.log((cond ? '  ✓ ' : '  ✗ FAIL ') + name);
  if (!cond) fail = 1;
}
function act(dataset) {
  G.handleModalAction({ target: { closest: () => ({ dataset }) } });
}

console.log('— Regressioni Mini Tower —');
check('missioni inizializzate (3)', G.S().missions.length === 3);

act({ act: 'setjob', id: 'b1', f: '2' });
check('setjob assegna il lavoro con ID stringa (bug NaN corretto)', G.S().bits[0].work === 2);
check('BitBook registra l\u2019assunzione', (G.S().feed || []).some((e) => e.txt.includes('Leo')));

act({ act: 'fire', id: 'b1' });
check('fire licenzia con ID stringa', G.S().bits[0].work === null);

act({ act: 'setjob', id: 'b2', f: '2' });
act({ act: 'bit', id: 'b2' });
check('scheda abitante si apre con ID stringa', true);

act({ act: 'evict2', id: 'b2' });
check('sfratto rimuove l\u2019abitante', G.S().bits.length === 1);

act({ act: 'stock', id: '2', i: '0' });
check('rifornimento: costo 72 e fase restocking', G.S().coins === 428 && G.S().floors[2].stock.phase === 'restocking');
check('statistica rifornimenti', G.S().stats.stocks === 1);

act({ act: 'quickhire', id: '2' });
check('assunzione rapida: nuovo abitante al lavoro (2 🔷)', G.S().bits.length === 2 && G.S().bits[1].work === 2 && G.S().bux === 8);

act({ act: 'claim', id: 'm1' });
check('missione riscossa: +100 💰 +1 🔷', G.S().coins === 528 && G.S().bux === 9);
check('missione sostituita da una nuova', G.S().missions.length === 3 && !G.S().missions.some((m) => m.id === 'm1'));

act({ act: 'vipgo', id: 'v1', f: '2' });
check('VIP inviato: richiesta in coda con tipo', G.S().req.length === 1 && G.S().req[0].vipType === 'agent');

act({ act: 'elevup' });
check('ascensore potenziato a Lv 2 (3 🔷)', G.S().elevLvl === 1 && G.S().bux === 6);

process.exit(fail);
