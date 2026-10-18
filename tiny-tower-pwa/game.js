/* ============================================================
   Mini Tower — gioco PWA ispirato a Tiny Tower
   Vanilla JS, nessuna dipendenza. Stato salvato in localStorage.
   ============================================================ */
'use strict';

/* ----------------------------- Utilità ----------------------------- */
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => Date.now() / 1000;
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>').replace(/"/g, '"');
const fmt = (n) => {
  n = Math.floor(n);
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1).replace('.0', '') + 'K';
  return String(n);
};
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/* ----------------------------- Costanti ----------------------------- */
const SAVE_KEY = 'mini-tower-save-v1';
const OFFLINE_CAP = 8 * 3600;      // massimo guadagno offline: 8 ore
const MAX_FLOORS = 40;
const RES_CAP = 5;                 // abitanti per appartamento
const WORK_SLOTS = 3;              // dipendenti per negozio
const FLOOR_H = 76, LOBBY_H = 100, GROUND_H = 26;
const ELEV_SPEED = 140;            // px/s

/* ----------------------------- Dati ----------------------------- */
const NOMI = ['Leo','Mia','Marco','Giulia','Luca','Sofia','Franco','Anna','Carlo','Elena','Nico','Vera','Dario','Paola','Enzo','Rita','Guido','Lina','Bruno','Dina','Fausto','Nora','Ivan','Greta','Otto','Mila','Sandro','Pia','Tullio','Emma','Remo','Adele','Cino','Tea','Nello','Iris','Zoe','Pippo','Lucia','Fulvio','Silvio','Rosa','Gino','Marta','Piero','Iva','Dino','Nino','Sera','Bice'];
const SKIN = ['#f8d8b8','#eec39a','#d19a66','#9c6b43','#7a4f31'];
const HAIR = ['#2b2b2b','#4a2f1d','#7a4a21','#b5812f','#d8c17a','#8a3b2a'];
const SHIRT = ['#e74c3c','#3498db','#9b59b6','#1abc9c','#f39c12','#e91e63','#2ecc71','#34495e','#16a085','#c0392b','#8e44ad','#27ae60'];

const CATS = {
  cibo:         { name: 'Cibo',         icon: '🍽️', shops: ['pizzeria','caffetteria','paninoteca','gelateria'] },
  vendita:      { name: 'Vendita',      icon: '🛍️', shops: ['abiti','elettronica','giocattoli','fiorista'] },
  servizi:      { name: 'Servizi',      icon: '🛠️', shops: ['lavanderia','barbiere','palestra','clinica'] },
  divertimento: { name: 'Divertimento', icon: '🎉', shops: ['arcade','cinema','bowling','karaoke'] },
  creativita:   { name: 'Creatività',   icon: '🎨', shops: ['foto','galleria','musica'] },
  uffici:       { name: 'Uffici',       icon: '💼', shops: ['legale','software','adv'] }
};

/* p: prezzo unitario · q: pezzi per rifornimento · s: secondi di vendita per pezzo · r: secondi di rifornimento */
const SHOPS = {
  pizzeria:    { name: 'Pizzeria Da Gino', icon: '🍕', cat: 'cibo', d: 'Pizza napoletana verace', items: [
    { e: '🍕', n: 'Margherita', p: 3, q: 24, s: 5, r: 14 }, { e: '🌶️', n: 'Diavola', p: 4, q: 20, s: 6, r: 16 }, { e: '🥟', n: 'Calzone', p: 5, q: 16, s: 7, r: 18 }] },
  caffetteria: { name: 'Caffè Central', icon: '☕', cat: 'cibo', d: 'Una pausa col caffè', items: [
    { e: '☕', n: 'Espresso', p: 2, q: 30, s: 4, r: 12 }, { e: '🥛', n: 'Cappuccino', p: 3, q: 24, s: 5, r: 14 }, { e: '🍰', n: 'Torta di casa', p: 5, q: 14, s: 8, r: 18 }] },
  paninoteca:  { name: 'Paninoteca Maxi', icon: '🍔', cat: 'cibo', d: 'Panini giganti', items: [
    { e: '🍔', n: 'Hamburger', p: 3, q: 26, s: 5, r: 14 }, { e: '🌭', n: 'Hot dog', p: 3, q: 24, s: 5, r: 15 }, { e: '🥪', n: 'Panino speciale', p: 6, q: 16, s: 8, r: 18 }] },
  gelateria:   { name: 'Gelateria Polar', icon: '🍦', cat: 'cibo', d: 'Gelato artigianale', items: [
    { e: '🍦', n: 'Cono', p: 2, q: 30, s: 4, r: 12 }, { e: '🍨', n: 'Coppetta', p: 3, q: 24, s: 5, r: 14 }, { e: '🍌', n: 'Banana split', p: 7, q: 12, s: 9, r: 20 }] },
  abiti:       { name: 'Abiti & Co.', icon: '👕', cat: 'vendita', d: 'Sempre all\u2019ultimo grido', items: [
    { e: '👕', n: 'T-shirt', p: 5, q: 20, s: 7, r: 16 }, { e: '👖', n: 'Jeans', p: 9, q: 12, s: 10, r: 20 }, { e: '🧥', n: 'Cappotto', p: 14, q: 8, s: 14, r: 24 }] },
  elettronica: { name: 'ElettroMega', icon: '📱', cat: 'vendita', d: 'Tech per tutti', items: [
    { e: '🔌', n: 'Cavi e cavi', p: 6, q: 18, s: 8, r: 16 }, { e: '🎧', n: 'Cuffie', p: 12, q: 10, s: 12, r: 22 }, { e: '📱', n: 'Tablet', p: 20, q: 6, s: 18, r: 28 }] },
  giocattoli:  { name: 'Giocattoli Joy', icon: '🧸', cat: 'vendita', d: 'Sorprese per grandi e piccini', items: [
    { e: '🧸', n: 'Peluche', p: 5, q: 20, s: 7, r: 16 }, { e: '🧱', n: 'Costruzioni', p: 10, q: 10, s: 11, r: 20 }, { e: '🛸', n: 'Drone', p: 18, q: 8, s: 15, r: 26 }] },
  fiorista:    { name: 'Fiorista La Rosa', icon: '💐', cat: 'vendita', d: 'Freschi ogni giorno', items: [
    { e: '🌷', n: 'Mazzo misto', p: 4, q: 20, s: 6, r: 14 }, { e: '🪴', n: 'Pianta', p: 5, q: 16, s: 7, r: 16 }, { e: '💐', n: 'Bouquet festa', p: 8, q: 12, s: 10, r: 20 }] },
  lavanderia:  { name: 'Lavanderia Splend', icon: '🧺', cat: 'servizi', d: 'Bucchi profumati', items: [
    { e: '🧺', n: 'Lavaggio', p: 3, q: 24, s: 6, r: 16 }, { e: '👔', n: 'Stiratura', p: 4, q: 20, s: 7, r: 16 }, { e: '🧥', n: 'Pulizia a secco', p: 6, q: 14, s: 9, r: 20 }] },
  barbiere:    { name: 'Barbiere di Torre', icon: '💈', cat: 'servizi', d: 'Tagli di tendenza', items: [
    { e: '💇', n: 'Taglio', p: 6, q: 18, s: 8, r: 16 }, { e: '🪒', n: 'Barba', p: 5, q: 18, s: 8, r: 16 }, { e: '💈', n: 'Taglio & barba', p: 10, q: 10, s: 12, r: 22 }] },
  palestra:    { name: 'Palestra Pump', icon: '🏋️', cat: 'servizi', d: 'Mettersi in forma', items: [
    { e: '🎟️', n: 'Ingresso', p: 6, q: 18, s: 8, r: 16 }, { e: '🧘', n: 'Corso', p: 10, q: 12, s: 11, r: 20 }, { e: '💪', n: 'Personal', p: 16, q: 8, s: 14, r: 24 }] },
  clinica:     { name: 'Studio Medico', icon: '🩺', cat: 'servizi', d: 'Sempre al tuo servizio', items: [
    { e: '🩺', n: 'Visita', p: 8, q: 16, s: 9, r: 18 }, { e: '💉', n: 'Vaccino', p: 10, q: 12, s: 11, r: 20 }, { e: '📋', n: 'Check-up', p: 14, q: 10, s: 13, r: 24 }] },
  arcade:      { name: 'Arcade Pixel', icon: '🕹️', cat: 'divertimento', d: 'Pixel & divertimento', items: [
    { e: '🕹️', n: 'Partita', p: 3, q: 26, s: 5, r: 14 }, { e: '🏆', n: 'Torneo', p: 8, q: 12, s: 10, r: 20 }, { e: '🎁', n: 'Premio', p: 12, q: 10, s: 12, r: 22 }] },
  cinema:      { name: 'CineStella', icon: '🎬', cat: 'divertimento', d: 'Sul grande schermo', items: [
    { e: '🎟️', n: 'Biglietto', p: 7, q: 18, s: 8, r: 16 }, { e: '🍿', n: 'Popcorn', p: 4, q: 22, s: 6, r: 16 }, { e: '🌟', n: 'Première', p: 15, q: 8, s: 15, r: 26 }] },
  bowling:     { name: 'Bowling Strike', icon: '🎳', cat: 'divertimento', d: 'Strike garantito', items: [
    { e: '🎳', n: 'Partita', p: 6, q: 18, s: 8, r: 16 }, { e: '👟', n: 'Noleggio scarpe', p: 3, q: 22, s: 6, r: 16 }, { e: '🏆', n: 'Torneo', p: 14, q: 9, s: 14, r: 24 }] },
  karaoke:     { name: 'Karaoke King', icon: '🎤', cat: 'divertimento', d: 'Canta a squarciagola', items: [
    { e: '🎤', n: 'Serata', p: 8, q: 14, s: 9, r: 18 }, { e: '🎶', n: 'Duetto', p: 10, q: 12, s: 11, r: 20 }, { e: '🌟', n: 'Palco privato', p: 16, q: 8, s: 15, r: 26 }] },
  foto:        { name: 'Foto Flash', icon: '📷', cat: 'creativita', d: 'Momenti per sempre', items: [
    { e: '🖼️', n: 'Ritratto', p: 8, q: 16, s: 9, r: 18 }, { e: '📸', n: 'Servizio foto', p: 14, q: 10, s: 13, r: 24 }, { e: '💍', n: 'Matrimonio', p: 24, q: 6, s: 20, r: 30 }] },
  galleria:    { name: 'Galleria Colore', icon: '🎨', cat: 'creativita', d: 'Arte contemporanea', items: [
    { e: '🎟️', n: 'Biglietto', p: 7, q: 18, s: 8, r: 16 }, { e: '🖼️', n: 'Quadro', p: 18, q: 8, s: 15, r: 26 }, { e: '🏺', n: 'Mostra', p: 28, q: 5, s: 22, r: 32 }] },
  musica:      { name: 'Rock School', icon: '🎸', cat: 'creativita', d: 'Lezioni di rock', items: [
    { e: '🎸', n: 'Lezione', p: 8, q: 16, s: 9, r: 18 }, { e: '💿', n: 'Disco', p: 12, q: 10, s: 12, r: 22 }, { e: '🎤', n: 'Concerto', p: 22, q: 6, s: 18, r: 30 }] },
  legale:      { name: 'Studio Legale Rossi', icon: '⚖️', cat: 'uffici', d: 'Oggetti e cause', items: [
    { e: '📑', n: 'Consulenza', p: 10, q: 12, s: 11, r: 20 }, { e: '📝', n: 'Contratto', p: 16, q: 9, s: 14, r: 24 }, { e: '⚖️', n: 'Causa', p: 26, q: 6, s: 19, r: 30 }] },
  software:    { name: 'SoftWorks', icon: '💻', cat: 'uffici', d: 'Bug? Quali bug?', items: [
    { e: '📱', n: 'App', p: 14, q: 10, s: 13, r: 24 }, { e: '🔑', n: 'Licenze', p: 20, q: 7, s: 17, r: 28 }, { e: '🖥️', n: 'Consulenza', p: 30, q: 5, s: 22, r: 32 }] },
  adv:         { name: 'Spot-On Adv', icon: '📊', cat: 'uffici', d: 'Spot che funzionano', items: [
    { e: '📜', n: 'Locandina', p: 10, q: 12, s: 11, r: 20 }, { e: '📣', n: 'Campagna', p: 20, q: 7, s: 17, r: 28 }, { e: '🎵', n: 'Jingle', p: 28, q: 5, s: 21, r: 32 }] }
};

/* ----------------------------- Stato ----------------------------- */
let S = null;
let deferredPrompt = null;
let modalCtx = null;
let fmCache = '';

function makeBit(home) {
  return {
    id: uid(), name: pick(NOMI), skin: pick(SKIN), hair: pick(HAIR), shirt: pick(SHIRT),
    home: home == null ? null : home, work: null, dream: pick(Object.keys(SHOPS)),
    skill: randi(1, 5), seed: randi(0, 19)
  };
}

function defaultState() {
  const st = {
    v: 2, coins: 250, bux: 10, sound: true,
    lastSeen: now(),
    nextArrival: now() + rand(25, 50),
    nextReq: now() + rand(20, 40),
    nextVip: now() + rand(60, 100),
    floors: [{ id: 0, type: 'lobby' }],
    bits: [], pending: [], req: [], vips: [], feed: [],
    missions: [], missionLevel: 0,
    elevLvl: 0, discount: 0,
    stats: { earned: 0, rides: 0, floorsBuilt: 0, popBux: 0, stocks: 0, arrivals: 0, vips: 0 }
  };
  st.floors.push({ id: 1, type: 'res', name: 'Appartamenti Sole', built: true, rent: 0, cost: 0 });
  for (let i = 0; i < 3; i++) st.bits.push(makeBit(1));
  return st;
}

function save() {
  S.lastSeen = now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* storage pieno o privato */ }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || (s.v !== 1 && s.v !== 2) || !Array.isArray(s.floors)) return null;
    return migrate(s);
  } catch (e) { return null; }
}

/* Migrazione v1 → v2: VIP, missioni, upgrade ascensore, nuove statistiche */
function migrate(s) {
  if (s.v === 1) {
    s.v = 2;
    s.vips = s.vips || [];
    s.feed = s.feed || [];
    s.missions = s.missions || [];
    s.missionLevel = s.missionLevel || 0;
    s.elevLvl = s.elevLvl || 0;
    s.discount = s.discount || 0;
    s.nextVip = s.nextVip || now() + rand(30, 80);
    s.stats = s.stats || {};
    s.stats.stocks = s.stats.stocks || 0;
    s.stats.arrivals = s.stats.arrivals || 0;
    s.stats.vips = s.stats.vips || 0;
  }
  return s;
}

/* ----------------------------- Helper di gioco ----------------------------- */
const floorById = (id) => S.floors.find((f) => f.id === id);
const bitById = (id) => S.bits.find((b) => b.id === id);
const residentsOf = (f) => S.bits.filter((b) => b.home === f.id);
const workersOf = (f) => S.bits.filter((b) => b.work === f.id).slice(0, WORK_SLOTS);
function floorName(f) {
  if (f == null) return '—';
  if (typeof f === 'number') f = floorById(f);
  if (!f) return '—';
  return f.type === 'lobby' ? 'Lobby' : f.type === 'res' ? f.name : SHOPS[f.shop].name;
}
function floorIcon(f) {
  if (typeof f === 'number') f = floorById(f);
  if (!f) return '🏢';
  return f.type === 'lobby' ? '🏨' : f.type === 'res' ? '🏠' : SHOPS[f.shop].icon;
}
const resCapacity = () => S.floors.filter((f) => f.type === 'res' && f.built).length * RES_CAP;
const housedCount = () => S.bits.filter((b) => b.home != null).length;
const vacancy = () => resCapacity() - housedCount();
const floorCost = () => Math.round(40 * Math.pow(1.18, S.floors.length - 1));
const buildTime = () => clamp(8 + 3 * (S.floors.length - 1), 8, 60);
const incomeUnit = (it) => Math.round(it.p * 1.7);
function saleInterval(f) {
  const w = workersOf(f);
  const it = SHOPS[f.shop].items[f.stock.item];
  const stars = w.reduce((a, b) => a + b.skill, 0);
  const dream = w.some((b) => b.dream === f.shop);
  return it.s / (1 + 0.12 * w.length + 0.04 * stars + (dream ? 0.2 : 0));
}
function restockDur(f, idx) {
  return SHOPS[f.shop].items[idx].r / (1 + 0.2 * workersOf(f).length);
}
const floorBottomY = (i) => GROUND_H + (i === 0 ? 0 : LOBBY_H + (i - 1) * FLOOR_H);
const elevSpeed = () => 140 + 40 * (S.elevLvl || 0);

/* ----------------------------- Audio ----------------------------- */
let AC = null;
function beep(f, d, type, g, when) {
  if (!S.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const t = AC.currentTime + (when || 0);
    const o = AC.createOscillator(), ga = AC.createGain();
    o.type = type || 'square';
    o.frequency.value = f;
    ga.gain.setValueAtTime(g || 0.04, t);
    ga.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(ga); ga.connect(AC.destination);
    o.start(t); o.stop(t + d + 0.02);
  } catch (e) { /* audio non disponibile */ }
}
const sfx = {
  tap:   () => beep(520, 0.05, 'square', 0.03),
  pop:   () => beep(420, 0.06, 'triangle', 0.05),
  coin:  () => { beep(880, 0.06, 'square', 0.045); beep(1320, 0.09, 'square', 0.045, 0.06); },
  tip:   () => { beep(660, 0.05, 'triangle', 0.055); beep(880, 0.05, 'triangle', 0.055, 0.05); beep(1100, 0.08, 'triangle', 0.055, 0.1); },
  build: () => beep(140, 0.14, 'sawtooth', 0.05),
  ding:  () => beep(988, 0.09, 'triangle', 0.05),
  err:   () => beep(160, 0.12, 'sawtooth', 0.05)
};

/* ----------------------------- Rendering base ----------------------------- */
const floorEls = new Map();
const badgeCache = new Map();
let carEl = null;

function miniBitHTML(b, big) {
  return `<span class="bit${big ? ' big' : ''}" style="--sk:${b.skin};--sh:${b.shirt};--hr:${b.hair};animation-delay:${(b.seed % 20) / 10}s"><i class="hd"></i><i class="bd"></i><i class="lg"></i></span>`;
}
const starsHTML = (b) => `<span class="stars-ic">${'★'.repeat(b.skill)}${'☆'.repeat(5 - b.skill)}</span>`;

function renderTower() {
  const tw = $('#tower');
  tw.innerHTML = '';
  floorEls.clear();
  badgeCache.clear();
  tw.appendChild(el('div', 'ground'));
  for (const f of S.floors) {
    const d = el('div', 'floor ' + (f.type === 'lobby' ? 'lobby' : f.type) + (f.type === 'com' ? ' cat-' + SHOPS[f.shop].cat : ''));
    d.dataset.id = f.id;
    const signTxt = f.type === 'lobby' ? '🏨 Lobby' : (f.type === 'com' ? SHOPS[f.shop].icon + ' ' : '🏠 ') + esc(floorName(f));
    d.appendChild(el('div', 'sign', signTxt));
    const body = el('div', 'floor-body' + (!f.built && f.type !== 'lobby' ? ' unbuilt' : ''));
    if (f.type === 'lobby') {
      body.appendChild(el('div', 'door'));
      const w = el('div', 'workers');
      w.innerHTML = S.pending.map((p) => miniBitHTML(p.bit)).join('') + S.vips.map(() => vipBitHTML()).join('');
      body.appendChild(w);
    } else if (f.type === 'res') {
      body.appendChild(el('div', 'shop-emoji', '🏠'));
      const w = el('div', 'workers');
      w.innerHTML = residentsOf(f).filter((b) => !b.work).map((b) => miniBitHTML(b)).join('');
      body.appendChild(w);
    } else if (!f.built) {
      body.appendChild(el('div', 'buildbar', '<div class="bar"><i></i></div><div class="s">🚧 in costruzione…</div>'));
    } else {
      body.appendChild(el('div', 'shop-emoji', SHOPS[f.shop].icon));
      const w = el('div', 'workers');
      w.innerHTML = workersOf(f).map((b) => miniBitHTML(b)).join('');
      body.appendChild(w);
    }
    d.appendChild(body);
    d.appendChild(el('div', 'bubble-zone'));
    tw.appendChild(d);
    floorEls.set(f.id, { root: d, zone: d.querySelector('.bubble-zone') });
  }
}

function badgeHTML(f, t) {
  const parts = [];
  if (f.type !== 'lobby' && !f.built) {
    const s = Math.max(0, Math.ceil(f.buildEnds - t));
    parts.push(`<span class="bub build">🚧 ${s}s</span>`);
  }
  if (f.type === 'com' && f.built) {
    const st = f.stock;
    if (st.phase === 'restocking') {
      const s = Math.max(0, Math.ceil(st.ends - t));
      parts.push(`<span class="bub info">⏳ ${s}s</span>`);
    } else if (st.phase === 'selling') {
      parts.push(`<span class="bub info">🛍️ ${st.qty}</span>`);
    } else if (st.phase === 'empty') {
      parts.push(workersOf(f).length === 0
        ? '<span class="bub warn" title="Assumi un dipendente!">👤!</span>'
        : '<span class="bub info" title="Scaffali vuoti">📦</span>');
    }
    if (f.cash >= 1) parts.push(`<button class="bub cash" data-act="collect" data-id="${f.id}" title="Riscuoti">💰 ${fmt(f.cash)}</button>`);
  }
  if (f.type === 'res' && f.built && f.rent >= 1) {
    parts.push(`<button class="bub cash" data-act="rent" data-id="${f.id}" title="Riscuoti affitti">💰 ${fmt(f.rent)}</button>`);
  }
  if (f.type === 'lobby' && S.pending.length) {
    parts.push(`<button class="bub new" data-act="lobby" title="Nuovi arrivati!">🆕 ${S.pending.length}</button>`);
  }
  if (f.type === 'lobby' && S.vips.length) {
    parts.push(`<button class="bub vip" data-act="lobby" title="VIP in attesa!">⭐ ${S.vips.length}</button>`);
  }
  if (f.type === 'lobby') {
    let tot = 0;
    for (const x of S.floors) {
      if (x.type === 'com' && x.built) tot += Math.floor(x.cash || 0);
      if (x.type === 'res' && x.built) tot += Math.floor(x.rent || 0);
    }
    if (tot >= 10) parts.push(`<button class="bub cash" data-act="collectall" title="Riscuoti tutto">💰 ${fmt(tot)}</button>`);
  }
  for (const r of S.req) {
    if (r.from === f.id && elev.req !== r) {
      if (r.vipType) {
        parts.push(`<button class="bub vip" data-act="ride" data-id="${r.id}" title="VIP → ${esc(floorName(r.to))}">⭐ ${VIPS[r.vipType].icon}</button>`);
      } else {
        const b = bitById(r.bit);
        if (b) parts.push(`<button class="bub req" data-act="ride" data-id="${r.id}" title="${esc(b.name)} → ${esc(floorName(r.to))}">${miniBitHTML(b)}<span>🙋</span></button>`);
      }
    }
  }
  return parts.join('');
}

function refreshBadges() {
  const t = now();
  for (const f of S.floors) {
    const fe = floorEls.get(f.id);
    if (!fe) continue;
    if (!f.built && f.type !== 'lobby') {
      const bar = fe.root.querySelector('.bar i');
      if (bar) bar.style.width = (clamp(1 - (f.buildEnds - t) / f.buildDur, 0, 1) * 100).toFixed(1) + '%';
    }
    const html = badgeHTML(f, t);
    if (badgeCache.get(f.id) !== html) {
      badgeCache.set(f.id, html);
      fe.zone.innerHTML = html;
    }
  }
}

function updateTop() {
  $('#c-coins').textContent = fmt(S.coins);
  $('#c-bux').textContent = fmt(S.bux);
  $('#c-pop').textContent = S.bits.length + '/' + resCapacity();
  $('#c-flr').textContent = S.floors.length + '/' + MAX_FLOORS;
  $('#bb-cost').textContent = fmt(floorCost()) + ' 💰';
  $('#btn-bits').classList.toggle('alert', S.pending.length > 0);
  $('#btn-missions').classList.toggle('alert', S.missions.some((m) => m.done));
  const dp = $('#c-disc');
  if (S.discount > 0) {
    dp.style.display = '';
    dp.title = `🎁 Sconto ${Math.round(S.discount * 100)}% sul prossimo piano`;
  } else {
    dp.style.display = 'none';
  }
}

function updateSoundIcon() {
  $('#sndbtn').textContent = S.sound ? '🔊' : '🔇';
}

function toast(msg) {
  const root = $('#toast-root');
  while (root.children.length >= 2) root.firstChild.remove();
  const d = el('div', 'toast', msg);
  root.appendChild(d);
  setTimeout(() => {
    d.style.transition = 'opacity .3s';
    d.style.opacity = '0';
    setTimeout(() => d.remove(), 320);
  }, 2400);
}

function floatAtEl(elm, text) {
  const vp = $('#viewport');
  const vr = vp.getBoundingClientRect();
  const r = elm.getBoundingClientRect();
  const d = el('div', 'float', text);
  d.style.left = (r.left - vr.left + r.width / 2 - 24) + 'px';
  d.style.top = Math.max(4, r.top - vr.top - 8) + 'px';
  vp.appendChild(d);
  setTimeout(() => d.remove(), 1100);
}
function floatAtFloor(f, text) {
  const fe = floorEls.get(f.id);
  if (fe) floatAtEl(fe.root, text);
}

/* ----------------------------- Azioni di gioco ----------------------------- */
function startFloor(kind, shopId) {
  if (S.floors.length >= MAX_FLOORS) { toast('🏢 Torre al massimo!'); return; }
  const cost = Math.round(floorCost() * (1 - S.discount));
  if (S.coins < cost) { toast('Monete insufficienti!'); sfx.err(); return; }
  const usedDiscount = S.discount > 0;
  S.discount = 0;
  S.coins -= cost;
  const id = Math.max(0, ...S.floors.map((f) => f.id)) + 1;
  const dur = buildTime();
  let fl;
  if (kind === 'res') {
    const letter = String.fromCharCode(65 + S.floors.filter((f) => f.type === 'res').length);
    fl = { id, type: 'res', name: 'Appartamenti ' + letter, built: false, buildEnds: now() + dur, buildDur: dur, rent: 0, cost };
  } else {
    fl = { id, type: 'com', shop: shopId, built: false, buildEnds: now() + dur, buildDur: dur, cash: 0, stock: { item: 0, qty: 0, phase: 'empty', ends: 0, nextAt: 0 }, cost };
  }
  S.floors.push(fl);
  S.stats.floorsBuilt++;
  S.bux += 1;
  sfx.build();
  toast('🏗️ Nuovo piano in costruzione! +1 🔷');
  if (usedDiscount) toast('🎁 Sconto dell’Agente Immobiliare utilizzato!');
  feedMsg(`🏗️ Inizio lavori: ${floorName(fl)}`);
  closeModal();
  renderTower();
  updateTop();
  $('#viewport').scrollTo({ top: 0, behavior: 'smooth' });
}

function finishNow(f) {
  if (f.built) return;
  const secs = f.buildEnds - now();
  const cost = Math.max(1, Math.ceil(secs / 15));
  if (S.bux < cost) { toast('🔷 insufficienti!'); sfx.err(); return; }
  S.bux -= cost;
  f.built = true;
  sfx.build();
  toast('⚡ Costruzione completata!');
  feedMsg(`⚡ ${floorName(f)} completato all’istante!`);
  renderTower();
  updateTop();
  if (modalCtx && modalCtx.type === 'floor') openFloorModal(f.id);
}

function stockItem(f, idx) {
  const it = SHOPS[f.shop].items[idx];
  const cost = it.p * it.q;
  if (S.coins < cost) { toast('Monete insufficienti!'); sfx.err(); return; }
  S.coins -= cost;
  const dur = restockDur(f, idx);
  f.stock = { item: idx, qty: 0, phase: 'restocking', ends: now() + dur, dur, nextAt: 0 };
  S.stats.stocks++;
  sfx.tap();
  toast(`📦 Rifornimento: ${it.e} ${it.n}`);
  updateTop();
}

function collectCash(f) {
  const amt = Math.floor(f.cash);
  if (amt < 1) return;
  f.cash -= amt;
  S.coins += amt;
  S.stats.earned += amt;
  floatAtFloor(f, `+${fmt(amt)} 💰`);
  haptic(12);
  sfx.coin();
  updateTop();
}

function collectRent(f) {
  const amt = Math.floor(f.rent);
  if (amt < 1) return;
  f.rent -= amt;
  S.coins += amt;
  S.stats.earned += amt;
  floatAtFloor(f, `+${fmt(amt)} 💰`);
  haptic(12);
  sfx.coin();
  updateTop();
}

function collectAll() {
  let tot = 0;
  for (const f of S.floors) {
    if (f.type === 'com' && f.built && f.cash >= 1) { tot += Math.floor(f.cash); f.cash = 0; }
    if (f.type === 'res' && f.built && f.rent >= 1) { tot += Math.floor(f.rent); f.rent = 0; }
  }
  if (tot < 1) { toast('Niente da riscuotere!'); return; }
  S.coins += tot;
  S.stats.earned += tot;
  toast(`💰 Riscossi ${fmt(tot)} 💰`);
  sfx.coin();
  updateTop();
  closeModal();
}

function assignJob(bitId, floorId) {
  const b = bitById(bitId), f = floorById(floorId);
  if (!b || !f || f.type !== 'com' || !f.built) return;
  if (workersOf(f).length >= WORK_SLOTS) { toast('Posti esauriti!'); return; }
  b.work = f.id;
  if (b.dream === f.shop) {
    toast(`⭐ ${b.name} ha realizzato il suo sogno da ${SHOPS[f.shop].name}!`);
    sfx.tip();
    feedMsg(`⭐ ${b.name} ha trovato il lavoro dei sogni da ${SHOPS[f.shop].name}!`);
  } else {
    toast(`${b.name} lavora da ${SHOPS[f.shop].name}`);
    sfx.pop();
    feedMsg(`💼 ${b.name} lavora da ${SHOPS[f.shop].name}`);
  }
  renderTower();
  updateTop();
  if (modalCtx && modalCtx.type === 'floor') openFloorModal(f.id);
  else if (modalCtx && modalCtx.type === 'pickworker') openFloorModal(modalCtx.id);
  else if (modalCtx && modalCtx.type === 'jobpick') openBitModal(bitId);
  else closeModal();
}

function fireJob(bitId) {
  const b = bitById(bitId);
  if (!b || !b.work) return;
  const where = floorName(b.work);
  b.work = null;
  toast(`${b.name} ha lasciato ${where}`);
  feedMsg(`💼 ${b.name} ha lasciato ${where}`);
  renderTower();
  updateTop();
  if (modalCtx && modalCtx.type === 'floor') openFloorModal(modalCtx.id);
  else if (modalCtx && modalCtx.type === 'bit') openBitModal(bitId);
  else closeModal();
}

function evictBit(bitId) {
  const b = bitById(bitId);
  if (!b) return;
  S.bits = S.bits.filter((x) => x.id !== bitId);
  toast(`🚪 ${b.name} ha lasciato la torre`);
  feedMsg(`🚪 ${b.name} ha lasciato la torre`);
  sfx.pop();
  renderTower();
  updateTop();
  closeModal();
}

function demolishFloor(id) {
  const f = floorById(id);
  if (!f || f.type === 'lobby') return;
  const refund = f.built ? Math.round((f.cost || 0) * 0.3) : Math.round((f.cost || 0) * 0.7);
  S.coins += refund;
  S.bits.forEach((b) => { if (b.work === f.id) b.work = null; });
  S.bits = S.bits.filter((b) => b.home !== f.id);
  S.req = S.req.filter((r) => r.from !== f.id && r.to !== f.id);
  S.floors = S.floors.filter((x) => x.id !== f.id);
  toast(`🔨 Piano rimosso (+${fmt(refund)} 💰)`);
  feedMsg(`🔨 Demolito: ${floorName(f)}`);
  sfx.build();
  renderTower();
  updateTop();
  closeModal();
}

function acceptArrival(i) {
  const p = S.pending[i];
  if (!p) return;
  const spots = S.floors.filter((f) => f.type === 'res' && f.built && residentsOf(f).length < RES_CAP);
  if (!spots.length) { toast('Serve un appartamento libero!'); sfx.err(); return; }
  p.bit.home = pick(spots).id;
  S.bits.push(p.bit);
  S.pending.splice(i, 1);
  S.stats.arrivals++;
  S.coins += 10;
  S.stats.earned += 10;
  toast(`🔑 ${p.bit.name} si è trasferito! +10 💰`);
  feedMsg(`🔑 ${p.bit.name} si è trasferito in ${floorName(p.bit.home)}`);
  sfx.pop();
  renderTower();
  updateTop();
  if (modalCtx && modalCtx.type === 'lobby') openLobbyModal();
}

function rejectArrival(i) {
  const p = S.pending[i];
  if (!p) return;
  S.pending.splice(i, 1);
  toast(`😢 ${p.bit.name} se ne è andato…`);
  updateTop();
  if (modalCtx && modalCtx.type === 'lobby') openLobbyModal();
}

function recruit() {
  if (vacancy() < 1) { toast('Serve un appartamento libero!'); sfx.err(); return; }
  if (S.bux < 2) { toast('🔷 insufficienti!'); sfx.err(); return; }
  S.bux -= 2;
  const b = makeBit();
  const spots = S.floors.filter((f) => f.type === 'res' && f.built && residentsOf(f).length < RES_CAP);
  b.home = pick(spots).id;
  S.bits.push(b);
  toast(`🎉 ${b.name} si trasferisce subito!`);
  feedMsg(`🎉 ${b.name} si è trasferito!`);
  sfx.pop();
  renderTower();
  updateTop();
  openBitsModal();
}

/* ----------------------------- Simulazione ----------------------------- */
function advanceShop(f, t) {
  const st = f.stock;
  if (st.phase === 'restocking' && t >= st.ends) {
    st.phase = 'selling';
    st.qty = SHOPS[f.shop].items[st.item].q;
    st.nextAt = st.ends;
  }
  if (st.phase === 'selling') {
    const it = SHOPS[f.shop].items[st.item];
    const iv = saleInterval(f);
    const inc = incomeUnit(it);
    let guard = 0;
    while (st.qty > 0 && st.nextAt <= t && guard++ < 1000) {
      st.qty--;
      f.cash += inc;
      st.nextAt += iv;
    }
    if (st.qty <= 0) st.phase = 'empty';
  }
}

function economyTick(t, dt) {
  for (const f of S.floors) {
    if (f.type === 'lobby') continue;
    if (!f.built) {
      if (t >= f.buildEnds) {
        f.built = true;
        toast(`✅ ${floorName(f)} è pronto!`);
        feedMsg(`✅ ${floorName(f)} apre i battenti!`);
        sfx.ding();
        renderTower();
      }
      continue;
    }
    if (f.type === 'res') {
      f.rent += residentsOf(f).length * dt / 30;
    } else {
      advanceShop(f, t);
    }
  }
}

function arrivalsTick(t) {
  if (t >= S.nextArrival) {
    S.nextArrival = t + rand(50, 110);
    if (vacancy() > 0 && S.pending.length < 3) {
      S.pending.push({ bit: makeBit(), exp: t + 120 });
      const p = S.pending[S.pending.length - 1];
      toast(`👋 ${p.bit.name} è arrivato in città!`);
      sfx.pop();
    }
  }
  const before = S.pending.length;
  S.pending = S.pending.filter((p) => p.exp > t);
  if (S.pending.length !== before) {
    toast('😢 Qualcuno se ne è andato senza casa…');
    renderTower();
  }
}

function requestsTick(t) {
  S.req = S.req.filter((r) => r.exp > t && floorById(r.from) && floorById(r.to) && (r.vipType || bitById(r.bit)));
  if (t >= S.nextReq) {
    S.nextReq = t + rand(28, 60);
    if (S.bits.length && S.floors.length > 2 && S.req.length < 3) {
      const housed = S.bits.filter((b) => b.home != null);
      if (housed.length) {
        const b = pick(housed);
        const busy = S.req.some((r) => r.bit === b.id) || (elev.req && elev.req.bit === b.id);
        if (!busy) {
          const cands = S.floors.filter((f) => f.built && f.id !== b.home);
          if (cands.length) {
            const coms = cands.filter((f) => f.type === 'com');
            const to = (Math.random() < 0.65 && coms.length) ? pick(coms).id : pick(cands).id;
            S.req.push({ id: uid(), bit: b.id, from: b.home, to, exp: t + 150 });
          }
        }
      }
    }
  }
}

function popBuxCheck() {
  const cap = Math.floor(S.bits.length / 5);
  if (cap > S.stats.popBux) {
    const add = cap - S.stats.popBux;
    S.bux += add;
    S.stats.popBux = cap;
    toast(`👥 ${S.bits.length} abitanti! +${add} 🔷`);
    feedMsg(`👥 La torre raggiunge ${S.bits.length} abitanti!`);
  }
}

/* ----------------------------- Ascensore ----------------------------- */
const elev = { state: 'idle', pos: 0, req: null, until: 0 };

function setCarPassenger(html) {
  carEl.querySelector('.pass').innerHTML = html || '';
}

function moveCar(idx) {
  idx = clamp(idx, 0, S.floors.length - 1);
  const y1 = floorBottomY(idx);
  const dist = Math.abs(y1 - floorBottomY(elev.pos));
  const dur = Math.max(0.15, dist / elevSpeed());
  carEl.style.transitionDuration = dur + 's';
  carEl.style.bottom = y1 + 'px';
  elev.pos = idx;
  elev.until = now() + dur + 0.05;
}

function resetCarPos() {
  carEl.style.transitionDuration = '0s';
  carEl.style.bottom = floorBottomY(elev.pos) + 'px';
  void carEl.offsetHeight; // forza il reflow
  carEl.style.transitionDuration = '';
}

function dispatchReq(r, auto) {
  if (elev.state !== 'idle') {
    if (!auto) { toast('🛗 Occupato, un attimo…'); sfx.err(); }
    return;
  }
  if (!floorById(r.from) || !floorById(r.to)) {
    S.req = S.req.filter((x) => x !== r);
    return;
  }
  elev.req = r;
  elev.state = 'go';
  setCarPassenger(r.vipType ? vipBitHTML() : (bitById(r.bit) ? miniBitHTML(bitById(r.bit)) : ''));
  moveCar(r.from);
  if (!auto) sfx.tap();
}

function completeRide(r) {
  S.req = S.req.filter((x) => x !== r);
  S.stats.rides++;
  if (r.vipType) {
    S.stats.vips++;
    applyVip(r);
  } else {
    const idx = Math.max(0, S.floors.findIndex((f) => f.id === r.to));
    const tip = 8 + 3 * idx + randi(0, 6);
    S.coins += tip;
    S.stats.earned += tip;
    floatAtEl(carEl, `+${tip} 💰`);
    if (Math.random() < 0.12) { S.bux++; toast('🛗 Ottimo servizio! +1 🔷'); }
    haptic(18);
    sfx.tip();
  }
  updateTop();
}

function elevTick(t) {
  if (elev.state === 'idle') {
    if (S.req.length) dispatchReq(S.req[0], true);
    return;
  }
  if ((elev.state === 'go' || elev.state === 'ride') && t >= elev.until) {
    if (elev.state === 'go') {
      elev.state = 'load';
      elev.until = t + 0.7;
      carEl.classList.add('open');
      sfx.ding();
    } else {
      elev.state = 'drop';
      elev.until = t + 0.7;
      carEl.classList.add('open');
    }
  } else if ((elev.state === 'load' || elev.state === 'drop') && t >= elev.until) {
    carEl.classList.remove('open');
    if (elev.state === 'load') {
      moveCar(elev.req.to);
      elev.state = 'ride';
    } else {
      const r = elev.req;
      elev.req = null;
      elev.state = 'idle';
      setCarPassenger(null);
      completeRide(r);
    }
  }
}

/* ----------------------------- BitBook & extra ----------------------------- */
function feedMsg(txt) {
  if (!S.feed) S.feed = [];
  S.feed.unshift({ t: now(), txt });
  if (S.feed.length > 40) S.feed.length = 40;
}

function relTime(t) {
  const d = now() - t;
  if (d < 60) return 'ora';
  if (d < 3600) return Math.floor(d / 60) + ' min';
  if (d < 86400) return Math.floor(d / 3600) + ' h';
  return Math.floor(d / 86400) + ' g';
}

function haptic(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) { /* non supportato */ }
}

function openBitBookModal() {
  modalCtx = { type: 'bitbook' };
  const rows = (S.feed || []).map((e) => `<div class="feedrow"><span class="feedt">${relTime(e.t)}</span><span>${e.txt}</span></div>`).join('');
  openSheet(`<div class="hd"><span class="big">📖</span><h2>BitBook</h2><button class="x" data-act="close">✕</button></div>
    <div class="tagline">La cronaca della tua torre</div>
    ${rows || '<div class="muted">Ancora niente da raccontare… costruisci, assumi e servi i VIP!</div>'}
    <div class="btns"><button class="btn ghost" data-act="clearfeed">🗑️ Svuota cronaca</button></div>`);
}

function quickHire(floorId) {
  const f = floorById(floorId);
  if (!f || f.type !== 'com' || !f.built) return;
  if (workersOf(f).length >= WORK_SLOTS) { toast('Posti esauriti!'); return; }
  if (vacancy() < 1) { toast('Serve un appartamento libero per il nuovo assunto!'); sfx.err(); return; }
  if (S.bux < 2) { toast('🔷 insufficienti!'); sfx.err(); return; }
  S.bux -= 2;
  const b = makeBit();
  const spots = S.floors.filter((x) => x.type === 'res' && x.built && residentsOf(x).length < RES_CAP);
  b.home = pick(spots).id;
  b.work = f.id;
  S.bits.push(b);
  feedMsg(`💼 ${b.name} assunto da ${SHOPS[f.shop].name}`);
  toast(`🎉 ${b.name} si trasferisce e lavora da ${SHOPS[f.shop].name}!`);
  sfx.pop();
  renderTower();
  updateTop();
  openFloorModal(f.id);
}

/* ----------------------------- VIP ----------------------------- */
const VIPS = {
  builder: { icon: '👷', name: 'Costruttore VIP', desc: 'Completa all’istante una costruzione sul piano dove scende.' },
  spender: { icon: '💸', name: 'Spendaccione VIP', desc: 'Compra all’istante tutto lo stock del negozio dove scende (guadagni in cassa).' },
  stocker: { icon: '📦', name: 'Magazziniere VIP', desc: 'Rifornisce all’istante il negozio dove scende (paghi il costo normale).' },
  agent:   { icon: '🏦', name: 'Agente Immobiliare', desc: 'Sconto del 25% sul prossimo piano che costruirai (cumulabile fino al 50%).' }
};
const VIP_NAMES = {
  builder: ['Arch. Rossi', 'Ing. Bricks', 'Cav. Martello'],
  spender: ['Contessa Cash', 'Sig. Riccone', 'Dott. Million'],
  stocker: ['Mago del Magazzino', 'Sig. Scorte', 'Barone Box'],
  agent: ['Agente Fitz', 'Sig.ra Chiavi', 'Notaio Deeds']
};
const ELEV_COSTS = [3, 5, 8, 12];

function vipBitHTML(big) {
  return `<span class="bit vip${big ? ' big' : ''}" style="--sk:#f8d8b8;--sh:#f1c40f;--hr:#2b2b2b;animation-delay:.3s"><i class="hd"></i><i class="bd"></i><i class="lg"></i></span>`;
}

function vipTick(t) {
  if (t >= S.nextVip) {
    S.nextVip = t + rand(100, 160);
    if (S.vips.length < 1 && S.floors.length >= 3) {
      const type = pick(Object.keys(VIPS));
      S.vips.push({ id: uid(), type, name: pick(VIP_NAMES[type]), exp: t + 150 });
      toast(`${VIPS[type].icon} ${VIPS[type].name} è in lobby: un affare da non perdere!`);
      feedMsg(`⭐ ${VIPS[type].name} è in lobby`);
      sfx.ding();
    }
  }
  const before = S.vips.length;
  S.vips = S.vips.filter((v) => v.exp > t);
  if (S.vips.length !== before) {
    toast('⭐ Il VIP se ne è andato senza essere servito…');
    renderTower();
  }
}

function shopStatus(f) {
  const st = f.stock;
  if (st.phase === 'empty') return 'scaffali vuoti';
  const it = SHOPS[f.shop].items[st.item];
  if (st.phase === 'restocking') return `${it.e} ${it.n} in arrivo…`;
  return `${it.e} ${it.n}: ${st.qty}/${it.q}`;
}

function vipTargets(type) {
  const fs = S.floors.filter((f) => f.id !== 0);
  if (type === 'builder') return fs.filter((f) => !f.built);
  if (type === 'spender') return fs.filter((f) => f.type === 'com' && f.built && f.stock.phase === 'selling');
  if (type === 'stocker') return fs.filter((f) => f.type === 'com' && f.built && f.stock.phase === 'empty');
  return fs.filter((f) => f.built);
}

function dispatchVip(vipId, floorId) {
  const v = S.vips.find((x) => x.id === vipId);
  const f = floorById(floorId);
  if (!v || !f) return;
  if (S.req.length >= 3) { toast('🛗 Ascensore troppo occupato!'); sfx.err(); return; }
  S.vips = S.vips.filter((x) => x.id !== vipId);
  S.req.push({ id: uid(), vipType: v.type, from: 0, to: f.id, exp: now() + 300 });
  toast(`${VIPS[v.type].icon} ${VIPS[v.type].name} parte in ascensore!`);
  sfx.pop();
  closeModal();
  renderTower();
  updateTop();
}

function applyVip(r) {
  const def = VIPS[r.vipType];
  const f = floorById(r.to);
  let msg = 'Il VIP ha cambiato idea…';
  if (r.vipType === 'builder' && f && !f.built) {
    f.built = true;
    renderTower();
    msg = `${def.icon} Costruzione completata all’istante!`;
  } else if (r.vipType === 'spender' && f && f.type === 'com' && f.built && f.stock.phase === 'selling') {
    const it = SHOPS[f.shop].items[f.stock.item];
    const gain = f.stock.qty * incomeUnit(it);
    f.cash += gain;
    f.stock.qty = 0;
    f.stock.phase = 'empty';
    msg = `${def.icon} Ha comprato tutto lo stock! +${fmt(gain)} 💰 in cassa`;
  } else if (r.vipType === 'stocker' && f && f.type === 'com' && f.built && f.stock.phase === 'empty') {
    const it = SHOPS[f.shop].items[f.stock.item];
    const cost = it.p * it.q;
    if (S.coins >= cost) {
      S.coins -= cost;
      f.stock.phase = 'selling';
      f.stock.qty = it.q;
      f.stock.nextAt = now();
      msg = `${def.icon} ${it.e} ${it.n} rifornito all’istante!`;
    } else {
      msg = 'Monete insufficienti per il rifornimento del VIP!';
    }
  } else if (r.vipType === 'agent') {
    S.discount = Math.min(0.5, S.discount + 0.25);
    msg = `${def.icon} Sconto del ${Math.round(S.discount * 100)}% sul prossimo piano!`;
  }
  floatAtEl(carEl, def.icon);
  toast(msg);
  feedMsg(msg);
  sfx.tip();
  updateTop();
}

function elevUpgrade() {
  const lvl = S.elevLvl || 0;
  if (lvl >= ELEV_COSTS.length) { toast('🛗 Ascensore già al massimo!'); return; }
  const cost = ELEV_COSTS[lvl];
  if (S.bux < cost) { toast('🔷 insufficienti!'); sfx.err(); return; }
  S.bux -= cost;
  S.elevLvl = lvl + 1;
  toast(`🛗 Ascensore potenziato! Velocità: ${elevSpeed()} px/s`);
  feedMsg(`🛗 Ascensore potenziato al Lv ${S.elevLvl + 1}`);
  sfx.tip();
  updateTop();
  openMenuModal();
}

/* ----------------------------- Missioni ----------------------------- */
const MISSION_DEFS = {
  floors:   { icon: '🏗️', label: (n) => `Costruisci ${n} piani`, stat: 'floorsBuilt', base: 1, mult: 60, bux: 1 },
  rides:    { icon: '🛗', label: (n) => `Completa ${n} corse in ascensore`, stat: 'rides', base: 4, mult: 12, bux: 1 },
  coins:    { icon: '💰', label: (n) => `Riscuoti ${fmt(n)} monete`, stat: 'earned', base: 300, mult: 1.2, bux: 1 },
  stocks:   { icon: '📦', label: (n) => `Rifornisci ${n} negozi`, stat: 'stocks', base: 3, mult: 45, bux: 1 },
  arrivals: { icon: '👋', label: (n) => `Accogli ${n} nuovi abitanti`, stat: 'arrivals', base: 2, mult: 70, bux: 2 },
  pop:      { icon: '👥', label: (n) => `Raggiungi ${n} abitanti`, base: 6, coinsFlat: 150, bux: 2, absolute: true },
  vips:     { icon: '⭐', label: (n) => `Servi ${n} VIP`, stat: 'vips', base: 1, mult: 120, bux: 2 }
};

function makeMission(excludeTypes) {
  const keys = Object.keys(MISSION_DEFS).filter((k) => !excludeTypes.includes(k));
  const type = pick(keys.length ? keys : Object.keys(MISSION_DEFS));
  const def = MISSION_DEFS[type];
  const target = Math.max(1, Math.round(def.base * (1 + S.missionLevel * 0.35)));
  const coins = def.coinsFlat
    ? Math.round(def.coinsFlat * (1 + S.missionLevel * 0.2))
    : Math.round(target * def.mult * (1 + S.missionLevel * 0.15));
  const bux = Math.min(5, def.bux + Math.floor(S.missionLevel / 4));
  return { id: uid(), type, target, base: def.absolute ? 0 : (S.stats[def.stat] || 0), coins, bux, done: false };
}

function missionProgress(m) {
  const def = MISSION_DEFS[m.type];
  if (def.absolute) return Math.min(m.target, S.bits.length);
  return Math.min(m.target, Math.max(0, (S.stats[def.stat] || 0) - m.base));
}

function initMissions() {
  let guard = 0;
  while (S.missions.length < 3 && guard++ < 10) {
    S.missions.push(makeMission(S.missions.map((m) => m.type)));
  }
}

function missionsCheck() {
  for (const m of S.missions) {
    if (!m.done && missionProgress(m) >= m.target) {
      m.done = true;
      toast('🎯 Missione completata! Riscuoti il premio.');
      sfx.ding();
    }
  }
}

function claimMission(id) {
  const m = S.missions.find((x) => x.id === id);
  if (!m || !m.done) return;
  S.coins += m.coins;
  S.bux += m.bux;
  S.stats.earned += m.coins;
  S.missionLevel++;
  toast(`🎯 Premio riscosso: +${fmt(m.coins)} 💰 e +${m.bux} 🔷!`);
  feedMsg(`🎯 Missione completata: +${fmt(m.coins)} 💰`);
  sfx.tip();
  const others = S.missions.filter((x) => x.id !== m.id).map((x) => x.type);
  S.missions[S.missions.indexOf(m)] = makeMission(others);
  updateTop();
  openMissionsModal();
}

function openMissionsModal() {
  modalCtx = { type: 'missions' };
  const rows = S.missions.map((m) => {
    const def = MISSION_DEFS[m.type];
    const p = missionProgress(m);
    const pct = (p / m.target) * 100;
    return `<div class="itemrow">
      <span style="font-size:22px">${def.icon}</span>
      <span class="grow"><span class="t">${def.label(m.target)}</span>
        <span class="bar" style="display:block;margin-top:5px"><i style="width:${pct.toFixed(1)}%"></i></span>
        <span class="s">${p}/${m.target} · Premio: ${fmt(m.coins)} 💰 + ${m.bux} 🔷</span></span>
      ${m.done ? `<button class="btn primary" data-act="claim" data-id="${m.id}">Riscuoti</button>` : ''}
    </div>`;
  }).join('');
  openSheet(`<div class="hd"><span class="big">🎯</span><h2>Missioni</h2><button class="x" data-act="close">✕</button></div>
    <div class="tagline">Livello missioni: ${S.missionLevel} · completane una e arriva una più difficile!</div>
    ${rows}
    <div class="tip">💡 I progressi contano anche offline: riscuoti dai negozi per la missione 💰.</div>`);
}

function openVipTargetModal(vipId) {
  const v = S.vips.find((x) => x.id === vipId);
  if (!v) { openLobbyModal(); return; }
  const def = VIPS[v.type];
  modalCtx = { type: 'viptarget', id: vipId };
  const targets = vipTargets(v.type);
  const rows = targets.map((f) => `<button class="itemrow" data-act="vipgo" data-id="${vipId}" data-f="${f.id}">
    <span style="font-size:20px">${floorIcon(f)}</span>
    <span class="grow"><span class="t">${esc(floorName(f))}</span>
    <span class="s">${f.type === 'com' && f.built ? shopStatus(f) : (f.built ? 'piano edificato' : 'in costruzione')}</span></span></button>`).join('');
  openSheet(`<div class="hd"><span class="big">${def.icon}</span><h2>${esc(def.name)}</h2><button class="x" data-act="close">✕</button></div>
    <div class="tagline">${def.desc}</div>
    ${rows || '<div class="muted">Nessun piano valido per questo VIP al momento.</div>'}
    <div class="btns"><button class="btn ghost" data-act="lobby">← Torna alla Lobby</button></div>`);
}

function openRenameModal(floorId) {
  const f = floorById(floorId);
  if (!f || f.type !== 'res') return;
  modalCtx = { type: 'rename', id: floorId };
  openSheet(`<div class="hd"><span class="big">✏️</span><h2>Rinomina appartamento</h2><button class="x" data-act="close">✕</button></div>
    <input id="rn-input" type="text" maxlength="24" value="${esc(f.name)}" placeholder="Nome appartamento">
    <div class="btns">
      <button class="btn ghost" data-act="close">Annulla</button>
      <button class="btn primary" data-act="rename2" data-id="${floorId}">Salva</button>
    </div>`);
  const inp = document.getElementById('rn-input');
  if (inp) {
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveRename(floorId); });
    setTimeout(() => inp.focus(), 80);
  }
}

function saveRename(floorId) {
  const f = floorById(floorId);
  const inp = document.getElementById('rn-input');
  if (!f || !inp) return;
  const v = inp.value.trim().slice(0, 24);
  if (v) f.name = v;
  toast('✏️ Nome aggiornato!');
  sfx.pop();
  renderTower();
  openFloorModal(floorId);
}

/* ----------------------------- Tick principale ----------------------------- */
let lastTick = now();
let saveAcc = 0;

function tick() {
  const t = now();
  let dt = t - lastTick;
  lastTick = t;
  if (dt < 0) dt = 0;
  if (dt > 43200) dt = 43200;
  economyTick(t, dt);
  arrivalsTick(t);
  vipTick(t);
  requestsTick(t);
  popBuxCheck();
  missionsCheck();
  elevTick(t);
  refreshBadges();
  updateTop();
  updateOpenFloorModal();
  saveAcc += dt;
  if (saveAcc >= 10) { saveAcc = 0; save(); }
}

/* ----------------------------- Recupero offline ----------------------------- */
function catchUp() {
  const t = now();
  const dt = clamp(t - S.lastSeen, 0, OFFLINE_CAP);
  if (dt < 10) return;
  const tEnd = S.lastSeen + dt;
  let gained = 0;
  for (const f of S.floors) {
    if (f.type === 'lobby') continue;
    if (!f.built) {
      if (f.buildEnds <= tEnd) f.built = true;
      continue;
    }
    if (f.type === 'res') {
      const add = Math.floor(residentsOf(f).length * dt / 30);
      f.rent += add;
      gained += add;
    } else {
      const before = f.cash || 0;
      advanceShop(f, tEnd);
      gained += (f.cash || 0) - before;
    }
  }
  S.lastSeen = t;
  if (gained >= 5) toast(`🌙 Bentornato! Mentre eri via hai accumulato ${fmt(gained)} 💰`);
}

/* ----------------------------- Modali ----------------------------- */
function openSheet(html) {
  const root = $('#modal-root');
  root.innerHTML = '<div class="backdrop"></div><div class="sheet">' + html + '</div>';
  root.querySelector('.backdrop').addEventListener('click', closeModal);
  return root.querySelector('.sheet');
}
function closeModal() {
  $('#modal-root').innerHTML = '';
  modalCtx = null;
  fmCache = '';
}

function openConfirm(title, msg, yesAct, id) {
  openSheet(`<div class="hd"><h2>${title}</h2><button class="x" data-act="close">✕</button></div>
    <p style="font-size:14px;line-height:1.45">${msg}</p>
    <div class="btns">
      <button class="btn ghost" data-act="close">Annulla</button>
      <button class="btn danger" data-act="${yesAct}" data-id="${id == null ? '' : id}">Conferma</button>
    </div>`);
}

function demoBtnHTML(f) {
  if (f.type === 'lobby') return '';
  return `<div class="btns"><button class="btn danger" data-act="demo" data-id="${f.id}">🔨 Rimuovi piano</button></div>
    <div class="muted" style="margin-top:4px">Rimuovendo il piano recuperi parte del costo${f.type === 'res' ? ' e gli abitanti lasciano la torre' : ''}.</div>`;
}

function fmLiveHTML(f) {
  const t = now();
  if (!f.built) {
    const secs = Math.max(0, Math.ceil(f.buildEnds - t));
    const cost = Math.max(1, Math.ceil(secs / 15));
    const pct = clamp(1 - (f.buildEnds - t) / f.buildDur, 0, 1) * 100;
    return `<div style="font-weight:800">🚧 In costruzione…</div>
      <div class="bar" style="margin:8px 0"><i style="width:${pct.toFixed(1)}%"></i></div>
      <div class="muted" style="margin-bottom:8px">Pronto tra ${secs}s</div>
      <button class="btn primary" data-act="finnow" data-id="${f.id}">⚡ Completa ora (${cost} 🔷)</button>`;
  }
  if (f.type === 'com') {
    const st = f.stock;
    if (st.phase === 'empty') {
      const rows = SHOPS[f.shop].items.map((it, i) => {
        const cost = it.p * it.q;
        const gain = incomeUnit(it) * it.q;
        return `<button class="itemrow" data-act="stock" data-id="${f.id}" data-i="${i}"${S.coins < cost ? ' disabled' : ''}>
          <span style="font-size:20px">${it.e}</span>
          <span class="grow"><span class="t">${it.n}</span><span class="s">Vendi ${it.q} pz · Incasso ~${fmt(gain)} 💰</span></span>
          <span class="price">${fmt(cost)} 💰</span></button>`;
      }).join('');
      return `<h3 class="sect">📦 Rifornisci</h3>${rows}`;
    }
    if (st.phase === 'restocking') {
      const it = SHOPS[f.shop].items[st.item];
      const secs = Math.max(0, Math.ceil(st.ends - t));
      const pct = clamp(1 - (st.ends - t) / st.dur, 0, 1) * 100;
      return `<div style="font-weight:800">📦 ${it.e} ${it.n} in arrivo…</div>
        <div class="bar" style="margin:8px 0"><i style="width:${pct.toFixed(1)}%"></i></div>
        <div class="muted">Pronto tra ${secs}s</div>`;
    }
    const it = SHOPS[f.shop].items[st.item];
    const pct = (1 - st.qty / it.q) * 100;
    return `<div style="font-weight:800">🛍️ ${it.e} ${it.n} in vendita</div>
      <div class="bar" style="margin:8px 0"><i style="width:${pct.toFixed(1)}%"></i></div>
      <div class="muted" style="margin-bottom:8px">Rimasti ${st.qty}/${it.q} · Incassato ${fmt(f.cash)} 💰</div>
      <button class="btn primary" data-act="cash" data-id="${f.id}"${f.cash < 1 ? ' disabled' : ''}>💰 Riscuoti ${fmt(f.cash)}</button>`;
  }
  if (f.type === 'res') {
    const rent = Math.floor(f.rent);
    return `<div style="font-weight:800">🏠 Affitti accumulati</div>
      <div class="muted" style="margin:4px 0 8px">Ogni abitante paga 1 💰 ogni 30s</div>
      <button class="btn primary" data-act="rent" data-id="${f.id}"${rent < 1 ? ' disabled' : ''}>💰 Riscuoti ${fmt(rent)}</button>`;
  }
  return '';
}

function updateOpenFloorModal() {
  if (!modalCtx || modalCtx.type !== 'floor') return;
  const f = floorById(modalCtx.id);
  if (!f) { closeModal(); return; }
  const html = fmLiveHTML(f);
  if (fmCache !== html) {
    fmCache = html;
    const c = document.getElementById('fm-live');
    if (c) c.innerHTML = html;
  }
}

function openFloorModal(id) {
  const f = floorById(id);
  if (!f) return;
  if (f.type === 'lobby') { openLobbyModal(); return; }
  modalCtx = { type: 'floor', id };
  if (f.type === 'res') {
    const residents = residentsOf(f);
    const rows = residents.map((b) => `<button class="itemrow" data-act="bit" data-id="${b.id}">
      ${miniBitHTML(b, true)}
      <span class="grow"><span class="t">${esc(b.name)} ${starsHTML(b)}</span>
      <span class="s">${b.work ? '💼 ' + esc(floorName(b.work)) : '🌳 in casa'}</span></span></button>`).join('');
    openSheet(`<div class="hd"><span class="big">🏠</span><h2>${esc(f.name)}</h2><button class="x" data-act="rename" data-id="${f.id}" title="Rinomina">✏️</button><button class="x" data-act="close">✕</button></div>
      <div class="tagline">${residents.length}/${RES_CAP} posti occupati</div>
      <div id="fm-live"></div>
      <h3 class="sect">Abitanti</h3>
      ${rows || '<div class="muted">Appartamento vuoto. Aspetta nuovi arrivati in città!</div>'}
      ${demoBtnHTML(f)}`);
  } else {
    const shop = SHOPS[f.shop];
    const ws = workersOf(f);
    const slots = [0, 1, 2].map((s) => ws[s]
      ? `<button class="slot filled" data-act="bit" data-id="${ws[s].id}">${miniBitHTML(ws[s], true)}<span class="nm">${esc(ws[s].name)}</span></button>`
      : `<button class="slot" data-act="pickworker" data-id="${f.id}">+<span>Assumi</span></button>`).join('');
    openSheet(`<div class="hd"><span class="big">${shop.icon}</span><h2>${esc(shop.name)}</h2><button class="x" data-act="close">✕</button></div>
      <div class="tagline">${esc(shop.d)} · ${CATS[shop.cat].icon} ${CATS[shop.cat].name}</div>
      <div id="fm-live"></div>
      <h3 class="sect">Personale (più dipendenti = più veloci)</h3>
      <div class="slots">${slots}</div>
      ${demoBtnHTML(f)}`);
  }
  fmCache = fmLiveHTML(f);
  const c = document.getElementById('fm-live');
  if (c) c.innerHTML = fmCache;
}

function openLobbyModal() {
  modalCtx = { type: 'lobby' };
  const rows = S.pending.map((p, i) => `<div class="itemrow">
    ${miniBitHTML(p.bit, true)}
    <span class="grow"><span class="t">${esc(p.bit.name)} ${starsHTML(p.bit)}</span>
    <span class="s">Sogna: ${SHOPS[p.bit.dream].icon} ${esc(SHOPS[p.bit.dream].name)}</span></span>
    <button class="btn primary" data-act="accept" data-i="${i}">Accogli</button>
    <button class="btn ghost" data-act="reject" data-i="${i}">✕</button>
  </div>`).join('');
  const vipRows = S.vips.map((v) => {
    const def = VIPS[v.type];
    const secs = Math.max(0, Math.ceil(v.exp - now()));
    return `<div class="itemrow vip">${vipBitHTML(true)}
      <span class="grow"><span class="t">⭐ ${esc(v.name || def.name)}</span>
      <span class="s">${def.desc}</span></span>
      <button class="btn primary" data-act="viptarget" data-id="${v.id}">Invia</button>
      <span class="muted" style="align-self:center">${secs}s</span>
    </div>`;
  }).join('');
  openSheet(`<div class="hd"><span class="big">🏨</span><h2>Lobby</h2><button class="x" data-act="close">✕</button></div>
    ${vipRows ? `<h3 class="sect">⭐ VIP in visita</h3>${vipRows}` : ''}
    <h3 class="sect">Nuovi abitanti</h3>
    ${rows || '<div class="muted">Nessuno in attesa. Gli abitanti arrivano col tempo!</div>'}
    <div class="tip">💡 Costruisci piani <b>Residenziali</b> per più posti letto (ogni 5 abitanti: +1 🔷). I VIP partono dalla Lobby: tocca <b>Invia</b> e scegli il piano per il loro bonus!</div>`);
}

function openBitsModal() {
  modalCtx = { type: 'bits' };
  const rows = S.bits.map((b) => `<button class="itemrow" data-act="bit" data-id="${b.id}">
    ${miniBitHTML(b, true)}
    <span class="grow"><span class="t">${esc(b.name)} ${starsHTML(b)}</span>
    <span class="s">🏠 ${esc(floorName(b.home))} · ${b.work ? '💼 ' + esc(floorName(b.work)) : '💼 disoccupato'}</span></span></button>`).join('');
  const canRecruit = vacancy() >= 1 && S.bux >= 2;
  openSheet(`<div class="hd"><span class="big">👥</span><h2>Abitanti (${S.bits.length}/${resCapacity()})</h2><button class="x" data-act="close">✕</button></div>
    ${rows || '<div class="muted">La torre è vuota… per ora!</div>'}
    <div class="btns">
      <button class="btn primary" data-act="recruit"${canRecruit ? '' : ' disabled'}>➕ Nuovo abitante (2 🔷)</button>
      <button class="btn ghost" data-act="bitbook">📖 BitBook</button>
    </div>
    <div class="tip">💡 Tocca un abitante per gestire casa e lavoro.</div>`);
}

function openBitModal(id) {
  const b = bitById(id);
  if (!b) return;
  modalCtx = { type: 'bit', id };
  openSheet(`<div class="hd">${miniBitHTML(b, true)}<h2>${esc(b.name)}</h2><button class="x" data-act="close">✕</button></div>
    <div class="tagline">${starsHTML(b)} · Sogna: ${SHOPS[b.dream].icon} ${esc(SHOPS[b.dream].name)}${b.work === b.dream ? ' ⭐ assunto nel negozio dei sogni!' : ''}</div>
    <div class="statrow"><span>🏠 Casa</span><b>${esc(floorName(b.home))}</b></div>
    <div class="statrow"><span>💼 Lavoro</span><b>${b.work ? esc(floorName(b.work)) : 'disoccupato'}</b></div>
    <div class="btns">
      <button class="btn" data-act="jobpick" data-id="${b.id}">💼 Cambia lavoro</button>
      <button class="btn danger" data-act="evict" data-id="${b.id}">🚪 Sfratta</button>
    </div>
    ${b.work ? `<div class="btns"><button class="btn ghost" data-act="fire" data-id="${b.id}">Licenzia da ${esc(floorName(b.work))}</button></div>` : ''}`);
}

function openJobPicker(bitId) {
  const b = bitById(bitId);
  if (!b) return;
  modalCtx = { type: 'jobpick', id: bitId };
  const spots = S.floors.filter((f) => f.type === 'com' && f.built && workersOf(f).length < WORK_SLOTS && f.id !== b.work);
  const rows = spots.map((f) => `<button class="itemrow${f.shop === b.dream ? ' star' : ''}" data-act="setjob" data-id="${b.id}" data-f="${f.id}">
    <span style="font-size:20px">${SHOPS[f.shop].icon}</span>
    <span class="grow"><span class="t">${esc(SHOPS[f.shop].name)}${f.shop === b.dream ? ' ⭐ sogno!' : ''}</span>
    <span class="s">${workersOf(f).length}/${WORK_SLOTS} dipendenti</span></span></button>`).join('');
  openSheet(`<div class="hd"><h2>Lavoro per ${esc(b.name)}</h2><button class="x" data-act="close">✕</button></div>
    ${rows || '<div class="muted">Nessun posto libero: costruisci un negozio o libera uno slot.</div>'}
    <div class="tip">⭐ Se il negozio corrisponde al sogno dell\u2019abitante, la produzione è più veloce!</div>`);
}

function openWorkerPicker(floorId) {
  const f = floorById(floorId);
  if (!f || f.type !== 'com') return;
  modalCtx = { type: 'pickworker', id: floorId };
  const free = S.bits.filter((b) => !b.work);
  const rows = free.map((b) => `<button class="itemrow${b.dream === f.shop ? ' star' : ''}" data-act="setjob" data-id="${b.id}" data-f="${f.id}">
    ${miniBitHTML(b, true)}
    <span class="grow"><span class="t">${esc(b.name)} ${starsHTML(b)}${b.dream === f.shop ? ' ⭐' : ''}</span>
    <span class="s">Sogna: ${SHOPS[b.dream].icon} ${esc(SHOPS[b.dream].name)}</span></span></button>`).join('');
  openSheet(`<div class="hd"><h2>Assumi per ${esc(SHOPS[f.shop].name)}</h2><button class="x" data-act="close">✕</button></div>
    ${rows || '<div class="muted">Nessun disoccupato al momento.</div>'}
    <div class="btns"><button class="btn primary" data-act="quickhire" data-id="${f.id}"${(S.bux < 2 || vacancy() < 1) ? ' disabled' : ''}>➕ Assumi nuovo abitante (2 🔷)</button></div>
    <div class="tip">💡 Il dipendente con ⭐ sogna proprio questo negozio: produzione +20%!</div>`);
}

function openBuildModal() {
  if (S.floors.length >= MAX_FLOORS) { toast('🏢 Torre al massimo!'); return; }
  modalCtx = { type: 'build' };
  const base = floorCost();
  const cost = Math.round(base * (1 - S.discount));
  const disc = S.discount > 0 ? ` <s>${fmt(base)}</s> <b style="color:#2e8b3a">-${Math.round(S.discount * 100)}%</b>` : '';
  const cats = Object.entries(CATS).map(([k, c]) => `<button class="card" data-act="build-cat" data-id="${k}">
      <div class="big">${c.icon}</div>${c.name}<span class="s">${c.shops.length} negozi</span></button>`).join('');
  openSheet(`<div class="hd"><span class="big">🏗️</span><h2>Costruisci un piano</h2><button class="x" data-act="close">✕</button></div>
    <div class="tagline">Costo:${disc} <b style="color:#b07d10">${fmt(cost)} 💰</b> · Hai ${fmt(S.coins)} 💰</div>
    <button class="itemrow" data-act="build-res"${S.coins < cost ? ' disabled' : ''}>
      <span style="font-size:24px">🏠</span>
      <span class="grow"><span class="t">Residenziale</span><span class="s">+${RES_CAP} posti letto per nuovi abitanti</span></span>
      <span class="price">${fmt(cost)} 💰</span></button>
    <h3 class="sect">Oppure apri un negozio</h3>
    <div class="grid2">${cats}</div>
    <div class="tip">💡 Ogni piano costruito dà +1 🔷. I negozi producono più veloce con più dipendenti e con il dipendente che ci sogna!</div>`);
}

function openCatModal(catId) {
  const cat = CATS[catId];
  if (!cat) return;
  modalCtx = { type: 'buildcat', id: catId };
  const cost = Math.round(floorCost() * (1 - S.discount));
  const rows = cat.shops.map((sid) => {
    const sh = SHOPS[sid];
    return `<button class="itemrow" data-act="build-shop" data-id="${sid}"${S.coins < cost ? ' disabled' : ''}>
      <span style="font-size:24px">${sh.icon}</span>
      <span class="grow"><span class="t">${esc(sh.name)}</span><span class="s">${esc(sh.d)}</span></span>
      <span class="price">${fmt(cost)} 💰</span></button>`;
  }).join('');
  openSheet(`<div class="hd"><span class="big">${cat.icon}</span><h2>${esc(cat.name)}</h2><button class="x" data-act="close">✕</button></div>
    <div class="tagline">Scegli il negozio da aprire (costo piano: ${fmt(cost)} 💰${S.discount > 0 ? `, sconto -${Math.round(S.discount * 100)}% già applicato` : ''})</div>
    ${rows}
    <div class="btns"><button class="btn ghost" data-act="build-back">← Torna indietro</button></div>`);
}

function openMenuModal() {
  modalCtx = { type: 'menu' };
  const installBtn = deferredPrompt
    ? '<div class="btns"><button class="btn" data-act="install">📲 Installa sul dispositivo</button></div>'
    : '';
  const lvl = S.elevLvl || 0;
  const elevBtn = lvl >= ELEV_COSTS.length
    ? '<button class="btn ghost" disabled>🛗 Ascensore al massimo (Lv 4)</button>'
    : `<button class="btn" data-act="elevup"${S.bux < ELEV_COSTS[lvl] ? ' disabled' : ''}>🛗 Potenzia ascensore → Lv ${lvl + 2} (${ELEV_COSTS[lvl]} 🔷)</button>`;
  openSheet(`<div class="hd"><span class="big">📋</span><h2>Menu</h2><button class="x" data-act="close">✕</button></div>
    <div class="statrow"><span>🏢 Piani</span><b>${S.floors.length}/${MAX_FLOORS}</b></div>
    <div class="statrow"><span>👥 Abitanti</span><b>${S.bits.length}</b></div>
    <div class="statrow"><span>💰 Monete raccolte</span><b>${fmt(S.stats.earned)}</b></div>
    <div class="statrow"><span>🛗 Corse in ascensore</span><b>${S.stats.rides}</b></div>
    <div class="statrow"><span>⭐ VIP serviti</span><b>${S.stats.vips}</b></div>
    <div class="statrow"><span>🛗 Ascensore</span><b>Lv ${lvl + 1} · ${elevSpeed()} px/s</b></div>
    <div class="btns">
      <button class="btn" data-act="collectall">💰 Riscuoti tutto</button>
      <button class="btn ghost" data-act="sound">${S.sound ? '🔊 Suono: on' : '🔇 Suono: off'}</button>
    </div>
    <div class="btns"><button class="btn ghost" data-act="bitbook">📖 BitBook della torre</button></div>
    <div class="btns">${elevBtn}</div>
    ${installBtn}
    <div class="btns"><button class="btn danger" data-act="reset">🗑️ Nuova partita</button></div>
    <div class="tip">Mini Tower v1.2 · PWA ispirata a Tiny Tower · Progressi salvati sul dispositivo · Gioca anche offline! (guadagno offline max 8h)</div>`);
}

/* ----------------------------- Delega eventi ----------------------------- */
function handleModalAction(e) {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  const id = b.dataset.id;
  const i = b.dataset.i != null ? parseInt(b.dataset.i, 10) : null;
  const fid = b.dataset.f != null ? parseInt(b.dataset.f, 10) : null;
  switch (act) {
    case 'close': closeModal(); break;
    case 'lobby': openLobbyModal(); break;
    case 'build-res': startFloor('res'); break;
    case 'build-cat': openCatModal(id); break;
    case 'build-shop': startFloor('com', id); break;
    case 'build-back': openBuildModal(); break;
    case 'finnow': { const f = floorById(+id); if (f) finishNow(f); break; }
    case 'stock': { const f = floorById(+id); if (f && i != null) stockItem(f, i); break; }
    case 'cash': { const f = floorById(+id); if (f) collectCash(f); break; }
    case 'rent': { const f = floorById(+id); if (f) collectRent(f); break; }
    case 'pickworker': openWorkerPicker(+id); break;
    case 'setjob': assignJob(id, fid); break;
    case 'fire': fireJob(id); break;
    case 'jobpick': openJobPicker(id); break;
    case 'evict': openConfirm('Sfruttare l\u2019abitante?', 'Lascierà la torre per sempre.', 'evict2', id); break;
    case 'evict2': evictBit(id); break;
    case 'demo': { const f = floorById(+id); if (f) openConfirm('Rimuovere il piano?', `Verrà rimosso <b>${esc(floorName(f))}</b> e recupererai parte del costo.`, 'demo2', id); break; }
    case 'demo2': demolishFloor(+id); break;
    case 'bits': openBitsModal(); break;
    case 'bit': openBitModal(id); break;
    case 'accept': acceptArrival(i); break;
    case 'reject': rejectArrival(i); break;
    case 'recruit': recruit(); break;
    case 'collectall': collectAll(); break;
    case 'sound': S.sound = !S.sound; updateSoundIcon(); sfx.tap(); openMenuModal(); break;
    case 'install': doInstall(); break;
    case 'reset': openConfirm('Nuova partita?', 'Tutti i progressi verranno cancellati per sempre.', 'reset2', null); break;
    case 'reset2': try { localStorage.removeItem(SAVE_KEY); } catch (e) {} location.reload(); break;
    case 'claim': claimMission(id); break;
    case 'viptarget': openVipTargetModal(id); break;
    case 'vipgo': dispatchVip(id, fid); break;
    case 'elevup': elevUpgrade(); break;
    case 'rename': openRenameModal(+id); break;
    case 'rename2': saveRename(+id); break;
    case 'bitbook': openBitBookModal(); break;
    case 'clearfeed': S.feed = []; openBitBookModal(); break;
    case 'quickhire': quickHire(+id); break;
  }
}

function handleTowerAction(e) {
  const bub = e.target.closest('[data-act]');
  if (bub) {
    const act = bub.dataset.act;
    const id = bub.dataset.id;
    if (act === 'collect') { const f = floorById(+id); if (f) collectCash(f); }
    else if (act === 'rent') { const f = floorById(+id); if (f) collectRent(f); }
    else if (act === 'collectall') collectAll();
    else if (act === 'ride') { const r = S.req.find((x) => x.id === id); if (r) dispatchReq(r, false); }
    else if (act === 'lobby') openLobbyModal();
    else if (act === 'floor') openFloorModal(+id);
    return;
  }
  const fl = e.target.closest('.floor');
  if (fl && fl.dataset.id != null) openFloorModal(+fl.dataset.id);
}

function doInstall() {
  if (!deferredPrompt) { toast('Usa il menu del browser → "Aggiungi a Home schermata"'); return; }
  deferredPrompt.prompt();
  deferredPrompt.userChoice.finally(() => { deferredPrompt = null; });
}

/* ----------------------------- Giorno / notte ----------------------------- */
function applyDayNight() {
  const h = new Date().getHours();
  $('#sky').classList.toggle('night', h < 7 || h >= 19);
}

/* ----------------------------- Avvio ----------------------------- */
function init() {
  const loaded = load();
  const fresh = !loaded;
  S = loaded || defaultState();
  carEl = $('#car');

  catchUp();
  if (!S.nextVip || S.nextVip < now() - 300) S.nextVip = now() + rand(20, 60);
  initMissions();
  applyDayNight();
  setInterval(applyDayNight, 60000);

  renderTower();
  updateTop();
  updateSoundIcon();
  resetCarPos();
  const vp = $('#viewport');
  vp.scrollTop = vp.scrollHeight;

  if (fresh) {
    setTimeout(() => toast('🏗️ Benvenuto! Costruisci piani e fai crescere la torre!'), 400);
    setTimeout(() => toast('🙋 Tocca le bolle per dare una spinta in ascensore e guadagnare mance!'), 3400);
    setTimeout(() => toast('🎯 Apri le Missioni: premi extra ti aspettano!'), 6400);
  } else {
    catchUpToastDone();
  }

  $('#btn-build').addEventListener('click', openBuildModal);
  $('#btn-bits').addEventListener('click', openBitsModal);
  $('#btn-missions').addEventListener('click', openMissionsModal);
  $('#btn-menu').addEventListener('click', openMenuModal);
  $('#sndbtn').addEventListener('click', () => { S.sound = !S.sound; updateSoundIcon(); sfx.tap(); save(); });

  $('#modal-root').addEventListener('click', handleModalAction);
  $('#tower-wrap').addEventListener('click', handleTowerAction);

  document.addEventListener('pointerdown', () => {
    try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* no audio */ }
  }, { once: true });

  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
  });

  setInterval(tick, 250);

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
}

function catchUpToastDone() {
  /* il messaggio di bentornato offline è già mostrato da catchUp() */
}

init();
