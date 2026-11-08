/**
 * Encoder PNG minimale, senza dipendenze.
 *
 * - `encodeIndexedPng` produce un PNG a palette 8 bit (ideale per la mappa
 *   dei blocchi di superficie: 1 pixel = 1 blocco).
 * - `encodeGray16Png` produce un PNG grayscale 16 bit (per eventuali heightmap).
 */

import zlib from 'node:zlib';

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

export function encodeIndexedPng(width, height, indices, palette) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 3;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const plte = Buffer.alloc(palette.length * 3);
  palette.forEach(([r, g, b], i) => {
    plte[i * 3] = r;
    plte[i * 3 + 1] = g;
    plte[i * 3 + 2] = b;
  });

  const rowLength = width + 1;
  const raw = Buffer.alloc(rowLength * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowLength] = 0;
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      raw[y * rowLength + 1 + x] = indices[rowOffset + x];
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('PLTE', plte),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

export function encodeGray16Png(width, height, values, min, max) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 16;
  ihdr[9] = 0;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const range = Math.max(1, max - min);
  const rowLength = width * 2 + 1;
  const raw = Buffer.alloc(rowLength * height);
  for (let y = 0; y < height; y++) {
    raw[y * rowLength] = 0;
    for (let x = 0; x < width; x++) {
      const normalized = Math.round(((values[y * width + x] - min) / range) * 65535);
      raw.writeUInt16BE(Math.max(0, Math.min(65535, normalized)), y * rowLength + 1 + x * 2);
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
