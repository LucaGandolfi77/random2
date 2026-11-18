import * as THREE from 'three';
import { CONFIG } from '../game/GameConfig';
import type { GameState } from '../game/GameState';
import type { World } from '../world/Interactable';
import type { MobileInput } from './MobileInput';

export class FirstPersonController {
  readonly position = new THREE.Vector3(0, CONFIG.eyeHeight, 0);
  yaw = 0;
  pitch = 0;
  moving = false;
  crouched = false;
  invertY = false;
  sensitivity = 1;
  private velocity = new THREE.Vector3();
  private keys = new Set<string>();
  private bob = 0;
  private eye = CONFIG.eyeHeight;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private world: World,
    private canvas: HTMLCanvasElement,
    public mobile: MobileInput | null
  ) {
    window.addEventListener('keydown', (e) => this.keys.add(e.code));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== this.canvas) return;
      this.yaw -= e.movementX * CONFIG.mouseSensitivity * this.sensitivity;
      this.pitch -= e.movementY * CONFIG.mouseSensitivity * this.sensitivity * (this.invertY ? -1 : 1);
      this.clampPitch();
    });
  }

  get locked() { return document.pointerLockElement === this.canvas; }
  requestLock() {
    if (this.locked) return;
    try {
      const result = this.canvas.requestPointerLock?.() as Promise<void> | undefined;
      if (result && typeof result.catch === 'function') result.catch(() => { /* pointer lock not available */ });
    } catch { /* pointer lock not available */ }
  }
  releaseLock() { if (this.locked) document.exitPointerLock(); }

  private clampPitch() {
    const lim = Math.PI / 2 - 0.06;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
  }

  syncFrom(state: GameState) {
    this.position.set(state.position[0], CONFIG.eyeHeight, state.position[2]);
    this.yaw = state.yaw;
    this.pitch = state.pitch;
    this.clampPitch();
    this.velocity.set(0, 0, 0);
    this.eye = this.crouched ? CONFIG.crouchHeight : CONFIG.eyeHeight;
  }

  syncTo(state: GameState) {
    state.position = [this.position.x, this.eye, this.position.z];
    state.yaw = this.yaw;
    state.pitch = this.pitch;
  }

  update(dt: number, _state: GameState, enabled: boolean) {
    if (!enabled) { this.moving = false; this.applyCamera(); return; }

    if (this.mobile?.visible) {
      this.yaw -= this.mobile.lookDelta.x;
      this.pitch -= this.mobile.lookDelta.y;
      this.mobile.lookDelta.x = this.mobile.lookDelta.y = 0;
      this.clampPitch();
    }

    let f = 0, s = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) f += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) f -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) s += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) s -= 1;
    if (this.mobile?.visible) { f += this.mobile.move.y; s += this.mobile.move.x; }
    const len = Math.hypot(f, s);
    if (len > 1) { f /= len; s /= len; }

    const wantCrouch = this.keys.has('ControlLeft') || this.keys.has('ControlRight') || this.keys.has('KeyC') || this.mobile?.crouching;
    this.crouched = !!wantCrouch;
    const sprinting = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.mobile?.sprinting) && !this.crouched && len > 0.1;
    const speed = this.crouched ? CONFIG.crouchSpeed : sprinting ? CONFIG.sprintSpeed : CONFIG.walkSpeed;

    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    const targetX = (fx * f + rx * s) * speed;
    const targetZ = (fz * f + rz * s) * speed;
    const accel = len > 0.05 ? CONFIG.acceleration : CONFIG.damping;
    this.velocity.x += (targetX - this.velocity.x) * Math.min(1, dt * accel);
    this.velocity.z += (targetZ - this.velocity.z) * Math.min(1, dt * accel);

    this.moveWithCollision(this.velocity.x * dt, this.velocity.z * dt);
    this.moving = Math.hypot(this.velocity.x, this.velocity.z) > 0.35;

    const targetEye = this.crouched ? CONFIG.crouchHeight : CONFIG.eyeHeight;
    this.eye += (targetEye - this.eye) * Math.min(1, dt * 9);
    if (this.moving) this.bob += dt * (sprinting ? 13 : 8.5);
    this.applyCamera();
  }

  private moveWithCollision(dx: number, dz: number) {
    const r = 0.28;
    this.position.x += dx;
    this.resolveAxis('x', r);
    this.position.z += dz;
    this.resolveAxis('z', r);
    // keep the player inside the outer world
    this.position.x = THREE.MathUtils.clamp(this.position.x, -9.4, 9.4);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -9.4, 9.4);
  }

  private resolveAxis(axis: 'x' | 'z', r: number) {
    for (const b of this.world.colliders) {
      if (b.isEmpty()) continue;
      if (this.position.y > b.max.y + 0.2 || this.position.y < b.min.y - 0.3) continue;
      if (this.position.x < b.min.x - r || this.position.x > b.max.x + r) continue;
      if (this.position.z < b.min.z - r || this.position.z > b.max.z + r) continue;
      if (axis === 'x') {
        const left = this.position.x - (b.min.x - r);
        const right = (b.max.x + r) - this.position.x;
        this.position.x += left < right ? -left : right;
      } else {
        const back = this.position.z - (b.min.z - r);
        const front = (b.max.z + r) - this.position.z;
        this.position.z += back < front ? -back : front;
      }
    }
  }

  private applyCamera() {
    const bobY = this.moving ? Math.sin(this.bob * 2) * 0.028 : 0;
    const bobX = this.moving ? Math.sin(this.bob) * 0.014 : 0;
    this.camera.position.set(this.position.x + bobX, this.eye + bobY, this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, bobX * 0.4, 'YXZ');
  }

  currentRoom(): string {
    let best = 'Outside', dist = Infinity;
    for (const r of this.world.rooms) {
      const d = r.center.distanceTo(this.position);
      if (d < r.radius && d < dist) { dist = d; best = r.name; }
    }
    return best;
  }
}
