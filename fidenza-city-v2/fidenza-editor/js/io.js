export const DRAFT_KEY = 'fidenza-map-draft-v2';

export function downloadText(filename, text, mime = 'application/json') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function saveTextFile(filename, text, description = 'JSON') {
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description, accept: { 'application/json': ['.json'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      return { ok: true, method: 'fs' };
    } catch (err) {
      if (err?.name === 'AbortError') return { ok: false, aborted: true };
      console.warn('Salvataggio diretto non disponibile, uso il download', err);
    }
  }
  downloadText(filename, text);
  return { ok: true, method: 'download' };
}

export async function saveBoth(state) {
  const manifest = state.serializeSource();
  const bundle = state.serializeCompiled();
  if ('showDirectoryPicker' in window) {
    try {
      const dir = await window.showDirectoryPicker({ mode: 'readwrite' });
      const maps = await dir.getDirectoryHandle('maps', { create: true });
      const fidenza = await maps.getDirectoryHandle('fidenza', { create: true });
      const mapFile = await fidenza.getFileHandle('map.json', { create: true });
      const mapWriter = await mapFile.createWritable();
      await mapWriter.write(manifest);
      await mapWriter.close();
      const data = await dir.getDirectoryHandle('data', { create: true });
      const bundleFile = await data.getFileHandle('map.json', { create: true });
      const bundleWriter = await bundleFile.createWritable();
      await bundleWriter.write(bundle);
      await bundleWriter.close();
      return { ok: true, method: 'fs' };
    } catch (err) {
      if (err?.name === 'AbortError') return { ok: false, aborted: true };
      console.warn('Salvataggio cartella non disponibile, uso i download', err);
    }
  }
  downloadText('map.json', manifest);
  setTimeout(() => downloadText('data-map.json', bundle), 350);
  return { ok: true, method: 'download' };
}

export async function importJSON(file) {
  const text = await file.text();
  return JSON.parse(text);
}

export async function fetchJSON(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDraft(map) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

export function copyCommand(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  return Promise.resolve();
}
