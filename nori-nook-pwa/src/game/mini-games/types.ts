import type { MiniGameId } from '@/types/game';

export interface MiniGameProps {
  difficulty: number;
  relax: boolean;
  onFinish: (score: number, detail?: string) => void;
}

export interface MiniGameHostProps {
  gameId: MiniGameId;
  bonus?: number;
  difficulty?: number;
  onComplete: (score: number) => void;
  onClose: () => void;
}
