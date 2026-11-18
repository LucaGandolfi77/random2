import * as THREE from 'three';
import { GameState } from './GameState';
import { SceneManager } from '../renderer/SceneManager';
import { LightingManager } from '../renderer/LightingManager';
import { createFlashlightModel, createMaterials, createPhoneModel } from '../renderer/ProceduralAssets';
import { HouseBuilder } from '../world/HouseBuilder';
import type { DoorData, World } from '../world/Interactable';
import { FirstPersonController } from '../player/FirstPersonController';
import { InteractionSystem } from '../player/InteractionSystem';
import { MobileInput } from '../player/MobileInput';
import { AudioSystem } from '../systems/AudioSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { ThreatSystem, THREAT_WARNINGS } from '../systems/ThreatSystem';
import { BatterySystem } from '../systems/BatterySystem';
import { PhoneSystem } from '../systems/PhoneSystem';
import { CallSystem } from '../systems/CallSystem';
import type { PhoneTab } from '../systems/PhoneSystem';
import { StorySystem } from '../systems/StorySystem';
import { ShadowManager } from '../enemies/ShadowManager';
import { HUD } from '../ui/HUD';
import { PhoneUI } from '../ui/PhoneUI';
import { Menus } from '../ui/Menus';
import { ENDINGS } from '../data/endings';
import type { ContactId } from '../data/types';

const REVEAL_TEXT: Record<string, string> = {
  message_sophie: 'Sophie never sent the message.',
  sophie_outside: 'The face at the window was not Sophie.',
  grandmother: 'Your grandmother wrote about a voice that keeps the dark away.',
  mother_knew: 'Your mother knew this was going to happen.',
  father_knew: 'Your father has seen this before.',
  incident: 'Something happened to you in 1998. You do not remember it.',
  journal: 'The journal describes a rule: never let the line go quiet.',
  detection: 'A flashlight held steady can freeze a Shadow.',
  shadow_lore: 'The Shadows are the space where a person should be.',
  shadow_names: 'They know your name. Do not answer when they call it.',
  family_secret: 'This has happened in your family before.',
  garden_tracks: 'The tracks in the garden are not human.',
  garden_mimic: 'Something in the garden is wearing a familiar face.',
  mike_lost: 'Mike is gone. The line stayed open for three seconds.',
  mimic_reveal: 'One of them can imitate the people you love.',
  unknown_purpose: 'The caller wants you to survive until dawn.',
  unknown_knows: 'The caller knows things it should not know.',
  unknown_rule: 'Keep a voice in your ear. Never let the line go quiet.',
  missed_breathing: 'The missed call was three seconds of breathing.',
  knows_dawn: 'Dawn is a door. You must choose who walks through it with you.'
};

export class Game {
  readonly state = new GameState();
  private sm: SceneManager;
  private world: World;
  private lighting: LightingManager;
  private materials = createMaterials();
  private audio: AudioSystem;
  private saves = new SaveSystem();
  private threat = new ThreatSystem();
  private battery = new BatterySystem();
  private phone: PhoneSystem;
  private calls: CallSystem;
  private story: StorySystem;
  private shadows: ShadowManager;
  private controller: FirstPersonController;
  private interaction: InteractionSystem;
  private mobile: MobileInput | null = null;
  private hud: HUD;
  private phoneUI: PhoneUI;
  private menus: Menus;
  private phoneModel: THREE.Group;
  private torchModel: THREE.Group;
  private captureEl: HTMLElement;
  private appEl: HTMLElement;
  private lastTime = performance.now();
  private saveTimer = 0;
  private time = 0;
  private isTouch = false;

  constructor(app: HTMLElement, sceneHost: HTMLElement) {
    this.appEl = app;
    this.sm = new SceneManager(sceneHost);

    const built = new HouseBuilder().build();
    this.world = built;
    this.sm.scene.add(built.group);
    this.lighting = new LightingManager(this.sm, this.materials);

    this.phoneModel = createPhoneModel(this.materials);
    this.phoneModel.position.set(0.3, -0.32, -0.55);
    this.phoneModel.rotation.set(0.15, -0.25, 0.12);
    this.phoneModel.visible = false;
    this.sm.camera.add(this.phoneModel);
    this.torchModel = createFlashlightModel(this.materials);
    this.torchModel.position.set(-0.3, -0.28, -0.5);
    this.torchModel.rotation.set(0.1, 0.18, -0.15);
    this.torchModel.visible = false;
    this.sm.camera.add(this.torchModel);

    this.audio = new AudioSystem(this.state);
    this.phone = new PhoneSystem(this.state);
    this.calls = new CallSystem(this.state, this.threat, {
      onToast: (t) => this.hud.toast(t),
      onReveal: (id) => this.onReveal(id),
      onEvent: (id) => this.story.trigger(id),
      onSound: (n) => this.audio.play(n)
    });
    this.story = new StorySystem(this.state, {
      onChapter: (id) => this.onChapter(id),
      onEvent: (_id, title, text) => this.onEvent(title, text),
      onToast: (t) => this.hud.toast(t),
      onReveal: (id) => this.onReveal(id),
      onIncoming: () => this.incomingCall(),
      onEnding: (ending) => this.onEnding(ending.id)
    });
    this.shadows = new ShadowManager(this.sm.scene, this.world, this.materials,
      () => this.capture(), (name, at) => this.audio.play(name, at ?? undefined, this.listener()));

    this.hud = new HUD(app);
    this.hud.setVisible(false);
    this.phoneUI = new PhoneUI(app, {
      onCall: (id) => this.startCall(id),
      onHangup: () => this.calls.hangUp(),
      onChoice: (i) => this.calls.choose(i),
      onClose: () => this.togglePhone(false),
      onSound: (n) => this.audio.play(n)
    });
    this.phoneUI.onTab = (tab: PhoneTab) => { this.phone.tab = tab; };
    this.menus = new Menus(app, {
      onNew: (d) => this.newGame(d),
      onContinue: () => this.loadGame('slot1'),
      onLoadSlots: () => this.menus.slots(this.saves.list()),
      onSettings: () => this.menus.settings(),
      onCredits: () => this.menus.credits(),
      onResume: () => this.resume(),
      onSave: () => this.saveGame(true),
      onMenu: () => this.toMenu(),
      onRestart: () => this.newGame(this.state.difficulty),
      onLoadSlot: (slot) => this.loadGame(slot),
      onDeleteSlot: (slot) => { this.saves.delete(slot); this.menus.slots(this.saves.list()); },
      onSetting: (k, v) => this.setting(k, v),
      onIntroDone: () => { this.menus.hide(); this.hud.setVisible(true); this.mobile?.show(); this.lockPointer(); }
    });

    this.captureEl = document.createElement('div');
    this.captureEl.className = 'capture hidden';
    this.captureEl.innerHTML = '<div class="eye">●</div><div class="cap-text">IT FOUND YOU</div>';
    app.appendChild(this.captureEl);

    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (this.isTouch) this.ensureMobile();
    // Some browsers only reveal touch capability after the first real touch.
    window.addEventListener('touchstart', () => {
      this.isTouch = true;
      this.ensureMobile();
      this.mobile?.show();
    }, { once: true, passive: true });

    this.controller = new FirstPersonController(this.sm.camera, this.world, this.sm.renderer.domElement, this.mobile);
    this.interaction = new InteractionSystem(this.sm.camera, this.world);

    this.bindInput();
    const settings = this.saves.loadSettings();
    if (settings) {
      if (typeof settings.musicVolume === 'number') this.state.musicVolume = settings.musicVolume;
      if (typeof settings.sfxVolume === 'number') this.state.sfxVolume = settings.sfxVolume;
      if (typeof settings.quality === 'string') this.state.quality = settings.quality as typeof this.state.quality;
      if (typeof settings.subtitles === 'boolean') this.state.subtitles = settings.subtitles;
      if (typeof settings.muted === 'boolean') this.state.muted = settings.muted;
      if (typeof settings.textScale === 'number') this.state.textScale = settings.textScale;
      if (typeof settings.invertY === 'boolean') this.state.invertY = settings.invertY;
    }
    this.sm.setQuality(this.state.quality);
    this.audio.applyVolumes();
    this.menus.bind(this.state, this.saves.list().some((s) => !!s.data));
    this.menus.main();
    requestAnimationFrame(() => this.loop());
  }

  private ensureMobile() {
    if (this.mobile) return;
    this.mobile = new MobileInput(this.appEl, {
      interact: () => this.interact(),
      light: () => this.toggleFlashlight(),
      phone: () => this.togglePhone(),
      crouch: () => {},
      sprint: () => {},
      pause: () => this.togglePause()
    });
    if (this.controller) this.controller.mobile = this.mobile;
  }

  private listener() {
    const p = this.sm.camera.position;
    return { position: { x: p.x, y: p.y, z: p.z }, yaw: this.controller.yaw };
  }

  private bindInput() {
    const canvas = this.sm.renderer.domElement;
    canvas.addEventListener('click', () => {
      if (this.state.phase === 'playing' && !this.state.phoneOpen && this.menus.current === 'none') this.lockPointer();
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab') { e.preventDefault(); if (this.state.phase === 'playing') this.togglePhone(); return; }
      if (e.code === 'Escape') { this.togglePause(); return; }
      if (this.state.phase !== 'playing' || this.state.phoneOpen) {
        if (/^Digit[123]$/.test(e.code) && this.calls.connected) this.calls.choose(Number(e.code.slice(-1)) - 1);
        return;
      }
      if (e.code === 'KeyE') this.interact();
      if (e.code === 'KeyF') this.toggleFlashlight();
      if (/^Digit[123]$/.test(e.code) && this.calls.connected) this.calls.choose(Number(e.code.slice(-1)) - 1);
    });
  }

  private lockPointer() { if (!this.isTouch) this.controller.requestLock(); }

  private newGame(difficulty: 'easy' | 'normal' | 'hard') {
    this.audio.ensure();
    this.state.reset();
    this.state.difficulty = difficulty;
    this.state.quality = this.state.quality || 'high';
    this.story.reset();
    this.threat.lastLevel = 'SAFE';
    this.battery.wasLow = false;
    this.shadows.reset();
    this.lighting.setBlackout(false);
    this.phone.messages = [{ from: 'Unknown', text: 'They only come when you are alone.', at: 0 }];
    this.controller.syncFrom(this.state);
    this.calls.call = null;
    this.phone.close();
    this.phoneUI.setVisible(false, this.state);
    this.hud.setVisible(false);
    this.mobile?.hide();
    this.captureEl.classList.add('hidden');
    this.menus.intro();
  }

  private loadGame(slot: string) {
    const data = this.saves.load(slot);
    if (!data) { this.menus.slots(this.saves.list()); return; }
    this.audio.ensure();
    this.state.restore(data);
    this.story.reset();
    this.threat.lastLevel = 'SAFE';
    this.battery.wasLow = false;
    this.shadows.reset();
    this.lighting.setBlackout(data.flags.includes('blackout'));
    this.controller.syncFrom(this.state);
    this.calls.call = null;
    this.phone.close();
    this.phoneUI.setVisible(false, this.state);
    this.hud.setVisible(true);
    this.menus.hide();
    this.mobile?.show();
    this.lockPointer();
    this.hud.toast('Save loaded. The night continues.', 3);
  }

  private resume() {
    this.menus.hide();
    this.state.phase = 'playing';
    this.hud.setVisible(true);
    this.mobile?.show();
    this.lockPointer();
  }

  private togglePause() {
    if (this.state.phase === 'captured' || this.state.phase === 'ending') return;
    if (this.menus.current === 'settings' || this.menus.current === 'slots') { this.menus.main(); return; }
    if (this.state.phase === 'menu') return;
    if (this.menus.current === 'pause') { this.resume(); return; }
    if (this.menus.current !== 'none') return;
    if (this.state.phoneOpen) { this.togglePhone(false); return; }
    this.state.phase = 'paused';
    this.controller.releaseLock();
    this.hud.setVisible(false);
    this.mobile?.hide();
    this.menus.pause();
  }

  private toMenu() {
    this.saveGame(false);
    this.state.phase = 'menu';
    this.controller.releaseLock();
    this.hud.setVisible(false);
    this.phoneUI.setVisible(false, this.state);
    this.mobile?.hide();
    this.menus.bind(this.state, this.saves.list().some((s) => !!s.data));
    this.menus.main();
  }

  private setting(key: string, value: string | number | boolean) {
    const s = this.state;
    if (key === 'musicVolume') s.musicVolume = Number(value);
    else if (key === 'sfxVolume') s.sfxVolume = Number(value);
    else if (key === 'sensitivity') this.controller.sensitivity = Number(value);
    else if (key === 'invertY') this.controller.invertY = Boolean(value);
    else if (key === 'quality') { s.quality = value as typeof s.quality; this.sm.setQuality(s.quality); }
    else if (key === 'subtitles') s.subtitles = Boolean(value);
    else if (key === 'textScale') s.textScale = Number(value);
    else if (key === 'muted') s.muted = Boolean(value);
    this.audio.applyVolumes();
    this.saves.saveSettings({
      musicVolume: s.musicVolume, sfxVolume: s.sfxVolume, quality: s.quality,
      subtitles: s.subtitles, muted: s.muted, textScale: s.textScale,
      invertY: s.invertY
    });
  }

  private togglePhone(force?: boolean) {
    if (this.state.phase !== 'playing') return;
    const open = force ?? this.phone.toggle();
    if (force !== undefined) this.state.phoneOpen = open;
    this.phoneUI.setVisible(open, this.state);
    if (open) {
      this.controller.releaseLock();
      this.mobile?.hide();
      this.audio.ensure();
      this.audio.play('click');
    } else {
      this.mobile?.show();
      this.lockPointer();
    }
  }

  private toggleFlashlight() {
    if (!this.state.slots.flashlight) { this.hud.toast('You need a flashlight. Try the storage room.', 3); return; }
    this.state.flashlightOn = !this.state.flashlightOn;
    this.audio.play('click');
  }

  private startCall(id: ContactId) {
    if (this.calls.start(id)) {
      this.phone.tab = 'contacts';
      this.hud.toast(`Calling ${id === 'unknown' ? 'unknown number' : id}...`, 2);
    }
  }

  private incomingCall() {
    if (this.calls.busy) return;
    if (this.calls.start('unknown', true)) {
      this.togglePhone(true);
      this.hud.toast('INCOMING CALL · Unknown Number', 4);
    }
  }

  private interact() {
    const it = this.interaction.hovered;
    if (!it || it.used) return;
    this.audio.play('click');
    const s = this.state;
    switch (it.kind) {
      case 'door': {
        const d = it.data as unknown as DoorData;
        if (d.locked && !s.hasFlag('has_keys')) { this.hud.toast('Locked. The keys might be in the hallway.', 3); return; }
        if (d.locked) { d.locked = false; this.hud.toast('The key turns. The door is unlocked.', 3); }
        d.open = !d.open;
        d.pivot.rotation.y = d.baseAngle + (d.open ? -Math.PI / 2 : 0);
        d.pivot.updateMatrixWorld(true);
        if (d.open) d.collider.makeEmpty();
        else d.collider.setFromObject((d.pivot.children[0] as THREE.Mesh));
        this.audio.play('door');
        break;
      }
      case 'window': {
        if (s.reveal('window_figure')) this.hud.toast('A silhouette stands beyond the glass. It does not move.', 5);
        else this.hud.toast('The garden is empty. It was empty a second ago.', 4);
        break;
      }
      case 'switch': {
        this.lighting.toggleRoom(this.sm.camera.position);
        this.audio.play('click');
        break;
      }
      case 'charger': {
        if (it.used) return;
        this.battery.charge(s, 30);
        it.used = true;
        this.audio.play('charge');
        this.hud.toast('The phone charges. A little time bought back.', 4);
        break;
      }
      case 'powerbank': {
        if (this.battery.usePowerBank(s)) {
          it.used = true;
          it.object.layers.disable(0);
          it.object.visible = false;
          this.audio.play('pickup');
          this.hud.toast('Power bank taken. Battery restored.', 4);
        }
        break;
      }
      case 'flashlight': {
        s.slots.flashlight = true;
        it.used = true;
        it.object.visible = false;
        it.object.layers.disable(0);
        this.audio.play('pickup');
        this.hud.toast('Flashlight acquired. Press F to turn it on.', 5);
        break;
      }
      case 'key': {
        s.addFlag('has_keys');
        it.used = true;
        this.audio.play('pickup');
        this.hud.toast('The keys are ice cold. Locked doors will open now.', 4);
        break;
      }
      case 'photo': {
        if (s.reveal('photo_' + it.id)) this.hud.toast('The faces in the photograph are scratched out. Except yours.', 5);
        else this.hud.toast('You already looked at this photograph.', 3);
        break;
      }
      case 'tv': {
        this.audio.play('interference');
        this.hud.toast('Only static. Then, for one frame, a face that looks like yours.', 5);
        if (s.reveal('tv_static')) this.story.trigger('wrong_number');
        break;
      }
      case 'drawer': {
        this.hud.toast('Nothing but old containers and a smell of damp.', 3);
        break;
      }
      case 'medicine': {
        if (s.reveal('medicine_note')) this.hud.toast('An old prescription: "Keep a voice in the room." Your mother\'s handwriting.', 5);
        break;
      }
      case 'security': {
        this.hud.toast('SECURITY OFFLINE · FRONT: OPEN · BACK: OPEN · MOTION: 4 SIGNALS INSIDE', 6);
        s.addFlag('security_checked');
        break;
      }
      case 'note': {
        s.reveal('mirror_face');
        this.hud.toast('Your reflection is one second behind you.', 5);
        break;
      }
      default: {
        this.hud.toast('Nothing unusual. Almost.', 3);
      }
    }
  }

  private onChapter(id: number) {
    this.audio.play('stinger');
    this.saveGame(false);
    this.menus.chapter(id);
    this.controller.releaseLock();
    this.mobile?.hide();
  }

  private onEvent(title: string, text: string) {
    this.audio.play(title === 'POWER OUTAGE' ? 'interference' : 'knock');
    this.menus.event(title, text);
    this.hud.toast(title, 4);
    this.controller.releaseLock();
    this.mobile?.hide();
    if (title === 'POWER OUTAGE') this.lighting.setBlackout(true);
  }

  private onReveal(id: string) {
    const text = REVEAL_TEXT[id] ?? id.replace(/_/g, ' ');
    this.phone.addMessage('System', text);
    this.hud.toast(`REVELATION · ${text}`, 6);
  }

  private onEnding(id: string) {
    this.controller.releaseLock();
    this.phoneUI.setVisible(false, this.state);
    this.hud.setVisible(false);
    this.mobile?.hide();
    this.audio.play(id === 'shadows-win' ? 'capture' : 'stinger');
    this.menus.ending(ENDINGS[id] ?? ENDINGS['escape-alone'], this.state);
    this.saves.delete('slot1');
  }

  private capture() {
    if (this.state.phase !== 'playing') return;
    this.state.phase = 'captured';
    this.state.threat = 100;
    this.controller.releaseLock();
    this.phoneUI.setVisible(false, this.state);
    this.hud.flash();
    this.captureEl.classList.remove('hidden');
    this.mobile?.hide();
    setTimeout(() => {
      this.captureEl.classList.add('hidden');
      this.onEnding('shadows-win');
      this.menus.gameOver();
    }, 2800);
  }

  private saveGame(manual: boolean) {
    if (this.state.phase === 'menu') return;
    this.controller.syncTo(this.state);
    this.saves.save(this.state, 'slot1', manual ? 'Manual save' : `Chapter ${this.state.chapter} checkpoint`);
    if (manual) this.hud.toast('Game saved.', 2.5);
  }

  private loop() {
    requestAnimationFrame(() => this.loop());
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.time += dt;
    const s = this.state;

    if (s.phase === 'playing' && this.menus.current === 'none') {
      s.elapsed += dt;
      this.controller.update(dt, s, !s.phoneOpen);
      this.controller.syncTo(s);
      this.sm.scene.updateMatrixWorld(true);
      this.interaction.update();

      if (s.phoneOpen) this.phoneUI.update(s, this.phone, this.calls);
      this.calls.update(dt);
      if (s.battery <= 0 && this.calls.connected) {
        this.calls.hangUp();
        this.hud.toast('Battery dead. The call is gone.', 5);
      }
      this.battery.update(dt, s, s.phoneOpen, this.calls.connected);

      const camPos = this.sm.camera.position;
      const lightNear = this.lighting.hasLightNear(camPos);
      const proximity = this.shadows.update(dt, this.time, s.threat, camPos, this.controller.yaw, s.flashlightOn, lightNear, s.difficultyFactor.enemySpeed);
      const level = this.threat.update(dt, s, this.calls.connected, proximity);
      if (level) this.hud.toast(`THREAT · ${THREAT_WARNINGS[level]}`, 5);

      if (s.threat >= 100) this.capture();
      this.story.update(dt);

      this.saveTimer += dt;
      if (this.saveTimer > 60) { this.saveTimer = 0; this.saveGame(false); }
    }

    this.phoneModel.visible = s.phoneOpen && s.phase === 'playing';
    this.torchModel.visible = s.flashlightOn && s.phase === 'playing';
    const screenMat = this.phoneModel.userData.screen as THREE.Mesh | undefined;
    if (screenMat) (screenMat.material as THREE.MeshStandardMaterial).emissiveIntensity = s.battery > 15 ? 0.75 : 0.15;

    this.lighting.update(dt, this.time, s);
    this.audio.update(dt, this.listener(), s.threat, this.controller.moving && s.phase === 'playing');
    if (s.phase === 'playing') this.hud.update(dt, s, this.interaction.hovered, this.isTouch, this.controller.currentRoom());
    this.sm.render();
  }
}
