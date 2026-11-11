import { useSyncExternalStore } from 'react';

export type Route =
  | { path: '/' }
  | { path: '/story' }
  | { path: '/restaurant' }
  | { path: '/recipes' }
  | { path: '/shop' }
  | { path: '/collection' }
  | { path: '/events' }
  | { path: '/settings' }
  | { path: '/gallery' }
  | { path: '/more' }
  | { path: '/kitchen' }
  | { path: '/zen' }
  | { path: '/daily' }
  | { path: '/rush' }
  | { path: '/puzzle' }
  | { path: '/merge' }
  | { path: '/delivery' }
  | { path: '/chef' }
  | { path: '/studio' }
  | { path: '/endless' };

const normalize = (hash: string): string => {
  const raw = hash.replace(/^#/, '').replace(/\/+$/, '');
  if (!raw) return '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
};

const validPaths = new Set<string>([
  '/',
  '/story',
  '/restaurant',
  '/recipes',
  '/shop',
  '/collection',
  '/events',
  '/settings',
  '/gallery',
  '/more',
  '/kitchen',
  '/zen',
  '/daily',
  '/rush',
  '/puzzle',
  '/merge',
  '/delivery',
  '/chef',
  '/studio',
  '/endless',
]);

export const getCurrentPath = (): string => {
  if (typeof window === 'undefined') return '/';
  const path = normalize(window.location.hash);
  return validPaths.has(path) ? path : '/';
};

export const parseRoute = (path: string): Route => ({ path } as Route);

const subscribe = (callback: () => void) => {
  window.addEventListener('hashchange', callback);
  return () => window.removeEventListener('hashchange', callback);
};

const getSnapshot = () => getCurrentPath();

export const useRoute = (): string => useSyncExternalStore(subscribe, getSnapshot, () => '/');

export const navigate = (path: string, options: { replace?: boolean } = {}): void => {
  const next = path.startsWith('/') ? path : `/${path}`;
  const hash = `#${next}`;
  if (window.location.hash === hash) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (options.replace) {
    const url = `${window.location.pathname}${window.location.search}${hash}`;
    window.history.replaceState(null, '', url);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = next;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

export const isPlayRoute = (path: string): boolean =>
  ['/kitchen', '/rush', '/endless', '/delivery'].includes(path);

export const bottomNavActive = (path: string): string => {
  if (path === '/' || path === '/more') return path;
  if (path === '/story' || path === '/daily' || path === '/zen' || path === '/puzzle' || path === '/merge' || path === '/chef' || path === '/studio' || path === '/shop' || path === '/events' || path === '/gallery' || path === '/settings') {
    return path === '/story' ? '/story' : '/more';
  }
  if (['/restaurant'].includes(path)) return '/restaurant';
  if (['/recipes'].includes(path)) return '/recipes';
  if (['/collection'].includes(path)) return '/more';
  return '';
};
