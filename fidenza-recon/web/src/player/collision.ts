import * as THREE from 'three';
import type { Building, CityData } from '../types';

/**
 * Ray-casting test for a point in a closed ring. Rings are stored as [x, z]
 * pairs by the city payload.
 */
export function pointInRing(x: number, z: number, ring: [number, number][]): boolean {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [xi, zi] = ring[index];
    const [xj, zj] = ring[previous];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

interface BuildingBounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

/**
 * Lightweight spatial index + queries used by the character and camera.
 * Only nearby buildings are tested, so a frame stays cheap with 638 volumes.
 */
export class CollisionWorld {
  private readonly grid = new Map<string, Building[]>();
  private readonly boundsByBuilding = new Map<Building, BuildingBounds>();
  private readonly cellSize = 28;
  readonly bounds: [number, number, number, number];

  constructor(
    private readonly city: CityData,
    private readonly groundAt: (x: number, z: number) => number,
  ) {
    this.bounds = city.meta.bbox_local;
    for (const building of city.buildings) {
      const bounds = this.buildingBounds(building);
      this.boundsByBuilding.set(building, bounds);
      const minIx = Math.floor((bounds.minX - 2) / this.cellSize);
      const maxIx = Math.floor((bounds.maxX + 2) / this.cellSize);
      const minIz = Math.floor((bounds.minZ - 2) / this.cellSize);
      const maxIz = Math.floor((bounds.maxZ + 2) / this.cellSize);
      for (let ix = minIx; ix <= maxIx; ix += 1) {
        for (let iz = minIz; iz <= maxIz; iz += 1) {
          const key = this.cellKey(ix, iz);
          const list = this.grid.get(key);
          if (list) list.push(building);
          else this.grid.set(key, [building]);
        }
      }
    }
  }

  private buildingBounds(building: Building): BuildingBounds {
    let minX = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxZ = -Infinity;
    for (const [x, z] of building.footprint) {
      if (x < minX) minX = x;
      if (z < minZ) minZ = z;
      if (x > maxX) maxX = x;
      if (z > maxZ) maxZ = z;
    }
    return { minX, minZ, maxX, maxZ };
  }

  private cellKey(ix: number, iz: number): string {
    return `${ix}:${iz}`;
  }

  private nearby(x: number, z: number, radius: number): Building[] {
    const minIx = Math.floor((x - radius) / this.cellSize);
    const maxIx = Math.floor((x + radius) / this.cellSize);
    const minIz = Math.floor((z - radius) / this.cellSize);
    const maxIz = Math.floor((z + radius) / this.cellSize);
    const found = new Set<Building>();
    for (let ix = minIx; ix <= maxIx; ix += 1) {
      for (let iz = minIz; iz <= maxIz; iz += 1) {
        const list = this.grid.get(this.cellKey(ix, iz));
        if (!list) continue;
        for (const building of list) found.add(building);
      }
    }
    return [...found];
  }

  private insideFootprint(building: Building, x: number, z: number): boolean {
    if (!pointInRing(x, z, building.footprint)) return false;
    for (const hole of building.holes) {
      if (pointInRing(x, z, hole)) return false;
    }
    return true;
  }

  private circleOverlapsFootprint(
    building: Building,
    x: number,
    z: number,
    radius: number,
  ): boolean {
    if (this.insideFootprint(building, x, z)) return true;
    if (radius <= 0) return false;
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      if (
        this.insideFootprint(
          building,
          x + Math.cos(angle) * radius,
          z + Math.sin(angle) * radius,
        )
      ) {
        return true;
      }
    }
    return false;
  }

  /** True when a camera point sits inside a building volume. */
  isPointBlocked(x: number, y: number, z: number, padding = 0.28): boolean {
    for (const building of this.nearby(x, z, padding)) {
      const top = building.base_y + building.height_m;
      if (y < building.base_y - 0.2 || y > top + 0.2) continue;
      if (this.circleOverlapsFootprint(building, x, z, padding)) return true;
    }
    return false;
  }

  /** True when a capsule-like body would intersect a building volume. */
  isBodyBlocked(
    x: number,
    feetY: number,
    z: number,
    radius = 0.38,
    height = 1.75,
  ): boolean {
    for (const building of this.nearby(x, z, radius)) {
      const top = building.base_y + building.height_m;
      if (feetY >= top - 0.04) continue;
      if (feetY + height <= building.base_y - 0.04) continue;
      if (this.circleOverlapsFootprint(building, x, z, radius)) return true;
    }
    return false;
  }

  /**
   * Highest walkable support below (or just above) a point. Building roofs are
   * included so the player can land on them after flying.
   */
  supportHeight(x: number, z: number, maxY: number): number {
    let support = this.groundAt(x, z);
    for (const building of this.nearby(x, z, 0.4)) {
      const top = building.base_y + building.height_m;
      if (top > maxY + 0.25) continue;
      if (!this.insideFootprint(building, x, z)) continue;
      if (top > support) support = top;
    }
    return support;
  }

  groundHeight(x: number, z: number): number {
    return this.groundAt(x, z);
  }

  /**
   * Maximum safe camera boom length from target along direction. Samples the
   * segment so thin walls are not skipped.
   */
  clearCameraDistance(
    target: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    padding = 0.3,
  ): number {
    const steps = 18;
    const point = new THREE.Vector3();
    for (let step = 1; step <= steps; step += 1) {
      const distance = (maxDistance * step) / steps;
      point.copy(target).addScaledVector(direction, distance);
      if (this.isPointBlocked(point.x, point.y, point.z, padding)) {
        const previous = (maxDistance * (step - 1)) / steps;
        return Math.max(0.7, previous - 0.15);
      }
    }
    return maxDistance;
  }

  clampToBounds(x: number, z: number, margin = 4): [number, number] {
    const [minX, minZ, maxX, maxZ] = this.bounds;
    return [
      Math.max(minX + margin, Math.min(maxX - margin, x)),
      Math.max(minZ + margin, Math.min(maxZ - margin, z)),
    ];
  }

  /** Debug helper kept small: number of indexed buildings. */
  get buildingCount(): number {
    return this.city.buildings.length;
  }
}
