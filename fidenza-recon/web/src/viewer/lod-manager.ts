import * as THREE from 'three';
import type { Building, ChunkEntry } from '../types';
import { DetailBatcher } from '../city/facade';
import { buildBuildingLODs, buildContextBatch } from '../city/building';

interface LodDistances {
  lod0: number;
  lod1: number;
  lod2: number;
  lod3: number;
}

export interface CityLodManagerOptions {
  chunkSize?: number;
  parentChunkSize?: number;
  detailRadius?: number;
  maxDetailChunks?: number;
  chunks?: Record<string, ChunkEntry>;
  loadChunk?: (key: string) => Promise<Building[]>;
  maxConcurrentRequests?: number;
  onDetailLoaded?: () => void;
}

interface ParentChunk {
  key: string;
  bounds: THREE.Box3;
  context: THREE.Group;
  lastUsed: number;
}

interface Chunk {
  key: string;
  parent: string;
  buildings: Building[];
  bounds: THREE.Box3;
  context: THREE.Group | null;
  detail: THREE.Group | null;
  lastUsed: number;
  failed: boolean;
}

function distanceToBox(point: THREE.Vector3, box: THREE.Box3): number {
  const dx = Math.max(box.min.x - point.x, 0, point.x - box.max.x);
  const dy = Math.max(box.min.y - point.y, 0, point.y - box.max.y);
  const dz = Math.max(box.min.z - point.z, 0, point.z - box.max.z);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Hierarchical chunked LOD streamer for the full-city payload.
 *
 * Parent chunks (480 m) keep a merged LOD1 batch and cover the whole city
 * with a few hundred draw calls. When the camera approaches, the parent is
 * split into 120 m child chunks: their merged LOD1 batches are shown first,
 * then the LOD3 detail JSON is fetched asynchronously and swapped in. Far or
 * excess chunks are released so memory stays bounded.
 */
export class CityLodManager {
  private readonly parents = new Map<string, ParentChunk>();
  private readonly chunks = new Map<string, Chunk>();
  private readonly detailQueue = new Set<Chunk>();
  private readonly pending = new Set<string>();
  private readonly detailCache = new Map<string, Building[]>();
  private detailsVisible = true;
  private exporting = false;
  private frame = 0;
  private activeRequests = 0;
  private lastCamera: THREE.PerspectiveCamera | null = null;
  private readonly chunkSize: number;
  private readonly parentChunkSize: number;
  private detailRadius: number;
  private maxDetailChunks: number;
  private readonly chunkIndex: Record<string, ChunkEntry>;
  private readonly loadChunk?: (key: string) => Promise<Building[]>;
  private readonly maxConcurrentRequests: number;
  private readonly onDetailLoaded?: () => void;

  constructor(
    private readonly root: THREE.Group,
    buildings: Building[],
    private readonly distances: LodDistances,
    options: CityLodManagerOptions = {},
  ) {
    this.chunkSize = options.chunkSize ?? 120;
    this.parentChunkSize = options.parentChunkSize ?? 480;
    this.detailRadius = options.detailRadius ?? 200;
    this.maxDetailChunks = options.maxDetailChunks ?? 24;
    this.chunkIndex = options.chunks ?? {};
    this.loadChunk = options.loadChunk;
    this.maxConcurrentRequests = options.maxConcurrentRequests ?? 2;
    this.onDetailLoaded = options.onDetailLoaded;
    this.buildChunks(buildings);
  }

  private parentKeyFor(building: Building): string {
    if (building.parent_chunk) return `p:${building.parent_chunk}`;
    const [x, z] = building.centroid_local;
    return `p:${Math.floor(x / this.parentChunkSize)}_${Math.floor(z / this.parentChunkSize)}`;
  }

  private childKeyFor(building: Building): string | null {
    if (building.chunk) return building.chunk;
    const [x, z] = building.centroid_local;
    return `${Math.floor(x / this.chunkSize)}_${Math.floor(z / this.chunkSize)}`;
  }

  private detailAvailable(key: string): boolean {
    if (this.loadChunk === undefined) return true;
    return key in this.chunkIndex;
  }

  private boundsFor(buildings: Building[], indexed?: number[]): THREE.Box3 {
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (const building of buildings) {
      minY = Math.min(minY, building.base_y);
      maxY = Math.max(maxY, building.base_y + building.height_m);
      for (const [x, z] of building.footprint) {
        minX = Math.min(minX, x);
        minZ = Math.min(minZ, z);
        maxX = Math.max(maxX, x);
        maxZ = Math.max(maxZ, z);
      }
    }
    if (indexed) {
      return new THREE.Box3(
        new THREE.Vector3(indexed[0], minY, indexed[1]),
        new THREE.Vector3(indexed[2], maxY, indexed[3]),
      );
    }
    return new THREE.Box3(
      new THREE.Vector3(minX, minY, minZ),
      new THREE.Vector3(maxX, maxY, maxZ),
    );
  }

  private buildChunks(buildings: Building[]): void {
    const parentGroups = new Map<string, Building[]>();
    const childGroups = new Map<string, Building[]>();

    for (const building of buildings) {
      const parentKey = this.parentKeyFor(building);
      const parentList = parentGroups.get(parentKey);
      if (parentList) parentList.push(building);
      else parentGroups.set(parentKey, [building]);

      const childKey = this.childKeyFor(building);
      if (childKey) {
        const childList = childGroups.get(childKey);
        if (childList) childList.push(building);
        else childGroups.set(childKey, [building]);
      }
    }

    for (const [key, list] of parentGroups) {
      const context = buildContextBatch(list);
      context.name = `lod1-parent-${key}`;
      context.userData.kind = 'lod1-parent';
      this.root.add(context);
      this.parents.set(key, {
        key,
        bounds: this.boundsFor(list),
        context,
        lastUsed: 0,
      });
    }

    for (const [key, list] of childGroups) {
      const parent = this.parentKeyFor(list[0]);
      const context = this.detailAvailable(key) ? buildContextBatch(list) : null;
      if (context) {
        context.name = `lod1-chunk-${key}`;
        context.userData.kind = 'lod1-chunk';
        context.visible = false;
        this.root.add(context);
      }
      this.chunks.set(key, {
        key,
        parent,
        buildings: list,
        bounds: this.boundsFor(list, this.chunkIndex[key]?.bbox_local),
        context,
        detail: null,
        lastUsed: 0,
        failed: false,
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

  /** Switches the LOD3 detail radius / cache preset at runtime. */
  setQuality(detailRadius: number, maxDetailChunks: number): void {
    this.detailRadius = detailRadius;
    this.maxDetailChunks = maxDetailChunks;
    if (this.lastCamera) this.update(this.lastCamera);
  }

  /** Loads the closest detail chunks immediately so the spawn is detailed. */
  async warmUp(camera: THREE.PerspectiveCamera, maxChunks = 6): Promise<void> {
    this.lastCamera = camera;
    if (!this.detailsVisible) return;
    const candidates = [...this.chunks.values()]
      .filter(
        (chunk) =>
          !chunk.detail && !chunk.failed && this.detailAvailable(chunk.key),
      )
      .map((chunk) => ({ chunk, distance: distanceToBox(camera.position, chunk.bounds) }))
      .filter((entry) => entry.distance <= this.detailRadius)
      .sort((a, b) => a.distance - b.distance);
    for (const entry of candidates.slice(0, maxChunks)) {
      await this.loadDetail(entry.chunk);
    }
    this.update(camera);
  }

  update(camera: THREE.PerspectiveCamera): void {
    this.lastCamera = camera;
    this.frame += 1;
    if (this.exporting || !this.detailsVisible) {
      this.hideDetailsShowContext();
      return;
    }

    const parentsWithChildren = new Set<string>();
    for (const parent of this.parents.values()) {
      const distance = distanceToBox(camera.position, parent.bounds);
      const childrenActive =
        this.detailRadius > 0 &&
        distance <= this.detailRadius + this.chunkSize;
      parent.context.visible = !childrenActive;
      if (childrenActive) {
        parent.lastUsed = this.frame;
        parentsWithChildren.add(parent.key);
      }
    }

    const near = new Set<Chunk>();
    const candidates: { chunk: Chunk; distance: number }[] = [];
    for (const chunk of this.chunks.values()) {
      const parentActive = parentsWithChildren.has(chunk.parent);
      if (!parentActive) {
        if (chunk.context) chunk.context.visible = false;
        if (chunk.detail) chunk.detail.visible = false;
        continue;
      }
      const distance = distanceToBox(camera.position, chunk.bounds);
      const isNear = distance <= this.detailRadius;
      if (isNear) {
        chunk.lastUsed = this.frame;
        near.add(chunk);
      }
      if (chunk.detail) {
        chunk.detail.visible = isNear;
        if (chunk.context) chunk.context.visible = !isNear;
      } else {
        if (chunk.context) chunk.context.visible = true;
        if (isNear && this.detailAvailable(chunk.key)) {
          candidates.push({ chunk, distance });
        }
      }
    }

    for (const chunk of [...this.detailQueue]) {
      if (!near.has(chunk) || chunk.detail) this.detailQueue.delete(chunk);
    }

    candidates.sort((a, b) => a.distance - b.distance);
    for (const { chunk } of candidates) {
      if (this.activeRequests >= this.maxConcurrentRequests) break;
      if (this.detailQueue.has(chunk) || this.pending.has(chunk.key)) continue;
      this.detailQueue.add(chunk);
    }

    this.pumpQueue();
    this.trimCache(near);
  }

  private pumpQueue(): void {
    while (this.activeRequests < this.maxConcurrentRequests && this.detailQueue.size) {
      const next = this.detailQueue.values().next().value as Chunk;
      this.detailQueue.delete(next);
      if (next.detail || next.failed || this.pending.has(next.key)) continue;
      void this.loadDetail(next);
    }
  }

  private async loadDetail(chunk: Chunk): Promise<void> {
    if (chunk.detail || chunk.failed || this.pending.has(chunk.key)) return;
    this.pending.add(chunk.key);
    this.activeRequests += 1;
    try {
      let buildings = this.detailCache.get(chunk.key);
      if (!buildings) {
        if (this.loadChunk) {
          buildings = await this.loadChunk(chunk.key);
        } else {
          buildings = chunk.buildings;
        }
        this.detailCache.set(chunk.key, buildings);
        if (this.detailCache.size > this.maxDetailChunks * 2) {
          const oldest = this.detailCache.keys().next().value as string | undefined;
          if (oldest !== undefined) this.detailCache.delete(oldest);
        }
      }
      if (!this.detailsVisible || this.exporting) return;
      this.buildDetail(chunk, buildings);
      this.onDetailLoaded?.();
      const near = this.lastCamera
        ? distanceToBox(this.lastCamera.position, chunk.bounds) <= this.detailRadius
        : false;
      chunk.detail!.visible = near;
      if (chunk.context) chunk.context.visible = !near;
    } catch (error) {
      chunk.failed = true;
      console.warn(`detail chunk ${chunk.key} unavailable, keeping LOD1`, error);
    } finally {
      this.pending.delete(chunk.key);
      this.activeRequests -= 1;
    }
  }

  private buildDetail(chunk: Chunk, buildings: Building[]): void {
    if (chunk.detail) return;
    const batcher = new DetailBatcher();
    const group = new THREE.Group();
    group.name = `lod3-chunk-${chunk.key}`;
    for (const building of buildings) {
      group.add(buildBuildingLODs(building, batcher, this.distances));
    }
    group.add(batcher.build());
    group.visible = false;
    this.root.add(group);
    chunk.detail = group;
  }

  private trimCache(near: Set<Chunk>): void {
    const detailed = [...this.chunks.values()].filter((chunk) => chunk.detail);
    if (detailed.length <= this.maxDetailChunks) return;
    const candidates = detailed.filter((chunk) => !near.has(chunk));
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
    if (chunk.context) chunk.context.visible = true;
  }

  private hideDetailsShowContext(): void {
    for (const parent of this.parents.values()) {
      parent.context.visible = true;
    }
    for (const chunk of this.chunks.values()) {
      if (chunk.detail) chunk.detail.visible = false;
      if (chunk.context) chunk.context.visible = false;
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
