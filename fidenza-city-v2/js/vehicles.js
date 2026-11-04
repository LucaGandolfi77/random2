import * as THREE from 'three';
import { VEHICLES, WORLD } from './config.js';
import { clamp, damp, groundHeightAt, resolveCirclePolygon } from './utils.js';
import { makeCar, makeVespa } from './models.js';
import { getCareer } from './save.js';

export class Vehicle {
  constructor({ scene, type = 'car', x, z, yaw = 0, color, taxi = false, label = '', world, audio }) {
    this.scene = scene;
    this.world = world;
    this.audio = audio;
    this.type = type;
    this.baseConfig = { ...VEHICLES[type] };
    this.config = { ...this.baseConfig };
    this.applyUpgrades();
    this.label = label || this.config.name;
    this.color = color;
    this.taxi = !!taxi;
    this.ambulance = label === 'Ambulanza';
    this.position = new THREE.Vector3(x, 0, z);
    this.heading = yaw;
    this.speed = 0;
    this.steer = 0;
    this.active = false;
    this.mesh = type === 'vespa' ? makeVespa({ color }) : makeCar({ color, taxi, ambulance: label === 'Ambulanza' });
    this.mesh.position.set(x, 0.05, z);
    this.mesh.rotation.y = yaw;
    this.mesh.userData.vehicle = this;
    if (this.mesh.userData.emergencyLight) {
      this.emergencyLight = this.mesh.userData.emergencyLight;
    }
    scene.add(this.mesh);
    this._updateMesh();
    this._hornCooldown = 0;
  }

  get radius() { return this.config.radius; }

  applyUpgrades(upgrades = getCareer().upgrades || {}) {
    const base = this.baseConfig;
    this.config = { ...base };
    const engine = upgrades.engine || 0;
    const handling = upgrades.handling || 0;
    const brakes = upgrades.brakes || 0;
    this.config.maxSpeed = base.maxSpeed * (1 + engine * 0.07);
    this.config.acceleration = base.acceleration * (1 + engine * 0.09);
    this.config.steer = base.steer * (1 + handling * 0.08);
    this.config.brake = base.brake * (1 + brakes * 0.1);
  }

  setActive(active, player) {
    if (active === this.active) return;
    this.active = active;
    if (active) {
      player?.setVehicle(this);
      this.audio?.init();
      this.audio?.enterVehicle(this.type);
      this.audio?.startEngine(this.type);
      if (player) {
        player.cameraYaw = this.heading;
        player.cameraPitch = 0.2;
      }
    } else {
      this.speed = 0;
      this.steer = 0;
      this.audio?.stopEngine();
      this.audio?.exitVehicle();
      player?.setVehicle(null);
    }
  }

  update(dt, input, player) {
    if (!this.active) return;
    this._hornCooldown = Math.max(0, this._hornCooldown - dt);
    const throttle = (input.isDown('KeyW') || input.isDown('ArrowUp') ? 1 : 0) - (input.isDown('KeyS') || input.isDown('ArrowDown') ? 1 : 0);
    const steerInput = (input.isDown('KeyD') || input.isDown('ArrowRight') ? 1 : 0) - (input.isDown('KeyA') || input.isDown('ArrowLeft') ? 1 : 0);
    const brake = input.isDown('Space') || input.touchBrake;
    const horn = input.isDown('KeyH') || input.touchHorn;
    if (horn && this._hornCooldown <= 0) {
      this.audio?.horn(this.config.horn);
      this._hornCooldown = 0.45;
    }

    const cfg = this.config;
    if (brake) {
      this.speed = damp(this.speed, 0, cfg.brake, dt);
    } else if (throttle > 0) {
      this.speed += cfg.acceleration * dt;
    } else if (throttle < 0) {
      this.speed -= cfg.acceleration * 0.62 * dt;
    }
    // resistenza
    const drag = cfg.drag * (0.55 + Math.abs(this.speed) * 0.035);
    if (Math.abs(this.speed) > 0.01) {
      this.speed -= Math.sign(this.speed) * drag * dt;
    } else {
      this.speed = 0;
    }
    if (!throttle && !brake) this.speed = damp(this.speed, 0, 1.4, dt);
    this.speed = clamp(this.speed, -cfg.reverseSpeed, cfg.maxSpeed);

    this.steer = damp(this.steer, steerInput, 7, dt);
    const direction = this.speed < 0 ? -1 : 1;
    const turnRate = this.type === 'vespa' ? 0.2 : 0.13;
    this.heading += this.steer * this.speed * direction * turnRate * dt;
    this.heading = ((this.heading + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

    const stepX = Math.sin(this.heading) * this.speed * dt;
    const stepZ = Math.cos(this.heading) * this.speed * dt;
    this.position.x += stepX;
    this.position.z += stepZ;

    this._collide();
    this.position.x = clamp(this.position.x, WORLD.bounds.minX + 3, WORLD.bounds.maxX - 3);
    this.position.z = clamp(this.position.z, WORLD.bounds.minZ + 3, WORLD.bounds.maxZ - 3);
    this.position.y = groundHeightAt(this.world.terrain, this.position.x, this.position.z, 0);
    this._updateMesh();
    this.audio?.updateEngine(this.speed, throttle);
    if (player) {
      player.position.copy(this.position);
      player.yaw = this.heading;
    }
  }

  _collide() {
    let collided = false;
    for (let pass = 0; pass < 2; pass++) {
      const near = this.world.hash.query(this.position.x, this.position.z, this.radius + 2.5);
      let hit = false;
      for (const c of near) {
        const res = resolveCirclePolygon(this.position.x, this.position.z, this.radius, c.poly);
        if (res) {
          this.position.x += res.pushX;
          this.position.z += res.pushZ;
          hit = true;
          collided = true;
        }
      }
      if (!hit) break;
    }
    if (collided) {
      this.speed *= 0.35;
      this.audio?.noiseBurst(0.1, 0.04, 300);
    }
  }

  _updateMesh() {
    this.mesh.position.set(this.position.x, this.position.y + 0.04, this.position.z);
    this.mesh.rotation.y = this.heading;
    const lean = this.type === 'vespa' ? this.steer * this.speed * 0.006 : this.steer * this.speed * 0.004;
    this.mesh.rotation.z = clamp(-lean, -0.12, 0.12);
    const wheels = this.mesh.userData.wheels;
    if (wheels) {
      for (const w of wheels) w.rotation.y += this.speed * 0.03;
    }
    if (this.emergencyLight) {
      this.emergencyLight.material.color.set(Math.sin(performance.now() * 0.012) > 0 ? '#ff5a4e' : '#6b1d18');
    }
  }

  exitSpot() {
    const candidates = [
      { x: this.position.x - Math.cos(this.heading) * (this.radius + 0.8), z: this.position.z + Math.sin(this.heading) * (this.radius + 0.8) },
      { x: this.position.x + Math.cos(this.heading) * (this.radius + 0.8), z: this.position.z - Math.sin(this.heading) * (this.radius + 0.8) },
      { x: this.position.x - Math.sin(this.heading) * (this.radius + 1.0), z: this.position.z - Math.cos(this.heading) * (this.radius + 1.0) },
      { x: this.position.x + Math.sin(this.heading) * (this.radius + 1.0), z: this.position.z + Math.cos(this.heading) * (this.radius + 1.0) }
    ];
    for (const c of candidates) {
      if (this.world.isFree(c.x, c.z, 0.5)) return c;
    }
    return { x: this.position.x + 2, z: this.position.z };
  }
}

export class VehicleManager {
  constructor({ scene, world, audio, player, input }) {
    this.scene = scene;
    this.world = world;
    this.audio = audio;
    this.player = player;
    this.input = input;
    this.vehicles = [];
    this.current = null;
  }

  spawnAll() {
    for (const s of this.world.vehicleSpawns) {
      const v = new Vehicle({
        scene: this.scene,
        type: s.type,
        x: s.x,
        z: s.z,
        yaw: s.yaw,
        color: s.color,
        taxi: s.taxi,
        label: s.label,
        world: this.world,
        audio: this.audio
      });
      this.vehicles.push(v);
    }
  }

  applyUpgrades(upgrades = getCareer().upgrades || {}) {
    for (const vehicle of this.vehicles) vehicle.applyUpgrades(upgrades);
  }

  nearest(x, z, maxDist = 3.2) {
    let best = null;
    for (const v of this.vehicles) {
      const d = Math.hypot(v.position.x - x, v.position.z - z);
      if (d < maxDist + v.radius * 0.5 && (!best || d < best.dist)) best = { vehicle: v, dist: d };
    }
    return best;
  }

  enter(vehicle) {
    if (this.current === vehicle) return;
    if (this.current) this.current.setActive(false, this.player);
    this.current = vehicle;
    vehicle.setActive(true, this.player);
    this.player.position.set(vehicle.position.x, vehicle.position.y, vehicle.position.z);
    this.player.mesh.visible = false;
  }

  exit() {
    if (!this.current) return;
    const v = this.current;
    const spot = v.exitSpot();
    v.setActive(false, this.player);
    this.current = null;
    this.player.spawn(spot.x, spot.z, v.heading);
    this.player.mesh.visible = true;
    this.player.updateCamera(0, true);
  }

  update(dt) {
    if (this.current) this.current.update(dt, this.input, this.player);
    // assicura che il giocatore segua il veicolo
    if (this.current) {
      this.player.position.set(this.current.position.x, this.current.position.y, this.current.position.z);
      this.player.yaw = this.current.heading;
    }
  }
}
