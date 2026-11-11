import { useState } from 'react';
import { useGameStore } from '@/app/store';
import { navigate } from '@/app/router';
import { usePrefs } from '@/app/prefs';
import { Button, Card, Pill, ProgressBar, SectionHead } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { IngredientArt } from '@/components/art/IngredientArt';
import { MiniGameHost } from '@/game/mini-games/MiniGameHost';
import { MINI_GAMES } from '@/data/miniGames';
import { miniGameAssistBonus } from '@/game/mini-games/scoring';
import { RECIPES } from '@/data/recipes';
import type { MiniGameId } from '@/types/game';

export const ZenScreen = () => {
  const save = useGameStore((state) => state.save);
  const startZenSession = useGameStore((state) => state.startZenSession);
  const recordPracticeMiniGame = useGameStore((state) => state.recordPracticeMiniGame);
  const noTimer = usePrefs((state) => state.noTimer);
  const [practiceGame, setPracticeGame] = useState<MiniGameId | null>(null);

  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__copy">
          <span className="eyebrow">No timers, no rush</span>
          <h1>Zen Kitchen</h1>
          <p>A quiet kitchen for experiments, practice and very slow rice.</p>
        </div>
        <div className="page-head__action">
          <Pill tone="matcha" icon="leaf">{noTimer ? 'Relaxed' : 'Calm mode'}</Pill>
        </div>
      </div>

      <Card className="zen-hero">
        <div className="zen-hero__art">
          <div className="zen-bowl">
            <IngredientArt id="rice_white" size={92} animate={false} />
            <span className="zen-steam s1" />
            <span className="zen-steam s2" />
            <span className="zen-steam s3" />
          </div>
          <IngredientArt id="salmon" size={52} animate={false} />
          <IngredientArt id="avocado" size={54} animate={false} />
        </div>
        <div className="zen-hero__copy">
          <span className="eyebrow">Free pantry</span>
          <h2>Cook without a customer.</h2>
          <p>
            Every unlocked ingredient is available with no stock limits here. Combine freely, discover recipes and make
            whatever looks lovely.
          </p>
          <div className="tag-row">
            <Pill tone="matcha" icon="check">No penalties</Pill>
            <Pill tone="matcha" icon="check">No ingredient consumption</Pill>
            <Pill tone="matcha" icon="check">Discovery rewards</Pill>
          </div>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              icon="leaf"
              onClick={() => {
                startZenSession();
                navigate('/kitchen');
              }}
            >
              Open free kitchen
            </Button>
            <Button variant="ghost" icon="camera" onClick={() => navigate('/studio')}>
              Creative Studio
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHead
          title="Your quiet progress"
          subtitle="Zen discoveries still fill the recipe book"
          icon="recipe"
          action={<Pill tone="gold" icon="recipe">{save.discoveredRecipes.length}/{RECIPES.length}</Pill>}
        />
        <div style={{ marginTop: 10 }}>
          <ProgressBar value={save.discoveredRecipes.length} max={RECIPES.length} tone="matcha" showValue />
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>
          Unknown combinations can produce funny little accidents. Nothing is wasted, and no customer is waiting.
        </p>
      </Card>

      <SectionHead title="Practice the kitchen" subtitle="Every mini-game, at your own pace" icon="target" />
      <div className="practice-grid">
        {MINI_GAMES.map((game) => (
          <button key={game.id} type="button" className="practice-tile" onClick={() => setPracticeGame(game.id)}>
            <span style={{ background: `${game.color}44` }}>
              <Icon name={practiceIcon(game.id)} size={18} />
            </span>
            <strong>{game.name}</strong>
            <small>{game.short}</small>
          </button>
        ))}
      </div>

      <Card variant="soft">
        <div className="row">
          <Icon name="info" size={18} />
          <p className="muted small">
            Practice counts toward stats and daily missions. Relaxed mini-games can be enabled in Settings.
          </p>
        </div>
      </Card>

      {practiceGame ? (
        <MiniGameHost
          key={practiceGame}
          gameId={practiceGame}
          bonus={miniGameAssistBonus(save, practiceGame)}
          difficulty={2}
          onComplete={(score) => {
            recordPracticeMiniGame({ gameId: practiceGame, score });
            setPracticeGame(null);
          }}
          onClose={() => setPracticeGame(null)}
        />
      ) : null}
    </div>
  );
};

const practiceIcon = (id: MiniGameId) => {
  switch (id) {
    case 'perfect_rice':
    case 'rice_cooker':
    case 'fan_rice':
      return 'rice' as const;
    case 'perfect_slice':
      return 'fish' as const;
    case 'nori_wrap':
      return 'leaf' as const;
    case 'roll_master':
      return 'sushi' as const;
    case 'nigiri_master':
      return 'nigiri' as const;
    case 'wasabi_balance':
      return 'sparkle' as const;
    case 'plate_art':
      return 'camera' as const;
    case 'quick_service':
      return 'users' as const;
    case 'tea_master':
      return 'tea' as const;
    case 'delivery_pack':
      return 'bento' as const;
    default:
      return 'target' as const;
  }
};
