import test from 'node:test';
import assert from 'node:assert/strict';

import { VILLAGERS } from '../js/data/villagers.js';
import {
  MAP_SIZE,
  PLAYER_START,
  VILLAGER_POSITIONS,
  LOCATIONS,
  OBSTACLES
} from '../js/data/village.js';

function insideRect(x, y, rect, margin = 0) {
  return (
    x >= rect.x - rect.w / 2 + margin &&
    x <= rect.x + rect.w / 2 - margin &&
    y >= rect.y - rect.h / 2 + margin &&
    y <= rect.y + rect.h / 2 - margin
  );
}

test('every villager has a map position inside the village', () => {
  for (const villager of VILLAGERS) {
    const position = VILLAGER_POSITIONS[villager.id];
    assert.ok(position, `missing map position for ${villager.id}`);
    assert.ok(position.x > 0 && position.x < MAP_SIZE.width, `${villager.id} is outside the map`);
    assert.ok(position.y > 0 && position.y < MAP_SIZE.height, `${villager.id} is outside the map`);
  }
});

test('the player starts inside the map and outside solid obstacles', () => {
  assert.ok(PLAYER_START.x > 0 && PLAYER_START.x < MAP_SIZE.width);
  assert.ok(PLAYER_START.y > 0 && PLAYER_START.y < MAP_SIZE.height);

  for (const obstacle of OBSTACLES) {
    assert.equal(
      insideRect(PLAYER_START.x, PLAYER_START.y, obstacle, 18),
      false,
      'player start overlaps an obstacle'
    );
  }
});

test('villagers stand outside solid obstacles', () => {
  for (const villager of VILLAGERS) {
    const position = VILLAGER_POSITIONS[villager.id];
    for (const obstacle of OBSTACLES) {
      assert.equal(
        insideRect(position.x, position.y, obstacle, 8),
        false,
        `${villager.id} stands inside an obstacle`
      );
    }
  }
});

test('the gate, road, chapel, charter and ferry interactions are placed on the map', () => {
  assert.equal(LOCATIONS.length, 5);
  for (const location of LOCATIONS) {
    assert.ok(location.x > 0 && location.x < MAP_SIZE.width);
    assert.ok(location.y > 0 && location.y < MAP_SIZE.height);
    assert.ok(location.radius > 0);
  }
  assert.deepEqual(
    LOCATIONS.map((location) => location.kind).sort(),
    ['chapel', 'charter', 'ferry', 'gate', 'road']
  );
});
