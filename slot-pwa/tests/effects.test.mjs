import test from 'node:test';
import assert from 'node:assert/strict';
import { Effects } from '../src/effects.js';
import { drawSymbol, SYMBOL_KEYS } from '../src/art/symbols.js';
import { drawBackground } from '../src/art/backgrounds.js';
import { MACHINES } from '../src/machines/index.js';
import { THEMES } from '../src/config.js';

function fakeCtx() {
  const noop = () => {};
  const gradient = { addColorStop: noop };
  return new Proxy({
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    measureText: () => ({ width: 10 }),
    canvas: { width: 540, height: 920 },
  }, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return noop;
    },
    set() { return true; },
  });
}

test('every machine symbol has a vector archetype', () => {
  const all = new Set(MACHINES.flatMap((m) => m.symbolList.map((s) => s.key)));
  for (const key of all) {
    assert.ok(SYMBOL_KEYS.includes(key), `missing vector art: ${key}`);
  }
});

test('drawSymbol renders every archetype without throwing', () => {
  const ctx = fakeCtx();
  for (const key of SYMBOL_KEYS) {
    assert.doesNotThrow(() => drawSymbol(ctx, key, 50, 50, 40, '#ffcc00'), key);
  }
});

test('drawBackground renders every theme without throwing', () => {
  const ctx = fakeCtx();
  for (const key of Object.keys(THEMES)) {
    assert.doesNotThrow(() => drawBackground(ctx, key, THEMES[key], 1234), key);
  }
});

test('effects: banners, flashes and particles expire', () => {
  const fx = new Effects();
  fx.banner('WIN', '#fff', 1);
  fx.flash('#fff', 0.5);
  fx.burst(50, 50, '#fff', 10);
  assert.equal(fx.banners.length, 1);
  assert.equal(fx.flashes.length, 1);
  assert.ok(fx.particles.length > 0);
  for (let i = 0; i < 200; i++) fx.update(0.05);
  assert.equal(fx.banners.length, 0);
  assert.equal(fx.flashes.length, 0);
  assert.equal(fx.particles.length, 0);
});

test('effects: celebration helpers populate state', () => {
  const fx = new Effects();
  fx.coinShower(270, 360);
  fx.confetti('#fff', 20);
  fx.fireworks('#fff', 2);
  fx.explode(100, 100, '#fff', 10);
  fx.signature('ocean', '#5ec8ff');
  fx.shakeScreen(10);
  assert.ok(fx.particles.length > 50);
  assert.ok(fx.shake > 0);
  assert.doesNotThrow(() => fx.draw(fakeCtx(), 540, 920));
});

test('effects: draw handles banners and flashes', () => {
  const fx = new Effects();
  fx.banner('MEGA WIN!', '#ffcc00', 3);
  fx.flash('#ffffff', 0.4);
  assert.doesNotThrow(() => fx.draw(fakeCtx(), 540, 920));
});

test('effects: bonus intro, wheel, chest, beams and lightning populate state', () => {
  const fx = new Effects();
  fx.bonusIntro('BONUS ROUND', '#ffcc00');
  fx.wheelSparks('#ffcc00');
  fx.chestReveal(150, 430, '+500', '#ffcc00');
  fx.beam('#fff6c0');
  fx.lightning('#bfe9ff');
  assert.ok(fx.particles.length > 40);
  assert.ok(fx.rays.length >= 2);
  assert.ok(fx.bolts.length === 3);
  assert.ok(fx.floaters.length >= 1);
  assert.doesNotThrow(() => fx.draw(fakeCtx(), 540, 920));
});

test('effects: win tiers escalate and particle count is capped', () => {
  for (const amount of [100, 900, 2500, 6000, 12000]) {
    const fx = new Effects();
    fx.tier(amount);
    assert.ok(fx.banners.length >= 1, String(amount));
    if (amount >= 10000) assert.ok(fx.bolts.length > 0);
  }
  const fx = new Effects();
  fx.maxParticles = 50;
  for (let i = 0; i < 20; i++) fx.coinShower(270, 380, '#fff', 50);
  assert.ok(fx.particles.length <= 50);
});

test('effects: floaters, rays and bolts expire', () => {
  const fx = new Effects();
  fx.floatText('+500', 100, 100);
  fx.beam('#fff');
  fx.lightning('#fff');
  for (let i = 0; i < 100; i++) fx.update(0.05);
  assert.equal(fx.floaters.length, 0);
  assert.equal(fx.rays.length, 0);
  assert.equal(fx.bolts.length, 0);
});
