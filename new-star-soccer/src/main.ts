import { gameState } from './state/GameState.ts';
import { MatchCanvas } from './match/MatchCanvas.ts';
import { ITEMS, clubStrength, type Screen, type WeekLog } from './types/index.ts';
import { isMuted, toggleMute, whistle, cheer, thud, blip } from './audio.ts';
import './style.css';

// ─── App Container ───
const app = document.getElementById('app')!;
let matchCanvas: MatchCanvas | null = null;
let hand: number[] = []; // blackjack hand
let betAmount = 10;

function render() {
  const screen = gameState.currentScreen;
  app.innerHTML = '';

  if (screen === 'dashboard') renderDashboard();
  else if (screen === 'career') renderCareer();
  else if (screen === 'life') renderLife();
  else if (screen === 'training') renderTraining();
  else if (screen === 'relations') renderRelations();
  else if (screen === 'shop') renderShop();
  else if (screen === 'match') renderMatch();
  else if (screen === 'match-result') renderMatchResult();
  else if (screen === 'casino') renderCasino();
  else if (screen === 'transfers') renderTransfers();
  else if (screen === 'retired') renderRetired();
}

// ─── Header Bar ───
function header(): string {
  const p = gameState.player;
  const eColor = p.energy > 60 ? 'var(--good)' : p.energy > 30 ? 'var(--warn)' : 'var(--bad)';
  const pos = gameState.leaguePosition();
  return `
    <div class="header-bar">
      <div class="header-left">
        <span class="money">💰 $${p.money.toLocaleString()}</span>
        <span class="energy" style="color:${eColor}">⚡ ${Math.round(p.energy)}%</span>
      </div>
      <div class="header-center">
        <span class="week">📅 S${gameState.season} W${gameState.weekOfSeason} · ${pos}${ordinal(pos)}</span>
      </div>
      <div class="header-right">
        <button id="btn-sound" class="sound-btn" title="Sound on/off">${isMuted() ? '🔇' : '🔊'}</button>
        <span class="age">👤 ${p.name}, ${p.age}</span>
      </div>
    </div>
  `;
}

function ordinal(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] || 'th';
}

// ─── Bottom Nav ───
function nav(): string {
  const tabs: { id: Screen; icon: string; label: string }[] = [
    { id: 'dashboard', icon: '🏠', label: 'Home' },
    { id: 'career', icon: '📈', label: 'Career' },
    { id: 'training', icon: '💪', label: 'Train' },
    { id: 'life', icon: '🍾', label: 'Life' },
    { id: 'relations', icon: '❤️', label: 'Relations' },
    { id: 'shop', icon: '🛒', label: 'Shop' },
    { id: 'casino', icon: '🎰', label: 'Casino' },
  ];
  return `
    <nav class="bottom-nav">
      ${tabs
        .map(
          (t) =>
            `<button class="nav-btn ${gameState.currentScreen === t.id ? 'active' : ''}" data-screen="${t.id}">
              <span class="nav-icon">${t.icon}</span>
              <span class="nav-label">${t.label}</span>
            </button>`
        )
        .join('')}
    </nav>
  `;
}

function bindCommon() {
  bindNav();
  get('btn-sound')?.addEventListener('click', () => {
    toggleMute();
    render();
  });
}

// ─── DASHBOARD ───
function renderDashboard() {
  const p = gameState.player;
  const fixture = gameState.playerFixture();
  const nextOpp = fixture ? (fixture.home === p.club ? fixture.away : fixture.home) : 'Season Over';
  const isHome = fixture ? fixture.home === p.club : true;
  const oppStrength = clubStrength(nextOpp);
  const strengthStars = '⭐'.repeat(Math.max(1, Math.round((oppStrength - 30) / 13)));
  const pos = gameState.leaguePosition();
  const eff = (k: keyof typeof p.skills) => gameState.getEffectiveSkill(k);
  const gearBoost = (k: keyof typeof p.skills) => eff(k) - Math.round(p.skills[k]);
  const bossWarn = gameState.relationships.boss < 45;

  app.innerHTML = `
    ${header()}
    <div class="screen dashboard">
      <div class="profile-card">
        <div class="avatar">⚽</div>
        <h2>${p.name} <span class="lvlpill">Lv ${p.level}</span></h2>
        <p>${p.position} · ${p.club} <span class="strpill">club ${clubStrength(p.club)}</span></p>
        <p class="sub">${p.nationality} · Value: $${p.value.toLocaleString()} · Peak $${p.peakValue.toLocaleString()}</p>
      </div>

      <div class="stats-row">
        <div class="stat-box"><span class="stat-val">${eff('pace')}${gearBoost('pace') ? '<i class="boost">+' + gearBoost('pace') + '</i>' : ''}</span><span class="stat-label">PAC</span></div>
        <div class="stat-box"><span class="stat-val">${eff('power')}${gearBoost('power') ? '<i class="boost">+' + gearBoost('power') + '</i>' : ''}</span><span class="stat-label">PWR</span></div>
        <div class="stat-box"><span class="stat-val">${eff('technique')}${gearBoost('technique') ? '<i class="boost">+' + gearBoost('technique') + '</i>' : ''}</span><span class="stat-label">TEC</span></div>
        <div class="stat-box"><span class="stat-val">${eff('vision')}${gearBoost('vision') ? '<i class="boost">+' + gearBoost('vision') + '</i>' : ''}</span><span class="stat-label">VIS</span></div>
        <div class="stat-box"><span class="stat-val">${eff('freeKicks')}${gearBoost('freeKicks') ? '<i class="boost">+' + gearBoost('freeKicks') + '</i>' : ''}</span><span class="stat-label">FRK</span></div>
      </div>

      ${bossWarn ? `<div class="warn-card">⚠️ The coach is unconvinced by you (Boss ${Math.round(gameState.relationships.boss)}%). Risk of being benched — train hard or impress fast.</div>` : ''}
      ${p.energy < 35 ? `<div class="warn-card">🥴 Low energy dulls your minigames. Rest or grab an energy drink before kickoff.</div>` : ''}

      <div class="next-match-card">
        <h3>Next Match — Week ${gameState.weekOfSeason}/38</h3>
        <div class="fixture">${p.club} ${isHome ? 'vs' : '@'} ${nextOpp} <span class="opp-stars">${strengthStars}</span></div>
        <button id="btn-play-match" class="btn btn-primary btn-large">▶ PLAY MATCH</button>
      </div>

      <div class="info-grid">
        <div class="info-cell">💵 Wage $${p.salary.toLocaleString()}/wk</div>
        <div class="info-cell">📣 Sponsor +$${gameState.sponsorIncome()}/wk</div>
        <div class="info-cell">⚽ ${p.goals} G · 🅰️ ${p.assists} A · 📊 ${p.appearances} Apps</div>
        <div class="info-cell">🎯 ${gameState.seasonGoals} goals this season</div>
      </div>

      <div class="news-card">
        <h3>📰 The Back Pages</h3>
        ${gameState.news.slice(0, 5).map((n) => `<div class="news-row"><span class="news-week">W${n.week}</span>${n.text}</div>`).join('') || '<p class="muted">Quiet week in the press.</p>'}
      </div>

      <div class="row-2">
        <button id="btn-save" class="btn btn-ghost">💾 Save</button>
        <button id="btn-newcareer" class="btn btn-ghost danger">🗑️ New Career</button>
      </div>
    </div>
    ${nav()}
  `;

  bindCommon();
  get('btn-play-match')?.addEventListener('click', () => {
    blip(700);
    if (gameState.seasonEnded) gameState.wrapSeason(); // trophies, offers, retirement
    gameState.currentMatch = gameState.generateMatch();
    gameState.setScreen('match');
    render();
  });
  get('btn-save')?.addEventListener('click', () => flash(gameState.save()));
  get('btn-newcareer')?.addEventListener('click', () => {
    if (confirm('Start a completely new career? Your current save will be deleted.')) {
      gameState.newGame();
      flash('A new star is born.');
      render();
    }
  });
}

// ─── CAREER ───
function renderCareer() {
  const p = gameState.player;
  app.innerHTML = `
    ${header()}
    <div class="screen career">
      <h2>📈 Career</h2>

      <div class="trophies-card">
        <h3>🏆 Trophy Room</h3>
        ${gameState.trophies.map((t) => `<div class="trophy-row">${t.kind === 'league' ? '🏆' : '🥇'} S${t.season} — ${t.detail}</div>`).join('') || '<p class="muted">The cabinet is empty. For now.</p>'}
      </div>

      <h3>League Table</h3>
      <div class="table-scroll">
      <table class="league-table">
        <tr><th>#</th><th>Team</th><th>Str</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr>
        ${gameState.leagueTable
          .map(
            (row, i) =>
              `<tr class="${row.team === p.club ? 'highlight' : ''}">
                <td>${i + 1}</td>
                <td>${row.team}</td>
                <td>${clubStrength(row.team)}</td>
                <td>${row.played}</td>
                <td>${row.won}</td>
                <td>${row.drawn}</td>
                <td>${row.lost}</td>
                <td>${row.gf - row.ga}</td>
                <td>${row.points}</td>
              </tr>`
          )
          .join('')}
      </table>
      </div>

      <h3>Recent Matches</h3>
      <div class="history-list">
        ${gameState.history
          .slice(0, 10)
          .map(
            (h) =>
              `<div class="history-row ${h.result}">
                <span>S${h.season}W${h.weekOfSeason}</span>
                <span class="result-badge">${h.result === 'benched' ? 'BENCH' : h.result.toUpperCase()}</span>
                <span>vs ${h.opponent}</span>
                <span>${h.score || '-'}</span>
                ${h.goals ? `<span>⚽${h.goals}</span>` : ''}
                <span>⭐ ${h.rating ?? '-'}</span>
                <span>+$${h.moneyDelta.toLocaleString()}</span>
              </div>`
          )
          .join('') || '<p class="muted">No matches yet.</p>'}
      </div>
    </div>
    ${nav()}
  `;
  bindCommon();
}

// ─── TRAINING ───
function renderTraining() {
  const p = gameState.player;
  app.innerHTML = `
    ${header()}
    <div class="screen training">
      <h2>💪 Training Ground</h2>
      <p class="energy-readout">Energy: <span class="energy-val">${Math.round(p.energy)}%</span></p>
      <div class="train-grid">
        ${(
          [
            ['pace', 'Pace', '⚡'],
            ['power', 'Power', '💪'],
            ['technique', 'Technique', '🎯'],
            ['vision', 'Vision', '👁️'],
            ['freeKicks', 'Free Kicks', '🌀'],
          ] as [keyof typeof p.skills, string, string][]
        )
          .map(
            ([key, label, icon]) => `
            <div class="train-card">
              <div class="train-header">${icon} ${label} <span class="stat-pill">${Math.round(p.skills[key])}</span></div>
              <div class="train-buttons">
                <button class="btn btn-train" data-skill="${key}" data-intensity="light">Light<br><small>-10 en, +1</small></button>
                <button class="btn btn-train" data-skill="${key}" data-intensity="medium">Medium<br><small>-20 en, +3</small></button>
                <button class="btn btn-train" data-skill="${key}" data-intensity="hard">Hard<br><small>-35 en, +6</small></button>
              </div>
            </div>
          `
          )
          .join('')}
      </div>
      <button id="btn-rest" class="btn btn-secondary btn-large">🛏️ Rest (+40 Energy)</button>
    </div>
    ${nav()}
  `;
  bindCommon();
  app.querySelectorAll('.btn-train').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const el = e.currentTarget as HTMLButtonElement;
      const skill = el.dataset.skill as keyof typeof p.skills;
      const intensity = el.dataset.intensity as 'light' | 'medium' | 'hard';
      const msg = gameState.train(skill, intensity);
      flash(msg);
      blip(560);
      render();
    });
  });
  get('btn-rest')?.addEventListener('click', () => {
    flash(gameState.rest());
    render();
  });
}

// ─── LIFE ───
function renderLife() {
  app.innerHTML = `
    ${header()}
    <div class="screen life">
      <h2>🍾 Lifestyle</h2>
      <div class="life-grid">
        <button id="btn-go-out" class="card-btn">
          <span class="card-icon">🍻</span>
          <span class="card-title">Go Out with Friends</span>
          <span class="card-desc">-30 Energy, +Teammates, +Partner, -Boss</span>
        </button>
        <button id="btn-date" class="card-btn">
          <span class="card-icon">🍽️</span>
          <span class="card-title">Date Night</span>
          <span class="card-desc">-25 Energy, +Partner</span>
        </button>
        <button id="btn-relax" class="card-btn">
          <span class="card-icon">📺</span>
          <span class="card-title">Chill at Home</span>
          <span class="card-desc">+10 Energy, +Partner</span>
        </button>
        <button id="btn-spa" class="card-btn">
          <span class="card-icon">🧖</span>
          <span class="card-title">Spa Recovery</span>
          <span class="card-desc">-50 Money, +60 Energy</span>
        </button>
      </div>
      <h3>Inventory</h3>
      <div class="inventory-list">
        ${Array.from(gameState.inventory.entries())
          .filter(([, count]) => count > 0)
          .map(([id, count]) => {
            const item = ITEMS.find((i) => i.id === id);
            if (!item) return '';
            return `
              <div class="inv-item">
                <span>${item.icon} ${item.name}</span>
                <span class="inv-count">x${count}</span>
                ${item.category === 'consumable' ? `<button class="btn btn-sm" data-use="${id}">Use</button>` : ''}
              </div>`;
          })
          .join('') || '<p class="muted">Inventory empty.</p>'}
      </div>
    </div>
    ${nav()}
  `;
  bindCommon();
  get('btn-go-out')?.addEventListener('click', () => {
    flash(gameState.goOut());
    render();
  });
  get('btn-date')?.addEventListener('click', () => {
    if (gameState.player.energy < 25) { flash('Too tired for a date.'); return; }
    gameState.player.energy -= 25;
    gameState.relationships.partner = Math.min(100, gameState.relationships.partner + 12);
    flash('Lovely date! +12 Partner.');
    render();
  });
  get('btn-relax')?.addEventListener('click', () => {
    gameState.player.energy = Math.min(100, gameState.player.energy + 10);
    gameState.relationships.partner = Math.min(100, gameState.relationships.partner + 5);
    flash('Netflix and chill. +10 Energy, +5 Partner.');
    render();
  });
  get('btn-spa')?.addEventListener('click', () => {
    if (gameState.player.money < 50) { flash('Too broke for a spa.'); return; }
    gameState.player.money -= 50;
    gameState.player.energy = Math.min(100, gameState.player.energy + 60);
    flash('Refreshed at the spa. +60 Energy.');
    render();
  });
  app.querySelectorAll('[data-use]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.use!;
      flash(gameState.useItem(id));
      render();
    });
  });
}

// ─── RELATIONS ───
function renderRelations() {
  const r = gameState.relationships;
  const bar = (val: number, color: string) => {
    const w = Math.round(val);
    return `<div class="rel-bar"><div class="rel-fill" style="width:${w}%;background:${color}"></div><span class="rel-text">${w}%</span></div>`;
  };
  app.innerHTML = `
    ${header()}
    <div class="screen relations">
      <h2>❤️ Relationships</h2>
      <div class="rel-card">
        <div class="rel-header"><span>👔 Boss</span><span>${Math.round(r.boss)}%</span></div>
        ${bar(r.boss, '#ef4444')}
        <p class="rel-desc">Determines team selection. Below 45% you risk the bench — train and perform.</p>
      </div>
      <div class="rel-card">
        <div class="rel-header"><span>👥 Teammates</span><span>${Math.round(r.teammates)}%</span></div>
        ${bar(r.teammates, '#3b82f6')}
        <p class="rel-desc">Feeds your team strength and simulated results. Share the ball!</p>
      </div>
      <div class="rel-card">
        <div class="rel-header"><span>📣 Fans</span><span>${Math.round(r.fans)}%</span></div>
        ${bar(r.fans, '#f59e0b')}
        <p class="rel-desc">Drives sponsor income every week. Win games, buy luxuries.</p>
      </div>
      <div class="rel-card">
        <div class="rel-header"><span>💑 Partner</span><span>${Math.round(r.partner)}%</span></div>
        ${bar(r.partner, '#ec4899')}
        <p class="rel-desc">Mental stability bonus. Don't neglect them for training!</p>
      </div>
    </div>
    ${nav()}
  `;
  bindCommon();
}

// ─── SHOP ───
function renderShop() {
  app.innerHTML = `
    ${header()}
    <div class="screen shop">
      <h2>🛒 Shop</h2>
      <div class="shop-grid">
        ${ITEMS.map((item) => {
          const owned = gameState.inventory.has(item.id) && item.category !== 'consumable';
          const canBuy = gameState.player.money >= item.price && !owned;
          return `
            <div class="shop-card ${!canBuy ? 'disabled' : ''}">
              <div class="shop-icon">${item.icon}</div>
              <div class="shop-name">${item.name}</div>
              <div class="shop-desc">${item.description}</div>
              <div class="shop-price">${owned ? '<span class="owned">✓ Owned</span>' : '$' + item.price.toLocaleString()}</div>
              <button class="btn btn-buy" data-id="${item.id}" ${!canBuy ? 'disabled' : ''}>${owned ? 'Owned' : 'Buy'}</button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    ${nav()}
  `;
  bindCommon();
  app.querySelectorAll('.btn-buy').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.id!;
      flash(gameState.buyItem(id));
      render();
    });
  });
}

// ─── CASINO ───
function renderCasino() {
  app.innerHTML = `
    ${header()}
    <div class="screen casino">
      <h2>🎰 Casino</h2>
      <p class="casino-warning">⚠️ Gambling hurts your Boss relationship if word gets out!</p>
      <div class="bet-row">
        <label>Bet: $</label>
        <input type="number" id="bet-input" value="${betAmount}" min="1" max="${gameState.player.money}">
      </div>
      <div class="casino-grid">
        <div class="casino-card">
          <h3>🎰 Slots</h3>
          <button id="btn-slots" class="btn btn-casino">SPIN</button>
          <div id="slots-result" class="casino-result"></div>
        </div>
        <div class="casino-card">
          <h3>🃏 Blackjack</h3>
          <div id="bj-hand" class="bj-hand"></div>
          <div id="bj-result" class="casino-result"></div>
          <div class="bj-controls">
            <button id="btn-hit" class="btn btn-casino">Hit</button>
            <button id="btn-stand" class="btn btn-casino">Stand</button>
            <button id="btn-new-hand" class="btn btn-casino">New Hand</button>
          </div>
        </div>
      </div>
    </div>
    ${nav()}
  `;
  bindCommon();

  const readBet = () => {
    const v = parseInt((get('bet-input') as HTMLInputElement)?.value || '10', 10);
    return isNaN(v) || v < 1 ? 10 : v;
  };

  get('btn-slots')?.addEventListener('click', () => {
    betAmount = readBet();
    const res = gameState.casinoSlots(betAmount);
    const out = get('slots-result');
    if (out) out.textContent = res.result + (res.win > 0 ? ` You won $${res.win}!` : ' You lost.');
    res.win > 0 ? cheer() : thud();
    if (Math.random() < 0.15) {
      gameState.relationships.boss = Math.max(0, gameState.relationships.boss - 10);
      flash('Boss heard about your casino visit! -10 Boss');
    }
    render();
  });

  const updateBJ = (res: { result: string; win: number; hand: number[]; finished: boolean }) => {
    const handEl = get('bj-hand');
    const resEl = get('bj-result');
    if (handEl) handEl.textContent = 'Hand: ' + (res.hand.length ? res.hand.join(', ') + ` (sum: ${res.hand.reduce((a, b) => a + b, 0)})` : '-');
    if (resEl) resEl.textContent = res.result + (res.win > 0 ? ` +$${res.win}` : '');
    if (res.finished) hand = [];
    else hand = res.hand;
  };

  get('btn-new-hand')?.addEventListener('click', () => {
    betAmount = readBet();
    hand = [];
    const res = gameState.casinoBlackjack(betAmount, 'hit', []);
    updateBJ(res);
    blip(500);
    if (Math.random() < 0.15) {
      gameState.relationships.boss = Math.max(0, gameState.relationships.boss - 10);
      flash('Boss heard about your casino visit! -10 Boss');
    }
    render();
  });
  get('btn-hit')?.addEventListener('click', () => {
    const res = gameState.casinoBlackjack(betAmount, 'hit', hand);
    updateBJ(res);
    if (res.finished) setTimeout(() => render(), 600);
  });
  get('btn-stand')?.addEventListener('click', () => {
    const res = gameState.casinoBlackjack(betAmount, 'stand', hand);
    updateBJ(res);
    if (res.finished) setTimeout(() => render(), 600);
  });
}

// ─── TRANSFERS ───
function renderTransfers() {
  const offers = gameState.pendingOffers;
  app.innerHTML = `
    ${header()}
    <div class="screen transfers">
      <h2>✍️ Transfer Window</h2>
      <p class="muted">The season is over. Your phone has not stopped ringing.</p>
      <div class="offer-list">
        ${offers
          .map(
            (o, i) => `
            <div class="offer-card">
              <div class="offer-club">${o.from} <span class="strpill">club ${o.strength}</span></div>
              <div class="offer-row">💵 Wage: <b>$${o.salary.toLocaleString()}/wk</b> <span class="muted">(now $${gameState.player.salary.toLocaleString()})</span></div>
              <div class="offer-row">📋 Fee: <b>$${o.fee.toLocaleString()}</b></div>
              <div class="offer-actions">
                <button class="btn btn-primary" data-accept="${i}">Sign</button>
              </div>
            </div>`
          )
          .join('')}
      </div>
      <button id="btn-stay" class="btn btn-ghost btn-large">💙 Reject all — stay at ${gameState.player.club}</button>
    </div>
    ${nav()}
  `;
  bindCommon();
  app.querySelectorAll('[data-accept]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const i = parseInt((e.currentTarget as HTMLElement).dataset.accept!, 10);
      cheer();
      flash(gameState.acceptOffer(i));
      render();
    });
  });
  get('btn-stay')?.addEventListener('click', () => {
    flash(gameState.rejectOffers());
    render();
  });
}

// ─── RETIRED ───
function renderRetired() {
  const p = gameState.player;
  const avgRating = gameState.seasonRatingCount ? (gameState.seasonRatingSum / gameState.seasonRatingCount).toFixed(1) : '-';
  app.innerHTML = `
    <div class="screen retired-screen">
      <h1 class="result-title">🎖️ CAREER OVER</h1>
      <p class="retired-sub">${p.name} hangs up the boots at ${p.age}, after ${p.appearances} appearances.</p>
      <div class="career-summary">
        <div class="rstat">⚽ ${p.goals} career goals</div>
        <div class="rstat">🅰️ ${p.assists} assists</div>
        <div class="rstat">💰 $${p.careerEarnings.toLocaleString()} earned</div>
        <div class="rstat">📈 Peak value $${p.peakValue.toLocaleString()}</div>
        <div class="rstat">🏆 ${gameState.trophies.length} trophies</div>
        <div class="rstat">📍 Best finish: ${gameState.careerBestFinish}${ordinal(gameState.careerBestFinish)}</div>
        <div class="rstat">⭐ Level ${p.level}</div>
        <div class="rstat">👔 Last club: ${p.club}</div>
      </div>
      <div class="trophies-card">
        <h3>🏆 Trophy Room</h3>
        ${gameState.trophies.map((t) => `<div class="trophy-row">${t.kind === 'league' ? '🏆' : '🥇'} S${t.season} — ${t.detail}</div>`).join('') || '<p class="muted">No silverware — but what a ride.</p>'}
      </div>
      <button id="btn-newcareer2" class="btn btn-primary btn-large">🌱 Start a New Career</button>
    </div>
  `;
  void avgRating;
  get('btn-newcareer2')?.addEventListener('click', () => {
    gameState.newGame();
    render();
  });
}

// ─── MATCH FLOW ───
function renderMatch() {
  const m = gameState.currentMatch;
  if (!m) { gameState.setScreen('dashboard'); render(); return; }

  app.innerHTML = `
    <div class="screen match-screen">
      <div class="match-header">
        <div class="team home">${m.homeTeam}</div>
        <div class="score">${m.homeScore} - ${m.awayScore}</div>
        <div class="team away">${m.awayTeam}</div>
      </div>
      <div class="match-context">
        <span id="match-minute">${m.events[m.currentEventIndex]?.minute || 90}'</span>
        <span id="match-rating">⭐ ${m.playerRating.toFixed(1)}</span>
      </div>
      <div id="match-canvas-wrap" class="canvas-wrap">
        <canvas id="match-canvas"></canvas>
      </div>
      <div id="match-text" class="match-text"></div>
      <div id="match-controls" class="match-controls"></div>
    </div>
  `;

  const canvas = get('match-canvas') as HTMLCanvasElement;
  matchCanvas = new MatchCanvas(canvas);
  matchCanvas.resize();

  whistle();
  processNextEvent();
}

function processNextEvent() {
  const m = gameState.currentMatch!;
  const idx = m.currentEventIndex;

  if (idx >= m.events.length) {
    finishMatchFlow();
    return;
  }

  const ev = m.events[idx];
  const textEl = get('match-text');
  const controlsEl = get('match-controls');

  if (textEl) textEl.textContent = m.benched ? `🪑 Benched. You watch from the stands as ${m.homeTeam} ${m.homeScore} - ${m.awayScore} ${m.awayTeam}.` : `${ev.minute}' — ${ev.description}`;

  if (m.benched) {
    if (controlsEl) controlsEl.innerHTML = `<button class="btn btn-primary" id="btn-next">Next ⏩</button>`;
    get('btn-next')?.addEventListener('click', () => {
      m.currentEventIndex++;
      processNextEvent();
    });
    return;
  }

  if (ev.type === 'ticker') {
    if (controlsEl) controlsEl.innerHTML = `<button class="btn btn-primary" id="btn-next">Next ⏩</button>`;
    get('btn-next')?.addEventListener('click', () => {
      m.currentEventIndex++;
      processNextEvent();
    });
  } else {
    if (controlsEl) controlsEl.innerHTML = `<p class="minigame-hint">Minigame starting...</p>`;

    setTimeout(() => {
      if (ev.type === 'pass' || ev.type === 'shoot') {
        matchCanvas?.runAimingMinigame(ev, (success, type) => {
          gameState.resolveMatchEvent(idx, success, type);
          showMinigameResult(type, () => {
            m.currentEventIndex++;
            processNextEvent();
          });
        }, m.homeTeam, m.awayTeam);
      } else if (ev.type === 'freekick') {
        matchCanvas?.runFreeKickMinigame(ev, (success, type) => {
          gameState.resolveMatchEvent(idx, success, type);
          showMinigameResult(type, () => {
            m.currentEventIndex++;
            processNextEvent();
          });
        }, m.homeTeam, m.awayTeam);
      } else if (ev.type === 'intercept') {
        matchCanvas?.runInterceptionMinigame(ev, (success, type) => {
          gameState.resolveMatchEvent(idx, success, type);
          showMinigameResult(type, () => {
            m.currentEventIndex++;
            processNextEvent();
          });
        }, m.homeTeam, m.awayTeam);
      }
    }, 400);
  }
}

function showMinigameResult(type: string, next: () => void) {
  const controlsEl = get('match-controls');
  const textEl = get('match-text');
  const messages: Record<string, string> = {
    goal: '🎯 GOAL! What a strike!',
    assist: '🅰️ Brilliant assist!',
    save: '🛡️ Great interception!',
    tackle: '🦶 Won the ball!',
    pass: '👍 Good play.',
    miss: '❌ Missed the chance.',
  };
  if (textEl) textEl.textContent = messages[type] || 'Full time soon...';
  if (controlsEl) controlsEl.innerHTML = `<button class="btn btn-primary" id="btn-next">Next ⏩</button>`;
  get('btn-next')?.addEventListener('click', () => next());
}

function finishMatchFlow() {
  const log = gameState.finishMatch();
  gameState.setScreen('match-result');
  renderMatchResult(log);
}

// ─── MATCH RESULT ───
function renderMatchResult(log?: WeekLog) {
  const m = gameState.currentMatch;
  if (!m) { gameState.setScreen('dashboard'); render(); return; }

  const p = gameState.player;
  const isWin = log?.result === 'win';
  const isDraw = log?.result === 'draw';
  const timeline = m.events.filter((e) => e.label).map((e) => `<div class="tl-row">${e.label}</div>`).join('') || '<p class="muted">A quiet afternoon for you.</p>';
  const wage = p.salary;
  const winBonus = isWin ? Math.round(p.salary * 0.5) : 0;
  const goalBonus = (log?.goals || 0) * (100 + p.level * 25);
  const assistBonus = (log?.assists || 0) * 60;
  const sponsor = gameState.sponsorIncome();

  app.innerHTML = `
    ${header()}
    <div class="screen match-result">
      <h1 class="result-title ${isWin ? 'win' : isDraw ? 'draw' : 'loss'}">
        ${log?.result === 'benched' ? '🪑 BENCHED' : isWin ? 'VICTORY' : isDraw ? 'DRAW' : 'DEFEAT'}
      </h1>
      <div class="final-score">${m.homeTeam} ${m.homeScore} — ${m.awayScore} ${m.awayTeam}</div>
      ${log?.result !== 'benched' ? `<div class="rating-badge">⭐ Match Rating: ${m.playerRating.toFixed(1)}</div>` : ''}

      <div class="timeline-card">
        <h3>⏱️ Your Highlights</h3>
        ${timeline}
      </div>

      <div class="result-stats">
        <div class="rstat">⚽ Goals this match: ${log?.goals || 0}</div>
        <div class="rstat">🅰️ Assists: ${log?.assists || 0}</div>
        <div class="rstat">🎯 Season tallies: ${gameState.seasonGoals}G ${gameState.seasonAssists}A</div>
        <div class="rstat">📈 Value: $${p.value.toLocaleString()}</div>
      </div>

      <div class="money-breakdown">
        <h3>💵 This week's pay packet</h3>
        <div class="money-row"><span>Wage</span><span>+$${wage.toLocaleString()}</span></div>
        ${winBonus ? `<div class="money-row"><span>Win bonus</span><span>+$${winBonus.toLocaleString()}</span></div>` : ''}
        ${goalBonus ? `<div class="money-row"><span>Goal bonus</span><span>+$${goalBonus.toLocaleString()}</span></div>` : ''}
        ${assistBonus ? `<div class="money-row"><span>Assist bonus</span><span>+$${assistBonus.toLocaleString()}</span></div>` : ''}
        <div class="money-row"><span>Sponsor income</span><span>+$${sponsor.toLocaleString()}</span></div>
        <div class="money-row total"><span>Total</span><span>+$${(log?.moneyDelta || 0).toLocaleString()}</span></div>
      </div>

      <div class="result-relations">
        <p>Boss: ${Math.round(gameState.relationships.boss)}% · Fans: ${Math.round(gameState.relationships.fans)}%</p>
      </div>

      ${gameState.seasonEnded ? '<p class="muted">Season complete — press Continue for the awards, the transfer window and a new fixture list.</p>' : ''}
      <button id="btn-done" class="btn btn-primary btn-large">Continue</button>
    </div>
    ${nav()}
  `;
  bindCommon();
  get('btn-done')?.addEventListener('click', () => {
    gameState.setScreen('dashboard');
    if (gameState.seasonEnded) gameState.wrapSeason(); // may switch to transfers/retired
    render();
  });
}

// ─── Helpers ───
function get(id: string) {
  return document.getElementById(id);
}

function bindNav() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const screen = (e.currentTarget as HTMLElement).dataset.screen as Screen;
      gameState.setScreen(screen);
      render();
    });
  });
}

function flash(msg: string) {
  if (!msg) return;
  const el = document.createElement('div');
  el.className = 'flash';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => {
    el.classList.add('fade');
    setTimeout(() => el.remove(), 400);
  }, 1500);
}

// ─── Init ───
if (gameState.load()) {
  flash('Career loaded!');
}
if (gameState.currentScreen === 'retired') gameState.currentScreen = 'dashboard';
render();

// PWA: register the service worker for offline play
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => { /* noop */ });
  });
}
