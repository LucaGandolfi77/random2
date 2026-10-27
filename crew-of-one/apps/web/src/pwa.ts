type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export type InstallMode = 'native' | 'ios' | 'none';
export type InstallResult = 'accepted' | 'dismissed' | 'instructions' | 'unavailable';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let notify: ((mode: InstallMode) => void) | null = null;

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  const displayStandalone = window.matchMedia?.('(display-mode: standalone)').matches;
  const iosStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
  return Boolean(displayStandalone || iosStandalone);
};

export const isIosSafari = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua);
  const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return ios && !otherBrowser;
};

export const initInstallPrompt = (callback: (mode: InstallMode) => void): void => {
  notify = callback;
  if (isStandalone()) {
    callback('none');
    return;
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    callback('native');
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    callback('none');
  });

  if (isIosSafari()) callback('ios');
};

export const promptInstall = async (): Promise<InstallResult> => {
  if (isStandalone()) return 'unavailable';
  if (deferredPrompt) {
    const prompt = deferredPrompt;
    deferredPrompt = null;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    notify?.('none');
    return choice.outcome;
  }
  if (isIosSafari()) {
    window.alert('Install Crew of One: tap Share, then “Add to Home Screen”.');
    return 'instructions';
  }
  return 'unavailable';
};

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'unavailable';

export const shareText = async (text: string, url: string): Promise<ShareOutcome> => {
  const payload = { title: 'Crew of One', text, url };
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share(payload);
      return 'shared';
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(`${text} ${url}`);
      return 'copied';
    }
  } catch {
    // Fall through to unavailable.
  }
  return 'unavailable';
};


type FileShareNavigator = Navigator & {
  canShare?: (data?: ShareData) => boolean;
};

export const shareFile = async (
  file: File,
  text: string,
  url: string,
): Promise<ShareOutcome> => {
  const nav = navigator as FileShareNavigator;
  if (typeof nav.share === 'function' && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], text, url, title: 'Crew of One' });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
    }
  }
  return shareText(text, url);
};
