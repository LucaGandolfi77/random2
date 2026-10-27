/*
 * DIAMOND POLY '99 · Main Game Controller, State Machine & Touch Input
 * --------------------------------------------------------------------
 * Modes:
 *   - "match": 3-Inning Pennant Match (swing, sprint, advance, slide!)
 *   - "derby": Home Run Derby (10 outs to launch moonshots)
 *   - "clutch": 9th Inning Walk-off Scenario (bases loaded, 2 outs, down by 2)
 */
import CONFIG from "./config.js";
import { loadSave, writeSave, recordGameRun } from "./storage.js";
import {
  FIELDER_HOME_POS,
  BASE_COORDS,
  createPitch,
  samplePitchPos,
  evaluateContact,
  stepBallPhysics,
  lerpBasePos
} from "./physics.js";
import { initRenderer, renderFrame } from "./render.js";
import {
  sfxPitchWhoosh,
  sfxSwingMiss,
  sfxBatCrack,
  sfxMittPop,
  sfxStep,
  sfxSlide,
  sfxOrganCharge,
  sfxCrowdCheer,
  sfxUmpireOut
} from "./audio.js";

const save = loadSave();

const state = {
  mode: save.selectedMode || "match",
  oppTeamId: save.selectedTeam || "tokyo",
  skyKey: save.selectedSky || "day",
  batId: save.selectedBat || "ash",

  // Match scoreboard
  inning: 1,
  maxInnings: 3,
  balls: 0,
  strikes: 0,
  outs: 0,
  homeRuns: 0,
  awayRuns: 0,
  derbyHrs: 0,
  sessionStart: Date.now(),

  // Phase: "menu" | "ready" | "windup" | "pitch" | "in_play" | "homerun" | "gameover"
  phase: "menu",
  phaseTimer: 0,
  clock: 0,

  // Batting & Aiming
  stance: "contact",
  aimX: 0,
  aimZ: 0.98,
  charging: false,
  swung: false,
  swingAnim: 0,
  currentPitch: null,

  // Ball in 3D space
  ball: {
    visible: false,
    active: false,
    x: 0, y: 18.44, z: 1.5,
    vx: 0, vy: 0, vz: 0,
    bounced: false,
    overWall: false,
    isHomer: false,
    trail: [],
    holder: null,
    throwTargetBase: null
  },

  // Active baserunners: array of { progress: 0..4, targetBase: 1..4, speedBonus: 0, sliding: false, slideTimer: 0, safeAtBase: false }
  basesOccupied: [false, false, false], // 1B, 2B, 3B
  runners: [],
  sprintBoost: 0.5,

  // 9 Defensive fielders
  fielders: FIELDER_HOME_POS.map((f) => ({ ...f, Moving: false, heading: Math.PI })),
  particles: []
};

function $(id) { return document.getElementById(id); }

function spawnParticles(x, y, z, color, count = 14, speed = 7) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = (0.3 + Math.random() * 0.7) * speed;
    state.particles.push({
      x, y, z,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      vz: 2 + Math.random() * sp,
      size: 4 + Math.random() * 5,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 1.0,
      color
    });
  }
}

function showCallout(mainText, subText = "", dur = 1750) {
  const box = $("callout");
  const m = $("callout-main");
  const s = $("callout-sub");
  if (!box || !m || !s) return;
  m.textContent = mainText;
  s.textContent = subText;
  box.classList.remove("hidden");
  clearTimeout(showCallout._timer);
  showCallout._timer = setTimeout(() => {
    box.classList.add("hidden");
  }, dur);
}

function resetFielders() {
  state.fielders = FIELDER_HOME_POS.map((f) => ({
    ...f,
    Moving: false,
    heading: Math.PI
  }));
}

function syncRunnersFromOccupancy() {
  state.runners = [];
  for (let b = 0; b < 3; b++) {
    if (state.basesOccupied[b]) {
      state.runners.push({
        progress: b + 1,
        targetBase: b + 1,
        speedBonus: 0,
        sliding: false,
        slideTimer: 0
      });
    }
  }
}

function updateOccupancyFromRunners() {
  state.basesOccupied = [false, false, false];
  state.runners.forEach((r) => {
    const b = Math.round(r.progress);
    if (b >= 1 && b <= 3) state.basesOccupied[b - 1] = true;
  });
}

function updateHUD() {
  const opp = CONFIG.teams.find((t) => t.id === state.oppTeamId) || CONFIG.teams[0];
  $("away-name").textContent = opp.abbr;
  $("away-dot").style.background = opp.primary;
  $("home-dot").style.background = "#22c55e";
  $("away-runs").textContent = state.mode === "derby" ? state.outs : state.awayRuns;
  $("home-runs").textContent = state.mode === "derby" ? state.derbyHrs : state.homeRuns;

  if (state.mode === "derby") {
    $("sb-half").textContent = "DERBY";
    $("sb-mode-tag").textContent = "10 OUTS";
  } else {
    $("sb-half").textContent = "▼" + state.inning;
    $("sb-mode-tag").textContent = state.mode === "clutch" ? "9TH INN" : state.maxInnings + " INN";
  }

  const setDots = (id, count) => {
    const el = $(id);
    if (!el) return;
    Array.from(el.children).forEach((d, idx) => {
      d.classList.toggle("on", idx < count);
    });
  };
  setDots("balls-dots", state.balls);
  setDots("strikes-dots", state.strikes);
  setDots("outs-dots", state.outs % 3);

  $("hud-b1").classList.toggle("on", !!state.basesOccupied[0]);
  $("hud-b2").classList.toggle("on", !!state.basesOccupied[1]);
  $("hud-b3").classList.toggle("on", !!state.basesOccupied[2]);

  const inPlay = state.phase === "in_play";
  $("batting-controls").classList.toggle("hidden", inPlay);
  $("running-controls").classList.toggle("hidden", !inPlay);
}

function updateModalUI() {
  $("wallet-stars").textContent = save.stars;
  $("stat-hrs").textContent = save.hrs;
  $("stat-hits").textContent = save.hits;
  $("stat-longest").textContent = save.longestFt + " ft";
  $("stat-sb").textContent = save.slides;
  $("stat-wins").textContent = save.wins;

  const teamSel = $("team-select");
  if (teamSel && !teamSel.options.length) {
    CONFIG.teams.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = `${t.name} (${t.abbr})`;
      teamSel.appendChild(opt);
    });
  }
  if (teamSel) teamSel.value = state.oppTeamId;

  const skySel = $("sky-select");
  if (skySel) skySel.value = state.skyKey;

  const batSel = $("bat-select");
  if (batSel) {
    batSel.innerHTML = "";
    CONFIG.bats.forEach((b) => {
      const unlocked = save.unlockedBats.includes(b.id) || save.stars >= b.cost;
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = unlocked
        ? `${b.name} (PWR x${b.power.toFixed(2)})`
        : `🔒 ${b.name} (${b.cost}⭐)`;
      batSel.appendChild(opt);
    });
    batSel.value = state.batId;
  }
}

function startNewGame() {
  state.mode = save.selectedMode || "match";
  state.oppTeamId = $("team-select").value || "tokyo";
  state.skyKey = $("sky-select").value || "day";
  const chosenBat = $("bat-select").value || "ash";
  const batObj = CONFIG.bats.find((b) => b.id === chosenBat) || CONFIG.bats[0];
  if (!save.unlockedBats.includes(batObj.id)) {
    if (save.stars >= batObj.cost) {
      save.stars -= batObj.cost;
      save.unlockedBats.push(batObj.id);
    }
  }
  if (save.unlockedBats.includes(batObj.id)) {
    state.batId = batObj.id;
    save.selectedBat = batObj.id;
  }
  save.selectedTeam = state.oppTeamId;
  save.selectedSky = state.skyKey;
  writeSave(save);

  state.balls = 0;
  state.strikes = 0;
  state.outs = 0;
  state.derbyHrs = 0;
  state.sessionStart = Date.now();

  if (state.mode === "clutch") {
    state.inning = 9;
    state.maxInnings = 9;
    state.awayRuns = 4;
    state.homeRuns = 2;
    state.outs = 2;
    state.basesOccupied = [true, true, true]; // Bases loaded!
    sfxOrganCharge();
    showCallout("BOTTOM 9TH · BASES LOADED!", "2 OUTS · DOWN 4–2 · DRIVE THEM HOME!", 2400);
  } else if (state.mode === "derby") {
    state.inning = 1;
    state.awayRuns = 0;
    state.homeRuns = 0;
    state.basesOccupied = [false, false, false];
    showCallout("HOME RUN DERBY!", "10 OUTS · SWING FOR THE BLEACHERS!", 2000);
  } else {
    state.inning = 1;
    state.maxInnings = 3;
    state.awayRuns = Math.floor(Math.random() * 2);
    state.homeRuns = 0;
    state.basesOccupied = [false, false, false];
    sfxOrganCharge();
    showCallout("PLAY BALL!", "SWING THE BAT & SPRINT THE BASES!", 1900);
  }

  $("menu-modal").classList.add("hidden");
  $("btn-resume-game").classList.remove("hidden");
  prepareNextPitch();
}

function prepareNextPitch() {
  resetFielders();
  syncRunnersFromOccupancy();
  state.swung = false;
  state.swingAnim = 0;
  state.ball.visible = true;
  state.ball.active = false;
  state.ball.x = -0.18;
  state.ball.y = 18.0;
  state.ball.z = 1.85;
  state.ball.trail = [];
  state.ball.holder = null;
  state.ball.throwTargetBase = null;
  state.phase = "windup";
  state.phaseTimer = 0.85;
  $("pitch-type-label").textContent = "WINDUP";
  $("pitch-mph-label").textContent = "-- MPH";
  updateHUD();
}

function launchPitch() {
  const opp = CONFIG.teams.find((t) => t.id === state.oppTeamId) || CONFIG.teams[0];
  state.currentPitch = createPitch(opp.rating);
  state.phase = "pitch";
  $("pitch-type-label").textContent = state.currentPitch.spec.name;
  $("pitch-mph-label").textContent = state.currentPitch.mph + " MPH";
  sfxPitchWhoosh();
}

function handleWalk() {
  showCallout("BALL FOUR · TAKE YOUR BASE!", "WALK TO 1ST BASE", 1600);
  state.balls = 0;
  state.strikes = 0;
  if (state.basesOccupied[0] && state.basesOccupied[1] && state.basesOccupied[2]) {
    state.homeRuns++;
  } else if (state.basesOccupied[0] && state.basesOccupied[1]) {
    state.basesOccupied[2] = true;
  } else if (state.basesOccupied[0]) {
    state.basesOccupied[1] = true;
  } else {
    state.basesOccupied[0] = true;
  }
  checkGameProgress();
}

function registerOut(reason = "OUT!") {
  sfxUmpireOut();
  state.outs++;
  state.balls = 0;
  state.strikes = 0;
  showCallout(reason, `${state.outs} OUT`, 1600);
  checkGameProgress();
}

function checkGameProgress() {
  updateHUD();
  // Walk-off win check in Match or Clutch mode
  if (state.mode !== "derby" && state.inning >= state.maxInnings && state.homeRuns > state.awayRuns) {
    finishGame(true, "WALK-OFF VICTORY! 🏆");
    return;
  }

  if (state.mode === "derby") {
    if (state.outs >= 10) {
      finishGame(true, `DERBY COMPLETE! ${state.derbyHrs} HOME RUNS!`);
      return;
    }
    setTimeout(prepareNextPitch, 1100);
    return;
  }

  if (state.outs >= 3) {
    state.outs = 0;
    state.basesOccupied = [false, false, false];
    if (state.inning >= state.maxInnings) {
      if (state.homeRuns === state.awayRuns) {
        // Extra innings!
        state.inning++;
        state.awayRuns += Math.random() < 0.45 ? 1 : 0;
        showCallout(`EXTRA INNINGS · INNING ${state.inning}`, `SCORE ${state.homeRuns}–${state.awayRuns}`, 2000);
        setTimeout(prepareNextPitch, 1400);
      } else {
        const won = state.homeRuns > state.awayRuns;
        finishGame(won, won ? "BALLGAME · YOU WIN! 🏆" : "FINAL OUT · TOUGH LOSS");
      }
      return;
    }
    state.inning++;
    // Simulate opponent top of the inning
    const oppScored = Math.random() < 0.42 ? 1 : 0;
    state.awayRuns += oppScored;
    showCallout(
      `INNING ${state.inning}`,
      oppScored ? `OPPONENT SCORED 1 RUN (${state.homeRuns}–${state.awayRuns})` : `SHUTOUT INNING! (${state.homeRuns}–${state.awayRuns})`,
      1900
    );
    setTimeout(prepareNextPitch, 1400);
    return;
  }

  setTimeout(prepareNextPitch, 1100);
}

function finishGame(won, headline) {
  state.phase = "gameover";
  save.games++;
  if (won) {
    save.wins++;
    save.stars += 25;
    sfxCrowdCheer();
  } else {
    save.stars += 8;
  }
  writeSave(save);
  recordGameRun(
    state.mode === "derby" ? state.derbyHrs : state.homeRuns,
    won ? "win" : "loss",
    Date.now() - state.sessionStart,
    { mode: state.mode, hrs: save.hrs }
  );
  showCallout(headline, `EARNED +${won ? 25 : 8} ⭐ STUBS`, 2600);
  setTimeout(() => {
    updateModalUI();
    $("btn-resume-game").classList.add("hidden");
    $("menu-modal").classList.remove("hidden");
  }, 2400);
}

/* Trigger player bat swing! */
function triggerSwing() {
  if (state.phase !== "pitch" || state.swung || !state.currentPitch) return;
  state.swung = true;
  state.swingAnim = 0.01;

  const batSpec = CONFIG.bats.find((b) => b.id === state.batId) || CONFIG.bats[0];
  const res = evaluateContact(state.currentPitch, state.aimX, state.aimZ, state.stance, batSpec);

  if (!res.hit) {
    sfxSwingMiss();
    state.strikes++;
    if (state.strikes >= 3) {
      if (state.mode === "derby") {
        registerOut("SWING & A MISS · OUT!");
      } else {
        registerOut("STRIKE THREE · SWINGING!");
      }
    } else {
      showCallout(res.reason, `COUNT ${state.balls}–${state.strikes}`, 1200);
      setTimeout(prepareNextPitch, 950);
    }
    return;
  }

  // Contact made!
  const isAlloy = state.batId !== "ash";
  sfxBatCrack(0.85 + res.quality * 0.5, isAlloy);

  const pos = samplePitchPos(state.currentPitch);
  spawnParticles(pos.x, pos.y, pos.z, "#fde047", 14, 9);

  if (res.foul) {
    if (state.strikes < 2) state.strikes++;
    showCallout("FOUL BALL!", `${res.exitMph} MPH EXIT VELO · COUNT ${state.balls}–${state.strikes}`, 1300);
    state.ball.active = true;
    state.ball.x = pos.x; state.ball.y = pos.y; state.ball.z = pos.z;
    state.ball.vx = res.vx; state.ball.vy = res.vy; state.ball.vz = res.vz;
    state.phase = "homerun"; // let camera watch foul flight briefly
    setTimeout(prepareNextPitch, 1250);
    return;
  }

  // Fair ball in play!
  state.balls = 0;
  state.strikes = 0;
  state.ball.active = true;
  state.ball.bounced = false;
  state.ball.overWall = false;
  state.ball.isHomer = res.quality > 0.84 && res.launchDeg >= 20 && res.launchDeg <= 38;
  state.ball.x = pos.x;
  state.ball.y = pos.y;
  state.ball.z = pos.z;
  state.ball.vx = res.vx;
  state.ball.vy = res.vy;
  state.ball.vz = res.vz;
  state.ball.holder = null;
  state.ball.throwTargetBase = null;

  // Add batter as runner from Home (0) -> 1st Base (1), and advance forced runners!
  syncRunnersFromOccupancy();
  state.runners.forEach((r) => {
    r.targetBase = Math.min(4, Math.floor(r.progress) + 1);
  });
  state.runners.unshift({
    progress: 0.02,
    targetBase: 1,
    speedBonus: 0,
    sliding: false,
    slideTimer: 0
  });

  state.sprintBoost = 0.55;
  state.phase = "in_play";
  $("runner-status").textContent = `FAIR BALL (${res.exitMph} MPH) · TAP SPRINT!`;
  updateHUD();
}

/* Step active play: ball flight, AI fielders, throws, and user baserunning */
function stepInPlay(dt) {
  // 1. Step 3D ball physics
  const evt = stepBallPhysics(state.ball, dt);
  if (state.ball.visible) {
    state.ball.trail.push([state.ball.x, state.ball.y, state.ball.z]);
    if (state.ball.trail.length > 18) state.ball.trail.shift();
  }

  if (evt && evt.event === "homerun") {
    // Towering Home Run!
    sfxCrowdCheer();
    save.hrs++;
    save.hits++;
    save.stars += 10;
    if (evt.distanceFt > save.longestFt) save.longestFt = evt.distanceFt;
    writeSave(save);

    const runsScored = state.runners.length;
    state.homeRuns += runsScored;
    state.derbyHrs++;
    state.basesOccupied = [false, false, false];
    state.runners = [];
    state.phase = "homerun";

    // Fireworks at outfield scoreboard!
    spawnParticles(-12, 118, 16, "#fbbf24", 24, 14);
    spawnParticles(12,  118, 16, "#38bdf8", 24, 14);
    spawnParticles(0,   122, 20, "#ec4899", 24, 14);

    const label = runsScored === 4 ? "GRAND SLAM HOME RUN! 🎆" : `HOME RUN! (${runsScored} RUN${runsScored > 1 ? "S" : ""})`;
    showCallout(label, `${evt.distanceFt} FT BLAST · +10 ⭐`, 2300);
    setTimeout(checkGameProgress, 1900);
    return;
  }

  // 2. Decay sprint boost slightly so tapping SPRINT pumps speed
  state.sprintBoost = Math.max(0.2, state.sprintBoost - dt * 0.25);
  $("sprint-fill").style.width = Math.round(state.sprintBoost * 100) + "%";

  // 3. Move Baserunners toward their target bases
  const baseSpeed = (0.28 + state.sprintBoost * 0.16); // bases per second
  for (let i = state.runners.length - 1; i >= 0; i--) {
    const r = state.runners[i];
    if (r.slideTimer > 0) {
      r.slideTimer -= dt;
      if (r.slideTimer <= 0) r.sliding = false;
    }
    const slideBoost = r.sliding ? 1.28 : 1.0;
    const diff = r.targetBase - r.progress;
    if (Math.abs(diff) > 0.015) {
      const step = Math.sign(diff) * baseSpeed * slideBoost * dt;
      if (Math.abs(step) >= Math.abs(diff)) {
        r.progress = r.targetBase;
      } else {
        r.progress += step;
      }
    } else {
      r.progress = r.targetBase;
    }

    // Did runner cross Home Plate (progress >= 3.98)?
    if (r.progress >= 3.98) {
      state.runners.splice(i, 1);
      state.homeRuns++;
      save.stars += 4;
      writeSave(save);
      sfxCrowdCheer();
      spawnParticles(0, 0, 0.5, "#22c55e", 18, 8);
      showCallout("RUN SCORES! ⚾", `SCORE ${state.homeRuns}–${state.awayRuns}`, 1400);
      updateHUD();
    }
  }

  // 4. AI Fielders chase ball or throw to lead runner's target base
  if (!state.ball.holder && state.ball.throwTargetBase === null) {
    // Find nearest fielder to ball
    let nearest = null;
    let bestDist = Infinity;
    state.fielders.forEach((f) => {
      const d = Math.hypot(f.x - state.ball.x, f.y - state.ball.y);
      if (d < bestDist) {
        bestDist = d;
        nearest = f;
      }
    });

    if (nearest) {
      const dx = state.ball.x - nearest.x;
      const dy = state.ball.y - nearest.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.5) {
        const fSpeed = 7.4; // m/s
        nearest.x += (dx / dist) * fSpeed * dt;
        nearest.y += (dy / dist) * fSpeed * dt;
        nearest.heading = Math.atan2(dx, dy);
        nearest.Moving = true;
      }

      // Catch / Pickup check
      if (dist < 1.85 && state.ball.z < 2.3) {
        if (!state.ball.bounced && state.ball.y > 6.0) {
          // Caught on the fly!
          sfxMittPop();
          if (state.mode === "derby") {
            registerOut("FLY OUT · NO HOME RUN");
          } else {
            registerOut(`CAUGHT BY ${nearest.role}!`);
          }
          return;
        }

        // Fielded off the turf! Fire throw to lead runner's target base
        state.ball.holder = nearest;
        state.ball.active = false;
        sfxMittPop();

        if (state.mode === "derby") {
          registerOut("GROUND BALL · NO HOME RUN");
          return;
        }

        // Pick lead runner who is not yet safe on a base
        const activeRunner = state.runners.find((r) => Math.abs(r.progress - Math.round(r.progress)) > 0.04);
        if (!activeRunner) {
          // Play is dead — runners hold their bases!
          save.hits++;
          writeSave(save);
          updateOccupancyFromRunners();
          showCallout("BASE HIT! SAFE!", "RUNNERS HOLD", 1400);
          setTimeout(checkGameProgress, 1100);
          return;
        }

        const tBase = Math.max(1, Math.min(4, activeRunner.targetBase));
        state.ball.throwTargetBase = tBase;
        $("runner-status").textContent = `THROW TO ${tBase === 4 ? "HOME" : tBase + "B"}! SWIPE / TAP SLIDE!`;
      }
    }
  } else if (state.ball.throwTargetBase !== null) {
    // Laser throw from fielder to target base bag!
    const targetCoord = BASE_COORDS[state.ball.throwTargetBase];
    const dx = targetCoord[0] - state.ball.x;
    const dy = targetCoord[1] - state.ball.y;
    const dist = Math.hypot(dx, dy);
    const throwSpeed = 36.5; // m/s

    if (dist <= throwSpeed * dt + 0.6) {
      // Throw arrived at the bag! Judge SAFE vs OUT
      state.ball.x = targetCoord[0];
      state.ball.y = targetCoord[1];
      state.ball.z = 0.8;
      sfxMittPop();

      const tBase = state.ball.throwTargetBase;
      state.ball.throwTargetBase = null;

      const idx = state.runners.findIndex((r) => r.targetBase === tBase);
      if (idx !== -1) {
        const runner = state.runners[idx];
        // Sliding gives a generous evasion window at the bag!
        const margin = runner.sliding ? 0.16 : 0.04;
        if (Math.abs(runner.progress - tBase) <= margin) {
          // SAFE!
          runner.progress = tBase;
          if (runner.sliding) {
            save.slides++;
            save.stars += 3;
          }
          save.hits++;
          writeSave(save);
          if (tBase === 4) {
            state.runners.splice(idx, 1);
            state.homeRuns++;
            sfxCrowdCheer();
            showCallout("SAFE AT HOME! 💨", "SLIDE BEAT THE TAG!", 1600);
          } else {
            showCallout(`SAFE AT ${tBase}B!`, runner.sliding ? "GREAT SLIDE UNDER THE TAG!" : "BEAT THE THROW!", 1500);
          }
          updateOccupancyFromRunners();
          setTimeout(checkGameProgress, 1100);
        } else {
          // OUT at the bag!
          state.runners.splice(idx, 1);
          updateOccupancyFromRunners();
          registerOut(`OUT AT ${tBase === 4 ? "HOME" : tBase + "B"}!`);
        }
      } else {
        updateOccupancyFromRunners();
        setTimeout(checkGameProgress, 950);
      }
    } else {
      state.ball.x += (dx / dist) * throwSpeed * dt;
      state.ball.y += (dy / dist) * throwSpeed * dt;
      state.ball.z = 1.3;
    }
  }
}

/* Main 60fps loop */
let lastTime = 0;
function loop(now) {
  const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016;
  lastTime = now;
  state.clock += dt;

  if (state.swingAnim > 0) {
    state.swingAnim = Math.min(1, state.swingAnim + dt * 6.5);
  }

  if (state.phase === "windup") {
    state.phaseTimer -= dt;
    if (state.phaseTimer <= 0) {
      launchPitch();
    }
  } else if (state.phase === "pitch" && state.currentPitch) {
    state.currentPitch.elapsed += dt;
    const pos = samplePitchPos(state.currentPitch);
    state.ball.x = pos.x;
    state.ball.y = pos.y;
    state.ball.z = pos.z;
    state.ball.trail.push([pos.x, pos.y, pos.z]);
    if (state.ball.trail.length > 10) state.ball.trail.shift();

    // Did pitch cross the plate without a swing?
    if (pos.u >= 1.16 && !state.swung) {
      sfxMittPop();
      const inStrikeZone = Math.abs(state.currentPitch.targetX) <= 0.46 &&
        state.currentPitch.targetZ >= 0.54 && state.currentPitch.targetZ <= 1.44;

      if (inStrikeZone) {
        state.strikes++;
        if (state.strikes >= 3) {
          registerOut("STRIKE THREE · LOOKING!");
        } else {
          showCallout("STRIKE!", `CALLED STRIKE · ${state.balls}–${state.strikes}`, 1100);
          setTimeout(prepareNextPitch, 900);
        }
      } else {
        state.balls++;
        if (state.balls >= 4 && state.mode !== "derby") {
          handleWalk();
        } else {
          showCallout("BALL!", `OUTSIDE ZONE · ${state.balls}–${state.strikes}`, 1100);
          setTimeout(prepareNextPitch, 900);
        }
      }
      state.phase = "ready";
      updateHUD();
    }
  } else if (state.phase === "in_play") {
    stepInPlay(dt);
  } else if (state.phase === "homerun") {
    stepBallPhysics(state.ball, dt);
  }

  renderFrame(state, dt);
  requestAnimationFrame(loop);
}

/* Wire Touch, Pointer & Keyboard Controls */
function initControls() {
  const canvasEl = $("game-canvas");

  // Stance buttons (Contact / Power / Bunt)
  document.querySelectorAll(".stance-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.stance = btn.getAttribute("data-mode") || "contact";
      document.querySelectorAll(".stance-btn").forEach((b) => b.classList.toggle("active", b === btn));
    });
  });

  // Drag on canvas to aim batter reticle OR swipe during baserunning to slide/advance
  let ptrDown = false;
  let startX = 0, startY = 0;

  canvasEl.addEventListener("pointerdown", (e) => {
    ptrDown = true;
    startX = e.clientX;
    startY = e.clientY;
    if (state.phase === "pitch" || state.phase === "windup") {
      state.charging = true;
      $("btn-swing").classList.add("charging");
    } else if (state.phase === "in_play") {
      pumpSprint();
    }
  });

  window.addEventListener("pointermove", (e) => {
    if (!ptrDown) return;
    if (state.phase === "pitch" || state.phase === "windup" || state.phase === "ready") {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      state.aimX = Math.max(-0.58, Math.min(0.58, nx * 0.85));
      state.aimZ = Math.max(0.45, Math.min(1.52, 1.0 - ny * 0.65));
    }
  });

  window.addEventListener("pointerup", (e) => {
    if (!ptrDown) return;
    ptrDown = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (state.phase === "pitch") {
      state.charging = false;
      $("btn-swing").classList.remove("charging");
      triggerSwing();
    } else if (state.phase === "in_play") {
      if (dy > 35) {
        triggerSlide();
      } else if (dy < -35 || dx > 45) {
        triggerAdvanceBase();
      }
    }
    state.charging = false;
    $("btn-swing").classList.remove("charging");
  });

  // Big Swing Button
  const swingBtn = $("btn-swing");
  swingBtn.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    state.charging = true;
    swingBtn.classList.add("charging");
    if (state.phase === "pitch" && state.currentPitch && state.currentPitch.elapsed / state.currentPitch.flightTime > 0.72) {
      triggerSwing();
    }
  });
  swingBtn.addEventListener("pointerup", (e) => {
    e.stopPropagation();
    state.charging = false;
    swingBtn.classList.remove("charging");
    triggerSwing();
  });

  // Baserunning buttons
  function pumpSprint() {
    state.sprintBoost = Math.min(1.0, state.sprintBoost + 0.18);
    sfxStep();
    state.runners.forEach((r) => {
      const pos = lerpBasePos(r.progress);
      spawnParticles(pos[0], pos[1], 0.1, "#d97706", 4, 3);
    });
  }

  function triggerAdvanceBase() {
    state.runners.forEach((r) => {
      r.targetBase = Math.min(4, r.targetBase + 1);
    });
    pumpSprint();
    $("runner-status").textContent = "ROUNDING THE BAG FOR AN EXTRA BASE!";
  }

  function triggerRetreatBase() {
    state.runners.forEach((r) => {
      r.targetBase = Math.max(1, Math.floor(r.progress));
    });
    $("runner-status").textContent = "HOLDING / TAGGING UP ON BASE!";
  }

  function triggerSlide() {
    sfxSlide();
    state.runners.forEach((r) => {
      r.sliding = true;
      r.slideTimer = 0.65;
      const pos = lerpBasePos(r.progress);
      spawnParticles(pos[0], pos[1], 0.15, "#f59e0b", 12, 6);
    });
    $("runner-status").textContent = "HEADFIRST DIVE SLIDE! 💨";
  }

  $("btn-sprint").addEventListener("click", pumpSprint);
  $("btn-advance").addEventListener("click", triggerAdvanceBase);
  $("btn-retreat").addEventListener("click", triggerRetreatBase);
  $("btn-slide").addEventListener("click", triggerSlide);

  // Keyboard support (Space = Swing/Sprint, Up = Advance, Down = Slide)
  window.addEventListener("keydown", (e) => {
    if (!$("menu-modal").classList.contains("hidden")) return;
    if (e.code === "Space") {
      e.preventDefault();
      if (state.phase === "pitch") triggerSwing();
      else if (state.phase === "in_play") pumpSprint();
    } else if (e.code === "ArrowUp") {
      if (state.phase === "in_play") triggerAdvanceBase();
      else state.aimZ = Math.min(1.5, state.aimZ + 0.08);
    } else if (e.code === "ArrowDown") {
      if (state.phase === "in_play") triggerSlide();
      else state.aimZ = Math.max(0.45, state.aimZ - 0.08);
    } else if (e.code === "ArrowLeft") {
      state.aimX = Math.max(-0.55, state.aimX - 0.08);
    } else if (e.code === "ArrowRight") {
      state.aimX = Math.min(0.55, state.aimX + 0.08);
    }
  });

  // Menu Modal handlers
  document.querySelectorAll(".mode-card").forEach((card) => {
    card.addEventListener("click", () => {
      const m = card.getAttribute("data-mode") || "match";
      save.selectedMode = m;
      state.mode = m;
      document.querySelectorAll(".mode-card").forEach((c) => c.classList.toggle("active", c === card));
    });
  });

  $("btn-menu").addEventListener("click", () => {
    updateModalUI();
    $("menu-modal").classList.remove("hidden");
  });

  $("btn-start-game").addEventListener("click", startNewGame);
  $("btn-resume-game").addEventListener("click", () => {
    $("menu-modal").classList.add("hidden");
  });
}

function boot() {
  initRenderer($("game-canvas"));
  initControls();
  updateModalUI();
  updateHUD();
  requestAnimationFrame(loop);
}

boot();
