/*
 * DIAMOND POLY '99 · 3D Ball Aerodynamics, Bat Contact, Fielding & Baserunning
 * ----------------------------------------------------------------------------
 * Coordinate system (meters):
 *   Home Plate = (0, 0, 0)
 *   +Y = Out toward Center Field (Pitcher mound at Y = 18.44, 2B at Y = 38.79)
 *   +X = Right side (1B at (+19.4, 19.4, 0), 3B at (-19.4, 19.4, 0))
 *   +Z = Upward height
 */
import CONFIG from "./config.js";

const B = 19.40; // 27.43 / sqrt(2) -> 1B is at (+19.4, 19.4), 2B at (0, 38.79), 3B at (-19.4, 19.4)

// Fence radii are authored in world meters (122 m center, 100 m corners).
const FENCE_CORNER_M = (((CONFIG.field || {}).fenceCorner) || 100);
const FENCE_CENTER_M = (((CONFIG.field || {}).fenceCenter) || 122);

export const BASE_COORDS = [
  [0, 0, 0],         // 0: Home
  [B, B, 0],         // 1: 1st Base
  [0, B * 2, 0],     // 2: 2nd Base
  [-B, B, 0],        // 3: 3rd Base
  [0, 0, 0]          // 4: Home Plate (scoring)
];

export const FIELDER_HOME_POS = [
  { role: "P",  x: 0,     y: 18.44 },
  { role: "C",  x: 0,     y: -1.4  },
  { role: "1B", x: 18.5,  y: 23.0  },
  { role: "2B", x: 9.5,   y: 38.0  },
  { role: "SS", x: -9.5,  y: 38.0  },
  { role: "3B", x: -18.5, y: 23.0  },
  { role: "LF", x: -38.0, y: 74.0  },
  { role: "CF", x: 0.0,   y: 88.0  },
  { role: "RF", x: 38.0,  y: 74.0  }
];

export function wallDistAtAngle(theta) {
  // theta = 0 is straight center field (+Y); +/- PI/4 are foul lines
  const cos2 = Math.cos(theta * 2);
  return FENCE_CORNER_M + (FENCE_CENTER_M - FENCE_CORNER_M) * Math.max(0, cos2);
}

export function createPitch(teamRating = 1.0) {
  const list = CONFIG.pitches;
  const spec = list[Math.floor(Math.random() * list.length)];
  const mph = Math.round(spec.mphMin + Math.random() * (spec.mphMax - spec.mphMin));
  // Target strike-zone coordinates at Home Plate (x in [-0.48, 0.48], z in [0.55, 1.42])
  const inZone = Math.random() < 0.78;
  const targetX = inZone ? (Math.random() - 0.5) * 0.72 : (Math.random() < 0.5 ? -0.62 : 0.62);
  const targetZ = inZone ? 0.68 + Math.random() * 0.58 : (Math.random() < 0.5 ? 0.38 : 1.55);

  const flightTime = 18.44 / (spec.speed * (0.95 + teamRating * 0.05));
  return {
    spec,
    mph,
    startX: -0.18,
    startY: 18.0,
    startZ: 1.85,
    targetX,
    targetZ,
    flightTime,
    elapsed: 0
  };
}

export function samplePitchPos(pitch) {
  const u = Math.max(0, Math.min(1.25, pitch.elapsed / pitch.flightTime));
  // Smooth curve break that accelerates in the second half of flight
  const curve = u * u * (1 - u) * 2.2;
  const x = pitch.startX + (pitch.targetX - pitch.startX) * u + pitch.spec.breakX * curve;
  const y = pitch.startY * (1 - u);
  const z = pitch.startZ + (pitch.targetZ - pitch.startZ) * u + pitch.spec.breakZ * curve + Math.sin(u * Math.PI) * 0.28;
  return { x, y, z, u };
}

/* Evaluate bat-ball collision when the player swings */
export function evaluateContact(pitch, aimX, aimZ, stance, batSpec) {
  const pos = samplePitchPos(pitch);
  // Timing error: u = 1.0 is dead center of home plate
  const timingDiff = pos.u - 1.0; // negative = early (pull), positive = late (oppo)
  const timingAbs = Math.abs(timingDiff);

  const sweetBonus = (batSpec && batSpec.sweetSpot) || 1.0;
  const timingWindow = (stance === "contact" ? 0.24 : stance === "bunt" ? 0.28 : 0.19) * sweetBonus;

  if (timingAbs > timingWindow) {
    return { hit: false, reason: timingDiff < 0 ? "EARLY SWING & MISS!" : "LATE SWING & MISS!" };
  }

  // Spatial distance between player's reticle (aimX, aimZ) and ball (pos.x, pos.z)
  const dx = pos.x - aimX;
  const dz = pos.z - aimZ;
  const dist = Math.hypot(dx, dz);
  const maxRadius = (stance === "contact" ? 0.62 : stance === "bunt" ? 0.68 : 0.48) * sweetBonus;

  if (dist > maxRadius) {
    return { hit: false, reason: "SWING & A MISS!" };
  }

  // Contact quality 0..1 (1 = barrel sweet spot!)
  const spatialQ = 1 - (dist / maxRadius) * 0.75;
  const timingQ = 1 - (timingAbs / timingWindow) * 0.65;
  const quality = Math.max(0.15, Math.min(1.0, spatialQ * 0.6 + timingQ * 0.4));

  // Spray angle: early swing pulls left (-theta), late pushes right (+theta)
  let sprayAngle = timingDiff * 2.35 + dx * 0.85 + (Math.random() - 0.5) * 0.12;

  if (stance === "bunt") {
    const buntSpeed = 10 + Math.random() * 6;
    const buntAng = Math.max(-0.55, Math.min(0.55, sprayAngle * 0.6));
    return {
      hit: true,
      foul: Math.abs(buntAng) > Math.PI / 4,
      quality: 0.5,
      exitMph: 42,
      vx: Math.sin(buntAng) * buntSpeed,
      vy: Math.cos(buntAng) * buntSpeed,
      vz: 2.2,
      isBunt: true
    };
  }

  // Launch angle (vertical): hitting slightly under center lifts the ball
  let launchDeg = 16 + (-dz * 85) + (stance === "power" ? 9 : 2);
  if (quality > 0.78) {
    // Reward good barrel contact with ideal line-drive / home-run launch window (22–33°)
    launchDeg = 23 + (stance === "power" ? 6 : 2) + (Math.random() - 0.5) * 7;
  }
  launchDeg = Math.max(-18, Math.min(62, launchDeg));
  const launchRad = (launchDeg * Math.PI) / 180;

  const batPower = (batSpec && batSpec.power) || 1.0;
  const stanceMult = stance === "power" ? 1.13 : 1.0;
  const exitSpeed = (24 + quality * 27.5) * batPower * stanceMult; // m/s (up to ~56 m/s = 115 mph)
  const exitMph = Math.round(exitSpeed * 2.237);

  const horizSpeed = exitSpeed * Math.cos(launchRad);
  const vx = Math.sin(sprayAngle) * horizSpeed;
  const vy = Math.cos(sprayAngle) * horizSpeed;
  const vz = exitSpeed * Math.sin(launchRad);

  const foul = Math.abs(sprayAngle) > Math.PI / 4 + 0.03;

  return {
    hit: true,
    foul,
    quality,
    exitMph,
    launchDeg: Math.round(launchDeg),
    sprayAngle,
    vx,
    vy,
    vz
  };
}

/* Advance 3D ball physics in play */
export function stepBallPhysics(ball, dt) {
  if (!ball.active) return null;

  const drag = 0.996;
  ball.vx *= Math.pow(drag, dt * 60);
  ball.vy *= Math.pow(drag, dt * 60);
  ball.vz -= CONFIG.field.gravity * dt;

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.z += ball.vz * dt;

  const dist = Math.hypot(ball.x, ball.y);
  const theta = Math.atan2(ball.x, Math.max(0.1, ball.y));
  const wallR = wallDistAtAngle(theta);

  // Check if ball cleared the outfield fence in fair territory!
  if (!ball.bounced && !ball.overWall && dist >= wallR && Math.abs(theta) <= Math.PI / 4) {
    if (ball.z >= CONFIG.field.wallHeight) {
      ball.overWall = true;
      // Estimate total projected distance in feet
      const extraM = Math.max(0, (ball.z - 1.0) * 2.8);
      const totalFt = Math.round((dist + extraM) * 3.28084);
      return { event: "homerun", distanceFt: Math.max(335, totalFt) };
    } else {
      // Hit off the outfield wall!
      ball.bounced = true;
      ball.vx *= -0.35;
      ball.vy *= -0.35;
      ball.x = Math.sin(theta) * (wallR - 1.2);
      ball.y = Math.cos(theta) * (wallR - 1.2);
      return { event: "wall_hit" };
    }
  }

  // Ground bounce & turf friction
  if (ball.z <= 0.12) {
    ball.z = 0.12;
    if (!ball.bounced) {
      ball.bounced = true;
    }
    if (Math.abs(ball.vz) > 1.8) {
      ball.vz = -ball.vz * 0.44;
      ball.vx *= 0.76;
      ball.vy *= 0.76;
    } else {
      ball.vz = 0;
      ball.vx *= Math.pow(0.92, dt * 60);
      ball.vy *= Math.pow(0.92, dt * 60);
    }
  }

  return null;
}

export function lerpBasePos(progress) {
  const clamped = Math.max(0, Math.min(4, progress));
  const idx = Math.min(3, Math.floor(clamped));
  const frac = clamped - idx;
  const a = BASE_COORDS[idx];
  const b = BASE_COORDS[idx + 1];
  return [
    a[0] + (b[0] - a[0]) * frac,
    a[1] + (b[1] - a[1]) * frac,
    0
  ];
}
