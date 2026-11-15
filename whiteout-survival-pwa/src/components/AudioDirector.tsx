import { useEffect, useRef } from 'react';
import { audio } from '../audio/AudioEngine';
import { useGameStore } from '../store/gameStore';

export function AudioDirector() {
  const weatherPhase = useGameStore((state) => state.game.weather.phase);
  const intensity = useGameStore((state) => state.game.weather.intensity);
  const furnaceMode = useGameStore((state) => state.game.furnace.mode);
  const temperature = useGameStore((state) => state.game.furnace.temperature);
  const sound = useGameStore((state) => state.settings.sound);
  const previousPhase = useRef(weatherPhase);

  useEffect(() => {
    audio.installGlobalUiSounds();
    const onVisibility = () => {
      if (document.hidden) audio.suspend();
      else audio.resume();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    audio.setEnabled(sound);
  }, [sound]);

  useEffect(() => {
    audio.setScene({
      weather: weatherPhase,
      intensity,
      furnace: furnaceMode,
      temperature,
      enabled: sound,
    });
  }, [weatherPhase, intensity, furnaceMode, temperature, sound]);

  useEffect(() => {
    const previous = previousPhase.current;
    if (previous !== weatherPhase) {
      if (weatherPhase === 'warning') audio.warning();
      else if (weatherPhase === 'blizzard') audio.blizzardHit();
    }
    previousPhase.current = weatherPhase;
  }, [weatherPhase]);

  return null;
}
