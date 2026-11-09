import { Component, useEffect } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useGameStore } from '@/core/gameStore';
import { audio, installAudioListeners } from '@/audio/AudioDirector';
import { MenuScreen } from '@/screens/MenuScreen';
import { CreationScreen } from '@/screens/CreationScreen';
import { IntroScreen } from '@/screens/IntroScreen';
import { GameScreen } from '@/screens/GameScreen';
import { EndingScreen } from '@/screens/EndingScreen';
import { cx } from '@/utils';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Ashen Crown crashed', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="crash-screen">
          <div className="crash-card">
            <p className="section-kicker">The Page Tears</p>
            <h1>Something in Elarion broke.</h1>
            <p>
              The chronicle hit an unexpected error. Your last autosave is safe — return to the menu and open it again.
            </p>
            <pre>{this.state.error.message}</pre>
            <div className="crash-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  useGameStore.getState().goToMenu();
                  this.setState({ error: null });
                }}
              >
                Return to the menu
              </button>
              <button className="btn btn-outline" onClick={() => window.location.reload()}>
                Reload the game
              </button>
            </div>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const screen = useGameStore((state) => state.screen);
  const settings = useGameStore((state) => state.settings);
  const refreshSaves = useGameStore((state) => state.refreshSaves);

  useEffect(() => {
    const cleanupAudio = installAudioListeners();
    audio.setSettings(settings);
    void refreshSaves();
    const unsubscribe = useGameStore.subscribe((state, previous) => {
      if (state.settings !== previous.settings) audio.setSettings(state.settings);
    });
    const onVisibility = () => {
      if (document.hidden) {
        const state = useGameStore.getState();
        if (state.game && state.screen === 'game' && !state.combat) state.autosave();
      }
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('button');
      if (button && !button.hasAttribute('disabled')) {
        window.dispatchEvent(new CustomEvent('ashen-sfx', { detail: 'click' }));
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('click', onClick);
    return () => {
      cleanupAudio();
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('click', onClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', String(settings.textScale));
    document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
    document.documentElement.classList.toggle('low-effects', settings.lowEffects);
  }, [settings.textScale, settings.reducedMotion, settings.lowEffects]);

  useEffect(() => {
    if (screen === 'menu' || screen === 'creation') audio.playTrack('menu');
    else if (screen === 'intro') audio.playTrack('bastion');
    else if (screen === 'ending') audio.playTrack('ending');
  }, [screen]);

  return (
    <div className={cx('app-shell', `screen-${screen}`)}>
      <ErrorBoundary>
        {screen === 'menu' && <MenuScreen />}
        {screen === 'creation' && <CreationScreen />}
        {screen === 'intro' && <IntroScreen />}
        {screen === 'game' && <GameScreen />}
        {screen === 'ending' && <EndingScreen />}
      </ErrorBoundary>
    </div>
  );
}
