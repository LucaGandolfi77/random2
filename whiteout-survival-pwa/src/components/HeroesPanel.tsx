import { useEffect, useRef } from 'react';
import {
  HEROES,
  HERO_ORDER,
  MAX_HERO_LEVEL,
  STAGES,
  firstClearReward,
  heroXpToNext,
  stageById,
  stageEnemyCount,
  stageReward,
} from '../game/content';
import { canAfford } from '../game/engine';
import {
  heroCombatant,
  maxPartyPower,
} from '../game/expedition';
import type { BattleState, Combatant, GameState, HeroId } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { audio } from '../audio/AudioEngine';
import { Badge, ResourceCost, SectionHeading } from './Common';
import { Icon, type IconName } from './Icons';

const CLASS_ICONS: Record<string, IconName> = {
  tank: 'shield',
  marksman: 'bow',
  support: 'heal',
  beast: 'snow',
  boss: 'alert',
};

export function HeroesPanel() {
  const game = useGameStore((state) => state.game);
  const battle = useGameStore((state) => state.battle);
  const battleSpeed = useGameStore((state) => state.battleSpeed);
  const lastAward = useGameStore((state) => state.lastAward);
  const startBattle = useGameStore((state) => state.startBattle);
  const retreatBattle = useGameStore((state) => state.retreatBattle);
  const closeBattle = useGameStore((state) => state.closeBattle);
  const toggleBattleSpeed = useGameStore((state) => state.toggleBattleSpeed);
  const setSelectedStage = useGameStore((state) => state.setSelectedStage);
  const recruitHero = useGameStore((state) => state.recruitHero);

  const lastSoundLog = useRef(0);
  const lastStatus = useRef<BattleState['status'] | null>(null);
  useEffect(() => {
    if (!battle) {
      lastSoundLog.current = 0;
      lastStatus.current = null;
      return;
    }
    if (battle.log.length > lastSoundLog.current) {
      const newest = battle.log.slice(lastSoundLog.current);
      if (newest.some((entry) => entry.kind === 'attack' || entry.kind === 'skill' || entry.kind === 'heal')) {
        audio.battleHit(newest.some((entry) => entry.kind === 'skill'));
      }
    }
    lastSoundLog.current = battle.log.length;
    if (battle.status !== lastStatus.current) {
      if (battle.status === 'victory') audio.victory();
      if (battle.status === 'defeat') audio.defeat();
      lastStatus.current = battle.status;
    }
  }, [battle]);

  const stage = stageById(game.expedition.selectedStage);
  const stageRewards = stageReward(stage.stage);
  const firstBonus = firstClearReward(stage.stage);
  const alreadyCleared = game.expedition.firstClears.includes(stage.stage);
  const recruitedCount = HERO_ORDER.filter((id) => game.heroes[id].recruited).length;
  const selectedParty = HERO_ORDER.filter((id) => game.heroes[id].recruited).map((id) =>
    heroCombatant(game, id),
  );
  const partyPower = maxPartyPower(game);
  const hasBattle = Boolean(battle);

  return (
    <div className="tab-view">
      <SectionHeading
        eyebrow="Beyond the palisade"
        title="Expedition"
        aside={
          <span className="text-[10px] text-frost-300/55">
            {recruitedCount}/3 heroes · power {Math.round(partyPower)}
          </span>
        }
      />

      <div className="hero-stage-card">
        <div className="stage-topline">
          <div>
            <span className="eyebrow">STAGE {stage.stage} / {STAGES.length}</span>
            <h3>{stage.name}</h3>
            <p className="stage-region">
              <Icon name="snow" size={11} /> {stage.region}
              {alreadyCleared && <Badge tone="good">CLEARED</Badge>}
            </p>
          </div>
          <div className="stage-reward-preview">
            <span>REWARD</span>
            <ResourceCost cost={stageRewards} compact />
            {!alreadyCleared && (
              <div className="mt-1 flex flex-col items-end gap-0.5 border-t border-ember-300/10 pt-1">
                <small className="text-[6px] uppercase tracking-[0.12em] text-ember-200/65">First clear</small>
                <ResourceCost cost={firstBonus} compact />
              </div>
            )}
          </div>
        </div>
        <p className="stage-description">{stage.description}</p>

        <div className="stage-picker" role="group" aria-label="Expedition stage">
          {STAGES.map((entry) => {
            const unlocked = entry.stage <= game.expedition.maxStage;
            const selected = entry.stage === game.expedition.selectedStage;
            return (
              <button
                key={entry.stage}
                type="button"
                className={`stage-chip ${selected ? 'is-active' : ''}`}
                disabled={!unlocked || hasBattle}
                onClick={() => setSelectedStage(entry.stage)}
                aria-label={unlocked ? `Stage ${entry.stage}: ${entry.name}` : `Stage ${entry.stage} locked`}
                aria-pressed={selected}
              >
                {unlocked ? entry.stage : <Icon name="lock" size={10} />}
              </button>
            );
          })}
        </div>

        {!battle ? (
          <div className="stage-actions">
            <div className="enemy-preview">
              <span className="text-[9px] uppercase tracking-[0.18em] text-frost-400/60">Foes</span>
              <div className="flex flex-wrap gap-1.5">
                {stage.enemyNames.slice(0, stageEnemyCount(stage.stage)).map((name) => (
                  <span key={name} className="enemy-chip">
                    <Icon name={name.includes('Warden') || name.includes('Colossus') ? 'alert' : 'snow'} size={10} />
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="primary-button w-full justify-between"
              onClick={startBattle}
              disabled={recruitedCount === 0}
            >
              <span className="inline-flex items-center gap-2">
                <Icon name="sword" size={16} />
                {recruitedCount === 0 ? 'Recruit a hero first' : `Deploy ${selectedParty.length} hero${selectedParty.length === 1 ? '' : 'es'}`}
              </span>
              <span className="text-[10px] opacity-70">{stage.boss ? 'WARDEN' : 'AUTO-BATTLE'}</span>
            </button>
          </div>
        ) : (
          <BattleArena
            battle={battle}
            game={game}
            speed={battleSpeed}
            lastAward={lastAward}
            onSpeed={toggleBattleSpeed}
            onRetreat={retreatBattle}
            onClose={closeBattle}
            onNextStage={() => {
              closeBattle();
              setSelectedStage(Math.min(game.expedition.maxStage, battle.stage + 1));
            }}
          />
        )}
      </div>

      <div className="mt-5">
        <SectionHeading
          eyebrow="The only three who volunteered"
          title="Heroes"
          aside={<span className="text-[10px] text-frost-300/50">XP from expeditions</span>}
        />
        <div className="hero-row">
          {HERO_ORDER.map((id) => (
            <HeroCard
              key={id}
              game={game}
              heroId={id}
              onRecruit={() => recruitHero(id)}
            />
          ))}
        </div>
      </div>

      <div className="city-footer-note">
        <Icon name="sword" size={14} />
        <p>
          Expeditions auto-fight. Heroes earn XP from every victory, and first clears unlock deeper
          routes. Iron from the whiteout is the fastest way to upgrade the furnace past level 3.
        </p>
      </div>
    </div>
  );
}

function HeroCard({
  game,
  heroId,
  onRecruit,
}: {
  game: GameState;
  heroId: HeroId;
  onRecruit: () => void;
}) {
  const def = HEROES[heroId];
  const progress = game.heroes[heroId];
  const combatant = heroCombatant(game, heroId);
  const xpNeeded = heroXpToNext(progress.level);
  const xpRatio =
    progress.level >= MAX_HERO_LEVEL ? 1 : Math.min(1, progress.xp / Math.max(1, xpNeeded));
  const affordable = canAfford(game.resources, def.recruitCost);

  return (
    <article className={`hero-card hero-${def.heroClass} ${!progress.recruited ? 'is-locked' : ''}`}>
      <div className="hero-card-top">
        <span className={`hero-sigil class-${def.heroClass}`}>
          <Icon name={CLASS_ICONS[def.heroClass] ?? 'heroes'} size={19} />
        </span>
        <div className="min-w-0">
          <strong>{def.name}</strong>
          <small>{def.title}</small>
        </div>
      </div>
      {progress.recruited ? (
        <>
          <div className="hero-level-row">
            <span>LV {progress.level}</span>
            <span className="hero-xp-bar" aria-label={`${progress.xp} of ${xpNeeded} experience`}>
              <i style={{ width: `${xpRatio * 100}%` }} />
            </span>
            <span>{progress.level >= MAX_HERO_LEVEL ? 'MAX' : `${progress.xp}/${xpNeeded}`}</span>
          </div>
          <div className="hero-stats">
            <span><b>{combatant.maxHp}</b> HP</span>
            <span><b>{combatant.attack}</b> ATK</span>
            <span><b>{combatant.defense}</b> DEF</span>
          </div>
          <p className="hero-skill">{def.skill}</p>
        </>
      ) : (
        <>
          <p className="hero-locked-text">{def.description}</p>
          <ResourceCost cost={def.recruitCost} resources={game.resources} compact />
          <button
            type="button"
            className="secondary-button mt-2 w-full"
            onClick={onRecruit}
            disabled={!affordable}
          >
            <Icon name="plus" size={13} /> Recruit
          </button>
        </>
      )}
    </article>
  );
}

function BattleArena({
  battle,
  game,
  speed,
  lastAward,
  onSpeed,
  onRetreat,
  onClose,
  onNextStage,
}: {
  battle: BattleState;
  game: GameState;
  speed: 1 | 2;
  lastAward: ReturnType<typeof useGameStore.getState>['lastAward'];
  onSpeed: () => void;
  onRetreat: () => void;
  onClose: () => void;
  onNextStage: () => void;
}) {
  const logRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [battle.log.length]);

  const victory = battle.status === 'victory';
  const defeat = battle.status === 'defeat';
  const ended = victory || defeat;

  useEffect(() => {
    if (!ended) return;
    const timer = window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [ended]);

  return (
    <div className={`battle-arena ${victory ? 'is-victory' : defeat ? 'is-defeat' : ''}`}>
      <div className="battle-header">
        <div>
          <span className="eyebrow">{victory ? 'FIELD HELD' : defeat ? 'BROKEN RANKS' : 'AUTO-BATTLE'}</span>
          <strong>{stageById(battle.stage).name}</strong>
        </div>
        <div className="flex items-center gap-1.5">
          {!ended && (
            <button type="button" className="mini-button" onClick={onSpeed} aria-label="Toggle battle speed">
              <Icon name="speed" size={13} /> {speed}×
            </button>
          )}
          <span className="battle-clock">{battle.elapsed.toFixed(1)}s</span>
        </div>
      </div>

      <div className="battle-field">
        <div className="battle-side enemies">
          <div className="battle-side-label"><Icon name="wind" size={11} /> WHITEOUT</div>
          <div className="combatant-row">
            {battle.enemies.map((enemy) => (
              <CombatantCard key={enemy.id} combatant={enemy} enemy />
            ))}
          </div>
        </div>
        <div className="battle-divider">
          <span />
          <Icon name="sword" size={12} />
          <span />
        </div>
        <div className="battle-side heroes">
          <div className="battle-side-label"><Icon name="flame" size={11} /> THE FIRE</div>
          <div className="combatant-row">
            {battle.heroes.map((hero) => (
              <CombatantCard key={hero.id} combatant={hero} />
            ))}
          </div>
        </div>
      </div>

      <div ref={logRef} className="battle-log" aria-live="polite">
        {battle.log.slice(-30).map((entry) => (
          <p key={entry.id} className={`log-${entry.kind}`}>
            {entry.text}
          </p>
        ))}
      </div>

      {ended ? (
        <div ref={resultRef} className="battle-result">
          <div className="flex items-center justify-between gap-2">
            <strong>{victory ? 'Expedition victorious' : 'Expedition broken'}</strong>
            <span className="font-mono text-[10px] text-frost-400/60">+{battle.xp} XP on win</span>
          </div>
          {victory && lastAward?.reward && (
            <>
              <div className="battle-loot">
                <span>RECOVERED</span>
                <ResourceCost cost={lastAward.reward} compact />
              </div>
              {lastAward.levelsGained.map((line) => (
                <p key={line} className="level-up-line">
                  <Icon name="spark" size={12} /> {line}
                </p>
              ))}
            </>
          )}
          {!victory && (
            <p className="text-[11px] leading-relaxed text-frost-300/65">
              No supplies were recovered. Train the party by clearing earlier stages, and try again.
            </p>
          )}
          <div className="flex gap-2">
            {victory && battle.stage < game.expedition.maxStage && (
              <button type="button" className="primary-button flex-1" onClick={onNextStage}>
                Next stage <Icon name="chevronRight" size={14} />
              </button>
            )}
            <button
              type="button"
              className={victory && battle.stage < game.expedition.maxStage ? 'secondary-button' : 'primary-button flex-1'}
              onClick={onClose}
            >
              Return to camp
            </button>
          </div>
        </div>
      ) : (
        <div className="battle-actions">
          <span className="inline-flex items-center gap-1.5 text-[10px] text-frost-400/60">
            <Icon name="spark" size={11} /> Auto-fighting · first clear opens the next route
          </span>
          <button type="button" className="mini-button" onClick={onRetreat}>
            Retreat
          </button>
        </div>
      )}
    </div>
  );
}

function CombatantCard({ combatant, enemy = false }: { combatant: Combatant; enemy?: boolean }) {
  const ratio = Math.max(0, combatant.hp / Math.max(1, combatant.maxHp));
  return (
    <div className={`combatant ${enemy ? 'is-enemy' : 'is-hero'} ${combatant.alive ? '' : 'is-down'}`}>
      <span className="combatant-icon">
        <Icon name={CLASS_ICONS[combatant.heroClass] ?? 'snow'} size={14} />
      </span>
      <span className="combatant-name">{combatant.name.split(' · ')[0]}</span>
      <span className="combatant-hp">
        <i style={{ width: `${ratio * 100}%` }} />
      </span>
      <small>
        {combatant.alive ? Math.ceil(combatant.hp) : 'DOWN'}
        {combatant.shield > 0 && <em> +{combatant.shield}</em>}
      </small>
    </div>
  );
}

