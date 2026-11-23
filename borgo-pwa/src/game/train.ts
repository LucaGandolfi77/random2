export interface TrainPoint {
  x: number;
  z: number;
}

export type TrainPhase = 'dwell' | 'departing' | 'away' | 'arriving';

export interface TrainStatus {
  phase: TrainPhase;
  /** 0..1 progress inside the current phase. */
  progress: number;
  /** Distance along the track for the centre of the train. */
  distance: number;
  /** Seconds until the next useful event (departure or arrival). */
  nextIn: number;
}

export const TRAIN_TIMINGS = {
  dwell: 22,
  departing: 20,
  away: 12,
  arriving: 22
} as const;

export const TRAIN_CYCLE =
  TRAIN_TIMINGS.dwell + TRAIN_TIMINGS.departing + TRAIN_TIMINGS.away + TRAIN_TIMINGS.arriving;

/** The long siding east of Fidenza station, matching the OSM track. */
export const TRAIN_PATH: TrainPoint[] = [
  { x: 177.5, z: -188.4 },
  { x: 203.6, z: -175.5 },
  { x: 252.4, z: -156.9 },
  { x: 334, z: -126.3 }
];

/** Centre of the convoy while it is at the platform. */
export const TRAIN_STOP_DISTANCE = 59;

export function trainStatus(time: number): TrainStatus {
  const elapsed = wrap(time);
  const dwellEnd = TRAIN_TIMINGS.dwell;
  const departEnd = dwellEnd + TRAIN_TIMINGS.departing;
  const awayEnd = departEnd + TRAIN_TIMINGS.away;

  if (elapsed < dwellEnd) {
    return {
      phase: 'dwell',
      progress: elapsed / TRAIN_TIMINGS.dwell,
      distance: TRAIN_STOP_DISTANCE,
      nextIn: dwellEnd - elapsed
    };
  }
  if (elapsed < departEnd) {
    const progress = (elapsed - dwellEnd) / TRAIN_TIMINGS.departing;
    return {
      phase: 'departing',
      progress,
      distance: lerp(TRAIN_STOP_DISTANCE, endDistance(), smoothstep(progress)),
      nextIn: 0
    };
  }
  if (elapsed < awayEnd) {
    return {
      phase: 'away',
      progress: (elapsed - departEnd) / TRAIN_TIMINGS.away,
      distance: endDistance(),
      nextIn: TRAIN_CYCLE - elapsed
    };
  }
  const progress = (elapsed - awayEnd) / TRAIN_TIMINGS.arriving;
  return {
    phase: 'arriving',
    progress,
    distance: lerp(endDistance(), TRAIN_STOP_DISTANCE, smoothstep(progress)),
    nextIn: TRAIN_CYCLE - elapsed
  };
}

/** Convenience for the 3D actor: where the train centre is on the rail. */
export function trainDistance(time: number): number {
  return trainStatus(time).distance;
}

export function endDistance(): number {
  return Math.max(TRAIN_STOP_DISTANCE + 1, pathLength() - 10);
}

export function pathLength(): number {
  let total = 0;
  for (let i = 0; i < TRAIN_PATH.length - 1; i++) {
    total += Math.hypot(
      TRAIN_PATH[i + 1].x - TRAIN_PATH[i].x,
      TRAIN_PATH[i + 1].z - TRAIN_PATH[i].z
    );
  }
  return total;
}

export function pointAlongTrack(distance: number): {
  x: number;
  z: number;
  heading: number;
} {
  const length = pathLength();
  let remaining = clamp(distance, 0, length);
  for (let i = 0; i < TRAIN_PATH.length - 1; i++) {
    const a = TRAIN_PATH[i];
    const b = TRAIN_PATH[i + 1];
    const segment = Math.hypot(b.x - a.x, b.z - a.z);
    if (remaining <= segment || i === TRAIN_PATH.length - 2) {
      const t = segment > 1e-6 ? Math.min(1, remaining / segment) : 0;
      return {
        x: a.x + (b.x - a.x) * t,
        z: a.z + (b.z - a.z) * t,
        heading: Math.atan2(b.x - a.x, b.z - a.z)
      };
    }
    remaining -= segment;
  }
  const last = TRAIN_PATH[TRAIN_PATH.length - 1];
  return { x: last.x, z: last.z, heading: 0 };
}

function smoothstep(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function wrap(time: number): number {
  return ((time % TRAIN_CYCLE) + TRAIN_CYCLE) % TRAIN_CYCLE;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
