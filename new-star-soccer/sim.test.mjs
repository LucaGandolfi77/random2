// Headless simulation test for the New Star Soccer career engine.
// No browser needed — Node >= 23.6 strips the TS types natively.
//   node new-star-soccer/sim.test.mjs
import { GameState } from './src/state/GameState.ts';
import { CLUBS } from './src/types/index.ts';

const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};

let fail = false;
const check = (name, cond) => { if (!cond) { console.log('FAIL:', name); fail = true; } };

// ── 1. Fixture integrity: real double round-robin ──
{
  const g = new GameState();
  check('38 rounds', g.fixtures.length === 38);
  check('10 fixtures per round', g.fixtures.every((r) => r.length === 10));
  const pairs = new Map();
  for (const round of g.fixtures) {
    const seen = new Set();
    for (const f of round) {
      seen.add(f.home); seen.add(f.away);
      const key = [f.home, f.away].sort().join('|');
      pairs.set(key, (pairs.get(key) || 0) + 1);
    }
    check('each club once per round', seen.size === 20);
  }
  check('every pair exactly twice, 190 pairs', [...pairs.values()].every((v) => v === 2) && pairs.size === 190);
  const mirrored = g.fixtures[0].every((f) => g.fixtures[19].some((b) => b.home === f.away && b.away === f.home));
  check('second half mirrors first', mirrored);
}

// ── 2. One full season ──
{
  const g = new GameState();
  for (let w = 0; w < 38; w++) {
    g.currentMatch = g.generateMatch();
    const m = g.currentMatch;
    if (!m.benched) {
      m.events.forEach((ev, i) => {
        if (ev.resolved) return;
        const success = Math.random() < 0.55;
        const type = ev.type === 'shoot' || ev.type === 'freekick'
          ? (success ? 'goal' : 'miss')
          : ev.type === 'pass' ? (success ? 'assist' : 'pass')
          : (success ? 'tackle' : 'miss');
        g.resolveMatchEvent(i, success, type);
      });
    }
    g.finishMatch();
  }
  check('every club played 38', g.leagueTable.every((e) => e.played === 38));
  check('final table kept until wrap (seasonEnded)', g.seasonEnded === true);
  check('season still 1 after the 38th match', g.season === 1);
  const totalPoints = g.leagueTable.reduce((a, e) => a + e.points, 0);
  check('points sum in a realistic band', totalPoints <= 38 * 10 * 3 && totalPoints >= 38 * 10 * 2);
  const sorted = [...g.leagueTable].sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));
  check('table sorted', JSON.stringify(sorted.map((e) => e.team)) === JSON.stringify(g.leagueTable.map((e) => e.team)));
  check('player appearances 38', g.player.appearances === 38);
  check('history has 38 entries', g.history.length === 38);
  check('player scored something', g.player.goals > 0);
  check('news generated', g.news.length > 5);
  const log = g.history[0];
  check('log has opponent & money', !!log.opponent && log.moneyDelta > 0);
  g.wrapSeason();
  check('season advanced after wrap', g.season === 2 && g.weekOfSeason === 1);
  check('age grew to 17', g.player.age === 17);
  check('table reset for the new season', g.leagueTable.every((e) => e.played === 0));
  check('position valid', g.leaguePosition() >= 1 && g.leaguePosition() <= 20);
}

// ── 2b. Age decline mechanic ──
{
  const g = new GameState();
  g.player.age = 31;
  g.player.skills.pace = 60;
  g.wrapSeason();
  check('pace declines past 30', g.player.skills.pace < 60);
  check('age incremented', g.player.age === 32);
}

// ── 3. Per-match stats & pay packet ──
{
  const g = new GameState();
  g.currentMatch = g.generateMatch();
  if (g.currentMatch.benched) { g.relationships.boss = 80; g.currentMatch = g.generateMatch(); }
  const m = g.currentMatch;
  const shoot = m.events.findIndex((e) => e.type === 'shoot');
  if (shoot >= 0) g.resolveMatchEvent(shoot, true, 'goal');
  const expectedGoals = shoot >= 0 ? 1 : 0;
  const log = g.finishMatch();
  check('per-match goals tracked', log.goals === expectedGoals);
  check('money = wage + bonuses + sponsor', log.moneyDelta >= g.player.salary);
  check('season tallies match', g.seasonGoals === expectedGoals);
}

// ── 4. Long career: aging, retirement, transfers ──
{
  const g = new GameState();
  let transfers = 0;
  let retiredAt = -1;
  for (let s = 0; s < 25 && retiredAt === -1; s++) {
    if (g.currentScreen === 'transfers') {
      if (g.pendingOffers.length) { g.acceptOffer(0); transfers++; }
      else { g.rejectOffers(); }
    }
    for (let w = 0; w < 40 && g.currentScreen !== 'retired'; w++) {
      if (g.weekOfSeason > 38) break;
      g.currentMatch = g.generateMatch();
      const m = g.currentMatch;
      if (!m.benched) {
        m.events.forEach((ev, i) => {
          if (!ev.resolved) g.resolveMatchEvent(i, Math.random() < 0.6, ev.type === 'shoot' || ev.type === 'freekick' ? 'goal' : ev.type === 'pass' ? 'assist' : 'tackle');
        });
      }
      g.finishMatch();
    }
    // mirror the UI: continuing after the last match wraps the season
    if (g.seasonEnded && g.currentScreen !== 'retired') g.wrapSeason();
    if (g.currentScreen === 'retired') retiredAt = g.player.age;
  }
  check('career retired at 35', retiredAt === 35);
  check('transfers happened', transfers > 0);
  check('career earnings tracked', g.player.careerEarnings > 50000);
  check('peak value recorded', g.player.peakValue >= g.player.value);
}

// ── 5. Save / load v2 ──
{
  const g = new GameState();
  g.currentMatch = g.generateMatch();
  const m = g.currentMatch;
  if (!m.benched) {
    m.events.forEach((ev, i) => { if (!ev.resolved) g.resolveMatchEvent(i, Math.random() < 0.5, 'tackle'); });
  }
  g.finishMatch();
  const goalsBefore = g.player.goals;
  const weekBefore = g.week;
  g.save();
  const g2 = new GameState();
  const ok = g2.load();
  check('load returns true', ok);
  check('goals preserved', g2.player.goals === goalsBefore);
  check('week preserved', g2.week === weekBefore);
  check('fixtures preserved', JSON.stringify(g2.fixtures[0]) === JSON.stringify(g.fixtures[0]));
  check('screen never restored mid-match', g2.currentScreen !== 'match');
}

// ── 6. newGame resets ──
{
  const g = new GameState();
  g.addMoney(5000);
  g.player.goals = 42;
  g.newGame();
  check('newGame resets money', g.player.money === 200);
  check('newGame resets goals', g.player.goals === 0);
  check('newGame resets season', g.season === 1 && g.week === 1);
  check('newGame resets trophies', g.trophies.length === 0);
}

// ── 7. Energy modifier affects minigame thresholds ──
{
  const g = new GameState();
  g.player.energy = 100;
  const fresh = g.matchSkillModifier();
  g.player.energy = 15;
  const tired = g.matchSkillModifier();
  check('tired modifier lower than fresh', tired < fresh);
}

// ── 8. Benching when the Boss is unhappy ──
{
  const g = new GameState();
  g.relationships.boss = 10;
  let benched = false;
  for (let i = 0; i < 30 && !benched; i++) {
    g.currentMatch = g.generateMatch();
    if (g.currentMatch.benched) benched = true;
    g.finishMatch();
  }
  check('low boss eventually benches you', benched);
}

console.log(fail ? 'NSS SIM TEST FAILED' : 'NSS SIM TEST PASSED');
process.exit(fail ? 1 : 0);
