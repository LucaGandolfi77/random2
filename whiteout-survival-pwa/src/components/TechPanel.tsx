import { TECH_BY_ID, TECHS, type TechDefinition } from '../game/content';
import { canAfford } from '../game/engine';
import type { GameState, TechId } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { Badge, ResourceCost, SectionHeading } from './Common';
import { Icon, type IconName } from './Icons';

const TECH_ICONS: Record<TechId, IconName> = {
  insulation: 'warmth',
  efficient_burn: 'flame',
  saw_blades: 'lumber',
  deep_shafts: 'mine',
  trapping: 'hunter',
  field_medicine: 'heal',
  stew_pot: 'meals',
  expedition_gear: 'sword',
};

const TIER_TITLES = ['Foundations', 'Industry', 'Survival'];
const TIER_SUBTITLES = [
  'Cheap knowledge that keeps the first winter survivable.',
  'Better tools, deeper seams, more from every hour of work.',
  'For the frozen years: medicine, food and the long expeditions.',
];

export function TechPanel() {
  const game = useGameStore((state) => state.game);
  const researchTech = useGameStore((state) => state.researchTech);
  const studied = TECHS.filter((tech) => game.tech[tech.id]).length;
  const ratio = studied / TECHS.length;

  return (
    <div className="tab-view">
      <SectionHeading
        eyebrow="Chalk notes on a frozen board"
        title="Research"
        aside={
          <span className="text-[10px] text-frost-300/55">
            {studied}/{TECHS.length} studied
          </span>
        }
      />

      <div className="research-summary">
        <div className="research-orbit" aria-hidden="true">
          <Icon name="tech" size={21} />
          <i style={{ transform: `rotate(${ratio * 280}deg)` }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <strong>{studied === TECHS.length ? 'Nothing left to learn' : 'The long winter rewards preparation'}</strong>
            <Badge tone={studied === TECHS.length ? 'good' : 'neutral'}>{Math.round(ratio * 100)}%</Badge>
          </div>
          <p>
            Research is permanent. Every node makes the furnace, the stores or the expedition party
            stronger for the rest of the settlement&apos;s life.
          </p>
          <div className="research-progress" aria-hidden="true">
            <span style={{ width: `${ratio * 100}%` }} />
          </div>
        </div>
      </div>

      {[0, 1, 2].map((tier) => (
        <section key={tier} className="tech-tier">
          <div className="tech-tier-title">
            <span>0{tier + 1}</span>
            <div>
              <h3>{TIER_TITLES[tier]}</h3>
              <p>{TIER_SUBTITLES[tier]}</p>
            </div>
          </div>
          <div className="tech-tree">
            {TECHS.filter((tech) => tech.tier === tier).map((tech) => (
              <TechCard
                key={tech.id}
                game={game}
                tech={tech}
                onResearch={() => researchTech(tech.id)}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="city-footer-note">
        <Icon name="tech" size={14} />
        <p>
          Prerequisites are strict. If a node is dim, read its requirement line and upgrade the
          furnace or finish the earlier research first.
        </p>
      </div>
    </div>
  );
}

function TechCard({
  game,
  tech,
  onResearch,
}: {
  game: GameState;
  tech: TechDefinition;
  onResearch: () => void;
}) {
  const done = game.tech[tech.id];
  const prerequisitesMet = tech.requires.every((id) => game.tech[id]);
  const furnaceMet = game.furnace.level >= tech.furnaceLevel;
  const affordable = canAfford(game.resources, tech.cost);
  const available = !done && prerequisitesMet && furnaceMet;
  const canBuy = available && affordable;
  const missingPrereq = tech.requires.find((id) => !game.tech[id]);

  let status: { tone: 'good' | 'warn' | 'neutral' | 'ember'; text: string } = {
    tone: 'neutral',
    text: 'Available',
  };
  if (done) status = { tone: 'good', text: 'Studied' };
  else if (!furnaceMet) status = { tone: 'warn', text: `Furnace ${tech.furnaceLevel}` };
  else if (missingPrereq) status = { tone: 'warn', text: `Needs ${TECH_BY_ID[missingPrereq].name}` };
  else if (!affordable) status = { tone: 'ember', text: 'Need supplies' };

  return (
    <article className={`tech-card ${done ? 'is-done' : available ? 'is-available' : 'is-blocked'}`}>
      <div className="tech-icon">
        <Icon name={done ? 'check' : TECH_ICONS[tech.id]} size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <strong>{tech.name}</strong>
          <Badge tone={status.tone}>{status.text}</Badge>
        </div>
        <p className="tech-effect">{tech.effect}</p>
        <p className="tech-description">{tech.description}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {!done ? (
            <ResourceCost cost={tech.cost} resources={game.resources} compact />
          ) : (
            <span className="text-[10px] text-frost-400/55">Permanent improvement</span>
          )}
          {!done && (
            <button
              type="button"
              className="mini-button"
              disabled={!canBuy}
              onClick={onResearch}
              title={!furnaceMet ? `Requires furnace level ${tech.furnaceLevel}` : missingPrereq ? `Requires ${TECH_BY_ID[missingPrereq].name}` : undefined}
            >
              <Icon name={canBuy ? 'spark' : 'lock'} size={12} />
              Research
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
