// ============================================================
// SQUAD — Recruitment UI & Squad Logic
// ============================================================
const SQUAD = { members: [] };

function squadInit() {
  squadUpdateUI();
  // Tap any squad slot to command the squad (mobile has no Q key)
  document.getElementById('squad-bar').addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    squadCommandFollow();
  });
}

function squadUpdateUI() {
  const bar = document.getElementById('squad-bar');
  bar.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const slot = document.createElement('div');
    slot.className = 'squad-slot' + (i < SQUAD.members.length ? ' filled' : '');
    slot.textContent = i < SQUAD.members.length ? '⭐' : '';
    bar.appendChild(slot);
  }
}

function squadRecruit(target) {
  target.following = true;
  target.followTimer = 6;
  if (SQUAD.members.length < 3) {
    SQUAD.members.push(target);
    squadUpdateUI();
  }
  uiShowCommand('RECRUITED: Squad member follows!');
  beep(680, 0.1, 'square');
}

function squadCommandFollow() {
  uiShowCommand('SQUAD: Follow me!');
  SQUAD.members.forEach((s) => { s.following = true; s.followTimer = 6; });
  beep(550, 0.12, 'square');
}

function squadUpdate(dt) {
  SQUAD.members.forEach((s, i) => {
    if (!s.following) return;
    const targetPos = STATE.pos.clone().add(new THREE.Vector3(Math.sin(i * 2.1) * 1.5, 0, Math.cos(i * 2.1) * 1.5));
    const toP = targetPos.sub(s.body.position);
    toP.y = 0;
    const d = toP.length();
    if (d > 0.5) {
      toP.normalize().multiplyScalar(2.5 * dt);
      s.body.position.add(toP);
      s.head.position.add(toP);
      s.baseY = s.body.position.y;
    }
    s.head.position.y = s.baseY + 1.1 + Math.sin(STATE.animTime * 3 + i) * 0.05;
    // Squad helps attack boss in backpack
    if (STATE.levelIndex === 4) {
      const boss = ENEMIES.getBoss();
      if (boss && !boss.dead && s.body.position.distanceTo(boss.obj.position) < 3) {
        boss.hp -= dt * 0.5;
        if (boss.hp <= 0) { boss.dead = true; uiShowCommand('SQUAD DEFEATED BOSS!'); beep(440, 0.3, 'sine'); }
      }
    }
  });
}
