import { useMemo, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import type { MiniGameId } from '@/types/game';
import type { MiniGameHostProps, MiniGameProps } from './types';
import { miniGameById } from '@/data/miniGames';
import { applyMiniGameBonus, miniGameScoreStars } from './scoring';
import { usePrefs } from '@/app/prefs';
import { Icon } from '@/components/ui/Icon';
import { Button, IconButton } from '@/components/ui/primitives';
import { audio } from '@/audio/engine';
import { PerfectRiceGame, RiceCookerGame, NoriWrapGame, NigiriMasterGame, WasabiBalanceGame, TeaMasterGame } from './reactGames/precision';
import { FanRiceGame, RollMasterGame, PlateArtGame } from './reactGames/action';
import { QuickServiceGame, DeliveryPackGame } from './reactGames/service';
import { PerfectSliceGame } from './phaser/PerfectSliceGame';

const components: Record<MiniGameId, ComponentType<MiniGameProps>> = {
  perfect_rice: PerfectRiceGame,
  rice_cooker: RiceCookerGame,
  fan_rice: FanRiceGame,
  perfect_slice: PerfectSliceGame,
  nori_wrap: NoriWrapGame,
  roll_master: RollMasterGame,
  nigiri_master: NigiriMasterGame,
  wasabi_balance: WasabiBalanceGame,
  plate_art: PlateArtGame,
  quick_service: QuickServiceGame,
  tea_master: TeaMasterGame,
  delivery_pack: DeliveryPackGame,
};

const feedbackForScore = (score: number): string => {
  if (score >= 95) return 'Masterpiece hands. The kitchen is glowing.';
  if (score >= 85) return 'Perfect. Everything landed exactly where it should.';
  if (score >= 70) return 'Delicious work. A lovely little performance.';
  if (score >= 55) return 'Good, honest cooking. The rice is proud of you.';
  return 'A brave attempt. The next one will be even better.';
};

export const MiniGameHost = ({ gameId, bonus = 0, difficulty = 2, onComplete, onClose }: MiniGameHostProps) => {
  const meta = miniGameById(gameId);
  const relax = usePrefs((state) => state.noTimer);
  const haptics = usePrefs((state) => state.haptics);
  const [result, setResult] = useState<number | null>(null);
  const [detail, setDetail] = useState<string | undefined>();
  const Component = components[gameId];
  const e2e = useMemo(
    () => import.meta.env.VITE_E2E === '1' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('e2e'),
    [],
  );

  const finish = (rawScore: number, note?: string) => {
    if (result !== null) return;
    const final = applyMiniGameBonus(rawScore, bonus);
    setResult(final);
    setDetail(note);
    if (haptics) audio.haptic(final >= 85 ? [16, 40, 22] : 12);
    void audio.playSfx(final >= 85 ? 'discovery' : final >= 60 ? 'plate' : 'tap');
  };

  const stars = result !== null ? miniGameScoreStars(result) : 0;

  return createPortal(
    <div className="mini-game-overlay" role="dialog" aria-modal="true" aria-label={meta?.name ?? 'Cooking mini-game'}>
      <div className="mini-game-panel">
        <div className="mini-game-head">
          <div className="mini-game-head__copy">
            <span className="eyebrow">{relax ? 'Relaxed mode' : 'Kitchen mini-game'}</span>
            <h2>{meta?.name ?? 'Cooking time'}</h2>
          </div>
          {result === null ? (
            <div className="row">
              {e2e ? (
                <button
                  type="button"
                  className="btn btn--soft btn--sm"
                  data-testid="auto-finish-minigame"
                  onClick={() => finish(96, 'test')}
                >
                  Auto finish
                </button>
              ) : null}
              <IconButton icon="close" label="Leave mini-game" onClick={onClose} />
            </div>
          ) : null}
        </div>

        {result === null ? (
          <>
            <p className="mini-game-sub">{meta?.description}</p>
            <div className="mini-game-stage">
              <Component difficulty={difficulty} relax={relax} onFinish={finish} />
            </div>
            <div className="mini-game-footer">
              <span className="muted tiny">{meta?.short}</span>
              <Button variant="ghost" size="sm" onClick={() => finish(55, 'skipped')}>
                Skip with a Good score
              </Button>
            </div>
          </>
        ) : (
          <div className="mini-game-result">
            <div className="mini-game-result__stars">
              {[0, 1, 2].map((index) => (
                <Icon
                  key={index}
                  name="star"
                  size={index === 1 ? 42 : 32}
                  className={index < stars ? 'is-filled-star' : 'is-empty-star'}
                />
              ))}
            </div>
            <span className="display-title" style={{ fontSize: 54 }}>
              {result}
            </span>
            <h3>{feedbackForScore(result)}</h3>
            {detail === 'skipped' ? <p className="muted small">Skipped for accessibility. The dish will still be lovely.</p> : null}
            {relax ? <p className="muted tiny">Relaxed mode: no timing pressure.</p> : null}
            <Button
              variant="primary"
              size="lg"
              iconRight="arrowRight"
              data-testid="continue-minigame"
              onClick={() => {
                onComplete(result);
                onClose();
              }}
            >
              Continue
            </Button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
