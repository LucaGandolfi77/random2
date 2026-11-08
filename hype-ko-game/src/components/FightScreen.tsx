import { useEffect, useRef, useState } from 'react';
import {
  createEngine,
  createScene,
  MatchRenderer,
  QUALITY_PRESETS,
  resizeEngine
} from '../game/engine';
import { MatchSim } from '../game/combat/simulation';
import {
  InputBit,
  neutralInput,
  type InputState,
  type MatchConfig,
  type SimEvent,
  type SimSnapshot
} from '../game/combat/types';
import { getFighter } from '../data/fighters';
import { getStage } from '../data/stages';
import { createAI, type AIController } from '../game/ai';
import { InputManager } from '../game/input/inputManager';
import type { AudioManager } from '../game/audio/audioManager';
import type { MatchSetup } from '../app/types';
import type { GameSettings, MatchSummary } from '../utils/storage';
import type { FighterDefinition } from '../data/fighters/types';
import type { FighterState } from '../game/combat/types';
import type { OnlineClient } from '../network/onlineClient';
import { NeonButton } from './ui';

interface HudFighter {
  index: number;
  name: string;
  charId: string;
  health: number;
  maxHealth: number;
  super: number;
  hype: number;
  roundsWon: number;
  active: boolean;
  ko: boolean;
  combo: number;
  primary: string;
  accent: string;
}

interface HudState {
  player: HudFighter | null;
  opponent: HudFighter | null;
  playerReserve: HudFighter | null;
  opponentReserve: HudFighter | null;
  extras: HudFighter[];
  timer: number;
  round: number;
  roundsToWin: number;
  playerRounds: number;
  opponentRounds: number;
  phase: string;
  matchWinner: number | null;
}

const EMPTY_HUD: HudState = {
  player: null,
  opponent: null,
  playerReserve: null,
  opponentReserve: null,
  extras: [],
  timer: 99,
  round: 1,
  roundsToWin: 2,
  playerRounds: 0,
  opponentRounds: 0,
  phase: 'intro',
  matchWinner: null
};

function fighterToHud(fighter: FighterState): HudFighter {
  return {
    index: fighter.index,
    name: fighter.def.name,
    charId: fighter.def.id,
    health: Math.max(0, fighter.health),
    maxHealth: fighter.maxHealth,
    super: fighter.super,
    hype: fighter.hype,
    roundsWon: fighter.roundsWon,
    active: fighter.active,
    ko: fighter.ko,
    combo: fighter.combo,
    primary: getFighter(fighter.def.id).palette.primary,
    accent: getFighter(fighter.def.id).palette.accent
  };
}

function buildHud(sim: MatchSim, setup: MatchSetup): HudState {
  const team0 = sim.fighters.filter((fighter) => fighter.team === 0);
  const team1 = sim.fighters.filter((fighter) => fighter.team === 1);
  const player = team0.find((fighter) => fighter.active) ?? team0[0] ?? null;
  const opponent = team1.find((fighter) => fighter.active) ?? team1[0] ?? null;
  const playerReserve = team0.find((fighter) => !fighter.active) ?? null;
  const opponentReserve = team1.find((fighter) => !fighter.active) ?? null;
  const extras = sim.fighters
    .filter((fighter) => fighter.team >= 2 && fighter.active && !fighter.ko)
    .map(fighterToHud);
  return {
    player: player ? fighterToHud(player) : null,
    opponent: opponent ? fighterToHud(opponent) : null,
    playerReserve: playerReserve ? fighterToHud(playerReserve) : null,
    opponentReserve: opponentReserve ? fighterToHud(opponentReserve) : null,
    extras,
    timer: Math.max(0, Math.ceil(sim.timerFrames / 60)),
    round: sim.round,
    roundsToWin: setup.roundsToWin,
    playerRounds: team0.reduce((sum, fighter) => sum + fighter.roundsWon, 0),
    opponentRounds: team1.reduce((sum, fighter) => sum + fighter.roundsWon, 0),
    phase: sim.phase,
    matchWinner: sim.matchWinner
  };
}

function buildConfig(setup: MatchSetup): { config: MatchConfig; defs: FighterDefinition[] } {
  let ids: string[];
  let teams: number[][];
  let teamSize = 1;
  let rumble = false;

  if (setup.mode === 'team') {
    const playerTeam = setup.playerTeam ?? [setup.playerFighter, 'velvetvera'];
    const opponentTeam = setup.opponentTeam ?? [setup.opponentFighter, 'nocturna'];
    ids = [playerTeam[0], playerTeam[1], opponentTeam[0], opponentTeam[1]];
    teams = [
      [0, 1],
      [2, 3]
    ];
    teamSize = 2;
  } else if (setup.mode === 'rumble') {
    const opponents = setup.rumbleFighters ?? ['velvetvera', 'reinari', 'nocturna'];
    ids = [setup.playerFighter, ...opponents.slice(0, 3)];
    teams = [[0], [1], [2], [3]];
    rumble = true;
  } else {
    ids = [setup.playerFighter, setup.opponentFighter];
    teams = [[0], [1]];
  }

  const defs = ids.map((id) => getFighter(id));
  const config: MatchConfig = {
    mode: setup.mode,
    stageId: setup.stageId,
    roundsToWin: setup.roundsToWin,
    roundTime: setup.roundTime,
    fighters: defs,
    teams,
    teamSize,
    rumble,
    dummyMode: 'stand'
  };
  return { config, defs };
}

function dummyInput(mode: 'stand' | 'block' | 'counter' | 'cpu'): InputState {
  if (mode === 'block') return { held: InputBit.Block, pressed: 0 };
  return neutralInput();
}

export interface FightScreenProps {
  setup: MatchSetup;
  settings: GameSettings;
  audio: AudioManager;
  onlineClient?: OnlineClient;
  onComplete: (summary: MatchSummary) => void;
  onExit: () => void;
}

export function FightScreen({ setup, settings, audio, onlineClient, onComplete, onExit }: FightScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hud, setHud] = useState<HudState>(EMPTY_HUD);
  const [announce, setAnnounce] = useState('');
  const [paused, setPaused] = useState(false);
  const [matchOver, setMatchOver] = useState(false);
  const [dummyMode, setDummyMode] = useState<'stand' | 'block' | 'counter' | 'cpu'>('stand');
  const [infiniteHealth, setInfiniteHealth] = useState(false);
  const [infiniteMeter, setInfiniteMeter] = useState(false);
  const [showTouch, setShowTouch] = useState(false);
  const [matchId, setMatchId] = useState(0);
  const pausedRef = useRef(false);
  const finishedRef = useRef(false);
  const dummyModeRef = useRef<'stand' | 'block' | 'counter' | 'cpu'>('stand');
  const infiniteHealthRef = useRef(false);
  const infiniteMeterRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onExitRef = useRef(onExit);
  const announceTimer = useRef<number | null>(null);
  const finishTimer = useRef<number | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const simRef = useRef<MatchSim | null>(null);

  const showAnnounce = (text: string, duration = 1500) => {
    setAnnounce(text);
    if (announceTimer.current !== null) window.clearTimeout(announceTimer.current);
    announceTimer.current = window.setTimeout(() => setAnnounce(''), duration);
  };

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    onExitRef.current = onExit;
  }, [onExit]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    setShowTouch(settings.touchControls === 'on' || (settings.touchControls === 'auto' && coarse));
  }, [settings.touchControls]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { config, defs } = buildConfig(setup);
    const stage = getStage(setup.stageId);
    const quality = QUALITY_PRESETS[settings.quality];
    const isOnline = Boolean(onlineClient);
    finishedRef.current = false;
    pausedRef.current = false;
    setMatchOver(false);
    setPaused(false);
    setAnnounce('');
    setHud(EMPTY_HUD);
    let cancelled = false;
    let engine: Awaited<ReturnType<typeof createEngine>>['engine'] | null = null;
    let renderer: MatchRenderer | null = null;
    let sim: MatchSim | null = null;
    let input: InputManager | null = null;
    let resizeHandler: (() => void) | null = null;
    let resizeObserver: ResizeObserver | null = null;
    const ais = new Map<number, AIController>();
    let lastTime = performance.now();
    let accumulator = 0;
    let lastHudUpdate = 0;
    let playerDamageThisRound = 0;
    let perfectRounds = 0;
    let superUses = 0;
    let finishers = 0;
    let lastSnapshot: SimSnapshot | null = null;

    const setupAis = (current: MatchSim) => {
      ais.clear();
      for (const fighter of current.fighters) {
        if (setup.localVersus) continue;
        if (fighter.team === 0) continue;
        const def = defs[fighter.index] ?? getFighter(fighter.def.id);
        ais.set(fighter.index, createAI(fighter.index, def.ai, setup.difficulty, 0x51f15e + fighter.index * 7919));
      }
    };

    const handleEvents = (events: SimEvent[], current: MatchSim) => {
      for (const event of events) {
        switch (event.type) {
          case 'hit': {
            audio.hit(event.heavy);
            if (current.fighters[event.defender]?.team === 0) {
              playerDamageThisRound += event.damage;
            }
            break;
          }
          case 'block':
            audio.block();
            break;
          case 'parry':
            audio.parry();
            break;
          case 'counter':
            audio.parry();
            break;
          case 'ko':
            audio.ko();
            break;
          case 'roundStart':
            playerDamageThisRound = 0;
            showAnnounce('FIGHT!', 1100);
            audio.bell();
            break;
          case 'roundEnd':
            if (event.winner !== null && current.fighters[event.winner]?.team === 0 && playerDamageThisRound === 0) {
              perfectRounds++;
            }
            if (event.reason === 'timeout') audio.count();
            break;
          case 'matchEnd':
            audio.bell();
            break;
          case 'special':
            audio.whoosh();
            if (current.fighters[event.fighter]?.team === 0) {
              showAnnounce(current.fighters[event.fighter].lastMoveName || 'SPECIAL', 1000);
            }
            break;
          case 'super':
            audio.super();
            if (current.fighters[event.fighter]?.team === 0) superUses++;
            showAnnounce('SUPER!', 1300);
            break;
          case 'hype':
            audio.hype();
            showAnnounce('HYPE BREAKER!', 1300);
            break;
          case 'finisher':
            if (event.phase === 'start') {
              if (current.fighters[event.attacker]?.team === 0) finishers++;
              showAnnounce('HYPE FINISH', 1800);
            } else if (event.phase === 'impact') {
              audio.explosion();
            }
            break;
          case 'announce':
            showAnnounce(event.text, 1500);
            audio.announce(event.text);
            break;
          case 'tag':
            audio.tag();
            showAnnounce('CAMBIO!', 900);
            break;
          case 'projectile':
            audio.projectile();
            break;
          case 'explosion':
            audio.explosion();
            break;
          case 'timeout':
            showAnnounce('TIME!', 1600);
            break;
          case 'stun':
            showAnnounce('STUN!', 900);
            break;
          default:
            break;
        }
      }
    };

    const stepInputs = (current: MatchSim): InputState[] => {
      const [p1, p2] = input!.poll();
      return current.fighters.map((fighter) => {
        if (setup.localVersus) {
          if (fighter.team === 0 && fighter.active) return p1;
          if (fighter.team === 1 && fighter.active) return p2;
          return neutralInput();
        }
        if (fighter.team === 0) {
          return fighter.active ? p1 : neutralInput();
        }
        if (setup.mode === 'training' && fighter.index === 1) {
          const mode = dummyModeRef.current;
          if (mode === 'stand' || mode === 'block') return dummyInput(mode);
        }
        const ai = ais.get(fighter.index);
        return ai ? ai.update(current) : neutralInput();
      });
    };

    const makeSummary = (current: MatchSim): MatchSummary => {
      const playerFighters = current.fighters.filter((fighter) => fighter.team === 0);
      const opponentFighters = current.fighters.filter((fighter) => fighter.team !== 0);
      const won = current.matchWinner === 0;
      return {
        won,
        mode: setup.mode,
        playerFighter: setup.playerFighter,
        opponentFighter: setup.opponentFighter,
        damageDealt: playerFighters.reduce((sum, fighter) => sum + fighter.totalDamageDealt, 0),
        maxCombo: Math.max(0, ...playerFighters.map((fighter) => fighter.maxCombo)),
        hits: playerFighters.reduce((sum, fighter) => sum + fighter.totalHits, 0),
        superUses,
        finishers,
        perfectRounds,
        roundsWon: playerFighters.reduce((sum, fighter) => sum + fighter.roundsWon, 0),
        roundsLost: opponentFighters.reduce((sum, fighter) => sum + fighter.roundsWon, 0),
        matchTime: Math.round(current.frame / 60)
      };
    };

    const finishMatch = (current: MatchSim) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setMatchOver(true);
      const summary = makeSummary(current);
      finishTimer.current = window.setTimeout(() => {
        onCompleteRef.current(summary);
      }, 2200);
    };

    const start = async () => {
      const created = await createEngine(canvas, quality);
      if (cancelled) {
        created.engine.dispose();
        return;
      }
      engine = created.engine;
      const scene = createScene(engine);
      renderer = new MatchRenderer(scene, engine, stage, defs, {
        quality,
        outline: quality.glow
      });
      sim = new MatchSim(config);
      simRef.current = sim;
      input = new InputManager(settings.bindingsP1, settings.bindingsP2);
      inputRef.current = input;
      if (!isOnline) setupAis(sim);
      if (setup.mode === 'training') {
        sim.config.dummyMode = dummyModeRef.current;
        sim.config.infiniteHealth = infiniteHealthRef.current;
        sim.config.infiniteMeter = infiniteMeterRef.current;
        for (const fighter of sim.fighters) {
          if (fighter.team !== 0) fighter.dummyMode = dummyModeRef.current;
        }
      }
      if (isOnline && onlineClient?.snapshot) {
        sim.load(onlineClient.snapshot);
        lastSnapshot = onlineClient.snapshot;
      }
      setHud(buildHud(sim, setup));
      audio.unlock();
      audio.playMusic(stage.musicMotif);
      showAnnounce(`ROUND ${sim.round}`, 1400);
      audio.announce(`Round ${sim.round}`);

      resizeHandler = () => {
        if (engine) resizeEngine(engine);
      };
      window.addEventListener('resize', resizeHandler);
      resizeObserver = new ResizeObserver(resizeHandler);
      resizeObserver.observe(canvas);

      lastTime = performance.now();
      const loop = () => {
        const now = performance.now();
        const dt = Math.min(0.25, (now - lastTime) / 1000);
        lastTime = now;
        if (!sim || !renderer) return;
        if (isOnline && onlineClient) {
          const [p1] = input!.poll();
          if (!finishedRef.current) {
            onlineClient.sendInput(pausedRef.current ? neutralInput() : p1);
          }
          if (onlineClient.snapshot && onlineClient.snapshot !== lastSnapshot) {
            lastSnapshot = onlineClient.snapshot;
            sim.load(lastSnapshot);
          }
          const events = onlineClient.events;
          onlineClient.events = [];
          if (events.length > 0) handleEvents(events, sim);
          renderer.sync(sim, dt, events);
          renderer.render();
          if (now - lastHudUpdate > 90) {
            lastHudUpdate = now;
            setHud(buildHud(sim, setup));
          }
          if (onlineClient.end && !finishedRef.current) {
            finishedRef.current = true;
            setMatchOver(true);
            const summary = onlineClient.end.summary;
            finishTimer.current = window.setTimeout(() => onCompleteRef.current(summary), 2200);
            return;
          }
          if (
            !finishedRef.current &&
            (onlineClient.status === 'closed' || onlineClient.room?.status === 'lobby')
          ) {
            finishedRef.current = true;
            setMatchOver(true);
            showAnnounce('AVVERSARIO DISCONNESSO', 2000);
            finishTimer.current = window.setTimeout(() => onExitRef.current(), 2200);
          }
          return;
        }
        const frameEvents: SimEvent[] = [];
        if (!pausedRef.current && !finishedRef.current) {
          accumulator += dt;
          let steps = 0;
          while (accumulator >= 1 / 60 && steps < 12) {
            const events = sim.step(stepInputs(sim));
            frameEvents.push(...events);
            handleEvents(events, sim);
            accumulator -= 1 / 60;
            steps++;
            if (sim.phase === 'matchEnd') {
              finishMatch(sim);
              break;
            }
          }
        } else {
          accumulator = 0;
        }
        renderer.sync(sim, dt, frameEvents);
        renderer.render();
        if (now - lastHudUpdate > 90) {
          lastHudUpdate = now;
          setHud(buildHud(sim, setup));
        }
      };
      engine.runRenderLoop(loop);
    };

    void start();

    return () => {
      cancelled = true;
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      resizeObserver?.disconnect();
      if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
      if (announceTimer.current !== null) window.clearTimeout(announceTimer.current);
      input?.destroy();
      inputRef.current = null;
      audio.stopMusic();
      renderer?.dispose();
      simRef.current = null;
      if (engine) {
        engine.stopRenderLoop();
        engine.dispose();
      }
    };
  }, [setup, settings.quality, settings.bindingsP1, settings.bindingsP2, audio, onlineClient, matchId]);

  const togglePause = () => {
    if (matchOver) return;
    setPaused((value) => !value);
    inputRef.current?.clear();
  };

  const restartMatch = () => {
    setPaused(false);
    pausedRef.current = false;
    setMatchOver(false);
    finishedRef.current = false;
    setAnnounce('');
    if (finishTimer.current !== null) window.clearTimeout(finishTimer.current);
    setMatchId((value) => value + 1);
  };

  const changeDummyMode = (mode: 'stand' | 'block' | 'counter' | 'cpu') => {
    setDummyMode(mode);
    dummyModeRef.current = mode;
    const sim = simRef.current;
    if (!sim) return;
    sim.config.dummyMode = mode;
    for (const fighter of sim.fighters) {
      if (fighter.team !== 0) fighter.dummyMode = mode;
    }
  };

  const toggleInfiniteHealth = () => {
    const sim = simRef.current;
    if (!sim) return;
    const next = !infiniteHealth;
    infiniteHealthRef.current = next;
    setInfiniteHealth(next);
    sim.config.infiniteHealth = next;
    if (next) {
      for (const fighter of sim.fighters) fighter.health = fighter.maxHealth;
    }
  };

  const toggleInfiniteMeter = () => {
    const sim = simRef.current;
    if (!sim) return;
    const next = !infiniteMeter;
    infiniteMeterRef.current = next;
    setInfiniteMeter(next);
    sim.config.infiniteMeter = next;
  };

  const resetTraining = () => {
    const sim = simRef.current;
    if (!sim) return;
    sim.resetTraining();
    sim.resetMeters();
    setHud(buildHud(sim, setup));
    showAnnounce('RESET', 800);
  };

  const player = hud.player;
  const opponent = hud.opponent;
  const onlineSlot = onlineClient?.room?.you;
  const playerHealthPct = player ? Math.max(0, (player.health / player.maxHealth) * 100) : 0;
  const opponentHealthPct = opponent ? Math.max(0, (opponent.health / opponent.maxHealth) * 100) : 0;
  const playerRounds = Array.from({ length: hud.roundsToWin }, (_, index) => index < hud.playerRounds);
  const opponentRounds = Array.from({ length: hud.roundsToWin }, (_, index) => index < hud.opponentRounds);

  return (
    <div className={`fight-screen ${matchOver ? 'is-over' : ''}`}>
      <canvas ref={canvasRef} className="fight-canvas" />
      <div className="fight-vignette" />
      {!matchOver && (
        <div className="fight-hud">
          <div className="hud-top">
            <div className="hud-fighter hud-fighter--left">
              <div className="hud-fighter__name">
                {player?.name ?? 'PLAYER'}
                <span className="hud-fighter__tag">{onlineClient ? (onlineSlot === 0 ? 'TU' : 'P1') : 'P1'}</span>
              </div>
              <div className="hud-health">
                <div className="hud-health__fill hud-health__fill--player" style={{ width: `${playerHealthPct}%` }} />
                <div className="hud-health__shine" />
              </div>
              <div className="hud-rounds">
                {playerRounds.map((filled, index) => (
                  <span key={index} className={`hud-round ${filled ? 'is-filled' : ''}`} />
                ))}
                {hud.playerReserve && (
                  <span className="hud-reserve">
                    <span className="hud-reserve__dot" style={{ background: hud.playerReserve.accent }} />
                    {hud.playerReserve.name}
                  </span>
                )}
              </div>
            </div>
            <div className="hud-center">
              <div className="hud-timer">{hud.timer}</div>
              <div className="hud-round-label">ROUND {hud.round}</div>
              <button type="button" className="hud-pause" onClick={togglePause} aria-label="Pausa">
                II
              </button>
            </div>
            <div className="hud-fighter hud-fighter--right">
              <div className="hud-fighter__name">
                <span className="hud-fighter__tag">{onlineClient ? (onlineSlot === 1 ? 'TU' : 'P2') : setup.localVersus ? 'P2' : 'CPU'}</span>
                {opponent?.name ?? 'CPU'}
              </div>
              <div className="hud-health hud-health--right">
                <div className="hud-health__fill hud-health__fill--opponent" style={{ width: `${opponentHealthPct}%` }} />
                <div className="hud-health__shine" />
              </div>
              <div className="hud-rounds hud-rounds--right">
                {opponentRounds.map((filled, index) => (
                  <span key={index} className={`hud-round ${filled ? 'is-filled' : ''}`} />
                ))}
                {hud.opponentReserve && (
                  <span className="hud-reserve">
                    {hud.opponentReserve.name}
                    <span className="hud-reserve__dot" style={{ background: hud.opponentReserve.accent }} />
                  </span>
                )}
                {hud.extras.length > 0 && (
                  <div className="hud-extras">
                    {hud.extras.map((extra) => (
                      <div key={extra.index} className="hud-extra">
                        <span>{extra.name}</span>
                        <div className="hud-extra__track">
                          <div
                            className="hud-extra__fill"
                            style={{ width: `${Math.max(0, (extra.health / extra.maxHealth) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="hud-bottom">
            <div className="hud-meters">
              <div className="hud-meter hud-meter--super">
                <span>SUPER</span>
                <div className="hud-meter__track">
                  <div className="hud-meter__fill" style={{ width: `${player?.super ?? 0}%` }} />
                </div>
              </div>
              <div className="hud-meter hud-meter--hype">
                <span>HYPE</span>
                <div className="hud-meter__track">
                  <div className="hud-meter__fill" style={{ width: `${player?.hype ?? 0}%` }} />
                </div>
              </div>
            </div>
            <div className="hud-combo">
              {player && player.combo > 1 && (
                <>
                  <strong>{player.combo}</strong>
                  <span>HIT COMBO</span>
                </>
              )}
            </div>
            <div className="hud-opponent-meters">
              <div className="hud-meter hud-meter--super">
                <div className="hud-meter__track">
                  <div className="hud-meter__fill" style={{ width: `${opponent?.super ?? 0}%` }} />
                </div>
                <span>SUPER</span>
              </div>
              <div className="hud-meter hud-meter--hype">
                <div className="hud-meter__track">
                  <div className="hud-meter__fill" style={{ width: `${opponent?.hype ?? 0}%` }} />
                </div>
                <span>HYPE</span>
              </div>
            </div>
          </div>

          {announce && <div className="fight-announce">{announce}</div>}
          {settings.showHints && (
            <div className="fight-hints">
              <span>A/D muoviti</span>
              <span>J pugno</span>
              <span>K calcio</span>
              <span>L/P speciali</span>
              <span>I super</span>
              <span>Shift parata</span>
            </div>
          )}
        </div>
      )}

      {setup.mode === 'training' && !matchOver && (
        <div className="training-panel">
          <span className="training-panel__title">ALLENAMENTO</span>
          <div className="training-panel__row">
            {(['stand', 'block', 'counter', 'cpu'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className={`chip ${dummyMode === mode ? 'is-active' : ''}`}
                onClick={() => changeDummyMode(mode)}
              >
                {mode === 'stand' ? 'Fermo' : mode === 'block' ? 'Parata' : mode === 'counter' ? 'Contrattacco' : 'CPU'}
              </button>
            ))}
          </div>
          <div className="training-panel__row">
            <button type="button" className={`chip ${infiniteHealth ? 'is-active' : ''}`} onClick={toggleInfiniteHealth}>
              Vita infinita
            </button>
            <button type="button" className={`chip ${infiniteMeter ? 'is-active' : ''}`} onClick={toggleInfiniteMeter}>
              Meter infinito
            </button>
            <button type="button" className="chip" onClick={resetTraining}>
              Reset
            </button>
          </div>
        </div>
      )}

      {showTouch && !matchOver && (
        <TouchControls
          input={inputRef.current}
          onPause={togglePause}
        />
      )}

      {paused && !matchOver && (
        <div className="overlay pause-overlay">
          <div className="pause-card">
            <span className="eyebrow">PAUSA</span>
            <h2>IL MONDO ASPETTA</h2>
            <NeonButton onClick={togglePause}>RIPRENDI</NeonButton>
            {!onlineClient && (
              <NeonButton variant="ghost" onClick={restartMatch}>
                RICOMINCIA
              </NeonButton>
            )}
            <NeonButton variant="danger" onClick={onExit}>
              {onlineClient ? 'ESCI DAL MATCH' : 'ABBANDONA'}
            </NeonButton>
            <div className="pause-controls">
              <span>P1: A/D/W/S · J/K · L/P · I · Y · F · Shift · U · O</span>
              {onlineClient && <span>Online: il match continua sul server mentre sei in pausa.</span>}
            </div>
          </div>
        </div>
      )}

      {matchOver && (
        <div className="overlay match-over-overlay">
          <div className="match-over-card">
            <span className="eyebrow">{hud.matchWinner === 0 ? 'VITTORIA' : 'SCONFITTA'}</span>
            <h2>{hud.matchWinner === 0 ? 'LA FAMA È TUA' : 'IL CLIP È ANDATO MALE'}</h2>
            <div className="match-over-loader">
              <span />
            </div>
            <p>Calcolo del nuovo livello di virilità…</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TouchControls({ input, onPause }: { input: InputManager | null; onPause: () => void }) {
  const bind = (action: Parameters<InputManager['setVirtual']>[1]) => ({
    onPointerDown: (event: React.PointerEvent) => {
      event.preventDefault();
      input?.setVirtual(0, action, true);
    },
    onPointerUp: (event: React.PointerEvent) => {
      event.preventDefault();
      input?.setVirtual(0, action, false);
    },
    onPointerLeave: () => input?.setVirtual(0, action, false),
    onPointerCancel: () => input?.setVirtual(0, action, false),
    onContextMenu: (event: React.MouseEvent) => event.preventDefault()
  });
  return (
    <div className="touch-controls">
      <div className="touch-pad">
        <button type="button" className="touch-btn touch-btn--up" {...bind('up')}>
          ↑
        </button>
        <button type="button" className="touch-btn touch-btn--left" {...bind('left')}>
          ←
        </button>
        <button type="button" className="touch-btn touch-btn--down" {...bind('down')}>
          ↓
        </button>
        <button type="button" className="touch-btn touch-btn--right" {...bind('right')}>
          →
        </button>
      </div>
      <div className="touch-actions">
        <button type="button" className="touch-btn touch-btn--punch" {...bind('lightPunch')}>
          PUGNO
        </button>
        <button type="button" className="touch-btn touch-btn--kick" {...bind('lightKick')}>
          CALCIO
        </button>
        <button type="button" className="touch-btn touch-btn--special" {...bind('special1')}>
          SP1
        </button>
        <button type="button" className="touch-btn touch-btn--special2" {...bind('special2')}>
          SP2
        </button>
        <button type="button" className="touch-btn touch-btn--super" {...bind('super')}>
          SUPER
        </button>
        <button type="button" className="touch-btn touch-btn--hype" {...bind('hype')}>
          HYPE
        </button>
        <button type="button" className="touch-btn touch-btn--block" {...bind('block')}>
          BLOCCO
        </button>
        <button type="button" className="touch-btn touch-btn--grab" {...bind('grab')}>
          PRESA
        </button>
        <button type="button" className="touch-btn touch-btn--finish" {...bind('finisher')}>
          FINISH
        </button>
        <button type="button" className="touch-btn touch-btn--pause" onClick={onPause}>
          II
        </button>
      </div>
    </div>
  );
}

