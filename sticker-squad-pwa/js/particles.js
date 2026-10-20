// ============================================================
// PARTICLES — Pooled burst effects + Pooled decal stickers
// (roadmap: object pooling = zero GC hitches)
// ============================================================
const PARTICLES = { pool: [], active: [] };

function particlesBurst(x, y, z, color, count = 10) {
  for (let i = 0; i < count; i++) {
    let p = PARTICLES.pool.pop();
    if (!p) {
      p = new THREE.Mesh(
        new THREE.PlaneGeometry(0.08, 0.08),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
      );
    }
    p.material.color.setHex(color);
    p.visible = true;
    p.position.set(x, y, z);
    if (!p.userData.vel) p.userData.vel = new THREE.Vector3();
    p.userData.vel.set((Math.random() - 0.5) * 4, Math.random() * 4, (Math.random() - 0.5) * 4);
    p.userData.life = 1.0;
    p.rotation.z = Math.random() * 6.28;
    STICKER.scene.add(p);
    PARTICLES.active.push(p);
  }
}

function particlesUpdate(dt) {
  for (let i = PARTICLES.active.length - 1; i >= 0; i--) {
    const p = PARTICLES.active[i];
    p.position.addScaledVector(p.userData.vel, dt);
    p.userData.vel.y -= 5 * dt;
    p.userData.life -= dt;
    p.rotation.z += dt * 5;
    p.scale.setScalar(Math.max(0.001, p.userData.life * 0.1));
    if (p.userData.life <= 0) {
      STICKER.scene.remove(p);
      p.visible = false;
      PARTICLES.active.splice(i, 1);
      PARTICLES.pool.push(p); // recycle — no allocations mid-game
    }
  }
}

// ── DECALS — pooled placed stickers (max 64, oldest recycled) ──
const DECALS = { pool: [], active: [], max: 64 };

const DECAL_COLORS = [0xff3366, 0x33ff66, 0x6633ff];

function decalPlace(pos, normal, colorHex) {
  let entry = DECALS.pool.pop();
  if (!entry) {
    entry = {
      mesh: new THREE.Mesh(
        new THREE.CircleGeometry(0.28, 6),
        new THREE.MeshBasicMaterial({ color: colorHex, side: THREE.DoubleSide })
      ),
      age: 0,
    };
  }
  entry.mesh.material.color.setHex(colorHex);
  entry.mesh.visible = true;
  entry.mesh.position.copy(pos).add(normal.clone().multiplyScalar(0.025));
  entry.mesh.lookAt(pos.clone().add(normal));
  entry.mesh.scale.setScalar(0.01);
  entry.age = 0;
  STICKER.worldGroup.add(entry.mesh);
  DECALS.active.push(entry);

  if (DECALS.active.length > DECALS.max) {
    const old = DECALS.active.shift();
    STICKER.worldGroup.remove(old.mesh);
    DECALS.pool.push(old);
  }
}

function decalsUpdate(dt) {
  for (const e of DECALS.active) {
    e.age += dt;
    e.mesh.scale.setScalar(Math.min(1, e.age * 6));
  }
}

function decalsReset() {
  DECALS.active.forEach((e) => {
    STICKER.worldGroup.remove(e.mesh);
    DECALS.pool.push(e);
  });
  DECALS.active = [];
}
