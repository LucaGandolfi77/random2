import { useEffect } from 'react';
import { audio } from '@/audio/engine';
import { usePrefs } from './prefs';
import { useRoute } from './router';

const moodForPath = (path: string): 'home' | 'kitchen' | 'rush' | 'zen' | 'event' => {
  if (path === '/rush' || path === '/endless' || path === '/delivery') return 'rush';
  if (path === '/kitchen') return 'kitchen';
  if (path === '/zen' || path === '/studio') return 'zen';
  if (path === '/events' || path === '/daily' || path === '/story') return 'event';
  return 'home';
};

export const useAudioSync = (): void => {
  const path = useRoute();
  const prefs = usePrefs();

  useEffect(() => {
    audio.setPreferences({
      musicEnabled: prefs.musicEnabled,
      sfxEnabled: prefs.sfxEnabled,
      masterVolume: prefs.masterVolume,
      musicVolume: prefs.musicVolume,
      sfxVolume: prefs.sfxVolume,
      reducedMotion: prefs.reducedMotion,
      noTimer: prefs.noTimer,
      haptics: prefs.haptics,
    });
  }, [
    prefs.musicEnabled,
    prefs.sfxEnabled,
    prefs.masterVolume,
    prefs.musicVolume,
    prefs.sfxVolume,
    prefs.reducedMotion,
    prefs.noTimer,
    prefs.haptics,
  ]);

  useEffect(() => {
    if (prefs.musicEnabled) {
      void audio.startMusic(moodForPath(path));
    } else {
      audio.stopMusic();
    }
  }, [path, prefs.musicEnabled]);
};
