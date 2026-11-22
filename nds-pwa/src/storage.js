/* ===== Persistence: IndexedDB for blobs / saves, localStorage for settings =====
 * BIOS, firmware, ROM, save states and save RAM stay on this device. Nothing
 * is uploaded, and the service worker never caches these user files.
 */
import {
    DB_NAME, DB_VERSION, STORE_FILES, STORE_SAVES, STORE_RAM,
    SETTINGS_KEY, DEFAULT_SETTINGS,
} from './config.js';

let dbPromise = null;

function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) { reject(new Error('IndexedDB unavailable')); return; }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_FILES)) db.createObjectStore(STORE_FILES);
            if (!db.objectStoreNames.contains(STORE_SAVES)) db.createObjectStore(STORE_SAVES);
            if (!db.objectStoreNames.contains(STORE_RAM)) db.createObjectStore(STORE_RAM);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('IndexedDB blocked'));
    }).catch((err) => {
        console.warn('Pocket DS: IndexedDB unavailable', err);
        dbPromise = null;
        throw err;
    });
    return dbPromise;
}

function tx(store, mode, fn) {
    return openDb().then((db) => new Promise((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    }));
}

/* ---------- Settings (localStorage) ---------- */
export function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        return { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
    } catch (_) {
        return { ...DEFAULT_SETTINGS };
    }
}

export function saveSettings(settings) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) {}
}

/* ---------- User files ---------- */
export async function saveFile(key, arrayBuffer) {
    try { await tx(STORE_FILES, 'readwrite', (s) => s.put(arrayBuffer, key)); return true; }
    catch (err) { console.warn('saveFile failed', err); return false; }
}

export async function loadFile(key) {
    try { return (await tx(STORE_FILES, 'readonly', (s) => s.get(key))) || null; }
    catch (_) { return null; }
}

export async function loadAllFiles() {
    const keys = ['arm9bios.bin', 'arm7bios.bin', 'firmware.bin', 'game.nds'];
    const entries = await Promise.all(keys.map(async (k) => [k, await loadFile(k)]));
    return Object.fromEntries(entries);
}

export async function deleteAllFiles() {
    try { await tx(STORE_FILES, 'readwrite', (s) => s.clear()); } catch (_) {}
}

/* ---------- Save states ---------- */
export async function saveState(slot, data, meta = {}) {
    try {
        await tx(STORE_SAVES, 'readwrite', (s) => s.put({
            data,
            meta: { slot, savedAt: Date.now(), ...meta },
        }, slot));
        return true;
    } catch (err) { console.warn('saveState failed', err); return false; }
}

export async function listStates() {
    try {
        const db = await openDb();
        return await new Promise((resolve, reject) => {
            const req = db.transaction(STORE_SAVES, 'readonly').objectStore(STORE_SAVES).openCursor();
            const out = [];
            req.onsuccess = () => {
                const cur = req.result;
                if (cur) { out.push({ key: cur.key, ...cur.value }); cur.continue(); }
                else resolve(out.sort((a, b) => String(a.key).localeCompare(String(b.key))));
            };
            req.onerror = () => reject(req.error);
        });
    } catch (_) { return []; }
}

export async function loadState(slot) {
    try {
        const rec = await tx(STORE_SAVES, 'readonly', (s) => s.get(slot));
        return rec ? rec.data : null;
    } catch (_) { return null; }
}

export async function deleteState(slot) {
    try { await tx(STORE_SAVES, 'readwrite', (s) => s.delete(slot)); } catch (_) {}
}

/* ---------- Save RAM ---------- */
export async function saveRam(data) {
    try { await tx(STORE_RAM, 'readwrite', (s) => s.put(data, 'sram')); return true; }
    catch (_) { return false; }
}

export async function loadRam() {
    try { return (await tx(STORE_RAM, 'readonly', (s) => s.get('sram'))) || null; }
    catch (_) { return null; }
}
