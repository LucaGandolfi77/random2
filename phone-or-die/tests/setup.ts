import { beforeEach, vi } from 'vitest';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, String(value));
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: storage
});

const fakeWindow = globalThis as typeof globalThis & {
  addEventListener?: () => void;
  removeEventListener?: () => void;
  dispatchEvent?: () => boolean;
};

fakeWindow.addEventListener = () => undefined;
fakeWindow.removeEventListener = () => undefined;
fakeWindow.dispatchEvent = () => true;
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: fakeWindow
});

Object.defineProperty(globalThis, 'indexedDB', {
  configurable: true,
  value: undefined
});

const nativeTimeout = globalThis.setTimeout;
vi.stubGlobal(
  'setTimeout',
  ((callback: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => {
    const timer = nativeTimeout(callback, delay, ...args);
    timer.unref?.();
    return timer;
  }) as typeof setTimeout
);

beforeEach(() => {
  storage.clear();
});
