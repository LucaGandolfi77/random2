/* Deterministic input replay and bug-report codes. */
import { createHunt, stepHunt } from "./sim.js";

function toBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64(value) {
  const padded = String(value).replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

export function createRecorder(seed, mode, biome) {
  return { seed: seed >>> 0, mode, biome, frames: [] };
}

/* Keeps one compact frame every 1/10 s; enough to replay decisions. */
export function record(recorder, input, dt, clock) {
  if (clock < (recorder.nextAt || 0)) return;
  recorder.nextAt = clock + 0.1;
  recorder.frames.push([
    Math.round((input.dx || 0) * 100),
    Math.round((input.dy || 0) * 100),
    input.chargedShot === undefined ? 0 : Math.round(input.chargedShot * 100),
    input.dodge ? 1 : 0,
    input.ultimate ? 1 : 0,
  ]);
}

export function encodeReplay(recorder) {
  return toBase64(JSON.stringify({
    v: 1,
    s: recorder.seed,
    m: recorder.mode,
    b: recorder.biome,
    f: recorder.frames.slice(0, 1200),
  }));
}

export function decodeReplay(code) {
  try {
    const data = JSON.parse(fromBase64(String(code).trim()));
    if (!data || data.v !== 1 || !Array.isArray(data.f)) return null;
    return { seed: data.s >>> 0, mode: data.m, biome: data.b, frames: data.f };
  } catch {
    return null;
  }
}

export function replayHunt(save, replay, maxSeconds = 180) {
  const hunt = createHunt(save, replay.seed, {
    mode: replay.mode || "campaign",
    biome: replay.biome,
  });
  let frame = 0;
  for (let t = 0; t < maxSeconds && frame < replay.frames.length; t += 0.1) {
    const [dx, dy, charge, dodge, ultimate] = replay.frames[frame++];
    const input = { dx: dx / 100, dy: dy / 100 };
    if (charge) input.chargedShot = charge / 100;
    if (dodge) input.dodge = true;
    if (ultimate) input.ultimate = true;
    for (let i = 0; i < 6; i++) stepHunt(hunt, i === 0 ? input : { dx: input.dx, dy: input.dy }, 1 / 60);
    if (hunt.phase === "won" || hunt.phase === "lost") break;
  }
  return hunt;
}
