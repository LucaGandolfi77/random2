import {
  FACILITIES,
  FACILITY_ORDER,
  MAX_FACILITY_LEVEL,
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
  getFurnaceHeatRatio,
  getFurnaceUpgradeCost,
  getShelterCapacity,
  getWorkerSlots,
  isFacilityUnlocked,
} from '../game/engine';
import { formatRate, formatTemperature } from '../game/format';
import type { FacilityId, GameState, WorkerFacilityId } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { Badge, IconButton, Meter, SectionHeading } from './Common';
import { CityScene, facilityIcon } from './CityScene';
import { Icon } from './Icons';

export function CityPanel() {
  const game = useGameStore((state) => state.game);
  const openFacility = useGameStore((state) => state.openFacility);
  const setTab = useGameStore((state) => state.setTab);

  const built = FACILITY_ORDER.filter((id) => game.buildings[id].built).length;
  const healthy = game.survivors.filter((survivor) => !survivor.sick).length;
  const beds = getShelterCapacity(game);
  const furnaceAffordable =
    game.furnace.level < MAX_FURNACE_LEVEL &&
    canAfford(game.resources, getFurnaceUpgradeCost(game));
  const heat = getFurnaceHeatRatio(game);
  const nextMove = getNextMove(game);

  return (
    <div className="tab-view">
      <SectionHeading
        eyebrow={`Day ${game.day} · North Watch`}
        title="The settlement"
        aside={
          <div className="flex items-center gap-1.5 text-[10px] text-frost-300/60">
            <span className="inline-flex items-center gap-1">
              <Icon name="shelter" size={12} /> {built} built
            </span>
            <span className="text-frost-500/60">·</span>
            <span className="inline-flex items-center gap-1">
              <Icon name="people" size={12} /> {healthy}/{beds} beds
            </span>
          </div>
        }
      />

      <CityScene />

      {nextMove && (
        <button
          type="button"
          className="next-move-card"
          onClick={() => {
            if (nextMove.tab) setTab(nextMove.tab);
            else if (nextMove.facility) openFacility(nextMove.facility);
          }}
        >
          <span className="next-move-icon"><Icon name={nextMove.icon} size={16} /></span>
          <span className="min-w-0 flex-1 text-left">
            <span className="next-move-kicker">NEXT MOVE</span>
            <strong>{nextMove.title}</strong>
            <small>{nextMove.body}</small>
          </span>
          <span className="next-move-go"><Icon name="chevronRight" size={14} /></span>
        </button>
      )}

      <button
        type="button"
        className={`furnace-summary ${furnaceAffordable ? 'has-ready-upgrade' : ''}`}
        onClick={() => openFacility('furnace')}
      >
        <div className="furnace-orb" aria-hidden="true">
          <span style={{ opacity: 0.25 + heat * 0.75 }} />
          <Icon name="flame" size={23} />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-1.5">
            <strong className="font-display text-[17px] text-frost-50">Central Furnace</strong>
            <Badge tone="neutral">LV {game.furnace.level}</Badge>
            {furnaceAffordable && <Badge tone="ember">UPGRADE READY</Badge>}
          </div>
          <Meter label="Stored heat" value={game.furnace.heat} max={getFurnaceCapacity(game)} tone="ember" className="mt-1.5" />
          <div className="mt-1 flex items-center gap-2 text-[10px] text-frost-300/65">
            <span>{formatTemperature(game.furnace.temperature)} inside</span>
            <span className="opacity-50">·</span>
            <span>{game.furnace.mode === 'off' ? 'Damped' : game.furnace.mode === 'overdrive' ? 'Overdrive' : 'Steady'}</span>
          </div>
        </div>
        <span className="furnace-summary-chevron">
          <Icon name="chevronRight" size={16} />
        </span>
      </button>

      <div className="mt-5">
        <SectionHeading
          eyebrow="Build & upgrade"
          title="Facilities"
          aside={<span className="text-[10px] text-frost-300/50">Tap for details</span>}
        />
        <div className="facility-grid">
          {FACILITY_ORDER.filter((id) => id !== 'furnace').map((id) => (
            <FacilityCard key={id} game={game} facility={id as Exclude<FacilityId, 'furnace'>} />
          ))}
        </div>
      </div>

      <div className="city-footer-note">
        <Icon name="book" size={14} />
        <p>
          Every level counts. Feed the furnace, staff the production buildings, and get the cookhouse
          running before the next whiteout.
        </p>
      </div>
    </div>
  );
}

function getNextMove(game: GameState) {
  if (game.survivors.length === 0) return null;
  if (game.furnace.level < 2) {
    return {
      facility: 'furnace' as FacilityId,
      icon: 'flame' as const,
      title: 'Upgrade the furnace to level 2',
      body: 'Unlock the coal mine and raise the heat ceiling before the next storm.',
    };
  }
  if (!game.buildings.coalMine.built) {
    return {
      facility: 'coalMine' as FacilityId,
      icon: 'mine' as const,
      title: 'Build the coal mine',
      body: 'A steady coal supply is what keeps the furnace alive after the starting stock.',
    };
  }
  if (getAssignedWorkers(game, 'coalMine').length === 0) {
    return {
      facility: 'coalMine' as FacilityId,
      icon: 'survivors' as const,
      title: 'Staff the coal mine',
      body: 'Use the plus control on the Coal card to assign an available survivor.',
    };
  }
  if (game.furnace.level < 3) {
    return {
      facility: 'furnace' as FacilityId,
      icon: 'flame' as const,
      title: 'Reach furnace level 3',
      body: 'The cookhouse is waiting behind the next upgrade.',
    };
  }
  if (!game.buildings.cookhouse.built) {
    return {
      facility: 'cookhouse' as FacilityId,
      icon: 'cook' as const,
      title: 'Build the cookhouse',
      body: 'Stocked meals keep the roster fed through every blizzard.',
    };
  }
  if (getAssignedWorkers(game, 'cookhouse').length === 0) {
    return {
      facility: 'cookhouse' as FacilityId,
      icon: 'survivors' as const,
      title: 'Put a cook on the fire',
      body: 'The cookhouse will convert raw meat into meals once it is staffed.',
    };
  }
  if (game.survivors.some((survivor) => survivor.sick) && game.buildings.clinic.built && getAssignedWorkers(game, 'clinic').length === 0) {
    return {
      facility: 'clinic' as FacilityId,
      icon: 'heal' as const,
      title: 'Staff the clinic',
      body: 'Sick survivors heal faster under a clinic roof.',
    };
  }
  if (game.furnace.level < 4) {
    return {
      facility: 'furnace' as FacilityId,
      icon: 'flame' as const,
      title: 'Reach furnace level 4',
      body: 'The clinic unlock turns sickness from a slow death into a setback.',
    };
  }
  if (!game.buildings.clinic.built) {
    return {
      facility: 'clinic' as FacilityId,
      icon: 'clinic' as const,
      title: 'Build the clinic',
      body: 'Winter always sends someone to the sickbed.',
    };
  }
  return {
    tab: 'heroes' as const,
    icon: 'sword' as const,
    title: 'Push the expedition deeper',
    body: 'First clears bring iron, the bottleneck for every furnace upgrade.',
  };
}

function FacilityCard({
  game,
  facility,
}: {
  game: GameState;
  facility: Exclude<FacilityId, 'furnace'>;
}) {
  const openFacility = useGameStore((state) => state.openFacility);
  const assignWorker = useGameStore((state) => state.assignWorker);
  const unassignWorker = useGameStore((state) => state.unassignWorker);
  const def = FACILITIES[facility];
  const building = game.buildings[facility];
  const unlocked = isFacilityUnlocked(game, facility);
  const workerFacility = def.workerFacility;
  const workerId = workerFacility ? (facility as WorkerFacilityId) : null;
  const assigned = workerId ? getAssignedWorkers(game, workerId) : [];
  const slots = workerFacility ? getWorkerSlots(facility, building.level) : 0;
  const canAssign =
    Boolean(workerId) &&
    game.survivors.some((survivor) => !survivor.job && !survivor.sick) &&
    assigned.length < slots;
  const ready =
    unlocked &&
    (building.built
      ? building.level < MAX_FACILITY_LEVEL &&
        canAfford(game.resources, getFacilityUpgradeCost(facility, building.level))
      : canAfford(game.resources, getBuildCost(facility)));

  let statusLine = `Furnace level ${def.unlockFurnace} to unlock`;
  if (unlocked && !building.built) statusLine = 'Site empty · ready to build';
  if (building.built) {
    if (facility === 'shelter') statusLine = `${getShelterCapacity(game)} beds · warmer nights`;
    else if (facility === 'clinic') statusLine = `${formatRate(clinicHealingRate(game))} healing`;
    else if (def.productionResource) {
      const rate = facilityRate(game, facility as WorkerFacilityId);
      statusLine =
        facility === 'cookhouse'
          ? `${formatRate(rate.amount)} meals · uses ${formatRate(rate.rawCost)} raw`
          : `${formatRate(rate.amount)} ${RESOURCE_META[def.productionResource].short}`;
    }
  }

  return (
    <article
      className={`facility-card ${!unlocked ? 'is-locked' : ''} ${!building.built && unlocked ? 'is-unbuilt' : ''} ${ready ? 'has-ready-upgrade' : ''}`}
    >
      <button type="button" className="facility-card-main" onClick={() => openFacility(facility)}>
        <span className={`facility-icon facetone-${facility}`}>
          <Icon name={facilityIcon(facility)} size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <strong>{def.shortName}</strong>
            {ready && <i className="tiny-ready-dot" aria-label="Upgrade affordable" />}
          </span>
          <small>{statusLine}</small>
        </span>
        {!unlocked ? (
          <Icon name="lock" size={13} className="text-frost-500" />
        ) : (
          <Icon name="chevronRight" size={13} className="text-frost-500" />
        )}
      </button>
      {unlocked && !building.built && (
        <div className="facility-card-sub">
          <span>Level {building.level === 1 ? '—' : building.level}</span>
          <span className="inline-flex items-center gap-1 text-frost-300/55">
            <Icon name="furnace" size={10} /> Lv {def.unlockFurnace}+ unlock
          </span>
        </div>
      )}
      {building.built && workerFacility && workerId && (
        <div className="facility-card-controls">
          <span className="facility-level">LV {building.level}</span>
          <span className="ml-auto text-[10px] text-frost-400/60">
            {assigned.filter((survivor) => !survivor.sick).length}/{slots} working
          </span>
          <IconButton
            label={`Remove worker from ${def.shortName}`}
            icon={<Icon name="minus" size={13} />}
            onClick={() => unassignWorker(workerId)}
            disabled={assigned.length === 0}
            className="compact-icon-button"
          />
          <IconButton
            label={`Assign worker to ${def.shortName}`}
            icon={<Icon name="plus" size={13} />}
            onClick={() => assignWorker(workerId)}
            disabled={!canAssign}
            className="compact-icon-button"
          />
        </div>
      )}
      {building.built && !workerFacility && (
        <div className="facility-card-sub">
          <span className="facility-level">LV {building.level}</span>
          <span>{def.notes}</span>
        </div>
      )}
    </article>
  );
}

