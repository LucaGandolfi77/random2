/**
 * Tile layer con LOD per l'editor.
 *
 * Carica la piramide `data/arnis/surface-zN.png` e disegna solo il rettangolo
 * visibile, scegliendo il livello più adatto allo zoom corrente.
 */

export class TileLayer {
  constructor({ baseUrl = '../data/arnis/', manifest = null, fallbackImage = null, onReady = null } = {}) {
    this.baseUrl = baseUrl;
    this.manifest = manifest;
    this.fallbackImage = fallbackImage;
    this.onReady = onReady;
    this.levels = [...(manifest?.levels || [])].sort((a, b) => a.blocksPerPixel - b.blocksPerPixel);
    this.images = new Map();
    this.pending = new Map();
    this.failed = new Set();
    this.revision = 0;
  }

  get bounds() {
    return this.manifest?.bounds || null;
  }

  async _load(level) {
    if (!level || this.images.has(level.id) || this.failed.has(level.id)) return this.images.get(level.id) || null;
    if (this.pending.has(level.id)) return this.pending.get(level.id);
    const promise = new Promise(resolve => {
      const image = new Image();
      image.onload = async () => {
        try { await image.decode?.(); } catch { /* decode opzionale */ }
        this.images.set(level.id, image);
        this.revision++;
        this.pending.delete(level.id);
        this.onReady?.();
        resolve(image);
      };
      image.onerror = () => {
        this.failed.add(level.id);
        this.pending.delete(level.id);
        resolve(null);
      };
      image.src = `${this.baseUrl}${level.src}`;
    });
    this.pending.set(level.id, promise);
    return promise;
  }

  async loadLevels(ids) {
    const levels = ids
      .map(id => this.levels.find(level => level.id === id))
      .filter(Boolean);
    await Promise.all(levels.map(level => this._load(level)));
  }

  async loadInitial() {
    if (!this.levels.length) return;
    await this.loadLevels(['z3', 'z2']);
  }

  loadRest() {
    if (!this.levels.length) return;
    this.loadLevels(['z1', 'z0']).catch(() => {});
  }

  _desiredLevel(scale) {
    if (!this.levels.length) return null;
    const bounds = this.bounds;
    if (!bounds) return this.levels[0];
    const worldWidth = Math.max(1, bounds.maxX - bounds.minX);
    const screenWidth = worldWidth * scale;
    // Scegli il LOD più grosso che copre ancora la risoluzione richiesta.
    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (this.levels[i].width >= screenWidth * 1.05) return this.levels[i];
    }
    return this.levels[0];
  }

  _bestLoaded(desired) {
    if (!desired) {
      for (let i = this.levels.length - 1; i >= 0; i--) {
        const image = this.images.get(this.levels[i].id);
        if (image) return { level: this.levels[i], image };
      }
      return null;
    }
    const desiredIndex = this.levels.findIndex(level => level.id === desired.id);
    for (let i = desiredIndex; i >= 0; i--) {
      const level = this.levels[i];
      const image = this.images.get(level.id);
      if (image) return { level, image };
    }
    for (let i = desiredIndex + 1; i < this.levels.length; i++) {
      const level = this.levels[i];
      const image = this.images.get(level.id);
      if (image) return { level, image };
    }
    return null;
  }

  draw(ctx, { scale, width, height, worldToScreen }) {
    if (!this.bounds) return false;
    const desired = this._desiredLevel(scale);
    if (desired) this._load(desired);
    const loaded = this._bestLoaded(desired);
    const image = loaded?.image || this.fallbackImage;
    if (!image) return false;

    const tl = worldToScreen(this.bounds.minX, this.bounds.minZ);
    const br = worldToScreen(this.bounds.maxX, this.bounds.maxZ);
    const dw = br.x - tl.x;
    const dh = br.y - tl.y;
    if (dw <= 0 || dh <= 0) return false;
    const x0 = Math.max(0, tl.x);
    const y0 = Math.max(0, tl.y);
    const x1 = Math.min(width, br.x);
    const y1 = Math.min(height, br.y);
    if (x1 <= x0 || y1 <= y0) return false;

    const iw = image.naturalWidth || image.width;
    const ih = image.naturalHeight || image.height;
    if (!iw || !ih) return false;
    const u0 = (x0 - tl.x) / dw;
    const v0 = (y0 - tl.y) / dh;
    const u1 = (x1 - tl.x) / dw;
    const v1 = (y1 - tl.y) / dh;
    const sx = Math.max(0, Math.floor(u0 * iw));
    const sy = Math.max(0, Math.floor(v0 * ih));
    const sw = Math.min(iw - sx, Math.ceil((u1 - u0) * iw));
    const sh = Math.min(ih - sy, Math.ceil((v1 - v0) * ih));
    if (sw <= 0 || sh <= 0) return false;

    ctx.save();
    ctx.imageSmoothingEnabled = scale < 2;
    ctx.drawImage(image, sx, sy, sw, sh, x0, y0, x1 - x0, y1 - y0);
    ctx.restore();
    return true;
  }
}
