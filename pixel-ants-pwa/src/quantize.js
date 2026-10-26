/*
 * Sand Loop — colour quantization
 * ------------------------------
 * Pure, deterministic colour reduction used by the artwork board.
 *
 * The source is an image drawn down to a small grid (about 60 x 80 cells).
 * Those cells are reduced to a handful of sand colours with median-cut +
 * a few Lloyd iterations in CIE Lab. Two passes afterwards keep the palette
 * playable: near-identical colours are merged and rare colours are absorbed,
 * then the missing slots are refilled by splitting the widest cluster. The
 * result is always exactly `k` colours, even for a monochrome upload.
 *
 * No DOM, no randomness, no dependencies. This file is imported by the
 * browser and by the Node test suite.
 */

export const PAPER = [238, 228, 210];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* ---------- colour spaces ---------- */

export function rgbToLab(r, g, b) {
  const sr = r / 255, sg = g / 255, sb = b / 255;
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const R = lin(sr), G = lin(sg), B = lin(sb);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.0;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function labDistance(a, b) {
  const dl = a.L - b.L, da = a.a - b.a, db = a.b - b.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

function labOf(c) {
  if (c.lab) return c.lab;
  c.lab = rgbToLab(c.r, c.g, c.b);
  return c.lab;
}

export function toHex(c) {
  return "#" + [c.r, c.g, c.b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0")).join("");
}

export function makeColor(r, g, b) {
  const c = {
    r: clamp(Math.round(r), 0, 255),
    g: clamp(Math.round(g), 0, 255),
    b: clamp(Math.round(b), 0, 255)
  };
  c.hex = toHex(c);
  c.lab = rgbToLab(c.r, c.g, c.b);
  return c;
}

export function mixColor(a, b, t) {
  return makeColor(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
}

/* ---------- deterministic RNG (only used for stable shuffles) ---------- */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/* ---------- median cut ---------- */

function average(items) {
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < items.length; i++) {
    r += items[i][0]; g += items[i][1]; b += items[i][2];
  }
  const n = Math.max(1, items.length);
  return makeColor(r / n, g / n, b / n);
}

function widestChannel(items) {
  let rmin = 255, rmax = 0, gmin = 255, gmax = 0, bmin = 255, bmax = 0;
  for (let i = 0; i < items.length; i++) {
    const p = items[i];
    if (p[0] < rmin) rmin = p[0];
    if (p[0] > rmax) rmax = p[0];
    if (p[1] < gmin) gmin = p[1];
    if (p[1] > gmax) gmax = p[1];
    if (p[2] < bmin) bmin = p[2];
    if (p[2] > bmax) bmax = p[2];
  }
  const dr = rmax - rmin, dg = gmax - gmin, db = bmax - bmin;
  if (dr >= dg && dr >= db) return 0;
  return dg >= db ? 1 : 2;
}

function medianCut(pixels, k) {
  const boxes = [pixels.slice()];
  while (boxes.length < k) {
    let pick = -1, best = 0;
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.length < 2) continue;
      const ch = widestChannel(box);
      let lo = 255, hi = 0;
      for (let j = 0; j < box.length; j++) {
        const v = box[j][ch];
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      const span = hi - lo;
      if (span > best) { best = span; pick = i; }
    }
    if (pick < 0) break;
    const box = boxes[pick];
    const ch = widestChannel(box);
    box.sort((p, q) => p[ch] - q[ch] || p[0] - q[0] || p[1] - q[1] || p[2] - q[2]);
    const half = Math.max(1, Math.floor(box.length / 2));
    const left = box.slice(0, half);
    const right = box.slice(half);
    if (!right.length) break;
    boxes.splice(pick, 1, left, right);
  }
  return boxes.map(average);
}

/* ---------- Lloyd refinement ---------- */

function assign(pixels, centroids) {
  const labels = new Uint16Array(pixels.length);
  for (let i = 0; i < pixels.length; i++) {
    const lab = rgbToLab(pixels[i][0], pixels[i][1], pixels[i][2]);
    let best = 0, bestD = Infinity;
    for (let c = 0; c < centroids.length; c++) {
      const d = labDistance(lab, labOf(centroids[c]));
      if (d < bestD) { bestD = d; best = c; }
    }
    labels[i] = best;
  }
  return labels;
}

function refine(pixels, centroids, iterations) {
  let labels = assign(pixels, centroids);
  for (let it = 0; it < iterations; it++) {
    const sumR = new Array(centroids.length).fill(0);
    const sumG = new Array(centroids.length).fill(0);
    const sumB = new Array(centroids.length).fill(0);
    const n = new Array(centroids.length).fill(0);
    for (let i = 0; i < pixels.length; i++) {
      const l = labels[i];
      sumR[l] += pixels[i][0]; sumG[l] += pixels[i][1]; sumB[l] += pixels[i][2]; n[l]++;
    }
    for (let c = 0; c < centroids.length; c++) {
      if (n[c]) centroids[c] = makeColor(sumR[c] / n[c], sumG[c] / n[c], sumB[c] / n[c]);
    }
    labels = assign(pixels, centroids);
  }
  return labels;
}

/* ---------- palette repair ---------- */

function countsOf(labels, k) {
  const counts = new Array(k).fill(0);
  for (let i = 0; i < labels.length; i++) counts[labels[i]]++;
  return counts;
}

/* Merge colours that are perceptually the same, then absorb rare ones. */
function mergePalette(pixels, labels, centroids, minShare, minColors) {
  const n = pixels.length;
  let keep = centroids.slice();
  let lbl = labels;

  let merged = true;
  while (merged && keep.length > minColors) {
    merged = false;
    for (let a = 0; a < keep.length && !merged; a++) {
      for (let b = a + 1; b < keep.length; b++) {
        if (labDistance(labOf(keep[a]), labOf(keep[b])) < 9) {
          const counts = countsOf(lbl, keep.length);
          const ca = counts[a], cb = counts[b];
          const t = cb / Math.max(1, ca + cb);
          const mixed = mixColor(keep[a], keep[b], t);
          keep[a] = mixed;
          const map = new Array(keep.length).fill(-1);
          map[b] = a;
          for (let i = 0; i < lbl.length; i++) {
            if (lbl[i] === b) lbl[i] = a;
            else if (lbl[i] > b) lbl[i]--;
          }
          keep.splice(b, 1);
          merged = true;
          break;
        }
      }
    }
  }

  let counts = countsOf(lbl, keep.length);
  let guard = 0;
  while (keep.length > minColors && guard++ < 32) {
    let rarest = -1, smallest = Infinity;
    for (let i = 0; i < keep.length; i++) {
      if (counts[i] < smallest) { smallest = counts[i]; rarest = i; }
    }
    if (rarest < 0 || counts[rarest] / n >= minShare) break;
    let target = -1, best = Infinity;
    for (let j = 0; j < keep.length; j++) {
      if (j === rarest) continue;
      const d = labDistance(labOf(keep[rarest]), labOf(keep[j]));
      if (d < best) { best = d; target = j; }
    }
    if (target < 0) break;
    const c1 = counts[rarest], c2 = counts[target];
    keep[target] = mixColor(keep[target], keep[rarest], c1 / Math.max(1, c1 + c2));
    for (let i = 0; i < lbl.length; i++) {
      if (lbl[i] === rarest) lbl[i] = target;
      else if (lbl[i] > rarest) lbl[i]--;
    }
    keep.splice(rarest, 1);
    counts = countsOf(lbl, keep.length);
  }

  return { centroids: keep, labels: lbl };
}

/* ---------- split the largest cluster to get the palette back to k ---------- */

function splitWidest(pixels, labels, centroids, k) {
  let guard = 0;
  while (centroids.length < k && guard++ < k * 4) {
    const counts = countsOf(labels, centroids.length);
    let pick = -1, bestSse = -1;
    for (let c = 0; c < centroids.length; c++) {
      if (counts[c] < 2) continue;
      let sse = 0;
      for (let i = 0; i < pixels.length; i++) {
        if (labels[i] !== c) continue;
        const d = labDistance(rgbToLab(pixels[i][0], pixels[i][1], pixels[i][2]), labOf(centroids[c]));
        sse += d * d;
      }
      if (sse > bestSse) { bestSse = sse; pick = c; }
    }
    if (pick < 0) break;

    /* The pixel farthest from the centroid starts the new cluster. */
    let far = -1, farD = -1;
    for (let i = 0; i < pixels.length; i++) {
      if (labels[i] !== pick) continue;
      const d = labDistance(rgbToLab(pixels[i][0], pixels[i][1], pixels[i][2]), labOf(centroids[pick]));
      if (d > farD) { farD = d; far = i; }
    }
    if (far < 0 || farD < 1.5) break;

    const p = pixels[far];
    let added = makeColor(p[0], p[1], p[2]);
    if (labDistance(labOf(added), labOf(centroids[pick])) < 2) {
      added = mixColor(centroids[pick], makeColor(255, 255, 255), 0.35);
    }
    centroids.push(added);
  }
  return centroids;
}

/* A useful fallback for one-colour uploads: tonal variations of the average. */
function tonalVariants(base, k) {
  const out = [];
  const black = makeColor(18, 16, 14);
  const white = makeColor(255, 248, 232);
  for (let i = 0; i < k; i++) {
    const t = k === 1 ? 0.5 : i / (k - 1);
    const target = t < 0.5 ? black : white;
    const amt = Math.abs(t - 0.5) * 1.35;
    out.push(mixColor(base, target, amt));
  }
  return out;
}

/* ---------- public API ---------- */

/**
 * quantizeImageData(data, w, h, k, opts)
 *
 * data: RGBA bytes (ImageData.data or a plain Uint8ClampedArray)
 * Returns { palette, indices, counts, width, height, hash }.
 * Palette length is always exactly k (k >= 1).
 */
export function quantizeImageData(data, w, h, k, opts) {
  const options = opts || {};
  const want = Math.max(1, Math.min(12, Math.round(k || 6)));
  const iterations = options.iterations == null ? 5 : options.iterations;
  const minShare = options.minShare == null ? 0.012 : options.minShare;
  const minColors = options.minColors == null ? Math.min(want, 2) : options.minColors;

  const pixels = [];
  const raw = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = data[i + 3] / 255;
      const r = data[i] * a + PAPER[0] * (1 - a);
      const g = data[i + 1] * a + PAPER[1] * (1 - a);
      const b = data[i + 2] * a + PAPER[2] * (1 - a);
      const p = [clamp(Math.round(r), 0, 255), clamp(Math.round(g), 0, 255), clamp(Math.round(b), 0, 255)];
      pixels.push(p);
      raw.push(p[0], p[1], p[2], data[i + 3]);
    }
  }

  const n = pixels.length;
  if (!n) {
    const palette = tonalVariants(makeColor(...PAPER), want);
    return { palette, indices: new Uint8Array(0), counts: palette.map(() => 0), width: w, height: h, hash: 0 };
  }

  let centroids;
  const unique = new Set(pixels.map((p) => (p[0] << 16) | (p[1] << 8) | p[2]));
  if (unique.size <= 1) {
    centroids = tonalVariants(makeColor(pixels[0][0], pixels[0][1], pixels[0][2]), want);
  } else if (unique.size <= want) {
    centroids = Array.from(unique, (v) => makeColor((v >> 16) & 255, (v >> 8) & 255, v & 255));
    centroids = centroids.concat(tonalVariants(average(pixels), want - centroids.length));
  } else {
    centroids = medianCut(pixels, want);
  }
  if (!centroids.length) centroids = tonalVariants(makeColor(pixels[0][0], pixels[0][1], pixels[0][2]), want);
  while (centroids.length > want) centroids.pop();
  if (centroids.length < want) {
    const extra = tonalVariants(average(pixels), want - centroids.length);
    centroids = centroids.concat(extra);
  }

  let labels = refine(pixels, centroids, iterations);
  let merged = mergePalette(pixels, labels, centroids, minShare, minColors);
  centroids = merged.centroids;
  labels = merged.labels;

  if (centroids.length < want) {
    centroids = splitWidest(pixels, labels, centroids, want);
    labels = refine(pixels, centroids, Math.max(1, iterations - 2));
    if (centroids.length < want) {
      const base = average(pixels);
      const filler = tonalVariants(base, want - centroids.length);
      centroids = centroids.concat(filler);
      labels = refine(pixels, centroids, 2);
    }
  }

  /* Stable ordering: darkest to lightest. It makes the palette readable and
   * keeps the same upload identical across sessions. */
  const order = centroids.map((c, i) => ({ i, L: labOf(c).L }))
    .sort((a, b) => a.L - b.L || a.i - b.i);
  const remap = new Array(centroids.length);
  const palette = order.map((entry, newIndex) => {
    remap[entry.i] = newIndex;
    return centroids[entry.i];
  });
  for (let i = 0; i < labels.length; i++) labels[i] = remap[labels[i]];

  const counts = new Array(palette.length).fill(0);
  for (let i = 0; i < labels.length; i++) counts[labels[i]]++;

  const hashInput = raw.join(",") + "|" + want;
  return {
    palette,
    indices: labels,
    counts,
    width: w,
    height: h,
    hash: fnv1a(hashInput)
  };
}

/**
 * Smooth tiny, isolated colour islands with a 3x3 majority filter. The art
 * is made of visible sand grains, so a single stray cell reads as noise.
 */
export function smoothIndices(indices, w, h, paletteCount, passes) {
  let src = new Uint16Array(indices);
  let dst = new Uint16Array(src.length);
  const n = passes == null ? 1 : passes;
  for (let pass = 0; pass < n; pass++) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const counts = new Array(paletteCount).fill(0);
        const self = src[i];
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            counts[src[yy * w + xx]]++;
          }
        }
        let best = self, bestCount = counts[self];
        for (let c = 0; c < counts.length; c++) {
          if (counts[c] > bestCount) { bestCount = counts[c]; best = c; }
        }
        dst[i] = best;
      }
    }
    const swap = src; src = dst; dst = swap;
  }
  return src;
}

export function paletteCounts(indices, paletteCount) {
  const counts = new Array(paletteCount).fill(0);
  for (let i = 0; i < indices.length; i++) counts[indices[i]]++;
  return counts;
}
