/*
 * Sand Loop — getting a photo into the game
 * -----------------------------------------
 * Everything happens in the browser. The only thing that is ever written to
 * storage is a 480 x 640 JPEG thumbnail, so the picture can be offered again
 * next time without keeping a camera roll in localStorage. Nothing is
 * uploaded.
 */

import { quantizeImageData, smoothIndices, paletteCounts } from "./quantize.js";

export const GRID_W = 60;
export const GRID_H = 80;
export const PHOTO_W = 600;
export const PHOTO_H = 800;
const RECENT_KEY = "sand-loop-last-image";
const MAX_BYTES = 32 * 1024 * 1024;

export function fileIsImage(file) {
  return !!file && (/^image\//.test(file.type) || /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(file.name || ""));
}

export async function decodeFile(file) {
  if (!file) throw new Error("No file was chosen.");
  if (!fileIsImage(file)) throw new Error("That file is not an image.");
  if (file.size > MAX_BYTES) throw new Error("That image is larger than 32 MB. Try a smaller one.");

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close() { if (bitmap.close) bitmap.close(); }
      };
    } catch (e) {
      /* Safari and some old builds cannot decode every format this way. */
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    if (img.decode) await img.decode();
    else await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("This image could not be decoded."));
    });
    return {
      source: img,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      close() { URL.revokeObjectURL(url); }
    };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw new Error("This image could not be decoded. Try a JPG or PNG.");
  }
}

/* Center-crop to the 3:4 artwork frame, then scale down to 600 x 800. */
export function makePhoto(source, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_W;
  canvas.height = PHOTO_H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#eee4d2";
  ctx.fillRect(0, 0, PHOTO_W, PHOTO_H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const targetRatio = PHOTO_W / PHOTO_H;
  const sourceRatio = width / height;
  let sx = 0, sy = 0, sw = width, sh = height;
  if (sourceRatio > targetRatio) {
    sw = height * targetRatio;
    sx = (width - sw) / 2;
  } else {
    sh = width / targetRatio;
    sy = (height - sh) / 2;
  }
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, PHOTO_W, PHOTO_H);
  return canvas;
}

export async function photoFromFile(file) {
  const decoded = await decodeFile(file);
  try {
    return makePhoto(decoded.source, decoded.width, decoded.height);
  } finally {
    decoded.close();
  }
}

export async function photoFromDataUrl(dataUrl) {
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      try {
        resolve(makePhoto(img, img.naturalWidth || img.width, img.naturalHeight || img.height));
      } catch (e) {
        reject(new Error("The saved image could not be prepared."));
      }
    };
    img.onerror = () => reject(new Error("The saved image could not be decoded."));
    img.src = dataUrl;
  });
}

/**
 * Turn a 600 x 800 photo into a quantized board description.
 * The caller creates a board with a seed derived from `grid.hash`.
 */
export function buildBoard(photo, colors) {
  const small = document.createElement("canvas");
  small.width = GRID_W;
  small.height = GRID_H;
  const sctx = small.getContext("2d", { willReadFrequently: true });
  sctx.imageSmoothingEnabled = true;
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(photo, 0, 0, GRID_W, GRID_H);
  const data = sctx.getImageData(0, 0, GRID_W, GRID_H).data;

  const q = quantizeImageData(data, GRID_W, GRID_H, colors, { iterations: 5, minShare: 0.008 });
  let indices = smoothIndices(q.indices, GRID_W, GRID_H, q.palette.length, 1);
  let counts = paletteCounts(indices, q.palette.length);
  if (counts.some((n) => n === 0)) {
    indices = q.indices;
    counts = q.counts.slice();
  }

  /* A palette entry with no cells is a cup the player could never use. It can
   * happen after filtering on a very low-colour image; compact it away. */
  const used = counts.map((n, i) => (n > 0 ? i : -1));
  if (used.some((i) => i < 0)) {
    const remap = new Array(counts.length).fill(-1);
    const palette = [];
    const keptCounts = [];
    for (let i = 0; i < counts.length; i++) {
      if (counts[i] > 0) {
        remap[i] = palette.length;
        palette.push(q.palette[i]);
        keptCounts.push(counts[i]);
      }
    }
    const compact = new Uint16Array(indices.length);
    for (let i = 0; i < indices.length; i++) compact[i] = remap[indices[i]];
    indices = compact;
    counts = keptCounts;
    return { photo, width: GRID_W, height: GRID_H, indices, palette, counts, hash: q.hash };
  }

  return {
    photo,
    width: GRID_W,
    height: GRID_H,
    indices,
    palette: q.palette,
    counts,
    hash: q.hash
  };
}

export function saveRecent(photo, name, colors) {
  try {
    const thumb = document.createElement("canvas");
    thumb.width = 360;
    thumb.height = 480;
    const ctx = thumb.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(photo, 0, 0, thumb.width, thumb.height);
    const dataUrl = thumb.toDataURL("image/jpeg", 0.78);
    const record = {
      dataUrl,
      name: String(name || "Your photo").slice(0, 64),
      colors,
      savedAt: Date.now()
    };
    localStorage.setItem(RECENT_KEY, JSON.stringify(record));
    return record;
  } catch (e) {
    /* Private mode or a full quota: the game still works, it just will not
     * remember the picture. */
    return null;
  }
}

export function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return null;
    const rec = JSON.parse(raw);
    if (!rec || typeof rec.dataUrl !== "string" || !rec.dataUrl.startsWith("data:image/")) return null;
    return rec;
  } catch (e) {
    return null;
  }
}

export function forgetRecent() {
  try { localStorage.removeItem(RECENT_KEY); } catch (e) { /* ignore */ }
}
