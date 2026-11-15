import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Icon } from './Icons';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'whiteout-install-dismissed-v1';

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function InstallBanner() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);
  const toastCount = useGameStore((state) => state.toasts.length);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    if (standalone || wasDismissed()) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
      window.setTimeout(() => setVisible(true), 5000);
    };
    const onInstalled = () => {
      setVisible(false);
      setPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIos(isIOS);
    if (isIOS) {
      const timer = window.setTimeout(() => setVisible(true), 10000);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', onPrompt);
        window.removeEventListener('appinstalled', onInstalled);
      };
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!visible || toastCount > 0) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Private mode.
    }
    setVisible(false);
  };

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setVisible(false);
    setPrompt(null);
  };

  return (
    <aside className="install-banner" aria-label="Install Last Ember">
      <span className="install-banner-icon"><Icon name="install" size={17} /></span>
      <div className="min-w-0 flex-1">
        <strong>Keep Last Ember on your home screen</strong>
        <p>{ios ? 'Tap Share, then Add to Home Screen.' : 'Install once. The settlement works offline.'}</p>
      </div>
      {!ios && prompt && (
        <button type="button" className="mini-button" onClick={() => void install()}>
          Install
        </button>
      )}
      <button type="button" className="icon-button compact-icon-button" onClick={dismiss} aria-label="Dismiss install prompt">
        <Icon name="close" size={13} />
      </button>
    </aside>
  );
}
