import { C, W, H } from './core.js';

export function createJoystick(scene, opts = {}) {
  const zoneTop = opts.zoneTop !== undefined ? opts.zoneTop : 930;
  const baseRadius = opts.baseRadius || 66;
  const knobRadius = opts.knobRadius || 30;
  const maxDistance = opts.maxDistance || 50;
  const onActivate = opts.onActivate;

  const zone = scene.add.zone(W / 2, (zoneTop + H) / 2, W, H - zoneTop)
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(800)
    .setInteractive();

  const base = scene.add.graphics().setScrollFactor(0).setDepth(900).setVisible(false);
  const knob = scene.add.graphics().setScrollFactor(0).setDepth(901).setVisible(false);

  base.fillStyle(C.paper, 0.78);
  base.fillCircle(0, 0, baseRadius);
  base.lineStyle(3, C.ink, 0.45);
  base.strokeCircle(0, 0, baseRadius);
  base.lineStyle(1, C.ink, 0.18);
  base.strokeCircle(0, 0, baseRadius - 12);
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i;
    base.lineBetween(
      Math.cos(angle) * (baseRadius - 8),
      Math.sin(angle) * (baseRadius - 8),
      Math.cos(angle) * (baseRadius - 20),
      Math.sin(angle) * (baseRadius - 20)
    );
  }

  knob.fillStyle(C.ember, 1);
  knob.fillCircle(0, 0, knobRadius);
  knob.lineStyle(3, C.paper, 0.72);
  knob.strokeCircle(0, 0, knobRadius);
  knob.lineStyle(1, C.ink, 0.28);
  knob.strokeCircle(0, 0, knobRadius - 7);

  let active = false;
  let activeId = -1;
  let centerX = 0;
  let centerY = 0;
  let fading = null;
  const vector = { x: 0, y: 0 };

  const clampCenter = (pointer) => {
    const margin = baseRadius + 12;
    centerX = Phaser.Math.Clamp(pointer.x, margin, W - margin);
    centerY = Phaser.Math.Clamp(pointer.y, zoneTop + margin, H - margin);
  };

  const updateKnob = (pointer) => {
    const dx = pointer.x - centerX;
    const dy = pointer.y - centerY;
    const length = Math.hypot(dx, dy);

    if (length < 7) {
      vector.x = 0;
      vector.y = 0;
      knob.setPosition(centerX, centerY);
      return;
    }

    const clamped = Math.min(length, maxDistance);
    knob.setPosition(
      centerX + (dx / length) * clamped,
      centerY + (dy / length) * clamped
    );

    const magnitude = Math.min(1, length / maxDistance);
    vector.x = (dx / length) * magnitude;
    vector.y = (dy / length) * magnitude;
  };

  const reset = () => {
    if (!active && !base.visible) {
      vector.x = 0;
      vector.y = 0;
      return;
    }
    active = false;
    activeId = -1;
    vector.x = 0;
    vector.y = 0;
    if (fading) {
      fading.stop();
      fading = null;
    }
    scene.tweens.killTweensOf([base, knob]);
    fading = scene.tweens.add({
      targets: [base, knob],
      alpha: 0,
      duration: 120,
      onComplete: () => {
        base.setVisible(false);
        knob.setVisible(false);
        fading = null;
      }
    });
  };

  const onDown = (pointer) => {
    if (active) return;
    if (pointer.y < zoneTop) return;
    active = true;
    activeId = pointer.id;
    clampCenter(pointer);
    base.setPosition(centerX, centerY);
    knob.setPosition(centerX, centerY);
    base.setAlpha(0).setVisible(true);
    knob.setAlpha(0).setVisible(true);
    if (fading) {
      fading.stop();
      fading = null;
    }
    scene.tweens.add({ targets: [base, knob], alpha: 1, duration: 110 });
    updateKnob(pointer);
    onActivate?.();
  };

  const onMove = (pointer) => {
    if (!active || pointer.id !== activeId) return;
    updateKnob(pointer);
  };

  const release = (pointer) => {
    if (!active) return;
    if (pointer && pointer.id !== activeId) return;
    reset();
  };

  const releaseAny = () => {
    if (active) reset();
  };

  zone.on('pointerdown', onDown);
  scene.input.on('pointermove', onMove);
  scene.input.on('pointerup', release);
  scene.input.on('pointerupoutside', release);
  scene.input.on('gameout', releaseAny);

  return {
    zone,
    base,
    knob,
    get active() {
      return active;
    },
    get vector() {
      return vector;
    },
    reset,
    destroy() {
      reset();
      zone.off('pointerdown', onDown);
      scene.input.off('pointermove', onMove);
      scene.input.off('pointerup', release);
      scene.input.off('pointerupoutside', release);
      scene.input.off('gameout', releaseAny);
      zone.destroy();
      base.destroy();
      knob.destroy();
    }
  };
}
