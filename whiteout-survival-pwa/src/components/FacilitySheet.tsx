import {
  FACILITIES,
  FURNACE_LEVELS,
  MAX_FACILITY_LEVEL,
  OVERDRIVE_COAL_MULTIPLIER,
  MAX_FURNACE_LEVEL,
  RESOURCE_META,
} from '../game/content';
import {
  canAfford,
  clinicHealingRate,
  facilityRate,
  getAssignedWorkers,
  getBuildCost,
  getFacilityUpgradeCost,
  getFurnaceCapacity,
  getFurnaceCoalPerSecond,
  getFurnaceHeatRatio,
  getFurnaceUpgradeCost,
  getNextFurnaceUnlock,
  getShelterCapacity,
  getWorkerSlots,
  isFacilityUnlocked,
  workerEfficiency,
} from '../game/engine';
import { formatNumber, formatRate, formatTemperature } from '../game/format';
import type { FacilityId, GameState, WorkerFacilityId } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { Badge, IconButton, Meter, Modal, ResourceCost, SectionHeading, StatPill } from './Common';
import { Icon } from './Icons';

export function FacilitySheet() {
  const game = useGameStore((state) => state.game);
  const selected = useGameStore((state) => state.selectedFacility);
  const close = useGameStore((state) => state.closeFacility);
  if (!selected) return null;
  const def = FACILITIES[selected];
  const building = game.buildings[selected];
  const displayLevel = selected === 'furnace' ? game.furnace.level : building.level;
  const displayBuilt = selected === 'furnace' ? true : building.built;
  const locked = !isFacilityUnlocked(game, selected);
  const workerFacility = def.workerFacility && selected !== 'furnace';
  const upgradeCost =
    selected === 'furnace'
      ? getFurnaceUpgradeCost(game)
      : building.built
        ? getFacilityUpgradeCost(selected, building.level)
        : getBuildCost(selected);
  const atMax =
    selected === 'furnace'
      ? game.furnace.level >= MAX_FURNACE_LEVEL
      : building.built && building.level >= MAX_FACILITY_LEVEL;
  const canAct = !locked && !atMax && canAfford(game.resources, upgradeCost);

  return (
    <Modal
      open
      onClose={close}
      title={def.name}
      subtitle={locked ? `Locked until furnace level ${def.unlockFurnace}` : def.description}
      variant="sheet"
      footer={
        <FacilityFooter
          game={game}
          facility={selected}
          locked={locked}
          atMax={atMax}
          canAct={canAct}
          cost={upgradeCost}
          built={displayBuilt}
        />
      }
    >
      <div className="facility-sheet-head">
        <div className="facility-hero-icon">
          <Icon name={facilityIconFor(selected)} size={28} />
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {locked ? (
            <Badge tone="warn">
              <Icon name="lock" size={11} /> Furnace {def.unlockFurnace}
            </Badge>
          ) : !displayBuilt ? (
            <Badge tone="ember">NOT BUILT</Badge>
          ) : (
            <Badge tone="good">LEVEL {displayLevel}</Badge>
          )}
          <span className="text-[11px] text-frost-300/65">{def.notes}</span>
        </div>
      </div>

      {selected === 'furnace' ? (
        <FurnaceDetails game={game} />
      ) : (
        <FacilityDetails
          game={game}
          facility={selected}
          workerFacility={workerFacility}
        />
      )}

      {!locked && !atMax && (
        <div className="sheet-section">
          <SectionHeading
            eyebrow={displayBuilt ? 'Next improvement' : 'Construction'}
            title={
              selected === 'furnace'
                ? `Furnace level ${game.furnace.level + 1}`
                : displayBuilt
                  ? `Upgrade to level ${displayLevel + 1}`
                  : 'Prepare the site'
            }
          />
          <div className="panel-quiet flex flex-wrap items-center justify-between gap-2">
            <ResourceCost cost={upgradeCost} resources={game.resources} />
            {selected === 'furnace' && (
              <span className="text-[10px] text-frost-300/60">
                +{FURNACE_LEVELS[game.furnace.level + 1]?.heatCapacity - FURNACE_LEVELS[game.furnace.level].heatCapacity} max heat
              </span>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function FacilityFooter({
  game,
  facility,
  locked,
  atMax,
  canAct,
  cost,
  built,
}: {
  game: GameState;
  facility: FacilityId;
  locked: boolean;
  atMax: boolean;
  canAct: boolean;
  cost: Record<string, number>;
  built: boolean;
}) {
  const upgradeFurnace = useGameStore((state) => state.upgradeFurnace);
  const buildFacility = useGameStore((state) => state.buildFacility);
  const upgradeFacility = useGameStore((state) => state.upgradeFacility);

  if (locked) {
    return (
      <button type="button" className="primary-button w-full" disabled>
        <Icon name="lock" size={16} />
        Requires furnace level {FACILITIES[facility].unlockFurnace}
      </button>
    );
  }
  if (atMax) {
    return (
      <div className="complete-strip">
        <Icon name="check" size={16} /> Fully upgraded
      </div>
    );
  }
  if (!built && facility !== 'furnace') {
    return (
      <button
        type="button"
        className="primary-button w-full justify-between"
        disabled={!canAct}
        onClick={() => buildFacility(facility)}
      >
        <span className="inline-flex items-center gap-2">
          <Icon name="lumber" size={16} /> Build {FACILITIES[facility].shortName}
        </span>
        <ResourceCost cost={cost} resources={game.resources} compact />
      </button>
    );
  }
  return (
    <button
      type="button"
      className="primary-button w-full justify-between"
      disabled={!canAct}
      onClick={() => (facility === 'furnace' ? upgradeFurnace() : upgradeFacility(facility))}
    >
      <span className="inline-flex items-center gap-2">
        <Icon name="flame" size={16} /> Upgrade to {facility === 'furnace' ? game.furnace.level + 1 : game.buildings[facility].level + 1}
      </span>
      <ResourceCost cost={cost} resources={game.resources} compact />
    </button>
  );
}

function FurnaceDetails({ game }: { game: GameState }) {
  const setFurnaceMode = useGameStore((state) => state.setFurnaceMode);
  const normalCoal = getFurnaceCoalPerSecond({ ...game, furnace: { ...game.furnace, mode: 'normal' } });
  const overdriveCoal = normalCoal * OVERDRIVE_COAL_MULTIPLIER;
  const capacity = getFurnaceCapacity(game);
  const ratio = getFurnaceHeatRatio(game);
  const nextUnlock = getNextFurnaceUnlock(game.furnace.level);
  const nextUnlockName = nextUnlock ? FACILITIES[nextUnlock].name : null;

  return (
    <>
      <div className="sheet-section">
        <div className="grid grid-cols-3 gap-2">
          <StatPill
            icon={<Icon name="thermometer" size={16} />}
            label="City"
            value={formatTemperature(game.furnace.temperature)}
            tone="warm"
          />
          <StatPill
            icon={<Icon name="flame" size={16} />}
            label="Heat"
            value={`${Math.round(ratio * 100)}%`}
            tone="ember"
          />
          <StatPill
            icon={<Icon name="wind" size={16} />}
            label="Out"
            value={formatTemperature(game.weather.ambient)}
            tone="cold"
          />
        </div>
        <Meter label="Stored heat" value={game.furnace.heat} max={capacity} tone="ember" />
        <p className="mt-2 text-[11px] leading-relaxed text-frost-300/60">
          Every second the furnace burns coal to store heat. Heat drains faster in a whiteout. Upgrade
          the furnace to raise capacity and unlock new facilities.
        </p>
      </div>

      <div className="sheet-section">
        <SectionHeading eyebrow="Burning mode" title="Feed the fire" />
        <div className="mode-switch" role="group" aria-label="Furnace burning mode">
          <button
            type="button"
            className={game.furnace.mode === 'off' ? 'is-active' : ''}
            onClick={() => setFurnaceMode('off')}
          >
            <Icon name="moon" size={14} />
            Off
          </button>
          <button
            type="button"
            className={game.furnace.mode === 'normal' ? 'is-active' : ''}
            onClick={() => setFurnaceMode('normal')}
          >
            <Icon name="flame" size={14} />
            Normal
          </button>
          <button
            type="button"
            className={game.furnace.mode === 'overdrive' ? 'is-active overdrive' : ''}
            onClick={() => setFurnaceMode('overdrive')}
          >
            <Icon name="wind" size={14} />
            Overdrive
          </button>
        </div>
        <div className="compact-table mt-2">
          <div>
            <span>Normal burn</span>
            <strong>{formatRate(normalCoal)} coal</strong>
          </div>
          <div>
            <span>Overdrive burn</span>
            <strong className="text-ember-300">{formatRate(overdriveCoal)} coal</strong>
          </div>
          <div>
            <span>Coal stock</span>
            <strong>{formatNumber(game.resources.coal)}</strong>
          </div>
          <div>
            <span>Capacity</span>
            <strong>{capacity} heat</strong>
          </div>
        </div>
        {nextUnlockName && (
          <div className="unlock-note">
            <Icon name="spark" size={13} />
            Next furnace level unlocks <b>{nextUnlockName}</b>.
          </div>
        )}
      </div>
    </>
  );
}

function FacilityDetails({
  game,
  facility,
  workerFacility,
}: {
  game: GameState;
  facility: FacilityId;
  workerFacility: boolean;
}) {
  const assignWorker = useGameStore((state) => state.assignWorker);
  const unassignWorker = useGameStore((state) => state.unassignWorker);
  const building = game.buildings[facility];
  const def = FACILITIES[facility];
  const workerId = workerFacility ? (facility as WorkerFacilityId) : null;
  const assigned = workerId ? getAssignedWorkers(game, workerId) : [];
  const slots = workerId ? getWorkerSlots(facility, building.level) : 0;
  const available = game.survivors.filter((survivor) => !survivor.job && !survivor.sick);
  const rate = workerId ? facilityRate(game, workerId) : null;
  const healing = facility === 'clinic' ? clinicHealingRate(game) : 0;
  const capacity = facility === 'shelter' ? getShelterCapacity(game) : 0;

  return (
    <>
      {!building.built && (
        <div className="unbuilt-note">
          <Icon name="lock" size={17} />
          <div>
            <b>This site is still under snow.</b>
            <p>Build it to add another way to keep the settlement alive.</p>
          </div>
        </div>
      )}

      {building.built && (
        <>
          <div className="sheet-section">
            <SectionHeading eyebrow="Output" title={`Level ${building.level}`} />
            <div className="grid grid-cols-2 gap-2">
              {facility === 'shelter' ? (
                <>
                  <StatPill icon={<Icon name="people" size={16} />} label="Beds" value={`${capacity}`} tone="warm" />
                  <StatPill icon={<Icon name="warmth" size={16} />} label="Night warmth" value={`+${14 + building.level}°`} tone="ember" />
                </>
              ) : facility === 'clinic' ? (
                <>
                  <StatPill icon={<Icon name="heal" size={16} />} label="Healing" value={`${healing.toFixed(2)}/s`} tone="good" />
                  <StatPill icon={<Icon name="people" size={16} />} label="Staff" value={`${assigned.length}/${slots}`} />
                </>
              ) : rate && def.productionResource ? (
                <>
                  <StatPill
                    icon={<Icon name="spark" size={16} />}
                    label={RESOURCE_META[def.productionResource].name}
                    value={formatRate(rate.amount)}
                    tone="cold"
                  />
                  <StatPill
                    icon={<Icon name="clock" size={16} />}
                    label={facility === 'cookhouse' ? 'Raw meat use' : 'Type'}
                    value={facility === 'cookhouse' ? formatRate(rate.rawCost) : def.indoor ? 'Indoor' : 'Outdoor'}
                  />
                </>
              ) : null}
            </div>
            {facility === 'cookhouse' && (
              <p className="mt-2 text-[11px] leading-relaxed text-frost-300/60">
                The cookhouse automatically turns 2 raw meat into 1 cooked meal while staffed.
              </p>
            )}
            {facility === 'clinic' && (
              <p className="mt-2 text-[11px] leading-relaxed text-frost-300/60">
                Staffed clinics heal sick survivors. Nobody recovers quickly in a cold bed.
              </p>
            )}
          </div>

          {workerId && (
            <div className="sheet-section">
              <div className="flex items-end justify-between gap-3">
                <SectionHeading eyebrow="Work posts" title="Assign survivors" />
                <div className="worker-stepper">
                  <IconButton
                    label={`Remove a worker from ${def.name}`}
                    icon={<Icon name="minus" size={15} />}
                    onClick={() => unassignWorker(workerId)}
                    disabled={assigned.length === 0}
                  />
                  <span>
                    {assigned.length}/{slots}
                  </span>
                  <IconButton
                    label={`Assign a worker to ${def.name}`}
                    icon={<Icon name="plus" size={15} />}
                    onClick={() => assignWorker(workerId)}
                    disabled={assigned.length >= slots || available.length === 0}
                  />
                </div>
              </div>
              <div className="assigned-list">
                {assigned.length === 0 ? (
                  <p className="text-xs text-frost-300/55">No one assigned. This facility is idle.</p>
                ) : (
                  assigned.map((survivor) => (
                    <div className="assigned-person" key={survivor.id}>
                      <span className="person-dot">{survivor.name.slice(0, 1)}</span>
                      <span className="flex min-w-0 flex-col">
                        <b>{survivor.name}</b>
                        <small>
                          {survivor.sick
                            ? 'Sick'
                            : `${Math.round(workerEfficiency(game, survivor) * 100)}% efficiency`}
                        </small>
                      </span>
                      {survivor.sick && <Badge tone="bad">Sick</Badge>}
                    </div>
                  ))
                )}
              </div>
              {available.length === 0 && assigned.length < slots && (
                <p className="mt-2 text-[10px] text-ember-200/80">
                  No unassigned, healthy survivors available.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

export function facilityIconFor(id: FacilityId) {
  const map = {
    furnace: 'furnace',
    lumberMill: 'lumber',
    coalMine: 'mine',
    huntersHut: 'hunter',
    cookhouse: 'cook',
    shelter: 'shelter',
    clinic: 'clinic',
    ironSeam: 'seam',
  } as const;
  return map[id];
}
