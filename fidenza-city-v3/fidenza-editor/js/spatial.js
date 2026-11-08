/**
 * Indice spaziale a griglia per l'editor.
 *
 * Le feature molto grandi (una strada lunga o un'area vasta) non vengono
 * duplicate in centinaia di celle: finiscono in una lista "oversized" sempre
 * verificata. Questo mantiene leggero l'hit test con migliaia di edifici.
 */
export class SpatialIndex {
  constructor(cellSize = 120) {
    this.cellSize = cellSize;
    this.cells = new Map();
    this.oversized = [];
    this.size = 0;
  }

  _key(cx, cz) {
    return `${cx}:${cz}`;
  }

  add(data, bbox, maxCells = 64) {
    const item = { data, bbox };
    this.size++;
    const minX = Math.floor(bbox.minX / this.cellSize);
    const maxX = Math.floor(bbox.maxX / this.cellSize);
    const minZ = Math.floor(bbox.minZ / this.cellSize);
    const maxZ = Math.floor(bbox.maxZ / this.cellSize);
    const cells = (maxX - minX + 1) * (maxZ - minZ + 1);
    if (!Number.isFinite(cells) || cells > maxCells) {
      this.oversized.push(item);
      return;
    }
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cz = minZ; cz <= maxZ; cz++) {
        const key = this._key(cx, cz);
        let bucket = this.cells.get(key);
        if (!bucket) {
          bucket = [];
          this.cells.set(key, bucket);
        }
        bucket.push(item);
      }
    }
  }

  _collect(cx, cz, out, seen) {
    const bucket = this.cells.get(this._key(cx, cz));
    if (!bucket) return;
    for (const item of bucket) {
      if (seen.has(item)) continue;
      seen.add(item);
      out.push(item);
    }
  }

  queryRect(minX, minZ, maxX, maxZ) {
    const out = [];
    const seen = new Set();
    const cx0 = Math.floor(minX / this.cellSize);
    const cx1 = Math.floor(maxX / this.cellSize);
    const cz0 = Math.floor(minZ / this.cellSize);
    const cz1 = Math.floor(maxZ / this.cellSize);
    if ((cx1 - cx0 + 1) * (cz1 - cz0 + 1) > 4000) {
      // Vista troppo ampia: conviene restituire tutto senza deduplica costosa.
      const all = [];
      for (const bucket of this.cells.values()) all.push(...bucket);
      all.push(...this.oversized);
      return [...new Set(all)];
    }
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cz = cz0; cz <= cz1; cz++) this._collect(cx, cz, out, seen);
    }
    for (const item of this.oversized) {
      if (seen.has(item)) continue;
      seen.add(item);
      out.push(item);
    }
    return out;
  }

  queryPoint(x, z) {
    const out = [];
    const seen = new Set();
    this._collect(Math.floor(x / this.cellSize), Math.floor(z / this.cellSize), out, seen);
    for (const item of this.oversized) {
      if (seen.has(item)) continue;
      seen.add(item);
      out.push(item);
    }
    return out;
  }

  bounds() {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    const consider = item => {
      if (!item.bbox) return;
      if (item.bbox.minX < minX) minX = item.bbox.minX;
      if (item.bbox.maxX > maxX) maxX = item.bbox.maxX;
      if (item.bbox.minZ < minZ) minZ = item.bbox.minZ;
      if (item.bbox.maxZ > maxZ) maxZ = item.bbox.maxZ;
    };
    for (const bucket of this.cells.values()) for (const item of bucket) consider(item);
    for (const item of this.oversized) consider(item);
    return { minX, maxX, minZ, maxZ };
  }
}

export function bboxOverlaps(a, b) {
  return !(a.maxX < b.minX || a.minX > b.maxX || a.maxZ < b.minZ || a.minZ > b.maxZ);
}
