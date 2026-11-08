import { useEffect, useRef, useState } from 'react';
import { AudioManager } from '../game/audio/audioManager';
import type { GameModeId } from '../game/combat/types';
import { advanceTournament, createTournament, tournamentReward } from '../game/modes/tournament';
import { OnlineClient } from '../network/onlineClient';
import {
  addLeaderboardEntry,
  applyMatchToProfile,
  loadProfile,
  loadSettings,
  resetProfile,
  saveProfile,
  saveSettings,
  type GameSettings,
  type MatchSummary,
  type Profile
} from '../utils/storage';
import type { CharacterSelection, MatchOptions, MatchSetup, Screen } from './types';
import { MainMenu } from '../components/MainMenu';
import { CharacterSelect } from '../components/CharacterSelect';
import { StageSelect } from '../components/StageSelect';
import { LoadingScreen } from '../components/LoadingScreen';
import { FightScreen } from '../components/FightScreen';
import { ResultsScreen } from '../components/ResultsScreen';
import { SettingsScreen } from '../components/SettingsScreen';
import { ProfileScreen } from '../components/ProfileScreen';
import { MissionsScreen } from '../components/MissionsScreen';
import { TournamentScreen } from '../components/TournamentScreen';
import { LeaderboardScreen } from '../components/LeaderboardScreen';
import { OnlineScreen } from '../components/OnlineScreen';
import { CreditsScreen } from '../components/CreditsScreen';

function buildSetup(mode: GameModeId, selection: CharacterSelection, options: MatchOptions): MatchSetup {
  const [playerFighter] = selection.playerFighters;
  const [opponentFighter] = selection.opponentFighters;
  const base: MatchSetup = {
    mode,
    playerFighter,
    opponentFighter,
    stageId: options.stageId,
    roundsToWin: options.roundsToWin,
    roundTime: options.roundTime,
    difficulty: options.difficulty,
    localVersus: options.localVersus
  };
  if (mode === 'team') {
    return {
      ...base,
      playerTeam: selection.playerFighters.slice(0, 2),
      opponentTeam: selection.opponentFighters.slice(0, 2)
    };
  }
  if (mode === 'rumble') {
    return {
      ...base,
      rumbleFighters: selection.opponentFighters.slice(0, 3)
    };
  }
  return base;
}

export function App() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const [settings, setSettings] = useState<GameSettings>(() => loadSettings());
  const [mode, setMode] = useState<GameModeId>('quick');
  const [selection, setSelection] = useState<CharacterSelection | null>(null);
  const [setup, setSetup] = useState<MatchSetup | null>(null);
  const [lastSetup, setLastSetup] = useState<MatchSetup | null>(null);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [earned, setEarned] = useState({ xp: 0, credits: 0 });
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [onlineClient] = useState(() => new OnlineClient());
  const audioRef = useRef<AudioManager | null>(null);
  if (!audioRef.current) audioRef.current = new AudioManager();
  const audio = audioRef.current;

  useEffect(() => {
    saveSettings(settings);
    audio.setVolumes({
      master: settings.masterVolume,
      music: settings.musicVolume,
      sfx: settings.sfxVolume
    });
    audio.setAnnouncerEnabled(settings.announcer);
  }, [settings, audio]);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [audio]);

  useEffect(() => {
    if (screen === 'match' || screen === 'loading') return;
    audio.playMusic(screen === 'online' ? 'online' : 'menu');
  }, [screen, audio]);

  useEffect(() => {
    if (screen !== 'loading') return;
    const timer = window.setTimeout(() => setScreen('match'), 1500);
    return () => window.clearTimeout(timer);
  }, [screen]);

  const startMatch = (nextSetup: MatchSetup) => {
    setSetup(nextSetup);
    setLastSetup(nextSetup);
    setMode(nextSetup.mode);
    setSummary(null);
    setEarned({ xp: 0, credits: 0 });
    setCompletedMissions([]);
    setScreen('loading');
  };

  const navigate = (target: string) => {
    if (target === 'quick' || target === 'training' || target === 'team' || target === 'rumble') {
      setMode(target);
      setSelection(null);
      setScreen('select');
      return;
    }
    if (target === 'tournament') {
      setScreen('tournament');
      return;
    }
    setScreen(target as Screen);
  };

  const handleCharacterConfirm = (picked: CharacterSelection) => {
    setSelection(picked);
    if (mode === 'tournament') {
      const playerFighter = picked.playerFighters[0];
      const tournament = createTournament(playerFighter, 'normal', Date.now());
      setProfile((current) => ({ ...current, tournament }));
      setScreen('tournament');
      return;
    }
    setScreen('stage');
  };

  const handleStageConfirm = (options: MatchOptions) => {
    if (!selection) return;
    startMatch(buildSetup(mode, selection, options));
  };

  const handleMatchComplete = (result: MatchSummary) => {
    setSummary(result);

    if (result.mode === 'training') {
      setEarned({ xp: 0, credits: 0 });
      setCompletedMissions([]);
      setScreen('results');
      return;
    }

    const applied = applyMatchToProfile(profile, result);
    let nextProfile = applied.profile;
    let earnedXp = applied.xp;
    let earnedCredits = applied.credits;

    if (result.mode === 'tournament' && nextProfile.tournament) {
      const round = nextProfile.tournament.round;
      const advanced = advanceTournament(nextProfile.tournament, result.won, Date.now());
      nextProfile = { ...nextProfile, tournament: advanced };
      const reward = tournamentReward(round, advanced.champion);
      earnedXp += reward.xp;
      earnedCredits += reward.credits;
      nextProfile = {
        ...nextProfile,
        xp: nextProfile.xp + reward.xp,
        credits: nextProfile.credits + reward.credits
      };
    }

    setProfile(nextProfile);
    addLeaderboardEntry({
      name: profile.name,
      score: Math.round(
        (result.won ? 1000 : 100) + result.damageDealt / 10 + result.maxCombo * 10 + result.roundsWon * 40
      ),
      wins: result.won ? 1 : 0,
      date: Date.now()
    });
    setEarned({ xp: earnedXp, credits: earnedCredits });
    setCompletedMissions(applied.completedMissions);
    setScreen('results');
  };

  const rematch = () => {
    if (!summary) return;
    if (summary.mode === 'tournament') {
      setScreen('tournament');
      return;
    }
    if (summary.mode === 'online') {
      onlineClient.requestRematch();
      setScreen('online');
      return;
    }
    if (lastSetup) startMatch(lastSetup);
  };

  const changeFighter = () => {
    if (!summary) return;
    if (summary.mode === 'online') {
      onlineClient.leave();
      setScreen('online');
      return;
    }
    if (summary.mode === 'tournament') {
      setScreen('tournament');
      return;
    }
    setMode(summary.mode as GameModeId);
    setSelection(null);
    setScreen('select');
  };

  const returnToMenu = () => {
    if (summary?.mode === 'online') onlineClient.leave();
    setScreen('menu');
  };

  const exitOnlineMatch = () => {
    onlineClient.leave();
    setScreen('online');
  };

  return (
    <div className={`app ${settings.reduceMotion ? 'reduce-motion' : ''}`}>
      {screen === 'menu' && <MainMenu profile={profile} onNavigate={navigate} />}

      {screen === 'select' && (
        <CharacterSelect
          mode={mode}
          onBack={() => setScreen(mode === 'tournament' ? 'tournament' : 'menu')}
          onConfirm={handleCharacterConfirm}
        />
      )}

      {screen === 'stage' && selection && (
        <StageSelect
          mode={mode}
          selection={selection}
          onBack={() => setScreen('select')}
          onConfirm={handleStageConfirm}
        />
      )}

      {screen === 'loading' && setup && (
        <LoadingScreen setup={setup} onReady={() => setScreen('match')} />
      )}

      {screen === 'match' && setup && (
        <FightScreen
          setup={setup}
          settings={settings}
          audio={audio}
          onlineClient={setup.mode === 'online' ? onlineClient : undefined}
          onComplete={handleMatchComplete}
          onExit={setup.mode === 'online' ? exitOnlineMatch : () => setScreen('menu')}
        />
      )}

      {screen === 'results' && summary && (
        <ResultsScreen
          summary={summary}
          profile={profile}
          earnedXp={earned.xp}
          earnedCredits={earned.credits}
          completedMissions={completedMissions}
          onRematch={rematch}
          onCharacterSelect={changeFighter}
          onMenu={returnToMenu}
        />
      )}

      {screen === 'tournament' && (
        <TournamentScreen
          profile={profile}
          onBack={() => setScreen('menu')}
          onCreate={() => {
            setMode('tournament');
            setSelection(null);
            setScreen('select');
          }}
          onStartMatch={startMatch}
        />
      )}

      {screen === 'missions' && <MissionsScreen profile={profile} onBack={() => setScreen('menu')} />}

      {screen === 'settings' && (
        <SettingsScreen settings={settings} onChange={setSettings} onBack={() => setScreen('menu')} />
      )}

      {screen === 'profile' && (
        <ProfileScreen
          profile={profile}
          onChange={setProfile}
          onBack={() => setScreen('menu')}
          onReset={() => setProfile(resetProfile())}
          onTournament={() => setScreen('tournament')}
        />
      )}

      {screen === 'leaderboard' && <LeaderboardScreen onBack={() => setScreen('menu')} />}

      {screen === 'online' && (
        <OnlineScreen
          profile={profile}
          client={onlineClient}
          onBack={() => setScreen('menu')}
          onStartMatch={(onlineSetup) => startMatch(onlineSetup)}
        />
      )}

      {screen === 'credits' && <CreditsScreen onBack={() => setScreen('menu')} />}
    </div>
  );
}
