// ============================================================
// ENEMIES — Hazards, Boss Logic, Updates
// ============================================================
const ENEMIES = { list: [], boss: null };

function enemiesClear() {
  ENEMIES.list = [];
  ENEMIES.boss = null;
}

function enemiesUpdate(dt) {
  ENEMIES.list.forEach((h) => {
    switch (h.type) {
      case 'swing':
        h.obj.rotation.z = Math.sin(STATE.animTime * h.speed + h.offset) * 0.6;
        {
          const hp = h.obj.position.clone();
          hp.y -= 1.2;
          if (STATE.pos.distanceTo(hp) < 1.2) takeDamage();
        }
        break;
      case 'patrol':
        h.angle += h.speed * dt;
        h.obj.position.x = h.center.x + Math.cos(h.angle) * h.radius;
        h.obj.position.z = h.center.z + Math.sin(h.angle) * h.radius;
        h.obj.position.y = 0.6 + Math.sin(STATE.animTime * 3 + h.angle) * 0.2;
        if (STATE.pos.distanceTo(h.obj.position) < 0.9) takeDamage();
        break;
      case 'raindrop':
        h.obj.position.z += h.zDir * h.speed * dt;
        if (Math.abs(h.obj.position.z) > 20) {
          h.zDir *= -1;
          h.obj.position.x = (Math.random() - 0.5) * 28;
        }
        if (STATE.pos.distanceTo(h.obj.position) < 0.7) takeDamage();
        break;
      case 'boss':
        if (h.dead) break;
        h.phase += dt;
        {
          const toP = STATE.pos.clone().sub(h.obj.position);
          toP.y = 0;
          const dist = toP.length();
          if (dist > 3) {
            toP.normalize().multiplyScalar(1.8 * dt);
            h.obj.position.add(toP);
          }
          h.obj.position.y = 3 + Math.sin(h.phase) * 0.8;
          h.sheet.rotation.y = Math.sin(h.phase * 0.5) * 0.3;
          if (dist < 2 && STATE.invincible <= 0) {
            takeDamage();
            STATE.vel.add(toP.normalize().multiplyScalar(-6));
          }
        }
        break;
    }
  });
}

ENEMIES.getBoss = function() {
  return ENEMIES.boss;
};
