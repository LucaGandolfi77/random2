import type { PlatformDefinition } from '../stages/types';

export interface PlatformState extends PlatformDefinition {
  curX: number;
  curY: number;
  prevX: number;
  prevY: number;
}

export function createPlatformStates(platforms: PlatformDefinition[]): PlatformState[] {
  return platforms.map((platform) => ({
    ...platform,
    curX: platform.x,
    curY: platform.y,
    prevX: platform.x,
    prevY: platform.y,
  }));
}

export function platformPositionAt(platform: PlatformDefinition, frame: number): { x: number; y: number } {
  if (!platform.moving) return { x: platform.x, y: platform.y };
  const offset = Math.sin(frame * platform.moving.speed + platform.moving.phase) * platform.moving.amplitude;
  return {
    x: platform.x + (platform.moving.axis === 'x' ? offset : 0),
    y: platform.y + (platform.moving.axis === 'y' ? offset : 0),
  };
}

export function updatePlatformStates(platforms: PlatformState[], frame: number): void {
  for (const platform of platforms) {
    platform.prevX = platform.curX;
    platform.prevY = platform.curY;
    const position = platformPositionAt(platform, frame);
    platform.curX = position.x;
    platform.curY = position.y;
  }
}

export function getPlatformById(
  platforms: readonly PlatformState[],
  id: string | null,
): PlatformState | undefined {
  if (!id) return undefined;
  return platforms.find((platform) => platform.id === id);
}

export function isOverPlatform(platform: PlatformState, x: number, halfWidth: number): boolean {
  return x + halfWidth > platform.curX - platform.width / 2 && x - halfWidth < platform.curX + platform.width / 2;
}

export function nearestLedge(
  platforms: readonly PlatformState[],
  x: number,
  y: number,
  maxDistance: number,
): { x: number; y: number; platform: PlatformState; side: 1 | -1 } | null {
  let best: { x: number; y: number; platform: PlatformState; side: 1 | -1; dist: number } | null = null;
  for (const platform of platforms) {
    const left = platform.curX - platform.width / 2;
    const right = platform.curX + platform.width / 2;
    for (const side of [-1, 1] as const) {
      const ledgeX = side === -1 ? left : right;
      const dx = Math.abs(x - ledgeX);
      const dy = Math.abs(y - platform.curY);
      if (dx <= maxDistance && dy <= 1.4) {
        const dist = dx + dy;
        if (!best || dist < best.dist) {
          best = { x: ledgeX, y: platform.curY, platform, side, dist };
        }
      }
    }
  }
  if (!best) return null;
  return { x: best.x, y: best.y, platform: best.platform, side: best.side };
}
