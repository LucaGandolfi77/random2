import Phaser from 'phaser';
import { dailyPlan, utcDate, vaultById, vaults, type DailyPlan } from '@crew-of-one/content';
import { applyModifier, HeistSim, modifierById } from '@crew-of-one/sim';
import type { CameraState, GhostState, GuardState, LaserState, LeverState, ModifierId, SimInput, VaultDef } from '@crew-of-one/sim';
import {
  hasSeenIntro,
  loadProgress,
  markIntroSeen,
  recordAttempt,
  recordResult,
  resetProgress,
  type SaveData,
} from './progress';
import { PrototypeAudio } from './audio';
import {
  CONTROL_LAYOUTS,
  loadHandedness,
  saveHandedness,
  type ControlLayout,
  type Handedness,
} from './controls';
import { initInstallPrompt, promptInstall, shareText } from './pwa';
import {
  fetchDailyConfig,
  fetchLeaderboard,
  getNickname,
  getPlayerId,
  saveNickname,
  submitRun,
} from './api';
import { MetaUI, type DailySummary } from './ui';
import './style.css';

const DESIGN_WIDTH = 360;
const DESIGN_HEIGHT = 640;
const BOARD_X = 20;
const BOARD_Y = 64;
const BOARD_W = 320;
const BOARD_H = 512;

const COLORS = {
  ink: 0x0b132b,
  deep: 0x1c2541,
  slate: 0x3a506b,
  bone: 0xf4f1de,
  gold: 0xe9c46a,
  alarm: 0xe63946,
  ghost: 0x5bc0eb,
  green: 0x8ac926,
};

const EMPTY_INPUT: SimInput = { moveX: 0, moveY: 0, interact: false, dash: false };

class PrototypeScene extends Phaser.Scene {
  private sim!: HeistSim;
  private vault!: VaultDef;
  private graphics!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private echoText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private rewindText!: Phaser.GameObjects.Text;
  private whistleText!: Phaser.GameObjects.Text;
  private dashText!: Phaser.GameObjects.Text;
  private undoText!: Phaser.GameObjects.Text;
  private resetText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyR!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyU!: Phaser.Input.Keyboard.Key;
  private keyOne!: Phaser.Input.Keyboard.Key;
  private keyTwo!: Phaser.Input.Keyboard.Key;
  private keyThree!: Phaser.Input.Keyboard.Key;
  private keyFour!: Phaser.Input.Keyboard.Key;
  private keyFive!: Phaser.Input.Keyboard.Key;
  private keySix!: Phaser.Input.Keyboard.Key;
  private keySeven!: Phaser.Input.Keyboard.Key;
  private keyEight!: Phaser.Input.Keyboard.Key;
  private keyNine!: Phaser.Input.Keyboard.Key;
  private keyZero!: Phaser.Input.Keyboard.Key;
  private keyShift!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyBackspace!: Phaser.Input.Keyboard.Key;
  private keyEscape!: Phaser.Input.Keyboard.Key;
  private keyP!: Phaser.Input.Keyboard.Key;
  private accumulator = 0;
  private joystickPointerId: number | null = null;
  private joystickOrigin = { x: 0, y: 0 };
  private joystickVector = { x: 0, y: 0 };
  private whistleRequested = false;
  private dashRequested = false;
  private playableVaults: VaultDef[] = [];
  private daily: DailyPlan | null = null;
  private dailyDate = '';
  private isDaily = false;
  private progress: SaveData = { version: 1, vaults: {} };
  private ui!: MetaUI;
  private currentIndex = 0;
  private paused = true;
  private resultOpen = false;
  private wonHandled = false;
  private lastStatus: string = 'playing';
  private failureStreak = 0;
  private previewEndsAtMs = 0;
  private playerId = '';
  private alarmCount = 0;
  private resultToken = 0;
  private nickname = '';
  private audio = new PrototypeAudio();
  private lastPlates: Record<string, boolean> = {};
  private lastDoors: Record<string, boolean> = {};
  private lastLevers: Record<string, boolean> = {};
  private lastGemHolder = 'world';
  private lastShare: string | null = null;
  private handedness: Handedness = 'right';
  private controls: ControlLayout = CONTROL_LAYOUTS.right;
  private reduceMotion = false;

  constructor() {
    super('prototype');
  }

  create(): void {
    this.handedness = loadHandedness();
    this.controls = CONTROL_LAYOUTS[this.handedness];
    const baseVault = vaults[0];
    if (!baseVault) throw new Error('No vault content found.');
    this.playableVaults = [...vaults];
    this.loadVault(0);

    this.graphics = this.add.graphics();

    this.hudText = this.add.text(24, 18, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#F4F1DE',
    });
    this.echoText = this.add.text(24, 36, '', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#A8E0F0',
    });
    this.statusText = this.add.text(336, 18, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#E9C46A',
    }).setOrigin(1, 0);
    this.helpText = this.add.text(180, 570, 'DRAG · E WHISTLE · R REWIND', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#3A506B',
    }).setOrigin(0.5, 0);
    this.rewindText = this.add.text(this.controls.rewind.x + this.controls.rewind.w / 2, this.controls.rewind.y + this.controls.rewind.h / 2, 'REWIND', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#F4F1DE',
    }).setOrigin(0.5);
    this.whistleText = this.add.text(this.controls.act.x + this.controls.act.w / 2, this.controls.act.y + this.controls.act.h / 2, 'ACT', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#F4F1DE',
    }).setOrigin(0.5);
    this.dashText = this.add.text(this.controls.dash.x + this.controls.dash.w / 2, this.controls.dash.y + this.controls.dash.h / 2, 'DASH', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#F4F1DE',
    }).setOrigin(0.5);
    this.undoText = this.add.text(this.controls.undo.x + this.controls.undo.w / 2, this.controls.undo.y + this.controls.undo.h / 2, 'UNDO', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#F4F1DE',
    }).setOrigin(0.5);
    this.resetText = this.add.text(336, 40, 'RESET', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#8C1C26',
    }).setOrigin(1, 0);

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error('Keyboard input unavailable.');
    this.cursors = keyboard.createCursorKeys();
    this.keyW = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyR = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyE = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyU = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U);
    this.keyOne = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.keyTwo = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    this.keyThree = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.THREE);
    this.keyFour = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR);
    this.keyFive = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE);
    this.keySix = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SIX);
    this.keySeven = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SEVEN);
    this.keyEight = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.EIGHT);
    this.keyNine = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.NINE);
    this.keyZero = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ZERO);
    this.keyShift = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.keySpace = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyBackspace = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
    this.keyEscape = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.keyP = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    this.input.addPointer(2);
    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.input.on('pointerupoutside', this.onPointerUp, this);

    this.cameras.main.setBackgroundColor(COLORS.ink);

    this.reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.progress = loadProgress();
    this.playerId = getPlayerId();
    this.nickname = getNickname();
    this.dailyDate = utcDate();
    this.daily = dailyPlan(this.dailyDate, this.playableVaults);
    this.ui = new MetaUI({
      onStart: (index) => this.startVault(index),
      onStartDaily: () => this.startDaily(),
      onReplay: () => {
        if (this.isDaily) this.startDaily();
        else this.startVault(this.currentIndex);
      },
      onNext: () => {
        if (!this.isDaily) this.startVault(this.currentIndex + 1);
      },
      onMenu: () => this.openMenu(),
      onToggleMenu: () => {
        if (this.ui.isMenuOpen()) this.closeMenu();
        else this.openMenu();
      },
      onTogglePreview: () => this.togglePreview(),
      onToggleSound: () => this.ui.setSoundMuted(this.audio.toggleMuted()),
      onOpenLeaderboard: () => this.openLeaderboard(),
      onRefreshLeaderboard: () => void this.loadLeaderboard(),
      onCloseLeaderboard: () => this.ui.hideLeaderboard(),
      onSaveNickname: (nickname) => void this.updateNickname(nickname),
      onInstall: () => void this.handleInstall(),
      onShare: () => void this.handleShare(),
      onOpenHowTo: () => this.ui.showHowTo(),
      onCloseHowTo: () => {
        this.ui.hideHowTo();
        markIntroSeen();
      },
      onToggleHandedness: () => this.toggleHandedness(),
      onResetProgress: () => this.handleResetProgress(),
    });

    this.ui.setSoundMuted(this.audio.isMuted());
    this.ui.setHandedness(this.handedness === 'left');
    initInstallPrompt((mode) => this.ui.setInstallAvailable(mode));
    keyboard.on('keydown', () => this.audio.unlock());
    this.openMenu();
    this.render();
    if (!hasSeenIntro()) this.ui.showHowTo();
    void this.syncDailyFromApi();
  }

  private async syncDailyFromApi(): Promise<void> {
    const remote = await fetchDailyConfig();
    if (!remote || remote.dailyId !== utcDate()) return;
    const base = vaultById(remote.vaultId);
    if (!base) return;
    const modifier = modifierById(remote.modifier as ModifierId);
    if (!modifier) return;

    const vault = applyModifier(base, modifier.id);
    vault.id = `daily-${remote.dailyId}`;
    vault.name = `Daily · ${base.name}`;
    vault.hints = [
      `${modifier.name}: ${modifier.description}`,
      base.hints[0] ?? 'You know the vault. Now do it under pressure.',
    ];
    this.daily = { date: remote.dailyId, modifier, baseVault: base, vault };
    this.dailyDate = remote.dailyId;
    if (this.ui.isMenuOpen()) {
      this.ui.showMenu(this.playableVaults, this.progress, this.dailySummary());
    }
  }

  override update(_time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.keyEscape)) {
      if (this.ui.isMenuOpen()) this.closeMenu();
      else this.openMenu();
      return;
    }

    if (this.paused || this.resultOpen) {
      this.render();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyP)) {
      this.togglePreview();
      return;
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyR)) this.doRewind();
    if (Phaser.Input.Keyboard.JustDown(this.keyBackspace)) this.doReset();
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) this.whistleRequested = true;
    if (Phaser.Input.Keyboard.JustDown(this.keyShift) || Phaser.Input.Keyboard.JustDown(this.keySpace)) {
      this.dashRequested = true;
      this.audio.dash();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keyU)) this.doUndo();
    if (Phaser.Input.Keyboard.JustDown(this.keyOne)) this.loadVault(0);
    if (Phaser.Input.Keyboard.JustDown(this.keyTwo)) this.loadVault(1);
    if (Phaser.Input.Keyboard.JustDown(this.keyThree)) this.loadVault(2);
    if (Phaser.Input.Keyboard.JustDown(this.keyFour)) this.loadVault(3);
    if (Phaser.Input.Keyboard.JustDown(this.keyFive)) this.loadVault(4);
    if (Phaser.Input.Keyboard.JustDown(this.keySix)) this.loadVault(5);
    if (Phaser.Input.Keyboard.JustDown(this.keySeven)) this.loadVault(6);
    if (Phaser.Input.Keyboard.JustDown(this.keyEight)) this.loadVault(7);
    if (Phaser.Input.Keyboard.JustDown(this.keyNine)) this.loadVault(8);
    if (Phaser.Input.Keyboard.JustDown(this.keyZero)) this.loadVault(9);

    const status = this.sim.state.status;
    if (status === 'won' || status === 'alarm') {
      this.checkRunEnd(status);
      this.render();
      return;
    }

    this.accumulator += Math.min(delta, 100);
    const stepMs = 1000 / 60;
    const previewSpeed = this.sim.isPreviewing() ? 2 : 1;
    let steps = 0;
    const input = this.readInput();
    while (this.accumulator >= stepMs && steps < 5 * previewSpeed) {
      for (let step = 0; step < previewSpeed; step += 1) {
        this.sim.tick(input);
      }
      this.accumulator -= stepMs;
      steps += 1;

      if (this.sim.state.status === 'timeout') {
        this.noteFailure('timeout');
        this.doRewind();
        break;
      }
    }

    if (this.sim.isPreviewing() && this.sim.state.timeMs >= this.previewEndsAtMs) {
      this.stopPreview();
    }

    this.checkRunEnd(this.sim.state.status);
    this.render();
  }

  private togglePreview(): void {
    if (this.sim.isPreviewing()) {
      this.stopPreview();
      return;
    }
    if (this.sim.state.status !== 'playing' || this.paused || this.resultOpen) return;
    if (!this.sim.startPreview()) return;
    this.previewEndsAtMs = this.sim.getPreviewLengthMs();
    this.accumulator = 0;
    this.joystickVector = { x: 0, y: 0 };
    if (!this.reduceMotion) this.cameras.main.flash(140, 91, 192, 235);
    this.audio.preview();
  }

  private stopPreview(): void {
    if (!this.sim.stopPreview()) return;
    this.accumulator = 0;
    this.lastStatus = 'playing';
    this.wonHandled = false;
    if (!this.reduceMotion) this.cameras.main.flash(120, 233, 196, 106);
    this.audio.previewStop();
  }

  private readInput(): SimInput {
    let moveX = 0;
    let moveY = 0;

    if (this.joystickVector.x !== 0 || this.joystickVector.y !== 0) {
      moveX = this.joystickVector.x;
      moveY = this.joystickVector.y;
    } else {
      if (this.cursors.left.isDown || this.keyA.isDown) moveX -= 1;
      if (this.cursors.right.isDown || this.keyD.isDown) moveX += 1;
      if (this.cursors.up.isDown || this.keyW.isDown) moveY -= 1;
      if (this.cursors.down.isDown || this.keyS.isDown) moveY += 1;
    }

    const interact = this.whistleRequested;
    const dash = this.dashRequested;
    this.whistleRequested = false;
    this.dashRequested = false;
    return { moveX, moveY, interact, dash };
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    this.audio.unlock();
    if (this.inRect(pointer, this.controls.rewind)) {
      this.doRewind();
      return;
    }
    if (this.inRect(pointer, this.controls.act)) {
      this.whistleRequested = true;
      return;
    }
    if (this.inRect(pointer, this.controls.dash)) {
      this.dashRequested = true;
      this.audio.dash();
      return;
    }
    if (this.inRect(pointer, this.controls.undo)) {
      this.doUndo();
      return;
    }
    if (pointer.x >= 300 && pointer.y <= 56) {
      this.doReset();
      return;
    }
    if (this.joystickPointerId !== null) return;
    this.joystickPointerId = pointer.id;
    this.joystickOrigin = { x: pointer.x, y: pointer.y };
    this.joystickVector = { x: 0, y: 0 };
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joystickPointerId) return;
    const dx = pointer.x - this.joystickOrigin.x;
    const dy = pointer.y - this.joystickOrigin.y;
    const length = Math.hypot(dx, dy);
    if (length < 8) {
      this.joystickVector = { x: 0, y: 0 };
      return;
    }
    const max = 52;
    const strength = Math.min(1, length / max);
    this.joystickVector = { x: (dx / length) * strength, y: (dy / length) * strength };
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joystickPointerId) return;
    this.joystickPointerId = null;
    this.joystickVector = { x: 0, y: 0 };
  }

  private doRewind(): void {
    if (this.sim.isPreviewing()) {
      this.stopPreview();
      return;
    }
    const result = this.sim.rewind();
    if (!result.ok) {
      if (result.reason === 'max-echoes') {
        this.noteFailure('max-echoes');
        this.sim.reset();
        if (!this.reduceMotion) this.cameras.main.flash(140, 230, 57, 70);
        this.lastStatus = 'playing';
        this.wonHandled = false;
      }
      return;
    }
    if (!this.reduceMotion) {
      this.cameras.main.flash(120, 91, 192, 235);
      this.cameras.main.shake(90, 0.003);
    }
    this.audio.rewind();
    this.accumulator = 0;
    this.lastStatus = 'playing';
    this.wonHandled = false;
  }

  private layoutControls(): void {
    const c = this.controls;
    this.rewindText.setPosition(c.rewind.x + c.rewind.w / 2, c.rewind.y + c.rewind.h / 2);
    this.whistleText.setPosition(c.act.x + c.act.w / 2, c.act.y + c.act.h / 2);
    this.dashText.setPosition(c.dash.x + c.dash.w / 2, c.dash.y + c.dash.h / 2);
    this.undoText.setPosition(c.undo.x + c.undo.w / 2, c.undo.y + c.undo.h / 2);
  }

  private toggleHandedness(): void {
    this.handedness = this.handedness === 'right' ? 'left' : 'right';
    this.controls = CONTROL_LAYOUTS[this.handedness];
    saveHandedness(this.handedness);
    this.layoutControls();
    this.ui.setHandedness(this.handedness === 'left');
  }

  private loadVault(index: number): void {
    const vault = this.playableVaults[index] ?? this.playableVaults[0];
    if (!vault) return;
    this.loadVaultDef(vault, this.playableVaults.indexOf(vault), false);
  }

  private loadVaultDef(vault: VaultDef, index: number, daily: boolean): void {
    this.currentIndex = index;
    this.isDaily = daily;
    this.vault = vault;
    this.sim = new HeistSim(vault);
    this.accumulator = 0;
    this.joystickVector = { x: 0, y: 0 };
    this.whistleRequested = false;
    this.dashRequested = false;
    this.lastStatus = 'playing';
    this.wonHandled = false;
    this.failureStreak = 0;
    this.previewEndsAtMs = 0;
    this.alarmCount = 0;
    this.lastPlates = {};
    this.lastDoors = {};
    this.lastLevers = {};
    this.lastGemHolder = 'world';
    this.lastShare = null;
  }

  private startDaily(): void {
    if (!this.daily) return;
    this.loadVaultDef(this.daily.vault, -1, true);
    recordAttempt(this.progress, this.daily.vault.id);
    this.resultOpen = false;
    this.paused = false;
    this.ui.hideMenu();
    this.ui.hideResult();
    this.ui.hideLeaderboard();
    this.ui.setMenuButtonVisible(true);
  }

  private dailySummary(): DailySummary | undefined {
    const plan = this.daily;
    if (!plan) return undefined;
    const record = this.progress.vaults[plan.vault.id];
    return {
      date: plan.date,
      vaultName: plan.vault.name.replace(/^Daily · /, ''),
      modifierName: plan.modifier.name,
      modifierDescription: plan.modifier.description,
      completed: record?.completed ?? false,
      bestTimeMs: record?.bestTimeMs ?? 0,
      bestRank: record?.bestRank ?? 'C',
    };
  }

  private openLeaderboard(): void {
    if (!this.daily) return;
    this.ui.showLeaderboard({
      date: this.daily.date,
      playerId: this.playerId,
      nickname: this.nickname,
      entries: [],
      playerRank: null,
      status: 'loading',
    });
    void this.loadLeaderboard();
  }

  private async loadLeaderboard(): Promise<void> {
    if (!this.daily) return;
    const response = await fetchLeaderboard(this.daily.date, this.playerId);
    this.ui.showLeaderboard({
      date: this.daily.date,
      playerId: this.playerId,
      nickname: this.nickname,
      entries: response?.entries ?? [],
      playerRank: response?.playerRank ?? null,
      status: response ? 'ready' : 'offline',
    });
  }

  private async updateNickname(nickname: string): Promise<void> {
    this.nickname = nickname;
    const saved = await saveNickname(this.playerId, nickname);
    if (!saved) {
      this.ui.setLeaderboardNote('Saved on this device · leaderboard offline.');
      return;
    }
    await this.loadLeaderboard();
  }

  private async handleInstall(): Promise<void> {
    const result = await promptInstall();
    if (result === 'unavailable') {
      this.ui.showHint('Use your browser menu to install Crew of One.');
    }
  }

  private async handleShare(): Promise<void> {
    const text =
      this.lastShare ??
      'The crew is you. Ten vaults, one time loop, and a daily heist.';
    const outcome = await shareText(text, window.location.href);
    if (outcome === 'copied') {
      this.ui.showHint('Run copied to the clipboard.');
    } else if (outcome === 'unavailable') {
      this.ui.showHint('Sharing is unavailable in this browser.');
    }
  }

  private startVault(index: number): void {
    const vault = this.playableVaults[index];
    if (!vault) return;
    this.loadVault(index);
    recordAttempt(this.progress, vault.id);
    this.resultOpen = false;
    this.paused = false;
    this.ui.hideMenu();
    this.ui.hideResult();
    this.ui.hideLeaderboard();
    this.ui.setMenuButtonVisible(true);
  }

  private openMenu(): void {
    const today = utcDate();
    if (today !== this.dailyDate) {
      this.dailyDate = today;
      this.daily = dailyPlan(today, this.playableVaults);
    }
    this.paused = true;
    this.resultOpen = false;
    this.ui.hideLeaderboard();
    this.ui.hideResult();
    this.ui.showMenu(this.playableVaults, this.progress, this.dailySummary());
  }

  private closeMenu(): void {
    this.ui.hideMenu();
    this.ui.setMenuButtonVisible(true);
    this.paused = this.sim.state.status === 'won';
    if (this.sim.state.status === 'won') {
      this.openMenu();
    }
  }

  private handleResetProgress(): void {
    if (!window.confirm('Erase all best times and ranks?')) return;
    this.progress = resetProgress();
    this.ui.showMenu(this.playableVaults, this.progress, this.dailySummary());
  }

  private noteFailure(reason: 'alarm' | 'timeout' | 'max-echoes'): void {
    if (reason === 'alarm') this.alarmCount += 1;
    this.failureStreak += 1;
    if (this.failureStreak === 2 && this.vault.hints[0]) {
      this.ui.showHint(this.vault.hints[0]);
    } else if (this.failureStreak === 4 && this.vault.hints[1]) {
      this.ui.showHint(this.vault.hints[1]);
    }
  }

  private checkRunEnd(status: string): void {
    if (status === 'alarm' && this.lastStatus !== 'alarm') {
      this.noteFailure('alarm');
      this.audio.alarm();
    }
    if (status === 'won' && !this.wonHandled) {
      this.wonHandled = true;
      this.handleWin();
    }
    this.lastStatus = status;
  }

  private handleWin(): void {
    this.audio.win();
    const resultToken = ++this.resultToken;
    const timeMs = this.sim.state.timeMs;
    const echoes = this.sim.state.tracks.length;
    const shareTime = (timeMs / 1000).toFixed(2);
    this.lastShare =
      this.isDaily && this.daily
        ? `I cleared today's ${this.daily.baseVault.name} daily (${this.daily.modifier.name}) in ${shareTime}s with ${echoes} echoes.`
        : `I cleared ${this.vault.name} in ${shareTime}s with ${echoes} echoes. The crew was me.`;
    const record = recordResult(
      this.progress,
      this.vault.id,
      timeMs,
      echoes,
      this.vault.parEchoes,
    );
    this.resultOpen = true;
    this.paused = true;
    this.ui.setMenuButtonVisible(false);
    const payload = {
      vault: this.vault,
      index: this.currentIndex,
      timeMs,
      echoes,
      rank: record.rank,
      isBest: record.isBest,
      best: record.best,
      hasNext: !this.isDaily && this.currentIndex < this.playableVaults.length - 1,
    };
    this.time.delayedCall(550, () => {
      this.ui.showResult(payload, record.rank.toLowerCase());
      this.ui.setResultNote(
        this.isDaily ? 'VERIFYING DAILY RUN…' : 'BEST SAVED LOCALLY',
      );
    });

    if (this.isDaily) void this.submitDailyRun(resultToken);
  }

  private async submitDailyRun(resultToken: number): Promise<void> {
    if (!this.daily) return;
    const submission = this.sim.getSubmission();
    const response = await submitRun({
      dailyId: this.daily.date,
      playerId: this.playerId,
      vaultId: this.daily.baseVault.id,
      echoes: submission.echoes,
      timeMs: submission.timeMs,
      alarms: this.alarmCount,
      tracks: submission.tracks,
    });

    if (resultToken !== this.resultToken) return;
    if (response?.ok) {
      if (this.lastShare) {
        this.lastShare += ` Rank #${response.rank ?? '—'} on today's board.`;
      }
      this.ui.setResultNote(
        `VERIFIED · RANK #${response.rank ?? '—'} OF TODAY'S CREW`,
      );
      return;
    }
    if (response && !response.ok) {
      this.ui.setResultNote(`NOT RANKED · ${response.error.replace(/-/g, ' ').toUpperCase()}`);
      return;
    }
    this.ui.setResultNote('OFFLINE · BEST SAVED LOCALLY');
  }

  private doUndo(): void {
    if (this.sim.isPreviewing()) {
      this.stopPreview();
      return;
    }
    if (this.sim.undoEcho()) this.audio.undo();
    this.accumulator = 0;
    this.joystickVector = { x: 0, y: 0 };
    this.lastStatus = 'playing';
    this.wonHandled = false;
  }

  private doReset(): void {
    if (this.sim.isPreviewing()) this.stopPreview();
    this.audio.reset();
    this.sim.reset();
    this.accumulator = 0;
    this.joystickVector = { x: 0, y: 0 };
    this.lastStatus = 'playing';
    this.wonHandled = false;
    this.failureStreak = 0;
    this.alarmCount = 0;
    this.resultOpen = false;
    this.paused = false;
    this.ui.hideResult();
    this.ui.setMenuButtonVisible(true);
  }

  private inRect(pointer: Phaser.Input.Pointer, rect: { x: number; y: number; w: number; h: number }): boolean {
    return (
      pointer.x >= rect.x &&
      pointer.x <= rect.x + rect.w &&
      pointer.y >= rect.y &&
      pointer.y <= rect.y + rect.h
    );
  }

  private playStateFeedback(): void {
    if (this.sim.isPreviewing()) return;
    const state = this.sim.state;

    for (const plate of state.plates) {
      if (plate.pressed && !this.lastPlates[plate.id]) this.audio.plate();
      this.lastPlates[plate.id] = plate.pressed;
    }
    for (const door of state.doors) {
      if (door.open && !this.lastDoors[door.id]) this.audio.door();
      this.lastDoors[door.id] = door.open;
    }
    for (const lever of state.levers) {
      if (lever.pressed && !this.lastLevers[lever.id]) this.audio.lever();
      this.lastLevers[lever.id] = lever.pressed;
    }

    const holder = state.gem?.holder ?? 'world';
    if (holder !== this.lastGemHolder) {
      if (holder !== 'world') this.audio.gem();
      this.lastGemHolder = holder;
    }
  }

  private render(): void {
    const g = this.graphics;
    const state = this.sim.state;
    this.playStateFeedback();
    g.clear();

    g.fillStyle(COLORS.deep, 1);
    g.fillRect(BOARD_X, BOARD_Y, BOARD_W, BOARD_H);

    g.lineStyle(1, COLORS.slate, 0.25);
    for (let x = 0; x <= BOARD_W; x += this.vault.tileSize) {
      g.lineBetween(BOARD_X + x, BOARD_Y, BOARD_X + x, BOARD_Y + BOARD_H);
    }
    for (let y = 0; y <= BOARD_H; y += this.vault.tileSize) {
      g.lineBetween(BOARD_X, BOARD_Y + y, BOARD_X + BOARD_W, BOARD_Y + y);
    }

    for (const wall of this.vault.walls) {
      g.fillStyle(COLORS.slate, 1);
      g.fillRect(BOARD_X + wall.x, BOARD_Y + wall.y, wall.w, wall.h);
      g.lineStyle(1, COLORS.bone, 0.22);
      g.strokeRect(BOARD_X + wall.x + 0.5, BOARD_Y + wall.y + 0.5, wall.w - 1, wall.h - 1);
    }

    for (const door of state.doors) {
      const dx = BOARD_X + door.x;
      const dy = BOARD_Y + door.y;
      if (door.mode === 'oneway') {
        g.fillStyle(COLORS.gold, 0.16);
        g.fillRect(dx, dy, door.w, door.h);
        g.lineStyle(2, COLORS.gold, 0.9);
        g.strokeRect(dx + 1, dy + 1, door.w - 2, door.h - 2);
        const cx = dx + door.w / 2;
        const cy = dy + door.h / 2;
        const direction = door.passDirection ?? 2;
        const tip = 10;
        const base = 6;
        if (direction === 0) {
          g.fillTriangle(cx, cy - tip, cx - base, cy + base, cx + base, cy + base);
        } else if (direction === 1) {
          g.fillTriangle(cx + tip, cy, cx - base, cy - base, cx - base, cy + base);
        } else if (direction === 2) {
          g.fillTriangle(cx, cy + tip, cx - base, cy - base, cx + base, cy - base);
        } else {
          g.fillTriangle(cx - tip, cy, cx + base, cy - base, cx + base, cy + base);
        }
      } else if (door.open) {
        g.fillStyle(COLORS.green, 0.18);
        g.fillRect(dx, dy, door.w, door.h);
        g.lineStyle(1, COLORS.green, 0.7);
        g.strokeRect(dx + 0.5, dy + 0.5, door.w - 1, door.h - 1);
      } else {
        g.fillStyle(COLORS.alarm, 1);
        g.fillRect(dx, dy, door.w, door.h);
        g.lineStyle(2, COLORS.bone, 0.35);
        g.strokeRect(dx + 1, dy + 1, door.w - 2, door.h - 2);
      }
    }

    for (const plate of state.plates) {
      const color = plate.pressed ? COLORS.gold : COLORS.slate;
      g.fillStyle(color, 0.28);
      g.fillCircle(BOARD_X + plate.x, BOARD_Y + plate.y, plate.radius);
      g.lineStyle(2, color, 1);
      g.strokeCircle(BOARD_X + plate.x, BOARD_Y + plate.y, plate.radius);
      g.fillStyle(color, 1);
      g.fillCircle(BOARD_X + plate.x, BOARD_Y + plate.y, 4);
    }

    const exit = this.vault.exit;
    g.fillStyle(COLORS.gold, 0.15);
    g.fillCircle(BOARD_X + exit.x, BOARD_Y + exit.y, exit.radius);
    g.lineStyle(2, COLORS.gold, 0.9);
    g.strokeCircle(BOARD_X + exit.x, BOARD_Y + exit.y, exit.radius);
    g.fillStyle(COLORS.gold, 0.9);
    g.fillCircle(BOARD_X + exit.x, BOARD_Y + exit.y, 4);

    for (const noise of state.noises) {
      const age = state.timeMs - noise.createdAt;
      const alpha = Math.max(0, 1 - age / noise.ttlMs);
      const radius = 8 + (age / noise.ttlMs) * noise.radius;
      g.lineStyle(1, COLORS.ghost, alpha * 0.6);
      g.strokeCircle(BOARD_X + noise.x, BOARD_Y + noise.y, radius);
    }

    if (state.gem && state.gem.holder === 'world') {
      this.drawGemShape(g, BOARD_X + state.gem.x, BOARD_Y + state.gem.y, state.gem.radius);
    }

    for (const laser of state.lasers) {
      this.drawLaser(g, laser);
    }

    for (const camera of state.cameras) {
      this.drawCamera(g, camera);
    }

    for (const lever of state.levers) {
      this.drawLever(g, lever);
    }

    for (const guard of state.guards) {
      this.drawGuard(g, guard);
    }

    for (const ghost of state.ghosts) {
      this.drawGhost(g, ghost);
    }

    const previewing = this.sim.isPreviewing();
    const player = state.player;
    if (!previewing) {
      g.fillStyle(COLORS.ghost, 0.22);
      g.fillCircle(BOARD_X + player.x, BOARD_Y + player.y, 15);
      g.fillStyle(COLORS.bone, 1);
      g.fillCircle(BOARD_X + player.x, BOARD_Y + player.y, 10);
      g.lineStyle(2, COLORS.ghost, 1);
      g.strokeCircle(BOARD_X + player.x, BOARD_Y + player.y, 10);
      if (player.carryingGem) {
        this.drawGemShape(g, BOARD_X + player.x, BOARD_Y + player.y - 18, 8);
      }
    }

    if (this.joystickPointerId !== null) {
      g.lineStyle(1, COLORS.ghost, 0.35);
      g.strokeCircle(this.joystickOrigin.x, this.joystickOrigin.y, 40);
      g.fillStyle(COLORS.ghost, 0.5);
      g.fillCircle(
        this.joystickOrigin.x + this.joystickVector.x * 40,
        this.joystickOrigin.y + this.joystickVector.y * 40,
        12,
      );
    }

    this.drawEchoTimeline(g);

    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(this.controls.rewind.x, this.controls.rewind.y, this.controls.rewind.w, this.controls.rewind.h, 8);
    g.lineStyle(1, COLORS.ghost, 0.8);
    g.strokeRoundedRect(this.controls.rewind.x + 0.5, this.controls.rewind.y + 0.5, this.controls.rewind.w - 1, this.controls.rewind.h - 1, 8);
    g.fillStyle(COLORS.ghost, 0.9);
    g.fillCircle(this.controls.rewind.x + 16, this.controls.rewind.y + this.controls.rewind.h / 2, 5);
    g.fillStyle(COLORS.ink, 1);
    g.fillCircle(this.controls.rewind.x + 16, this.controls.rewind.y + this.controls.rewind.h / 2, 2);

    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(this.controls.act.x, this.controls.act.y, this.controls.act.w, this.controls.act.h, 8);
    g.lineStyle(1, COLORS.gold, 0.7);
    g.strokeRoundedRect(this.controls.act.x + 0.5, this.controls.act.y + 0.5, this.controls.act.w - 1, this.controls.act.h - 1, 8);

    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(this.controls.dash.x, this.controls.dash.y, this.controls.dash.w, this.controls.dash.h, 8);
    g.lineStyle(1, COLORS.gold, 0.7);
    g.strokeRoundedRect(this.controls.dash.x + 0.5, this.controls.dash.y + 0.5, this.controls.dash.w - 1, this.controls.dash.h - 1, 8);

    g.fillStyle(COLORS.ink, 1);
    g.fillRoundedRect(this.controls.undo.x, this.controls.undo.y, this.controls.undo.w, this.controls.undo.h, 8);
    g.lineStyle(1, COLORS.alarm, 0.6);
    g.strokeRoundedRect(this.controls.undo.x + 0.5, this.controls.undo.y + 0.5, this.controls.undo.w - 1, this.controls.undo.h - 1, 8);

    const remaining = Math.max(0, state.loopMs - state.timeMs) / 1000;
    this.hudText.setText(`${remaining.toFixed(1)}s   ${state.status.toUpperCase()}`);
    const tapeSummary = state.tracks
      .map((track) => `${(track.durationMs / 1000).toFixed(1)}s`)
      .join(' + ');
    this.echoText.setText(
      `ECHOES ${state.tracks.length}/${state.maxEchoes}   PAR ${this.vault.parEchoes}   ${this.vault.name.toUpperCase()}${tapeSummary ? `   ${tapeSummary}` : ''}`,
    );
    this.statusText.setText(
      previewing
        ? 'PREVIEW 2x · P TO STOP'
        : state.status === 'won'
          ? 'HEIST COMPLETE · BACKSPACE TO RESET'
          : state.status === 'alarm'
            ? 'CAUGHT · R TO REWIND'
            : state.status === 'timeout'
              ? 'REWINDING...'
              : '',
    );
    this.helpText.setText(
      previewing
        ? 'THE CREW, WITHOUT YOU'
        : state.status === 'won'
          ? 'THE CREW WAS YOU'
          : 'DRAG · ACT · DASH · REWIND · P PREVIEW · 1-0',
    );
    this.rewindText.setColor(state.status === 'won' || previewing ? '#3A506B' : '#F4F1DE');
    this.whistleText.setColor(
      state.status === 'won' || state.status === 'alarm' || previewing ? '#3A506B' : '#F4F1DE',
    );
    this.dashText.setColor(
      state.status === 'won' || state.status === 'alarm' || previewing ? '#3A506B' : '#F4F1DE',
    );
    this.undoText.setColor(
      state.tracks.length === 0 || previewing ? '#3A506B' : '#F4F1DE',
    );
    this.ui.setPreviewState(
      state.tracks.length > 0 &&
        state.status === 'playing' &&
        !this.paused &&
        !this.resultOpen,
      previewing,
    );
  }

  private drawEchoTimeline(g: Phaser.GameObjects.Graphics): void {
    const state = this.sim.state;
    const x = 24;
    const y = 54;
    const width = 312;

    g.fillStyle(COLORS.slate, 0.35);
    g.fillRect(x, y, width, 4);
    g.lineStyle(1, COLORS.slate, 0.25);
    g.strokeRect(x - 0.5, y - 0.5, width + 1, 5);

    if (state.loopMs <= 0) return;
    let cursor = 0;
    for (const track of state.tracks) {
      const segment = Math.max(2, (track.durationMs / state.loopMs) * width);
      g.fillStyle(track.color, 0.9);
      g.fillRect(x + cursor, y, Math.min(segment, width - cursor), 4);
      cursor += segment;
      if (cursor >= width) break;
    }

    const progress = Math.min(1, state.timeMs / state.loopMs);
    g.fillStyle(COLORS.bone, 0.85);
    g.fillRect(x + progress * width - 1, y - 3, 2, 10);
  }

  private drawGemShape(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number): void {
    g.fillStyle(COLORS.gold, 0.2);
    g.fillCircle(x, y, size + 4);
    g.fillStyle(COLORS.gold, 1);
    g.fillTriangle(x, y - size, x + size, y, x, y + size);
    g.fillTriangle(x, y - size, x - size, y, x, y + size);
    g.lineStyle(1, COLORS.bone, 0.8);
    g.lineBetween(x, y - size, x, y + size);
    g.lineBetween(x - size, y, x + size, y);
  }

  private drawLaser(g: Phaser.GameObjects.Graphics, laser: LaserState): void {
    const x1 = BOARD_X + laser.x1;
    const y1 = BOARD_Y + laser.y1;
    const x2 = BOARD_X + laser.x2;
    const y2 = BOARD_Y + laser.y2;

    g.lineStyle(laser.active ? 3 : 1, laser.active ? COLORS.alarm : COLORS.slate, laser.active ? 0.9 : 0.25);
    g.lineBetween(x1, y1, x2, y2);

    g.fillStyle(laser.active ? COLORS.alarm : COLORS.slate, laser.active ? 1 : 0.5);
    g.fillRect(x1 - 4, y1 - 4, 8, 8);
    g.fillRect(x2 - 4, y2 - 4, 8, 8);
  }

  private drawCamera(g: Phaser.GameObjects.Graphics, camera: CameraState): void {
    const x = BOARD_X + camera.x;
    const y = BOARD_Y + camera.y;
    const half = (camera.fovDeg * Math.PI) / 360;
    const color = camera.disabled ? COLORS.slate : COLORS.alarm;

    if (!this.vault.fog) {
      g.fillStyle(color, camera.disabled ? 0.03 : 0.08);
      g.fillTriangle(
        x,
        y,
        x + Math.cos(camera.angle - half) * camera.range,
        y + Math.sin(camera.angle - half) * camera.range,
        x + Math.cos(camera.angle + half) * camera.range,
        y + Math.sin(camera.angle + half) * camera.range,
      );
      g.lineStyle(1, color, camera.disabled ? 0.15 : 0.35);
      g.lineBetween(x, y, x + Math.cos(camera.angle - half) * camera.range, y + Math.sin(camera.angle - half) * camera.range);
      g.lineBetween(x, y, x + Math.cos(camera.angle + half) * camera.range, y + Math.sin(camera.angle + half) * camera.range);
    }

    g.fillStyle(color, 0.9);
    g.fillRect(x - 8, y - 8, 16, 16);
    g.lineStyle(2, COLORS.ink, 0.6);
    g.strokeRect(x - 8, y - 8, 16, 16);
    g.fillStyle(COLORS.ink, 0.9);
    g.fillCircle(x, y, 4);

    if (!camera.disabled && camera.suspicion > 0.01) {
      const width = 28;
      const height = 4;
      const bx = x - width / 2;
      const by = y - 20;
      g.fillStyle(COLORS.deep, 1);
      g.fillRect(bx, by, width, height);
      g.fillStyle(COLORS.alarm, 1);
      g.fillRect(bx, by, width * Math.min(1, camera.suspicion), height);
    }
  }

  private drawLever(g: Phaser.GameObjects.Graphics, lever: LeverState): void {
    const x = BOARD_X + lever.x;
    const y = BOARD_Y + lever.y;
    const color = lever.pressed ? COLORS.gold : COLORS.slate;
    g.fillStyle(COLORS.deep, 1);
    g.fillCircle(x, y, lever.radius);
    g.lineStyle(2, color, lever.pressed ? 1 : 0.55);
    g.strokeCircle(x, y, lever.radius);
    g.lineStyle(4, color, 1);
    g.lineBetween(x, y + 8, x, y - 12);
    g.fillStyle(color, 1);
    g.fillCircle(x, y - 14, 5);
  }

  private drawGuard(g: Phaser.GameObjects.Graphics, guard: GuardState): void {
    const x = BOARD_X + guard.x;
    const y = BOARD_Y + guard.y;
    const forward =
      guard.facing === 0
        ? { x: 0, y: -1 }
        : guard.facing === 1
          ? { x: 1, y: 0 }
          : guard.facing === 2
            ? { x: 0, y: 1 }
            : { x: -1, y: 0 };
    const angle = Math.atan2(forward.y, forward.x);
    const half = (guard.visionAngleDeg * Math.PI) / 360;
    const range = guard.visionRange;

    const color =
      guard.mode === 'follow'
        ? COLORS.ghost
        : guard.mode === 'investigate'
          ? 0xff8c42
          : guard.mode === 'confused'
            ? 0xc77dff
            : COLORS.gold;

    if (!this.vault.fog) {
      g.fillStyle(color, guard.mode === 'follow' ? 0.1 : 0.07);
      g.fillTriangle(
        x,
        y,
        x + Math.cos(angle - half) * range,
        y + Math.sin(angle - half) * range,
        x + Math.cos(angle + half) * range,
        y + Math.sin(angle + half) * range,
      );
      g.lineStyle(1, color, 0.18);
      g.lineBetween(x, y, x + Math.cos(angle - half) * range, y + Math.sin(angle - half) * range);
      g.lineBetween(x, y, x + Math.cos(angle + half) * range, y + Math.sin(angle + half) * range);
    }

    g.fillStyle(color, 0.9);
    g.fillCircle(x, y, 10);
    g.lineStyle(2, COLORS.ink, 0.8);
    g.strokeCircle(x, y, 10);
    g.lineStyle(2, COLORS.ink, 0.9);
    g.lineBetween(x, y, x + forward.x * 13, y + forward.y * 13);

    if (guard.suspicion > 0.01) {
      const width = 28;
      const height = 4;
      const bx = x - width / 2;
      const by = y - 20;
      g.fillStyle(COLORS.deep, 1);
      g.fillRect(bx, by, width, height);
      g.fillStyle(COLORS.alarm, 1);
      g.fillRect(bx, by, width * Math.min(1, guard.suspicion), height);
    }

    if (guard.mode === 'confused') {
      g.fillStyle(COLORS.bone, 1);
      g.fillRect(x - 2, y - 28, 4, 10);
      g.fillRect(x - 2, y - 15, 4, 4);
    }
  }

  private drawGhost(g: Phaser.GameObjects.Graphics, ghost: GhostState): void {
    if (!ghost.active) return;
    const x = BOARD_X + ghost.x;
    const y = BOARD_Y + ghost.y;
    g.fillStyle(ghost.color, 0.16);
    g.fillCircle(x, y, 16);
    g.fillStyle(ghost.color, 0.55);
    g.fillCircle(x, y, 10);
    g.lineStyle(2, ghost.color, 0.9);
    g.strokeCircle(x, y, 10);

    g.fillStyle(COLORS.ink, 0.8);
    switch (ghost.symbol) {
      case 'circle':
        g.strokeCircle(x, y, 4);
        break;
      case 'triangle':
        g.fillTriangle(x, y - 5, x + 5, y + 4, x - 5, y + 4);
        break;
      case 'square':
        g.fillRect(x - 4, y - 4, 8, 8);
        break;
      case 'diamond':
        g.fillTriangle(x, y - 6, x + 5, y, x - 5, y);
        g.fillTriangle(x, y + 6, x + 5, y, x - 5, y);
        break;
      case 'star':
        g.fillCircle(x, y, 3);
        g.fillRect(x - 1, y - 5, 2, 10);
        g.fillRect(x - 5, y - 1, 10, 2);
        break;
      case 'cross':
        g.fillRect(x - 4, y - 1, 8, 2);
        g.fillRect(x - 1, y - 4, 2, 8);
        break;
    }

    if (this.sim.state.gem?.holder === ghost.id) {
      this.drawGemShape(g, x, y - 18, 8);
    }
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#0B132B',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true,
  },
  input: {
    activePointers: 3,
  },
  scene: [PrototypeScene],
});

void game;
