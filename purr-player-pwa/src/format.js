const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|weba)$/i;
const VIDEO_EXT = /\.(mp4|m4v|webm|ogv|mov|mkv|avi)$/i;

export function classifyFile(file) {
  const type = String(file && file.type ? file.type : "").toLowerCase();
  if (type.startsWith("audio/")) return "audio";
  if (type.startsWith("video/")) return "video";
  const name = String(file && file.name ? file.name : "");
  if (AUDIO_EXT.test(name)) return "audio";
  if (VIDEO_EXT.test(name)) return "video";
  return null;
}

export function cleanName(name) {
  const base = String(name || "").split("/").pop().split("\\").pop();
  const cleaned = base.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim();
  return cleaned || base || "Senza titolo";
}

export function extensionOf(name) {
  const match = /\.([^.]+)$/.exec(String(name || ""));
  return match ? match[1].toUpperCase() : "";
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  return m + ":" + String(s).padStart(2, "0");
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 1) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  const digits = value >= 100 || i === 0 ? 0 : 1;
  return value.toFixed(digits) + " " + units[i];
}
