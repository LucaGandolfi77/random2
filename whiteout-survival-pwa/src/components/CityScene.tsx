import { useEffect, useRef } from 'react';
import {
  FACILITIES,
  FACILITY_ORDER,
} from '../game/content';
import {
  canAfford,
  getAssignedWorkers,
  getBuildCost,
  getFacilityUpgradeCost,
  getFurnaceUpgradeCost,
  getWorkerSlots,
  isFacilityUnlocked,
} from '../game/engine';
import type { FacilityId, GameState, WorkerFacilityId } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { Icon, type IconName } from './Icons';
import { PLOT_POSITIONS, SettlementRenderer } from '../render/SettlementRenderer';

const FACILITY_ICONS: Record<FacilityId, IconName> = {
  furnace: 'furnace',
  lumberMill: 'lumber',
  coalMine: 'mine',
  huntersHut: 'hunter',
  cookhouse: 'cook',
  shelter: 'shelter',
  clinic: 'clinic',
  ironSeam: 'seam',
};

export function CityScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<SettlementRenderer | null>(null);
  const game = useGameStore((state) => state.game);
  const selectedFacility = useGameStore((state) => state.selectedFacility);
  const openFacility = useGameStore((state) => state.openFacility);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new SettlementRenderer(canvas, game);
    rendererRef.current = renderer;
    renderer.start();

    const resize = () => renderer.resize();
    const observer = new ResizeObserver(resize);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', resize);
    const raf = window.requestAnimationFrame(resize);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      observer.disconnect();
      renderer.stop();
      rendererRef.current = null;
    };
    // The renderer lives for the whole mounted scene; live game data is pushed below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    rendererRef.current?.setGame(game);
  }, [game]);

  useEffect(() => {
    rendererRef.current?.setSelected(selectedFacility);
  }, [selectedFacility]);

  const visible = FACILITY_ORDER.filter(
    (id) => id === 'furnace' || isFacilityUnlocked(game, id),
  );
  const builtCount = visible.filter((id) => game.buildings[id].built).length;

  return (
    <div
      ref={containerRef}
      className="city-scene"
      role="group"
      aria-label={`Settlement scene. ${builtCount} structures standing. Tap a building to manage it.`}
    >
      <canvas ref={canvasRef} className="city-canvas" aria-hidden="true" />
      <div className="scene-topline">
        <span className="scene-chip">
          <span className="scene-dot" />
          LAST EMBER · NORTH WATCH
        </span>
        <span className={`scene-weather scene-weather-${game.weather.phase}`}>
          <Icon name={game.weather.phase === 'blizzard' ? 'wind' : 'snow'} size={11} />
          {game.weather.phase === 'calm' ? 'SNOW' : game.weather.phase === 'warning' ? 'STORM FRONT' : 'WHITEOUT'}
        </span>
      </div>

      {visible.map((id) => {
        const def = FACILITIES[id];
        const building = game.buildings[id];
        const displayLevel = id === 'furnace' ? game.furnace.level : building.level;
        const affordableUpgrade = isUpgradeReady(game, id);
        const workerFacility = def.workerFacility && id !== 'furnace';
        const assigned = workerFacility
          ? getAssignedWorkers(game, id as WorkerFacilityId).length
          : 0;
        const slots = workerFacility ? getWorkerSlots(id, building.level) : 0;
        const pos = PLOT_POSITIONS[id];
        return (
          <button
            key={id}
            type="button"
            className={`plot-node ${building.built ? 'is-built' : 'is-unbuilt'} ${id === 'furnace' ? 'is-furnace' : ''} ${selectedFacility === id ? 'is-selected' : ''}`}
            style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
            onClick={() => openFacility(id)}
            aria-label={`${def.name}. ${building.built ? `Level ${displayLevel}` : 'Not built'}. ${def.workerFacility ? `${assigned} of ${slots} workers.` : ''}`}
          >
            <span className="plot-medallion">
              <Icon name={FACILITY_ICONS[id]} size={id === 'furnace' ? 20 : 15} />
              {affordableUpgrade && <i className="plot-ready-dot" />}
            </span>
            <span className="plot-label">
              <span>{def.shortName}</span>
              <small>
                {!building.built
                  ? 'BUILD'
                  : id === 'furnace'
                    ? `LV ${building.level}`
                    : `LV${building.level}${def.workerFacility ? ` · ${assigned}/${slots}` : ''}`}
              </small>
            </span>
          </button>
        );
      })}

      <div className="scene-footer">
        <span className="scene-hint">
          <Icon name="spark" size={11} />
          Tap a structure to manage it
        </span>
        <span className="scene-hint">
          <Icon name="flame" size={11} />
          {game.furnace.mode === 'off' ? 'FURNACE DAMPED' : game.furnace.mode === 'overdrive' ? 'OVERDRIVE' : 'STEADY BURN'}
        </span>
      </div>
    </div>
  );
}

function isUpgradeReady(game: GameState, id: FacilityId): boolean {
  const building = game.buildings[id];
  if (!building.built) {
    if (id === 'furnace') return false;
    return canAfford(game.resources, getBuildCost(id));
  }
  if (id === 'furnace') {
    if (game.furnace.level >= 10) return false;
    return canAfford(game.resources, getFurnaceUpgradeCost(game));
  }
  if (building.level >= FACILITIES[id].maxLevel) return false;
  return canAfford(game.resources, getFacilityUpgradeCost(id, building.level));
}

export function facilityIcon(id: FacilityId): IconName {
  return FACILITY_ICONS[id];
}
