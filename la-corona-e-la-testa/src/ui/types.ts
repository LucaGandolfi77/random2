export type AppMode = 'loading' | 'menu' | 'film' | 'ended';

export interface ActChapter {
  id: string;
  number: string;
  title: string;
  start: number;
  duration: number;
}

export interface PlayerSnapshot {
  mode: AppMode;
  playing: boolean;
  time: number;
  duration: number;
  speed: number;
  volume: number;
  muted: boolean;
  subtitles: boolean;
  voices: boolean;
  cinema: boolean;
  acts: ActChapter[];
  actNumber: string;
  actTitle: string;
}
