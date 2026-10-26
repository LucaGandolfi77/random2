import { distance, directionToVector } from './math';
import { circleRectOverlap, distanceToSegment, segmentIntersectsRect } from './collision';
import { validateTracks } from './validation';
import type { GhostFrame, GhostTrack, ValidationIssue, VaultDef } from './types';

export type ReplayResult = {
  won: boolean;
  timeMs: number;
  issues: ValidationIssue[];
};

const sampleTrack = (track: GhostTrack, timeMs: number): GhostFrame | null => {
  const frames = track.frames;
  if (frames.length === 0) return null;
  const first = frames[0];
  const last = frames[frames.length - 1];
  if (!first || !last) return null;
  if (timeMs < first.t - 1) return first;
  if (timeMs > last.t + 1) return null;
  if (timeMs > last.t) return last;

  let index = 0;
  while (index < frames.length - 1 && (frames[index + 1]?.t ?? Infinity) <= timeMs) {
    index += 1;
  }
  const a = frames[index];
  const b = frames[Math.min(index + 1, frames.length - 1)];
  if (!a) return null;
  if (!b || b.t <= a.t) return a;

  const alpha = Math.max(0, Math.min(1, (timeMs - a.t) / (b.t - a.t)));
  return {
    t: timeMs,
    x: a.x + (b.x - a.x) * alpha,
    y: a.y + (b.y - a.y) * alpha,
    dir: a.dir,
    anim: a.anim,
  };
};

const cameraSees = (
  camera: { x: number; y: number; angle: number; fovDeg: number; range: number },
  target: { x: number; y: number },
  walls: VaultDef['walls'],
): boolean => {
  const dx = target.x - camera.x;
  const dy = target.y - camera.y;
  const range = Math.hypot(dx, dy);
  if (range > camera.range || range < 0.001) return false;

  const targetAngle = Math.atan2(dy, dx);
  const delta = Math.abs(
    Math.atan2(Math.sin(targetAngle - camera.angle), Math.cos(targetAngle - camera.angle)),
  );
  if (delta > (camera.fovDeg * Math.PI) / 360) return false;

  return !walls.some((wall) =>
    segmentIntersectsRect(camera.x, camera.y, target.x, target.y, wall),
  );
};

/**
 * Headless replay for leaderboard validation and solution-tape tests.
 * All tracks are treated as actors; the last track is the player's final run.
 * Guards are not simulated yet; cameras, levers, doors, plates, walls, and the
 * exit are. This is the contract the Worker uses for now.
 */
export const replayTracks = (vault: VaultDef, tracks: GhostTrack[]): ReplayResult => {
  const issues = validateTracks(vault, tracks);
  if (issues.length > 0) return { won: false, timeMs: 0, issues };

  const playerTrack = tracks[tracks.length - 1];
  if (!playerTrack) {
    return {
      won: false,
      timeMs: 0,
      issues: [{ code: 'no-player-track', message: 'Missing player track.' }],
    };
  }

  const ghosts = tracks.slice(0, -1);
  const plates = vault.plates.map((plate) => ({ ...plate, pressed: false, latched: false }));
  const levers = vault.levers.map((lever) => ({
    ...lever,
    disableMs: lever.disableMs ?? 5000,
    activeUntilMs: 0,
    pressed: false,
  }));
  const cameraSuspicion = vault.cameras.map(() => 0);
  const lasers = vault.lasers.map((laser) => ({ ...laser, active: false }));
  const gem = vault.gem
    ? { x: vault.gem.x, y: vault.gem.y, radius: vault.gem.radius, holder: 'world' as string }
    : null;

  const leverEvents: Array<{ t: number; leverId: string }> = [];
  for (const ghost of ghosts) {
    for (const frame of ghost.frames) {
      for (const event of frame.events ?? []) {
        if (event.type === 'interact' && event.targetId) {
          leverEvents.push({ t: frame.t, leverId: event.targetId });
        }
      }
    }
  }
  leverEvents.sort((a, b) => a.t - b.t);
  let eventIndex = 0;

  const gemEvents: Array<{
    t: number;
    type: 'grab' | 'drop';
    actorId: string;
    track: GhostTrack;
  }> = [];
  for (const track of tracks) {
    for (const frame of track.frames) {
      for (const event of frame.events ?? []) {
        if ((event.type === 'grab' || event.type === 'drop') && event.targetId === 'gem') {
          gemEvents.push({
            t: frame.t,
            type: event.type,
            actorId: track.id,
            track,
          });
        }
      }
    }
  }
  gemEvents.sort((a, b) => a.t - b.t);
  let gemEventIndex = 0;

  const stepMs = 1000 / 60;
  const loopMs = vault.loopSeconds * 1000;
  let previousPlayer = { x: playerTrack.frames[0]?.x ?? vault.playerStart.x, y: playerTrack.frames[0]?.y ?? vault.playerStart.y };

  for (let timeMs = 0; timeMs <= loopMs; timeMs += stepMs) {
    const player = sampleTrack(playerTrack, timeMs);
    if (!player) break;

    const ghostPositions = ghosts
      .map((ghost) => sampleTrack(ghost, timeMs))
      .filter((frame): frame is GhostFrame => frame !== null);

    while (eventIndex < leverEvents.length && (leverEvents[eventIndex]?.t ?? Infinity) <= timeMs) {
      const event = leverEvents[eventIndex];
      eventIndex += 1;
      if (!event) continue;
      const lever = levers.find((candidate) => candidate.id === event.leverId);
      if (lever && lever.mode === 'toggle') {
        lever.activeUntilMs = Math.max(lever.activeUntilMs, event.t + lever.disableMs);
      }
    }

    while (
      gemEventIndex < gemEvents.length &&
      (gemEvents[gemEventIndex]?.t ?? Infinity) <= timeMs
    ) {
      const event = gemEvents[gemEventIndex];
      gemEventIndex += 1;
      if (!event || !gem) continue;
      if (event.type === 'grab' && gem.holder === 'world') {
        gem.holder = event.actorId;
      } else if (event.type === 'drop' && gem.holder === event.actorId) {
        const frame = sampleTrack(event.track, event.t);
        if (frame) {
          gem.x = frame.x;
          gem.y = frame.y;
        }
        gem.holder = 'world';
      }
    }

    if (gem && gem.holder !== 'world') {
      if (gem.holder === playerTrack.id) {
        gem.x = player.x;
        gem.y = player.y;
      } else {
        const holderTrack = tracks.find((track) => track.id === gem.holder);
        if (holderTrack) {
          const holderFrame = sampleTrack(holderTrack, timeMs);
          if (holderFrame) {
            gem.x = holderFrame.x;
            gem.y = holderFrame.y;
          } else {
            const last = holderTrack.frames[holderTrack.frames.length - 1];
            if (last) {
              gem.x = last.x;
              gem.y = last.y;
            }
            gem.holder = 'world';
          }
        } else {
          gem.holder = 'world';
        }
      }
    }

    for (const lever of levers) {
      if (lever.mode === 'hold') {
        lever.pressed =
          distance(player, lever) <= lever.radius + 5 ||
          ghostPositions.some((ghost) => distance(ghost, lever) <= lever.radius + 8);
      } else {
        lever.pressed = lever.activeUntilMs > timeMs;
      }
    }

    for (const plate of plates) {
      const contact =
        distance(player, plate) <= plate.radius + 5 ||
        ghostPositions.some((ghost) => distance(ghost, plate) <= plate.radius + 8);

      if (plate.mode === 'latch') {
        if (contact) plate.latched = true;
        plate.pressed = plate.latched;
      } else {
        plate.pressed = contact;
      }
    }

    const moveX = player.x - previousPlayer.x;
    const moveY = player.y - previousPlayer.y;

    for (const door of vault.doors) {
      if (door.mode === 'oneway') {
        if (!circleRectOverlap(player.x, player.y, 8, door)) continue;
        const direction = door.passDirection ?? 2;
        const allowed =
          (direction === 0 && moveY < 0) ||
          (direction === 1 && moveX > 0) ||
          (direction === 2 && moveY > 0) ||
          (direction === 3 && moveX < 0);
        if (!allowed) {
          return {
            won: false,
            timeMs,
            issues: [
              {
                code: 'wrong-way-door',
                message: 'Player moves against a one-way door.',
                trackId: playerTrack.id,
              },
            ],
          };
        }
        continue;
      }

      const targeting = plates.filter((plate) => plate.targets.includes(door.id));
      const open = targeting.length > 0 && targeting.every((plate) => plate.pressed);
      if (open) continue;
      if (circleRectOverlap(player.x, player.y, 8, door)) {
        return {
          won: false,
          timeMs,
          issues: [
            {
              code: 'through-closed-door',
              message: 'Player passes through a closed door.',
              trackId: playerTrack.id,
            },
          ],
        };
      }
    }

    for (const laser of lasers) {
      const disabled = levers.some(
        (lever) => lever.pressed && lever.targetIds.includes(laser.id),
      );
      const cycle = laser.onMs + laser.offMs;
      laser.active =
        !disabled && cycle > 0 && (timeMs + laser.phaseMs) % cycle < laser.onMs;

      if (
        laser.active &&
        distanceToSegment(player.x, player.y, laser.x1, laser.y1, laser.x2, laser.y2) <= 8
      ) {
        return {
          won: false,
          timeMs,
          issues: [
            {
              code: 'touched-laser',
              message: 'Player touched an active laser.',
              trackId: playerTrack.id,
            },
          ],
        };
      }
    }

    previousPlayer = { x: player.x, y: player.y };

    let cameraAlarm = false;
    for (let i = 0; i < vault.cameras.length; i += 1) {
      const camera = vault.cameras[i];
      if (!camera) continue;

      const disabled = levers.some(
        (lever) => lever.pressed && lever.targetIds.includes(camera.id),
      );
      if (disabled) {
        cameraSuspicion[i] = Math.max(0, (cameraSuspicion[i] ?? 0) - stepMs / 700);
        continue;
      }

      const forward = directionToVector(camera.facing);
      const baseAngle = Math.atan2(forward.y, forward.x);
      const sweep =
        camera.sweepMs > 0
          ? Math.sin(((timeMs + camera.phaseMs) / camera.sweepMs) * Math.PI * 2)
          : 0;
      const angle = baseAngle + sweep * ((camera.sweepDeg * Math.PI) / 360);

      if (cameraSees({ ...camera, angle }, player, vault.walls)) {
        cameraSuspicion[i] = Math.min(1, (cameraSuspicion[i] ?? 0) + stepMs / 1200);
        if ((cameraSuspicion[i] ?? 0) >= 1) cameraAlarm = true;
      } else {
        cameraSuspicion[i] = Math.max(0, (cameraSuspicion[i] ?? 0) - stepMs / 900);
      }
    }

    const playerAtExit = distance(player, vault.exit) <= vault.exit.radius + 0.5;
    let gemAtExit = false;
    if (vault.requiresGem && gem) {
      if (gem.holder === playerTrack.id) {
        gemAtExit = playerAtExit;
      } else if (gem.holder !== 'world') {
        const holderTrack = tracks.find((track) => track.id === gem.holder);
        if (holderTrack) {
          const holderFrame = sampleTrack(holderTrack, timeMs);
          gemAtExit = Boolean(
            holderFrame &&
              distance(holderFrame, vault.exit) <= vault.exit.radius + 0.5,
          );
        }
      } else {
        gemAtExit = distance(gem, vault.exit) <= vault.exit.radius + 0.5;
      }
    }

    const heistComplete = vault.requiresGem ? gemAtExit : playerAtExit;
    if (heistComplete) {
      if (cameraAlarm) {
        return {
          won: false,
          timeMs,
          issues: [
            {
              code: 'seen-by-camera',
              message: 'Player was caught by a camera.',
              trackId: playerTrack.id,
            },
          ],
        };
      }
      return { won: true, timeMs, issues: [] };
    }

    if (cameraAlarm) {
      return {
        won: false,
        timeMs,
        issues: [
          {
            code: 'seen-by-camera',
            message: 'Player was caught by a camera.',
            trackId: playerTrack.id,
          },
        ],
      };
    }
  }

  return {
    won: false,
    timeMs: loopMs,
    issues: [{ code: 'not-won', message: 'Player never reached the exit.' }],
  };
};
