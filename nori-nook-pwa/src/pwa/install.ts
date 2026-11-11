import { create } from 'zustand';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface InstallStore {
  deferred: BeforeInstallPromptEvent | null;
  installed: boolean;
  initialized: boolean;
  init: () => void;
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

export const isStandalone = (): boolean =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true);

export const isIos = (): boolean =>
  typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

export const isAndroid = (): boolean =>
  typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

const initiallyInstalled = typeof window !== 'undefined' ? isStandalone() : false;

export const useInstallStore = create<InstallStore>()((set, get) => ({
  deferred: null,
  installed: initiallyInstalled,
  initialized: false,
  init: () => {
    if (get().initialized || typeof window === 'undefined') return;
    set({ initialized: true });
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      set({ deferred: event as BeforeInstallPromptEvent });
    });
    window.addEventListener('appinstalled', () => {
      set({ installed: true, deferred: null });
    });
    if (isStandalone()) set({ installed: true });
  },
  promptInstall: async () => {
    const deferred = get().deferred;
    if (!deferred) return 'unavailable';
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') set({ installed: true, deferred: null });
    return choice.outcome;
  },
}));
