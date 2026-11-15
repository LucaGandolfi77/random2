import {
  DAILY_OATH,
  DRAFT,
  FX,
  OATHS,
  PHYSICS,
  SHOT_COOLDOWN_BASE,
  clamp,
  launchSpeedFor,
  scoreMultiplier,
  wallTopFor,
  windMaxFor
} from './config.js';
import {
  ENEMIES,
  PICKUPS,
  PICKUP_ORDER,
  UPGRADE_BY_ID,
  bossHp,
  bossName,
  draftChoices,
  waveComposition
} from './content.js';
import { dailySeed, dateKey, makeRng, randomSeed } from './rng.js';

const TAU = Math.PI * 2;

function pushEvent(run, event) {
  run.events.push({ ...event, t: run.time });
  if (run.events.length > 80) run.events.shift();
}

function earn(run, id) {
  if (!id || run.earned.includes(id)) return false;
  run.earned.push(id);
  pushEvent(run, { type: 'achievement', id });
  return true;
}

function level(run, id) {
  return run.upgrades[id] || 0;
}

export function derived(run) {
  const twin = level(run, 'twinshot');
  const guard = level(run, 'guardian');
  const volley = level(run, 'volley');
  return {
    damage: 1 + level(run, 'broadhead'),
    cooldown: Math.max(0.12, SHOT_COOLDOWN_BASE * Math.pow(0.82, level(run, 'quickdraw'))),
    baseShots: 1 + twin,
    pierce: level(run, 'bodkin') > 0,
    comboWindow: 3 + level(run, 'battletrance') * 0.9,
    comboCap: 8 + level(run, 'battletrance') * 2,
    windFactor: Math.pow(0.5, level(run, 'windreader')),
    bullseye: 0.3 + level(run, 'sureshot') * 0.08,
    dropChance: 0.13 + level(run, 'luckycharm') * 0.04,
    executioner: 1 + level(run, 'executioner') * 0.5,
    scoreMult: scoreMultiplier(run.oath),
    guardian: guard,
    volleyLevel: volley,
    volleyCooldown: volley > 0 ? Math.max(12, 22 - volley * 3) : 0
  };
}

export function createRun(options = {}) {
  const width = Math.max(280, Number(options.width) || 390);
  const height = Math.max(420, Number(options.height) || 844);
  const daily = Boolean(options.daily);
  const oath = daily
    ? DAILY_OATH
    : OATHS[options.oath]
      ? options.oath
      : 'knight';
  const seed = options.seed ?? (daily ? dailySeed(options.date ?? new Date()) : randomSeed());
  const oathDef = OATHS[oath];
  const run = {
    version: 4,
    seed: seed >>> 0,
    daily,
    dateKey: daily ? dateKey(options.date ?? new Date()) : null,
    oath,
    width,
    height,
    wallTop: wallTopFor(height),
    phase: 'playing',
    outcome: null,
    hp: oathDef.hp,
    maxHp: oathDef.hp,
    score: 0,
    wave: 0,
    time: 0,
    hitstop: 0,
    cooldown: 0,
    volleyCooldown: 0,
    guard: 0,
    waveShield: 0,
    waveNoHit: true,
    waveTotal: 0,
    waveSpawned: 0,
    waveKilled: 0,
    bossSpawned: false,
    boss: null,
    spawnQueue: [],
    spawnT: 0,
    spawnGap: 1,
    wind: 0,
    windMax: 0,
    enemies: [],
    arrows: [],
    boulders: [],
    pickups: [],
    particles: [],
    events: [],
    earned: [],
    upgrades: {},
    fx: { multi: 0, pierce: 0, slow: 0 },
    combo: { count: 0, mult: 1, timer: 0, best: 1 },
    aim: { active: false, x: width / 2, y: height * 0.5, angle: -Math.PI / 2, power: 0.75 },
    lastAim: { angle: -Math.PI / 2, power: 0.75 },
    draft: null,
    summary: null,
    stats: {
      shots: 0,
      hits: 0,
      bullseyes: 0,
      kills: 0,
      wallHits: 0,
      damageTaken: 0,
      pickups: 0,
      bossKills: 0,
      wavesCleared: 0,
      flawlessWaves: 0,
      bestCombo: 1,
      volleys: 0
    }
  };

  run.waveRng = makeRng(seed);
  run.spawnRng = makeRng((seed ^ 0x9e3779b9) >>> 0);
  run.dropRng = makeRng((seed ^ 0x85ebca6b) >>> 0);

  startWave(run, Math.max(1, Math.min(99, Number(options.startWave) || 1)));
  return run;
}

export function startWave(run, wave) {
  run.wave = Math.max(1, Math.floor(wave));
  run.phase = 'playing';
  run.draft = null;
  run.waveNoHit = true;
  run.waveKilled = 0;
  run.waveSpawned = 0;
  run.boss = null;
  run.bossSpawned = false;
  run.enemies = [];
  run.arrows = [];
  run.boulders = [];
  run.pickups = [];
  run.combo.count = 0;
  run.combo.mult = 1;
  run.combo.timer = 0;
  run.waveShield = derived(run).guardian;
  run.guard = run.waveShield;
  run.spawnT = run.wave === 1 ? 1 : 1.35;

  const plan = waveComposition(run.waveRng, run.wave);
  run.spawnQueue = plan.types.slice();
  run.waveTotal = plan.count;
  run.windMax = windMaxFor(run.wave);
  run.wind = plan.wind;
  run.spawnGap = Math.max(0.32, 1.28 - run.wave * 0.045);

  if (run.wave >= 5) earn(run, 'wave5');
  if (run.wave >= 10) earn(run, 'wave10');
  pushEvent(run, {
    type: 'wave',
    wave: run.wave,
    boss: plan.boss,
    wind: run.wind,
    subtitle: plan.boss ? 'A warlord answers the horn.' : ''
  });
}

export function spawnEnemy(run, type, options = {}) {
  if (type === 'boss') return spawnBoss(run, options);
  const def = ENEMIES[type] || ENEMIES.slime;
  const height = run.height;
  const waveScale = 1 + Math.min(run.wave, 20) * 0.045;
  const oathScale = OATHS[run.oath].speed;
  const x = options.x ?? run.spawnRng.float(30, run.width - 30);
  const y = options.y ?? -44;
  const speed = run.spawnRng.float(def.speedMin, def.speedMax) * height * waveScale * oathScale;
  const hp = def.hp + (type === 'brute' ? Math.floor(Math.max(0, run.wave - 4) / 5) : 0);
  const enemy = {
    type,
    x,
    y,
    baseX: x,
    radius: def.radius,
    r: def.radius,
    hp,
    maxHp: hp,
    speed,
    vy: speed,
    damage: def.damage,
    points: def.points,
    t: run.spawnRng.float(0, TAU),
    phase: run.spawnRng.float(0, TAU),
    amp: def.drift ? run.width * def.drift : def.zigzag ? run.width * def.zigzag * 0.45 : 0,
    flash: 0,
    dead: false,
    isBoss: false,
    summon: options.summon || false
  };
  run.enemies.push(enemy);
  if (!options.summon) run.waveSpawned++;
  return enemy;
}

function spawnBoss(run, options = {}) {
  const hp = bossHp(run.wave, run.oath);
  const scale = 1 + Math.min(run.wave, 20) * 0.02;
  const x = options.x ?? run.width / 2;
  const boss = {
    type: 'boss',
    name: bossName(run.wave),
    x,
    y: options.y ?? -82,
    baseX: x,
    radius: 34,
    r: 34,
    hp,
    maxHp: hp,
    speed: run.height * 0.027 * scale * OATHS[run.oath].speed,
    vy: run.height * 0.027 * scale * OATHS[run.oath].speed,
    damage: 4,
    points: 240 + run.wave * 24,
    t: run.spawnRng.float(0, TAU),
    phase: run.spawnRng.float(0, TAU),
    amp: run.width * 0.06,
    flash: 0,
    dead: false,
    isBoss: true,
    boulderT: 2.8,
    summonT: 6,
    roar: 0
  };
  run.enemies.push(boss);
  run.boss = boss;
  run.bossSpawned = true;
  run.waveSpawned++;
  pushEvent(run, { type: 'boss', name: boss.name, wave: run.wave });
  return boss;
}

function spawnBoulder(run, boss) {
  const speed = run.spawnRng.float(0.16, 0.23) * run.height;
  run.boulders.push({
    x: boss.x + run.spawnRng.float(-22, 22),
    y: boss.y + boss.r * 0.6,
    vx: run.spawnRng.float(-0.035, 0.035) * run.width,
    vy: speed,
    radius: 9,
    r: 9,
    t: 0,
    dead: false
  });
}

function spawnSummon(run, boss) {
  const side = run.spawnRng.chance(0.5) ? -1 : 1;
  const slime = spawnEnemy(run, 'slime', {
    x: clamp(boss.x + side * run.spawnRng.float(20, 58), 24, run.width - 24),
    y: boss.y + 20,
    summon: true
  });
  slime.t = 0;
  pushEvent(run, { type: 'summon', x: slime.x, y: slime.y });
}

export function aimAt(run, x, y) {
  const kingX = run.width / 2;
  const kingY = run.wallTop - 26;
  let dx = x - kingX;
  let dy = y - kingY;
  if (dy > -8) dy = -8;
  let angle = Math.atan2(dy, dx);
  const minAngle = -Math.PI + 0.1;
  const maxAngle = -0.1;
  if (angle > maxAngle) angle = dx >= 0 ? maxAngle : minAngle;
  if (angle < minAngle) angle = minAngle;
  const distance = Math.hypot(dx, dy);
  const power = clamp(distance / (run.height * 0.7), 0.2, 1);
  run.aim = { active: true, x, y, angle, power };
  run.lastAim = { angle, power };
  return run.aim;
}

export function releaseAim(run) {
  run.aim.active = false;
}

export function launchArrow(run, angle, power, options = {}) {
  const kingX = run.width / 2;
  const kingY = run.wallTop - 26;
  const d = derived(run);
  const speed = options.speed ?? launchSpeedFor(run.height, power);
  const a = {
    x: options.x ?? kingX + Math.cos(angle) * 18,
    y: options.y ?? kingY + Math.sin(angle) * 18,
    px: 0,
    py: 0,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    damage: options.damage ?? d.damage,
    pierce: options.pierce ?? d.pierce,
    noGravity: Boolean(options.noGravity),
    volley: Boolean(options.volley),
    stuck: false,
    life: 0,
    dead: false,
    didHit: false,
    hit: new Set()
  };
  a.px = a.x;
  a.py = a.y;
  run.arrows.push(a);
  return a;
}

export function fire(run, angle = run.lastAim.angle, power = run.lastAim.power) {
  if (run.phase !== 'playing' || run.cooldown > 0) return false;
  const d = derived(run);
  const p = clamp(power, 0.2, 1);
  const multi = run.fx.multi > 0;
  const shots = multi ? 3 + Math.max(0, d.baseShots - 2) : d.baseShots;
  const spread = multi ? 0.055 : 0.028;
  for (let i = 0; i < shots; i++) {
    const offset = shots === 1 ? 0 : (i - (shots - 1) / 2) * spread;
    launchArrow(run, angle + offset, p);
    run.stats.shots++;
  }
  run.cooldown = d.cooldown;
  run.lastAim = { angle, power: p };
  pushEvent(run, { type: 'shoot', x: run.width / 2, y: run.wallTop - 48, power: p });
  return true;
}

export function castVolley(run) {
  if (run.phase !== 'playing') return false;
  const d = derived(run);
  if (d.volleyLevel <= 0 || run.volleyCooldown > 0) return false;
  const targets = run.enemies
    .filter((enemy) => !enemy.dead && enemy.y > -20)
    .sort((a, b) => b.y - a.y)
    .slice(0, 2 + d.volleyLevel);
  const count = 2 + d.volleyLevel;
  const kingX = run.width / 2;
  const kingY = run.wallTop - 26;
  for (let i = 0; i < count; i++) {
    const target = targets[i % Math.max(1, targets.length)];
    let angle;
    if (target) {
      angle = Math.atan2(target.y - kingY, target.x - kingX);
    } else {
      angle = -Math.PI / 2 + (i - (count - 1) / 2) * 0.13;
    }
    launchArrow(run, angle, 0.9, {
      speed: run.height * 1.18,
      noGravity: true,
      volley: true
    });
    run.stats.shots++;
  }
  run.volleyCooldown = d.volleyCooldown;
  run.stats.volleys++;
  pushEvent(run, { type: 'volley', count });
  return true;
}

function distanceToSegmentSquared(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return { distSq: (px - x1) ** 2 + (py - y1) ** 2, t: 0 };
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
  t = clamp(t, 0, 1);
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return { distSq: (px - cx) ** 2 + (py - cy) ** 2, t };
}

function resetCombo(run) {
  run.combo.count = 0;
  run.combo.mult = 1;
  run.combo.timer = 0;
}

function hitCastle(run, damage, x = run.width / 2) {
  if (run.phase !== 'playing') return;
  if (run.guard > 0) {
    run.guard--;
    run.waveShield = Math.max(0, run.guard);
    pushEvent(run, { type: 'blocked', x, y: run.wallTop });
    return;
  }
  run.hp = Math.max(0, run.hp - damage);
  run.stats.wallHits++;
  run.stats.damageTaken += damage;
  run.waveNoHit = false;
  resetCombo(run);
  run.hitstop = 0.05;
  pushEvent(run, { type: 'wallHit', x, y: run.wallTop, damage });
  if (run.hp <= 0) endRun(run, 'loss');
}

function spawnPickup(run, x, y) {
  const candidates = PICKUP_ORDER.filter((id) => id !== 'repair' || run.hp < run.maxHp);
  const id = run.dropRng.pick(candidates) || 'multishot';
  run.pickups.push({ id, x, y, t: 0, dead: false, radius: 18 });
}

function applyKill(run, enemy, crit) {
  run.stats.kills++;
  run.waveKilled++;
  const d = derived(run);
  run.combo.count++;
  run.combo.timer = d.comboWindow;
  run.combo.mult = Math.min(d.comboCap, 1 + Math.floor(run.combo.count / 2));
  run.combo.best = Math.max(run.combo.best, run.combo.mult);
  run.stats.bestCombo = Math.max(run.stats.bestCombo, run.combo.best);
  const points = Math.round(enemy.points * run.combo.mult * d.scoreMult * (crit ? 1.6 : 1));
  run.score += points;
  enemy.dead = true;
  run.hitstop = Math.max(run.hitstop, crit ? 0.055 : 0.025);
  pushEvent(run, {
    type: 'kill',
    x: enemy.x,
    y: enemy.y,
    enemy: enemy.type,
    points,
    crit,
    combo: run.combo.mult
  });

  if (enemy.isBoss) {
    run.stats.bossKills++;
    run.boss = null;
    run.hitstop = 0.11;
    earn(run, 'boss1');
    for (let i = 0; i < 3; i++) {
      spawnPickup(run, enemy.x + run.dropRng.float(-34, 34), enemy.y + run.dropRng.float(-10, 24));
    }
    pushEvent(run, { type: 'bossKill', x: enemy.x, y: enemy.y, name: enemy.name });
  } else if (run.dropRng.chance(d.dropChance)) {
    spawnPickup(run, enemy.x, enemy.y);
  }

  if (run.combo.mult >= 8) earn(run, 'combo8');
  if (run.stats.bullseyes >= 25) earn(run, 'bullseye25');
}

function hitEnemy(run, enemy, arrow, distance) {
  if (enemy.dead) return false;
  const d = derived(run);
  const crit = distance <= enemy.r * d.bullseye;
  const executioner = enemy.type === 'brute' || enemy.isBoss ? d.executioner : 1;
  const damage = arrow.damage * executioner * (crit ? 2 : 1);
  enemy.hp -= damage;
  enemy.flash = 0.12;
  enemy.y = Math.max(-80, enemy.y - 2);
  if (!arrow.didHit) {
    arrow.didHit = true;
    run.stats.hits++;
  }
  if (crit) {
    run.stats.bullseyes++;
    if (run.stats.bullseyes >= 25) earn(run, 'bullseye25');
  }
  pushEvent(run, {
    type: 'hit',
    x: enemy.x,
    y: enemy.y,
    crit,
    enemy: enemy.type
  });
  if (enemy.hp > 0) return false;
  applyKill(run, enemy, crit);
  return true;
}

function collectPickup(run, pickup) {
  pickup.dead = true;
  run.stats.pickups++;
  if (pickup.id === 'multishot') run.fx.multi = Math.max(run.fx.multi, FX.multishotTime);
  if (pickup.id === 'piercing') run.fx.pierce = Math.max(run.fx.pierce, FX.pierceTime);
  if (pickup.id === 'slow') run.fx.slow = Math.max(run.fx.slow, FX.slowTime);
  if (pickup.id === 'repair') {
    if (run.hp < run.maxHp) run.hp++;
    else run.score += 120;
  }
  pushEvent(run, {
    type: 'pickup',
    id: pickup.id,
    name: PICKUPS[pickup.id]?.name ?? pickup.id,
    x: pickup.x,
    y: pickup.y
  });
}

export function update(run, dt) {
  if (run.phase !== 'playing') return;
  const step = clamp(Number(dt) || 0, 0, 0.05);
  if (step <= 0) return;
  run.time += step;
  if (run.hitstop > 0) {
    run.hitstop = Math.max(0, run.hitstop - step);
    return;
  }

  run.cooldown = Math.max(0, run.cooldown - step);
  run.volleyCooldown = Math.max(0, run.volleyCooldown - step);
  run.fx.multi = Math.max(0, run.fx.multi - step);
  run.fx.pierce = Math.max(0, run.fx.pierce - step);
  run.fx.slow = Math.max(0, run.fx.slow - step);

  if (run.combo.timer > 0) {
    run.combo.timer = Math.max(0, run.combo.timer - step);
    if (run.combo.timer === 0) resetCombo(run);
  }

  if (run.spawnQueue.length > 0) {
    run.spawnT -= step;
    if (run.spawnT <= 0) {
      const type = run.spawnQueue.shift();
      spawnEnemy(run, type);
      run.spawnT = run.spawnGap * run.spawnRng.float(0.72, 1.28);
    }
  }

  updateEnemies(run, step);
  if (run.phase !== 'playing') return;
  updateBoulders(run, step);
  updateArrows(run, step);
  if (run.phase !== 'playing') return;
  updatePickups(run, step);
  run.enemies = run.enemies.filter((enemy) => !enemy.dead);
  run.arrows = run.arrows.filter((arrow) => !arrow.dead);
  run.boulders = run.boulders.filter((boulder) => !boulder.dead);
  run.pickups = run.pickups.filter((pickup) => !pickup.dead);
  checkWaveClear(run);
}

function updateEnemies(run, step) {
  const slow = run.fx.slow > 0 ? FX.slowFactor : 1;
  const dt = step * slow;
  for (let i = run.enemies.length - 1; i >= 0; i--) {
    const enemy = run.enemies[i];
    if (enemy.dead) continue;
    enemy.t += dt;
    enemy.flash = Math.max(0, enemy.flash - dt);

    if (enemy.isBoss) {
      enemy.y += enemy.vy * dt;
      enemy.x = enemy.baseX + Math.sin(enemy.t * 0.55) * enemy.amp;
      if (enemy.y > 36) {
        enemy.boulderT -= dt;
        enemy.summonT -= dt;
        if (enemy.boulderT <= 0) {
          spawnBoulder(run, enemy);
          enemy.boulderT = run.spawnRng.float(3.1, 4.6);
        }
        if (enemy.summonT <= 0) {
          spawnSummon(run, enemy);
          enemy.summonT = run.spawnRng.float(6.5, 9);
        }
      }
    } else {
      enemy.y += enemy.speed * dt;
      if (enemy.type === 'bat') {
        enemy.x = enemy.baseX + Math.sin(enemy.t * 2.1 + enemy.phase) * enemy.amp;
      } else if (enemy.type === 'runner') {
        enemy.x += Math.sin(enemy.t * 6 + enemy.phase) * enemy.amp * dt;
      } else if (enemy.type === 'slime') {
        enemy.x = enemy.baseX + Math.sin(enemy.t * 1.4 + enemy.phase) * enemy.amp;
      }
      enemy.x = clamp(enemy.x, enemy.r, run.width - enemy.r);
    }

    if (enemy.y >= run.wallTop - enemy.r * 0.25) {
      enemy.dead = true;
      if (enemy.isBoss) run.boss = null;
      hitCastle(run, enemy.damage, enemy.x);
      if (run.phase !== 'playing') return;
    }
  }
}

function updateBoulders(run, step) {
  for (const boulder of run.boulders) {
    if (boulder.dead) continue;
    boulder.t += step;
    boulder.vy += PHYSICS.gravity * 180 * step;
    boulder.x += boulder.vx * step;
    boulder.y += boulder.vy * step;
    if (boulder.y >= run.wallTop) {
      boulder.dead = true;
      hitCastle(run, 1, boulder.x);
      if (run.phase !== 'playing') return;
    } else if (boulder.x < -20 || boulder.x > run.width + 20 || boulder.y > run.height + 30) {
      boulder.dead = true;
    }
  }
}

function updateArrows(run, step) {
  for (const arrow of run.arrows) {
    if (arrow.dead) continue;
    if (arrow.stuck) {
      arrow.life += step;
      if (arrow.life > 1.2) arrow.dead = true;
      continue;
    }
    arrow.px = arrow.x;
    arrow.py = arrow.y;
    arrow.life += step;
    if (!arrow.noGravity) {
      arrow.vy += PHYSICS.gravity * 1000 * step;
      arrow.vx += run.wind * derived(run).windFactor * step;
    }
    arrow.x += arrow.vx * step;
    arrow.y += arrow.vy * step;
    arrow.angle = Math.atan2(arrow.vy, arrow.vx);

    if (arrow.life > 5 || arrow.x < -40 || arrow.x > run.width + 40 || arrow.y > run.height + 80) {
      arrow.dead = true;
      continue;
    }
    if (arrow.y >= run.wallTop + 4) {
      arrow.stuck = true;
      arrow.life = 0;
      arrow.x = clamp(arrow.x, 4, run.width - 4);
      arrow.y = run.wallTop + 4;
      continue;
    }

    for (const boulder of run.boulders) {
      if (boulder.dead || arrow.dead) continue;
      const hit = distanceToSegmentSquared(
        boulder.x,
        boulder.y,
        arrow.px,
        arrow.py,
        arrow.x,
        arrow.y
      );
      if (hit.distSq <= boulder.r * boulder.r) {
        boulder.dead = true;
        run.score += Math.round(30 * derived(run).scoreMult);
        pushEvent(run, { type: 'shatter', x: boulder.x, y: boulder.y });
        if (!arrow.pierce) arrow.dead = true;
      }
    }
    if (arrow.dead) continue;

    for (const enemy of run.enemies) {
      if (enemy.dead || arrow.hit.has(enemy)) continue;
      const hit = distanceToSegmentSquared(
        enemy.x,
        enemy.y,
        arrow.px,
        arrow.py,
        arrow.x,
        arrow.y
      );
      if (hit.distSq <= enemy.r * enemy.r) {
        arrow.hit.add(enemy);
        hitEnemy(run, enemy, arrow, Math.sqrt(hit.distSq));
        if (!arrow.pierce) {
          arrow.dead = true;
          break;
        }
      }
    }
    if (arrow.dead) continue;

    for (const pickup of run.pickups) {
      if (pickup.dead) continue;
      const hit = distanceToSegmentSquared(
        pickup.x,
        pickup.y,
        arrow.px,
        arrow.py,
        arrow.x,
        arrow.y
      );
      if (hit.distSq <= (pickup.radius + 8) ** 2) collectPickup(run, pickup);
    }
  }
}

function updatePickups(run, step) {
  for (const pickup of run.pickups) {
    if (pickup.dead) continue;
    pickup.t += step;
    pickup.y += 18 * step;
    const kingX = run.width / 2;
    const kingY = run.wallTop - 34;
    if (Math.hypot(pickup.x - kingX, pickup.y - kingY) < 47) collectPickup(run, pickup);
    if (pickup.y > run.height + 30) pickup.dead = true;
  }
}

function checkWaveClear(run) {
  if (run.phase !== 'playing') return;
  if (run.spawnQueue.length > 0 || run.enemies.length > 0) return;
  run.phase = 'draft';
  run.stats.wavesCleared++;
  const d = derived(run);
  for (const pickup of run.pickups) {
    if (!pickup.dead) collectPickup(run, pickup);
  }
  run.pickups = [];
  const repair = level(run, 'wallwright');
  if (repair > 0 && run.hp < run.maxHp) {
    const healed = Math.min(repair, run.maxHp - run.hp);
    run.hp += healed;
    pushEvent(run, { type: 'heal', amount: healed });
  }
  const flawless = run.waveNoHit;
  if (flawless) {
    run.stats.flawlessWaves++;
    earn(run, 'flawless');
  }
  const bonus = run.wave * DRAFT.clearBonus + (flawless ? DRAFT.flawlessBonus : 0);
  run.score += Math.round(bonus * d.scoreMult);
  const choices = draftChoices(run.waveRng, run.upgrades, DRAFT.count).map((upgrade) => upgrade.id);
  run.draft = {
    wave: run.wave,
    bonus,
    flawless,
    choices
  };
  pushEvent(run, {
    type: 'draft',
    wave: run.wave,
    bonus,
    flawless,
    choices
  });
}

export function chooseUpgrade(run, id) {
  if (run.phase !== 'draft' || !run.draft) return false;
  if (!run.draft.choices.includes(id)) return false;
  const def = UPGRADE_BY_ID[id];
  if (!def) return false;
  const current = level(run, id);
  if (current >= def.max) return false;
  run.upgrades[id] = current + 1;
  if (id === 'bounty') run.score += 250;
  run.draft = null;
  startWave(run, run.wave + 1);
  return true;
}

export function skipDraft(run) {
  if (run.phase !== 'draft' || !run.draft) return false;
  run.score += DRAFT.skipScore;
  run.draft = null;
  startWave(run, run.wave + 1);
  return true;
}

export function endRun(run, reason = 'quit') {
  if (run.phase === 'over') return;
  run.phase = 'over';
  run.outcome = reason;
  run.summary = getSummary(run);
  pushEvent(run, { type: 'gameover', reason, score: run.score, wave: run.wave });
  earn(run, 'first_stand');
}

export function getSummary(run) {
  const accuracy = run.stats.shots > 0 ? Math.min(1, run.stats.hits / run.stats.shots) : 0;
  return {
    score: Math.round(run.score),
    wave: run.wave,
    kills: run.stats.kills,
    accuracy,
    bullseyes: run.stats.bullseyes,
    bestCombo: run.combo.best,
    bossKills: run.stats.bossKills,
    durationMs: Math.round(run.time * 1000),
    outcome: run.outcome || 'quit',
    oath: run.oath,
    daily: run.daily,
    dateKey: run.dateKey,
    hp: run.hp,
    maxHp: run.maxHp,
    wavesCleared: run.stats.wavesCleared,
    flawlessWaves: run.stats.flawlessWaves
  };
}

export function jumpToWave(run, wave) {
  const target = Math.max(1, Math.min(99, Math.floor(Number(wave) || 1)));
  run.enemies = [];
  run.arrows = [];
  run.boulders = [];
  run.pickups = [];
  run.spawnQueue = [];
  run.boss = null;
  run.combo.count = 0;
  run.combo.mult = 1;
  run.combo.timer = 0;
  run.hp = run.maxHp;
  run.phase = 'playing';
  startWave(run, target);
  return true;
}

export function resizeRun(run, width, height) {
  const nextWidth = Math.max(280, Number(width) || run.width);
  const nextHeight = Math.max(420, Number(height) || run.height);
  const sx = nextWidth / run.width;
  const sy = nextHeight / run.height;
  run.width = nextWidth;
  run.height = nextHeight;
  run.wallTop = wallTopFor(nextHeight);
  for (const enemy of run.enemies) {
    enemy.x *= sx;
    enemy.y *= sy;
    enemy.baseX *= sx;
    enemy.amp *= sx;
  }
  for (const arrow of run.arrows) {
    arrow.x *= sx;
    arrow.y *= sy;
    arrow.px *= sx;
    arrow.py *= sy;
  }
  for (const boulder of run.boulders) {
    boulder.x *= sx;
    boulder.y *= sy;
  }
  for (const pickup of run.pickups) {
    pickup.x *= sx;
    pickup.y *= sy;
  }
  run.aim.x *= sx;
  run.aim.y *= sy;
  run.aim.active = false;
}

export function drainEvents(run) {
  return run.events.splice(0);
}

export function comboProgress(run) {
  const d = derived(run);
  return d.comboWindow > 0 ? clamp(run.combo.timer / d.comboWindow, 0, 1) : 0;
}

export function volleyReady(run) {
  const d = derived(run);
  if (d.volleyLevel <= 0) return false;
  return run.volleyCooldown <= 0;
}

export function waveProgress(run) {
  if (run.waveTotal <= 0) return 0;
  const remaining = run.spawnQueue.length + run.enemies.length;
  return clamp(1 - remaining / run.waveTotal, 0, 1);
}

export { TAU };
