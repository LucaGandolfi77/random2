/* Headless smoke test for the RAGDUEL.IO simulation. Run: node sim.test.mjs */
import sim from './sim.js';
const { createWorld, stepWorld, W, H, FLOOR } = sim;

let failures = 0;
const ok = (cond, msg) => {
  console.log((cond ? '  ✔ ' : '  ✘ ') + msg);
  if (!cond) failures++;
};

function sane(w) {
  for (const f of w.fighters) {
    for (const p of f.pts) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return 'NaN position';
      if (p.x < -10 || p.x > W + 10 || p.y < -200 || p.y > H + 10) return 'out of bounds';
    }
    if (!Number.isFinite(f.hp)) return 'NaN hp';
  }
  return null;
}

console.log('— test 1: bot vs bot ladder duel resolves —');
{
  const w = createWorld({ playerName: 'TESTER' });
  let hits = 0, ko = null, err = null, t = 0;
  const dt = 1 / 60;
  for (let i = 0; i < 60 * 90 && w.phase !== 'over'; i++) {
    stepWorld(w, dt);
    t += dt;
    for (const ev of w.events) {
      if (ev.type === 'hit') hits++;
      if (ev.type === 'ko' && ko === null) ko = t;
    }
    w.events.length = 0;
    err = err || sane(w);
  }
  ok(!err, 'simulation stays finite & in bounds' + (err ? ` (${err})` : ''));
  ok(hits > 3, `landed hits occur (${hits} in ${t.toFixed(1)}s)`);
  ok(ko !== null, `a KO happens in reasonable time (${ko ? ko.toFixed(1) + 's' : 'never'})`);
  ok(w.phase === 'over' && w.result, 'round resolves with a result');
}

console.log('— test 2: player flings damage the enemy —');
{
  const w = createWorld({ playerName: 'TESTER' });
  const dt = 1 / 60;
  let dealt = 0, err = null;
  for (let i = 0; i < 60 * 45; i++) {
    const p = w.fighters[0], e = w.fighters[1];
    if (p.cooldown <= 0 && p.alive) {
      const dx = e.pts[1].x - p.pts[6].x, dy = e.pts[1].y - p.pts[6].y;
      const d = Math.hypot(dx, dy) || 1;
      p.pendingFling = { dx: dx / d, dy: dy / d, power: 1 };
    }
    stepWorld(w, dt);
    for (const ev of w.events) if (ev.type === 'hit' && ev.by === 0) dealt += ev.dmg;
    w.events.length = 0;
    err = err || sane(w);
  }
  ok(!err, 'aggressive player stays finite' + (err ? ` (${err})` : ''));
  ok(dealt > 30, `player deals real damage (${dealt} dmg over 45s)`);
  ok(w.fighters[1].hp < w.fighters[1].maxHp, `enemy hp dropped (${w.fighters[1].hp}/${w.fighters[1].maxHp})`);
}

console.log('— test 3: ladder progression & opponent scaling —');
{
  const w = createWorld({ playerName: 'TESTER' });
  const firstHp = w.fighters[1].maxHp;
  const firstName = w.fighters[1].name;
  w.round = 3; w.tier = 2; w.usedNames.clear();
  w.startRound();
  ok(w.fighters[1].maxHp > firstHp, `later opponents are tougher (${firstHp} → ${w.fighters[1].maxHp} hp)`);
  ok(w.fighters[1].name !== firstName, 'opponent names rotate');
  ok(w.fighters[1].brain.acc > 0.5 && w.fighters[1].brain.windup < 0.5, 'AI sharpens with rank');
}

console.log('— test 4: demo world auto-restarts —');
{
  const w = createWorld({ demo: true });
  const dt = 1 / 60;
  let restarts = 0, lastRound = w.round, err = null;
  for (let i = 0; i < 60 * 100; i++) {
    stepWorld(w, dt);
    for (const ev of w.events) if (ev.type === 'round') restarts++;
    w.events.length = 0;
    err = err || sane(w);
  }
  ok(!err, 'endless demo stays finite' + (err ? ` (${err})` : ''));
  ok(restarts >= 2, `demo loops forever (${restarts} restarts in 100s)`);
}

console.log('— test 5: 2P local versus —');
{
  const w = createWorld({ versus: true, vsNames: ['AAA', 'BBB'] });
  ok(w.versus === true, 'versus world created');
  ok(w.fighters[0].name === 'AAA' && w.fighters[1].name === 'BBB', 'custom names applied');
  ok(!w.fighters[0].brain && !w.fighters[1].brain, 'both fighters are human (no bot brains)');
  ok(w.vsTarget === 3, 'first to 3 wins');

  const dt = 1 / 60;
  let duels = 0, matchOver = false, err = null;
  for (let i = 0; i < 60 * 240 && !matchOver; i++) {
    const p1 = w.fighters[0];
    if (w.phase === 'fight' && p1.cooldown <= 0 && p1.alive) {
      const e = w.fighters[1];
      const dx = e.pts[1].x - p1.pts[6].x, dy = e.pts[1].y - p1.pts[6].y;
      const d = Math.hypot(dx, dy) || 1;
      p1.pendingFling = { dx: dx / d, dy: dy / d, power: 1 };
    }
    stepWorld(w, dt);
    for (const ev of w.events) {
      if (ev.type === 'over') {
        duels++;
        if (w.vsWins[0] >= w.vsTarget) matchOver = true;
        else { w.round++; w.startRound(); }
      }
    }
    w.events.length = 0;
    err = err || sane(w);
  }
  ok(!err, 'versus marathon stays finite' + (err ? ` (${err})` : ''));
  ok(duels >= 3, `duels completed (${duels})`);
  ok(matchOver && w.vsWins[0] >= 3, `match resolves at 3 wins (${w.vsWins[0]}–${w.vsWins[1]})`);
  ok(w.tier > 1, `arena palette rotated across duels (tier ${w.tier})`);
  w.resetMatch();
  ok(w.vsWins[0] === 0 && w.vsWins[1] === 0 && w.round === 1 && w.phase === 'intro',
    'resetMatch restores a clean state');
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
