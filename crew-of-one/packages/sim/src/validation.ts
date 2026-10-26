import { circleRectOverlap } from './collision';
import type { GhostTrack, ValidationIssue, VaultDef } from './types';

const MAX_PLAYER_SPEED = 96 * 2.4;

export const validateTracks = (
  vault: VaultDef,
  tracks: GhostTrack[],
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  if (tracks.length === 0) {
    issues.push({ code: 'no-tracks', message: 'A run must contain at least one track.' });
    return issues;
  }

  if (tracks.length > vault.maxEchoes + 1) {
    issues.push({
      code: 'too-many-tracks',
      message: `Expected at most ${vault.maxEchoes + 1} tracks, got ${tracks.length}.`,
    });
  }

  for (const track of tracks) {
    if (track.frames.length === 0) {
      issues.push({ code: 'empty-track', message: 'Track has no frames.', trackId: track.id });
      continue;
    }

    const first = track.frames[0];
    if (first && (first.x !== vault.playerStart.x || first.y !== vault.playerStart.y)) {
      issues.push({
        code: 'bad-start',
        message: 'Every track must start at the vault entrance.',
        trackId: track.id,
        frameIndex: 0,
      });
    }

    let previous = first;
    for (let i = 1; i < track.frames.length; i += 1) {
      const frame = track.frames[i];
      if (!frame || !previous) continue;

      if (frame.t < previous.t) {
        issues.push({
          code: 'time-order',
          message: 'Frame timestamps must be monotonic.',
          trackId: track.id,
          frameIndex: i,
        });
        break;
      }

      if (frame.t > vault.loopSeconds * 1000) {
        issues.push({
          code: 'past-loop',
          message: 'Frame is past the loop duration.',
          trackId: track.id,
          frameIndex: i,
        });
        break;
      }

      const dt = Math.max(0.001, (frame.t - previous.t) / 1000);
      const travelled = Math.hypot(frame.x - previous.x, frame.y - previous.y);
      if (travelled > MAX_PLAYER_SPEED * dt + 4) {
        issues.push({
          code: 'too-fast',
          message: 'Frame displacement exceeds the maximum speed.',
          trackId: track.id,
          frameIndex: i,
        });
        break;
      }

      if (vault.walls.some((wall) => circleRectOverlap(frame.x, frame.y, 8, wall))) {
        issues.push({
          code: 'inside-wall',
          message: 'Track passes through a wall.',
          trackId: track.id,
          frameIndex: i,
        });
        break;
      }

      previous = frame;
    }
  }

  return issues;
};
