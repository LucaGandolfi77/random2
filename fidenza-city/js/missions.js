import * as THREE from 'three';
import { SCORE, MISSION_TYPES } from './config.js';
import { makeCar } from './models.js';
import { addScore, completeMission, getMissionRecord } from './save.js';

function makeMissionMarker() {
  const group = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 1.2, 12, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: '#ffce62', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
  );
  beam.position.y = 6;
  group.add(beam);
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.6, 0),
    new THREE.MeshBasicMaterial({ color: '#ffce62' })
  );
  diamond.position.y = 12.2;
  group.add(diamond);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.8, 0.07, 6, 32),
    new THREE.MeshBasicMaterial({ color: '#ffce62', transparent: true, opacity: 0.7 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  group.add(ring);
  group.visible = false;
  return { group, beam, diamond, ring };
}

function findChaseRoad(city) {
  const named = city.roads.filter(r => /emilia/i.test(r.name) && r.length > 160 && !r.tunnel);
  if (named.length) return named.sort((a, b) => b.length - a.length)[0];
  return city.roads
    .filter(r => ['primary', 'secondary'].includes(r.kind) && r.length > 120 && !r.tunnel)
    .sort((a, b) => b.length - a.length)[0] || city.roads.find(r => r.length > 80);
}

function makeChaseWalker(road) {
  const pts = road.pts;
  const segs = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (len < 0.1) continue;
    segs.push({ ax: pts[i - 1][0], az: pts[i - 1][1], bx: pts[i][0], bz: pts[i][1], len, start: total });
    total += len;
  }
  return {
    segs, total, t: 0, dir: 1, speed: 9.5,
    advance(dt) {
      this.t += dt * this.speed * this.dir;
      if (this.t > this.total) { this.t = this.total; this.dir = -1; }
      else if (this.t < 0) { this.t = 0; this.dir = 1; }
    },
    pose() {
      const t = Math.max(0, Math.min(this.total, this.t));
      for (const s of this.segs) {
        if (t <= s.start + s.len || s === this.segs[this.segs.length - 1]) {
          const u = Math.max(0, Math.min(1, (t - s.start) / s.len));
          return {
            x: s.ax + (s.bx - s.ax) * u,
            z: s.az + (s.bz - s.az) * u,
            dx: (s.bx - s.ax) * this.dir,
            dz: (s.bz - s.az) * this.dir
          };
        }
      }
      return { x: 0, z: 0, dx: 0, dz: 1 };
    }
  };
}

export class MissionManager {
  constructor({ scene, world, audio, player, onComplete, onFail, onToast }) {
    this.scene = scene;
    this.world = world;
    this.audio = audio;
    this.player = player;
    this.onComplete = onComplete;
    this.onFail = onFail;
    this.onToast = onToast;
    this.active = null;
    this.chaseCar = null;
    this.chaseWalker = null;
    this.chaseHold = 0;
    this.marker = makeMissionMarker();
    scene.add(this.marker.group);
    this.defs = this._makeDefs();
  }

  _makeDefs() {
    const L = Object.fromEntries(this.world.landmarks.map(l => [l.id, l]));
    const piazza = L.piazza;
    const duomo = L.duomo;
    const teatro = L.teatro;
    const stazione = L.stazione;
    const porta = L.porta;
    const comunale = L.comunale;
    return {
      ambulance: {
        id: 'ambulance',
        ...MISSION_TYPES.ambulance,
        title: 'Emergenza al parco',
        short: 'Un pellegrino si sente male al Parco Vittorio Veneto. Prendi l\'ambulanza e portalo in ospedale.',
        time: 190,
        reward: 800,
        steps: [
          { x: -234, z: 612, name: 'Paziente al Parco Vittorio Veneto', prompt: 'carica il paziente', radius: 13 },
          { x: this.world.hospital.x, z: this.world.hospital.z, name: 'Ospedale di Fidenza', prompt: 'consegna il paziente', radius: 20 }
        ]
      },
      chase: {
        id: 'chase',
        ...MISSION_TYPES.chase,
        title: 'Inseguimento in Via Emilia',
        short: 'Un fuggitivo scappa lungo la Via Emilia. Restagli vicino per qualche secondo e fermalo.',
        time: 150,
        reward: 900,
        chase: true
      },
      pizza: {
        id: 'pizza',
        ...MISSION_TYPES.pizza,
        title: 'Pizza in Vespa',
        short: 'Tre consegne a domicilio nel centro di Fidenza. La Vespa è parcheggiata vicino al tabellone.',
        time: 170,
        reward: 700,
        steps: [
          { x: piazza.x + 8, z: piazza.z + 6, name: 'Consegna in Piazza Duomo', prompt: 'consegna la pizza', radius: 11 },
          { x: teatro.x + 6, z: teatro.z + 8, name: 'Consegna al Teatro Magnani', prompt: 'consegna la pizza', radius: 11 },
          { x: stazione.x - 8, z: stazione.z + 6, name: 'Consegna alla stazione', prompt: 'consegna la pizza', radius: 12 }
        ]
      },
      taxi: {
        id: 'taxi',
        ...MISSION_TYPES.taxi,
        title: 'Taxi dalla stazione',
        short: 'Un viaggiatore è appena sceso dal treno. Portalo dalla stazione al Teatro Magnani.',
        time: 150,
        reward: 750,
        steps: [
          { x: stazione.x + 4, z: stazione.z + 10, name: 'Viaggiatore alla stazione', prompt: 'fai salire il viaggiatore', radius: 12 },
          { x: teatro.x + 3, z: teatro.z + 12, name: 'Teatro Magnani', prompt: 'fai scendere il viaggiatore', radius: 12 }
        ]
      },
      photo: {
        id: 'photo',
        ...MISSION_TYPES.photo,
        title: 'Cartoline di Fidenza',
        short: 'Scatta cinque cartoline ai luoghi simbolo della città. Avvicinati e premi E.',
        time: 200,
        reward: 900,
        steps: [
          { x: duomo.x + 12, z: duomo.z + 10, name: 'Duomo di San Donnino', prompt: 'scatta la foto', radius: 15, photo: true },
          { x: porta.x + 4, z: porta.z + 10, name: 'Porta San Donnino', prompt: 'scatta la foto', radius: 14, photo: true },
          { x: teatro.x + 8, z: teatro.z + 10, name: 'Teatro Magnani', prompt: 'scatta la foto', radius: 14, photo: true },
          { x: comunale.x + 4, z: comunale.z + 10, name: 'Palazzo Comunale', prompt: 'scatta la foto', radius: 14, photo: true },
          { x: piazza.x, z: piazza.z + 8, name: 'Piazza Duomo', prompt: 'scatta la foto', radius: 14, photo: true }
        ]
      }
    };
  }

  list() {
    return Object.values(this.defs).map(def => ({
      ...def,
      record: getMissionRecord(def.id)
    }));
  }

  get activeId() { return this.active?.def.id || null; }

  start(id) {
    const def = this.defs[id];
    if (!def) return false;
    this.abort(true);
    this.active = {
      def,
      stepIndex: 0,
      timer: def.time,
      maxTime: def.time,
      progress: 0,
      total: def.steps?.length || 1,
      photos: 0,
      startedAt: performance.now()
    };
    this.chaseHold = 0;
    if (def.steps) {
      for (const step of def.steps) {
        const spot = this.world.findFreeSpot(step.x, step.z, 1.4);
        if (spot) { step.x = spot.x; step.z = spot.z; }
      }
    }
    if (def.chase) {
      const road = findChaseRoad(this.world.city);
      if (road) {
        this.chaseWalker = makeChaseWalker(road);
        this.chaseWalker.t = 0;
        const pose = this.chaseWalker.pose();
        this.chaseCar = makeCar({ color: '#3f4a45' });
        this.chaseCar.position.set(pose.x, 0.06, pose.z);
        this.chaseCar.scale.setScalar(0.96);
        this.scene.add(this.chaseCar);
      }
    }
    this.marker.group.visible = true;
    this.marker.group.position.set(this.currentTarget.x, 0, this.currentTarget.z);
    this.onToast?.(`Missione: ${def.title}`);
    this.audio?.click();
    return true;
  }

  abort(silent = false) {
    if (!this.active) return;
    this._cleanup();
    this.active = null;
    this.marker.group.visible = false;
    if (!silent) this.onToast?.('Missione annullata');
  }

  _cleanup() {
    if (this.chaseCar) {
      this.scene.remove(this.chaseCar);
      this.chaseCar = null;
    }
    this.chaseWalker = null;
    this.chaseHold = 0;
  }

  get currentTarget() {
    if (!this.active) return null;
    if (this.active.def.chase) {
      if (!this.chaseCar) return null;
      return { x: this.chaseCar.position.x, z: this.chaseCar.position.z, name: 'Fuggitivo', radius: 9 };
    }
    const step = this.active.def.steps?.[this.active.stepIndex];
    return step || null;
  }

  getPrompt(player) {
    if (!this.active) {
      // tabellone missioni
      if (this.world.missionBoard) {
        const d = Math.hypot(player.position.x - this.world.missionBoard.x, player.position.z - this.world.missionBoard.z);
        if (d < 11) return { text: '<kbd>E</kbd> apri il tabellone missioni', action: 'missions' };
      }
      return null;
    }
    label: {
      const t = this.currentTarget;
      if (!t) break label;
      const d = Math.hypot(player.position.x - t.x, player.position.z - t.z);
      if (this.active.def.chase) {
        if (d < 10) return { text: 'Resta vicino al fuggitivo!', action: 'chase' };
        return null;
      }
      if (d < (t.radius || 12)) {
        return { text: `<kbd>E</kbd> ${t.prompt}`, action: 'mission-step', step: t };
      }
    }
    return null;
  }

  interact(player) {
    if (!this.active) return false;
    const t = this.currentTarget;
    if (!t) return false;
    const d = Math.hypot(player.position.x - t.x, player.position.z - t.z);
    if (this.active.def.chase) return false;
    if (d > (t.radius || 12)) return false;
    const def = this.active.def;
    this.active.progress++;
    if (def.id === 'photo') this.active.photos++;
    this.audio?.tone(740, 0.12, 'triangle', 0.06, 980);
    if (this.active.stepIndex < (def.steps?.length || 0) - 1) {
      this.active.stepIndex++;
      const next = this.currentTarget;
      if (next) this.marker.group.position.set(next.x, 0, next.z);
      this.onToast?.(def.id === 'photo' ? `Foto scattata (${this.active.photos}/${def.steps.length})` : 'Tappa completata');
      return true;
    }
    this._complete();
    return true;
  }

  _complete() {
    const a = this.active;
    if (!a) return;
    const elapsed = a.maxTime - a.timer;
    const timeBonus = Math.max(0, Math.round(a.timer * SCORE.missionTimeBonus));
    const points = a.def.reward + timeBonus;
    addScore(points);
    completeMission(a.def.id, elapsed, points);
    this.audio?.missionComplete();
    this.onComplete?.(a.def, points, elapsed, a);
    this._cleanup();
    this.active = null;
    this.marker.group.visible = false;
  }

  update(dt, player) {
    if (!this.active) return;
    this.active.timer -= dt;
    if (this.active.timer <= 0) {
      this.active.timer = 0;
      this.audio?.missionFail();
      this.onFail?.(this.active.def);
      this._cleanup();
      this.active = null;
      this.marker.group.visible = false;
      return;
    }
    if (this.active.def.chase && this.chaseCar && this.chaseWalker) {
      this.chaseWalker.advance(dt);
      const pose = this.chaseWalker.pose();
      this.chaseCar.position.set(pose.x, 0.06, pose.z);
      this.chaseCar.rotation.y = Math.atan2(pose.dx, pose.dz);
      this.marker.group.position.set(pose.x, 0, pose.z);
      const d = Math.hypot(player.position.x - pose.x, player.position.z - pose.z);
      if (d < 9) this.chaseHold += dt;
      else this.chaseHold = Math.max(0, this.chaseHold - dt * 1.5);
      if (this.chaseHold > 3.0) this._complete();
    } else {
      const t = this.currentTarget;
      if (t) this.marker.group.position.set(t.x, 0, t.z);
    }
    // animazione marker
    this.marker.group.rotation.y += dt * 0.5;
    this.marker.diamond.rotation.y += dt * 1.2;
    this.marker.diamond.position.y = 12.2 + Math.sin(performance.now() * 0.002) * 0.3;
    this.marker.ring.material.opacity = 0.5 + Math.sin(performance.now() * 0.003) * 0.2;
  }

  getProgress() {
    if (!this.active) return null;
    return {
      title: this.active.def.title,
      text: this.active.def.chase
        ? (this.chaseHold > 0.1 ? 'Resta vicino al fuggitivo!' : 'Inseguilo lungo la Via Emilia')
        : (this.active.def.steps?.[this.active.stepIndex]?.name || ''),
      timer: this.active.timer,
      maxTime: this.active.maxTime,
      progress: this.active.def.chase ? Math.min(1, this.chaseHold / 3) : (this.active.progress / Math.max(1, this.active.total)),
      step: this.active.stepIndex + 1,
      total: this.active.total
    };
  }
}
