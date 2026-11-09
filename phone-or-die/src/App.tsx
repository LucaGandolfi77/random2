import { Component, useEffect } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useGameStore } from '@/core/gameStore';
import { audio, installAudioListeners } from '@/audio/AudioDirector';
import { stageForThreat } from '@/systems/threat';
import { MenuScreen } from '@/screens/MenuScreen';
import { IntroScreen } from '@/screens/IntroScreen';
import { GameScreen } from '@/screens/GameScreen';
import { GameOverScreen } from '@/screens/GameOverScreen';
import { EndingScreen } from '@/screens/EndingScreen';
import { Toasts } from '@/ui/Toasts';
import { cx } from '@/utils';

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Phone or Die crashed', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="crash-screen">
          <div className="crash-card">
            <p className="eyebrow">The line is broken</p>
            <h1>Something went wrong.</h1>
            <p>You can return to the menu. Your last save is still on this device.</p>
            <pre>{this.state.error.message}</pre>
            <button
              className="menu-button primary"
              onClick={() => {
                useGameStore.getState().goToMenu();
                this.setState({ error: null });
              }}
            >
              Return to the menu
            </button>
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
  const game = useGameStore((state) => state.game);
  const threatStage = game ? stageForThreat(game.threat) : 0;

  useEffect(() => {
    const cleanup = installAudioListeners();
    audio.setSettings(settings);
    void useGameStore.getState().refreshSaves();
    const unsubscribe = useGameStore.subscribe((state, previous) => {
      if (state.settings !== previous.settings) audio.setSettings(state.settings);
    });
    const onVisibility = () => {
      if (document.hidden) useGameStore.getState().autosave();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cleanup();
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', String(settings.textSize));
    document.documentElement.style.setProperty('--brightness', String(settings.brightness));
    document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
    document.documentElement.classList.toggle('high-contrast', settings.highContrast);
  }, [settings.textSize, settings.brightness, settings.reducedMotion, settings.highContrast]);

  useEffect(() => {
    audio.setScene(screen === 'game' ? 'game' : screen === 'ending' ? 'ending' : 'menu');
    if (screen !== 'game') audio.setThreat(0);
  }, [screen]);

  useEffect(() => {
    if (screen === 'game') audio.setThreat(threatStage);
  }, [screen, threatStage]);

  useEffect(() => {
    if (screen !== 'game') return;
    const interval = window.setInterval(() => {
      if (!document.hidden) useGameStore.getState().tick(1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [screen]);

  return (
    <div className={cx('app-shell', `screen-${screen}`)}>
      <AppErrorBoundary>
        {screen === 'menu' && <MenuScreen />}
        {screen === 'intro' && <IntroScreen />}
        {screen === 'game' && <GameScreen />}
        {screen === 'gameover' && <GameOverScreen />}
        {screen === 'ending' && <EndingScreen />}
      </AppErrorBoundary>
      <Toasts />
    </div>
  );
}
