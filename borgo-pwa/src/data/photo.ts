import type { Localized } from './types';

export interface PhotoSpot {
  id: string;
  name: Localized;
  description: Localized;
  /** Where the player stands to take the picture. */
  x: number;
  z: number;
  radius: number;
  /** The little tripod camera, set a step to the side of the viewpoint. */
  marker: { x: number; z: number };
}

export const PHOTO_SPOTS: PhotoSpot[] = [
  {
    id: 'photo-duomo',
    name: { it: 'Il Duomo all’ora d’oro', en: 'The Duomo at golden hour' },
    description: {
      it: 'La facciata romanica, la piazza e la luce calda che accende la pietra.',
      en: 'The Romanesque façade, the square and the warm light on the stone.'
    },
    x: -306,
    z: 14,
    radius: 4.5,
    marker: { x: -304.2, z: 16 }
  },
  {
    id: 'photo-teatro',
    name: { it: 'Il Teatro Magnani', en: 'The Magnani Theatre' },
    description: {
      it: 'Le colonne, il frontone e il velluto rosso del teatro ottocentesco.',
      en: 'The columns, the pediment and the red velvet of the nineteenth-century theatre.'
    },
    x: -50,
    z: 72,
    radius: 4.5,
    marker: { x: -48.2, z: 73.5 }
  },
  {
    id: 'photo-stirone',
    name: { it: 'Il ponte sullo Stirone', en: 'The Stirone bridge' },
    description: {
      it: 'L’acqua del torrente, i pioppi e il ponte che porta il cammino verso ovest.',
      en: 'The stream, the poplars and the bridge carrying the route west.'
    },
    x: -1205,
    z: -40,
    radius: 5,
    marker: { x: -1203.2, z: -38.5 }
  },
  {
    id: 'photo-garibaldi',
    name: { it: 'Piazza Garibaldi', en: 'Garibaldi Square' },
    description: {
      it: 'L’obelisco, il Palazzo Comunale e il cuore civile della città.',
      en: 'The obelisk, the Town Hall and the civic heart of the town.'
    },
    x: 14,
    z: -30,
    radius: 4.5,
    marker: { x: 16, z: -31.5 }
  },
  {
    id: 'photo-azalee',
    name: { it: 'Le Azalee', en: 'Le Azalee' },
    description: {
      it: 'La piazza nuova, il verde e le case basse del quartiere a est.',
      en: 'The new square, the greenery and the low houses of the eastern district.'
    },
    x: 900,
    z: 430,
    radius: 4.5,
    marker: { x: 902, z: 432 }
  },
  {
    id: 'photo-pala',
    name: { it: 'Il PalaPratizzoli', en: 'PalaPratizzoli' },
    description: {
      it: 'Il palazzetto, il campo e le luci del quartiere sportivo del sud.',
      en: 'The sports hall, the court and the lights of the southern sports district.'
    },
    x: -475,
    z: 1280,
    radius: 4.5,
    marker: { x: -473.2, z: 1282 }
  }
];

export interface PhotoEntry {
  spotId: string;
  image: string;
  takenAt: number;
}

export interface PhotoStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const PHOTO_STORAGE_KEY = 'borgo.photos.v1';

const SPOT_IDS = new Set(PHOTO_SPOTS.map((spot) => spot.id));

function browserStorage(): PhotoStorage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function validEntry(value: unknown): value is PhotoEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<PhotoEntry>;
  return (
    typeof entry.spotId === 'string' &&
    SPOT_IDS.has(entry.spotId) &&
    typeof entry.image === 'string' &&
    entry.image.startsWith('data:image/') &&
    typeof entry.takenAt === 'number' &&
    Number.isFinite(entry.takenAt)
  );
}

export function loadPhotos(storage: PhotoStorage | null = browserStorage()): PhotoEntry[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(PHOTO_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    const photos: PhotoEntry[] = [];
    for (const value of parsed) {
      if (!validEntry(value) || seen.has(value.spotId)) continue;
      seen.add(value.spotId);
      photos.push(value);
      if (photos.length >= PHOTO_SPOTS.length) break;
    }
    return photos;
  } catch {
    return [];
  }
}

export function savePhoto(
  entry: PhotoEntry,
  storage: PhotoStorage | null = browserStorage()
): boolean {
  if (!storage || !validEntry(entry)) return false;
  try {
    const rest = loadPhotos(storage).filter((photo) => photo.spotId !== entry.spotId);
    storage.setItem(PHOTO_STORAGE_KEY, JSON.stringify([entry, ...rest].slice(0, PHOTO_SPOTS.length)));
    return true;
  } catch {
    return false;
  }
}

export function clearPhotos(storage: PhotoStorage | null = browserStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(PHOTO_STORAGE_KEY);
  } catch {
    /* Storage can be disabled; the album is a bonus, not a requirement. */
  }
}

export function photoFileName(spot: PhotoSpot): string {
  return `borgo-fidenza-${spot.id.replace(/^photo-/, '')}.jpg`;
}
