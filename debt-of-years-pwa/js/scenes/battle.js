import { label, panel, button, dialog, listPicker, yearPicker, toast, C, W, H } from '../ui/core.js';
import { getState } from '../systems/store.js';
import { saveState } from '../systems/save.js';
import { ENEMIES, CHAPTER_ENCOUNTERS, FINAL_ENCOUNTERS } from '../data/enemies.js';
import { SPELLS } from '../data/spells.js';
import {
  drawYears,
  healHero,
  hurtHero,
  grantHeroYears,
  useFavor,
  getVillager
} from '../systems/ledger.js';
import { livingVillagers } from '../systems/state.js';
import { computeEnding } from '../systems/endings.js';
import { FINALE_WIN } from '../data/story.js';
import { sfx } from '../audio.js';

const INK = C.ink;
const EMBER = C.ember;

export default class BattleScene extends Phaser.Scene {
  constructor() {
    super('Battle');
  }

  init(data) {
    this.finale = (data && data.finale) || (data && data.boss ? 'collector' : null);
    this.boss = !!this.finale;
    this.over = false;
    this.turn = 'intro';
    this.guarding = false;
    this.logLines = [];
  }

  create() {
    const state = getState();
    const encounters = CHAPTER_ENCOUNTERS[state.chapter] || [];
    this.encounter = this.finale ? FINAL_ENCOUNTERS[this.finale] : encounters[state.flags.encounters];

    if (!this.encounter) {
      this.returnToHub();
      return;
    }

    state.stats.battlesFought += 1;

    this.enemies = this.encounter.enemies.map((key) => {
      const base = ENEMIES[key];
      return {
        ...base,
        key,
        hp: base.hp,
        maxHp: base.hp,
        alive: true,
        skip: false,
        view: null
      };
    });

    this.add.image(W / 2, H / 2, 'bg');
    label(this, 60, 42, this.boss ? 'THE GATE' : 'THE ROAD', 15, C.emberText);
    label(this, 60, 66, this.encounter.title, 28, C.inkText);
    label(this, 660, 58, `Day ${state.day}`, 16, C.softText, { originX: 1 });

    this.enemyLayer = this.add.container(0, 0);
    this.renderEnemies();

    panel(this, W / 2, 604, 624, 152, { fill: C.paperLight, lineAlpha: 0.2, radius: 14 });
    label(this, 78, 542, 'WHAT HAPPENS', 13, C.emberText);
    this.logText = label(this, 78, 562, '', 17, C.inkText, {
      wrap: 570,
      lineSpacing: 6
    });

    panel(this, W / 2, 754, 624, 120, { fill: C.paperLight, lineAlpha: 0.2, radius: 14 });
    this.heroName = label(this, 82, 716, state.hero.name, 21, C.inkText);
    this.heroHpText = label(this, 82, 744, '', 15, C.softText);
    this.heroYears = label(this, 630, 716, '', 22, C.inkText, { originX: 1 });
    this.heroYearsSub = label(this, 630, 748, 'years of your own', 13, C.softText, { originX: 1 });
    this.heroHpBar = this.add.graphics();
    this.drawHeroHp();

    this.attackButton = button(this, {
      x: 180, y: 890, w: 300, h: 86,
      text: 'Attack',
      subtext: 'Costs nothing.',
      fontSize: 25,
      onClick: () => this.attack()
    });
    this.guardButton = button(this, {
      x: 540, y: 890, w: 300, h: 86,
      text: 'Guard',
      subtext: 'The next blow lands softer.',
      fontSize: 25,
      onClick: () => this.guard()
    });
    this.spellButton = button(this, {
      x: 180, y: 992, w: 300, h: 86,
      text: 'Spell',
      subtext: 'Costs years. Choose who pays.',
      fontSize: 25,
      fill: C.emberDark,
      onClick: () => this.openSpells()
    });
    this.favorButton = button(this, {
      x: 540, y: 992, w: 300, h: 86,
      text: 'Favor',
      subtext: 'A gift from a villager.',
      fontSize: 25,
      fill: C.paperDark,
      color: C.inkText,
      onClick: () => this.openFavors()
    });
    this.actions = [this.attackButton, this.guardButton, this.spellButton, this.favorButton];

    label(this, W / 2, 1068, 'Attack is free. Magic is paid by a person.', 16, C.softText, {
      originX: 0.5
    });
    label(this, W / 2, 1100, 'The ledger records every name.', 15, C.fadedText, {
      originX: 0.5
    });

    this.setActionsEnabled(false);
    this.pushLog(this.encounter.intro[0] || 'The road waits.');
    saveState(state);

    dialog(this, {
      lines: this.encounter.intro.map((text, i) => ({ who: i === 0 ? 'narrator' : 'narrator', text })),
      onDone: () => {
        this.logLines = [this.encounter.intro[0] || 'The road waits.'];
        this.refreshLog();
        this.startPlayerTurn();
      }
    });
  }

  aliveEnemies() {
    return this.enemies.filter((e) => e.alive);
  }

  renderEnemies() {
    this.enemyLayer.removeAll(true);
    const count = this.enemies.length;
    this.enemies.forEach((enemy, index) => {
      const x = count === 1 ? W / 2 : (index === 0 ? 210 : 510);
      const y = count === 1 ? 320 : 310;
      const container = this.add.container(x, y);

      const shadow = this.add.graphics();
      shadow.fillStyle(INK, 0.13);
      shadow.fillEllipse(0, 118, 120, 18);

      const img = this.add.image(0, 0, `enemy_${enemy.key}`).setScale(this.boss ? 1.35 : 1);

      const name = label(this, 0, this.boss ? 108 : 96, enemy.name, this.boss ? 22 : 18, C.inkText, {
        originX: 0.5
      });
      const hpBar = this.add.graphics();
      const hpText = label(this, 0, this.boss ? 146 : 134, '', 13, C.softText, { originX: 0.5 });

      container.add([shadow, img, name, hpBar, hpText]);
      this.enemyLayer.add(container);

      enemy.view = { container, hpBar, hpText, name, img };
      this.drawEnemyHp(enemy);
    });
  }

  drawEnemyHp(enemy) {
    const view = enemy.view;
    if (!view) return;
    const w = this.boss ? 210 : 170;
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    view.hpBar.clear();
    view.hpBar.fillStyle(0xc9b998, 0.75);
    view.hpBar.fillRoundedRect(-w / 2, this.boss ? 130 : 118, w, 9, 4);
    if (ratio > 0) {
      view.hpBar.fillStyle(enemy.alive ? EMBER : C.inkSoft, 1);
      view.hpBar.fillRoundedRect(-w / 2, this.boss ? 130 : 118, Math.max(9, w * ratio), 9, 4);
    }
    view.hpText.setText(`${enemy.hp} / ${enemy.maxHp}`);
    view.container.setAlpha(enemy.alive ? 1 : 0.28);
  }

  drawHeroHp() {
    const state = getState();
    const w = 190;
    const ratio = Math.max(0, state.hero.hp / state.hero.maxHp);
    this.heroHpBar.clear();
    this.heroHpBar.fillStyle(0xc9b998, 0.75);
    this.heroHpBar.fillRoundedRect(410 - w / 2, 750, w, 11, 5);
    if (ratio > 0) {
      this.heroHpBar.fillStyle(ratio <= 0.3 ? EMBER : C.inkSoft, 1);
      this.heroHpBar.fillRoundedRect(410 - w / 2, 750, Math.max(11, w * ratio), 11, 5);
    }
    this.heroHpText.setText(`Vitality ${state.hero.hp} / ${state.hero.maxHp}`);
    this.heroYears.setText(`${state.hero.years} years`);
  }

  updateHero() {
    this.drawHeroHp();
  }

  pushLog(text) {
    this.logLines.push(text);
    if (this.logLines.length > 6) this.logLines.shift();
    this.refreshLog();
  }

  refreshLog() {
    if (!this.logText) return;
    this.logText.setText(this.logLines.slice(-3).join('\n'));
  }

  setActionsEnabled(enabled) {
    for (const action of this.actions || []) action.setEnabled(enabled);
  }

  startPlayerTurn() {
    if (this.over) return;
    this.turn = 'player';
    this.guarding = false;
    this.setActionsEnabled(true);
  }

  afterPlayerAction(delay = 500) {
    if (this.over) return;
    this.turn = 'busy';
    this.setActionsEnabled(false);
    this.updateHero();
    if (this.aliveEnemies().length === 0) {
      this.time.delayedCall(delay, () => this.win());
      return;
    }
    this.time.delayedCall(delay, () => this.enemyTurn());
  }

  attack() {
    if (this.turn !== 'player') return;
    const target = this.aliveEnemies()[0];
    if (!target) {
      this.win();
      return;
    }
    const damage = 8 + Phaser.Math.Between(0, 4);
    this.damageEnemy(target, damage);
    this.pushLog(`You strike the ${target.name} for ${damage}. Attack costs nothing.`);
    sfx('hit');
    this.afterPlayerAction(420);
  }

  guard() {
    if (this.turn !== 'player') return;
    this.guarding = true;
    this.pushLog('You guard. The next blow will land softer.');
    sfx('tap');
    this.afterPlayerAction(400);
  }

  damageEnemy(enemy, amount) {
    enemy.hp = Math.max(0, enemy.hp - amount);
    if (enemy.hp === 0) {
      enemy.alive = false;
      enemy.skip = false;
      this.pushLog(`The ${enemy.name} comes apart like a page.`);
    }
    this.drawEnemyHp(enemy);
  }

  canPay(cost) {
    const state = getState();
    if (state.hero.years >= cost) return true;
    return livingVillagers(state).some((v) => v.consent !== 'protected' && v.years >= cost);
  }

  openSpells() {
    if (this.turn !== 'player') return;
    this.setActionsEnabled(false);
    const items = SPELLS.map((spell) => ({
      label: `${spell.name} — ${spell.cost} year${spell.cost === 1 ? '' : 's'}`,
      subtext: spell.desc,
      disabled: !this.canPay(spell.cost),
      onPick: () => this.castSpell(spell.id)
    }));
    listPicker(this, {
      title: 'Spells',
      subtitle: 'Every price is paid by a person. Choose the spell first.',
      items,
      onCancel: () => {
        if (this.turn === 'player') this.setActionsEnabled(true);
      }
    });
  }

  castSpell(id) {
    const spell = SPELLS.find((s) => s.id === id);
    if (!spell) return;
    const state = getState();
    yearPicker(this, {
      state,
      cost: spell.cost,
      onPick: (payerId) => this.payAndCast(spell, payerId),
      onCancel: () => {
        if (this.turn === 'player') this.setActionsEnabled(true);
      }
    });
  }

  payAndCast(spell, payerId) {
    const state = getState();
    const result = drawYears(state, payerId, spell.cost, `the spell ${spell.name}`);
    if (!result.ok) {
      toast(this, 'The ledger refuses. No one can pay.', { color: C.creamText });
      if (this.turn === 'player') this.setActionsEnabled(true);
      return;
    }

    sfx('draw');
    const villager = payerId === 'hero' ? null : getVillager(state, payerId);
    const payerName = payerId === 'hero' ? 'You' : (villager ? villager.name : 'Someone');
    this.pushLog(`${payerName} pay${payerId === 'hero' ? '' : 's'} ${spell.cost} year${spell.cost === 1 ? '' : 's'} for ${spell.name}.`);

    if (result.died) {
      if (result.self) {
        this.pushLog('The last of your own years goes into the spell.');
      } else if (result.forgotten) {
        this.pushLog(`${villager.name} is gone, and the town cannot say why.`);
      } else {
        this.pushLog(`${villager.name} does not get up.`);
      }
    }

    const target = this.aliveEnemies()[0];
    if (spell.kind === 'heal') {
      healHero(state, spell.power);
      this.pushLog(`Mend knits ${spell.power} vitality back into you.`);
      sfx('heal');
    } else if (spell.kind === 'damage' && target) {
      this.damageEnemy(target, spell.power);
      this.pushLog(`${spell.name} deals ${spell.power} to the ${target.name}.`);
      sfx('hit');
    } else if (spell.kind === 'skip' && target) {
      target.skip = true;
      this.pushLog(`Hush. The ${target.name} loses its next turn.`);
      sfx('page');
    }

    this.updateHero();
    saveState(state);

    if (state.hero.years <= 0) {
      this.turn = 'busy';
      this.setActionsEnabled(false);
      this.time.delayedCall(900, () => this.endWithEnding());
      return;
    }

    this.afterPlayerAction(520);
  }

  openFavors() {
    if (this.turn !== 'player') return;
    const state = getState();
    const available = livingVillagers(state).filter((v) => !v.favorUsed);
    if (available.length === 0) {
      toast(this, 'No favors left. The village has given enough.', { color: C.creamText });
      return;
    }

    this.setActionsEnabled(false);
    const items = available.map((villager) => ({
      label: `${villager.favor.name} — ${villager.name}`,
      subtext: `${villager.favor.text}  (${effectText(villager.favor)})`,
      onPick: () => this.useFavorItem(villager.id)
    }));

    listPicker(this, {
      title: 'Favors',
      subtitle: 'A favor costs no years. It costs the person something else.',
      items,
      onCancel: () => {
        if (this.turn === 'player') this.setActionsEnabled(true);
      }
    });
  }

  useFavorItem(villagerId) {
    const state = getState();
    const villager = getVillager(state, villagerId);
    const result = useFavor(state, villagerId);
    if (!result.ok) return;

    const favor = result.favor;
    let line = '';

    if (favor.effect === 'heal') {
      healHero(state, favor.power);
      line = `${villager.name}'s ${favor.name} restores ${favor.power} vitality.`;
      sfx('heal');
    } else if (favor.effect === 'healMax') {
      state.hero.maxHp += favor.power;
      healHero(state, favor.power);
      line = `${villager.name}'s ${favor.name} raises your ceiling and warms you.`;
      sfx('heal');
    } else if (favor.effect === 'skip') {
      const target = this.aliveEnemies()[0];
      if (target) {
        target.skip = true;
        line = `${villager.name}'s ${favor.name}. The ${target.name} pauses.`;
      } else {
        line = `${villager.name}'s ${favor.name}. There is nothing left to pause.`;
      }
      sfx('page');
    } else if (favor.effect === 'years') {
      grantHeroYears(state, favor.power);
      line = `${villager.name} ties the ribbon on your wrist. You feel ${favor.power} years come back.`;
      sfx('heal');
    } else if (favor.effect === 'flee') {
      this.pushLog(`${villager.name}'s ${favor.name}. You leave the road.`);
      this.updateHero();
      saveState(state);
      sfx('page');
      this.turn = 'busy';
      this.setActionsEnabled(false);
      this.time.delayedCall(850, () => this.returnToHub());
      return;
    }

    this.pushLog(line);
    this.updateHero();
    saveState(state);
    this.afterPlayerAction(420);
  }

  enemyTurn() {
    if (this.over) return;
    this.turn = 'enemy';
    const enemies = this.aliveEnemies();
    let index = 0;

    const step = () => {
      if (this.over) return;
      if (index >= enemies.length) {
        this.time.delayedCall(350, () => {
          if (!this.over) this.startPlayerTurn();
        });
        return;
      }

      const enemy = enemies[index];
      index += 1;

      if (!enemy.alive) {
        step();
        return;
      }

      if (enemy.skip) {
        enemy.skip = false;
        this.pushLog(`The ${enemy.name} hesitates. Hush holds.`);
        this.time.delayedCall(520, step);
        return;
      }

      const state = getState();

      if (enemy.drain > 0) {
        const pool = livingVillagers(state).filter((v) => v.consent !== 'protected' && v.years > 0);
        if (pool.length > 0) {
          const victim = pool[Phaser.Math.Between(0, pool.length - 1)];
          const before = victim.years;
          const result = drawYears(state, victim.id, Math.min(enemy.drain, before), 'interest', { witnessed: true, attributed: false });
          this.pushLog(`The ${enemy.name} reaches past you. ${victim.name} loses ${enemy.drain} year.`);
          if (result.died) this.pushLog(`${victim.name} is gone. The wraith was not even looking at them.`);
          sfx('draw');
        } else if (state.hero.years > 0) {
          drawYears(state, 'hero', 1, 'interest');
          this.pushLog(`The ${enemy.name} takes a year from you. It was the only name left.`);
          sfx('draw');
        }
        this.updateHero();
        saveState(state);
        if (state.hero.years <= 0) {
          this.time.delayedCall(500, () => this.endWithEnding());
          return;
        }
        this.time.delayedCall(620, step);
        return;
      }

      let damage = Phaser.Math.Between(enemy.min, enemy.max);
      if (this.guarding) {
        damage = Math.max(1, Math.round(damage / 2));
        this.guarding = false;
        this.pushLog('Your guard holds. The blow is halved.');
      }
      hurtHero(state, damage);
      this.pushLog(`${enemy.name}: ${enemy.lines[Phaser.Math.Between(0, enemy.lines.length - 1)]} (${damage} damage)`);
      sfx('hit');
      this.updateHero();
      saveState(state);

      if (state.hero.hp <= 0) {
        this.time.delayedCall(600, () => this.lose());
        return;
      }

      this.time.delayedCall(650, step);
    };

    step();
  }

  win() {
    if (this.over) return;
    this.over = true;
    this.turn = 'over';
    this.setActionsEnabled(false);
    sfx('win');
    const state = getState();
    state.stats.battlesWon += 1;

    if (this.boss) {
      if (this.finale === 'auditor') {
        state.flags.cityExposed = true;
        state.flags.finale = 'keeper';
      } else if (this.finale === 'contract') {
        state.flags.charterBurned = true;
        state.flags.finale = 'charter';
      } else {
        state.flags.brokeContract = true;
        state.flags.finale = null;
      }
      state.endingId = computeEnding(state);
      saveState(state);
      this.pushLog('The gate goes quiet. The arithmetic stops.');
      this.time.delayedCall(900, () => {
        dialog(this, {
          lines: FINALE_WIN[this.finale] || FINALE_WIN.collector,
          onDone: () => {
            this.scene.stop('Hub');
            this.scene.start('Ending');
          }
        });
      });
      return;
    }

    state.flags.encounters += 1;
    state.day += 1;
    healHero(state, 12);
    saveState(state);
    this.pushLog('The road is quiet. You are still here. (+12 vitality)');
    this.time.delayedCall(1100, () => this.returnToHub());
  }

  lose() {
    if (this.over) return;
    this.over = true;
    this.turn = 'over';
    this.setActionsEnabled(false);
    sfx('lose');

    const state = getState();
    state.hero.hp = Math.max(1, Math.round(state.hero.maxHp * 0.5));
    if (!this.boss) {
      state.flags.encounters += 1;
      state.day += 1;
    }

    const pool = livingVillagers(state)
      .filter((v) => v.consent !== 'protected')
      .sort((a, b) => {
        const aw = a.consent === 'willing' ? 1 : 0;
        const bw = b.consent === 'willing' ? 1 : 0;
        if (aw !== bw) return bw - aw;
        return b.years - a.years;
      });

    let need = 3;
    const taken = [];
    for (const villager of pool) {
      if (need <= 0) break;
      const take = Math.min(need, villager.years);
      if (take <= 0) continue;
      const result = drawYears(state, villager.id, take, 'the ledger collects');
      if (result.ok) {
        need -= take;
        taken.push(`${villager.name} (${take})`);
      }
    }
    if (need > 0 && state.hero.years > 0) {
      drawYears(state, 'hero', Math.min(need, state.hero.years), 'the ledger collects');
    }

    saveState(state);

    const lines = [
      { who: 'narrator', text: 'You wake at the gate with less than you had.' }
    ];
    if (taken.length > 0) {
      lines.push({ who: 'narrator', text: `The ledger collected from ${taken.join(', ')}.` });
    }
    lines.push({ who: 'narrator', text: 'No one in the city will ever know your name. That is not the same as no one paying.' });

    if (state.hero.years <= 0) {
      state.endingId = computeEnding(state);
      saveState(state);
      dialog(this, {
        lines,
        onDone: () => this.endWithEnding()
      });
      return;
    }

    dialog(this, {
      lines,
      onDone: () => this.returnToHub()
    });
  }

  endWithEnding() {
    const state = getState();
    state.endingId = computeEnding(state);
    saveState(state);
    this.scene.stop('Hub');
    this.scene.start('Ending');
  }

  returnToHub() {
    this.scene.resume('Hub');
    this.scene.stop();
  }
}

function effectText(favor) {
  switch (favor.effect) {
    case 'heal': return `restores ${favor.power} vitality`;
    case 'healMax': return `+${favor.power} max vitality`;
    case 'skip': return 'the enemy loses a turn';
    case 'flee': return 'leave the fight';
    case 'years': return `returns ${favor.power} of your years`;
    default: return '';
  }
}
