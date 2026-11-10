import * as THREE from 'three';
import type { Building } from '../types';
import { DetailBatcher } from '../city/facade';
import { buildBuildingLODs, buildContextBatch } from '../city/building';

interface LodDistances {
  lod0: number;
  lod1: number;
  lod2: number;
  lod3: number;
}

interface Chunk {
  key: string;
  buildings: Building[];
  bounds: THREE.Box3;
  context: THREE.Group;
  detail: THREE.Group | null;
  lastUsed: number;
}

function distanceToBox(point: THREE.Vector3, box: THREE.Box3): number {
  const dx = Math.max(box.min.x - point.x, 0, point.x - box.max.x);
  const dy = Math.max(box.min.y - point.y, 0, point.y - box.max.y);
  const dz = Math.max(box.min.z - point.z, 0, point.z - box.max.z);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Chunked LOD streamer for the large real-data area.
 *
 * Every chunk keeps a merged LOD1 batch, which is cheap and always complete.
 * When the camera gets close, the chunk's individual LOD3 buildings are built
 * on demand and the LOD1 batch is hidden. Far/detail-cache overflow chunks are
 * released so memory stays bounded.
 */
export class CityLodManager {
  private readonly chunks = new Map<string, Chunk>();
  private readonly detailQueue = new Set<Chunk>();
  private detailsVisible = true;
  private exporting = false;
  private frame = 0;
  private lastCamera: THREE.PerspectiveCamera | null = null;
  private readonly chunkSize: number;
  private readonly detailRadius: number;
  private readonly maxDetailChunks: number;

  constructor(
    private readonly root: THREE.Group,
    buildings: Building[],
    private readonly distances: LodDistances,
    chunkSize = 120,
    detailRadius = 235,
    maxDetailChunks = 16,
  ) {
    this.chunkSize = chunkSize;
    this.detailRadius = detailRadius;
    this.maxDetailChunks = maxDetailChunks;
    this.buildChunks(buildings);
  }

  private buildChunks(buildings: Building[]): void {
    const groups = new Map<string, Building[]>();
    for (const building of buildings) {
      const [x, z] = building.centroid_local;
      const ix = Math.floor(x / this.chunkSize);
      const iz = Math.floor(z / this.chunkSize);
      const key = `${ix}:${iz}`;
      const list = groups.get(key);
      if (list) list.push(building);
      else groups.set(key, [building]);
    }

    for (const [key, list] of groups) {
      let minX = Infinity;
      let minY = Infinity;
      let minZ = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      let maxZ = -Infinity;
      for (const building of list) {
        minY = Math.min(minY, building.base_y);
        maxY = Math.max(maxY, building.base_y + building.height_m);
        for (const [x, z] of building.footprint) {
          minX = Math.min(minX, x);
          minZ = Math.min(minZ, z);
          maxX = Math.max(maxX, x);
          maxZ = Math.max(maxZ, z);
        }
      }
      const bounds = new THREE.Box3(
        new THREE.Vector3(minX, minY, minZ),
        new THREE.Vector3(maxX, maxY, maxZ),
      );
      const context = buildContextBatch(list);
      context.name = `lod1-chunk-${key}`;
      context.userData.kind = 'lod1-chunk';
      this.root.add(context);
      this.chunks.set(key, {
        key,
        buildings: list,
        bounds,
        context,
        detail: null,
        lastUsed: 0,
      });
    }
  }

  setDetailsVisible(visible: boolean): void {
    this.detailsVisible = visible;
    if (!visible) {
      this.detailQueue.clear();
      this.hideDetailsShowContext();
    } else if (this.lastCamera) {
      this.update(this.lastCamera);
    }
  }

  /** Builds the closest detail chunks immediately so the spawn is detailed. */
  warmUp(camera: THREE.PerspectiveCamera, maxChunks = 8): void {
    this.lastCamera = camera;
    if (!this.detailsVisible) return;
    const candidates = [...this.chunks.values()]
      .filter((chunk) => !chunk.detail)
      .map((chunk) => ({ chunk, distance: distanceToBox(camera.position, chunk.bounds) }))
      .filter((entry) => entry.distance <= this.detailRadius)
      .sort((a, b) => a.distance - b.distance);
    for (const entry of candidates.slice(0, maxChunks)) {
      this.buildDetail(entry.chunk);
    }
    this.update(camera);
  }

  update(camera: THREE.PerspectiveCamera): void {
    this.lastCamera = camera;
    this.frame += 1;
    if (this.exporting) {
      this.hideDetailsShowContext();
      return;
    }
    if (!this.detailsVisible) {
      this.hideDetailsShowContext();
      return;
    }

    const near: Chunk[] = [];
    for (const chunk of this.chunks.values()) {
      const distance = distanceToBox(camera.position, chunk.bounds);
      const isNear = distance <= this.detailRadius;
      if (isNear) {
        chunk.lastUsed = this.frame;
        near.push(chunk);
      }
      if (chunk.detail) {
        chunk.detail.visible = isNear;
        chunk.context.visible = !isNear;
      } else {
        chunk.context.visible = true;
        if (isNear) this.detailQueue.add(chunk);
      }
    }

    for (const chunk of [...this.detailQueue]) {
      if (!near.includes(chunk) || chunk.detail) this.detailQueue.delete(chunk);
    }

    // Build at most one queued chunk per frame to avoid long hitches.
    const next = this.detailQueue.values().next().value as Chunk | undefined;
    if (next) {
      this.detailQueue.delete(next);
      this.buildDetail(next);
      if (distanceToBox(camera.position, next.bounds) <= this.detailRadius) {
        next.detail!.visible = true;
        next.context.visible = false;
      }
    }

    this.trimCache(near);
  }

  private buildDetail(chunk: Chunk): void {
    if (chunk.detail) return;
    const batcher = new DetailBatcher();
    const group = new THREE.Group();
    group.name = `lod3-chunk-${chunk.key}`;
    for (const building of chunk.buildings) {
      group.add(buildBuildingLODs(building, batcher, this.distances));
    }
    group.add(batcher.build());
    group.visible = false;
    this.root.add(group);
    chunk.detail = group;
  }

  private trimCache(near: Chunk[]): void {
    const detailed = [...this.chunks.values()].filter((chunk) => chunk.detail);
    if (detailed.length <= this.maxDetailChunks) return;
    const nearSet = new Set(near);
    const candidates = detailed.filter((chunk) => !nearSet.has(chunk));
    candidates.sort((a, b) => a.lastUsed - b.lastUsed);
    for (const chunk of candidates.slice(0, detailed.length - this.maxDetailChunks)) {
      this.disposeDetail(chunk);
    }
  }

  private disposeDetail(chunk: Chunk): void {
    if (!chunk.detail) return;
    chunk.detail.visible = false;
    chunk.detail.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) {
        object.geometry.dispose();
        object.dispose();
      } else if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
      }
    });
    chunk.detail.removeFromParent();
    chunk.detail = null;
    chunk.context.visible = true;
  }

  private hideDetailsShowContext(): void {
    for (const chunk of this.chunks.values()) {
      if (chunk.detail) chunk.detail.visible = false;
      chunk.context.visible = true;
    }
  }

  /** Prepares the scene for a complete LOD1 GLB export. */
  beginExport(): void {
    this.exporting = true;
    this.hideDetailsShowContext();
  }

  endExport(): void {
    this.exporting = false;
    if (this.lastCamera) this.update(this.lastCamera);
  }
}
