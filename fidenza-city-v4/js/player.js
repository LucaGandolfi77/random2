import * as THREE from 'three';
import { PLAYER, WORLD } from './config.js';
import { clamp, damp, dampAngle, groundHeightAt, resolveCirclePolygon } from './utils.js';
import { makePerson } from './models.js';

export class Player {
  constructor({ scene, camera, world, input }) {
    this.scene = scene;
    this.camera = camera;
    this.world = world;
    this.input = input;
    this.position = new THREE.Vector3(WORLD.spawn.x, 0, WORLD.spawn.z);
    this.velocity = new THREE.Vector3();
    this.yaw = WORLD.spawn.yaw;
    this.cameraYaw = WORLD.spawn.yaw;
    this.cameraPitch = 0.08;
    this.cameraDistance = PLAYER.cameraDistance;
    this.currentSpeed = 0;
    this.walkPhase = 0;
    this.onFoot = true;
    this.vehicle = null;
    this.controlEnabled = true;
    this.cameraShake = 0;
    this.flyMode = false;

    this.mesh = makePerson({ shirt: '#e7b95a', pants: '#2e4439', skin: '#d8aa85', hair: '#2d2119' });
    this.mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
    // zaino
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.2), new THREE.MeshLambertMaterial({ color: '#9a4a34' }));
    pack.position.set(0, 1.14, -0.24);
    pack.castShadow = true;
    this.mesh.add(pack);
    // ombra
    const shadowTex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
      g.addColorStop(0, 'rgba(0,0,0,.4)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(c);
      return t;
    })();
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.03;
    this.mesh.add(this.shadow);
    scene.add(this.mesh);
    this._syncMesh();
  }

  spawn(x, z, yaw = this.yaw) {
    this.flyMode = false;
    this.position.set(x, 0, z);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.cameraYaw = yaw;
    this.currentSpeed = 0;
    if (this.shadow) this.shadow.visible = true;
    this._syncMesh();
    this.updateCamera(0, true);
  }

  setFlyMode(on) {
    this.flyMode = !!on;
    if (this.flyMode) {
      this.position.y = Math.max(this.position.y, groundHeightAt(this.world.terrain, this.position.x, this.position.z, 0) + 1.5);
      this.velocity.set(0, 0, 0);
      if (this.shadow) this.shadow.visible = false;
    } else {
      const spot = this.world.findFreeSpot?.(this.position.x, this.position.z, 1.0);
      if (spot) {
        this.position.x = spot.x;
        this.position.z = spot.z;
      }
      this.position.y = groundHeightAt(this.world.terrain, this.position.x, this.position.z, 0);
      this.cameraPitch = clamp(this.cameraPitch, PLAYER.cameraMinPitch, PLAYER.cameraMaxPitch);
      if (this.shadow) this.shadow.visible = true;
      this.velocity.set(0, 0, 0);
    }
    this._syncMesh();
  }

  setVehicle(vehicle) {
    this.vehicle = vehicle;
    this.onFoot = !vehicle;
    this.mesh.visible = this.onFoot;
    this.velocity.set(0, 0, 0);
    this.currentSpeed = 0;
  }

  _syncMesh() {
    this.mesh.position.set(this.position.x, this.position.y + 0.04, this.position.z);
    this.mesh.rotation.y = this.yaw;
  }

  update(dt, { ignoreLook = false } = {}) {
    if (!this.controlEnabled) return;
    if (this.vehicle) {
      this.position.set(this.vehicle.position.x, this.vehicle.position.y, this.vehicle.position.z);
      this.yaw = this.vehicle.heading;
      if (!ignoreLook) this._look(dt);
      this.updateCamera(dt);
      return;
    }

    if (!ignoreLook) this._look(dt);
    if (this.flyMode) {
      this._updateFly(dt);
      return;
    }

    const forward = (this.input.isDown('KeyW') || this.input.isDown('ArrowUp') ? 1 : 0) - (this.input.isDown('KeyS') || this.input.isDown('ArrowDown') ? 1 : 0);
    const strafe = (this.input.isDown('KeyA') || this.input.isDown('ArrowLeft') ? 1 : 0) - (this.input.isDown('KeyD') || this.input.isDown('ArrowRight') ? 1 : 0);
    let mx = 0, mz = 0;
    if (this.input.isTouch() && !this.input.padActive) {
      mx = -this.input.touchMove.x;
      mz = -this.input.touchMove.y;
    } else {
      mx = strafe;
      mz = forward;
    }
    const run = this.input.isDown('ShiftLeft') || this.input.isDown('ShiftRight') || this.input.touchRun;
    const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const mag = Math.hypot(mx, mz);
    let targetX = 0, targetZ = 0;
    if (mag > 0.08) {
      const norm = Math.min(1, mag);
      const wx = Math.sin(this.cameraYaw) * mz + Math.cos(this.cameraYaw) * mx;
      const wz = Math.cos(this.cameraYaw) * mz - Math.sin(this.cameraYaw) * mx;
      const wl = Math.hypot(wx, wz) || 1;
      targetX = (wx / wl) * speed * norm;
      targetZ = (wz / wl) * speed * norm;
    }
    const accel = (Math.abs(targetX) + Math.abs(targetZ) > 0.01) ? PLAYER.acceleration : PLAYER.deceleration;
    this.velocity.x = damp(this.velocity.x, targetX, accel / Math.max(1, speed), dt);
    this.velocity.z = damp(this.velocity.z, targetZ, accel / Math.max(1, speed), dt);
    if (Math.abs(this.velocity.x) < 0.02) this.velocity.x = 0;
    if (Math.abs(this.velocity.z) < 0.02) this.velocity.z = 0;

    const stepX = this.velocity.x * dt;
    const stepZ = this.velocity.z * dt;
    this._move(stepX, stepZ);

    this.currentSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.currentSpeed > 0.1) {
      const targetYaw = Math.atan2(this.velocity.x, this.velocity.z);
      this.yaw = dampAngle(this.yaw, targetYaw, PLAYER.turnSpeed, dt);
    }

    const ground = groundHeightAt(this.world.terrain, this.position.x, this.position.z, 0);
    this.position.y = ground;
    this._syncMesh();

    // animazione
    this.walkPhase += dt * (this.currentSpeed * 2.1 + 0.5);
    const amp = clamp(this.currentSpeed / PLAYER.runSpeed, 0, 1) * 0.65;
    const limbs = this.mesh.userData.limbs;
    if (limbs) {
      const a = Math.sin(this.walkPhase * 6) * amp;
      const b = Math.sin(this.walkPhase * 6 + Math.PI) * amp;
      limbs.legL.rotation.x = a;
      limbs.legR.rotation.x = b;
      limbs.armL.rotation.x = b * 0.8;
      limbs.armR.rotation.x = a * 0.8;
      this.mesh.position.y = this.position.y + 0.04 + Math.abs(Math.sin(this.walkPhase * 6)) * amp * 0.035;
    }
    this.updateCamera(dt);
  }

  _updateFly(dt) {
    const touch = this.input.isTouch() && !this.input.padActive ? this.input.touchMove : { x: 0, y: 0 };
    const forward = (this.input.isDown('KeyW') || this.input.isDown('ArrowUp') ? 1 : 0) - (this.input.isDown('KeyS') || this.input.isDown('ArrowDown') ? 1 : 0) - touch.y;
    const strafe = (this.input.isDown('KeyA') || this.input.isDown('ArrowLeft') ? 1 : 0) - (this.input.isDown('KeyD') || this.input.isDown('ArrowRight') ? 1 : 0) - touch.x;
    const vertical = (this.input.isDown('Space') || this.input.isDown('KeyE') || this.input.touchFlyUp ? 1 : 0) - (this.input.isDown('KeyQ') || this.input.isDown('ControlLeft') || this.input.touchFlyDown ? 1 : 0);
    const boost = this.input.isDown('ShiftLeft') || this.input.isDown('ShiftRight');
    const speed = boost ? PLAYER.flyBoost : PLAYER.flySpeed;
    const cy = Math.cos(this.cameraYaw);
    const sy = Math.sin(this.cameraYaw);
    const cp = Math.cos(this.cameraPitch);
    const sp = -Math.sin(this.cameraPitch);
    let dx = (sy * cp * forward + cy * strafe) * speed;
    let dy = (sp * forward + vertical) * speed;
    let dz = (cy * cp * forward - sy * strafe) * speed;
    const len = Math.hypot(dx, dy, dz);
    if (len > 0.001) {
      const norm = speed / len;
      dx *= norm;
      dy *= norm;
      dz *= norm;
      this.position.x += dx * dt;
      this.position.y += dy * dt;
      this.position.z += dz * dt;
      this.yaw = this.cameraYaw;
      this.currentSpeed = speed;
    } else {
      this.currentSpeed = 0;
    }
    this.position.x = clamp(this.position.x, WORLD.bounds.minX + 2, WORLD.bounds.maxX - 2);
    this.position.z = clamp(this.position.z, WORLD.bounds.minZ + 2, WORLD.bounds.maxZ - 2);
    this.position.y = clamp(this.position.y, 1.4, 160);
    const limbs = this.mesh.userData.limbs;
    if (limbs) {
      limbs.legL.rotation.x = Math.sin(this.walkPhase * 2) * 0.08;
      limbs.legR.rotation.x = -Math.sin(this.walkPhase * 2) * 0.08;
      limbs.armL.rotation.x = -0.08;
      limbs.armR.rotation.x = -0.08;
    }
    this.walkPhase += dt * 1.5;
    this._syncMesh();
    this.updateCamera(dt);
  }

  _look(dt) {
    const { dx, dy } = this.input.consumeLook();
    if (!dx && !dy) return;
    const sens = this.input.isTouch() ? 0.0034 : 0.0022;
    this.cameraYaw -= dx * sens;
    const minPitch = this.flyMode ? -1.1 : PLAYER.cameraMinPitch;
    const maxPitch = this.flyMode ? 1.1 : PLAYER.cameraMaxPitch;
    this.cameraPitch = clamp(this.cameraPitch + dy * (this.input.isTouch() ? 0.0026 : 0.0017), minPitch, maxPitch);
    this.cameraYaw = ((this.cameraYaw + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  }

  _move(dx, dz) {
    this.position.x += dx;
    this.position.z += dz;
    // collisioni
    for (let pass = 0; pass < 2; pass++) {
      const near = this.world.hash.query(this.position.x, this.position.z, 3.2);
      let collided = false;
      for (const c of near) {
        const res = resolveCirclePolygon(this.position.x, this.position.z, PLAYER.radius, c.poly);
        if (res) {
          this.position.x += res.pushX;
          this.position.z += res.pushZ;
          const dot = this.velocity.x * res.nx + this.velocity.z * res.nz;
          if (dot < 0) {
            this.velocity.x -= res.nx * dot;
            this.velocity.z -= res.nz * dot;
          }
          collided = true;
        }
      }
      if (!collided) break;
    }
    this.position.x = clamp(this.position.x, WORLD.bounds.minX + 2, WORLD.bounds.maxX - 2);
    this.position.z = clamp(this.position.z, WORLD.bounds.minZ + 2, WORLD.bounds.maxZ - 2);
  }

  updateCamera(dt, snap = false) {
    const dist = this.vehicle ? (this.vehicle.type === 'vespa' ? 5.0 : this.vehicle.type === 'bike' ? 4.2 : 7.4) : this.cameraDistance;
    const horiz = Math.cos(this.cameraPitch) * dist;
    const up = 1.6 + Math.sin(this.cameraPitch) * dist;
    const target = new THREE.Vector3(this.position.x, this.position.y + (this.vehicle ? 1.2 : 1.4), this.position.z);
    let desired = new THREE.Vector3(
      target.x - Math.sin(this.cameraYaw) * horiz,
      target.y + up,
      target.z - Math.cos(this.cameraYaw) * horiz
    );
    // evita di entrare nei palazzi (non serve in volo)
    if (!this.flyMode) {
      const dir = desired.clone().sub(target);
      const maxDist = dir.length();
      dir.normalize();
      let safe = maxDist;
      for (let d = 1.2; d < maxDist; d += 0.45) {
        const x = target.x + dir.x * d;
        const z = target.z + dir.z * d;
        if (!this.world.isFree(x, z, 0.28)) { safe = Math.max(1.0, d - 0.35); break; }
      }
      desired = target.clone().addScaledVector(dir, safe);
    }
    // non sotto terra
    const minY = groundHeightAt(this.world.terrain, desired.x, desired.z, 0) + 0.7;
    if (desired.y < minY) desired.y = minY;

    if (snap) {
      this.camera.position.copy(desired);
    } else {
      const lambda = this.vehicle ? 7 : 11;
      this.camera.position.x = damp(this.camera.position.x, desired.x, lambda, dt);
      this.camera.position.y = damp(this.camera.position.y, desired.y, lambda, dt);
      this.camera.position.z = damp(this.camera.position.z, desired.z, lambda, dt);
    }
    this.camera.lookAt(target);
    if (this.vehicle) {
      this.camera.lookAt(target.x + Math.sin(this.vehicle.heading) * 4, target.y + 0.3, target.z + Math.cos(this.vehicle.heading) * 4);
    }
  }

  get position2D() {
    return { x: this.position.x, z: this.position.z };
  }
}
