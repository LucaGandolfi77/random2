import CONFIG from './config.js';
import { loadState, saveState } from './storage.js';

let currentPoke = CONFIG.pokedex[0];
let caught = 0, flown = 0,

function init() {
  const saved = loadState();
  if (saved) { caught = saved.caught || 0; flown = saved.flown || 0; }
  renderPokedex();
  selectPoke(CONFIG.pokedex[0].id);
  document.getElementById('start-menu').classList.remove('hidden');
}
function renderPokedex() {
  const container = document.getElementById('pokedex');
  if (!container) return;
  container.innerHTML = '';
  CONFIG.pokedex.forEach(p => {
    const card = document.createElement('article');
    card.className = 'book-card';
    card.style = 'border-color:rgba(201,176,140,0.15);cursor:pointer;padding:0.8rem;background:rgba(20,8,24,0.7);border-radius:10px;text-align:center;';
    card.innerHTML = `<h3 style="font-size:1.05rem;color:#c8b0a0;">${p.name.en}</h3><div style="font-size:0.7rem;color:#8a7b65;">${p.author ? p.author.en : 'Being'}</div><div style="font-size:0.9rem;margin:0.3rem 0;">${p.emoji}</div><div style="font-size:0.65rem;color:#bfa07a;">Difficulty: ${p.difficulty}/10</div><button onclick="selectPoke('${p.id}')" class="play-link" style="margin-top:0.3rem;">Select</button>`;
    container.appendChild(card);
  });
}
function selectPoke(id) {
  currentPoke = CONFIG.pokedex.find(p => p.id === id) || CONFIG.pokedex[0];
  document.getElementById('poke-display').textContent = currentPoke.emoji;
  document.getElementById('poke-info').textContent = currentPoke.desc.en + ' — ' + currentPoke.flavor.en;
  document.getElementById('poke-diff').textContent = 'Difficulty: ' + currentPoke.difficulty + '/10 · ' + (CONFIG.language === 'it' ? 'Probabilità di fuga: ' : 'Flight probability: ') + Math.round((currentPoke.difficulty / 10) * 100) + '%';
  // Update stats display
  document.getElementById('caught').textContent = caught;
  document.getElementById('flown').textContent = flown;
  document.getElementById('library').textContent = CONFIG.pokedex.length;
}
function throwBall() {
  const roll = Math.random();
  const prob = currentPoke.difficulty / 10;
  const caught = roll > prob;
  const resultDiv = document.getElementById('result');
  resultDiv.classList.remove('hidden');
  if (caught) {
    resultDiv.innerHTML = '<span class="result-caught">Captured! — Catturato!</span><br><span style="font-size:0.85rem;color:#8a7b65;font-style:italic;">The being stays. It is done.</span>';
    caught++;
    playSound(440, 0.3, 'triangle');
  } else {
    resultDiv.innerHTML = '<span class="result-flew">Flew away — Volò via</span><br><span style="font-size:0.85rem;color:#8a7b65;font-style:italic;">The being was too difficult. It escaped.</span>';
    flown++;
    playSound(220, 0.3, 'sine');
  }
  saveState({ language: CONFIG.language || 'en', caught, flown, library: CONFIG.pokedex.length, lastPlayed: Date.now() });
  document.getElementById('caught').textContent = caught;
  document.getElementById('flown').textContent = flown;
}
function switchLang() {
  CONFIG.language = CONFIG.language === 'en' ? 'it' : 'en';
  selectPoke(currentPoke.id);
}
function startGame() {
  document.getElementById('start-menu').classList.add('hidden');
  document.getElementById('start-menu').style.display = 'none';
  renderPokedex();
}
export { init };
window.selectPoke = selectPoke;
window.throwBall = throwBall;
window.switchLang = switchLang;
window.startGame = startGame;
