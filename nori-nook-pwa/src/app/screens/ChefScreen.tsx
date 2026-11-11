import { useGameStore } from '@/app/store';
import { navigate } from '@/app/router';
import { Button, Card, Pill, SectionHead } from '@/components/ui/primitives';
import { Icon } from '@/components/ui/Icon';
import { CustomerPortrait } from '@/components/art/CustomerPortrait';
import { CHEF_CHALLENGES } from '@/data/chefs';
import { recipeById } from '@/data/recipes';
import { customerById } from '@/data/customers';
import { miniGameById } from '@/data/miniGames';
import { usePrefs } from '@/app/prefs';

export const ChefScreen = () => {
  const save = useGameStore((state) => state.save);
  const startChefSession = useGameStore((state) => state.startChefSession);
  const noTimer = usePrefs((state) => state.noTimer);
  const cleared = CHEF_CHALLENGES.filter((chef) => save.modes.chef[chef.id]?.cleared).length;

  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__copy">
          <span className="eyebrow">Rival kitchens</span>
          <h1>Sushi Chef Challenge</h1>
          <p>Five chefs, five very particular opinions. The jury is made of regulars.</p>
        </div>
        <div className="page-head__action"><Pill tone="gold" icon="trophy">{cleared}/{CHEF_CHALLENGES.length}</Pill></div>
      </div>

      <Card variant="soft">
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <Icon name="chef" size={22} />
          <p className="muted small">
            Each challenge provides the pantry, sets a time limit and asks for a minimum grade. The jury scores your
            plate, the recipe rule and the ingredient limit. {noTimer ? 'Relaxed mini-games are on, but challenge timers still count.' : 'You can retry any chef as many times as you like.'}
          </p>
        </div>
      </Card>

      <div className="chef-list">
        {CHEF_CHALLENGES.map((chef) => {
          const recipe = recipeById(chef.recipeId);
          const unlocked = chef.unlockLevel <= save.player.level;
          const record = save.modes.chef[chef.id];
          return (
            <Card key={chef.id} className={`chef-card ${!unlocked ? 'is-locked' : ''}`.trim()}>
              <div className="chef-card__head">
                <div className="chef-card__portrait">
                  <CustomerPortrait config={chef.portrait} size={82} mood={record?.cleared ? 'happy' : 'neutral'} />
                  {record?.cleared ? <span className="chef-crown"><Icon name="crown" size={14} /></span> : null}
                </div>
                <div className="chef-card__copy">
                  <div className="row" style={{ flexWrap: 'wrap' }}>
                    <h2>{chef.name}</h2>
                    <Pill tone="sakura">{chef.title}</Pill>
                    {record?.cleared ? <Pill tone="matcha" icon="check">Cleared</Pill> : null}
                  </div>
                  <p>{chef.description}</p>
                  <blockquote>“{chef.line}”</blockquote>
                </div>
              </div>
              <div className="chef-constraints">
                <div><Icon name="recipe" size={14} /><span>{recipe?.name}</span></div>
                <div><Icon name="clock" size={14} /><span>{chef.timeLimit}s</span></div>
                <div><Icon name="rice" size={14} /><span>Max {chef.maxIngredients} ingredients</span></div>
                <div><Icon name="star" size={14} /><span>{chef.minGrade}+</span></div>
                {chef.forbiddenTags.length > 0 ? (
                  <div><Icon name="warning" size={14} /><span>No {chef.forbiddenTags.join(', ')}</span></div>
                ) : null}
              </div>
              <div className="tag-row">
                {recipe?.requiredMiniGames.map((id) => (
                  <Pill key={id} tone="matcha" icon="target">{miniGameById(id)?.name}</Pill>
                ))}
              </div>
              <div className="row row--between" style={{ marginTop: 8 }}>
                <div className="row">
                  <Pill tone="gold" icon="coin">{chef.rewardCoins}</Pill>
                  <Pill tone="sakura" icon="pearl">{chef.rewardPearls}</Pill>
                  {record ? <span className="tiny muted">Best {record.bestScore}</span> : null}
                </div>
                <Button
                  size="sm"
                  variant={record?.cleared ? 'soft' : 'primary'}
                  icon={record?.cleared ? 'refresh' : 'chef'}
                  disabled={!unlocked}
                  onClick={() => {
                    if (startChefSession(chef.id)) navigate('/kitchen');
                  }}
                >
                  {!unlocked ? `Level ${chef.unlockLevel}` : record?.cleared ? 'Challenge again' : 'Accept challenge'}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <SectionHead title="The jury" subtitle="Regulars, critics and one quiet chef" icon="users" />
      <Card variant="soft">
        <div className="jury-row">
          {['haru', 'ren', 'kiku'].map((customerId) => {
            const customer = customerById(customerId);
            return customer ? (
              <div key={customerId} className="jury-member">
                <CustomerPortrait customer={customer} size={58} mood="neutral" />
                <strong>{customer.name}</strong>
                <span>{customer.title}</span>
              </div>
            ) : null;
          })}
        </div>
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          <Pill tone="sakura" icon="heart">A Delicious+ plate usually wins</Pill>
          <Pill tone="matcha" icon="target">Exact recipe and constraints required</Pill>
          <Pill tone="gold" icon="coin">Clearing a chef pays once</Pill>
        </div>
      </Card>
    </div>
  );
};
