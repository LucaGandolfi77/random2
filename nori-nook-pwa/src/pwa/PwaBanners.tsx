import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button, Modal } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { isAndroid, isIos, isStandalone, useInstallStore } from './install';

export const useOnline = (): boolean => {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
};

export const PwaBanners = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const [showOfflineReady, setShowOfflineReady] = useState(false);

  useEffect(() => {
    if (!offlineReady) return;
    setShowOfflineReady(true);
    setOfflineReady(false);
    const timer = window.setTimeout(() => setShowOfflineReady(false), 5000);
    return () => window.clearTimeout(timer);
  }, [offlineReady, setOfflineReady]);

  return (
    <>
      {showOfflineReady ? (
        <div className="pwa-banner pwa-banner--offline" role="status">
          <Icon name="check" size={16} />
          <span>Nori Nook is ready to play offline.</span>
          <button
            type="button"
            className="pwa-banner__close pwa-banner__close--offline"
            aria-label="Dismiss offline notice"
            onClick={() => setShowOfflineReady(false)}
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ) : null}
      {needRefresh ? (
        <div className="pwa-banner pwa-banner--update" role="status">
          <Icon name="refresh" size={18} />
          <div>
            <strong>A fresh version is ready</strong>
            <span>Reload to get the latest little improvements.</span>
          </div>
          <Button
            size="sm"
            variant="gold"
            onClick={() => {
              void updateServiceWorker(true);
            }}
          >
            Reload
          </Button>
          <button type="button" className="pwa-banner__close" aria-label="Later" onClick={() => setNeedRefresh(false)}>
            <Icon name="close" size={16} />
          </button>
        </div>
      ) : null}
    </>
  );
};

export const InstallButton = ({ compact = false }: { compact?: boolean }) => {
  const { deferred, installed, init, promptInstall } = useInstallStore();
  const [guide, setGuide] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  if (installed || isStandalone()) {
    return (
      <div className="install-note">
        <Icon name="check" size={16} />
        <span>Installed on this device</span>
      </div>
    );
  }

  const handleClick = async () => {
    if (deferred) {
      const outcome = await promptInstall();
      if (outcome === 'dismissed') setResult('No worries. You can install any time from your browser menu.');
    } else if (isIos()) {
      setGuide(true);
    } else if (isAndroid()) {
      setResult('Open your browser menu and choose “Install app” or “Add to Home screen”.');
    } else {
      setGuide(true);
    }
  };

  return (
    <>
      <Button
        variant={compact ? 'soft' : 'secondary'}
        size={compact ? 'sm' : 'md'}
        icon="install"
        onClick={() => void handleClick()}
      >
        Install Nori Nook
      </Button>
      {result ? <p className="install-result">{result}</p> : null}
      <Modal open={guide} onClose={() => setGuide(false)} title="Add Nori Nook to your home screen" size="sm">
        {isIos() ? (
          <ol className="install-steps">
            <li>
              Tap the <strong>Share</strong> button in Safari.
            </li>
            <li>
              Scroll and tap <strong>Add to Home Screen</strong>.
            </li>
            <li>
              Tap <strong>Add</strong>. The little lantern will be waiting for you.
            </li>
          </ol>
        ) : (
          <ol className="install-steps">
            <li>Open the browser menu.</li>
            <li>
              Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            </li>
            <li>Open Nori Nook from your home screen. It works offline after the first load.</li>
          </ol>
        )}
        <p className="muted small">
          Saving works locally on your device. Your progress is not uploaded anywhere.
        </p>
      </Modal>
    </>
  );
};
