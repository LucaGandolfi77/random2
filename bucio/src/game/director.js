import { R0, tierOf } from './hole.js';
import { updateAI } from './ai.js';
import { formatInt, clamp } from '../core/utils.js';
import { P } from '../world/palette.js';

export const MATCH_TIME = 120;
const GOLD_FIRST = 16;
const GOLD_EVERY = 22;

/**
 * Il regista della partita: timer, regole del divoramento, scontri fra buchi,
 * eventi dell'Oro e classifica finale.
 */
export class Director {
  constructor({ world, holes, brains, effects, audio, cam, hooks = {} }) {
    this.world = world;
    this.holes = holes;
    this.brains = brains;
    this.fx = effects;
    this.audio = audio;
    this.cam = cam;
    this.hooks = hooks;
    this.reset();
  }

  reset() {
    this.time = MATCH_TIME;
    this.elapsed = 0;
    this.ended = false;
    this.nextGold = GOLD_FIRST;
    this.golds = 0;
    this._buf = [];
    this._tickAt = -1;
    this._lastGlurp = 0;
    this.playerBestCombo = 0;
    this._lastDt = 1 / 60;
    for (const h of this.holes) {
      h.satiety = 0;
      h.lastVictim = null;
    }
  }

  get player() {
    return this.holes[0];
  }

  update(dt, now) {
    if (this.ended) return;
    this.elapsed += dt;
    this._lastDt = dt;
    this.time = Math.max(0, MATCH_TIME - this.elapsed);

    // ultimi secondi: il cuore batte
    const sec = Math.ceil(this.time);
    if (sec <= 10 && sec !== this._tickAt) {
      this._tickAt = sec;
      this.hooks.onTick?.(sec);
    }

    // IA sempre un passo indietro rispetto al giocatore
    for (let i = 0; i < this.brains.length; i++) {
      const b = this.brains[i];
      b.skill = clamp(b.base * (1 + (this.elapsed / MATCH_TIME) * 0.3), 0.4, 1.5);
      updateAI(this.holes[i + 1], b, dt, this.world, this.holes, now);
    }

    for (const h of this.holes) {
      h.idleT += dt;
      h.update(dt, now);
      if (h.newTier) this.hooks.onTier?.(h, h.newTier);
      if (h.justPulsed) {
        h.justPulsed = false;
        this.fx.ring(h.x, h.z, h.r * 0.9, h.r * 4.4, 0.85, h.isPlayer ? 0xfff0c4 : h.color);
        this.fx.pop(h.x, 0.3, h.z, h.color, 16, 1.6);
        if (h.isPlayer) {
          this.audio.pulse();
          this.cam.shake(0.45);
          this.hooks.onFeed?.('Ondata di gravità!', 'pulse');
        }
      }
      this._eatProps(h);
      this._pulseWave(h);
    }

    this._holeVersusHole();
    this._gold(now);

    if (this.time <= 0) this._end();
  }

  /* ------------------------------------------------------------ divoramento */

  _eatProps(h) {
    const buf = this._buf;
    buf.length = 0;
    this.world.query(h, buf);
    if (!buf.length) return;

    const isPlayer = h.isPlayer;
    // un buco enorme non può aspirare 20 oggetti per frame: si mangia a bocca piena
    const perFrame = h.r > 8 ? 8 : 14;
    let count = 0;
    for (const entry of buf) {
      if (count++ > perFrame) break;
      const item = entry.item;
      if (!item.alive) continue;
      const rec = item.rec;
      this.world.consume(item, h);
      h.addMass(item.def.mass);
      h.addScore(rec.points);
      h.eaten++;
      h.idleT = 0;

      const nearCam = Math.hypot(h.x - this.player.x, h.z - this.player.z) < 55;
      if (nearCam) {
        const color =
          item.def.gold ? P.gold : item.def.id === 'persona' ? P.rose : P.sand;
        this.fx.pop(item.x, item.y + 0.3, item.z, color, isPlayer ? 7 : 3, item.def.r * 0.5 + 0.5);
      }

      if (isPlayer) {
        h.bumpCombo();
        this.playerBestCombo = Math.max(this.playerBestCombo, h.combo);
        if (h.combo >= 3 && h.combo % 3 === 0) {
          this.audio.combo(h.combo);
          this.hooks.onCombo?.(h);
        }
        const nowMs = performance.now();
        if (nowMs - this._lastGlurp > 55) {
          this._lastGlurp = nowMs;
          this.audio.glurp(Math.min(12, h.combo), item.def.r > 1 ? 0.55 : 0.3);
        }
        if (item.def.r >= 1.6 || h.combo % 7 === 0) {
          // il numero compare sul bordo del buco: dentro la buca non si legge
          const ang = Math.atan2(item.z - h.z, item.x - h.x) || 0;
          const rr = Math.min(h.r * 0.8, Math.hypot(item.x - h.x, item.z - h.z) + 0.5);
          this.fx.text(
            h.x + Math.cos(ang) * rr,
            h.r * 0.45 + 1.4,
            h.z + Math.sin(ang) * rr,
            `+${rec.points}`,
            item.def.gold ? '#ffd15c' : '#fff',
            item.def.r >= 1.6 ? 1.6 : 1
          );
          this.hooks.onFeed?.(`${item.def.label}  +${rec.points}`, 'nominal');
        }
      }
      h.update(0, 0); // radius coerente al massimo entro lo stesso frame
    }

    // l'Oro
    const g = this.world.queryGold(h);
    if (g) {
      this.world.consumeGold(g, h);
      h.addMass(g.def.mass);
      h.addScore(500);
      h.eaten++;
      h.idleT = 0;
      h.bumpCombo();
      this.fx.ring(g.x, g.z, 0.5, g.def.r * 4, 0.7, P.gold);
      this.fx.pop(g.x, 1, g.z, P.gold, 26, 1.8);
      this.fx.text(g.x, g.def.r + 2.2, g.z, `ORO! +500`, '#ffd15c', 2.2);
      if (h.isPlayer) {
        this.audio.gold();
        this.cam.shake(0.6);
        this.hooks.onFeed?.(`Hai preso l'ORO: ${g.def.label}! +500`, 'gold');
        this.hooks.onGold?.(g);
      } else {
        this.hooks.onFeed?.(`${h.name} ha preso l'ORO!`, 'gold');
      }
    }
  }

  /* --------------------------------------------------------------- scontri */

  _holeVersusHole() {
    const hs = this.holes;
    for (const h of hs) if (h.satiety > 0) h.satiety -= this._lastDt;
    for (let i = 0; i < hs.length; i++) {
      for (let j = i + 1; j < hs.length; j++) {
        const a = hs[i];
        const b = hs[j];
        const d = Math.hypot(a.x - b.x, a.z - b.z);
        const reach = Math.min(a.r, b.r) * 0.78;
        if (d > reach || d === 0) continue;
        if (a.invuln > 0 || b.invuln > 0) continue;
        // dopo aver divorato qualcuno, un buco ha la pancia piena: niente doppio
        if (a.satiety <= 0 || a.lastVictim !== b) {
          if (a.mass > b.mass * 1.3) this._devour(a, b);
        }
        if (b.satiety <= 0 || b.lastVictim !== a) {
          if (b.mass > a.mass * 1.3) this._devour(b, a);
        }
      }
    }
  }

  _devour(win, lose) {
    const ratio = lose.mass / win.mass;
    const steal = Math.round(lose.score * (win.tier >= 3 ? 0.9 : 0.35));
    win.addMass(lose.mass * 0.42);
    win.addScore(steal);
    win.kills++;
    win.bumpCombo();
    win.satiety = 3.2;
    win.lastVictim = lose;

    // si perde massa, ma mai tutto: azzerare al minimo punirebbe troppo
    lose.mass = Math.max(lose.mass * 0.62, 1.25);
    lose.r = R0 * Math.sqrt(lose.mass);
    lose.invuln = 2.2;
    lose.stun = 0.5;
    lose.breakCombo();
    const dx = lose.x - win.x;
    const dz = lose.z - win.z;
    const dist = Math.hypot(dx, dz) || 1;
    // spinta lunga: il morso deve darti una vera possibilità di scappare
    const push = win.r * 1.5 + 5;
    lose.x += (dx / dist) * push;
    lose.z += (dz / dist) * push;
    lose.knock(dx, dz, 1.6);

    this.fx.ring(win.x, win.z, win.r * 0.4, win.r * 3, 0.55, 0xff5f5f);
    this.fx.pop(lose.x, 0.6, lose.z, 0x7a2030, 20, 1.5);
    this.fx.text(lose.x, lose.r * 0.5 + 1.6, lose.z, lose.name.toUpperCase(), '#ff9d9d', 1.7);
    this.cam.shake(win.isPlayer || lose.isPlayer ? 0.7 : 0.2);

    if (win.isPlayer) {
      this.audio.devour();
      this.fx.text(win.x, 2.2, win.z, `DIVORATO! +${steal}`, '#ff8080', 2);
      this.hooks.onFeed?.(`Hai divorato ${lose.name}! +${steal}`, 'kill');
      this.hooks.onBite?.(win);
    } else if (lose.isPlayer) {
      this.audio.bite();
      this.fx.text(lose.x, 2.2, lose.z, 'AHIA!', '#ff8080', 2);
      this.hooks.onFeed?.(`${win.name} ti ha morso: −${Math.round(ratio * 100)}% di massa`, 'hurt');
      this.hooks.onBite?.(lose);
    } else {
      this.hooks.onFeed?.(`${win.name} ha divorato ${lose.name}`, 'kill');
    }
  }

  /* ------------------------------------------------------------ onda di gravità */

  _pulseWave(h) {
    const p = h.pulse;
    if (!p) return;
    const k = clamp(p.t / p.dur, 0, 1);
    const prev = p.prevR ?? p.r;
    const wave = p.r * (1 + 3.4 * (1 - Math.pow(1 - k, 2.2)));
    p.prevR = wave;
    p.radius = wave;

    // rivali colpiti: storditi e sospinti
    for (const o of this.holes) {
      if (o === h || o.invuln > 0) continue;
      const d = Math.hypot(o.x - h.x, o.z - h.z);
      if (d < wave && d > prev - 1) {
        o.stun = 0.8;
        o.knock(o.x - h.x, o.z - h.z, 1.1);
      }
    }

    if (!h.isPlayer) return;
    // cibo risucchiato al passaggio dell'onda
    const buf = this._buf;
    buf.length = 0;
    this.world.scan(h.x, h.z, wave + 1, h.eatReach, (item, dist) => {
      if (dist <= wave + 0.6 && dist > prev - 2.5) {
        buf.push({ item, dist });
      }
    });
    for (const { item } of buf) {
      if (!item.alive) continue;
      const rec = item.rec;
      this.world.consume(item, h);
      h.addMass(item.def.mass);
      h.addScore(rec.points);
      h.eaten++;
      h.idleT = 0;
      this.fx.pop(item.x, item.y + 0.4, item.z, P.lemon, 5, 1.2);
    }
  }

  /* -------------------------------------------------------------------- oro */

  _gold(now) {
    if (this.elapsed < this.nextGold) return;
    this.nextGold += GOLD_EVERY;
    const g = this.world.spawnGold(now);
    if (g) {
      this.golds++;
      this.fx.ring(g.x, g.z, 0.5, 7, 0.8, P.gold);
      this.hooks.onGoldSpawn?.(g);
      this.hooks.onFeed?.(`È uscito l'ORO: ${g.def.label}! +500`, 'gold');
    }
  }

  /* ------------------------------------------------------------------ fine */

  _end() {
    this.ended = true;
    const ranking = [...this.holes].sort((a, b) => b.score - a.score);
    const p = this.player;
    const place = ranking.indexOf(p) + 1;
    this.audio.jingle(place === 1);
    this.hooks.onEnd?.({
      ranking: ranking.map((h, i) => ({
        place: i + 1,
        name: h.isPlayer ? 'Tu' : h.name,
        color: h.color,
        score: h.score,
        radius: h.r,
        isPlayer: h.isPlayer,
      })),
      player: {
        score: p.score,
        place,
        eaten: p.eaten,
        kills: p.kills,
        maxR: p.bestR,
        bestCombo: this.playerBestCombo,
        tier: tierOf(p.bestR),
      },
    });
  }

  /** Classifica live, ordinata per punti. */
  board() {
    return [...this.holes]
      .sort((a, b) => b.score - a.score)
      .map((h) => ({ name: h.isPlayer ? 'Tu' : h.name, color: h.color, score: h.score, isPlayer: h.isPlayer }));
  }
}
