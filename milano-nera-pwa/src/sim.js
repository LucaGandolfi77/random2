import { CHAPTER_BY_ID, CHASE, ENEMIES, LEVELS, rankFor } from './content.js';
import { FIXED_DT, PLAYER, VIEW_H, VIEW_W, WEAPONS } from './config.js';
import {
  clamp,
  circleCollides,
  distance,
  hasLineOfSight,
  moveCircle,
  nearestCover,
  normalize,
  pointInRect,
  segmentCircleT,
  segmentRectT
} from './collision.js';
import { advancePatrol, enemyDefinition, patrolTarget, seeTarget } from './ai.js';
import { makeRng, randomSeed } from './rng.js';

const TAU = Math.PI * 2;

function emit(state, event) {
  state.events.push({ ...event, time: state.time });
  if (state.events.length > 120) state.events.shift();
}

function prepareLevel(level) {
  const walls = level.walls.map((item) => ({ ...item, sight: true }));
  const props = level.props.map((item) => ({ ...item }));
  const solids = [...walls, ...props.filter((item) => item.solid)];
  const covers = props.filter((item) => item.cover);
  const signs = props.filter((item) => item.sign);
  return { ...level, walls, props, solids, covers, signs };
}

function makePlayer(x, y) {
  return {
    x,
    y,
    angle: -Math.PI / 2,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    radius: PLAYER.radius,
    speed: PLAYER.speed,
    weapon: 'pistol',
    ammo: WEAPONS.pistol.mag,
    fireCooldown: 0,
    reloadTimer: 0,
    reloading: false,
    roll: 0,
    rollCooldown: 0,
    rollAngle: 0,
    invuln: 0,
    crouched: false,
    cover: null,
    moving: false,
    walk: 0,
    molotov: 1,
    lastDamageAt: -99,
    regenTimer: 0,
    dead: false
  };
}

function makeEnemy(data, index) {
  const def = ENEMIES[data.type] || ENEMIES.thug;
  return {
    ...data,
    name: data.name || def.name,
    patrol: data.patrol ? data.patrol.map(([x, y]) => ({ x, y })) : null,
    index,
    hp: data.hp ?? def.hp,
    maxHp: data.hp ?? def.hp,
    radius: def.radius,
    state: 'idle',
    awareness: 0,
    lastSeen: null,
    fireCooldown: 0.4 + index * 0.13,
    aimTimer: def.aimTime || 0,
    attackCooldown: 0,
    burstLeft: 0,
    burstTimer: 0,
    alertTimer: 0,
    patrolIndex: 0,
    patrolWait: 0,
    flash: 0,
    dead: false,
    boss: Boolean(data.boss),
    isFinalBoss: Boolean(data.final)
  };
}

function stateBase(chapter, options, seed) {
  return {
    version: 1,
    chapterId: chapter.id,
    chapter,
    stage: options.stage || 'level',
    mode: 'normal',
    phase: 'playing',
    time: options.time || 0,
    lastDt: FIXED_DT,
    seed,
    rng: makeRng(seed),
    events: [],
    stats: {
      shots: 0,
      hits: 0,
      kills: 0,
      stealthKills: 0,
      damage: 0,
      bossKills: 0,
      deaths: options.deaths || 0
    },
    deaths: options.deaths || 0,
    alert: false,
    flags: { bossAnnounced: false },
    summary: null,
    camera: { x: 0, y: 0 },
    chase: null,
    hazards: [],
    hazardWarning: false
  };
}

function createLevelState(chapter, levelKey, options, seed) {
  const level = prepareLevel(LEVELS[levelKey]);
  const state = stateBase(chapter, options, seed);
  state.levelKey = levelKey;
  state.level = level;
  state.width = level.width;
  state.height = level.height;
  state.viewW = options.viewW || VIEW_W;
  state.viewH = options.viewH || VIEW_H;
  state.player = makePlayer(level.start.x, level.start.y);
  state.enemies = level.enemies.map(makeEnemy);
  state.boss = state.enemies.find((enemy) => enemy.boss) || null;
  state.bullets = [];
  state.molotovs = [];
  state.fires = [];
  state.pickups = (level.pickups || []).map((pickup) => ({ ...pickup, t: 0, dead: false }));
  state.hazards = (level.hazards || []).map((hazard) => ({
    ...hazard,
    time: hazard.phase || 0,
    warning: false,
    active: false,
    hit: false,
    wasWarning: false
  }));
  state.objective = {
    ...level.objective,
    done: false
  };
  state.exitOpen = false;
  state.camera.x = clamp(state.player.x - state.viewW / 2, 0, Math.max(0, state.width - state.viewW));
  state.camera.y = clamp(state.player.y - state.viewH / 2, 0, Math.max(0, state.height - state.viewH));
  emit(state, { type: 'stage', stage: state.stage, chapterId: chapter.id, title: level.title });
  return state;
}

function createChaseState(chapter, options, seed) {
  const state = stateBase(chapter, options, seed);
  state.mode = 'chase';
  state.stage = 'chase';
  state.viewW = VIEW_W;
  state.viewH = VIEW_H;
  state.camera = { x: 0, y: 0 };
  state.player = makePlayer(CHASE.width / 2, CHASE.playerY);
  state.player.hp = 3;
  state.player.maxHp = 3;
  state.enemies = [];
  state.boss = null;
  state.bullets = [];
  state.molotovs = [];
  state.fires = [];
  state.pickups = [];
  state.hazards = [];
  state.hazardWarning = false;
  state.objective = { type: 'chase', label: 'Distruggi l’auto del Bianco', done: false };
  state.exitOpen = false;
  state.chase = {
    car: {
      x: CHASE.width / 2,
      y: CHASE.playerY,
      hp: 3,
      maxHp: 3,
      cooldown: 0,
      invuln: 0,
      hitFlash: 0
    },
    enemy: {
      x: CHASE.width / 2,
      y: 84,
      hp: CHASE.enemyHp,
      maxHp: CHASE.enemyHp,
      vx: 28,
      fireCooldown: 1.4,
      hitFlash: 0,
      angle: Math.PI / 2
    },
    bullets: [],
    traffic: [],
    scroll: 0,
    spawnTimer: 1.1,
    won: false,
    winTimer: 0,
    time: 0
  };
  emit(state, { type: 'stage', stage: 'chase', chapterId: 3, title: 'Tangenziale' });
  return state;
}

export function createState(chapterId = 1, options = {}) {
  const chapter = CHAPTER_BY_ID[chapterId] || CHAPTER_BY_ID[1];
  const seed = options.seed ?? randomSeed();
  if (chapter.chase) return createChaseState(chapter, options, seed);
  return createLevelState(chapter, chapter.level, options, seed);
}

function updateCamera(state, dt) {
  if (state.mode === 'chase') return;
  const player = state.player;
  const lookX = Math.cos(player.angle) * 24;
  const lookY = Math.sin(player.angle) * 14;
  const targetX = clamp(player.x + lookX - state.viewW / 2, 0, Math.max(0, state.width - state.viewW));
  const targetY = clamp(player.y + lookY - state.viewH / 2, 0, Math.max(0, state.height - state.viewH));
  state.camera.x += (targetX - state.camera.x) * Math.min(1, dt * 7);
  state.camera.y += (targetY - state.camera.y) * Math.min(1, dt * 7);
}

function startReload(state) {
  const def = WEAPONS[state.player.weapon];
  if (!def || def.temporary || state.player.reloading || state.player.ammo >= def.mag) return;
  state.player.reloading = true;
  state.player.reloadTimer = def.reload;
  emit(state, { type: 'reload', weapon: def.id });
}

function switchWeapon(state, id, temporary = true) {
  const def = WEAPONS[id];
  if (!def) return;
  state.player.weapon = id;
  state.player.ammo = def.mag;
  state.player.reloading = false;
  state.player.reloadTimer = 0;
  emit(state, { type: 'weapon', weapon: id, name: def.name, temporary });
}

function firePlayerBullet(state) {
  const player = state.player;
  const def = WEAPONS[player.weapon];
  if (player.fireCooldown > 0 || player.reloading) return false;
  if (player.ammo <= 0) {
    if (def.temporary) switchWeapon(state, 'pistol', false);
    else startReload(state);
    emit(state, { type: 'empty', weapon: def.id });
    return false;
  }
  const pellets = def.pellets || 1;
  for (let index = 0; index < pellets; index++) {
    const lane = pellets === 1 ? 0 : (index - (pellets - 1) / 2) * (def.spread / Math.max(1, pellets - 1));
    const spread = (state.rng.next() - 0.5) * 0.018;
    const angle = player.angle + lane + spread;
    const x = player.x + Math.cos(angle) * 7;
    const y = player.y + Math.sin(angle) * 7;
    state.bullets.push({
      x,
      y,
      px: x,
      py: y,
      vx: Math.cos(angle) * def.speed,
      vy: Math.sin(angle) * def.speed,
      angle,
      radius: 1.4,
      life: 1.7,
      damage: def.damage,
      team: 'player',
      owner: player,
      bounces: def.bounces + (def.id === 'pistol' ? 1 : 0),
      dead: false,
      color: def.id === 'revolver' ? '#ffe2a2' : def.id === 'lupara' ? '#ffb56e' : '#ffd27a'
    });
    state.stats.shots++;
  }
  player.ammo--;
  player.fireCooldown = def.cooldown;
  emit(state, { type: 'shoot', weapon: def.id, x: player.x, y: player.y, angle: player.angle });
  alertNearby(state, player.x, player.y, 155);
  if (player.ammo <= 0 && def.temporary) {
    switchWeapon(state, 'pistol', false);
  }
  return true;
}

function throwMolotov(state) {
  const player = state.player;
  if (player.molotov <= 0) return false;
  const angle = player.angle;
  player.molotov--;
  state.molotovs.push({
    x: player.x + Math.cos(angle) * 7,
    y: player.y + Math.sin(angle) * 7,
    vx: Math.cos(angle) * 125,
    vy: Math.sin(angle) * 125,
    fuse: 0.72,
    dead: false,
    radius: 4
  });
  emit(state, { type: 'molotov', x: player.x, y: player.y, angle });
  return true;
}

function alertNearby(state, x, y, radius) {
  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.state === 'combat') continue;
    if (distance(x, y, enemy.x, enemy.y) <= radius) {
      enemy.awareness = Math.max(enemy.awareness, 0.75);
      enemy.state = 'alert';
      enemy.lastSeen = { x, y };
      enemy.alertTimer = 0;
    }
  }
}

function damagePlayer(state, amount, source) {
  const player = state.player;
  if (player.dead || player.invuln > 0) return false;
  player.hp = Math.max(0, player.hp - amount);
  player.lastDamageAt = state.time;
  player.regenTimer = 0;
  state.stats.damage += amount;
  emit(state, { type: 'hurt', x: player.x, y: player.y, amount, source });
  if (player.hp <= 0) {
    player.dead = true;
    state.stats.deaths++;
    state.phase = 'dead';
    emit(state, { type: 'death', x: player.x, y: player.y });
  }
  return true;
}

function dropForEnemy(state, enemy) {
  if (enemy.boss) {
    state.pickups.push({ type: 'health', x: enemy.x, y: enemy.y, t: 0, dead: false });
    return;
  }
  const roll = state.rng.next();
  if (roll < 0.16) state.pickups.push({ type: 'health', x: enemy.x, y: enemy.y, t: 0, dead: false });
  else if (roll < 0.28) state.pickups.push({ type: 'molotov', x: enemy.x, y: enemy.y, t: 0, dead: false });
  else if (roll < 0.35) state.pickups.push({ type: 'smg', x: enemy.x, y: enemy.y, t: 0, dead: false });
}

function killEnemy(state, enemy, options = {}) {
  if (enemy.dead) return;
  enemy.dead = true;
  state.stats.kills++;
  if (options.stealth) state.stats.stealthKills++;
  if (enemy.boss) state.stats.bossKills++;
  emit(state, {
    type: options.stealth ? 'takedown' : 'kill',
    x: enemy.x,
    y: enemy.y,
    boss: enemy.boss,
    name: enemyDefinition(enemy).name
  });
  if (enemy.boss) {
    emit(state, { type: 'bossDown', x: enemy.x, y: enemy.y, name: enemy.name || enemyDefinition(enemy).name });
    state.objective.done = true;
    if (state.objective.autoComplete) {
      completeChapter(state);
    } else {
      state.exitOpen = true;
      emit(state, { type: 'objective', text: `${enemy.name || 'Il boss'} è caduto. La via d’uscita è aperta.` });
    }
  } else {
    dropForEnemy(state, enemy);
  }
}

function damageEnemy(state, enemy, amount, options = {}) {
  if (enemy.dead) return;
  enemy.hp -= amount;
  enemy.flash = 0.13;
  if (options.player) state.stats.hits++;
  emit(state, { type: 'hit', x: enemy.x, y: enemy.y, crit: amount >= 3, enemy: enemy.type });
  if (enemy.hp <= 0) killEnemy(state, enemy, options);
}

function completeChapter(state) {
  if (state.phase !== 'playing') return;
  state.phase = 'clear';
  state.stats.time = state.time;
  const accuracy = state.stats.shots > 0 ? state.stats.hits / state.stats.shots : 0;
  const summary = {
    chapterId: state.chapterId,
    title: state.chapter.title,
    time: state.time,
    parTime: state.chapter.parTime,
    kills: state.stats.kills,
    stealthKills: state.stats.stealthKills,
    bossKills: state.stats.bossKills,
    accuracy,
    damage: state.stats.damage,
    deaths: state.stats.deaths,
    rank: rankFor(
      { ...state.stats, time: state.time, hits: state.stats.hits, shots: state.stats.shots },
      state.chapter,
      state.stats.deaths
    )
  };
  state.summary = summary;
  emit(state, { type: 'chapterClear', summary });
}

function attemptTakedown(state) {
  const player = state.player;
  let best = null;
  let bestDistance = PLAYER.takedownRange + 4;
  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.boss) continue;
    const d = distance(player.x, player.y, enemy.x, enemy.y);
    if (d >= bestDistance) continue;
    if (enemy.state === 'combat' || enemy.awareness >= 0.7) continue;
    const facingX = Math.cos(enemy.angle);
    const facingY = Math.sin(enemy.angle);
    const behind = facingX * (player.x - enemy.x) + facingY * (player.y - enemy.y) < -1;
    if (!behind) continue;
    best = enemy;
    bestDistance = d;
  }
  if (!best) return false;
  player.x = best.x - Math.cos(best.angle) * 7;
  player.y = best.y - Math.sin(best.angle) * 7;
  killEnemy(state, best, { stealth: true });
  emit(state, { type: 'stealth', name: enemyDefinition(best).name });
  return true;
}

function attemptVault(state) {
  const player = state.player;
  const cover = nearestCover(state.level, player.x, player.y, PLAYER.coverRange + 2);
  if (!cover) return false;
  const dx = cover.x + cover.w / 2 - player.x;
  const dy = cover.y + cover.h / 2 - player.y;
  const horizontal = Math.abs(dx) > Math.abs(dy);
  const sign = Math.sign(horizontal ? dx : dy) || 1;
  const nx = horizontal ? player.x + sign * (cover.w + 10) : player.x;
  const ny = horizontal ? player.y : player.y + sign * (cover.h + 10);
  if (nx < 4 || ny < 4 || nx > state.width - 4 || ny > state.height - 4) return false;
  if (circleCollides(nx, ny, player.radius, state.level.solids)) return false;
  player.x = nx;
  player.y = ny;
  emit(state, { type: 'vault', x: nx, y: ny });
  return true;
}

function handleAction(state) {
  if (attemptTakedown(state)) return true;
  const player = state.player;
  if (state.exitOpen && state.level.exit) {
    const exit = state.level.exit;
    if (pointInRect(player.x, player.y, {
      x: exit.x - 10,
      y: exit.y - 10,
      w: exit.w + 20,
      h: exit.h + 20
    })) {
      completeChapter(state);
      return true;
    }
  }
  if (attemptVault(state)) return true;
  return false;
}

function updatePlayer(state, intent, dt) {
  const player = state.player;
  const level = state.level;
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.rollCooldown = Math.max(0, player.rollCooldown - dt);
  player.invuln = Math.max(0, player.invuln - dt);
  player.roll = Math.max(0, player.roll - dt);
  player.flash = 0;
  if (player.reloading) {
    player.reloadTimer -= dt;
    if (player.reloadTimer <= 0) {
      player.reloading = false;
      player.ammo = WEAPONS[player.weapon].mag;
      emit(state, { type: 'reloaded', weapon: player.weapon });
    }
  }
  const aim = normalize(intent.aimX || 0, intent.aimY || 0);
  if (aim.length > 0.01) player.angle = Math.atan2(aim.y, aim.x);
  const move = normalize(intent.moveX || 0, intent.moveY || 0);
  player.moving = move.length > 0.01;
  player.cover = nearestCover(level, player.x, player.y, PLAYER.coverRange);
  player.crouched = Boolean(intent.cover && player.cover);

  if (intent.roll && player.rollCooldown <= 0 && player.roll <= 0) {
    player.roll = PLAYER.rollTime;
    player.rollCooldown = PLAYER.rollCooldown;
    player.invuln = PLAYER.rollInvuln;
    player.rollAngle = move.length > 0.01 ? Math.atan2(move.y, move.x) : player.angle;
    emit(state, { type: 'roll', x: player.x, y: player.y, angle: player.rollAngle });
  }

  let speed = player.speed;
  let angle = player.angle;
  if (player.roll > 0) {
    speed = PLAYER.rollSpeed;
    angle = player.rollAngle;
  } else if (move.length > 0.01) {
    angle = Math.atan2(move.y, move.x);
    if (player.crouched) speed *= PLAYER.coverSpeed;
  } else {
    speed = 0;
  }
  if (speed > 0) {
    moveCircle(
      player,
      Math.cos(angle) * speed * dt,
      Math.sin(angle) * speed * dt,
      level.solids,
      0,
      0,
      state.width,
      state.height
    );
    player.walk += dt * (player.roll > 0 ? 18 : speed * 0.12);
  }

  if (intent.reload) {
    if (player.weapon === 'pistol') startReload(state);
    else if (!player.reloading) switchWeapon(state, 'pistol', false);
  }
  if (intent.molotov) throwMolotov(state);
  if (intent.action) handleAction(state);
  if (intent.fire) firePlayerBullet(state);

  if (state.time - player.lastDamageAt > PLAYER.regenDelay && player.hp < player.maxHp) {
    player.regenTimer += dt;
    if (player.regenTimer >= PLAYER.regenEvery) {
      player.regenTimer = 0;
      player.hp = Math.min(player.maxHp, player.hp + 1);
      emit(state, { type: 'heal', x: player.x, y: player.y });
    }
  } else {
    player.regenTimer = 0;
  }
}

function moveEnemy(state, enemy, angle, speed, dt) {
  if (speed <= 0) return;
  moveCircle(
    enemy,
    Math.cos(angle) * speed * dt,
    Math.sin(angle) * speed * dt,
    state.level.solids,
    0,
    0,
    state.width,
    state.height
  );
}

function enemyShoot(state, enemy, angle, options = {}) {
  const def = enemyDefinition(enemy);
  const spread = options.spread ?? 0.035;
  const finalAngle = angle + (state.rng.next() - 0.5) * spread;
  const speed = options.speed ?? 185;
  const x = enemy.x + Math.cos(finalAngle) * (enemy.radius + 4);
  const y = enemy.y + Math.sin(finalAngle) * (enemy.radius + 4);
  state.bullets.push({
    x,
    y,
    px: x,
    py: y,
    vx: Math.cos(finalAngle) * speed,
    vy: Math.sin(finalAngle) * speed,
    angle: finalAngle,
    radius: 1.5,
    life: 1.8,
    damage: options.damage ?? def.damage,
    team: 'enemy',
    owner: enemy,
    bounces: 0,
    dead: false,
    color: enemy.boss ? '#ff8a62' : '#ffb07a'
  });
  emit(state, { type: 'enemyShoot', x, y, angle: finalAngle, boss: enemy.boss });
}

function updateEnemy(state, enemy, dt) {
  if (enemy.dead) return;
  const def = enemyDefinition(enemy);
  enemy.flash = Math.max(0, enemy.flash - dt);
  enemy.fireCooldown = Math.max(0, enemy.fireCooldown - dt);
  enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
  enemy.burstTimer = Math.max(0, enemy.burstTimer - dt);
  const player = state.player;
  const sees = seeTarget(state, enemy, player);
  const playerDistance = distance(enemy.x, enemy.y, player.x, player.y);

  if (def.id === 'boss' || def.id === 'finalBoss' || def.id === 'iena') {
    if (playerDistance < 210 && !enemy.dead && enemy.state !== 'combat' && hasLineOfSight(state.level, enemy.x, enemy.y, player.x, player.y)) {
      enemy.state = 'combat';
    }
  }

  if (enemy.state === 'idle') {
    const target = patrolTarget(enemy);
    if (target) {
      const d = distance(enemy.x, enemy.y, target.x, target.y);
      if (d < 5) {
        enemy.patrolWait += dt;
        if (enemy.patrolWait > 0.8) {
          enemy.patrolWait = 0;
          advancePatrol(enemy);
        }
      } else {
        const angle = Math.atan2(target.y - enemy.y, target.x - enemy.x);
        enemy.angle = angle;
        moveEnemy(state, enemy, angle, def.speed, dt);
      }
    } else if (sees) {
      enemy.state = 'combat';
    }
    if (enemy.awareness > 0.18 && enemy.state === 'idle') {
      enemy.state = 'alert';
      enemy.alertTimer = 0;
    }
  } else if (enemy.state === 'alert') {
    enemy.alertTimer += dt;
    if (sees) {
      enemy.state = 'combat';
    } else if (enemy.lastSeen) {
      const d = distance(enemy.x, enemy.y, enemy.lastSeen.x, enemy.lastSeen.y);
      if (d > 6) {
        const angle = Math.atan2(enemy.lastSeen.y - enemy.y, enemy.lastSeen.x - enemy.x);
        enemy.angle = angle;
        moveEnemy(state, enemy, angle, def.speed * 1.15, dt);
      }
    }
    if (enemy.alertTimer > 4.5) {
      enemy.state = 'idle';
      enemy.awareness = 0;
      enemy.alertTimer = 0;
      enemy.lastSeen = null;
    }
  }

  if (enemy.state === 'combat') {
    if (!sees) {
      enemy.alertTimer += dt;
      if (enemy.lastSeen) {
        const angle = Math.atan2(enemy.lastSeen.y - enemy.y, enemy.lastSeen.x - enemy.x);
        enemy.angle = angle;
        moveEnemy(state, enemy, angle, def.speed * 0.85, dt);
      }
      if (enemy.alertTimer > 5) {
        enemy.state = 'alert';
        enemy.alertTimer = 0;
      }
      return;
    }
    enemy.alertTimer = 0;
    const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    enemy.angle = angle;
    if (def.id === 'thug' || def.id === 'dog') {
      if (playerDistance > def.range * 0.7) {
        moveEnemy(state, enemy, angle, def.speed, dt);
      } else if (enemy.attackCooldown <= 0) {
        damagePlayer(state, def.damage, enemy);
        enemy.attackCooldown = def.cooldown;
      }
    } else if (def.id === 'sniper') {
      if (enemy.aimTimer > 0) {
        enemy.aimTimer -= dt;
        if (enemy.aimTimer <= 0 && enemy.fireCooldown <= 0) {
          enemyShoot(state, enemy, angle, { speed: 265, damage: def.damage, spread: 0.006 });
          enemy.fireCooldown = def.cooldown;
        }
      } else if (enemy.fireCooldown <= 0) {
        enemy.aimTimer = def.aimTime;
      }
    } else {
      const preferred = def.preferred || 90;
      const strafeAngle = angle + Math.PI / 2;
      if (playerDistance > preferred + 20) {
        moveEnemy(state, enemy, angle, def.speed, dt);
      } else if (playerDistance < preferred - 28) {
        moveEnemy(state, enemy, angle + Math.PI, def.speed * 0.8, dt);
      } else if (def.id !== 'boss' && def.id !== 'finalBoss' && def.id !== 'iena') {
        moveEnemy(state, enemy, strafeAngle, def.speed * 0.55, dt);
      }
      if (def.id === 'smg') {
        if (enemy.burstLeft > 0) {
          if (enemy.burstTimer <= 0) {
            enemyShoot(state, enemy, angle, { speed: 200, spread: 0.1 });
            enemy.burstLeft--;
            enemy.burstTimer = 0.11;
          }
        } else if (enemy.fireCooldown <= 0) {
          enemy.burstLeft = def.burst;
          enemy.fireCooldown = def.burstPause;
        }
      } else if (def.id === 'shotgunner') {
        if (enemy.fireCooldown <= 0 && playerDistance <= def.range) {
          for (let pellet = 0; pellet < (def.pellets || 3); pellet++) {
            enemyShoot(state, enemy, angle + (pellet - 1) * 0.18, { speed: 185, spread: 0.04 });
          }
          enemy.fireCooldown = def.cooldown;
        }
      } else if (enemy.fireCooldown <= 0 && playerDistance <= def.range) {
        enemyShoot(state, enemy, angle, {
          speed: def.id === 'boss' || def.id === 'finalBoss' || def.id === 'iena' ? 210 : 190,
          spread: enemy.boss ? 0.2 : 0.05
        });
        if (enemy.boss) {
          const side = state.rng.next() < 0.5 ? -1 : 1;
          enemyShoot(state, enemy, angle + side * 0.22, { speed: 205, spread: 0.03 });
        }
        enemy.fireCooldown = def.cooldown;
      }
    }
  }
}

function updateEnemies(state, dt) {
  for (const enemy of state.enemies) updateEnemy(state, enemy, dt);
  state.alert = state.enemies.some((enemy) => !enemy.dead && enemy.state === 'combat');
}

function hitSign(state, bullet, tx, ty, sign) {
  if (bullet.bounces <= 0) return false;
  bullet.bounces--;
  if (sign.axis === 'v') bullet.vx *= -1;
  else bullet.vy *= -1;
  bullet.x = tx + (sign.axis === 'v' ? (bullet.vx > 0 ? 2 : -2) : 0);
  bullet.y = ty + (sign.axis === 'h' ? (bullet.vy > 0 ? 2 : -2) : 0);
  bullet.px = bullet.x;
  bullet.py = bullet.y;
  emit(state, { type: 'ricochet', x: tx, y: ty, sign: sign.text || 'insegna' });
  return true;
}

function updateBullets(state, dt) {
  const level = state.level;
  for (const bullet of state.bullets) {
    if (bullet.dead) continue;
    bullet.px = bullet.x;
    bullet.py = bullet.y;
    const nx = bullet.x + bullet.vx * dt;
    const ny = bullet.y + bullet.vy * dt;
    bullet.life -= dt;
    if (bullet.life <= 0) {
      bullet.dead = true;
      continue;
    }

    let signHit = null;
    let signT = 2;
    for (const sign of level.signs) {
      const t = segmentRectT(bullet.x, bullet.y, nx, ny, sign);
      if (t !== null && t < signT) {
        signT = t;
        signHit = sign;
      }
    }
    let solidT = 2;
    let solidHit = null;
    for (const rect of level.solids) {
      const t = segmentRectT(bullet.x, bullet.y, nx, ny, rect);
      if (t !== null && t < solidT) {
        solidT = t;
        solidHit = rect;
      }
    }
    if (signHit && (solidT >= 2 || signT <= solidT + 0.025)) {
      const tx = bullet.x + (nx - bullet.x) * signT;
      const ty = bullet.y + (ny - bullet.y) * signT;
      if (bullet.bounces > 0) {
        hitSign(state, bullet, tx, ty, signHit);
      } else {
        bullet.dead = true;
        emit(state, { type: 'impact', x: tx, y: ty });
      }
      continue;
    }

    let targetT = 2;
    let targetHit = null;
    if (bullet.team === 'player') {
      for (const enemy of state.enemies) {
        if (enemy.dead || enemy === bullet.owner) continue;
        const t = segmentCircleT(bullet.x, bullet.y, nx, ny, enemy.x, enemy.y, enemy.radius);
        if (t !== null && t < targetT) {
          targetT = t;
          targetHit = enemy;
        }
      }
    } else {
      const player = state.player;
      if (!player.dead) {
        const t = segmentCircleT(bullet.x, bullet.y, nx, ny, player.x, player.y, player.radius);
        if (t !== null && t < targetT) {
          targetT = t;
          targetHit = player;
        }
      }
    }

    if (targetHit && targetT <= solidT + 0.01) {
      if (bullet.team === 'player') damageEnemy(state, targetHit, bullet.damage, { player: true });
      else damagePlayer(state, bullet.damage, bullet.owner);
      bullet.dead = true;
      continue;
    }
    if (solidHit && solidT <= 1) {
      bullet.dead = true;
      emit(state, { type: 'impact', x: bullet.x + (nx - bullet.x) * solidT, y: bullet.y + (ny - bullet.y) * solidT });
      continue;
    }
    bullet.x = nx;
    bullet.y = ny;
    if (bullet.x < -20 || bullet.y < -20 || bullet.x > state.width + 20 || bullet.y > state.height + 20) {
      bullet.dead = true;
    }
  }
  state.bullets = state.bullets.filter((bullet) => !bullet.dead);
}

function updateMolotovs(state, dt) {
  for (const molotov of state.molotovs) {
    if (molotov.dead) continue;
    molotov.fuse -= dt;
    molotov.x += molotov.vx * dt;
    molotov.y += molotov.vy * dt;
    if (circleCollides(molotov.x, molotov.y, 2, state.level.solids)) {
      molotov.fuse = 0;
    }
    if (molotov.fuse <= 0) {
      molotov.dead = true;
      state.fires.push({
        x: molotov.x,
        y: molotov.y,
        radius: 24,
        life: 3.1,
        tick: 0,
        dead: false
      });
      emit(state, { type: 'explosion', x: molotov.x, y: molotov.y });
    }
  }
  state.molotovs = state.molotovs.filter((molotov) => !molotov.dead);

  for (const fire of state.fires) {
    if (fire.dead) continue;
    fire.life -= dt;
    fire.tick += dt;
    if (fire.tick >= 0.5) {
      fire.tick = 0;
      for (const enemy of state.enemies) {
        if (!enemy.dead && distance(fire.x, fire.y, enemy.x, enemy.y) < fire.radius) {
          damageEnemy(state, enemy, 1, { player: true });
        }
      }
      if (distance(fire.x, fire.y, state.player.x, state.player.y) < fire.radius) {
        damagePlayer(state, 1, null);
      }
    }
    if (fire.life <= 0) fire.dead = true;
  }
  state.fires = state.fires.filter((fire) => !fire.dead);
}

function updatePickups(state) {
  const player = state.player;
  for (const pickup of state.pickups) {
    if (pickup.dead) continue;
    pickup.t += state.lastDt;
    if (distance(player.x, player.y, pickup.x, pickup.y) > 11) continue;
    pickup.dead = true;
    if (pickup.type === 'health') {
      player.hp = Math.min(player.maxHp, player.hp + 1);
      emit(state, { type: 'pickup', kind: 'health', text: 'Salute' });
    } else if (pickup.type === 'molotov') {
      player.molotov = Math.min(3, player.molotov + 1);
      emit(state, { type: 'pickup', kind: 'molotov', text: 'Molotov' });
    } else if (pickup.type === 'smg' || pickup.type === 'revolver') {
      switchWeapon(state, pickup.type, true);
      emit(state, { type: 'pickup', kind: pickup.type, text: WEAPONS[pickup.type].name });
    }
  }
  state.pickups = state.pickups.filter((pickup) => !pickup.dead);
}

function updateHazards(state, dt) {
  if (!state.hazards || state.hazards.length === 0) {
    state.hazardWarning = false;
    return;
  }
  state.hazardWarning = false;
  for (const hazard of state.hazards) {
    hazard.time = (hazard.time + dt) % hazard.period;
    hazard.warning = hazard.time < hazard.warnTime;
    hazard.active = hazard.time >= hazard.warnTime && hazard.time < hazard.warnTime + hazard.activeTime;
    if (hazard.warning) state.hazardWarning = true;
    if (hazard.warning && !hazard.wasWarning) {
      emit(state, { type: 'trainWarning', label: hazard.label || 'Treno in arrivo' });
    }
    hazard.wasWarning = hazard.warning;
    if (!hazard.active) hazard.hit = false;
    if (hazard.active && !hazard.hit) {
      const player = state.player;
      if (player.y + player.radius > hazard.y && player.y - player.radius < hazard.y + hazard.height) {
        hazard.hit = true;
        damagePlayer(state, 2, null);
        emit(state, { type: 'trainHit', x: player.x, y: player.y });
      }
    }
  }
}

function updateObjective(state) {
  const player = state.player;
  const objective = state.objective;
  if (objective.type === 'collect' && !objective.done) {
    if (distance(player.x, player.y, objective.x, objective.y) < 12) {
      objective.done = true;
      state.exitOpen = true;
      emit(state, { type: 'objective', text: 'Nastro recuperato. Raggiungi l’uscita.' });
    }
  }
  if (objective.type === 'boss' && !objective.done && state.boss && state.boss.dead) {
    objective.done = true;
    if (!objective.autoComplete) {
      state.exitOpen = true;
      emit(state, { type: 'objective', text: 'Boss eliminato. Raggiungi l’uscita.' });
    }
  }
}

export function step(state, intent = {}, dt = FIXED_DT) {
  if (!state || state.phase !== 'playing') return state;
  const frame = clamp(dt || FIXED_DT, 0.001, 0.05);
  state.lastDt = frame;
  state.time += frame;
  if (state.mode === 'chase') {
    updateChase(state, intent, frame);
    return state;
  }
  updatePlayer(state, intent, frame);
  if (state.phase !== 'playing') return state;
  updateHazards(state, frame);
  if (state.phase !== 'playing') return state;
  updateEnemies(state, frame);
  if (state.phase !== 'playing') return state;
  if (
    state.boss &&
    !state.boss.dead &&
    !state.flags.bossAnnounced &&
    distance(state.player.x, state.player.y, state.boss.x, state.boss.y) < 195
  ) {
    state.flags.bossAnnounced = true;
    emit(state, { type: 'bossIntro', name: state.boss.name || 'Il Ragioniere', boss: state.boss.type });
  }
  updateBullets(state, frame);
  updateMolotovs(state, frame);
  if (state.phase !== 'playing') return state;
  updatePickups(state);
  updateObjective(state);
  updateCamera(state, frame);
  return state;
}

function updateChase(state, intent, dt) {
  const chase = state.chase;
  const car = chase.car;
  const enemy = chase.enemy;
  const move = normalize(intent.moveX || 0, intent.moveY || 0);
  const aim = normalize(intent.aimX || 0, intent.aimY || 0);
  const aimAngle = aim.length > 0.01 ? Math.atan2(aim.y, aim.x) : -Math.PI / 2;
  car.cooldown = Math.max(0, car.cooldown - dt);
  car.invuln = Math.max(0, car.invuln - dt);
  car.hitFlash = Math.max(0, car.hitFlash - dt);
  chase.time += dt;
  chase.scroll = (chase.scroll + 110 * dt) % 24;
  car.x = clamp(car.x + move.x * CHASE.playerSpeed * dt, CHASE.roadLeft + 12, CHASE.roadRight - 12);
  car.y = clamp(car.y + move.y * CHASE.playerSpeed * 0.55 * dt, 126, CHASE.height - 20);

  if (intent.fire && car.cooldown <= 0) {
    const angle = aimAngle;
    chase.bullets.push({
      x: car.x + Math.cos(angle) * 10,
      y: car.y + Math.sin(angle) * 10,
      vx: Math.cos(angle) * 270,
      vy: Math.sin(angle) * 270,
      damage: 1,
      team: 'player',
      life: 1.4,
      dead: false
    });
    car.cooldown = 0.2;
    state.stats.shots++;
    emit(state, { type: 'chaseShoot', x: car.x, y: car.y });
  }

  enemy.x = clamp(enemy.x + Math.sin(chase.time * 0.7) * 36 * dt, CHASE.roadLeft + 20, CHASE.roadRight - 20);
  enemy.fireCooldown -= dt;
  if (enemy.fireCooldown <= 0 && !chase.won) {
    const angle = Math.atan2(car.y - enemy.y, car.x - enemy.x);
    chase.bullets.push({
      x: enemy.x + Math.cos(angle) * 14,
      y: enemy.y + Math.sin(angle) * 14,
      vx: Math.cos(angle) * 190,
      vy: Math.sin(angle) * 190,
      damage: 1,
      team: 'enemy',
      life: 2,
      dead: false
    });
    enemy.fireCooldown = CHASE.enemyFireEvery;
    emit(state, { type: 'chaseEnemyShoot', x: enemy.x, y: enemy.y });
  }

  chase.spawnTimer -= dt;
  if (chase.spawnTimer <= 0) {
    const lane = state.rng.pick([CHASE.roadLeft + 24, (CHASE.roadLeft + CHASE.roadRight) / 2, CHASE.roadRight - 24]);
    chase.traffic.push({ x: lane, y: -20, vy: CHASE.trafficSpeed, dead: false, type: state.rng.chance(0.25) ? 'truck' : 'car' });
    chase.spawnTimer = CHASE.trafficEvery * state.rng.float(0.75, 1.25);
  }

  for (const traffic of chase.traffic) {
    if (traffic.dead) continue;
    traffic.y += traffic.vy * dt;
    if (traffic.y > CHASE.height + 30) traffic.dead = true;
    if (distance(traffic.x, traffic.y, car.x, car.y) < 15 && car.invuln <= 0) {
      traffic.dead = true;
      car.hp--;
      car.invuln = 0.65;
      state.stats.damage++;
      emit(state, { type: 'crash', x: car.x, y: car.y });
      if (car.hp <= 0) {
        state.player.dead = true;
        state.player.hp = 0;
        state.stats.deaths++;
        state.phase = 'dead';
        emit(state, { type: 'death', x: car.x, y: car.y });
      }
    }
  }
  chase.traffic = chase.traffic.filter((traffic) => !traffic.dead);

  for (const bullet of chase.bullets) {
    if (bullet.dead) continue;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (bullet.life <= 0 || bullet.x < -10 || bullet.x > CHASE.width + 10 || bullet.y < -10 || bullet.y > CHASE.height + 10) {
      bullet.dead = true;
      continue;
    }
    if (bullet.team === 'player') {
      if (!chase.won && distance(bullet.x, bullet.y, enemy.x, enemy.y) < 14) {
        enemy.hp--;
        enemy.hitFlash = 0.12;
        bullet.dead = true;
        state.stats.hits++;
        emit(state, { type: 'chaseHit', x: enemy.x, y: enemy.y });
        if (enemy.hp <= 0) {
          chase.won = true;
          chase.winTimer = 1.25;
          state.stats.kills++;
          emit(state, { type: 'chaseClear', x: enemy.x, y: enemy.y });
        }
      }
      for (const traffic of chase.traffic) {
        if (traffic.dead) continue;
        if (distance(bullet.x, bullet.y, traffic.x, traffic.y) < 11) {
          traffic.dead = true;
          bullet.dead = true;
          emit(state, { type: 'chaseTraffic', x: traffic.x, y: traffic.y });
        }
      }
    } else if (car.invuln <= 0 && distance(bullet.x, bullet.y, car.x, car.y) < 11) {
      bullet.dead = true;
      car.hp--;
      car.invuln = 0.55;
      car.hitFlash = 0.2;
      state.stats.damage++;
      emit(state, { type: 'chaseHurt', x: car.x, y: car.y });
      if (car.hp <= 0) {
        state.player.dead = true;
        state.player.hp = 0;
        state.stats.deaths++;
        state.phase = 'dead';
        emit(state, { type: 'death', x: car.x, y: car.y });
      }
    }
  }
  chase.bullets = chase.bullets.filter((bullet) => !bullet.dead);
  chase.traffic = chase.traffic.filter((traffic) => !traffic.dead);

  if (chase.won) {
    enemy.y -= 10 * dt;
    chase.winTimer -= dt;
    if (chase.winTimer <= 0) completeChapter(state);
  }
}

export function setViewport(state, viewW, viewH) {
  if (!state) return state;
  state.viewW = Math.max(160, viewW || VIEW_W);
  state.viewH = Math.max(160, viewH || VIEW_H);
  if (state.mode !== 'chase' && state.width) {
    state.camera.x = clamp(state.player.x - state.viewW / 2, 0, Math.max(0, state.width - state.viewW));
    state.camera.y = clamp(state.player.y - state.viewH / 2, 0, Math.max(0, state.height - state.viewH));
  }
  return state;
}

export function getCamera(state) {
  return state.camera;
}

export function getBoss(state) {
  return state.boss && !state.boss.dead ? state.boss : null;
}

export function interactionPrompt(state) {
  if (!state || state.phase !== 'playing') return null;
  if (state.mode === 'chase') return null;
  const player = state.player;
  if (state.exitOpen && state.level.exit) {
    const exit = state.level.exit;
    if (distance(player.x, player.y, exit.x + exit.w / 2, exit.y + exit.h / 2) < 30) {
      return { key: 'E', text: 'Esci dal capitolo' };
    }
  }
  let nearTakedown = null;
  for (const enemy of state.enemies) {
    if (enemy.dead || enemy.boss) continue;
    if (distance(player.x, player.y, enemy.x, enemy.y) > PLAYER.takedownRange) continue;
    if (enemy.state === 'combat' || enemy.awareness >= 0.7) continue;
    const facingX = Math.cos(enemy.angle);
    const facingY = Math.sin(enemy.angle);
    if (facingX * (player.x - enemy.x) + facingY * (player.y - enemy.y) < -1) {
      nearTakedown = enemy;
      break;
    }
  }
  if (nearTakedown) return { key: 'E', text: 'Takedown silenzioso' };
  if (player.cover) return { key: 'Spazio', text: player.crouched ? 'In copertura' : 'Copertura' };
  return null;
}

export function drainEvents(state) {
  return state.events.splice(0);
}

export function chapterSummary(state) {
  return state.summary;
}

export function restartState(state, options = {}) {
  return createState(state.chapterId, {
    deaths: state.stats.deaths,
    viewW: state.viewW,
    viewH: state.viewH,
    ...options
  });
}
