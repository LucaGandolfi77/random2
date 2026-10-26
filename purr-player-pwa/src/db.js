const DB_NAME = "purr-player";
const DB_VERSION = 1;
const STORE = "tracks";

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB non disponibile"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Apertura libreria fallita"));
  });
  return dbPromise;
}

function run(mode, action) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let request;
    try {
      request = action(store);
    } catch (err) {
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve(request ? request.result : undefined);
    tx.onerror = () => reject(tx.error || new Error("Operazione IndexedDB fallita"));
    tx.onabort = () => reject(tx.error || new Error("Operazione annullata"));
  }));
}

export function allTracks() {
  return run("readonly", (store) => store.getAll()).then((rows) => {
    return (rows || []).sort((a, b) => (a.addedAt || 0) - (b.addedAt || 0));
  });
}

export function saveTrack(record) {
  return run("readwrite", (store) => store.put(record));
}

export function deleteTrack(id) {
  return run("readwrite", (store) => store.delete(id));
}

export function clearLibrary() {
  return run("readwrite", (store) => store.clear());
}
