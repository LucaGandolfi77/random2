/**
 * Lettore minimale NBT + Anvil per i save Minecraft usati da ArnisWorld3.
 *
 * Supporta:
 *  - file region .mca con chunk zlib/gzip/non compressi;
 *  - palette dei blocchi nel formato 1.13+ (Name) e nel formato usato da
 *    ArnisWorld3/DataVersion 5023 (id);
 *  - Heightmaps WORLD_SURFACE (9 bit, offset -64/-65).
 *
 * Non dipende da librerie esterne: solo Node.js.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const TAG = {
  END: 0,
  BYTE: 1,
  SHORT: 2,
  INT: 3,
  LONG: 4,
  FLOAT: 5,
  DOUBLE: 6,
  BYTE_ARRAY: 7,
  STRING: 8,
  LIST: 9,
  COMPOUND: 10,
  INT_ARRAY: 11,
  LONG_ARRAY: 12
};

class Cursor {
  constructor(buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }
  u8() { const v = this.buffer.readUInt8(this.offset); this.offset += 1; return v; }
  i8() { const v = this.buffer.readInt8(this.offset); this.offset += 1; return v; }
  u16() { const v = this.buffer.readUInt16BE(this.offset); this.offset += 2; return v; }
  i16() { const v = this.buffer.readInt16BE(this.offset); this.offset += 2; return v; }
  i32() { const v = this.buffer.readInt32BE(this.offset); this.offset += 4; return v; }
  i64() { const v = this.buffer.readBigInt64BE(this.offset); this.offset += 8; return v; }
  f32() { const v = this.buffer.readFloatBE(this.offset); this.offset += 4; return v; }
  f64() { const v = this.buffer.readDoubleBE(this.offset); this.offset += 8; return v; }
  string() {
    const length = this.u16();
    const value = this.buffer.toString('utf8', this.offset, this.offset + length);
    this.offset += length;
    return value;
  }
  bytes(length) {
    const value = this.buffer.subarray(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }
}

function readPayload(cursor, type) {
  switch (type) {
    case TAG.BYTE: return cursor.i8();
    case TAG.SHORT: return cursor.i16();
    case TAG.INT: return cursor.i32();
    case TAG.LONG: return cursor.i64();
    case TAG.FLOAT: return cursor.f32();
    case TAG.DOUBLE: return cursor.f64();
    case TAG.BYTE_ARRAY: {
      const length = cursor.i32();
      return Buffer.from(cursor.bytes(length));
    }
    case TAG.STRING: return cursor.string();
    case TAG.LIST: {
      const elementType = cursor.u8();
      const length = cursor.i32();
      const out = [];
      for (let i = 0; i < length; i++) out.push(readPayload(cursor, elementType));
      return out;
    }
    case TAG.COMPOUND: {
      const out = {};
      while (true) {
        const childType = cursor.u8();
        if (childType === TAG.END) return out;
        const name = cursor.string();
        out[name] = readPayload(cursor, childType);
      }
    }
    case TAG.INT_ARRAY: {
      const length = cursor.i32();
      const out = new Int32Array(length);
      for (let i = 0; i < length; i++) out[i] = cursor.i32();
      return out;
    }
    case TAG.LONG_ARRAY: {
      const length = cursor.i32();
      const out = new Array(length);
      for (let i = 0; i < length; i++) out[i] = cursor.i64();
      return out;
    }
    default:
      throw new Error(`NBT: tipo tag sconosciuto ${type}`);
  }
}

export function parseNbt(buffer) {
  const cursor = new Cursor(buffer);
  const type = cursor.u8();
  if (type !== TAG.COMPOUND) throw new Error('NBT: root non composto');
  cursor.string();
  return readPayload(cursor, TAG.COMPOUND);
}

export function paletteEntryName(entry) {
  if (typeof entry === 'string') return entry;
  if (!entry || typeof entry !== 'object') return 'minecraft:air';
  for (const key of ['Name', 'name', 'id', 'Id']) {
    if (typeof entry[key] === 'string') return entry[key];
  }
  for (const [key, value] of Object.entries(entry)) {
    if (key === 'properties' || key === 'Properties') continue;
    if (typeof value === 'string' && value.startsWith('minecraft:')) return value;
  }
  return 'minecraft:air';
}

function ceilLog2(value) {
  if (value <= 1) return 0;
  return Math.ceil(Math.log2(value));
}

function readPackedLong(data, index, bits, mask) {
  const perLong = Math.floor(64 / bits);
  const longIndex = Math.floor(index / perLong);
  if (longIndex < 0 || longIndex >= data.length) return 0;
  const shift = BigInt((index % perLong) * bits);
  return Number((data[longIndex] >> shift) & mask);
}

function decodeHeightmap(longs, bits = 9) {
  if (!Array.isArray(longs) || longs.length === 0) return null;
  const count = 256;
  const values = new Int16Array(count);
  const mask = (1n << BigInt(bits)) - 1n;
  let index = 0;
  for (const word of longs) {
    for (let j = 0; j < Math.floor(64 / bits) && index < count; j++) {
      values[index] = Number((word >> BigInt(j * bits)) & mask) - 65;
      index++;
    }
  }
  return values;
}

export class Region {
  constructor(filePath) {
    this.filePath = filePath;
    this.raw = fs.readFileSync(filePath);
    this.chunks = new Map();
  }

  chunk(cx, cz) {
    const localX = ((cx % 32) + 32) % 32;
    const localZ = ((cz % 32) + 32) % 32;
    const key = `${localX},${localZ}`;
    if (this.chunks.has(key)) return this.chunks.get(key);
    const headerIndex = (localX + localZ * 32) * 4;
    const offset = this.raw.readUIntBE(headerIndex, 3);
    if (!offset) {
      this.chunks.set(key, null);
      return null;
    }
    const start = offset * 4096;
    const length = this.raw.readUInt32BE(start);
    if (length < 5) {
      this.chunks.set(key, null);
      return null;
    }
    const compression = this.raw.readUInt8(start + 4);
    const payload = this.raw.subarray(start + 5, start + 4 + length);
    let decompressed;
    try {
      if (compression === 1) decompressed = zlib.gunzipSync(payload);
      else if (compression === 2) decompressed = zlib.inflateSync(payload);
      else if (compression === 3) decompressed = payload;
      else {
        this.chunks.set(key, null);
        return null;
      }
    } catch {
      this.chunks.set(key, null);
      return null;
    }
    let root;
    try {
      root = parseNbt(decompressed);
    } catch {
      this.chunks.set(key, null);
      return null;
    }
    const chunk = new Chunk(root, cx, cz, this.filePath);
    this.chunks.set(key, chunk);
    return chunk;
  }
}

class Chunk {
  constructor(root, cx, cz, filePath) {
    this.root = root;
    this.cx = cx;
    this.cz = cz;
    this.filePath = filePath;
    this.sections = new Map();
    for (const section of root.sections || []) {
      const y = Number(section.Y);
      const states = section.block_states || {};
      const palette = (states.palette || []).map(paletteEntryName);
      const data = states.data || null;
      const bits = palette.length <= 1 ? 0 : Math.max(4, ceilLog2(palette.length));
      this.sections.set(y, {
        y,
        palette,
        data,
        bits,
        mask: bits ? (1n << BigInt(bits)) - 1n : 0n,
        nonAir: palette.length > 1 || (palette.length === 1 && palette[0] !== 'minecraft:air')
      });
    }
    this.surfaceHeightmap = decodeHeightmap(root.Heightmaps?.WORLD_SURFACE, 9);
    this.motionHeightmap = decodeHeightmap(root.Heightmaps?.MOTION_BLOCKING_NO_LEAVES, 9);
    this.topSectionY = null;
    for (const [y, section] of this.sections) {
      if (!section.nonAir) continue;
      if (this.topSectionY == null || y > this.topSectionY) this.topSectionY = y;
    }
  }

  blockAtLocal(x, y, z) {
    const sectionY = Math.floor(y / 16);
    const section = this.sections.get(sectionY);
    if (!section) return 'minecraft:air';
    if (!section.nonAir) return section.palette[0] || 'minecraft:air';
    if (!section.data) return section.palette[0] || 'minecraft:air';
    const localY = y - sectionY * 16;
    const index = x + z * 16 + localY * 256;
    const value = readPackedLong(section.data, index, section.bits, section.mask);
    return section.palette[value] || 'minecraft:air';
  }

  surfaceAtLocal(x, z) {
    const column = x + z * 16;
    if (this.surfaceHeightmap) {
      const y = this.surfaceHeightmap[column];
      return { block: this.blockAtLocal(x, y, z), y };
    }
    const topY = this.topSectionY == null ? null : this.topSectionY * 16 + 15;
    if (topY == null) return { block: 'minecraft:air', y: -9999 };
    for (let y = topY; y >= -64; y--) {
      const block = this.blockAtLocal(x, y, z);
      if (block !== 'minecraft:air' && block !== 'minecraft:cave_air' && block !== 'minecraft:void_air') {
        return { block, y };
      }
    }
    return { block: 'minecraft:air', y: -9999 };
  }
}

export class AnvilWorld {
  constructor(worldRoot, { maxRegions = 6, maxChunks = 256 } = {}) {
    this.worldRoot = worldRoot;
    this.regionDir = path.join(worldRoot, 'dimensions', 'minecraft', 'overworld', 'region');
    this.regions = new Map();
    this.chunkCache = new Map();
    this.maxRegions = maxRegions;
    this.maxChunks = maxChunks;
  }

  regionPathForChunk(cx, cz) {
    return path.join(this.regionDir, `r.${Math.floor(cx / 32)}.${Math.floor(cz / 32)}.mca`);
  }

  region(cx, cz) {
    const filePath = this.regionPathForChunk(cx, cz);
    if (this.regions.has(filePath)) {
      const region = this.regions.get(filePath);
      this.regions.delete(filePath);
      this.regions.set(filePath, region);
      return region;
    }
    if (!fs.existsSync(filePath)) return null;
    const region = new Region(filePath);
    this.regions.set(filePath, region);
    while (this.regions.size > this.maxRegions) {
      const oldest = this.regions.keys().next().value;
      this.regions.delete(oldest);
    }
    return region;
  }

  chunk(cx, cz) {
    const key = `${cx},${cz}`;
    if (this.chunkCache.has(key)) {
      const chunk = this.chunkCache.get(key);
      this.chunkCache.delete(key);
      this.chunkCache.set(key, chunk);
      return chunk;
    }
    const region = this.region(cx, cz);
    if (!region) return null;
    const chunk = region.chunk(cx, cz);
    this.chunkCache.set(key, chunk);
    while (this.chunkCache.size > this.maxChunks) {
      const oldest = this.chunkCache.keys().next().value;
      this.chunkCache.delete(oldest);
    }
    return chunk;
  }

  blockAt(mx, my, mz) {
    const cx = Math.floor(mx / 16);
    const cz = Math.floor(mz / 16);
    const chunk = this.chunk(cx, cz);
    if (!chunk) return 'minecraft:air';
    return chunk.blockAtLocal(mx - cx * 16, my, mz - cz * 16);
  }

  surfaceAt(mx, mz) {
    const cx = Math.floor(mx / 16);
    const cz = Math.floor(mz / 16);
    const chunk = this.chunk(cx, cz);
    if (!chunk) return { block: 'minecraft:air', y: -9999 };
    return chunk.surfaceAtLocal(mx - cx * 16, mz - cz * 16);
  }

  clearChunkCache() {
    this.chunkCache.clear();
  }

  clearRegionCache() {
    this.regions.clear();
  }
}

export function makeProjection(metadata, origin) {
  const mPerDegLat = 111132.0;
  const mPerDegLon = 111320.0 * Math.cos((origin.lat * Math.PI) / 180);
  const minLat = metadata.minGeoLat;
  const maxLat = metadata.maxGeoLat;
  const minLon = metadata.minGeoLon;
  const maxLon = metadata.maxGeoLon;
  const maxMcX = metadata.maxMcX;
  const maxMcZ = metadata.maxMcZ;

  function gameToMc(x, z) {
    const lon = origin.lon + x / mPerDegLon;
    const lat = origin.lat - z / mPerDegLat;
    return {
      x: ((lon - minLon) / (maxLon - minLon)) * maxMcX,
      z: ((maxLat - lat) / (maxLat - minLat)) * maxMcZ
    };
  }

  function mcToGame(mx, mz) {
    const lon = minLon + (mx / maxMcX) * (maxLon - minLon);
    const lat = maxLat - (mz / maxMcZ) * (maxLat - minLat);
    return {
      x: (lon - origin.lon) * mPerDegLon,
      z: -(lat - origin.lat) * mPerDegLat
    };
  }

  function mcBlockOfGame(x, z) {
    const mc = gameToMc(x, z);
    return { x: Math.floor(mc.x), z: Math.floor(mc.z) };
  }

  return { gameToMc, mcToGame, mcBlockOfGame, mPerDegLat, mPerDegLon, minLat, maxLat, minLon, maxLon, maxMcX, maxMcZ };
}

export function readMetadata(worldRoot) {
  const filePath = path.join(worldRoot, 'metadata.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}
