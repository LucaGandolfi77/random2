import { Component, useEffect, useRef, type ErrorInfo, type ReactNode } from 'react';
import { useGameStore } from './store/gameStore';
import { Hud } from './components/Hud';
import { BottomNav } from './components/BottomNav';
import { CityPanel } from './components/CityPanel';
import { SurvivorsPanel } from './components/SurvivorsPanel';
import { HeroesPanel } from './components/HeroesPanel';
import { TechPanel } from './components/TechPanel';
import { FacilitySheet } from './components/FacilitySheet';
import { Onboarding } from './components/Onboarding';
import { OfflineReport } from './components/OfflineReport';
import { SettingsSheet } from './components/SettingsSheet';
import { Toasts } from './components/Toasts';
import { GameOver } from './components/GameOver';
import { InstallBanner } from './components/InstallBanner';
import { AudioDirector } from './components/AudioDirector';
import { Icon } from './components/Icons';

function useBattleLoop() {
  const battleActive = useGameStore((state) => state.battle?.status === 'fighting');
  useEffect(() => {
    if (!battleActive) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) useGameStore.getState().tickBattle();
    }, 320);
    return () => window.clearInterval(timer);
  }, [battleActive]);
}

function useGameLoop() {
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) useGameStore.getState().tick(1);
    };
    const timer = window.setInterval(tick, 1000);
    let hiddenAt = 0;

    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now();
        useGameStore.getState().saveNow();
      } else if (hiddenAt > 0) {
        const away = Date.now() - hiddenAt;
        hiddenAt = 0;
        if (away > 1_500) useGameStore.getState().catchUp(Date.now());
      }
    };
    const onPageHide = () => useGameStore.getState().saveNow();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);
}

export default function App() {
  const tab = useGameStore((state) => state.tab);
  const hasSurvivors = useGameStore((state) => state.game.survivors.length > 0);
  const scrollRef = useRef<HTMLElement>(null);
  useGameLoop();
  useBattleLoop();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [tab]);

  return (
    <div className="game-shell">
      <Hud />
      <main className="game-scroll" ref={scrollRef}>
        <div key={tab} className="tab-enter">
          {tab === 'city' && <CityPanel />}
          {tab === 'survivors' && <SurvivorsPanel />}
          {tab === 'heroes' && <HeroesPanel />}
          {tab === 'tech' && <TechPanel />}
        </div>
      </main>
      <BottomNav />
      <FacilitySheet />
      {hasSurvivors && <Onboarding />}
      <OfflineReport />
      <SettingsSheet />
      <GameOver />
      <Toasts />
      <InstallBanner />
      <AudioDirector />
    </div>
  );
}

interface ErrorBoundaryState {
  failed: boolean;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Last Ember crashed', error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="game-shell crash-screen">
          <div className="crash-card">
            <span className="crash-icon"><Icon name="alert" size={26} /></span>
            <h1>The fire flickered</h1>
            <p>The settlement hit an unexpected error. Your save is still on this device.</p>
            <button type="button" className="primary-button" onClick={() => window.location.reload()}>
              Reload the settlement
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
