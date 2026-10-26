/*
 * Local photo pipeline: decode a file, let the user frame a square crop,
 * re-encode a small thumbnail and never keep or send the original. Everything
 * here is browser-only; the engine and Node tests do not import it.
 */

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const PHOTO_SIZE = 320;
export const CROP_VIEW = 360;
const ACCEPTED = /^image\/(png|jpe?g|webp|avif|gif|bmp)$/i;

let webpSupport = null;

export function isProbablyImage(file) {
  if (!file) return false;
  return ACCEPTED.test(file.type || "") || /\.(png|jpe?g|webp|avif|gif|bmp)$/i.test(file.name || "");
}

export function validateFile(file) {
  if (!file) return "No file selected.";
  if (!isProbablyImage(file)) return "Use a PNG, JPG, WebP, AVIF, GIF or BMP image.";
  if (file.size > MAX_FILE_BYTES) return "That image is over 25 MB. Try a smaller one.";
  if (/\.heic$/i.test(file.name || "")) return "HEIC photos are not supported here. Export a JPG first.";
  return "";
}

function imageSize(image) {
  return {
    width: image.width || image.naturalWidth || 0,
    height: image.height || image.naturalHeight || 0,
  };
}

export async function decodeImage(file) {
  const problem = validateFile(file);
  if (problem) throw new Error(problem);
  let bitmap = null;
  if (typeof createImageBitmap === "function") {
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch (e) {
      /* Safari and a few codecs need the <img> path. */
      bitmap = null;
    }
  }
  if (bitmap) return bitmap;

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That image could not be decoded."));
      el.decoding = "async";
      el.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function makeCropState(image) {
  return {
    image,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    view: CROP_VIEW,
  };
}

export function cropGeometry(state) {
  const size = imageSize(state.image);
  if (!size.width || !size.height) return null;
  const view = state.view || CROP_VIEW;
  const zoom = Math.max(1, Math.min(3, Number(state.zoom) || 1));
  const base = Math.max(view / size.width, view / size.height);
  const scale = base * zoom;
  const drawnW = size.width * scale;
  const drawnH = size.height * scale;
  const maxX = Math.max(0, (drawnW - view) / 2);
  const maxY = Math.max(0, (drawnH - view) / 2);
  const offsetX = Math.max(-maxX, Math.min(maxX, Number(state.offsetX) || 0));
  const offsetY = Math.max(-maxY, Math.min(maxY, Number(state.offsetY) || 0));
  return {
    view,
    scale,
    drawnW,
    drawnH,
    maxX,
    maxY,
    offsetX,
    offsetY,
    left: view / 2 + offsetX - drawnW / 2,
    top: view / 2 + offsetY - drawnH / 2,
    sourceX: (drawnW / 2 - view / 2 - offsetX) / scale,
    sourceY: (drawnH / 2 - view / 2 - offsetY) / scale,
    sourceW: view / scale,
    sourceH: view / scale,
    size,
  };
}

export function clampCropState(state) {
  const g = cropGeometry(state);
  if (!g) return state;
  state.offsetX = g.offsetX;
  state.offsetY = g.offsetY;
  return state;
}

export function drawCropPreview(canvas, state) {
  if (!canvas || !state) return;
  const view = CROP_VIEW;
  canvas.width = view;
  canvas.height = view;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, view, view);
  ctx.fillStyle = "#28242b";
  ctx.fillRect(0, 0, view, view);

  const g = cropGeometry(state);
  if (!g) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(view / 2, view / 2, view / 2 - 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(state.image, g.left, g.top, g.drawnW, g.drawnH);
  ctx.restore();

  /* Dim the square outside the circular crop so the mask is unambiguous. */
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, view, view);
  ctx.arc(view / 2, view / 2, view / 2 - 2, 0, Math.PI * 2, true);
  ctx.fillStyle = "rgba(9,8,14,.66)";
  ctx.fill("evenodd");
  ctx.restore();

  ctx.strokeStyle = "rgba(255,248,229,.88)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(view / 2, view / 2, view / 2 - 4, 0, Math.PI * 2);
  ctx.stroke();
}

function canEncodeWebp() {
  if (webpSupport !== null) return webpSupport;
  try {
    const c = document.createElement("canvas");
    c.width = 2;
    c.height = 2;
    webpSupport = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch (e) {
    webpSupport = false;
  }
  return webpSupport;
}

export function cropToDataUrl(state, size = PHOTO_SIZE) {
  const g = cropGeometry(state);
  if (!g) throw new Error("That image has no usable size.");
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#f4ecdd";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(
    state.image,
    g.sourceX, g.sourceY, g.sourceW, g.sourceH,
    0, 0, size, size,
  );
  if (canEncodeWebp()) {
    return canvas.toDataURL("image/webp", 0.86);
  }
  return canvas.toDataURL("image/jpeg", 0.86);
}

export async function autoCropFile(file, size = PHOTO_SIZE) {
  const image = await decodeImage(file);
  try {
    const state = makeCropState(image);
    return cropToDataUrl(state, size);
  } finally {
    if (image && typeof image.close === "function") {
      try { image.close(); } catch (e) { /* ignore */ }
    }
  }
}

const photoCache = new Map();

export function loadPhoto(src) {
  if (!src) return Promise.resolve(null);
  if (photoCache.has(src)) return photoCache.get(src);
  const promise = new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  photoCache.set(src, promise);
  return promise;
}

export async function preloadSquadPhotos(squad) {
  const entries = await Promise.all(squad.map((slot, i) =>
    loadPhoto(slot.photo).then((img) => [i, img])
  ));
  const map = new Map();
  for (const [i, img] of entries) if (img) map.set(i, img);
  return map;
}

export function drawCircularPhoto(ctx, img, cx, cy, radius) {
  if (!img) return false;
  const size = imageSize(img);
  if (!size.width || !size.height) return false;
  const scale = Math.max((radius * 2) / size.width, (radius * 2) / size.height);
  const w = size.width * scale;
  const h = size.height * scale;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  ctx.restore();
  return true;
}
