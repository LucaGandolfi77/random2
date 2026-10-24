import { VILLAGERS } from './data/villagers.js';
import { MAP_SIZE, BUILDINGS, ROADS, RIVER, FENCE } from './data/village.js';

const INK = 0x1f1a17;
const EMBER = 0xb4532a;
const PAPER = 0xe9e0cc;
const SKINS = [0xd9c6a8, 0xd3bd9d, 0xcbb28f, 0xe0cdb0];
const TONES = [0x2f3a3f, 0x3b3226, 0x2a3a31, 0x3a2f3a, 0x463a2a, 0x33404a];

function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function make(scene) {
  return scene.make.graphics({ add: false });
}

function generateBackground(scene) {
  const g = make(scene);
  const rand = rng(1207);
  g.fillStyle(PAPER, 1);
  g.fillRect(0, 0, 720, 1280);

  for (let i = 0; i < 46; i++) {
    const x = rand() * 720;
    const y = rand() * 1280;
    const r = 18 + rand() * 130;
    g.fillStyle(i % 5 === 0 ? 0xb8a486 : 0xd6c8ac, 0.04 + rand() * 0.05);
    g.fillCircle(x, y, r);
  }

  g.lineStyle(2, INK, 0.09);
  g.strokeRect(26, 26, 668, 1228);
  g.lineStyle(1, INK, 0.06);
  g.strokeRect(34, 34, 652, 1212);

  for (let i = 0; i < 8; i++) {
    g.lineStyle(1, INK, 0.03);
    g.lineBetween(50 + rand() * 620, 60 + rand() * 1100, 50 + rand() * 620, 60 + rand() * 1100);
  }

  g.generateTexture('bg', 720, 1280);
  g.destroy();
}

function drawHair(g, style, rand) {
  switch (style) {
    case 'bun':
      g.fillStyle(0x3a2f25, 1);
      g.fillEllipse(64, 30, 60, 28);
      g.fillCircle(64, 13, 11);
      break;
    case 'mess':
      g.fillStyle(0x33291f, 1);
      g.fillEllipse(64, 29, 58, 26);
      for (let i = 0; i < 6; i++) {
        const x = 40 + rand() * 48;
        g.fillTriangle(x, 22, x + 12, 10 + rand() * 10, x + 20, 30);
      }
      break;
    case 'bald':
      g.fillStyle(0x4a4038, 0.7);
      g.fillEllipse(36, 52, 14, 22);
      g.fillEllipse(92, 52, 14, 22);
      break;
    case 'short':
      g.fillStyle(0x3a2f25, 1);
      g.fillEllipse(64, 30, 58, 24);
      g.fillRoundedRect(36, 28, 56, 16, 8);
      break;
    case 'slick':
      g.fillStyle(0x2c241d, 1);
      g.fillEllipse(64, 30, 58, 22);
      g.lineStyle(2, 0x171310, 0.8);
      g.lineBetween(44, 28, 84, 22);
      break;
    case 'veil':
      g.fillStyle(0x2a2622, 0.95);
      g.fillEllipse(64, 28, 62, 26);
      g.fillRoundedRect(30, 34, 10, 54, 5);
      g.fillRoundedRect(88, 34, 10, 54, 5);
      break;
    case 'helmet':
      g.fillStyle(0x3b3f44, 1);
      g.fillEllipse(64, 30, 60, 26);
      g.fillRoundedRect(30, 30, 68, 12, 6);
      g.lineStyle(2, 0x6d747a, 0.6);
      g.lineBetween(64, 20, 64, 32);
      break;
    case 'braid':
      g.fillStyle(0x3a2f25, 1);
      g.fillEllipse(64, 30, 58, 24);
      for (let i = 0; i < 3; i++) g.fillCircle(92, 66 + i * 12, 7 - i);
      break;
    case 'ribbon':
      g.fillStyle(0x3a2f25, 1);
      g.fillEllipse(64, 30, 58, 24);
      g.fillStyle(EMBER, 1);
      g.fillTriangle(88, 18, 102, 12, 100, 26);
      g.fillTriangle(88, 18, 104, 24, 94, 32);
      break;
    default:
      break;
  }
}

function generatePortraits(scene) {
  for (const villager of VILLAGERS) {
    const g = make(scene);
    const rand = rng(villager.seed * 7919);
    const tone = TONES[villager.tone % TONES.length];
    const skin = SKINS[villager.tone % SKINS.length];

    g.fillStyle(0xe4d9c1, 1);
    g.fillCircle(64, 64, 61);
    g.fillStyle(tone, 0.12);
    g.fillCircle(30 + rand() * 60, 30 + rand() * 60, 22 + rand() * 26);

    g.fillStyle(tone, 1);
    g.fillRoundedRect(20, 96, 88, 48, 22);
    g.fillStyle(0xe9e0cc, 0.9);
    g.fillTriangle(64, 92, 50, 118, 78, 118);

    g.fillStyle(skin, 1);
    g.fillRect(56, 72, 16, 26);
    g.fillEllipse(64, 56, 54, 62);
    g.fillCircle(38, 60, 6);
    g.fillCircle(90, 60, 6);

    drawHair(g, villager.hair, rand);

    g.fillStyle(INK, 0.9);
    g.fillCircle(52, 58, 2.6);
    g.fillCircle(76, 58, 2.6);
    g.lineStyle(1.6, INK, 0.55);
    g.lineBetween(47, 51, 57, 50);
    g.lineBetween(71, 50, 81, 51);
    g.lineStyle(1.4, INK, 0.4);
    g.lineBetween(64, 60, 62, 66);
    g.lineStyle(1.6, INK, 0.45);
    g.lineBetween(57, 72, 71, 72);

    if (villager.age >= 55) {
      g.lineStyle(1, INK, 0.22);
      g.lineBetween(48, 45, 60, 44);
      g.lineBetween(68, 44, 80, 45);
      g.lineBetween(52, 78, 76, 78);
    }
    if (villager.age <= 20) {
      g.fillStyle(EMBER, 0.35);
      g.fillCircle(48, 67, 1.4);
      g.fillCircle(80, 67, 1.4);
    }

    g.lineStyle(2, INK, 0.22);
    g.strokeCircle(64, 64, 61);

    for (let i = 0; i < 5; i++) {
      g.fillStyle(INK, 0.08);
      g.fillCircle(rand() * 128, rand() * 128, 1 + rand() * 3);
    }

    g.generateTexture(`portrait_${villager.id}`, 128, 128);
    g.destroy();
  }
}

function drawClock(g, x, y, r) {
  g.lineStyle(2, EMBER, 0.9);
  g.strokeCircle(x, y, r);
  g.lineBetween(x, y, x, y - r * 0.7);
  g.lineBetween(x, y, x + r * 0.5, y + r * 0.3);
}

function generateEnemies(scene) {
  const clerk = make(scene);
  clerk.fillStyle(INK, 0.18);
  clerk.fillEllipse(80, 144, 100, 18);
  clerk.fillStyle(INK, 0.96);
  clerk.fillTriangle(80, 16, 24, 78, 136, 78);
  clerk.fillRoundedRect(38, 60, 84, 86, 18);
  clerk.fillStyle(0x0d0b09, 1);
  clerk.fillEllipse(80, 62, 36, 30);
  clerk.fillStyle(EMBER, 1);
  clerk.fillCircle(72, 60, 3);
  clerk.fillCircle(88, 60, 3);
  clerk.fillStyle(0xd8ccb2, 1);
  clerk.fillRoundedRect(58, 96, 44, 32, 4);
  clerk.lineStyle(1.4, INK, 0.5);
  clerk.lineBetween(64, 104, 96, 104);
  clerk.lineBetween(64, 111, 92, 111);
  clerk.lineBetween(64, 118, 88, 118);
  drawClock(clerk, 128, 34, 14);
  clerk.generateTexture('enemy_clerk', 160, 160);
  clerk.destroy();

  const hound = make(scene);
  hound.fillStyle(INK, 0.18);
  hound.fillEllipse(80, 146, 106, 18);
  hound.fillStyle(INK, 0.97);
  hound.fillEllipse(74, 96, 92, 48);
  hound.fillRect(38, 112, 10, 32);
  hound.fillRect(62, 114, 10, 30);
  hound.fillRect(86, 114, 10, 30);
  hound.fillRect(106, 112, 10, 32);
  hound.fillCircle(118, 66, 26);
  hound.fillTriangle(104, 50, 108, 20, 120, 46);
  hound.fillTriangle(126, 46, 140, 22, 138, 52);
  hound.fillEllipse(132, 72, 24, 14);
  hound.fillStyle(EMBER, 1);
  hound.fillCircle(120, 62, 3.2);
  hound.lineStyle(3, EMBER, 0.8);
  hound.lineBetween(104, 88, 126, 88);
  hound.lineStyle(2, INK, 0.9);
  hound.lineBetween(30, 84, 12, 66);
  hound.generateTexture('enemy_hound', 160, 160);
  hound.destroy();

  const wraith = make(scene);
  wraith.fillStyle(INK, 0.14);
  wraith.fillEllipse(80, 148, 96, 16);
  wraith.fillStyle(INK, 0.9);
  wraith.fillRoundedRect(52, 26, 56, 90, 26);
  wraith.fillStyle(INK, 0.65);
  wraith.fillEllipse(80, 126, 44, 30);
  wraith.fillStyle(INK, 0.35);
  wraith.fillEllipse(80, 142, 30, 20);
  wraith.fillStyle(INK, 0.95);
  wraith.fillEllipse(80, 44, 40, 34);
  wraith.fillStyle(EMBER, 1);
  wraith.fillCircle(72, 42, 3);
  wraith.fillCircle(88, 42, 3);
  drawClock(wraith, 80, 86, 22);
  wraith.lineStyle(1.6, INK, 0.7);
  wraith.lineBetween(54, 66, 34, 108);
  wraith.lineBetween(106, 66, 126, 108);
  wraith.generateTexture('enemy_wraith', 160, 160);
  wraith.destroy();

  const collector = make(scene);
  collector.fillStyle(INK, 0.2);
  collector.fillEllipse(80, 150, 110, 18);
  collector.fillStyle(0x171310, 0.98);
  collector.fillRoundedRect(46, 52, 68, 104, 18);
  collector.fillRect(58, 148, 14, 10);
  collector.fillRect(88, 148, 14, 10);
  collector.fillStyle(0x241e19, 1);
  collector.fillCircle(80, 40, 22);
  collector.fillStyle(INK, 1);
  collector.fillRect(48, 22, 64, 8);
  collector.fillRoundedRect(58, 10, 44, 16, 4);
  collector.fillStyle(EMBER, 1);
  collector.fillCircle(73, 40, 2.8);
  collector.fillCircle(87, 40, 2.8);
  collector.fillStyle(0x9c6c3a, 1);
  collector.fillRoundedRect(96, 92, 40, 28, 4);
  collector.lineStyle(2, 0xd9b879, 0.7);
  collector.lineBetween(100, 100, 132, 100);
  collector.lineBetween(100, 108, 124, 108);
  drawClock(collector, 80, 70, 15);
  collector.generateTexture('enemy_collector', 160, 160);
  collector.destroy();

  const notary = make(scene);
  notary.fillStyle(INK, 0.16);
  notary.fillEllipse(80, 148, 92, 16);
  notary.fillStyle(0x2a231d, 0.98);
  notary.fillRoundedRect(52, 48, 56, 102, 14);
  notary.fillStyle(INK, 0.95);
  notary.fillRect(42, 36, 76, 20);
  notary.fillStyle(0xd8ccb2, 1);
  notary.fillRoundedRect(56, 22, 48, 22, 4);
  notary.fillStyle(INK, 0.9);
  notary.fillRect(64, 28, 32, 3);
  notary.fillRect(64, 35, 24, 3);
  notary.fillStyle(EMBER, 1);
  notary.fillRect(74, 58, 12, 12);
  notary.fillStyle(0xd8ccb2, 1);
  notary.fillRoundedRect(86, 84, 38, 42, 4);
  notary.lineStyle(1.4, INK, 0.55);
  notary.lineBetween(92, 94, 118, 94);
  notary.lineBetween(92, 102, 114, 102);
  notary.lineBetween(92, 110, 108, 110);
  notary.lineStyle(2, INK, 0.7);
  notary.lineBetween(58, 66, 34, 112);
  notary.lineBetween(102, 66, 126, 112);
  notary.generateTexture('enemy_notary', 160, 160);
  notary.destroy();

  const yearEater = make(scene);
  yearEater.fillStyle(INK, 0.18);
  yearEater.fillEllipse(80, 148, 110, 16);
  yearEater.fillStyle(INK, 0.96);
  yearEater.fillEllipse(80, 104, 112, 70);
  yearEater.fillEllipse(80, 64, 78, 56);
  yearEater.fillStyle(0x0d0b09, 1);
  yearEater.fillEllipse(62, 66, 18, 24);
  yearEater.fillEllipse(98, 66, 18, 24);
  yearEater.fillEllipse(80, 100, 26, 18);
  yearEater.fillStyle(EMBER, 1);
  yearEater.fillCircle(62, 64, 3);
  yearEater.fillCircle(98, 64, 3);
  yearEater.lineStyle(3, EMBER, 0.75);
  yearEater.strokeEllipse(80, 100, 26, 18);
  for (let i = 0; i < 4; i += 1) {
    const x = 44 + i * 24;
    yearEater.fillStyle(0xd8ccb2, 0.9);
    yearEater.fillTriangle(x, 116, x + 10, 128, x + 20, 116);
  }
  yearEater.lineStyle(1.6, INK, 0.7);
  yearEater.lineBetween(30, 92, 10, 76);
  yearEater.lineBetween(130, 92, 150, 76);
  yearEater.generateTexture('enemy_yearEater', 160, 160);
  yearEater.destroy();

  const auditor = make(scene);
  auditor.fillStyle(INK, 0.18);
  auditor.fillEllipse(80, 150, 104, 16);
  auditor.fillStyle(0x24302e, 0.98);
  auditor.fillRoundedRect(48, 48, 64, 106, 16);
  auditor.fillStyle(0x171310, 1);
  auditor.fillCircle(80, 36, 24);
  auditor.fillStyle(0xd8ccb2, 1);
  auditor.fillRect(58, 22, 44, 8);
  auditor.fillStyle(EMBER, 1);
  auditor.fillCircle(72, 36, 3);
  auditor.fillCircle(88, 36, 3);
  auditor.fillStyle(0xd8ccb2, 1);
  auditor.fillRoundedRect(94, 82, 48, 36, 4);
  auditor.lineStyle(1.4, INK, 0.55);
  auditor.lineBetween(100, 92, 132, 92);
  auditor.lineBetween(100, 100, 126, 100);
  auditor.lineBetween(100, 108, 120, 108);
  auditor.lineStyle(2, 0x9c6c3a, 0.9);
  for (let i = 0; i < 5; i += 1) {
    auditor.strokeRect(34 + i * 8, 74 + i * 8, 16, 10);
  }
  auditor.lineStyle(2, INK, 0.7);
  auditor.lineBetween(56, 64, 26, 116);
  auditor.lineBetween(104, 64, 134, 116);
  auditor.generateTexture('enemy_auditor', 160, 160);
  auditor.destroy();

  const contract = make(scene);
  contract.fillStyle(INK, 0.14);
  contract.fillEllipse(80, 150, 90, 14);
  contract.fillStyle(0xe4d9c1, 0.98);
  contract.fillRoundedRect(38, 20, 84, 116, 6);
  contract.lineStyle(2, INK, 0.45);
  contract.strokeRoundedRect(38, 20, 84, 116, 6);
  contract.fillStyle(INK, 0.75);
  contract.fillRect(50, 34, 60, 4);
  contract.fillRect(50, 46, 46, 3);
  contract.fillRect(50, 56, 54, 3);
  contract.fillRect(50, 78, 58, 3);
  contract.fillRect(50, 88, 40, 3);
  contract.fillStyle(0x0d0b09, 1);
  contract.fillEllipse(80, 112, 34, 20);
  contract.fillStyle(EMBER, 1);
  contract.fillCircle(72, 110, 2.6);
  contract.fillCircle(88, 110, 2.6);
  contract.lineStyle(2, EMBER, 0.65);
  contract.lineBetween(62, 66, 98, 66);
  contract.lineBetween(50, 70, 38, 58);
  contract.lineBetween(110, 70, 122, 58);
  contract.generateTexture('enemy_contract', 160, 160);
  contract.destroy();
}


function roadAt(x, y) {
  return ROADS.some((r) => (
    Math.abs(x - r.x) < r.w / 2 + 6 &&
    Math.abs(y - r.y) < r.h / 2 + 6
  ));
}

function buildingAt(x, y) {
  return BUILDINGS.some((b) => (
    Math.abs(x - b.x) < b.w / 2 + 8 &&
    Math.abs(y - b.y) < b.h / 2 + 8
  ));
}

function drawTree(g, x, y, rand) {
  g.fillStyle(INK, 0.1);
  g.fillEllipse(x + 4, y + 22, 30, 9);
  g.lineStyle(3, 0x4a4038, 0.55);
  g.lineBetween(x, y + 8, x, y + 24);
  g.fillStyle(0x5f6e55, 0.3);
  g.fillCircle(x - 8, y - 2, 12 + rand() * 4);
  g.fillCircle(x + 8, y, 11 + rand() * 4);
  g.fillCircle(x, y - 12, 13 + rand() * 3);
  g.lineStyle(1, 0x3f5040, 0.22);
  g.strokeCircle(x, y - 8, 16);
}

function drawVillageBuilding(g, b) {
  const left = b.x - b.w / 2;
  const top = b.y - b.h / 2;
  const right = b.x + b.w / 2;
  const bottom = b.y + b.h / 2;

  g.fillStyle(INK, 0.12);
  g.fillEllipse(b.x + 4, bottom + 7, b.w * 0.86, 18);

  if (b.type === 'dock') {
    g.fillStyle(0xb99d72, 1);
    for (let i = 0; i < 6; i++) {
      g.fillRoundedRect(left, top + i * 11, b.w, 8, 2);
    }
    g.lineStyle(2, INK, 0.3);
    g.strokeRoundedRect(left, top, b.w, b.h, 4);
    g.lineStyle(3, 0x4a4038, 0.55);
    g.lineBetween(left + 14, top + 8, left + 14, bottom + 22);
    g.lineBetween(right - 14, top + 8, right - 14, bottom + 22);
    return;
  }

  if (b.type === 'well') {
    g.fillStyle(0xc7b696, 1);
    g.fillCircle(b.x, b.y, b.w / 2);
    g.lineStyle(3, INK, 0.4);
    g.strokeCircle(b.x, b.y, b.w / 2);
    g.fillStyle(0x526a68, 0.55);
    g.fillCircle(b.x, b.y, b.w / 3.4);
    g.lineStyle(2, PAPER, 0.4);
    g.strokeCircle(b.x, b.y, b.w / 4.4);
    g.lineStyle(2, INK, 0.35);
    g.lineBetween(b.x - b.w / 2 + 6, b.y - b.h / 2 + 6, b.x + b.w / 2 - 6, b.y - b.h / 2 + 6);
    return;
  }

  if (b.type === 'gate') {
    g.fillStyle(0xd8c9ab, 1);
    g.fillRoundedRect(left, top, b.w, b.h, 6);
    g.lineStyle(3, INK, 0.4);
    g.strokeRoundedRect(left, top, b.w, b.h, 6);
    for (let x = left + 8; x < right - 10; x += 42) {
      g.fillStyle(0xc5b291, 1);
      g.fillRect(x, top - 14, 24, 16);
      g.lineStyle(1, INK, 0.25);
      g.strokeRect(x, top - 14, 24, 16);
    }
    g.fillStyle(0x4d4035, 1);
    g.fillRoundedRect(b.x - 46, bottom - 66, 92, 66, 4);
    g.fillCircle(b.x, bottom - 66, 46);
    g.fillStyle(0x2a211b, 0.95);
    g.fillRoundedRect(b.x - 34, bottom - 60, 68, 60, 3);
    g.lineStyle(2, 0x9f8a6e, 0.55);
    for (let x = b.x - 28; x <= b.x + 28; x += 14) {
      g.lineBetween(x, bottom - 58, x, bottom - 4);
    }
    g.lineStyle(1, INK, 0.2);
    g.lineBetween(left + 18, top + b.h / 2, b.x - 52, top + b.h / 2);
    g.lineBetween(b.x + 52, top + b.h / 2, right - 18, top + b.h / 2);
    return;
  }

  g.fillStyle(0xe2d4b9, 1);
  g.fillRoundedRect(left, top, b.w, b.h, 6);
  g.lineStyle(2, INK, 0.32);
  g.strokeRoundedRect(left, top, b.w, b.h, 6);

  const roofTop = top - (b.type === 'chapel' ? 46 : 34);
  g.fillStyle(b.type === 'chapel' || b.type === 'archive' ? 0x40504a : 0x7f4a35, 1);
  g.fillTriangle(left - 12, top + 2, right + 12, top + 2, b.x, roofTop);
  g.lineStyle(2, INK, 0.35);
  g.strokeTriangle(left - 12, top + 2, right + 12, top + 2, b.x, roofTop);

  if (b.type === 'chapel') {
    g.fillStyle(0xe2d4b9, 1);
    g.fillRect(b.x - 22, roofTop - 54, 44, 64);
    g.lineStyle(2, INK, 0.35);
    g.strokeRect(b.x - 22, roofTop - 54, 44, 64);
    g.fillStyle(0x40504a, 1);
    g.fillTriangle(b.x - 30, roofTop - 54, b.x + 30, roofTop - 54, b.x, roofTop - 82);
    g.lineStyle(2, INK, 0.5);
    g.lineBetween(b.x, roofTop - 94, b.x, roofTop - 72);
    g.lineBetween(b.x - 9, roofTop - 86, b.x + 9, roofTop - 86);
    g.fillStyle(0x4d4035, 1);
    g.fillRoundedRect(b.x - 18, bottom - 52, 36, 52, 2);
    g.fillStyle(EMBER, 0.7);
    g.fillCircle(b.x, top + 24, 8);
    g.lineStyle(1, INK, 0.3);
    g.strokeCircle(b.x, top + 24, 11);
  } else {
    g.fillStyle(0x4d4035, 1);
    g.fillRoundedRect(b.x - 16, bottom - 44, 32, 44, 2);
    g.fillStyle(0x8da09b, 0.55);
    g.fillRect(left + 18, top + 34, 26, 22);
    g.fillRect(right - 44, top + 34, 26, 22);
    g.lineStyle(1, INK, 0.28);
    g.strokeRect(left + 18, top + 34, 26, 22);
    g.strokeRect(right - 44, top + 34, 26, 22);

    if (b.type === 'bakery') {
      g.fillStyle(0x6b4b39, 1);
      g.fillRect(right - 42, roofTop - 20, 18, 42);
      g.fillStyle(0xcba36a, 1);
      g.fillCircle(b.x, top + 16, 11);
      g.lineStyle(1, INK, 0.35);
      g.strokeCircle(b.x, top + 16, 11);
    } else if (b.type === 'shop') {
      g.fillStyle(EMBER, 0.75);
      for (let i = 0; i < 5; i++) {
        g.fillRect(left + 8 + i * 28, top + 8, 14, 13);
      }
      g.lineStyle(2, INK, 0.3);
      g.lineBetween(left + 6, top + 22, right - 6, top + 22);
    } else if (b.type === 'archive') {
      g.fillStyle(0x40504a, 0.85);
      g.fillRect(b.x - 52, bottom - 18, 104, 7);
      g.fillStyle(0xd8c9ab, 1);
      g.fillRect(b.x - 34, bottom - 46, 10, 32);
      g.fillRect(b.x + 24, bottom - 46, 10, 32);
      g.lineStyle(1, INK, 0.25);
      g.strokeRect(b.x - 34, bottom - 46, 10, 32);
      g.strokeRect(b.x + 24, bottom - 46, 10, 32);
      g.fillStyle(EMBER, 0.65);
      g.fillCircle(b.x, top + 18, 7);
    } else if (b.type === 'ribbon-house') {
      g.lineStyle(2, 0x4a4038, 0.55);
      g.lineBetween(right - 6, top, right - 6, top - 36);
      g.fillStyle(EMBER, 0.85);
      g.fillTriangle(right - 6, top - 36, right + 22, top - 29, right - 6, top - 20);
    }
  }

  if (b.type === 'house') {
    g.fillStyle(0xcbb894, 0.6);
    g.fillRect(left + 8, bottom + 4, b.w - 16, 8);
  }
}

function generateVillageMap(scene) {
  const g = make(scene);
  const rand = rng(9021);
  const { width, height } = MAP_SIZE;

  g.fillStyle(PAPER, 1);
  g.fillRect(0, 0, width, height);

  for (let i = 0; i < 72; i++) {
    g.fillStyle(i % 4 === 0 ? 0xb8a486 : 0xd6c8ac, 0.035 + rand() * 0.05);
    g.fillCircle(rand() * width, rand() * height, 16 + rand() * 110);
  }

  g.lineStyle(2, INK, 0.09);
  g.strokeRect(14, 14, width - 28, height - 28);
  g.lineStyle(1, INK, 0.05);
  g.strokeRect(22, 22, width - 44, height - 44);

  g.fillStyle(0xb6ae8a, 0.14);
  g.fillRoundedRect(40, 1320, 300, 230, 10);
  g.fillRoundedRect(380, 1350, 260, 200, 10);
  g.lineStyle(1, 0x6e7458, 0.18);
  for (let y = 1340; y < 1540; y += 16) {
    g.lineBetween(52, y, 328, y);
    g.lineBetween(392, y + 10, 628, y + 10);
  }

  g.fillStyle(0x7f9693, 0.32);
  g.fillRect(RIVER.x - RIVER.w / 2, 0, RIVER.w, RIVER.h);
  g.lineStyle(1, 0x4d6b68, 0.24);
  for (let y = 14; y < height; y += 34) {
    const x = RIVER.x;
    g.lineBetween(x - 20, y, x + 4, y + 10);
    g.lineBetween(x + 4, y + 10, x + 26, y);
  }
  g.lineStyle(2, 0x4d6b68, 0.2);
  g.lineBetween(RIVER.x - RIVER.w / 2, 0, RIVER.x - RIVER.w / 2, height);

  for (const road of ROADS) {
    g.fillStyle(0xcbb894, 0.72);
    g.fillRoundedRect(road.x - road.w / 2, road.y - road.h / 2, road.w, road.h, 18);
    g.lineStyle(1, INK, 0.09);
    g.strokeRoundedRect(road.x - road.w / 2, road.y - road.h / 2, road.w, road.h, 18);
  }

  for (let i = 0; i < 160; i++) {
    const x = 24 + rand() * (width - 48);
    const y = 170 + rand() * 1070;
    if (roadAt(x, y) || buildingAt(x, y) || x > RIVER.x - RIVER.w / 2 - 8) continue;
    g.lineStyle(1, 0x5f6e55, 0.18);
    g.lineBetween(x, y, x - 3, y - 6);
    g.lineBetween(x, y, x + 4, y - 5);
  }

  for (let i = 0; i < 44; i++) {
    const x = 30 + rand() * (width - 60);
    const y = 190 + rand() * 1040;
    if (roadAt(x, y) || buildingAt(x, y) || x > RIVER.x - RIVER.w / 2 - 20) continue;
    drawTree(g, x, y, rand);
  }

  for (const building of BUILDINGS) drawVillageBuilding(g, building);

  g.fillStyle(0x6b5847, 0.75);
  for (let x = 12; x < width; x += 42) {
    g.fillRect(x, FENCE.y - 10, 5, 30);
  }
  g.lineStyle(2, INK, 0.24);
  g.lineBetween(10, FENCE.y - 7, width - 10, FENCE.y - 7);
  g.lineBetween(10, FENCE.y - 1, width - 10, FENCE.y - 1);

  g.lineStyle(2, 0x4a4038, 0.6);
  g.lineBetween(104, 1128, 104, 1178);
  g.fillStyle(0xd8c9ab, 1);
  g.fillRoundedRect(72, 1112, 64, 26, 4);
  g.lineStyle(1, INK, 0.3);
  g.strokeRoundedRect(72, 1112, 64, 26, 4);
  g.lineStyle(1, INK, 0.25);
  g.lineBetween(84, 1121, 124, 1121);
  g.lineBetween(84, 1129, 112, 1129);

  g.lineStyle(1, INK, 0.22);
  g.strokeCircle(650, 1450, 34);
  g.lineBetween(650, 1424, 650, 1476);
  g.lineBetween(624, 1450, 676, 1450);
  g.fillStyle(EMBER, 0.7);
  g.fillTriangle(650, 1416, 642, 1434, 658, 1434);

  g.lineStyle(1, INK, 0.08);
  for (let i = 0; i < 8; i++) {
    g.lineBetween(24 + rand() * 620, 24 + rand() * 1200, 24 + rand() * 620, 24 + rand() * 1200);
  }

  g.generateTexture('village_map', width, height);
  g.destroy();
}

function drawWren(g, phase) {
  const lift = phase === 1 ? 1 : 0;
  const step = phase === 2 ? 1 : 0;
  const x = 18;

  g.fillStyle(INK, 0.14);
  g.fillEllipse(x, 51, 24, 7);

  g.lineStyle(3, INK, 0.9);
  g.lineBetween(x - 5, 43, x - 6 - step * 2, 51);
  g.lineBetween(x + 5, 43, x + 6 + step * 2, 51);

  g.fillStyle(0x2f3a3f, 1);
  g.fillRoundedRect(x - 10, 19 - lift, 20, 29, 7);
  g.fillStyle(0x3b3226, 1);
  g.fillRoundedRect(x - 8, 18 - lift, 16, 8, 4);

  g.fillStyle(0xd9c6a8, 1);
  g.fillCircle(x, 13 - lift, 7);
  g.fillStyle(0x241e19, 1);
  g.fillEllipse(x, 8 - lift, 19, 9);
  g.fillRoundedRect(x - 9, 6 - lift, 18, 6, 3);

  g.fillStyle(EMBER, 0.95);
  g.fillRoundedRect(x + 7, 27 - lift, 9, 11, 2);
  g.lineStyle(1, PAPER, 0.7);
  g.lineBetween(x + 10, 30 - lift, x + 13, 30 - lift);
  g.lineBetween(x + 10, 33 - lift, x + 13, 33 - lift);

  g.lineStyle(2, INK, 0.55);
  g.lineBetween(x - 9, 30 - lift, x - 13, 37 - lift);
  g.lineBetween(x + 9, 30 - lift, x + 13, 37 - lift);
}

function generateWren(scene) {
  for (const [key, phase] of [['wren_idle', 0], ['wren_walk_a', 1], ['wren_walk_b', 2]]) {
    const g = make(scene);
    drawWren(g, phase);
    g.generateTexture(key, 36, 54);
    g.destroy();
  }
}

function generatePixel(scene) {
  if (scene.textures.exists('pixel')) return;
  const g = make(scene);
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 1, 1);
  g.generateTexture('pixel', 1, 1);
  g.destroy();
}

export function generateAll(scene) {
  generateBackground(scene);
  generatePortraits(scene);
  generateEnemies(scene);
  generateVillageMap(scene);
  generateWren(scene);
  generatePixel(scene);
}
