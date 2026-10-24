import { label, panel, button, dialog, choice, modal, toast, C, W, H } from '../ui/core.js';
import { settlement } from '../ui/settlement.js';
import { createJoystick } from '../ui/joystick.js';
import { getState } from '../systems/store.js';
import { saveState } from '../systems/save.js';
import {
  chapterName,
  livingVillagers,
  quotaRemaining
} from '../systems/state.js';
import {
  CHAPTER_QUOTAS,
  CHAPTER_INTERLUDES,
  FINAL_CHAPTER,
  ROMAN
} from '../data/chapters.js';
import {
  getActiveEvents,
  eventForVillager,
  eventForLocation,
  firstActiveEvent
} from '../data/events.js';
import { getFinalChoices, FINAL_BOSSES } from '../data/finals.js';
import {
  settleQuota,
  settleAuto,
  drawYears,
  restoreForgotten
} from '../systems/ledger.js';
import { computeEnding } from '../systems/endings.js';
import {
  VILLAGER_TALK,
  OPENING,
  NGPLUS_OPENING,
  SABLE_OFFER,
  SABLE_RESULT,
  FUNERAL,
  FUNERAL_RESULT,
  AUDIT,
  AUDIT_RESULT,
  PERRIN_CLAIM,
  PERRIN_RESULT,
  CHARTER,
  CHARTER_RESULT,
  ORIN,
  ORIN_RESULT,
  FERRY,
  FERRY_RESULT,
  NOMINATION,
  NOMINATION_RESULT,
  PARLEY,
  PARLEY_RESULT,
  PARLEY_FINAL,
  FINAL_GATE,
  FERRY_FINAL,
  SECOND_CHAIR_FINAL,
  RENEWAL_FINAL,
  DEFAULT_LINE
} from '../data/story.js';
import { CHAPTER_ENCOUNTERS } from '../data/enemies.js';
import {
  MAP_SIZE,
  PLAYER_START,
  BUILDINGS,
  LOCATIONS,
  VILLAGER_POSITIONS,
  OBSTACLES
} from '../data/village.js';

const HUD_HEIGHT = 164;
const JOYSTICK_TOP = 930;
const WALK_SPEED = 190;

export default class HubScene extends Phaser.Scene {
  constructor() {
    super('Hub');
  }

  create() {
    this.hintFaded = false;
    this.walkTimer = 0;
    this.currentHotspot = null;
    this.lastPrompt = '';

    this.mapImage = this.add.image(MAP_SIZE.width / 2, MAP_SIZE.height / 2, 'village_map').setDepth(0);
    this.mapLabels = this.buildMapLabels();

    this.physics.world.setBounds(0, 0, MAP_SIZE.width, MAP_SIZE.height);

    this.player = this.physics.add.sprite(PLAYER_START.x, PLAYER_START.y, 'wren_idle');
    this.player.setDepth(60);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(16, 12);
    this.player.body.setOffset(10, 38);

    this.buildObstacles();

    this.cameras.main.setBounds(0, 0, MAP_SIZE.width, MAP_SIZE.height);
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    this.cameras.main.setDeadzone(100, 140);

    this.markerLayer = this.add.container(0, 0).setDepth(40);
    this.highlight = this.add.graphics().setDepth(39);

    this.buildHud();
    this.buildEventLayer();
    this.buildContextButton();

    this.hint = label(this, W / 2, 1230, 'Touch low to walk.', 14, C.softText, {
      originX: 0.5,
      align: 'center',
      stroke: '#e9e0cc',
      strokeThickness: 3
    });
    this.hint.setScrollFactor(0).setDepth(950).setAlpha(0.82);

    this.joystick = createJoystick(this, {
      zoneTop: JOYSTICK_TOP,
      onActivate: () => this.fadeHint()
    });

    this.events.off('resume', this.onResume, this);
    this.events.on('resume', this.onResume, this);
    this.events.once('shutdown', () => this.joystick?.destroy());

    this.refresh();

    const state = getState();
    if (!state.flags.openingSeen) {
      this.time.delayedCall(350, () => {
        if (!this.scene.isActive()) return;
        dialog(this, {
          lines: state.ngPlus ? NGPLUS_OPENING : OPENING,
          onDone: () => {
            state.flags.openingSeen = true;
            saveState(state);
            this.refresh();
          }
        });
      });
    }

    this.setupCameraLayers();
    this.cameras.main.fadeIn(500, 20, 17, 14);
  }

  setupCameraLayers() {
    this.uiCamera = this.cameras.add(0, 0, W, H);
    this.uiCamera.ignore([
      this.mapImage,
      this.player,
      this.markerLayer,
      this.highlight,
      ...this.mapLabels
    ]);
    this.cameras.main.ignore([
      this.hud,
      this.eventLayer,
      this.hint,
      this.contextButton.container,
      this.joystick.zone,
      this.joystick.base,
      this.joystick.knob
    ]);
  }

  buildMapLabels() {
    const labels = [];
    for (const building of BUILDINGS) {
      const text = label(this, building.x, building.labelY, building.label, 11, C.softText, {
        originX: 0.5,
        align: 'center',
        stroke: '#e9e0cc',
        strokeThickness: 3
      });
      text.setDepth(6).setAlpha(0.78);
      labels.push(text);
    }

    for (const location of LOCATIONS) {
      if (location.labelY === undefined) continue;
      const text = label(this, location.x, location.labelY, location.label.toUpperCase(), 11, C.softText, {
        originX: 0.5,
        align: 'center',
        stroke: '#e9e0cc',
        strokeThickness: 3
      });
      text.setDepth(6).setAlpha(0.78);
      labels.push(text);
    }
    return labels;
  }

  buildObstacles() {
    this.obstacles = this.physics.add.staticGroup();
    for (const obstacle of OBSTACLES) {
      const body = this.physics.add.staticImage(obstacle.x, obstacle.y, 'pixel');
      body.setVisible(false);
      body.setDisplaySize(obstacle.w, obstacle.h);
      body.refreshBody();
      this.obstacles.add(body);
    }
    this.physics.add.collider(this.player, this.obstacles);
  }

  buildHud() {
    this.hud = this.add.container(0, 0).setDepth(1000);

    const bg = panel(this, W / 2, HUD_HEIGHT / 2, 700, HUD_HEIGHT, {
      fill: C.paper,
      alpha: 0.95,
      lineAlpha: 0.25,
      radius: 16
    });
    bg.setScrollFactor(0);
    this.hud.add(bg);

    this.chapterLabel = label(this, 44, 24, '', 14, C.emberText);
    this.chapterTitle = label(this, 44, 44, '', 30, C.inkText);
    this.dayLabel = label(this, 676, 26, '', 16, C.softText, { originX: 1 });
    this.quotaLabel = label(this, 676, 52, '', 16, C.emberText, { originX: 1 });
    this.heroName = label(this, 44, 90, '', 18, C.inkText);
    this.heroYears = label(this, 676, 88, '', 18, C.inkText, { originX: 1 });
    this.hpText = label(this, 350, 96, '', 12, C.softText, { originX: 0.5 });

    for (const item of [this.chapterLabel, this.chapterTitle, this.dayLabel, this.quotaLabel, this.heroName, this.heroYears, this.hpText]) {
      item.setScrollFactor(0);
      this.hud.add(item);
    }

    this.hpBar = this.add.graphics().setScrollFactor(0);
    this.hud.add(this.hpBar);

    const ledger = button(this, {
      x: 610,
      y: 132,
      w: 120,
      h: 44,
      text: 'Ledger',
      fontSize: 16,
      fill: C.paperDark,
      color: C.inkText,
      depth: 1000,
      onClick: () => this.openLedger()
    });
    ledger.container.setScrollFactor(0, 0, true);
    this.hud.add(ledger.container);

    this.hud.setScrollFactor(0, 0, true);
  }

  buildEventLayer() {
    this.eventLayer = this.add.container(0, 0).setDepth(950).setScrollFactor(0);
  }

  buildContextButton() {
    this.contextButton = button(this, {
      x: W / 2,
      y: 888,
      w: 460,
      h: 66,
      text: '',
      fontSize: 21,
      fill: C.emberDark,
      depth: 1100,
      onClick: () => this.performInteraction(this.currentHotspot)
    });
    this.contextButton.container.setScrollFactor(0, 0, true).setVisible(false);
  }

  refresh() {
    const state = getState();
    if (!state) {
      this.scene.start('Title');
      return;
    }

    this.chapterLabel.setText(`CHAPTER ${ROMAN[state.chapter]}`);
    this.chapterTitle.setText(chapterName(state.chapter));
    this.dayLabel.setText(`Day ${state.day}`);
    this.quotaLabel.setText(`Quota ${state.quota.paid} / ${state.quota.owed}`);
    this.heroName.setText(state.hero.name);
    this.heroYears.setText(`${state.hero.years} years`);
    this.hpText.setText(`Vitality ${state.hero.hp} / ${state.hero.maxHp}`);

    this.hpBar.clear();
    this.hpBar.fillStyle(0xc9b998, 0.7);
    this.hpBar.fillRoundedRect(260, 119, 180, 10, 5);
    const ratio = state.hero.maxHp > 0
      ? Phaser.Math.Clamp(state.hero.hp / state.hero.maxHp, 0, 1)
      : 0;
    if (ratio > 0) {
      this.hpBar.fillStyle(state.hero.hp <= state.hero.maxHp * 0.3 ? C.ember : C.inkSoft, 1);
      this.hpBar.fillRoundedRect(260, 119, Math.max(10, 180 * ratio), 10, 5);
    }

    this.refreshMarkers(state);
    this.refreshEventBanner(state);
    this.updateNearest();
  }

  refreshMarkers(state) {
    this.markerLayer.removeAll(true);
    const active = getActiveEvents(state);
    const marked = new Set(active.filter((event) => event.markerId).map((event) => event.markerId));

    for (const villager of livingVillagers(state)) {
      const position = VILLAGER_POSITIONS[villager.id];
      if (!position) continue;

      const shadow = this.add.ellipse(position.x, position.y + 11, 38, 10, C.ink, 0.12);
      const portrait = this.add.image(position.x, position.y, `portrait_${villager.id}`)
        .setScale(0.42)
        .setOrigin(0.5, 0.85);
      const name = label(this, position.x, position.y + 12, villager.name, 12, C.inkText, {
        originX: 0.5,
        align: 'center',
        stroke: '#e9e0cc',
        strokeThickness: 3
      });
      name.setDepth(41);

      this.markerLayer.add([shadow, portrait, name]);

      if (marked.has(villager.id)) {
        const mark = label(this, position.x, position.y - 54, '!', 20, C.emberText, {
          originX: 0.5,
          align: 'center',
          stroke: '#e9e0cc',
          strokeThickness: 3
        });
        this.markerLayer.add(mark);
      }
    }
  }

  refreshEventBanner(state) {
    this.eventLayer.removeAll(true);
    const event = firstActiveEvent(state);
    if (!event) return;

    const bg = panel(this, W / 2, 228, 640, 78, {
      fill: C.emberDark,
      lineAlpha: 0.35,
      radius: 14
    });
    bg.setScrollFactor(0);
    const title = label(this, 72, 207, event.title, 20, C.creamText);
    const sub = label(this, 72, 235, event.sub, 14, '#e8cbb5');
    title.setScrollFactor(0);
    sub.setScrollFactor(0);
    const zone = this.add.zone(W / 2, 228, 640, 78)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => this.openEvent(event.id));

    this.eventLayer.add([bg, title, sub, zone]);
  }

  updateNearest() {
    const state = getState();
    if (!state || !this.player || !this.contextButton) return;

    const encounters = CHAPTER_ENCOUNTERS[state.chapter] || [];
    const left = Math.max(0, encounters.length - state.flags.encounters);
    const remaining = quotaRemaining(state);
    const candidates = [];

    for (const villager of livingVillagers(state)) {
      const position = VILLAGER_POSITIONS[villager.id];
      if (!position) continue;
      const event = eventForVillager(state, villager.id);
      const prompt = event ? event.prompt : `Talk to ${villager.name}`;
      candidates.push({
        kind: 'villager',
        villagerId: villager.id,
        x: position.x,
        y: position.y,
        radius: 82,
        prompt
      });
    }

    for (const location of LOCATIONS) {
      const event = eventForLocation(state, location.kind);
      let prompt = event ? event.prompt : location.prompt;
      if (!event && location.kind === 'gate' && state.chapter >= FINAL_CHAPTER && remaining <= 0) {
        prompt = 'The contract ends';
      }
      if (!event && location.kind === 'road' && left <= 0) prompt = 'The road is quiet';
      candidates.push({
        kind: location.kind,
        x: location.x,
        y: location.y,
        radius: location.radius,
        prompt
      });
    }

    let nearest = null;
    let best = Infinity;
    for (const candidate of candidates) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        candidate.x,
        candidate.y
      );
      if (distance <= candidate.radius && distance < best) {
        best = distance;
        nearest = candidate;
      }
    }

    this.currentHotspot = nearest;
    if (!nearest) {
      this.contextButton.container.setVisible(false);
      this.lastPrompt = '';
      return;
    }

    this.contextButton.container.setVisible(true);
    if (this.lastPrompt !== nearest.prompt) {
      this.contextButton.setLabel(nearest.prompt);
      this.lastPrompt = nearest.prompt;
    }
  }

  updateHighlight(time) {
    this.highlight.clear();
    if (!this.currentHotspot) return;
    const radius = 24 + Math.sin(time / 260) * 2;
    this.highlight.lineStyle(2, C.ember, 0.55);
    this.highlight.strokeCircle(this.currentHotspot.x, this.currentHotspot.y + 6, radius);
  }

  update(time, delta) {
    if (!this.player || !this.joystick) return;

    const vector = this.joystick.vector;
    const magnitude = Math.hypot(vector.x, vector.y);

    if (magnitude > 0.08) {
      this.player.setVelocity(vector.x * WALK_SPEED, vector.y * WALK_SPEED);
      if (vector.x < -0.05) this.player.setFlipX(true);
      else if (vector.x > 0.05) this.player.setFlipX(false);

      this.walkTimer += delta;
      const frame = Math.floor(this.walkTimer / 170) % 2 === 0 ? 'wren_walk_a' : 'wren_walk_b';
      if (this.player.texture.key !== frame) this.player.setTexture(frame);
    } else {
      this.player.setVelocity(0, 0);
      if (this.player.texture.key !== 'wren_idle') this.player.setTexture('wren_idle');
      this.walkTimer = 0;
    }

    this.updateNearest();
    this.updateHighlight(time);
  }

  fadeHint() {
    if (this.hintFaded || !this.hint) return;
    this.hintFaded = true;
    this.tweens.add({
      targets: this.hint,
      alpha: 0,
      duration: 650,
      onComplete: () => this.hint.setVisible(false)
    });
  }

  stopMoving() {
    this.joystick?.reset();
    if (this.player?.body) this.player.setVelocity(0, 0);
  }

  onResume() {
    this.stopMoving();
    this.refresh();
  }

  withoutDeadSpeakers(lines, state) {
    const dead = new Set(state.villagers.filter((v) => !v.alive).map((v) => v.id));
    return lines.filter((line) => !dead.has(line.who));
  }

  performInteraction(hotspot) {
    if (!hotspot) return;
    this.stopMoving();

    const state = getState();
    if (!state) return;

    if (hotspot.kind === 'villager') {
      const event = eventForVillager(state, hotspot.villagerId);
      if (event) {
        this.openEvent(event.id);
        return;
      }
      this.talk(hotspot.villagerId);
      return;
    }

    const locationEvent = eventForLocation(state, hotspot.kind);
    if (locationEvent) {
      this.openEvent(locationEvent.id);
      return;
    }

    if (hotspot.kind === 'gate') {
      this.openGate();
      return;
    }
    if (hotspot.kind === 'road') {
      this.walkRoad();
      return;
    }
    if (hotspot.kind === 'chapel') {
      this.openLedger();
      return;
    }
    if (hotspot.kind === 'charter') {
      dialog(this, {
        lines: [
          { who: 'narrator', text: 'The Charter House is empty. The first page is where you left it.' },
          { who: 'ottil', text: 'Paper is patient. The city is not.' }
        ],
        onDone: () => this.refresh()
      });
      return;
    }
    if (hotspot.kind === 'ferry') {
      if (state.villagers.find((v) => v.id === 'joss' && v.alive)) this.talk('joss');
      else {
        dialog(this, {
          lines: [{ who: 'narrator', text: 'The ferry is gone. The river is still here.' }],
          onDone: () => this.refresh()
        });
      }
    }
  }

  talk(id) {
    this.stopMoving();
    const state = getState();
    const villager = state.villagers.find((v) => v.id === id);
    if (!villager || !villager.alive) return;

    const data = VILLAGER_TALK[villager.id];
    if (!data) return;

    let lines;
    if (!villager.spoken) {
      lines = data.intro;
      villager.spoken = true;
      villager.trust += 1;
      saveState(state);
    } else if (villager.consent === 'protected') {
      lines = data.repeat;
    } else if (villager.years <= 1) {
      lines = data.low(state, villager);
    } else if (villager.drawn > 0) {
      lines = data.drawn(state, villager);
    } else {
      lines = data.repeat;
    }

    dialog(this, {
      lines,
      onDone: () => this.refresh()
    });
  }

  openEvent(id, onDone = null) {
    this.stopMoving();
    const state = getState();

    if (id === 'sable') {
      dialog(this, {
        lines: SABLE_OFFER.lines,
        onDone: () => {
          choice(this, {
            prompt: 'The page is open. What do you do?',
            options: SABLE_OFFER.options,
            onPick: (value) => this.resolveSable(value)
          });
        }
      });
      return;
    }

    if (id === 'funeral') {
      dialog(this, {
        lines: FUNERAL.lines,
        onDone: () => {
          choice(this, {
            prompt: 'The chapel waits.',
            options: FUNERAL.options,
            onPick: (value) => this.resolveFuneral(value)
          });
        }
      });
      return;
    }

    if (id === 'audit') {
      dialog(this, {
        lines: AUDIT.lines,
        onDone: () => {
          choice(this, {
            prompt: 'The auditor waits with his pen raised.',
            options: AUDIT.options,
            onPick: (value) => this.resolveAudit(value)
          });
        }
      });
      return;
    }

    if (id === 'perrin') {
      dialog(this, {
        lines: PERRIN_CLAIM.lines,
        onDone: () => {
          const options = PERRIN_CLAIM.options.map((option) => ({
            ...option,
            disabled: option.value === 'pay' && state.hero.years < 5
          }));
          choice(this, {
            prompt: 'Nel is waiting by the door.',
            options,
            onPick: (value) => this.resolvePerrin(value)
          });
        }
      });
      return;
    }

    if (id === 'charter') {
      dialog(this, {
        lines: CHARTER.lines,
        onDone: () => {
          choice(this, {
            prompt: 'The first page is in your hands.',
            options: CHARTER.options,
            onPick: (value) => this.resolveCharter(value)
          });
        }
      });
      return;
    }

    if (id === 'orin') {
      dialog(this, {
        lines: ORIN.lines,
        onDone: () => {
          choice(this, {
            prompt: 'Orin waits for your answer.',
            options: ORIN.options,
            onPick: (value) => this.resolveOrin(value)
          });
        }
      });
      return;
    }

    if (id === 'ferry') {
      dialog(this, {
        lines: FERRY.lines,
        onDone: () => {
          const options = FERRY.options.map((option) => ({
            ...option,
            disabled: option.value === 'pay' && state.hero.years < 8
          }));
          choice(this, {
            prompt: 'The river is loud enough to hide a promise.',
            options,
            onPick: (value) => this.resolveFerry(value)
          });
        }
      });
      return;
    }

    if (id === 'parley') {
      dialog(this, {
        lines: this.withoutDeadSpeakers(PARLEY.lines, state),
        onDone: () => {
          choice(this, {
            prompt: 'Crane waits with the city\'s writ.',
            options: PARLEY.options,
            onPick: (value) => this.resolveParley(value)
          });
        }
      });
      return;
    }

    if (id === 'nomination') {
      dialog(this, {
        lines: this.withoutDeadSpeakers(NOMINATION.lines, state),
        onDone: () => {
          choice(this, {
            prompt: 'The council will have an answer.',
            options: NOMINATION.options,
            onPick: (value) => this.resolveNomination(value, onDone)
          });
        }
      });
    }
  }

  resolveSable(value) {
    const state = getState();
    state.flags.sableOfferSeen = true;

    if (value === 'expose') {
      state.flags.exposed = true;
      state.quota.owed += 2;
      for (const villager of state.villagers) {
        if (villager.id !== 'sable') villager.trust += 1;
      }
      const sable = state.villagers.find((v) => v.id === 'sable');
      if (sable) sable.trust = Math.max(0, sable.trust - 2);
    } else if (value === 'stop') {
      state.flags.sableWarned = true;
    } else if (value === 'quiet') {
      state.flags.quietNames = true;
    }

    saveState(state);
    dialog(this, {
      lines: SABLE_RESULT[value],
      onDone: () => this.refresh()
    });
  }

  resolveFuneral(value) {
    const state = getState();
    state.flags.funeralDone = true;
    let restored = 0;
    if (value === 'name') restored = restoreForgotten(state);
    saveState(state);

    const lines = [...FUNERAL_RESULT[value]];
    if (value === 'name' && restored > 0) {
      lines.push({
        who: 'nessa',
        text: `${restored} name${restored === 1 ? '' : 's'} came back. You will not get them all. You will not stop trying.`
      });
    }
    dialog(this, {
      lines,
      onDone: () => this.refresh()
    });
  }

  resolveAudit(value) {
    const state = getState();
    const sable = state.villagers.find((v) => v.id === 'sable');
    state.flags.auditDone = true;
    state.flags.auditOutcome = value;

    if (value === 'scapegoat') {
      state.quota.owed = Math.max(state.quota.paid, state.quota.owed - 2);
      if (sable) sable.trust = Math.max(0, sable.trust - 3);
    } else if (value === 'defy') {
      state.quota.owed += 2;
      if (sable) sable.trust += 1;
    } else if (value === 'confess') {
      state.quota.owed += 4;
      for (const villager of state.villagers) {
        if (villager.alive) villager.trust += 1;
      }
    }

    saveState(state);
    dialog(this, {
      lines: AUDIT_RESULT[value],
      onDone: () => this.refresh()
    });
  }

  resolvePerrin(value) {
    const state = getState();
    const perrin = state.villagers.find((v) => v.id === 'perrin');
    const nel = state.villagers.find((v) => v.id === 'nel');
    state.flags.perrinDone = true;
    state.flags.perrinOutcome = value;

    if (value === 'leave' && nel) {
      nel.alive = false;
      nel.departed = true;
      nel.remembered = true;
      state.flags.nelStatus = 'left';
    } else if (value === 'hide') {
      state.flags.nelStatus = 'hidden';
      if (perrin) perrin.trust = Math.max(0, perrin.trust - 1);
    } else if (value === 'pay') {
      const result = drawYears(state, 'hero', 5, 'Perrin\'s passage');
      if (!result.ok) {
        state.flags.perrinDone = false;
        state.flags.perrinOutcome = null;
        return;
      }
      state.flags.nelStatus = 'home';
      if (perrin) perrin.trust += 2;
    }

    saveState(state);
    dialog(this, {
      lines: PERRIN_RESULT[value],
      onDone: () => this.refresh()
    });
  }

  resolveCharter(value) {
    const state = getState();
    state.flags.charterDone = true;
    state.flags.charterKnown = true;

    if (value === 'take') {
      state.flags.charterTaken = true;
      state.quota.owed += 2;
    } else {
      state.flags.charterHidden = true;
    }

    saveState(state);
    dialog(this, {
      lines: CHARTER_RESULT[value],
      onDone: () => this.refresh()
    });
  }

  resolveOrin(value) {
    const state = getState();
    state.flags.orinDone = true;
    state.flags.orinTestified = value === 'testify';

    if (value === 'rest') {
      drawYears(state, 'orin', 1, 'a quiet death');
    }

    saveState(state);
    dialog(this, {
      lines: ORIN_RESULT[value],
      onDone: () => this.refresh()
    });
  }

  resolveFerry(value) {
    const state = getState();
    state.flags.ferryDone = true;
    state.flags.ferryReady = false;

    if (value === 'pay') {
      const result = drawYears(state, 'hero', 8, 'the ferry');
      if (!result.ok) {
        state.flags.ferryDone = false;
        return;
      }
      state.flags.ferryReady = true;
    } else if (value === 'promise') {
      state.flags.ferryReady = true;
      state.flags.ferryDebt = true;
    }

    saveState(state);
    dialog(this, {
      lines: FERRY_RESULT[value],
      onDone: () => this.refresh()
    });
  }

  resolveParley(value) {
    const state = getState();
    state.flags.parleyDone = true;
    state.flags.parleyOutcome = value;

    if (value === 'ledger') {
      state.quota.owed = Math.max(state.quota.paid, state.quota.owed - 6);
    }

    saveState(state);
    dialog(this, {
      lines: this.withoutDeadSpeakers(PARLEY_RESULT[value], state),
      onDone: () => this.refresh()
    });
  }

  resolveNomination(value, onDone) {
    const state = getState();
    const nel = state.villagers.find((v) => v.id === 'nel');
    state.flags.nominationDone = true;
    state.flags.nominationOutcome = value;

    if (value === 'protect') {
      state.flags.nelStatus = 'protected';
      for (const villager of state.villagers) {
        if (villager.alive) villager.trust += 1;
      }
    } else if (value === 'self') {
      state.flags.offeredSelf = true;
      state.flags.nelStatus = 'home';
    } else if (value === 'council' && nel) {
      nel.alive = false;
      nel.departed = true;
      nel.remembered = true;
      state.flags.nelStatus = 'city';
    }

    saveState(state);
    dialog(this, {
      lines: this.withoutDeadSpeakers(NOMINATION_RESULT[value], state),
      onDone: () => {
        onDone?.();
        this.refresh();
      }
    });
  }

  walkRoad() {
    this.stopMoving();
    const state = getState();
    const encounters = CHAPTER_ENCOUNTERS[state.chapter] || [];
    if (state.flags.encounters >= encounters.length) {
      dialog(this, {
        lines: [
          { who: 'narrator', text: 'The road is quiet. The quota is not.' },
          { who: 'narrator', text: 'The gate is still open. It is always open.' }
        ],
        onDone: () => this.refresh()
      });
      return;
    }
    saveState(state);
    this.scene.pause();
    this.scene.launch('Battle', { boss: false });
  }

  openGate() {
    this.stopMoving();
    const state = getState();
    if (state.chapter >= FINAL_CHAPTER && quotaRemaining(state) <= 0) {
      this.openFinal();
      return;
    }
    this.openSettlement();
  }

  openSettlement() {
    this.stopMoving();
    const state = getState();
    settlement(this, {
      state,
      quietAvailable: state.flags.quietNames,
      quietDefault: state.flags.quietNames,
      onDeliver: (allocations, quiet) => this.deliver(allocations, quiet),
      onAuto: (quiet) => this.deliverAuto(quiet),
      onBack: () => this.refresh()
    });
  }

  deliver(allocations, quiet) {
    const state = getState();
    settleQuota(state, allocations, { quiet });
    saveState(state);
    if (state.quota.paid < state.quota.owed) {
      toast(this, 'The ledger came up short. Someone was not on the page.', { y: 900 });
      this.refresh();
      return;
    }
    this.afterSettlement();
  }

  deliverAuto(quiet) {
    const state = getState();
    const result = settleAuto(state, { quiet });
    saveState(state);
    if (result.shortfall > 0) {
      toast(this, 'There were not enough years left to take.', { y: 900 });
      this.refresh();
      return;
    }
    this.afterSettlement();
  }

  afterSettlement() {
    const state = getState();
    if (state.hero.years <= 0) {
      state.endingId = computeEnding(state);
      saveState(state);
      this.scene.start('Ending');
      return;
    }

    if (state.chapter >= FINAL_CHAPTER) {
      this.openFinal();
      return;
    }

    if (state.chapter === 4 && !state.flags.nominationDone) {
      this.openEvent('nomination', () => this.advanceChapter());
      return;
    }

    this.advanceChapter();
  }

  advanceChapter() {
    const state = getState();
    const next = state.chapter + 1;
    const interlude = state.ngPlus
      ? [...CHAPTER_INTERLUDES[next], { who: 'narrator', text: 'The page has a crease where you signed it last time.' }]
      : CHAPTER_INTERLUDES[next];
    dialog(this, {
      lines: interlude,
      onDone: () => {
        state.chapter = next;
        state.quota = { owed: CHAPTER_QUOTAS[next] + (state.quotaBonus || 0), paid: 0 };
        state.flags.encounters = 0;
        state.day += 1;
        state.hero.hp = state.hero.maxHp;
        if (next === FINAL_CHAPTER) state.flags.secondChairOffered = true;
        saveState(state);
        this.refresh();
      }
    });
  }

  openFinal() {
    this.stopMoving();
    const state = getState();
    dialog(this, {
      lines: FINAL_GATE.lines,
      onDone: () => {
        choice(this, {
          prompt: 'The contract waits. What do you do?',
          options: getFinalChoices(state),
          onPick: (value) => this.resolveFinal(value)
        });
      }
    });
  }

  finishFinal(finale, lines) {
    const state = getState();
    state.flags.finale = finale;
    state.endingId = computeEnding(state);
    saveState(state);
    if (!lines) {
      this.scene.start('Ending');
      return;
    }
    dialog(this, {
      lines,
      onDone: () => this.scene.start('Ending')
    });
  }

  resolveFinal(value) {
    const state = getState();
    state.flags.finalChoice = value;

    if (value === 'pay') {
      this.finishFinal(null);
      return;
    }

    if (value === 'offer') {
      if (state.hero.years < 20) return;
      drawYears(state, 'hero', 20, 'the contract');
      state.flags.offeredSelf = true;
      this.finishFinal('saint', [
        { who: 'narrator', text: 'You put twenty years on the brass case. The collector weighs them with his eyes.' },
        { who: 'collector', text: 'You will not get these back. You understand that.' },
        { who: 'you', text: 'I understand the arithmetic.' }
      ]);
      return;
    }

    if (value === 'refuse') {
      state.flags.defaulted = true;
      this.finishFinal('default', DEFAULT_LINE);
      return;
    }

    if (value === 'parley') {
      this.finishFinal('keeper', PARLEY_FINAL);
      return;
    }

    if (value === 'ferry') {
      state.flags.escaped = true;
      this.finishFinal('ferry', FERRY_FINAL);
      return;
    }

    if (value === 'secondchair') {
      state.flags.secondChair = true;
      this.finishFinal('secondchair', SECOND_CHAIR_FINAL);
      return;
    }

    if (value === 'renew') {
      state.flags.renewed = true;
      this.finishFinal('renewal', RENEWAL_FINAL);
      return;
    }

    if (FINAL_BOSSES[value]) {
      saveState(state);
      this.scene.pause();
      this.scene.launch('Battle', { finale: FINAL_BOSSES[value] });
    }
  }

  openLedger() {
    this.stopMoving();
    const state = getState();
    const depth = 1400;
    const root = modal(this, { depth, dimAlpha: 0.62 });
    const top = 120;
    const height = 1050;
    root.add(panel(this, W / 2, top + height / 2, 660, height, {
      fill: C.paper,
      lineAlpha: 0.35,
      radius: 20
    }));

    root.add(label(this, W / 2, top + 56, 'The Ledger', 34, C.inkText, {
      originX: 0.5,
      depth: depth + 1
    }));
    root.add(label(this, W / 2, top + 104, `Day ${state.day} · Chapter ${ROMAN[state.chapter]}`, 17, C.softText, {
      originX: 0.5,
      depth: depth + 1
    }));

    const summary = `Taken: ${state.flags.totalDrawn} years.  Your own: ${state.flags.selfDrawn}.  Deaths: ${state.stats.deaths}.  Forgotten: ${state.stats.forgotten}.`;
    root.add(label(this, W / 2, top + 148, summary, 16, C.softText, {
      originX: 0.5,
      align: 'center',
      wrap: 590,
      depth: depth + 1
    }));

    const entries = [...state.ledger].reverse();
    const perPage = 6;
    let page = 0;
    const pageCount = Math.max(1, Math.ceil(entries.length / perPage));
    const layer = this.add.container(0, 0).setDepth(depth + 1);
    root.add(layer);

    const render = () => {
      layer.removeAll(true);
      const start = page * perPage;
      const slice = entries.slice(start, start + perPage);
      let y = top + 220;

      if (slice.length === 0) {
        layer.add(label(this, W / 2, y + 60, 'The page is blank. It will not stay blank.', 22, C.softText, {
          originX: 0.5,
          align: 'center'
        }));
      }

      for (const record of slice) {
        let text;
        if (record.self) {
          text = `Day ${record.day} — you paid ${record.years} year${record.years === 1 ? '' : 's'} for ${record.context}.`;
        } else if (!record.witnessed) {
          text = `Day ${record.day} — ${record.years} year${record.years === 1 ? '' : 's'} taken. No name recorded.`;
        } else {
          text = `Day ${record.day} — ${record.name} paid ${record.years} year${record.years === 1 ? '' : 's'} for ${record.context}.`;
        }
        layer.add(label(this, 80, y, text, 18, record.witnessed ? C.inkText : C.emberText, {
          wrap: 560,
          lineSpacing: 5
        }));
        y += 92;
      }

      const dead = state.villagers.filter((v) => !v.alive);
      if (dead.length > 0) {
        const names = dead.map((v) => (v.remembered ? v.name : '—')).join(', ');
        layer.add(label(this, 80, top + 840, 'The dead:', 17, C.softText));
        layer.add(label(this, 80, top + 866, names, 18, C.inkText, {
          wrap: 560,
          lineSpacing: 5
        }));
      }

      if (pageCount > 1) {
        const prev = button(this, {
          x: 190, y: top + 760, w: 130, h: 54,
          text: 'Prev', fontSize: 17, fill: C.paperDark, color: C.inkText,
          disabled: page <= 0, depth: depth + 2,
          onClick: () => this.time.delayedCall(0, () => { page -= 1; render(); })
        });
        const next = button(this, {
          x: 530, y: top + 760, w: 130, h: 54,
          text: 'Next', fontSize: 17, fill: C.paperDark, color: C.inkText,
          disabled: page >= pageCount - 1, depth: depth + 2,
          onClick: () => this.time.delayedCall(0, () => { page += 1; render(); })
        });
        layer.add(prev.container);
        layer.add(next.container);
        layer.add(label(this, W / 2, top + 760, `${page + 1} / ${pageCount}`, 17, C.softText, {
          originX: 0.5, originY: 0.5
        }));
      }

      const close = button(this, {
        x: W / 2, y: top + height - 66, w: 240, h: 56,
        text: 'Close', fontSize: 18, fill: C.paperDark, color: C.inkText,
        depth: depth + 2,
        onClick: () => root.close()
      });
      layer.add(close.container);
      root.setScrollFactor(0, 0, true);
    };

    render();
  }
}
