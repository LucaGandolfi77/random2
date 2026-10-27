import { describe, expect, it } from 'vitest';
import { applyModifier, HeistSim, replayTracks, validateTracks } from '../src';
import type { GhostTrack, SimInput, VaultDef } from '../src';

const vault: VaultDef = {
  id: 'test-vault',
  name: 'Test Gallery',
  chapter: 1,
  loopSeconds: 30,
  maxEchoes: 3,
  parEchoes: 1,
  tilesX: 10,
  tilesY: 16,
  tileSize: 32,
  playerStart: { x: 56, y: 448 },
  exit: { x: 272, y: 80, radius: 24 },
  walls: [
    { x: 0, y: 0, w: 320, h: 32 },
    { x: 0, y: 480, w: 320, h: 32 },
    { x: 0, y: 0, w: 32, h: 512 },
    { x: 288, y: 0, w: 32, h: 512 },
    { x: 32, y: 160, w: 160, h: 32 },
  ],
  plates: [
    { id: 'plate-a', x: 80, y: 288, radius: 24, mode: 'hold', targets: ['door-a'] },
  ],
  doors: [{ id: 'door-a', x: 192, y: 160, w: 96, h: 32, mode: 'plate' }],
  guards: [],
  cameras: [],
  levers: [],
  lasers: [],
  gem: { x: 272, y: 80, radius: 12 },
  requiresGem: false,
  hints: [],
};

const idle: SimInput = { moveX: 0, moveY: 0, interact: false, dash: false };

const step = (sim: HeistSim, input: SimInput, ticks: number): void => {
  for (let i = 0; i < ticks; i += 1) sim.tick(input);
};

describe('HeistSim', () => {
  it('lets an echo hold the plate so the player can escape', () => {
    const sim = new HeistSim(vault);

    // Loop 1: walk to the plate and stay there long enough to give the echo a useful tape.
    step(sim, { ...idle, moveY: -1 }, 100);
    expect(sim.state.player.y).toBeCloseTo(288, 0);
    expect(sim.state.plates[0]?.pressed).toBe(true);
    expect(sim.state.doors[0]?.open).toBe(true);

    step(sim, idle, 1100);
    expect(sim.state.status).toBe('playing');

    const rewind = sim.rewind();
    expect(rewind.ok).toBe(true);
    expect(sim.state.echoesUsed).toBe(1);
    expect(sim.state.tracks).toHaveLength(1);
    expect(sim.state.timeMs).toBe(0);

    // Loop 2: the echo walks to the plate. The player crosses the room and exits.
    step(sim, { ...idle, moveX: 1 }, 115);
    expect(sim.state.player.x).toBeCloseTo(240, 0);

    step(sim, { ...idle, moveY: -1 }, 230);
    step(sim, { ...idle, moveX: 1 }, 25);

    expect(sim.state.status).toBe('won');
    expect(sim.state.echoesUsed).toBe(1);

    const submission = sim.getSubmission();
    expect(submission.tracks).toHaveLength(2);
    expect(validateTracks(vault, submission.tracks)).toEqual([]);

    const replay = replayTracks(vault, submission.tracks);
    expect(replay.won).toBe(true);
    expect(replay.timeMs).toBeGreaterThan(0);
  });

  it('resets the world on rewind but keeps the echoes', () => {
    const sim = new HeistSim(vault);
    step(sim, { ...idle, moveY: -1 }, 100);
    sim.rewind();

    expect(sim.state.player.x).toBe(vault.playerStart.x);
    expect(sim.state.player.y).toBe(vault.playerStart.y);
    expect(sim.state.plates[0]?.pressed).toBe(false);
    expect(sim.state.doors[0]?.open).toBe(false);
    expect(sim.state.tracks).toHaveLength(1);
  });

  it('can undo the most recent echo', () => {
    const sim = new HeistSim(vault);
    step(sim, { ...idle, moveY: -1 }, 100);
    sim.rewind();
    expect(sim.state.tracks).toHaveLength(1);

    expect(sim.undoEcho()).toBe(true);
    expect(sim.state.tracks).toHaveLength(0);
    expect(sim.state.player.x).toBe(vault.playerStart.x);
  });

  it('rejects tracks that teleport through a wall', () => {
    const bad: GhostTrack = {
      id: 'bad',
      symbol: 'circle',
      color: 0x5bc0eb,
      durationMs: 100,
      frames: [
        { t: 0, x: 56, y: 448, dir: 2, anim: 'idle' },
        { t: 100, x: 280, y: 80, dir: 2, anim: 'walk' },
      ],
    };

    const issues = validateTracks(vault, [bad]);
    expect(issues.some((issue) => issue.code === 'too-fast')).toBe(true);
  });
});

const guardVault: VaultDef = {
  ...vault,
  id: 'guard-vault',
  name: 'Guard Test',
  plates: [],
  doors: [],
  walls: [
    { x: 0, y: 0, w: 320, h: 32 },
    { x: 0, y: 480, w: 320, h: 32 },
    { x: 0, y: 0, w: 32, h: 512 },
    { x: 288, y: 0, w: 32, h: 512 },
  ],
  requiresGem: false,
  guards: [
    {
      id: 'guard-a',
      path: [{ x: 160, y: 160 }],
      waitMs: 0,
      speed: 60,
      visionRange: 220,
      visionAngleDeg: 120,
      hearingRadius: 160,
    },
  ],
  playerStart: { x: 160, y: 300 },
  exit: { x: 160, y: 80, radius: 24 },
};

describe('Guards', () => {
  it('fills suspicion and triggers an alarm when the player is seen', () => {
    const sim = new HeistSim(guardVault);
    step(sim, idle, 100);
    expect(sim.state.status).toBe('alarm');
    expect(sim.state.guards[0]?.suspicion).toBeGreaterThanOrEqual(1);
  });

  it('follows an echo instead of the player', () => {
    const sim = new HeistSim(guardVault);

    // Record a short run standing in the guard's cone.
    step(sim, idle, 30);
    expect(sim.state.status).toBe('playing');
    expect(sim.rewind().ok).toBe(true);

    // The guard now sees the echo and follows it; the player is ignored while distracted.
    step(sim, idle, 12);
    expect(sim.state.guards[0]?.mode).toBe('follow');
    expect(sim.state.status).toBe('playing');
  });

  it('investigates a whistle', () => {
    const sim = new HeistSim(guardVault);
    sim.tick({ ...idle, interact: true });
    expect(sim.state.noises.length).toBeGreaterThan(0);
    expect(sim.state.guards[0]?.mode).toBe('investigate');
  });
});

const cameraVault: VaultDef = {
  ...vault,
  id: 'camera-vault',
  name: 'Camera Test',
  plates: [],
  doors: [],
  guards: [],
  walls: [
    { x: 0, y: 0, w: 320, h: 32 },
    { x: 0, y: 480, w: 320, h: 32 },
    { x: 0, y: 0, w: 32, h: 512 },
    { x: 288, y: 0, w: 32, h: 512 },
  ],
  cameras: [
    {
      id: 'camera-a',
      x: 160,
      y: 128,
      facing: 2,
      fovDeg: 120,
      range: 320,
      sweepDeg: 0,
      sweepMs: 0,
      phaseMs: 0,
    },
  ],
  levers: [],
  playerStart: { x: 160, y: 300 },
  exit: { x: 160, y: 80, radius: 24 },
};

describe('Cameras and levers', () => {
  it('raises an alarm when the camera sees the player', () => {
    const sim = new HeistSim(cameraVault);
    step(sim, idle, 100);
    expect(sim.state.status).toBe('alarm');
    expect(sim.state.cameras[0]?.suspicion).toBeGreaterThanOrEqual(1);
  });

  it('disables a camera while a hold lever is pressed', () => {
    const sim = new HeistSim({
      ...cameraVault,
      levers: [
        {
          id: 'lever-a',
          x: 160,
          y: 300,
          radius: 28,
          mode: 'hold',
          targetIds: ['camera-a'],
        },
      ],
    });

    step(sim, idle, 100);
    expect(sim.state.levers[0]?.pressed).toBe(true);
    expect(sim.state.cameras[0]?.disabled).toBe(true);
    expect(sim.state.status).toBe('playing');
  });
});

describe('Dash and lasers', () => {
  it('dashes farther than walking in the same number of ticks', () => {
    const walk = new HeistSim(vault);
    const dash = new HeistSim(vault);
    step(walk, { ...idle, moveY: -1 }, 10);
    step(dash, { ...idle, moveY: -1, dash: true }, 1);
    step(dash, { ...idle, moveY: -1 }, 9);

    expect(vault.playerStart.y - dash.state.player.y).toBeGreaterThan(
      vault.playerStart.y - walk.state.player.y,
    );
  });

  it('triggers an alarm when the player touches an active laser', () => {
    const sim = new HeistSim({
      ...vault,
      playerStart: { x: 160, y: 300 },
      lasers: [
        {
          id: 'laser-test',
          x1: 32,
          y1: 300,
          x2: 288,
          y2: 300,
          onMs: 1000,
          offMs: 0,
          phaseMs: 0,
        },
      ],
    });

    sim.tick(idle);
    expect(sim.state.status).toBe('alarm');
  });
});

describe('Gem carrying', () => {
  const gemVault: VaultDef = {
    ...vault,
    id: 'gem-vault',
    plates: [],
    doors: [],
    guards: [],
    cameras: [],
    levers: [],
    lasers: [],
    walls: [
      { x: 0, y: 0, w: 320, h: 32 },
      { x: 0, y: 480, w: 320, h: 32 },
      { x: 0, y: 0, w: 32, h: 512 },
      { x: 288, y: 0, w: 32, h: 512 },
    ],
    playerStart: { x: 160, y: 300 },
    exit: { x: 160, y: 80, radius: 24 },
    gem: { x: 160, y: 300, radius: 16 },
    requiresGem: true,
  };

  it('does not win at the exit without the gem', () => {
    const sim = new HeistSim(gemVault);
    step(sim, { ...idle, moveY: -1 }, 140);
    expect(sim.state.status).toBe('playing');
  });

  it('grabs the gem and wins at the exit', () => {
    const sim = new HeistSim(gemVault);
    sim.tick({ ...idle, interact: true });
    expect(sim.state.player.carryingGem).toBe(true);
    expect(sim.state.gem?.holder).toBe('player');

    step(sim, { ...idle, moveY: -1 }, 140);
    expect(sim.state.status).toBe('won');
  });
});

describe('Modifiers', () => {
  it('disables the dash when the vault forbids it', () => {
    const noDash = applyModifier(vault, 'no-dash');
    const walk = new HeistSim(noDash);
    const dash = new HeistSim(noDash);
    step(walk, { ...idle, moveY: -1 }, 10);
    step(dash, { ...idle, moveY: -1, dash: true }, 10);
    expect(dash.state.player.y).toBeCloseTo(walk.state.player.y, 5);
  });

  it('shortens the loop and caps echoes', () => {
    const short = applyModifier(vault, 'short-loop');
    expect(short.loopSeconds).toBe(Math.max(15, vault.loopSeconds - 10));
    const solo = applyModifier(vault, 'one-echo');
    expect(solo.maxEchoes).toBeLessThanOrEqual(1);
    expect(solo.parEchoes).toBeLessThanOrEqual(1);
  });

  it('does not mutate the source vault', () => {
    const source = { ...vault, dashEnabled: true };
    const modified = applyModifier(source, 'no-dash');
    expect(source.dashEnabled).toBe(true);
    expect(modified.dashEnabled).toBe(false);
  });
});

describe('Replay guard validation', () => {
  it('rejects a run where a guard sees the player', () => {
    const track: GhostTrack = {
      id: 'player',
      symbol: 'circle',
      color: 0x5bc0eb,
      durationMs: 2000,
      frames: [
        { t: 0, x: 160, y: 300, dir: 0, anim: 'idle' },
        { t: 2000, x: 160, y: 300, dir: 0, anim: 'idle' },
      ],
    };

    const result = replayTracks(guardVault, [track]);
    expect(result.won).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'seen-by-guard')).toBe(true);
  });
});

describe('Echo preview', () => {
  it('replays the crew without recording or moving the player', () => {
    const sim = new HeistSim(vault);
    step(sim, { ...idle, moveX: 1 }, 30);
    expect(sim.rewind().ok).toBe(true);

    const playerX = sim.state.player.x;
    const currentFrames = sim.state.currentTrack.length;
    expect(sim.startPreview()).toBe(true);
    expect(sim.isPreviewing()).toBe(true);

    step(sim, { ...idle, moveX: -1, dash: true }, 30);
    expect(sim.state.player.x).toBe(playerX);
    expect(sim.state.tracks).toHaveLength(1);
    expect(sim.state.currentTrack).toHaveLength(currentFrames);
    expect(sim.state.timeMs).toBeGreaterThan(0);

    expect(sim.stopPreview()).toBe(true);
    expect(sim.isPreviewing()).toBe(false);
    expect(sim.state.timeMs).toBe(0);
    expect(sim.state.currentTrack).toHaveLength(currentFrames);
  });

  it('refuses to preview with no echoes', () => {
    const sim = new HeistSim(vault);
    expect(sim.startPreview()).toBe(false);
  });
});

describe('Lever doors and blackout levers', () => {
  const leverVault: VaultDef = {
    ...vault,
    id: 'lever-vault',
    plates: [],
    doors: [{ id: 'door-a', x: 192, y: 128, w: 32, h: 96, mode: 'lever' }],
    guards: [],
    cameras: [],
    levers: [
      { id: 'lever-a', x: 56, y: 448, radius: 22, mode: 'hold', targetIds: ['door-a'] },
    ],
    lasers: [],
    requiresGem: false,
  };

  it('opens a lever door while the lever is held, and closes it after', () => {
    const sim = new HeistSim(leverVault);
    sim.tick(idle);
    expect(sim.state.levers[0]?.pressed).toBe(true);
    expect(sim.state.doors[0]?.open).toBe(true);

    step(sim, { ...idle, moveX: 1 }, 80);
    expect(sim.state.levers[0]?.pressed).toBe(false);
    expect(sim.state.doors[0]?.open).toBe(false);
  });

  const blackoutVault = (targets: string[]): VaultDef => ({
    ...vault,
    id: 'blackout-vault',
    walls: [
      { x: 0, y: 0, w: 320, h: 32 },
      { x: 0, y: 480, w: 320, h: 32 },
      { x: 0, y: 0, w: 32, h: 512 },
      { x: 288, y: 0, w: 32, h: 512 },
    ],
    plates: [],
    doors: [],
    guards: [
      {
        id: 'guard-a',
        path: [{ x: 160, y: 160 }],
        facing: 2,
        waitMs: 0,
        speed: 1,
        visionRange: 300,
        visionAngleDeg: 120,
        hearingRadius: 0,
      },
    ],
    cameras: [],
    levers: [
      { id: 'lever-blackout', x: 160, y: 448, radius: 26, mode: 'hold', targetIds: targets },
    ],
    lasers: [],
    playerStart: { x: 160, y: 448 },
    requiresGem: false,
  });

  it('shrinks a guard cone while a blackout lever is held', () => {
    const sim = new HeistSim(blackoutVault(['guard-a']));
    step(sim, idle, 100);
    expect(sim.state.status).toBe('playing');
    expect(sim.state.guards[0]?.visionRange).toBeCloseTo(105, 5);
  });

  it('still catches the player without the blackout target', () => {
    const sim = new HeistSim(blackoutVault([]));
    step(sim, idle, 100);
    expect(sim.state.status).toBe('alarm');
  });
});
