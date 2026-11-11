import { useEffect } from 'react';
import { useGameStore } from './store';
import { writeSave } from '@/storage/db';

export const useAutosave = (): void => {
  useEffect(() => {
    let timer: number | null = null;
    let lastSaved = '';
    const save = useGameStore.getState().save;

    const schedule = (value: typeof save) => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const serialized = JSON.stringify(value);
        if (serialized === lastSaved) return;
        lastSaved = serialized;
        void writeSave(value).catch(() => {
          return;
        });
      }, 250);
    };

    const unsubscribe = useGameStore.subscribe((state, previous) => {
      if (!state.loaded) return;
      if (state.save !== previous.save) schedule(state.save);
    });

    const flush = () => {
      if (!useGameStore.getState().loaded) return;
      if (timer !== null) window.clearTimeout(timer);
      void writeSave(useGameStore.getState().save).catch(() => {
        return;
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      unsubscribe();
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
};
