import test from 'node:test';
import assert from 'node:assert/strict';
import { prettyName, archetypeForTypes, typeDescription, typeLabel } from '../src/logic/dex.js';

test('slugs become readable names', () => {
  assert.equal(prettyName('chikorita'), 'Chikorita');
  assert.equal(prettyName('nidoran-f'), 'Nidoran♀');
  assert.equal(prettyName('nidoran-m'), 'Nidoran♂');
  assert.equal(prettyName('mr-mime'), 'Mr. Mime');
  assert.equal(prettyName('mime-jr'), 'Mime Jr.');
  assert.equal(prettyName('ho-oh'), 'Ho-Oh');
  assert.equal(prettyName('porygon-z'), 'Porygon-Z');
  assert.equal(prettyName('farfetchd'), "Farfetch'd");
  assert.equal(prettyName('flabebe'), 'Flabébé');
  assert.equal(prettyName('tapu-koko'), 'Tapu Koko');
  assert.equal(prettyName(''), '???');
});

test('archetypes follow the primary type', () => {
  assert.equal(archetypeForTypes(['water']), 'fish');
  assert.equal(archetypeForTypes(['flying']), 'bird');
  assert.equal(archetypeForTypes(['bug', 'flying']), 'insect');
  assert.equal(archetypeForTypes(['ground']), 'quadruped');
  assert.equal(archetypeForTypes(['???']), 'blob');
});

test('type descriptions are localized', () => {
  assert.match(typeDescription(['fire'], 'it'), /Fuoco/);
  assert.match(typeDescription(['fire'], 'en'), /Fire/);
  assert.equal(typeLabel('water', 'it'), 'Acqua');
});
