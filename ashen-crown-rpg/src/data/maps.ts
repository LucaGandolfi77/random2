import type { MapDefinition } from '@/core/types';

const makeGrid = (w: number, h: number, fill: string) =>
  Array.from({ length: h }, () => Array.from({ length: w }, () => fill));

const border = (g: string[][], ch = '#') => {
  for (let x = 0; x < g[0].length; x++) {
    g[0][x] = ch;
    g[g.length - 1][x] = ch;
  }
  for (let y = 0; y < g.length; y++) {
    g[y][0] = ch;
    g[y][g[0].length - 1] = ch;
  }
};

const rect = (g: string[][], x: number, y: number, w: number, h: number, ch: string) => {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      if (g[yy]?.[xx] !== undefined) g[yy][xx] = ch;
    }
  }
};

const put = (g: string[][], x: number, y: number, ch: string) => {
  if (g[y]?.[x] !== undefined) g[y][x] = ch;
};

const rows = (g: string[][]) => g.map((r) => r.join(''));

const tallGrass = (g: string[][], points: [number, number][]) => {
  for (const [x, y] of points) put(g, x, y, ',');
};

// ─── Fallen Bastion ─────────────────────────────────────────────────────────
const bastion = makeGrid(22, 16, ';');
border(bastion);
rect(bastion, 1, 1, 20, 14, '.');
rect(bastion, 4, 7, 4, 3, '~');
rect(bastion, 2, 2, 3, 3, '#');
rect(bastion, 17, 2, 3, 2, '#');
rect(bastion, 12, 1, 4, 2, '^');
rect(bastion, 7, 4, 2, 1, '^');
rect(bastion, 2, 12, 4, 2, '^');
rect(bastion, 15, 11, 4, 2, '#');
rect(bastion, 11, 8, 2, 2, '^');
put(bastion, 5, 5, ',');
put(bastion, 6, 5, ',');
put(bastion, 16, 8, 'f');
put(bastion, 17, 8, 'f');

// ─── Greymoor ───────────────────────────────────────────────────────────────
const town = makeGrid(30, 22, ',');
border(town);
rect(town, 1, 9, 28, 3, 'r');
rect(town, 13, 1, 3, 20, 'r');
rect(town, 3, 3, 6, 4, '#');
rect(town, 21, 3, 6, 4, '#');
rect(town, 12, 2, 5, 4, '#');
rect(town, 22, 13, 6, 5, '#');
rect(town, 2, 1, 2, 2, 'T');
rect(town, 27, 1, 2, 2, 'T');
rect(town, 3, 13, 3, 2, '~');
rect(town, 6, 13, 2, 2, '~');
rect(town, 4, 17, 3, 2, 'T');
rect(town, 26, 18, 2, 2, 'T');
rect(town, 19, 17, 3, 1, 'T');
put(town, 8, 8, 'f');
put(town, 9, 8, 'f');
put(town, 18, 8, 'f');
put(town, 17, 12, 'f');
put(town, 18, 12, 'f');
for (let x = 10; x <= 22; x++) put(town, x, 15, 'r');
for (let y = 15; y <= 20; y++) put(town, 12, y, 'r');

// ─── Whispering Woods ───────────────────────────────────────────────────────
const woods = makeGrid(28, 24, ',');
border(woods);
// dense trees
for (let y = 1; y < 23; y++) {
  for (let x = 1; x < 27; x++) {
    if ((x * 7 + y * 11) % 9 === 0) put(woods, x, y, 'T');
  }
}
// clearings and paths
for (let y = 19; y >= 14; y--) put(woods, 5, y, ';');
for (let x = 5; x <= 9; x++) put(woods, x, 14, ';');
for (let y = 14; y >= 9; y--) put(woods, 9, y, ';');
for (let x = 9; x <= 16; x++) put(woods, x, 9, ';');
for (let y = 9; y >= 5; y--) put(woods, 16, y, ';');
for (let x = 16; x <= 24; x++) put(woods, x, 5, ';');
for (let x = 10; x <= 22; x++) put(woods, x, 18, ';');
for (let y = 18; y <= 21; y++) put(woods, 22, y, ';');
rect(woods, 6, 5, 5, 4, ';');
rect(woods, 12, 8, 4, 4, ';');
rect(woods, 8, 13, 4, 3, ';');
rect(woods, 18, 3, 5, 4, ';');
put(woods, 7, 6, 'f');
put(woods, 13, 9, 'f');
put(woods, 9, 15, 'f');
put(woods, 10, 6, 'f');
put(woods, 20, 4, 'f');
put(woods, 21, 12, 'f');
rect(woods, 24, 20, 2, 2, '~');
put(woods, 3, 20, ';');
put(woods, 4, 20, ';');

// ─── Sunken Temple ──────────────────────────────────────────────────────────
const temple = makeGrid(26, 22, '.');
border(temple);
rect(temple, 2, 16, 6, 4, '~');
rect(temple, 9, 13, 6, 3, '~');
rect(temple, 17, 2, 6, 4, '~');
rect(temple, 5, 3, 5, 2, '~');
rect(temple, 2, 6, 3, 3, '#');
rect(temple, 15, 7, 2, 5, '#');
rect(temple, 8, 17, 3, 2, '#');
rect(temple, 11, 4, 2, 1, '#');
rect(temple, 20, 10, 4, 2, '#');
for (let x = 1; x <= 24; x++) put(temple, x, 11, '=');
for (let y = 11; y <= 15; y++) put(temple, 8, y, '=');
put(temple, 4, 5, 'm');
put(temple, 12, 2, 'm');
put(temple, 23, 16, 'm');
put(temple, 3, 14, 'm');

// ─── Ashen Citadel ──────────────────────────────────────────────────────────
const citadel = makeGrid(26, 20, 'b');
border(citadel);
rect(citadel, 1, 1, 24, 18, 'b');
rect(citadel, 9, 2, 8, 5, '#');
rect(citadel, 2, 5, 4, 2, '^');
rect(citadel, 20, 5, 4, 2, '^');
rect(citadel, 4, 12, 4, 4, '#');
rect(citadel, 18, 12, 4, 4, '#');
for (let y = 7; y <= 18; y++) put(citadel, 13, y, 'r');
for (let x = 5; x <= 21; x++) put(citadel, x, 10, 'r');
rect(citadel, 11, 2, 4, 3, 'r');
rect(citadel, 11, 15, 4, 2, 'e');
put(citadel, 13, 3, 'e');
put(citadel, 6, 8, 'e');
put(citadel, 20, 8, 'e');
put(citadel, 22, 17, '^');

// ─── Interiors ──────────────────────────────────────────────────────────────
const interior = (w: number, h: number, fill = 'w') => {
  const g = makeGrid(w, h, fill);
  border(g);
  return g;
};

const inn = interior(14, 10);
rect(inn, 2, 2, 3, 2, '#');
rect(inn, 9, 2, 3, 3, '#');
for (let x = 2; x <= 11; x++) put(inn, x, 5, 'r');
put(inn, 7, 9, ';');

const manor = interior(14, 10, 'w');
rect(manor, 2, 2, 4, 2, '#');
rect(manor, 8, 2, 4, 1, '#');
for (let x = 2; x <= 11; x++) put(manor, x, 6, 'r');
put(manor, 7, 9, ';');

const shop = interior(14, 10, 'w');
rect(shop, 2, 2, 4, 2, '#');
rect(shop, 8, 2, 4, 2, '#');
for (let x = 2; x <= 11; x++) put(shop, x, 5, 'r');
put(shop, 7, 9, ';');

const chapel = interior(16, 12, '.');
border(chapel);
for (let x = 3; x <= 12; x++) put(chapel, x, 3, 'r');
for (let y = 3; y <= 9; y++) put(chapel, 8, y, 'r');
rect(chapel, 3, 5, 2, 3, '~');
rect(chapel, 11, 5, 2, 3, '~');
put(chapel, 8, 9, ';');
put(chapel, 2, 9, 'f');

const ruins = interior(20, 14, '.');
border(ruins);
rect(ruins, 4, 4, 4, 3, '#');
rect(ruins, 12, 4, 4, 3, '#');
rect(ruins, 6, 8, 2, 2, '^');
rect(ruins, 12, 8, 2, 2, '^');
for (let x = 3; x <= 16; x++) put(ruins, x, 6, ';');
for (let y = 6; y <= 12; y++) put(ruins, 10, y, ';');
put(ruins, 9, 12, ';');
put(ruins, 10, 12, ';');
put(ruins, 11, 12, ';');
put(ruins, 3, 11, 'f');
put(ruins, 16, 11, 'f');
put(ruins, 9, 3, 'm');
put(ruins, 10, 3, 'm');

export const maps: MapDefinition[] = [
  {
    id: 'fallen_bastion', name: 'The Fallen Bastion', region: 'The Ashen Marches', width: 22, height: 16,
    rows: rows(bastion), start: { x: 6, y: 13 }, ambience: 'bastion', music: 'bastion', weather: 'ash', dark: true,
    props: [
      { x: 3, y: 3, kind: 'ruin' }, { x: 17, y: 2, kind: 'ruin' }, { x: 14, y: 11, kind: 'ruin' },
      { x: 6, y: 8, kind: 'reed' }, { x: 7, y: 7, kind: 'reed' }, { x: 4, y: 12, kind: 'rubble' },
      { x: 12, y: 6, kind: 'crate' }, { x: 19, y: 13, kind: 'statue' }, { x: 16, y: 9, kind: 'brazier' }
    ],
    interactables: [
      { id: 'kaelen_bastion', x: 10, y: 10, kind: 'npc', label: 'Kaelen Voss', dialogueId: 'kaelen_bastion' },
      { id: 'bastion_chest', x: 4, y: 5, kind: 'chest', label: 'Weathered Chest', itemId: 'leather_armor', gold: 20, once: true },
      { id: 'bastion_note', x: 15, y: 12, kind: 'note', label: 'A Soldier’s Record', dialogueId: 'bastion_lore' },
      { id: 'bastion_shrine', x: 9, y: 13, kind: 'camp', label: 'Ruined Shrine' },
      { id: 'bastion_courtyard', x: 12, y: 6, kind: 'enemy', label: 'Ash Raiders', encounterId: 'enc_bastion_raiders', once: true, hint: 'Three figures pick through the rubble.' },
      { id: 'bastion_warden', x: 18, y: 6, kind: 'enemy', label: 'The Ash-Warden', encounterId: 'enc_ash_warden', once: true, requiresFlag: 'bastion_raiders_defeated', hint: 'Something enormous moves behind the gate.' },
      { id: 'bastion_exit', x: 20, y: 14, kind: 'exit', label: 'Road to Greymoor', toMap: 'greymoor', toX: 3, toY: 18, requiresFlag: 'bastion_warden_defeated' },
      { id: 'bastion_cache', x: 2, y: 14, kind: 'chest', label: 'Hidden Strongbox', itemId: 'ember_charm', gold: 35, hidden: true, dc: 13, stat: 'wis', once: true }
    ]
  },
  {
    id: 'greymoor', name: 'Greymoor Village', region: 'Greymoor Vale', width: 30, height: 22,
    rows: rows(town), start: { x: 3, y: 18 }, ambience: 'village', music: 'village', weather: 'rain', travelNode: true,
    props: [
      { x: 4, y: 4, kind: 'house' }, { x: 22, y: 4, kind: 'house' }, { x: 13, y: 3, kind: 'chapel' },
      { x: 23, y: 14, kind: 'manor' }, { x: 5, y: 14, kind: 'well' }, { x: 17, y: 8, kind: 'stall' },
      { x: 10, y: 17, kind: 'lamp' }, { x: 8, y: 12, kind: 'lamp' }, { x: 20, y: 12, kind: 'lamp' },
      { x: 2, y: 2, kind: 'tree' }, { x: 27, y: 2, kind: 'tree' }, { x: 4, y: 18, kind: 'tree' },
      { x: 26, y: 19, kind: 'tree' }, { x: 19, y: 17, kind: 'tree' }
    ],
    interactables: [
      { id: 'gm_halvard', x: 15, y: 9, kind: 'npc', label: 'Inquisitor Halvard', dialogueId: 'halvard_intro' },
      { id: 'gm_widow', x: 8, y: 12, kind: 'npc', label: 'Widow Enna', dialogueId: 'widow_enna' },
      { id: 'gm_child', x: 9, y: 14, kind: 'npc', label: 'Tam, the Bell-Watcher', dialogueId: 'tam_bell' },
      { id: 'gm_farmer', x: 21, y: 11, kind: 'npc', label: 'Farmer Orl', dialogueId: 'farmer_orl' },
      { id: 'gm_preacher', x: 7, y: 8, kind: 'npc', label: 'Choir Preacher', dialogueId: 'choir_preacher' },
      { id: 'gm_inn_door', x: 5, y: 8, kind: 'door', label: 'The Grey Lantern Inn', toMap: 'greymoor_inn', toX: 7, toY: 8 },
      { id: 'gm_shop_door', x: 23, y: 8, kind: 'door', label: 'Bree’s Provisions', toMap: 'greymoor_shop', toX: 7, toY: 8 },
      { id: 'gm_temple_door', x: 14, y: 7, kind: 'door', label: 'Chapel of the Unbroken Chain', toMap: 'greymoor_chapel', toX: 8, toY: 10 },
      { id: 'gm_manor_door', x: 24, y: 12, kind: 'door', label: 'The Reeve’s Manor', toMap: 'greymoor_manor', toX: 7, toY: 8 },
      { id: 'gm_woods_exit', x: 28, y: 11, kind: 'exit', label: 'Old Road to the Whispering Woods', toMap: 'whispering_woods', toX: 4, toY: 20 },
      { id: 'gm_bastion_exit', x: 1, y: 18, kind: 'exit', label: 'Road to the Fallen Bastion', toMap: 'fallen_bastion', toX: 19, toY: 14 },
      { id: 'gm_camp', x: 4, y: 11, kind: 'camp', label: 'Grey Lantern Campfire' },
      { id: 'gm_bell', x: 12, y: 14, kind: 'shrine', label: 'The Silent Bell', dialogueId: 'silent_bell' },
      { id: 'gm_notice', x: 17, y: 12, kind: 'note', label: 'Village Notices', dialogueId: 'greymoor_notices' },
      { id: 'gm_choir_cell', x: 25, y: 18, kind: 'enemy', label: 'Choir Safehouse', encounterId: 'enc_choir_cell', requiresFlag: 'choir_safehouse_open', once: true, hint: 'Hymns drift from the cellar.' },
      { id: 'gm_hidden_cache', x: 28, y: 16, kind: 'chest', label: 'A Loose Stone', itemId: 'tidal_ring', gold: 60, hidden: true, dc: 15, stat: 'int', once: true }
    ]
  },
  {
    id: 'greymoor_inn', name: 'The Grey Lantern Inn', region: 'Greymoor Village', width: 14, height: 10,
    rows: rows(inn), start: { x: 7, y: 8 }, ambience: 'village', music: 'village', weather: 'none',
    props: [{ x: 3, y: 3, kind: 'table' }, { x: 10, y: 3, kind: 'table' }, { x: 3, y: 6, kind: 'barrel' }, { x: 10, y: 6, kind: 'hearth' }],
    interactables: [
      { id: 'inn_nyx', x: 9, y: 6, kind: 'npc', label: 'Nyx Ardent', dialogueId: 'nyx_meet' },
      { id: 'inn_tomas', x: 4, y: 4, kind: 'npc', label: 'Tomas, the Innkeeper', dialogueId: 'tomas_inn' },
      { id: 'inn_rest', x: 11, y: 7, kind: 'camp', label: 'Rent a Room' },
      { id: 'inn_exit', x: 7, y: 9, kind: 'exit', label: 'Return to Greymoor', toMap: 'greymoor', toX: 5, toY: 9 },
      { id: 'inn_chest', x: 2, y: 8, kind: 'chest', label: 'Lost and Found', itemId: 'healing_potion', gold: 10, once: true }
    ]
  },
  {
    id: 'greymoor_manor', name: 'The Reeve’s Manor', region: 'Greymoor Village', width: 14, height: 10,
    rows: rows(manor), start: { x: 7, y: 8 }, ambience: 'village', music: 'village', weather: 'none',
    props: [{ x: 4, y: 3, kind: 'desk' }, { x: 9, y: 3, kind: 'shelf' }, { x: 10, y: 6, kind: 'hearth' }],
    interactables: [
      { id: 'manor_marla', x: 7, y: 4, kind: 'npc', label: 'Reeve Marla Grey', dialogueId: 'marla_reeve' },
      { id: 'manor_ledger', x: 4, y: 4, kind: 'chest', label: 'The Reeve’s Ledger', itemId: 'sealed_letter', once: true, hidden: true, dc: 14, stat: 'dex', hint: 'A locked drawer.' },
      { id: 'manor_exit', x: 7, y: 9, kind: 'exit', label: 'Return to Greymoor', toMap: 'greymoor', toX: 24, toY: 12 },
      { id: 'manor_note', x: 9, y: 3, kind: 'note', label: 'A Charred Letter', dialogueId: 'manor_letter' }
    ]
  },
  {
    id: 'greymoor_shop', name: 'Bree’s Provisions', region: 'Greymoor Village', width: 14, height: 10,
    rows: rows(shop), start: { x: 7, y: 8 }, ambience: 'village', music: 'village', weather: 'none',
    props: [{ x: 3, y: 3, kind: 'counter' }, { x: 10, y: 3, kind: 'shelf' }, { x: 3, y: 7, kind: 'crate' }, { x: 10, y: 7, kind: 'barrel' }],
    interactables: [
      { id: 'shop_bree', x: 7, y: 4, kind: 'merchant', label: 'Bree, the Provisioner', dialogueId: 'bree_shop' },
      { id: 'shop_exit', x: 7, y: 9, kind: 'exit', label: 'Return to Greymoor', toMap: 'greymoor', toX: 23, toY: 8 },
      { id: 'shop_chest', x: 11, y: 8, kind: 'chest', label: 'Bree’s Strongbox', itemId: 'greater_healing', gold: 30, once: true, hidden: true, dc: 16, stat: 'dex' }
    ]
  },
  {
    id: 'greymoor_chapel', name: 'Chapel of the Unbroken Chain', region: 'Greymoor Village', width: 16, height: 12,
    rows: rows(chapel), start: { x: 8, y: 10 }, ambience: 'village', music: 'chapel', weather: 'none',
    props: [{ x: 6, y: 4, kind: 'pew' }, { x: 9, y: 4, kind: 'pew' }, { x: 6, y: 7, kind: 'pew' }, { x: 9, y: 7, kind: 'pew' }],
    interactables: [
      { id: 'chapel_oren', x: 8, y: 4, kind: 'npc', label: 'Brother Oren Hale', dialogueId: 'oren_meet' },
      { id: 'chapel_altar', x: 8, y: 2, kind: 'shrine', label: 'Altar of the Nine', dialogueId: 'oren_altar' },
      { id: 'chapel_exit', x: 8, y: 11, kind: 'exit', label: 'Return to Greymoor', toMap: 'greymoor', toX: 14, toY: 7 },
      { id: 'chapel_chest', x: 13, y: 10, kind: 'chest', label: 'Chapel Poor-Box', itemId: 'pilgrim_beads', gold: 18, once: true }
    ]
  },
  {
    id: 'whispering_woods', name: 'The Whispering Woods', region: 'The Verdant Reach', width: 28, height: 24,
    rows: rows(woods), start: { x: 4, y: 20 }, ambience: 'forest', music: 'forest', weather: 'fireflies', travelNode: true,
    props: [
      { x: 5, y: 18, kind: 'root' }, { x: 7, y: 6, kind: 'stone' }, { x: 13, y: 9, kind: 'stone' },
      { x: 9, y: 15, kind: 'stone' }, { x: 16, y: 5, kind: 'arch' }, { x: 22, y: 4, kind: 'antler' },
      { x: 12, y: 18, kind: 'log' }, { x: 20, y: 12, kind: 'mushroom' }, { x: 2, y: 12, kind: 'tree' },
      { x: 26, y: 8, kind: 'tree' }, { x: 6, y: 21, kind: 'root' }
    ],
    interactables: [
      { id: 'woods_sable', x: 6, y: 18, kind: 'npc', label: 'Sable, Warden of the Reach', dialogueId: 'sable_meet' },
      { id: 'woods_note', x: 4, y: 14, kind: 'note', label: 'A Rootbound Warning', dialogueId: 'woods_note_lore' },
      { id: 'woods_rune_root', x: 7, y: 6, kind: 'rune', label: 'Rune of the Root', flagSet: 'rune_root' },
      { id: 'woods_rune_moth', x: 13, y: 9, kind: 'rune', label: 'Rune of the Moth', flagSet: 'rune_moth' },
      { id: 'woods_rune_crown', x: 9, y: 15, kind: 'rune', label: 'Rune of the Crown', flagSet: 'rune_crown' },
      { id: 'woods_wolves', x: 12, y: 18, kind: 'enemy', label: 'Mire Hounds', encounterId: 'enc_woods_hounds', once: true, hint: 'Low growls circle the path.' },
      { id: 'woods_silence', x: 22, y: 5, kind: 'enemy', label: 'The Antlered Silence', encounterId: 'enc_antlered_silence', once: true, requiresFlag: 'woods_runes_solved', hint: 'The grove has stopped making sound.' },
      { id: 'woods_ruins_door', x: 16, y: 9, kind: 'door', label: 'Othren Ruins', toMap: 'woods_ruins', toX: 10, toY: 12, requiresFlag: 'woods_runes_solved' },
      { id: 'woods_temple_gate', x: 24, y: 18, kind: 'puzzle', label: 'The Drowned Gate', dialogueId: 'woods_temple_gate' },
      { id: 'woods_altar', x: 20, y: 18, kind: 'camp', label: 'Rootbound Altar' },
      { id: 'hollow_merchant', x: 21, y: 18, kind: 'merchant', label: 'The Hollow Merchant', dialogueId: 'hollow_merchant', requiresFlag: 'hollow_merchant_hint' },
      { id: 'woods_cache', x: 25, y: 15, kind: 'chest', label: 'A Hollow in the Oak', itemId: 'rootwoven_vest', gold: 45, hidden: true, dc: 15, stat: 'int', once: true },
      { id: 'woods_shadow', x: 19, y: 12, kind: 'enemy', label: 'A Shadow with Sable’s Face', encounterId: 'enc_thorned_shade', once: true, requiresFlag: 'sable_quest_started', hint: 'It has been waiting for her.' },
      { id: 'woods_exit', x: 1, y: 20, kind: 'exit', label: 'Return to Greymoor', toMap: 'greymoor', toX: 27, toY: 11 }
    ]
  },
  {
    id: 'woods_ruins', name: 'The Rootbound Ruins', region: 'The Verdant Reach', width: 20, height: 14,
    rows: rows(ruins), start: { x: 10, y: 12 }, ambience: 'forest', music: 'ruins', weather: 'dust',
    props: [{ x: 4, y: 5, kind: 'ruin' }, { x: 12, y: 5, kind: 'ruin' }, { x: 9, y: 3, kind: 'altar' }, { x: 3, y: 10, kind: 'root' }, { x: 16, y: 10, kind: 'root' }],
    interactables: [
      { id: 'ruins_ilyra', x: 9, y: 5, kind: 'npc', label: 'Ilyra Morn', dialogueId: 'ilyra_meet' },
      { id: 'ruins_altar', x: 10, y: 3, kind: 'shrine', label: 'The First Archive', dialogueId: 'ilyra_revelation' },
      { id: 'ruins_chest', x: 15, y: 11, kind: 'chest', label: 'Archivist’s Satchel', itemId: 'warded_robes', gold: 50, once: true },
      { id: 'ruins_exit', x: 10, y: 12, kind: 'exit', label: 'Return to the Woods', toMap: 'whispering_woods', toX: 16, toY: 9 }
    ]
  },
  {
    id: 'sunken_temple', name: 'The Sunken Temple', region: 'The Drowned Coast', width: 26, height: 22,
    rows: rows(temple), start: { x: 4, y: 15 }, ambience: 'temple', music: 'temple', weather: 'dust', dark: true, travelNode: true,
    props: [{ x: 6, y: 4, kind: 'statue' }, { x: 18, y: 3, kind: 'statue' }, { x: 4, y: 8, kind: 'rubble' }, { x: 16, y: 8, kind: 'pillar' }, { x: 21, y: 11, kind: 'pillar' }, { x: 12, y: 16, kind: 'altar' }],
    interactables: [
      { id: 'temple_seal_1', x: 6, y: 5, kind: 'puzzle', label: 'Seal of Tides', dialogueId: 'temple_seal_tides' },
      { id: 'temple_seal_2', x: 12, y: 10, kind: 'puzzle', label: 'Seal of Memory', dialogueId: 'temple_seal_memory' },
      { id: 'temple_seal_3', x: 18, y: 6, kind: 'puzzle', label: 'Seal of Grief', dialogueId: 'temple_seal_grief' },
      { id: 'temple_trap_1', x: 7, y: 14, kind: 'trap', label: 'Pressure Plate', hidden: true, dc: 13, stat: 'int' },
      { id: 'temple_trap_2', x: 14, y: 7, kind: 'trap', label: 'Glyph of Reprisal', hidden: true, dc: 14, stat: 'int' },
      { id: 'temple_note', x: 3, y: 13, kind: 'note', label: 'A Drowned Prayer', dialogueId: 'temple_lore' },
      { id: 'temple_chest_1', x: 22, y: 16, kind: 'chest', label: 'Othren Reliquary', itemId: 'temple_plate', gold: 80, once: true },
      { id: 'temple_chest_2', x: 5, y: 2, kind: 'chest', label: 'Salt-Stained Chest', itemId: 'saints_tear', once: true, hidden: true, dc: 16, stat: 'wis' },
      { id: 'temple_guardians', x: 13, y: 17, kind: 'enemy', label: 'Temple Guardians', encounterId: 'enc_temple_guardians', once: true, requiresFlag: 'temple_seals_open', hint: 'Stone shapes turn their heads.' },
      { id: 'temple_saint', x: 21, y: 6, kind: 'enemy', label: 'The Drowned Saint', encounterId: 'enc_drowned_saint', once: true, requiresFlag: 'temple_seals_open', hint: 'A figure kneels in the flooded sanctum.' },
      { id: 'temple_exit_citadel', x: 24, y: 19, kind: 'exit', label: 'The Ashen Road', toMap: 'ashen_citadel', toX: 13, toY: 18, requiresFlag: 'drowned_saint_defeated' },
      { id: 'temple_exit_back', x: 1, y: 19, kind: 'exit', label: 'Back to the Woods', toMap: 'whispering_woods', toX: 22, toY: 20 },
      { id: 'temple_camp', x: 3, y: 15, kind: 'camp', label: 'Dry Alcove' }
    ]
  },
  {
    id: 'ashen_citadel', name: 'The Ashen Citadel', region: 'The Crownlands', width: 26, height: 20,
    rows: rows(citadel), start: { x: 13, y: 18 }, ambience: 'citadel', music: 'citadel', weather: 'ash', dark: true, travelNode: true,
    props: [{ x: 9, y: 3, kind: 'throne' }, { x: 12, y: 3, kind: 'throne' }, { x: 2, y: 6, kind: 'rubble' }, { x: 20, y: 6, kind: 'rubble' }, { x: 4, y: 13, kind: 'statue' }, { x: 18, y: 13, kind: 'statue' }, { x: 6, y: 8, kind: 'brazier' }, { x: 20, y: 8, kind: 'brazier' }],
    interactables: [
      { id: 'citadel_veyra', x: 13, y: 4, kind: 'npc', label: 'Magistrate Veyra Sol', dialogueId: 'veyra_final' },
      { id: 'citadel_camp', x: 4, y: 16, kind: 'camp', label: 'Last Camp' },
      { id: 'citadel_chest', x: 22, y: 16, kind: 'chest', label: 'Crown Guard Arsenal', itemId: 'crown_guard_mail', gold: 100, once: true },
      { id: 'citadel_note', x: 8, y: 11, kind: 'note', label: 'A King’s Last Decree', dialogueId: 'citadel_lore' },
      { id: 'citadel_crown', x: 13, y: 3, kind: 'puzzle', label: 'The Ashen Crown', dialogueId: 'ending_choice', requiresFlag: 'crownbound_defeated' },
      { id: 'citadel_echoes', x: 13, y: 8, kind: 'enemy', label: 'Crown Echoes', encounterId: 'enc_citadel_echoes', once: true, hint: 'Your own voices answer from the dark.' }
    ]
  }
];

export const mapById = Object.fromEntries(maps.map((m) => [m.id, m]));

export const travelNodes = [
  { id: 'greymoor', name: 'Greymoor Village', description: 'A village balanced between the Covenant and the Choir.', flag: 'discovered_greymoor' },
  { id: 'whispering_woods', name: 'The Whispering Woods', description: 'Old growth that remembers older names.', flag: 'discovered_woods' },
  { id: 'sunken_temple', name: 'The Sunken Temple', description: 'An Othren sanctum beneath the black water.', flag: 'discovered_temple' },
  { id: 'ashen_citadel', name: 'The Ashen Citadel', description: 'The seat of the Crown, and the wound in the world.', flag: 'discovered_citadel' }
];
