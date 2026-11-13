import * as THREE from 'three';

export interface GroundTileEntry {
  key: string;
  url: string;
  resolution_m: number;
  bbox_local: [number, number, number, number];
  pixels: number;
}

export interface GroundTileIndex {
  tile_size_m: number;
  tiles: GroundTileEntry[];
}

interface ResidentTile {
  entry: GroundTileEntry;
  mesh: THREE.Mesh;
  lastUsed: number;
}

function distanceToBox2D(x: number, z: number, bbox: [number, number, number, number]): number {
  const dx = Math.max(bbox[0] - x, 0, x - bbox[2]);
  const dz = Math.max(bbox[1] - z, 0, z - bbox[3]);
  return Math.hypot(dx, dz);
}

/**
 * High-resolution orthophoto tiles around the player.
 *
 * The global terrain texture stays as the horizon fallback; these tiles
 * replace it in a small radius (0.2 m in the centre, 0.5 m in the pilot).
 */
export class GroundTileManager {
  private readonly group = new THREE.Group();
  private readonly entries = new Map<string, GroundTileEntry>();
  private readonly resident = new Map<string, ResidentTile>();
  private readonly pending = new Set<string>();
  private readonly loader = new THREE.TextureLoader();
  private readonly tileSize: number;
  private radius: number;
  private maxTiles = 25;
  private enabled = true;
  private frame = 0;
  private lastCentre = new THREE.Vector2(Number.NaN, Number.NaN);

  constructor(
    private readonly root: THREE.Object3D,
    private readonly dataBase: string,
    index: GroundTileIndex,
    private readonly sample: (x: number, z: number) => number,
    options: { radius?: number; maxTiles?: number } = {},
  ) {
    this.tileSize = index.tile_size_m;
    this.radius = options.radius ?? 2;
    this.maxTiles = options.maxTiles ?? (this.radius * 2 + 1) ** 2;
    for (const entry of index.tiles) this.entries.set(entry.key, entry);
    this.group.name = 'ground-tiles';
    this.root.add(this.group);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.group.visible = enabled;
    this.lastCentre.set(Number.NaN, Number.NaN);
    if (!enabled) this.releaseAll();
  }

  setRadius(radius: number): void {
    this.radius = Math.max(0, Math.round(radius));
    this.maxTiles = (this.radius * 2 + 1) ** 2;
    this.lastCentre.set(Number.NaN, Number.NaN);
    this.trim();
  }

  update(camera: THREE.PerspectiveCamera): void {
    if (!this.enabled) return;
    this.frame += 1;
    if (camera.position.y > 650) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    const cx = Math.floor(camera.position.x / this.tileSize);
    const cz = Math.floor(camera.position.z / this.tileSize);
    if (cx === this.lastCentre.x && cz === this.lastCentre.y) {
      this.trim();
      return;
    }
    this.lastCentre.set(cx, cz);

    const wanted = new Set<string>();
    const wantedEntries: GroundTileEntry[] = [];
    for (let dz = -this.radius; dz <= this.radius; dz += 1) {
      for (let dx = -this.radius; dx <= this.radius; dx += 1) {
        const entry = this.entries.get(`${cx + dx}_${cz + dz}`);
        if (!entry) continue;
        wanted.add(entry.key);
        wantedEntries.push(entry);
      }
    }

    for (const [key, tile] of this.resident) {
      if (!wanted.has(key)) this.disposeTile(tile);
    }

    wantedEntries.sort(
      (a, b) =>
        distanceToBox2D(camera.position.x, camera.position.z, a.bbox_local) -
        distanceToBox2D(camera.position.x, camera.position.z, b.bbox_local),
    );
    for (const entry of wantedEntries) {
      if (this.resident.has(entry.key) || this.pending.has(entry.key)) continue;
      if (this.resident.size + this.pending.size >= this.maxTiles) break;
      this.load(entry);
    }
    this.trim();
  }

  private load(entry: GroundTileEntry): void {
    this.pending.add(entry.key);
    this.loader.load(
      `${this.dataBase}${entry.url}`,
      (texture) => {
        this.pending.delete(entry.key);
        if (!this.enabled) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = 8;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        const bbox = entry.bbox_local;
        const width = bbox[2] - bbox[0];
        const depth = bbox[3] - bbox[1];
        const geometry = new THREE.PlaneGeometry(width, depth, 10, 10);
        geometry.rotateX(-Math.PI / 2);
        const position = geometry.getAttribute('position');
        const centreX = (bbox[0] + bbox[2]) / 2;
        const centreZ = (bbox[1] + bbox[3]) / 2;
        for (let index = 0; index < position.count; index += 1) {
          const x = centreX + position.getX(index);
          const z = centreZ + position.getZ(index);
          position.setY(index, this.sample(x, z) + 0.035);
        }
        position.needsUpdate = true;
        geometry.computeVertexNormals();
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          toneMapped: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(centreX, 0, centreZ);
        mesh.renderOrder = 1;
        mesh.name = `ground-tile-${entry.key}`;
        this.group.add(mesh);
        this.resident.set(entry.key, { entry, mesh, lastUsed: this.frame });
      },
      undefined,
      () => {
        this.pending.delete(entry.key);
      },
    );
  }

  private trim(): void {
    if (this.resident.size <= this.maxTiles) return;
    const candidates = [...this.resident.values()].sort(
      (a, b) => a.lastUsed - b.lastUsed,
    );
    for (const tile of candidates.slice(0, this.resident.size - this.maxTiles)) {
      this.disposeTile(tile);
    }
  }

  private releaseAll(): void {
    for (const tile of [...this.resident.values()]) this.disposeTile(tile);
  }

  private disposeTile(tile: ResidentTile): void {
    const material = tile.mesh.material as THREE.MeshBasicMaterial;
    material.map?.dispose();
    material.dispose();
    tile.mesh.geometry.dispose();
    tile.mesh.removeFromParent();
    this.resident.delete(tile.entry.key);
  }
}
