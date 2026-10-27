import { distance, directionFrom, directionToVector, normalize } from './math';
import { distanceToSegment, moveCircle, segmentIntersectsRect } from './collision';
import type {
  CameraState,
  Direction,
  DoorState,
  EchoColor,
  EchoSymbol,
  GhostEvent,
  GhostFrame,
  GemState,
  GhostState,
  GhostTrack,
  GuardState,
  LaserState,
  LeverState,
  NoiseEvent,
  PlateState,
  RunSubmission,
  SimInput,
  SimState,
  VaultDef,
} from './types';
import { RECORD_HZ, SIM_DT } from './types';

const PLAYER_RADIUS = 10;
const PLAYER_SPEED = 96;
const DASH_MULTIPLIER = 2.4;

const ECHO_SYMBOLS: EchoSymbol[] = ['circle', 'triangle', 'square', 'diamond', 'star', 'cross'];
const ECHO_COLORS: EchoColor[] = [0x5bc0eb, 0xf6c85f, 0xe63946, 0x8ac926, 0xc77dff, 0xff8c42];

const EMPTY_INPUT: SimInput = { moveX: 0, moveY: 0, interact: false, dash: false };

export class HeistSim {
  readonly vault: VaultDef;
  state: SimState;

  private input: SimInput = { ...EMPTY_INPUT };
  private dashCooldownMs = 0;
  private wasInteractDown = false;
  private wasDashDown = false;
  private dashRemainingMs = 0;
  private noiseCooldownMs = 0;
  private pendingEvents: GhostEvent[] = [];

  constructor(vault: VaultDef) {
    this.vault = vault;
    this.state = this.buildState([]);
  }

  setInput(input: SimInput): void {
    this.input = {
      moveX: Number.isFinite(input.moveX) ? input.moveX : 0,
      moveY: Number.isFinite(input.moveY) ? input.moveY : 0,
      interact: Boolean(input.interact),
      dash: Boolean(input.dash),
    };
  }

  tick(input?: SimInput): SimState {
    if (input) this.setInput(input);
    if (this.state.status !== 'playing') return this.state;

    const nowMs = this.state.tick * (1000 / 60);
    this.state.timeMs = nowMs;
    this.dashCooldownMs = Math.max(0, this.dashCooldownMs - SIM_DT * 1000);
    this.dashRemainingMs = Math.max(0, this.dashRemainingMs - SIM_DT * 1000);
    this.noiseCooldownMs = Math.max(0, this.noiseCooldownMs - SIM_DT * 1000);

    const interactPressed = this.input.interact && !this.wasInteractDown;
    this.wasInteractDown = this.input.interact;
    const dashPressed = this.input.dash && !this.wasDashDown;
    this.wasDashDown = this.input.dash;
    if (
      dashPressed &&
      this.vault.dashEnabled !== false &&
      this.dashCooldownMs <= 0 &&
      (this.input.moveX !== 0 || this.input.moveY !== 0)
    ) {
      this.dashRemainingMs = 300;
      this.dashCooldownMs = 750;
      this.spawnNoise(this.state.player.x, this.state.player.y, 120);
      this.pendingEvents.push({ type: 'noise', radius: 120 });
    }

    this.movePlayer(interactPressed, nowMs, this.dashRemainingMs > 0);
    this.updateGhosts(nowMs);
    this.updateGemPosition();
    this.updatePlatesAndDoors();
    this.updateLevers(nowMs);
    this.updateLasers(nowMs);
    this.checkWin();
    this.updateGuards(nowMs);
    this.updateCameras(nowMs);
    this.checkTimer(nowMs);
    this.record(nowMs);

    this.state.tick += 1;
    return this.state;
  }

  rewind(): { ok: true; echoesUsed: number } | { ok: false; reason: 'won' | 'max-echoes' } {
    if (this.state.status === 'won') return { ok: false, reason: 'won' };
    if (this.state.tracks.length >= this.vault.maxEchoes) {
      return { ok: false, reason: 'max-echoes' };
    }

    const track = this.makeTrack(this.state.currentTrack, this.state.tracks.length);
    const tracks = [...this.state.tracks, track];
    const echoesUsed = tracks.length;

    this.state = this.buildState(tracks);
    this.state.echoesUsed = echoesUsed;
    return { ok: true, echoesUsed };
  }

  undoEcho(): boolean {
    if (this.state.tracks.length === 0) return false;
    const tracks = this.state.tracks.slice(0, -1);
    this.state = this.buildState(tracks);
    this.state.echoesUsed = tracks.length;
    return true;
  }

  reset(): void {
    this.state = this.buildState([], true);
  }

  getSubmission(): RunSubmission {
    const player = this.state.player;
    const frames = [...this.state.currentTrack];
    const last = frames[frames.length - 1];
    if (
      !last ||
      last.t < this.state.timeMs ||
      last.x !== player.x ||
      last.y !== player.y
    ) {
      frames.push({
        t: this.state.timeMs,
        x: player.x,
        y: player.y,
        dir: player.facing,
        anim: 'idle',
      });
    }
    const finalTrack = this.makeTrack(frames, this.state.tracks.length);
    const tracks = this.state.status === 'won' ? [...this.state.tracks, finalTrack] : [...this.state.tracks];
    return {
      vaultId: this.vault.id,
      echoes: this.state.tracks.length,
      timeMs: this.state.timeMs,
      tracks,
    };
  }

  getSolidWalls(): Array<{ x: number; y: number; w: number; h: number }> {
    const doorWalls = this.state.doors
      .filter((door) => !door.open)
      .map((door) => ({ x: door.x, y: door.y, w: door.w, h: door.h }));
    return [...this.vault.walls, ...doorWalls];
  }

  private getPlayerWalls(moveX: number, moveY: number): Array<{ x: number; y: number; w: number; h: number }> {
    const doorWalls = this.state.doors
      .filter((door) => {
        if (door.mode !== 'oneway') return !door.open;
        const direction = door.passDirection ?? 2;
        const allowed =
          (direction === 0 && moveY < 0) ||
          (direction === 1 && moveX > 0) ||
          (direction === 2 && moveY > 0) ||
          (direction === 3 && moveX < 0);
        return !allowed;
      })
      .map((door) => ({ x: door.x, y: door.y, w: door.w, h: door.h }));
    return [...this.vault.walls, ...doorWalls];
  }

  private buildState(tracks: GhostTrack[], fresh = false): SimState {
    const plates: PlateState[] = this.vault.plates.map((plate) => ({
      id: plate.id,
      x: plate.x,
      y: plate.y,
      radius: plate.radius,
      mode: plate.mode,
      targets: [...plate.targets],
      pressed: false,
      latched: false,
    }));

    const doors: DoorState[] = this.vault.doors.map((door) => ({
      id: door.id,
      x: door.x,
      y: door.y,
      w: door.w,
      h: door.h,
      mode: door.mode,
      passDirection: door.passDirection,
      open: false,
    }));

    const initialFrame: GhostFrame = {
      t: 0,
      x: this.vault.playerStart.x,
      y: this.vault.playerStart.y,
      dir: 2,
      anim: 'idle',
    };

    const state: SimState = {
      status: 'playing',
      tick: 0,
      timeMs: 0,
      loopMs: this.vault.loopSeconds * 1000,
      echoesUsed: fresh ? 0 : tracks.length,
      maxEchoes: this.vault.maxEchoes,
      player: {
        x: this.vault.playerStart.x,
        y: this.vault.playerStart.y,
        radius: PLAYER_RADIUS,
        speed: PLAYER_SPEED,
        facing: 2,
        carryingGem: false,
      },
      ghosts: tracks.map((track) => this.makeGhost(track)),
      plates,
      doors,
      guards: this.vault.guards.map((guard) => this.makeGuard(guard)),
      cameras: this.vault.cameras.map((camera) => this.makeCamera(camera)),
      levers: this.vault.levers.map((lever) => this.makeLever(lever)),
      lasers: this.vault.lasers.map((laser) => this.makeLaser(laser)),
      gem: this.vault.gem
        ? { x: this.vault.gem.x, y: this.vault.gem.y, radius: this.vault.gem.radius, holder: 'world' }
        : null,
      noises: [],
      tracks: [...tracks],
      currentTrack: [initialFrame],
    };

    this.dashCooldownMs = 0;
    this.dashRemainingMs = 0;
    this.wasDashDown = false;
    this.wasInteractDown = false;
    this.noiseCooldownMs = 0;
    this.pendingEvents = [];
    return state;
  }

  private makeGuard(guard: VaultDef['guards'][number]): GuardState {
    const start = guard.path[0] ?? { x: 0, y: 0 };
    return {
      id: guard.id,
      x: start.x,
      y: start.y,
      facing: guard.facing ?? 2,
      mode: 'patrol',
      path: guard.path.map((point) => ({ ...point })),
      waypointIndex: guard.path.length > 1 ? 1 : 0,
      waitRemainingMs: 0,
      waitMs: guard.waitMs,
      speed: guard.speed,
      visionRange: guard.visionRange,
      visionAngleDeg: guard.visionAngleDeg,
      hearingRadius: guard.hearingRadius,
      suspicion: 0,
      targetGhostId: null,
      investigateX: start.x,
      investigateY: start.y,
      confusedMs: 0,
    };
  }

  private makeCamera(camera: VaultDef['cameras'][number]): CameraState {
    const forward = directionToVector(camera.facing);
    const baseAngle = Math.atan2(forward.y, forward.x);
    return {
      id: camera.id,
      x: camera.x,
      y: camera.y,
      baseAngle,
      angle: baseAngle,
      fovDeg: camera.fovDeg,
      range: camera.range,
      sweepDeg: camera.sweepDeg,
      sweepMs: camera.sweepMs,
      phaseMs: camera.phaseMs,
      suspicion: 0,
      disabled: false,
    };
  }

  private makeLever(lever: VaultDef['levers'][number]): LeverState {
    return {
      id: lever.id,
      x: lever.x,
      y: lever.y,
      radius: lever.radius,
      mode: lever.mode,
      targetIds: [...lever.targetIds],
      disableMs: lever.disableMs ?? 5000,
      activeUntilMs: 0,
      pressed: false,
    };
  }

  private makeLaser(laser: VaultDef['lasers'][number]): LaserState {
    return {
      id: laser.id,
      x1: laser.x1,
      y1: laser.y1,
      x2: laser.x2,
      y2: laser.y2,
      onMs: laser.onMs,
      offMs: laser.offMs,
      phaseMs: laser.phaseMs,
      active: false,
    };
  }

  private makeGhost(track: GhostTrack): GhostState {
    const first = track.frames[0];
    return {
      id: track.id,
      symbol: track.symbol,
      color: track.color,
      x: first?.x ?? this.vault.playerStart.x,
      y: first?.y ?? this.vault.playerStart.y,
      facing: first?.dir ?? 2,
      active: track.frames.length > 0,
      frameIndex: -1,
      track,
    };
  }

  private makeTrack(frames: GhostFrame[], index: number): GhostTrack {
    const safeFrames = frames.length > 0 ? [...frames] : [
      {
        t: 0,
        x: this.vault.playerStart.x,
        y: this.vault.playerStart.y,
        dir: 2 as Direction,
        anim: 'idle' as const,
      },
    ];
    const safeIndex = index % ECHO_SYMBOLS.length;
    return {
      id: `echo-${index + 1}`,
      symbol: ECHO_SYMBOLS[safeIndex] ?? 'circle',
      color: ECHO_COLORS[safeIndex] ?? 0x5bc0eb,
      frames: safeFrames,
      durationMs: safeFrames[safeFrames.length - 1]?.t ?? 0,
    };
  }

  private movePlayer(interactPressed: boolean, nowMs: number, dashing: boolean): void {
    const player = this.state.player;

    if (interactPressed && this.noiseCooldownMs <= 0) {
      const lever = this.state.levers.find(
        (candidate) =>
          candidate.mode === 'toggle' &&
          distance(player, candidate) <= candidate.radius + player.radius,
      );
      if (lever) {
        lever.activeUntilMs = nowMs + lever.disableMs;
        this.pendingEvents.push({ type: 'interact', targetId: lever.id });
      } else if (this.state.gem) {
        const gem = this.state.gem;
        if (gem.holder === 'world' && distance(player, gem) <= gem.radius + player.radius) {
          gem.holder = 'player';
          player.carryingGem = true;
          this.pendingEvents.push({ type: 'grab', targetId: 'gem' });
        } else if (gem.holder === 'player') {
          gem.holder = 'world';
          gem.x = player.x;
          gem.y = player.y;
          player.carryingGem = false;
          this.pendingEvents.push({ type: 'drop', targetId: 'gem' });
        } else {
          this.spawnNoise(player.x, player.y, 140);
          this.pendingEvents.push({ type: 'noise', radius: 140 });
        }
      } else {
        this.spawnNoise(player.x, player.y, 140);
        this.pendingEvents.push({ type: 'noise', radius: 140 });
      }
      this.noiseCooldownMs = 450;
    }

    const rawX = this.input.moveX;
    const rawY = this.input.moveY;
    const dir = normalize(rawX, rawY);
    const speed = player.speed * (dashing ? DASH_MULTIPLIER : 1);
    const dx = dir.x * speed * SIM_DT;
    const dy = dir.y * speed * SIM_DT;

    player.facing = directionFrom(rawX, rawY, player.facing);

    if (dx === 0 && dy === 0) return;

    const walls = this.getPlayerWalls(rawX, rawY);
    const next = moveCircle(player.x, player.y, player.radius, dx, dy, walls);
    player.x = next.x;
    player.y = next.y;
  }

  private spawnNoise(x: number, y: number, radius: number): void {
    const noise: NoiseEvent = {
      x,
      y,
      radius,
      createdAt: this.state.timeMs,
      ttlMs: 900,
    };
    this.state.noises.push(noise);
  }

  private updateGhosts(nowMs: number): void {
    for (const ghost of this.state.ghosts) {
      const frames = ghost.track.frames;
      if (frames.length === 0) {
        ghost.active = false;
        continue;
      }

      if (nowMs > ghost.track.durationMs) {
        const last = frames[frames.length - 1];
        if (last) {
          ghost.x = last.x;
          ghost.y = last.y;
          ghost.facing = last.dir;
        }
        ghost.active = false;
        if (this.state.gem?.holder === ghost.id) {
          this.state.gem.holder = 'world';
          this.state.gem.x = ghost.x;
          this.state.gem.y = ghost.y;
        }
        continue;
      }

      let index = ghost.frameIndex;
      const previousIndex = index;
      while (index < frames.length - 1 && (frames[index + 1]?.t ?? Infinity) <= nowMs) {
        index += 1;
      }
      ghost.frameIndex = index;

      for (let i = previousIndex + 1; i <= index; i += 1) {
        const frame = frames[i];
        if (!frame?.events) continue;
        for (const event of frame.events) {
          if (event.type === 'noise') {
            this.spawnNoise(frame.x, frame.y, event.radius ?? 120);
          } else if (event.type === 'interact' && event.targetId) {
            const lever = this.state.levers.find(
              (candidate) => candidate.id === event.targetId && candidate.mode === 'toggle',
            );
            if (lever) lever.activeUntilMs = nowMs + lever.disableMs;
          } else if (event.type === 'grab' && event.targetId === 'gem') {
            if (this.state.gem && this.state.gem.holder === 'world') {
              this.state.gem.holder = ghost.id;
            }
          } else if (event.type === 'drop' && event.targetId === 'gem') {
            if (this.state.gem && this.state.gem.holder === ghost.id) {
              this.state.gem.holder = 'world';
              this.state.gem.x = ghost.x;
              this.state.gem.y = ghost.y;
            }
          }
        }
      }

      const a = frames[index];
      const b = frames[Math.min(index + 1, frames.length - 1)];
      if (!a) continue;

      const span = b && b.t > a.t ? b.t - a.t : 0;
      const alpha = span > 0 && b ? Math.max(0, Math.min(1, (nowMs - a.t) / span)) : 0;
      ghost.x = b ? a.x + (b.x - a.x) * alpha : a.x;
      ghost.y = b ? a.y + (b.y - a.y) * alpha : a.y;
      ghost.facing = a.dir;
      ghost.active = true;
    }
  }

  private updateGemPosition(): void {
    const gem = this.state.gem;
    if (!gem) return;
    if (gem.holder === 'player') {
      gem.x = this.state.player.x;
      gem.y = this.state.player.y;
      return;
    }
    if (gem.holder !== 'world') {
      const ghost = this.state.ghosts.find((candidate) => candidate.id === gem.holder && candidate.active);
      if (ghost) {
        gem.x = ghost.x;
        gem.y = ghost.y;
      } else {
        gem.holder = 'world';
      }
    }
  }

  private updatePlatesAndDoors(): void {
    const player = this.state.player;

    for (const plate of this.state.plates) {
      const playerOnPlate = distance(player, plate) <= plate.radius + player.radius * 0.5;
      const ghostOnPlate = this.state.ghosts.some(
        (ghost) => ghost.active && distance(ghost, plate) <= plate.radius + 8,
      );
      const contact = playerOnPlate || ghostOnPlate;

      if (plate.mode === 'latch') {
        if (contact) plate.latched = true;
        plate.pressed = plate.latched;
      } else {
        plate.pressed = contact;
      }
    }

    for (const door of this.state.doors) {
      const targeting = this.state.plates.filter((plate) => plate.targets.includes(door.id));
      door.open = targeting.length > 0 && targeting.every((plate) => plate.pressed);
    }
  }

  private updateGuards(nowMs: number): void {
    if (this.state.status !== 'playing') return;

    this.state.noises = this.state.noises.filter(
      (noise) => nowMs - noise.createdAt <= noise.ttlMs,
    );

    const walls = this.getSolidWalls();
    const dtMs = SIM_DT * 1000;

    for (const guard of this.state.guards) {
      if (this.state.status !== 'playing') return;

      if (guard.mode === 'confused') {
        guard.confusedMs -= dtMs;
        guard.suspicion = Math.max(0, guard.suspicion - dtMs / 1000);
        if (guard.confusedMs <= 0) {
          guard.mode = 'patrol';
          guard.targetGhostId = null;
          guard.waitRemainingMs = 300;
        }
        continue;
      }

      if (guard.mode === 'follow') {
        const target = this.state.ghosts.find(
          (ghost) => ghost.id === guard.targetGhostId && ghost.active,
        );
        if (!target) {
          guard.mode = 'patrol';
          guard.targetGhostId = null;
          guard.waitRemainingMs = 300;
        } else {
          const reached = this.moveGuard(guard, target.x, target.y, guard.speed * 1.08, dtMs, walls);
          if (reached) {
            guard.mode = 'confused';
            guard.confusedMs = 900;
            guard.targetGhostId = null;
          }
          continue;
        }
      }

      const seenGhost = this.state.ghosts
        .filter((ghost) => ghost.active && this.canSee(guard, ghost, walls))
        .sort((a, b) => distance(guard, a) - distance(guard, b))[0];

      if (seenGhost) {
        guard.mode = 'follow';
        guard.targetGhostId = seenGhost.id;
        guard.suspicion = Math.max(0, guard.suspicion - dtMs / 1000);
        continue;
      }

      const nearestNoise = this.state.noises
        .filter((noise) => distance(guard, noise) <= guard.hearingRadius)
        .sort((a, b) => distance(guard, a) - distance(guard, b))[0];

      if (nearestNoise) {
        guard.mode = 'investigate';
        guard.investigateX = nearestNoise.x;
        guard.investigateY = nearestNoise.y;
      }

      if (guard.mode === 'investigate') {
        const reached = this.moveGuard(
          guard,
          guard.investigateX,
          guard.investigateY,
          guard.speed,
          dtMs,
          walls,
        );
        if (reached) {
          guard.mode = 'patrol';
          guard.waitRemainingMs = 350;
        }
      } else if (guard.mode === 'patrol') {
        if (guard.waitRemainingMs > 0) {
          guard.waitRemainingMs -= dtMs;
        } else if (guard.path.length > 0) {
          const target = guard.path[guard.waypointIndex % guard.path.length];
          if (target) {
            const reached = this.moveGuard(guard, target.x, target.y, guard.speed, dtMs, walls);
            if (reached) {
              guard.waypointIndex = (guard.waypointIndex + 1) % guard.path.length;
              guard.waitRemainingMs = guard.waitMs;
            }
          }
        }
      }

      if (this.canSee(guard, this.state.player, walls)) {
        guard.suspicion = Math.min(1, guard.suspicion + dtMs / 1200);
        if (guard.suspicion >= 1) {
          this.state.status = 'alarm';
          return;
        }
      } else {
        guard.suspicion = Math.max(0, guard.suspicion - dtMs / 900);
      }
    }
  }

  private moveGuard(
    guard: GuardState,
    targetX: number,
    targetY: number,
    speed: number,
    dtMs: number,
    walls: Array<{ x: number; y: number; w: number; h: number }>,
  ): boolean {
    const dx = targetX - guard.x;
    const dy = targetY - guard.y;
    const remaining = Math.hypot(dx, dy);
    if (remaining <= 3) return true;

    const step = Math.min(remaining, (speed * dtMs) / 1000);
    const dirX = dx / remaining;
    const dirY = dy / remaining;
    const next = moveCircle(guard.x, guard.y, 9, dirX * step, dirY * step, walls);
    guard.x = next.x;
    guard.y = next.y;
    guard.facing = directionFrom(dirX, dirY, guard.facing);
    return Math.hypot(targetX - guard.x, targetY - guard.y) <= 3;
  }

  private canSee(
    guard: GuardState,
    target: { x: number; y: number },
    walls: Array<{ x: number; y: number; w: number; h: number }>,
  ): boolean {
    const dx = target.x - guard.x;
    const dy = target.y - guard.y;
    const range = Math.hypot(dx, dy);
    if (range > guard.visionRange || range < 0.001) return false;

    const forward = directionToVector(guard.facing);
    const targetAngle = Math.atan2(dy, dx);
    const forwardAngle = Math.atan2(forward.y, forward.x);
    const delta = Math.abs(Math.atan2(Math.sin(targetAngle - forwardAngle), Math.cos(targetAngle - forwardAngle)));
    if (delta > (guard.visionAngleDeg * Math.PI) / 360) return false;

    return !walls.some((wall) =>
      segmentIntersectsRect(guard.x, guard.y, target.x, target.y, wall),
    );
  }

  private updateLevers(nowMs: number): void {
    const player = this.state.player;
    for (const lever of this.state.levers) {
      if (lever.mode === 'hold') {
        const playerOnLever = distance(player, lever) <= lever.radius + player.radius * 0.5;
        const ghostOnLever = this.state.ghosts.some(
          (ghost) => ghost.active && distance(ghost, lever) <= lever.radius + 8,
        );
        lever.pressed = playerOnLever || ghostOnLever;
      } else {
        lever.pressed = lever.activeUntilMs > nowMs;
      }
    }
  }

  private updateCameras(nowMs: number): void {
    if (this.state.status !== 'playing') return;
    const walls = this.getSolidWalls();
    const dtMs = SIM_DT * 1000;

    for (const camera of this.state.cameras) {
      if (camera.sweepMs > 0) {
        const sweep = Math.sin(((nowMs + camera.phaseMs) / camera.sweepMs) * Math.PI * 2);
        camera.angle = camera.baseAngle + sweep * ((camera.sweepDeg * Math.PI) / 360);
      } else {
        camera.angle = camera.baseAngle;
      }

      camera.disabled = this.state.levers.some(
        (lever) => lever.pressed && lever.targetIds.includes(camera.id),
      );

      if (camera.disabled) {
        camera.suspicion = Math.max(0, camera.suspicion - dtMs / 700);
        continue;
      }

      if (this.cameraCanSee(camera, this.state.player, walls)) {
        camera.suspicion = Math.min(1, camera.suspicion + dtMs / 1200);
        if (camera.suspicion >= 1) {
          this.state.status = 'alarm';
          return;
        }
      } else {
        camera.suspicion = Math.max(0, camera.suspicion - dtMs / 900);
      }
    }
  }

  private cameraCanSee(
    camera: CameraState,
    target: { x: number; y: number },
    walls: Array<{ x: number; y: number; w: number; h: number }>,
  ): boolean {
    const dx = target.x - camera.x;
    const dy = target.y - camera.y;
    const range = Math.hypot(dx, dy);
    if (range > camera.range || range < 0.001) return false;

    const targetAngle = Math.atan2(dy, dx);
    const delta = Math.abs(
      Math.atan2(
        Math.sin(targetAngle - camera.angle),
        Math.cos(targetAngle - camera.angle),
      ),
    );
    if (delta > (camera.fovDeg * Math.PI) / 360) return false;

    return !walls.some((wall) =>
      segmentIntersectsRect(camera.x, camera.y, target.x, target.y, wall),
    );
  }

  private updateLasers(nowMs: number): void {
    if (this.state.status !== 'playing') return;

    for (const laser of this.state.lasers) {
      const disabled = this.state.levers.some(
        (lever) => lever.pressed && lever.targetIds.includes(laser.id),
      );
      const cycle = laser.onMs + laser.offMs;
      laser.active =
        !disabled && cycle > 0 && (nowMs + laser.phaseMs) % cycle < laser.onMs;

      if (
        laser.active &&
        distanceToSegment(
          this.state.player.x,
          this.state.player.y,
          laser.x1,
          laser.y1,
          laser.x2,
          laser.y2,
        ) <= this.state.player.radius
      ) {
        this.state.status = 'alarm';
        return;
      }
    }
  }

  private checkWin(): void {
    if (this.state.status !== 'playing') return;
    const player = this.state.player;
    const exit = this.vault.exit;
    const atExit = distance(player, exit) <= exit.radius + 0.5;

    if (!this.vault.requiresGem) {
      if (atExit) this.state.status = 'won';
      return;
    }

    const gem = this.state.gem;
    if (!gem) return;
    if (gem.holder === 'player' && atExit) {
      this.state.status = 'won';
      return;
    }
    if (gem.holder !== 'world' && gem.holder !== 'player') {
      const ghost = this.state.ghosts.find(
        (candidate) => candidate.id === gem.holder && candidate.active,
      );
      if (ghost && distance(ghost, exit) <= exit.radius + 0.5) {
        this.state.status = 'won';
        return;
      }
    }
    if (distance(gem, exit) <= exit.radius + 0.5) {
      this.state.status = 'won';
    }
  }

  private checkTimer(nowMs: number): void {
    if (this.state.status !== 'playing') return;
    if (nowMs >= this.state.loopMs) {
      this.state.status = 'timeout';
    }
  }

  private record(nowMs: number): void {
    if (this.state.status === 'won') return;
    const frameInterval = 1000 / RECORD_HZ;
    const last = this.state.currentTrack[this.state.currentTrack.length - 1];
    if (last && nowMs - last.t < frameInterval - 0.001) return;

    const player = this.state.player;
    const moving = Math.abs(this.input.moveX) + Math.abs(this.input.moveY) > 0.01;
    const frame: GhostFrame = {
      t: nowMs,
      x: player.x,
      y: player.y,
      dir: player.facing,
      anim: moving ? 'walk' : 'idle',
    };
    if (this.pendingEvents.length > 0) {
      frame.events = this.pendingEvents;
      this.pendingEvents = [];
    }
    this.state.currentTrack.push(frame);
  }
}
