const DB_NAME = 'fidenza-photos';
const STORE = 'photos';
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    let result;
    try { result = fn(store); } catch (err) { reject(err); return; }
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
  }));
}

export async function addPhoto(photo) {
  const entry = { id: photo.id || `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now(), ...photo };
  await tx('readwrite', store => store.put(entry));
  return entry;
}

export async function listPhotos() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result || []).sort((a, b) => b.createdAt - a.createdAt));
    req.onerror = () => reject(req.error);
  });
}

export async function deletePhoto(id) {
  await tx('readwrite', store => store.delete(id));
}

export async function clearPhotos() {
  await tx('readwrite', store => store.clear());
}

export function downloadPhoto(photo) {
  const a = document.createElement('a');
  a.href = photo.dataUrl;
  a.download = `fidenza-${photo.id || Date.now()}.jpg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
