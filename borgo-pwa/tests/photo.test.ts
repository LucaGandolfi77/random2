import { describe, expect, it } from 'vitest';
import { buildCityColliders, CollisionWorld } from '../src/data/colliders';
import {
  PHOTO_SPOTS,
  clearPhotos,
  loadPhotos,
  photoFileName,
  savePhoto,
  type PhotoEntry,
  type PhotoStorage
} from '../src/data/photo';

class MemoryStorage implements PhotoStorage {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

const world = new CollisionWorld(buildCityColliders());
const image = 'data:image/jpeg;base64,ZmFrZQ==';

function entry(spotId: string, takenAt = 1): PhotoEntry {
  return { spotId, image, takenAt };
}

describe('photo spots and album', () => {
  it('has six unique, bilingual photo spots on free ground', () => {
    expect(PHOTO_SPOTS).toHaveLength(6);
    expect(new Set(PHOTO_SPOTS.map((spot) => spot.id)).size).toBe(PHOTO_SPOTS.length);
    for (const spot of PHOTO_SPOTS) {
      expect(spot.name.it.length).toBeGreaterThan(0);
      expect(spot.name.en.length).toBeGreaterThan(0);
      expect(spot.radius).toBeGreaterThan(2);
      expect(world.isFree(spot.x, spot.z, 0.34), spot.id).toBe(true);
    }
  });

  it('round-trips photos and replaces a repeated spot', () => {
    const storage = new MemoryStorage();
    expect(loadPhotos(storage)).toEqual([]);
    expect(savePhoto(entry('photo-duomo'), storage)).toBe(true);
    expect(savePhoto(entry('photo-teatro', 2), storage)).toBe(true);
    expect(loadPhotos(storage)).toHaveLength(2);
    expect(savePhoto(entry('photo-duomo', 3), storage)).toBe(true);
    const photos = loadPhotos(storage);
    expect(photos).toHaveLength(2);
    expect(photos.find((photo) => photo.spotId === 'photo-duomo')?.takenAt).toBe(3);
    expect(photos[0].spotId).toBe('photo-duomo');
  });

  it('rejects unknown spots and invalid images, and clears the album', () => {
    const storage = new MemoryStorage();
    expect(savePhoto(entry('photo-ghost'), storage)).toBe(false);
    expect(savePhoto({ ...entry('photo-duomo'), image: 'not-an-image' }, storage)).toBe(false);
    savePhoto(entry('photo-duomo'), storage);
    clearPhotos(storage);
    expect(loadPhotos(storage)).toEqual([]);
  });

  it('gives each postcard a stable file name', () => {
    expect(photoFileName(PHOTO_SPOTS[0])).toBe('borgo-fidenza-duomo.jpg');
    expect(photoFileName(PHOTO_SPOTS[2])).toBe('borgo-fidenza-stirone.jpg');
  });
});
