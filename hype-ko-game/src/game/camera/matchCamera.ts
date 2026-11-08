import { FreeCamera, Vector3, type Scene } from '@babylonjs/core';
import type { MatchSim } from '../combat/simulation';
import type { StageDefinition } from '../../data/stages';

export class MatchCamera {
  readonly camera: FreeCamera;
  private readonly scene: Scene;
  private readonly stage: StageDefinition;
  private currentPosition: Vector3;
  private currentTarget: Vector3;
  private desiredPosition: Vector3;
  private desiredTarget: Vector3;
  private shakeAmount = 0;
  private shakeTime = 0;
  private introTime = 0;

  constructor(scene: Scene, stage: StageDefinition) {
    this.scene = scene;
    this.stage = stage;
    this.camera = new FreeCamera('matchCamera', new Vector3(0, 2.6, 8.4), scene);
    this.camera.minZ = 0.1;
    this.camera.maxZ = 60;
    this.camera.fov = 0.82;
    this.camera.setTarget(new Vector3(0, 1.1, 0));
    scene.activeCamera = this.camera;
    this.currentPosition = this.camera.position.clone();
    this.currentTarget = new Vector3(0, 1.1, 0);
    this.desiredPosition = this.currentPosition.clone();
    this.desiredTarget = this.currentTarget.clone();
  }

  addShake(amount: number): void {
    this.shakeAmount = Math.min(0.5, this.shakeAmount + amount);
    this.shakeTime = Math.max(this.shakeTime, 0.25);
  }

  update(sim: MatchSim, dt: number): void {
    const active = sim.getActiveFighters();
    const fighters = active.length > 0 ? active : sim.fighters;
    const xs = fighters.map((fighter) => fighter.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const midX = (minX + maxX) / 2;
    const spread = Math.max(1.5, maxX - minX);
    const maxY = Math.max(0, ...fighters.map((fighter) => fighter.y));
    const bias = this.stage.cameraBias;

    if (sim.phase === 'intro') {
      this.introTime += dt;
      const push = Math.min(1, this.introTime / 2.2);
      this.desiredPosition = new Vector3(
        midX * 0.55 + bias,
        2.2 + push * 0.5,
        9.6 - push * 1.2
      );
      this.desiredTarget = new Vector3(midX * 0.7, 1.05, 0);
    } else if (sim.phase === 'finisher' && sim.finisher) {
      const attacker = sim.fighters[sim.finisher.attacker];
      const defender = sim.fighters[sim.finisher.defender];
      const center = (attacker.x + defender.x) / 2;
      const side = attacker.x <= defender.x ? -1 : 1;
      const t = sim.finisher.timer / 190;
      this.desiredPosition = new Vector3(center + side * (2.4 + Math.sin(t * 3) * 0.4), 1.7, 4.4);
      this.desiredTarget = new Vector3(center, 1.15, 0);
    } else if (sim.phase === 'roundEnd' || sim.phase === 'matchEnd') {
      const winner = sim.roundWinner ?? sim.matchWinner;
      const winnerFighter = winner !== null ? sim.fighters[winner] : fighters[0];
      this.desiredPosition = new Vector3(winnerFighter.x * 0.7, 2.1, 6.2);
      this.desiredTarget = new Vector3(winnerFighter.x * 0.8, 1.1, 0);
    } else {
      const rumbleScale = sim.config.rumble ? 1.35 : 1;
      this.desiredPosition = new Vector3(
        midX * 0.62 + bias,
        2.25 + maxY * 0.35,
        (6.4 + spread * 0.62) * rumbleScale
      );
      this.desiredTarget = new Vector3(midX * 0.72, 1.05 + maxY * 0.25, 0);
    }

    const positionLambda = sim.phase === 'finisher' ? 6 : 4.5;
    const targetLambda = sim.phase === 'finisher' ? 8 : 6;
    this.currentPosition = Vector3.Lerp(
      this.currentPosition,
      this.desiredPosition,
      1 - Math.exp(-positionLambda * dt)
    );
    this.currentTarget = Vector3.Lerp(
      this.currentTarget,
      this.desiredTarget,
      1 - Math.exp(-targetLambda * dt)
    );

    let shakeOffset = Vector3.Zero();
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      this.shakeAmount *= Math.exp(-8 * dt);
      const intensity = this.shakeAmount;
      shakeOffset = new Vector3(
        (Math.random() * 2 - 1) * intensity,
        (Math.random() * 2 - 1) * intensity * 0.7,
        (Math.random() * 2 - 1) * intensity * 0.3
      );
      if (this.shakeTime <= 0) this.shakeAmount = 0;
    }

    this.camera.position.copyFrom(this.currentPosition.add(shakeOffset));
    this.camera.setTarget(this.currentTarget);
  }

  resetIntro(): void {
    this.introTime = 0;
    this.shakeAmount = 0;
    this.shakeTime = 0;
    this.currentPosition = new Vector3(0, 2.6, 8.4);
    this.currentTarget = new Vector3(0, 1.1, 0);
    this.camera.position.copyFrom(this.currentPosition);
    this.camera.setTarget(this.currentTarget);
    void this.scene;
  }

  dispose(): void {
    this.camera.dispose();
  }
}
