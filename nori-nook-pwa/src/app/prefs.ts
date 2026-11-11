import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Preferences } from '@/types/game';

export const defaultPreferences: Preferences = {
  musicEnabled: true,
  sfxEnabled: true,
  masterVolume: 0.75,
  musicVolume: 0.5,
  sfxVolume: 0.7,
  reducedMotion: false,
  noTimer: false,
  haptics: true,
};

interface PrefsStore extends Preferences {
  setMusicEnabled: (enabled: boolean) => void;
  setSfxEnabled: (enabled: boolean) => void;
  setMasterVolume: (value: number) => void;
  setMusicVolume: (value: number) => void;
  setSfxVolume: (value: number) => void;
  setReducedMotion: (enabled: boolean) => void;
  setNoTimer: (enabled: boolean) => void;
  setHaptics: (enabled: boolean) => void;
  resetPrefs: () => void;
}

export const usePrefs = create<PrefsStore>()(
  persist(
    (set) => ({
      ...defaultPreferences,
      setMusicEnabled: (musicEnabled) => set({ musicEnabled }),
      setSfxEnabled: (sfxEnabled) => set({ sfxEnabled }),
      setMasterVolume: (masterVolume) => set({ masterVolume }),
      setMusicVolume: (musicVolume) => set({ musicVolume }),
      setSfxVolume: (sfxVolume) => set({ sfxVolume }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setNoTimer: (noTimer) => set({ noTimer }),
      setHaptics: (haptics) => set({ haptics }),
      resetPrefs: () => set({ ...defaultPreferences }),
    }),
    {
      name: 'nori-nook:prefs',
      version: 1,
    },
  ),
);
