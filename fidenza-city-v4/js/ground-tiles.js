/**
 * Near-field 0.5 m orthophoto tiles.
 *
 * The base orthophoto (4096 px, ~1.35 m/px) and the 0.295 m/px centre patch
 * stay in place. This streamer adds 0.5 m/px 256 m tiles around the camera so
 * the ground is sharp outside the historic centre too. High quality extends
 * the grid to 7×7 on desktop and fades the outer tiles into the base ortho to
 * avoid a visible moving square. Tiles live in their own group above the base
 * and below the centre/areas/roads.
 */

import * as THREE from 'three';
import { getTileImage, closeTileImage, TILE_BASE } from './ground-cache.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export class GroundTileStreamer {
  constructor({
    scene,
    renderer,
    meta,
    quality = 'high',
    isMobile = false,
    centerBounds = null,
    centerLoaded = false
  }) {
    this.scene = scene;
    this.renderer = renderer;
    this.meta = meta;
    this.quality = quality;
    this.radius = quality === 'high' ? (isMobile ? 2 : 3) : quality === 'medium' ? 1 : -1;
    this.isMobile = isMobile;
    this.centerBounds = centerBounds;
    this.centerLoaded = centerLoaded;
    this.tileMeters = Number(meta.tileMeters) || 256;
    this.tilePixels = Number(meta.tilePixels) || 512;
    this.borderPixels = Number(meta.borderPixels) || 4;
    this.imagePixels = Number(meta.imagePixels) || (this.tilePixels + this.borderPixels * 2);
    this.level = meta.level || '05';
    this.bounds = meta.bounds;
    this.grid = meta.grid || { cols: 0, rows: 0 };
    this.basePath = `${TILE_BASE}${this.level}/`;
    this.anisotropy = Math.min(
      quality === 'high' ? 16 : quality === 'medium' ? 8 : 2,
      renderer?.capabilities?.getMaxAnisotropy?.() || 1
    );
    this.webgl1 = renderer?.capabilities?.isWebGL2 === false;
    this.maxActive = isMobile ? 3 : quality === 'high' ? 6 : 4;
    this.updateInterval = quality === 'high' && !isMobile ? 180 : 250;
    this.maxRetained = quality === 'high' ? (isMobile ? 36 : 56) : quality === 'medium' ? (isMobile ? 18 : 24) : 0;
    this.keepDistance = this.tileMeters * (this.radius + 1.05);
    this.lookAhead = this.tileMeters * 0.25;
    this.fadeEnabled = quality === 'high' && !isMobile;
    this.fadeDuration = 220;
    this.fadeStart = this.tileMeters * Math.max(0, this.radius - 0.7);
    this.fadeEnd = this.tileMeters * Math.max(0, this.radius - 0.05);
    this.fadeUniforms = {
      uGroundCamera: { value: new THREE.Vector2() },
      uGroundFadeStart: { value: this.fadeStart },
      uGroundFadeEnd: { value: this.fadeEnd }
    };

    this.group = new THREE.Group();
    this.group.name = 'ground-tiles';
    scene.add(this.group);

    const geometry = new THREE.PlaneGeometry(this.tileMeters, this.tileMeters);
    geometry.rotateX(-Math.PI / 2);
    const uv = geometry.attributes.uv;
    const u0 = this.borderPixels / this.imagePixels;
    const u1 = (this.borderPixels + this.tilePixels) / this.imagePixels;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), u0 + uv.getY(i) * (u1 - u0));
    }
    this.geometry = geometry;

    this.tiles = new Map();
    this.loading = new Set();
    this.failed = new Map();
    this.desired = new Map();
    this.queue = [];
    this.active = 0;
    this.initialized = false;
    this.hasStarted = false;
    this.lastUpdate = -Infinity;
    this.disposed = false;
    this.prefetchProgress = null;
    this.loadedBytes = 0;
    this.tint = new THREE.Color('#ffffff');
  }

  setTint(color) {
    this.tint.set(color || '#ffffff');
    for (const tile of this.tiles.values()) {
      tile.mesh.material.color.copy(this.tint);
    }
  }

  _key(col, row) {
    return `${col}_${row}`;
  }

  _tileUrl(col, row) {
    return `${this.basePath}${col}_${row}.jpg`;
  }

  _tileCenter(col, row) {
    return {
      x: this.bounds.minX + (col + 0.5) * this.tileMeters,
      z: this.bounds.minZ + (row + 0.5) * this.tileMeters
    };
  }

  _centerCovers(col, row) {
    if (!this.centerLoaded || !this.centerBounds) return false;
    const cb = this.centerBounds;
    const minX = this.bounds.minX + col * this.tileMeters;
    const maxX = minX + this.tileMeters;
    const minZ = this.bounds.minZ + row * this.tileMeters;
    const maxZ = minZ + this.tileMeters;
    const margin = 2;
    return (
      minX >= cb.minX + margin && maxX <= cb.maxX - margin &&
      minZ >= cb.minZ + margin && maxZ <= cb.maxZ - margin
    );
  }

  _computeDesired(x, z, viewDirection = null) {
    const desired = new Map();
    const { cols, rows } = this.grid;
    if (this.radius < 0 || !cols || !rows || !Number.isFinite(x) || !Number.isFinite(z)) {
      return desired;
    }
    const margin = this.tileMeters * (this.radius + 1);
    if (
      x < this.bounds.minX - margin || x > this.bounds.maxX + margin ||
      z < this.bounds.minZ - margin || z > this.bounds.maxZ + margin
    ) {
      return desired;
    }
    const aheadX = Number.isFinite(viewDirection?.x) ? viewDirection.x * this.lookAhead : 0;
    const aheadZ = Number.isFinite(viewDirection?.z) ? viewDirection.z * this.lookAhead : 0;
    const baseCol = clamp(
      Math.floor((x + aheadX - this.bounds.minX) / this.tileMeters), 0, cols - 1
    );
    const baseRow = clamp(
      Math.floor((z + aheadZ - this.bounds.minZ) / this.tileMeters), 0, rows - 1
    );
    for (let dr = -this.radius; dr <= this.radius; dr++) {
      for (let dc = -this.radius; dc <= this.radius; dc++) {
        const col = baseCol + dc;
        const row = baseRow + dr;
        if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
        if (this._centerCovers(col, row)) continue;
        const center = this._tileCenter(col, row);
        const distance = Math.hypot(center.x - x, center.z - z);
        desired.set(this._key(col, row), { col, row, distance });
      }
    }
    return desired;
  }

  _tickFades(now) {
    if (!this.fadeEnabled) return;
    for (const tile of this.tiles.values()) {
      if (!tile.fadeAt) continue;
      const progress = Math.min(1, (now - tile.fadeAt) / this.fadeDuration);
      tile.mesh.material.opacity = progress;
      if (progress >= 1) tile.fadeAt = 0;
    }
  }

  _patchGroundMaterial(shader) {
    shader.uniforms.uGroundCamera = this.fadeUniforms.uGroundCamera;
    shader.uniforms.uGroundFadeStart = this.fadeUniforms.uGroundFadeStart;
    shader.uniforms.uGroundFadeEnd = this.fadeUniforms.uGroundFadeEnd;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vGroundWorldPosition;'
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvGroundWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec2 uGroundCamera;\nuniform float uGroundFadeStart;\nuniform float uGroundFadeEnd;\nvarying vec3 vGroundWorldPosition;'
      )
      .replace(
        '#include <opaque_fragment>',
        '#include <opaque_fragment>\nfloat groundDistance = distance(vGroundWorldPosition.xz, uGroundCamera);\ngl_FragColor.a *= 1.0 - smoothstep(uGroundFadeStart, uGroundFadeEnd, groundDistance);'
      );
  }

  update(position, viewDirection = null, force = false) {
    if (this.disposed || this.radius < 0 || !position) return;
    if (typeof viewDirection === 'boolean') {
      force = viewDirection;
      viewDirection = null;
    }
    const now = performance.now();
    const x = Number(position.x);
    const z = Number(position.z);
    if (!force) this.hasStarted = true;
    if (Number.isFinite(x) && Number.isFinite(z) && this.fadeEnabled) {
      this.fadeUniforms.uGroundCamera.value.set(x, z);
      this._tickFades(now);
    }
    if (!force && now - this.lastUpdate < this.updateInterval) return;
    this.lastUpdate = now;
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;

    this.desired = this._computeDesired(x, z, viewDirection);

    for (const [key, tile] of [...this.tiles]) {
      if (this.desired.has(key)) continue;
      const center = tile.center;
      const distance = Math.hypot(center.x - x, center.z - z);
      if (distance > this.keepDistance) this._evict(key);
    }
    if (this.tiles.size > this.maxRetained) {
      const extra = [];
      for (const [key, tile] of this.tiles) {
        if (this.desired.has(key)) continue;
        extra.push({
          key,
          distance: Math.hypot(tile.center.x - x, tile.center.z - z)
        });
      }
      extra.sort((a, b) => b.distance - a.distance);
      while (this.tiles.size > this.maxRetained && extra.length) {
        this._evict(extra.shift().key);
      }
    }

    const queue = [];
    for (const [key, item] of this.desired) {
      if (this.tiles.has(key) || this.loading.has(key)) continue;
      const retryAt = this.failed.get(key);
      if (retryAt && retryAt > now) continue;
      if (retryAt) this.failed.delete(key);
      queue.push({ key, ...item });
    }
    queue.sort((a, b) => a.distance - b.distance);
    this.queue = queue;
    this.initialized = true;
    this._flush();
  }

  preload(x, z) {
    if (this.fadeEnabled && Number.isFinite(Number(x)) && Number.isFinite(Number(z))) {
      this.fadeUniforms.uGroundCamera.value.set(Number(x), Number(z));
    }
    this.update({ x, z }, null, true);
  }

  _flush() {
    while (this.active < this.maxActive && this.queue.length) {
      const item = this.queue.shift();
      if (!this.desired.has(item.key) || this.tiles.has(item.key) || this.loading.has(item.key)) continue;
      this._load(item);
    }
  }

  _load(item) {
    const { key, col, row } = item;
    this.loading.add(key);
    this.active++;
    getTileImage(this._tileUrl(col, row))
      .then(image => {
        this.loading.delete(key);
        this.active--;
        if (this.disposed || !this.desired.has(key)) {
          closeTileImage(image);
          this._flush();
          return;
        }
        const texture = new THREE.Texture(image);
        texture.needsUpdate = true;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.generateMipmaps = true;
        texture.anisotropy = this.anisotropy;
        if (this.webgl1) {
          texture.generateMipmaps = false;
          texture.minFilter = THREE.LinearFilter;
        }
        const material = new THREE.MeshLambertMaterial({
          map: texture,
          color: this.tint,
          transparent: this.fadeEnabled,
          depthWrite: !this.fadeEnabled,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3
        });
        if (this.fadeEnabled) {
          material.opacity = this.hasStarted ? 0 : 1;
          material.onBeforeCompile = shader => this._patchGroundMaterial(shader);
          material.customProgramCacheKey = () => 'ground-tile-fade-v1';
        }
        const mesh = new THREE.Mesh(this.geometry, material);
        const center = this._tileCenter(col, row);
        mesh.position.set(center.x, 0.016, center.z);
        mesh.receiveShadow = true;
        mesh.renderOrder = this.fadeEnabled ? -1 : 0;
        mesh.name = `ground-tile-${key}`;
        this.group.add(mesh);
        this.tiles.set(key, {
          mesh,
          texture,
          image,
          col,
          row,
          center,
          fadeAt: this.fadeEnabled && this.hasStarted ? performance.now() : 0
        });
        this.loadedBytes += image.width * image.height * 4;
        this._flush();
      })
      .catch(() => {
        this.loading.delete(key);
        this.active--;
        this.failed.set(key, performance.now() + 30000);
        this._flush();
      });
  }

  _evict(key) {
    const tile = this.tiles.get(key);
    if (!tile) return;
    this.group.remove(tile.mesh);
    tile.mesh.material.map?.dispose();
    tile.mesh.material.dispose();
    closeTileImage(tile.image);
    this.tiles.delete(key);
  }

  dispose() {
    this.disposed = true;
    for (const key of [...this.tiles.keys()]) this._evict(key);
    this.queue.length = 0;
    this.loading.clear();
    this.desired.clear();
    this.group.removeFromParent();
    this.geometry.dispose();
  }

  get stats() {
    return {
      loaded: this.tiles.size,
      loading: this.loading.size,
      queued: this.queue.length,
      desired: this.desired.size,
      radius: this.radius,
      maxRetained: this.maxRetained,
      fade: this.fadeEnabled,
      fadeStart: this.fadeStart,
      fadeEnd: this.fadeEnd,
      gpuBytes: this.tiles.size * this.imagePixels * this.imagePixels * 4
    };
  }
}
