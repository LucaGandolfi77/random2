import { hasLineOfSight, inVisionCone } from './collision.js';
import { ENEMIES } from './config.js';

export function enemyDefinition(enemy) {
  return ENEMIES[enemy.type] || ENEMIES.thug;
}

export function canSeePlayer(level, enemy, player, maxDistance) {
  if (enemy.dead || player.dead) return false;
  const def = enemyDefinition(enemy);
  const range = maxDistance ?? def.vision ?? 120;
  const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
  if (distance > range) return false;
  if (!inVisionCone(enemy, player, range, enemy.fov ?? def.fov ?? 1.1)) return false;
  return hasLineOfSight(level, enemy.x, enemy.y, player.x, player.y);
}

export function seeTarget(state, enemy, player) {
  if (canSeePlayer(state.level, enemy, player)) {
    enemy.awareness = Math.min(1, enemy.awareness + state.lastDt * 1.6);
    enemy.lastSeen = { x: player.x, y: player.y };
    enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    if (enemy.awareness >= 1) {
      if (enemy.state !== 'combat') {
        enemy.state = 'combat';
        enemy.alertTimer = 0;
        state.events.push({ type: 'alert', x: enemy.x, y: enemy.y });
      }
      return true;
    }
  } else {
    enemy.awareness = Math.max(0, enemy.awareness - state.lastDt * 0.22);
  }
  return false;
}

export function patrolTarget(enemy) {
  if (!enemy.patrol || enemy.patrol.length === 0) return null;
  return enemy.patrol[enemy.patrolIndex % enemy.patrol.length];
}

export function advancePatrol(enemy) {
  if (!enemy.patrol || enemy.patrol.length === 0) return;
  enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrol.length;
}
