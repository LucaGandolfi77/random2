import * as THREE from 'three';
import {
  pointAlongTrack,
  TRAIN_STOP_DISTANCE,
  trainStatus,
  type TrainStatus
} from '../game/train';
import { TRAIN_PLATFORM } from '../data/town';
import { t } from '../data/strings';
import type { Language } from '../data/types';
import { GeoBatch, glowMaterial, staticMaterial, TriBatch } from './batch';
import { animateIdle, createBlobShadow, createPerson, type PersonRig } from './person';

export interface TrainActor {
  update(dt: number, time: number, lang: Language): TrainStatus;
  statusLine(status: TrainStatus, lang: Language): string;
  setLanguage(lang: Language): void;
}

const CAR_OFFSETS = [14.4, 0, -14.4];
const CAR_LENGTH = 13;
const BOARD_ALONG = 8.5;
const BOARD_NORMAL = 0.9;

export function createTrain(scene: THREE.Scene): TrainActor {
  const platform = buildPlatform();
  scene.add(platform.mesh);
  scene.add(platform.boardPost);

  const board = createBoard();
  scene.add(board.mesh);

  const cars: THREE.Group[] = [];
  const fadeMaterials: THREE.Material[] = [];
  for (let index = 0; index < CAR_OFFSETS.length; index++) {
    const car = createCar(index, fadeMaterials);
    scene.add(car);
    cars.push(car);
  }

  const passengers = createPassengers(scene);

  let language: Language = 'it';
  let boardTimer = 0;
  let lastLabel = '';

  const actor: TrainActor = {
    update(dt: number, time: number, lang: Language): TrainStatus {
      language = lang;
      const status = trainStatus(time);
      const distance = status.distance;
      const fade = distance > 126 ? THREE.MathUtils.clamp(1 - (distance - 126) / 30, 0, 1) : 1;
      const visible = status.phase !== 'away' && fade > 0.02;

      for (let index = 0; index < cars.length; index++) {
        const car = cars[index];
        car.visible = visible;
        if (!visible) continue;
        const point = pointAlongTrack(distance + CAR_OFFSETS[index]);
        car.position.set(point.x, 0.03, point.z);
        car.rotation.y = point.heading;
      }
      for (const material of fadeMaterials) {
        material.opacity = fade;
        material.depthWrite = fade > 0.95;
      }

      for (const [index, passenger] of passengers.entries()) {
        animateIdle(passenger, time + index * 1.7, 0.7);
      }

      boardTimer += dt;
      const label = boardText(status, language);
      if (boardTimer > 0.3 || label !== lastLabel) {
        boardTimer = 0;
        drawBoard(board, label, language);
        lastLabel = label;
      }
      return status;
    },
    statusLine(status: TrainStatus, lang: Language): string {
      const track = t('trainTrack', lang);
      const countdown = formatCountdown(status.nextIn);
      switch (status.phase) {
        case 'dwell':
          return `${track} · ${t('trainDepartsIn', lang)} ${countdown}`;
        case 'departing':
          return `${track} · ${t('trainDeparting', lang)}`;
        case 'away':
          return `${track} · ${t('trainNext', lang)} ${countdown}`;
        case 'arriving':
          return `${track} · ${t('trainArriving', lang)} ${countdown}`;
      }
    },
    setLanguage(lang: Language): void {
      language = lang;
      lastLabel = '';
    }
  };

  actor.setLanguage('it');
  return actor;
}

function buildPlatform(): { mesh: THREE.Mesh; boardPost: THREE.Mesh } {
  const stop = pointAlongTrack(TRAIN_STOP_DISTANCE);
  const heading = stop.heading;
  const normalX = -Math.cos(heading);
  const normalZ = Math.sin(heading);
  const centerX = TRAIN_PLATFORM.x;
  const centerZ = TRAIN_PLATFORM.z;
  const batch = new TriBatch();

  batch.box(3.2, 0.16, 58, centerX, 0.1, centerZ, 0xb9a887, heading);
  batch.box(3.4, 0.06, 58.4, centerX, 0.19, centerZ, 0xd3c29e, heading);
  for (const side of [-1, 1]) {
    batch.box(
      0.14,
      0.18,
      58,
      centerX + normalX * 1.64 * side,
      0.27,
      centerZ + normalZ * 1.64 * side,
      0xc9b791,
      heading
    );
  }
  for (const along of [-29, 29]) {
    batch.box(
      3.2,
      0.18,
      0.14,
      centerX + Math.sin(heading) * along,
      0.27,
      centerZ + Math.cos(heading) * along,
      0xc9b791,
      heading
    );
  }

  const shelter = 1.15;
  for (const side of [-1, 1]) {
    for (const along of [-2.4, 2.4]) {
      const x = centerX + normalX * shelter * side + Math.sin(heading) * along;
      const z = centerZ + normalZ * shelter * side + Math.cos(heading) * along;
      batch.box(0.12, 2.5, 0.12, x, 1.42, z, 0x5c5a50, heading);
    }
  }
  batch.box(
    2.6,
    0.14,
    6.2,
    centerX + normalX * shelter,
    2.72,
    centerZ + normalZ * shelter,
    0x7d5d47,
    heading
  );
  batch.box(
    2.8,
    0.08,
    6.4,
    centerX + normalX * shelter,
    2.82,
    centerZ + normalZ * shelter,
    0x9b7656,
    heading
  );

  const benchX = centerX + normalX * 0.85;
  const benchZ = centerZ + normalZ * 0.85;
  batch.box(1.7, 0.1, 0.42, benchX, 0.62, benchZ, 0x77563a, heading);
  batch.box(1.7, 0.4, 0.08, benchX + normalX * 0.25, 0.82, benchZ + normalZ * 0.25, 0x77563a, heading);
  for (const along of [-0.65, 0.65]) {
    batch.box(
      0.1,
      0.5,
      0.36,
      benchX + Math.sin(heading) * along,
      0.4,
      benchZ + Math.cos(heading) * along,
      0x4f3b28,
      heading
    );
  }

  const mesh = batch.build(staticMaterial());
  if (!mesh) throw new Error('Unable to build the station platform');
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const post = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 2.8, 0.12),
    new THREE.MeshLambertMaterial({ color: 0x47433a, flatShading: true })
  );
  post.position.set(
    centerX + normalX * BOARD_NORMAL + Math.sin(heading) * BOARD_ALONG,
    0.94,
    centerZ + normalZ * BOARD_NORMAL + Math.cos(heading) * BOARD_ALONG
  );
  return { mesh, boardPost: post };
}

interface BoardMesh {
  mesh: THREE.Mesh;
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
}

function createBoard(): BoardMesh {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 160;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.45), material);
  const stop = pointAlongTrack(TRAIN_STOP_DISTANCE);
  const heading = stop.heading;
  const normalX = -Math.cos(heading);
  const normalZ = Math.sin(heading);
  mesh.position.set(
    TRAIN_PLATFORM.x + normalX * BOARD_NORMAL + Math.sin(heading) * BOARD_ALONG,
    2.55,
    TRAIN_PLATFORM.z + normalZ * BOARD_NORMAL + Math.cos(heading) * BOARD_ALONG
  );
  mesh.rotation.y = Math.atan2(normalX, normalZ);
  drawBoard({ mesh, texture, canvas }, 'BINARIO 1 · FIDENZA', 'it');
  return { mesh, texture, canvas };
}

function drawBoard(board: BoardMesh, line: string, lang: Language): void {
  const ctx = board.canvas.getContext('2d');
  if (!ctx) return;
  const width = board.canvas.width;
  const height = board.canvas.height;
  ctx.fillStyle = '#1e2925';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#d9a441';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, width - 16, height - 16);

  ctx.fillStyle = '#b9c4b3';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '600 17px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText('BINARIO 1 · FIDENZA', 30, 28);

  ctx.fillStyle = '#f5ecd9';
  ctx.font = '700 38px Georgia, serif';
  ctx.fillText(t('trainBoardName', lang), 30, 71);

  ctx.fillStyle = '#d9a441';
  ctx.font = '600 25px ui-sans-serif, system-ui, sans-serif';
  ctx.fillText(line, 30, 124);
  board.texture.needsUpdate = true;
}

function createCar(index: number, materials: THREE.Material[]): THREE.Group {
  const group = new THREE.Group();
  const body = index % 2 ? 0xd8d0bd : 0xe2dac7;
  const accent = 0x5d7a68;
  const roof = 0x777264;
  const glass = 0x263235;
  const batch = new GeoBatch();

  batch.box(2.9, 2.35, CAR_LENGTH, 0, 1.55, 0, body);
  batch.box(2.94, 0.28, CAR_LENGTH + 0.2, 0, 2.78, 0, roof);
  batch.box(2.92, 0.36, CAR_LENGTH + 0.1, 0, 0.42, 0, accent);
  batch.box(3.0, 0.3, CAR_LENGTH + 0.16, 0, 3.0, 0, roof);

  for (let window = 0; window < 5; window++) {
    const z = -4.8 + window * 2.4;
    batch.box(0.06, 1.02, 1.55, -1.47, 1.86, z, glass);
    batch.box(0.06, 1.02, 1.55, 1.47, 1.86, z, glass);
  }
  batch.box(1.2, 0.96, 0.06, 0, 1.86, CAR_LENGTH / 2 + 0.01, glass);
  batch.box(1.2, 0.96, 0.06, 0, 1.86, -CAR_LENGTH / 2 - 0.01, glass);

  for (const z of [-4.6, 4.6]) {
    for (const x of [-1.14, 1.14]) {
      batch.cylinder(0.35, 0.35, 0.24, 8, x, 0.42, z, 0x2f2d27, 0, 0, Math.PI / 2);
    }
  }

  const material = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
    transparent: true
  });
  const bodyMesh = batch.build(material);
  if (bodyMesh) group.add(bodyMesh);
  materials.push(material);

  if (index === 0 || index === 2) {
    const lamps = new GeoBatch();
    if (index === 0) {
      lamps.box(0.24, 0.2, 0.06, -0.82, 0.72, CAR_LENGTH / 2 + 0.03, 0xfff1bd);
      lamps.box(0.24, 0.2, 0.06, 0.82, 0.72, CAR_LENGTH / 2 + 0.03, 0xfff1bd);
    } else {
      lamps.box(0.22, 0.18, 0.06, -0.82, 0.72, -CAR_LENGTH / 2 - 0.03, 0xb84230);
      lamps.box(0.22, 0.18, 0.06, 0.82, 0.72, -CAR_LENGTH / 2 - 0.03, 0xb84230);
    }
    const material = glowMaterial();
    material.transparent = true;
    const lampMesh = lamps.build(material);
    if (lampMesh) group.add(lampMesh);
    materials.push(material);
  }
  return group;
}

function createPassengers(scene: THREE.Scene): PersonRig[] {
  const stop = pointAlongTrack(TRAIN_STOP_DISTANCE);
  const heading = stop.heading;
  const normalX = -Math.cos(heading);
  const normalZ = Math.sin(heading);
  const facing = Math.atan2(-normalX, -normalZ);
  const defs = [
    { look: 'citizen1' as const, along: -3.6, side: 0.1, turn: 0.18 },
    { look: 'citizen3' as const, along: 2.2, side: -0.15, turn: -0.22 },
    { look: 'citizen2' as const, along: 6.6, side: 0.2, turn: 0.1 }
  ];
  return defs.map((def) => {
    const rig = createPerson(def.look);
    const x = TRAIN_PLATFORM.x + normalX * def.side + Math.sin(heading) * def.along;
    const z = TRAIN_PLATFORM.z + normalZ * def.side + Math.cos(heading) * def.along;
    rig.group.position.set(x, 0.23, z);
    rig.group.rotation.y = facing + def.turn;
    rig.group.scale.setScalar(0.94);
    const shadow = createBlobShadow(0.92);
    shadow.position.y = 0.005;
    rig.group.add(shadow);
    scene.add(rig.group);
    return rig;
  });
}


function boardText(status: TrainStatus, lang: Language): string {
  const countdown = formatCountdown(status.nextIn);
  switch (status.phase) {
    case 'dwell':
      return `${t('trainDepartsIn', lang).toUpperCase()} ${countdown}`;
    case 'departing':
      return t('trainDeparting', lang).toUpperCase();
    case 'away':
      return `${t('trainNext', lang).toUpperCase()} ${countdown}`;
    case 'arriving':
      return `${t('trainArriving', lang).toUpperCase()} ${countdown}`;
  }
}

function formatCountdown(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}
