import { AudioSystem } from '../audio/AudioSystem';
import { ENEMY_BY_ID, enemyForStage, type AIProfile } from '../data/enemies';
import { FIGHTERS, FIGHTER_BY_ID } from '../data/fighters';
import { STAGE_BY_ID, STAGES, type StageDef } from '../data/stages';
import { STORY_ENDINGS } from '../data/story/dialogue';
import { Assist } from '../entities/Assist';
import { Fighter } from '../entities/Fighter';
import { Projectile } from '../entities/Projectile';
import { InputManager } from '../input/InputManager';
import { Renderer } from '../render/Renderer';
import { AISystem } from '../systems/AISystem';
import { CombatSystem } from '../systems/CombatSystem';
import { DialogueSystem } from '../systems/DialogueSystem';
import { Progression } from '../systems/Progression';
import { RoundSystem } from '../systems/RoundSystem';
import { StorySystem } from '../systems/StorySystem';
import { DialogueUI } from '../ui/DialogueUI';
import { TouchControls } from '../ui/TouchControls';
import { UI } from '../ui/UI';

export class Game {
  readonly progression = new Progression();
  readonly input = new InputManager();
  readonly renderer: Renderer;
  readonly audio = new AudioSystem();
  readonly combat = new CombatSystem();
  readonly round = new RoundSystem();
  readonly ai = new AISystem({ difficulty: 1 });
  readonly story: StorySystem;
  readonly dialogue = new DialogueSystem();
  readonly ui: UI;
  readonly dialogueUI: DialogueUI;
  readonly touch: TouchControls;

  player: Fighter | null = null;
  enemy: Fighter | null = null;
  projectiles: Projectile[] = [];
  assists: Assist[] = [];
  mode: 'menu' | 'fight' | 'result' | 'dialogue' | 'ending' = 'menu';
  paused = false;
  arcadeSeed = 0;
  arcadeMode = true;
  storyActive = false;
  currentStage: StageDef = STAGES[0];
  currentEnemy: AIProfile = ENEMY_BY_ID.grunt;
  private teamMain = 'rubber';
  private teamAssists: [string, string] = ['blade', 'storm'];
  private time = 0;
  private accumulator = 0;
  private lastTime = performance.now();

  constructor(app: HTMLElement, canvas: HTMLCanvasElement) {
    this.progression.load();
    this.story = new StorySystem(this.progression);
    this.story.syncFromSave();
    this.renderer = new Renderer(canvas);
    this.audio.setVolumes(this.progression.data.musicVolume, this.progression.data.sfxVolume, false);

    this.ui = new UI(app, {
      onStory: () => this.startStory(),
      onArcade: () => { this.arcadeMode = true; this.arcadeSeed = 0; this.storyActive = false; this.ui.select(this.progression); },
      onQuick: () => { this.arcadeMode = false; this.storyActive = false; this.ui.select(this.progression); },
      onTeam: (main, assists) => { this.teamMain = main; this.teamAssists = assists; this.prepareFight(); },
      onFight: () => this.startFight(),
      onNext: () => this.nextBattle(),
      onResume: () => this.resume(),
      onMenu: () => this.toMenu(),
      onSetting: (key, value) => this.setting(key, value)
    });
    this.dialogueUI = new DialogueUI(app, {
      onChoice: (i) => this.onDialogueChoice(i),
      onAdvance: () => this.audio.play('menu')
    });
    this.ui.bindSettings(this.progression);
    this.touch = new TouchControls(app, this.input);
    this.touch.onPause = () => this.togglePause();
    this.input.onPause = () => this.togglePause();

    this.ui.main(this.progression);
    requestAnimationFrame(() => this.loop());
  }

  private setting(key: string, value: string | number | boolean) {
    if (key === 'music') {
      this.progression.data.musicVolume = Number(value);
      this.audio.setVolumes(Number(value), this.progression.data.sfxVolume, false);
    } else if (key === 'sfx') {
      this.progression.data.sfxVolume = Number(value);
      this.audio.setVolumes(this.progression.data.musicVolume, Number(value), false);
    } else if (key === 'quality') {
      this.progression.data.quality = value as 'low' | 'medium' | 'high';
    }
    this.progression.save();
  }

  private opponentFor(seed: number) {
    const pool = FIGHTERS.filter((f) => this.progression.isUnlocked(f.id) && f.id !== this.teamMain);
    const list = pool.length ? pool : FIGHTERS.filter((f) => this.progression.isUnlocked(f.id));
    return list[seed % list.length] ?? FIGHTERS[0];
  }

  private startStory() {
    this.story.syncFromSave();
    if (this.story.finished) this.story.newGame();
    this.storyActive = true;
    this.arcadeMode = false;
    this.showDialogue(this.story.introNode());
  }

  private showDialogue(id: string) {
    if (!this.dialogue.start(id)) { this.toMenu(); return; }
    this.dialogueUI.show(this.dialogue.node!);
    this.mode = 'dialogue';
    this.paused = false;
    this.touch.hide();
    this.ui.hide();
    this.ui.hideHud();
    this.audio.stopMusic();
  }

  private onDialogueChoice(index: number) {
    const choice = this.dialogue.choice(index);
    if (!choice) return;
    this.audio.play('select');
    const effects = choice.effects ?? {};
    const result = this.story.apply(effects);
    this.progression.save();

    if (result.ending) { this.dialogueUI.hide(); this.showEnding(result.ending); return; }
    if (effects.startBattle || effects.retry) {
      this.dialogueUI.hide();
      this.storyActive = true;
      this.startFight();
      return;
    }
    if (result.nextChapter) { this.showDialogue(this.story.introNode()); return; }
    if (choice.next) { this.showDialogue(choice.next); return; }
    this.dialogueUI.hide();
    this.toMenu();
  }

  private showEnding(id: string) {
    this.progression.recordEnding(id);
    const e = STORY_ENDINGS[id] ?? STORY_ENDINGS.legend;
    this.dialogueUI.show({
      speaker: 'THE END', portrait: 'gold',
      text: `${e.title}\n\n${e.text}`,
      choices: [{ text: 'RETURN TO MENU' }]
    });
    this.mode = 'ending';
    this.ui.main(this.progression);
    this.rootHidden();
  }

  private rootHidden() {
    // keep the dialogue above the menu while the ending is displayed
    this.dialogueUI.root.style.zIndex = '40';
  }

  private prepareFight() {
    this.audio.ensure();
    if (this.arcadeMode) {
      const foe = this.opponentFor(this.arcadeSeed);
      const stage = STAGES[this.arcadeSeed % STAGES.length];
      this.ui.arcade(this.arcadeSeed, this.progression, foe.name, stage.name);
    } else this.startFight();
  }

  private startFight() {
    this.audio.ensure();
    const chapter = this.storyActive ? this.story.chapter : null;
    const foe = chapter ? FIGHTER_BY_ID[chapter.fighterId] ?? FIGHTERS[0] : this.opponentFor(this.arcadeSeed);
    const profile = chapter ? ENEMY_BY_ID[chapter.enemyType] ?? ENEMY_BY_ID.grunt : enemyForStage(this.arcadeSeed);
    const stage = chapter ? STAGE_BY_ID[chapter.stageId] ?? STAGES[0] : STAGES[this.arcadeSeed % STAGES.length];
    this.currentStage = stage;
    this.currentEnemy = profile;

    const foeAssists = FIGHTERS.filter((f) => f.id !== foe.id && this.progression.isUnlocked(f.id)).slice(0, 2).map((f) => f.id) as [string, string];
    this.player = new Fighter(FIGHTER_BY_ID[this.teamMain], 'player', 'player', 130, 1, this.teamAssists, stage.platforms);
    this.enemy = new Fighter(foe, 'enemy', 'enemy', 350, -1, foeAssists, stage.platforms);
    this.enemy.damageScale = profile.damageScale;
    this.enemy.defenseBonus = profile.defenseBonus;
    this.enemy.knockbackResist = profile.knockbackResist;
    this.enemy.speedScale = profile.speedScale;
    this.enemy.isBoss = !!profile.boss;

    this.projectiles = [];
    this.assists = [];
    this.round.reset();
    this.combat.reset();
    this.ai.reset();
    this.ai.configure(profile);
    this.input.clear();
    this.ui.hide();
    this.ui.showHudNames(this.player, this.enemy, `${foe.name} · ${profile.name}`);
    this.touch.show();
    this.audio.startMusic();
    this.mode = 'fight';
    this.paused = false;
    this.ui.banner(`ROUND 1`);
  }

  private nextBattle() {
    this.arcadeSeed++;
    if (this.arcadeSeed >= 8) { this.ui.clear(this.progression); this.mode = 'menu'; return; }
    this.prepareFight();
  }

  private finishMatch(won: boolean) {
    this.touch.hide();
    this.ui.hideHud();
    this.audio.stopMusic();
    this.audio.play(won ? 'win' : 'lose');
    if (this.storyActive) {
      this.showDialogue(won ? this.story.winNode() : this.story.loseNode());
      return;
    }
    this.mode = 'result';
    if (this.arcadeMode) this.progression.recordMatch(won, this.arcadeSeed);
    this.ui.result(won, this.arcadeSeed, this.arcadeSeed >= 7 && won);
  }

  private toMenu() {
    this.mode = 'menu';
    this.paused = false;
    this.storyActive = false;
    this.player = this.enemy = null;
    this.projectiles = [];
    this.assists = [];
    this.audio.stopMusic();
    this.touch.hide();
    this.dialogueUI.hide();
    this.dialogueUI.root.style.zIndex = '';
    this.ui.hideHud();
    this.ui.main(this.progression);
  }

  private togglePause() {
    if (this.mode !== 'fight') return;
    this.paused = !this.paused;
    if (this.paused) { this.touch.hide(); this.audio.stopMusic(); this.ui.pause('none'); }
    else this.resume();
  }

  private resume() {
    this.paused = false;
    this.ui.hide();
    this.touch.show();
    this.audio.startMusic();
  }

  private spawnAssist(f: Fighter, slot: number) {
    const id = f.assists[slot];
    const def = FIGHTER_BY_ID[id];
    if (!def) return;
    const x = f.centerX - f.facing * 48;
    this.assists.push(new Assist(def, f.team, x, 190, f.facing, 8 + def.stats.power));
    this.audio.play('assist');
  }

  private step(dt: number) {
    if (this.mode !== 'fight' || this.paused || !this.player || !this.enemy) return;
    const p = this.player, e = this.enemy;
    const pin = this.input.frame();
    const ein = this.ai.decide(dt, e, p);

    if (!this.combat.frozen) {
      p.update(dt, pin);
      e.update(dt, ein);
    }
    if (p.pendingAssist !== null) { this.spawnAssist(p, p.pendingAssist); p.pendingAssist = null; }
    if (e.pendingAssist !== null) { this.spawnAssist(e, e.pendingAssist); e.pendingAssist = null; }

    if (e.isBoss && !e.phase2 && e.hp > 0 && e.hp <= 50) {
      e.phase2 = true;
      e.damageScale *= 1.3;
      e.speedScale *= 1.2;
      e.defenseBonus += 1;
      this.ui.banner('BOSS · PHASE 2');
      this.audio.play('special');
      this.renderer.addShake(8);
    }

    this.combat.spawnProjectiles([p, e], this.projectiles);
    this.combat.update(dt, [p, e], this.projectiles, this.assists, {
      onSound: (n) => this.audio.play(n),
      onShake: (a) => this.renderer.addShake(a),
      onHit: (ev) => this.renderer.burst(ev.x, ev.y, ev.heavy ? '#f4c542' : '#ffffff', ev.heavy ? 12 : 6)
    });
    this.projectiles = this.projectiles.filter((x) => !x.dead);
    this.assists = this.assists.filter((x) => !x.dead);

    const ev = this.round.update(dt, p, e);
    if (ev?.banner) this.ui.banner(ev.banner);
    if (ev?.sound && ev.type !== 'fight') this.audio.play(ev.sound);
    if (ev?.type === 'matchEnd') this.finishMatch(ev.winner === 'player');
    this.audio.update(dt);
  }

  private loop() {
    requestAnimationFrame(() => this.loop());
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.time += dt;
    this.accumulator += dt;
    while (this.accumulator >= 1 / 60) {
      this.step(1 / 60);
      this.accumulator -= 1 / 60;
    }
    if (this.mode === 'dialogue' || this.mode === 'ending') this.dialogueUI.update(dt);
    this.renderer.update(dt);
    this.renderer.render({
      stage: this.currentStage,
      fighters: this.player && this.enemy ? [this.player, this.enemy] : [],
      assists: this.assists,
      projectiles: this.projectiles,
      time: this.time
    });
    if (this.mode === 'fight' && !this.paused && this.player && this.enemy) this.ui.updateHud(this.player, this.enemy, this.round, dt);
  }

  /** Debug helpers used by the automated browser smoke test. */
  debugForceKO(team: 'player' | 'enemy') {
    const target = team === 'player' ? this.player : this.enemy;
    if (target) { target.hp = 0; target.state = 'ko'; }
  }
}
