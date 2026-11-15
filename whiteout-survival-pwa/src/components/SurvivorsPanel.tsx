import {
  DECREES,
  FACILITIES,
  WORKER_FACILITIES,
} from '../game/content';
import {
  getMealRequirement,
  getShelterCapacity,
  getWorkerSlots,
} from '../game/engine';
import { formatNumber } from '../game/format';
import type { DecreeId, WorkerFacilityId } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { Badge, EmptyState, Meter, SectionHeading } from './Common';
import { Icon } from './Icons';

const DECREE_ORDER: DecreeId[] = ['balanced', 'extended_shifts', 'hearty_meals'];
const DECREE_ICONS: Record<DecreeId, 'shield' | 'clock' | 'meals'> = {
  balanced: 'shield',
  extended_shifts: 'clock',
  hearty_meals: 'meals',
};

export function SurvivorsPanel() {
  const game = useGameStore((state) => state.game);
  const setDecree = useGameStore((state) => state.setDecree);
  const setSurvivorJob = useGameStore((state) => state.setSurvivorJob);

  const healthy = game.survivors.filter((survivor) => !survivor.sick).length;
  const sick = game.survivors.length - healthy;
  const unassigned = game.survivors.filter((survivor) => !survivor.job).length;
  const beds = getShelterCapacity(game);
  const dailyMeals = game.survivors.length * getMealRequirement(game);
  const builtJobs = WORKER_FACILITIES.filter((id) => game.buildings[id].built);

  return (
    <div className="tab-view">
      <SectionHeading
        eyebrow="The people under the roof"
        title="Survivors"
        aside={
          <span className="text-[10px] text-frost-300/55">
            {beds} beds · {game.survivors.length} souls
          </span>
        }
      />

      <div className="people-summary">
        <div>
          <Icon name="people" size={18} />
          <strong>{game.survivors.length}</strong>
          <span>Living</span>
        </div>
        <div>
          <Icon name="health" size={18} />
          <strong>{healthy}</strong>
          <span>Healthy</span>
        </div>
        <div className={sick > 0 ? 'is-alert' : ''}>
          <Icon name="heal" size={18} />
          <strong>{sick}</strong>
          <span>Sick</span>
        </div>
        <div>
          <Icon name="survivors" size={18} />
          <strong>{unassigned}</strong>
          <span>Free</span>
        </div>
      </div>

      <div className="mb-4">
        <SectionHeading eyebrow="Chief's law" title="Choose a decree" />
        <div className="decree-list">
          {DECREE_ORDER.map((id) => {
            const decree = DECREES[id];
            const active = game.decree === id;
            return (
              <button
                type="button"
                key={id}
                className={`decree-card ${active ? 'is-active' : ''}`}
                onClick={() => setDecree(id)}
                aria-pressed={active}
              >
                <span className="decree-icon">
                  <Icon name={DECREE_ICONS[id]} size={18} />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="decree-title">
                    {decree.name}
                    {active && <Badge tone="ember">IN FORCE</Badge>}
                  </span>
                  <span className="decree-subtitle">{decree.subtitle}</span>
                  <span className="decree-description">{decree.description}</span>
                </span>
                <span className={`radio-dot ${active ? 'is-on' : ''}`} aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <div className="meal-note">
          <Icon name="meals" size={14} />
          <span>
            Meal call at 17:00 · <b>{dailyMeals}</b> meal{dailyMeals === 1 ? '' : 's'} needed today
          </span>
          <span className="ml-auto font-mono">{formatNumber(game.resources.meals)} in store</span>
        </div>
      </div>

      <SectionHeading
        eyebrow="Health, warmth & work"
        title="The roster"
        aside={<span className="text-[10px] text-frost-300/50">{unassigned} available</span>}
      />

      {game.survivors.length === 0 ? (
        <EmptyState
          icon={<Icon name="snow" size={26} />}
          title="The bunkhouse is empty"
          body="No one is left to feed the fire. Start a new settlement from Settings."
        />
      ) : (
        <div className="survivor-list">
          {game.survivors.map((survivor) => (
            <article key={survivor.id} className={`survivor-card ${survivor.sick ? 'is-sick' : ''}`}>
              <div className="survivor-head">
                <span className={`person-avatar ${survivor.sick ? 'is-sick' : ''}`}>
                  {survivor.name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <strong>{survivor.name}</strong>
                    <Badge tone={survivor.sick ? 'bad' : 'good'}>
                      {survivor.sick ? 'Sick' : 'Healthy'}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-frost-400/65">
                    <Icon name="survivors" size={11} />
                    <span>{survivor.job ? FACILITIES[survivor.job].name : 'No work post'}</span>
                  </div>
                </div>
                <label className="job-select-wrap">
                  <span className="sr-only">Assign {survivor.name} to a facility</span>
                  <select
                    value={survivor.job ?? ''}
                    onChange={(event) =>
                      setSurvivorJob(
                        survivor.id,
                        (event.target.value || null) as WorkerFacilityId | null,
                      )
                    }
                  >
                    <option value="">Unassigned</option>
                    {builtJobs.map((id) => {
                      const count = game.survivors.filter((entry) => entry.job === id).length;
                      const slots = getWorkerSlots(id, game.buildings[id].level);
                      return (
                        <option key={id} value={id}>
                          {FACILITIES[id].shortName} ({count}/{slots})
                        </option>
                      );
                    })}
                  </select>
                  <Icon name="chevronDown" size={12} />
                </label>
              </div>

              {survivor.sick && (
                <div className="sick-callout">
                  <Icon name="heal" size={14} />
                  {game.buildings.clinic.built
                    ? game.survivors.some((entry) => entry.job === 'clinic' && !entry.sick)
                      ? 'In the clinic’s care. Keep the beds warm.'
                      : 'The clinic has no healthy staff. Assign someone there.'
                    : 'No clinic built. Warmth and food are the only medicine.'}
                </div>
              )}

              <div className="survivor-stats">
                <Meter label="Health" value={survivor.health} tone="health" />
                <Meter label="Hunger" value={survivor.hunger} tone="hunger" inverse />
                <Meter label="Warmth" value={survivor.warmth} tone="warmth" />
                <Meter label="Happiness" value={survivor.happiness} tone="happiness" />
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="city-footer-note">
        <Icon name="health" size={14} />
        <p>
          Sick survivors cannot work. Warmth recovers fastest during night rest and with more shelter
          space. Low hunger, a warm body and a safe bed all feed happiness.
        </p>
      </div>
    </div>
  );
}

