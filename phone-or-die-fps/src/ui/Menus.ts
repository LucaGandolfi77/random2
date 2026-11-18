import type { Ending } from '../data/types';
import { CHAPTERS } from '../data/chapters';
import type { GameState } from '../game/GameState';
import type { SlotInfo } from '../systems/SaveSystem';

export interface MenuCallbacks {
  onNew: (difficulty: 'easy' | 'normal' | 'hard') => void;
  onContinue: () => void;
  onLoadSlots: () => void;
  onSettings: () => void;
  onCredits: () => void;
  onResume: () => void;
  onSave: () => void;
  onMenu: () => void;
  onRestart: () => void;
  onLoadSlot: (slot: string) => void;
  onDeleteSlot: (slot: string) => void;
  onSetting: (key: string, value: string | number | boolean) => void;
  onIntroDone: () => void;
}

type Screen = 'none' | 'main' | 'settings' | 'slots' | 'intro' | 'chapter' | 'event' | 'pause' | 'gameover' | 'ending' | 'credits';

export class Menus {
  readonly root: HTMLElement;
  private screen: Screen = 'none';
  private state!: GameState;
  private tempDifficulty: 'easy' | 'normal' | 'hard' = 'normal';
  private hasSave = false;

  constructor(container: HTMLElement, private cb: MenuCallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'screen hidden';
    container.appendChild(this.root);
  }

  bind(state: GameState, hasSave: boolean) { this.state = state; this.hasSave = hasSave; }
  get current() { return this.screen; }
  hide() { this.screen = 'none'; this.root.classList.add('hidden'); }

  private show(name: Screen, html: string) {
    this.screen = name;
    this.root.innerHTML = `<div class="panel">${html}</div>`;
    this.root.classList.remove('hidden');
  }

  main() {
    this.show('main', `
      <div class="tagline">A FIRST-PERSON HORROR SURVIVAL GAME</div>
      <h1>PHONE<br>OR DIE</h1>
      <p class="lead">10:00 PM. You are alone. A message appears: <em>"They only come when you are alone."</em><br>
      Something is standing outside your window. The phone starts ringing.<br><strong>Keep talking. Don't let them get close. Survive until 6 AM.</strong></p>
      <div class="menu-actions">
        <button class="btn btn-primary" data-a="new">New Game <span>START A NEW NIGHT</span></button>
        ${this.hasSave ? '<button class="btn" data-a="continue">Continue <span>LAST CHECKPOINT</span></button>' : ''}
        <button class="btn" data-a="slots">Load Game <span>3 SLOTS</span></button>
        <button class="btn" data-a="settings">Settings <span>AUDIO · GRAPHICS · CONTROL</span></button>
        <button class="btn" data-a="credits">Credits <span>ABOUT THIS GAME</span></button>
      </div>
      <div class="settings-row" style="margin-top:18px"><label>Difficulty for a new game</label>
        <select data-k="difficulty">
          <option value="easy" ${this.tempDifficulty === 'easy' ? 'selected' : ''}>Easy · more time, slower threat</option>
          <option value="normal" ${this.tempDifficulty === 'normal' ? 'selected' : ''}>Normal · the intended night</option>
          <option value="hard" ${this.tempDifficulty === 'hard' ? 'selected' : ''}>Hard · they learn faster</option>
        </select>
      </div>
      <div class="footer-note">DESKTOP · WASD move · mouse look · Shift run · Ctrl crouch · E interact · F light · TAB phone · ESC pause<br>
      MOBILE · left joystick move · swipe right side to look · large buttons for use, light and phone<br>
      All content is fictional. No real calls, contacts or network access.</div>`);
    this.wire({
      new: () => this.cb.onNew(this.tempDifficulty),
      continue: () => this.cb.onContinue(),
      slots: () => this.onLoadSlots?.(),
      settings: () => this.settings(),
      credits: () => this.credits()
    });
    this.root.querySelector<HTMLSelectElement>('[data-k="difficulty"]')?.addEventListener('change', (e) => {
      this.tempDifficulty = (e.target as HTMLSelectElement).value as typeof this.tempDifficulty;
    });
  }

  onLoadSlots?: () => void;

  settings(from: Screen = 'main') {
    const s = this.state;
    this.show('settings', `
      <h2>Settings</h2>
      <div class="settings-row"><label>Music volume</label><input type="range" min="0" max="1" step="0.05" value="${s.musicVolume}" data-k="musicVolume"></div>
      <div class="settings-row"><label>Sound effects</label><input type="range" min="0" max="1" step="0.05" value="${s.sfxVolume}" data-k="sfxVolume"></div>
      <div class="settings-row"><label>Mouse sensitivity</label><input type="range" min="0.4" max="2" step="0.05" value="1" data-k="sensitivity"></div>
      <div class="settings-row"><label>Invert Y axis</label><input type="checkbox" data-k="invertY" ${s.invertY ? 'checked' : ''}></div>
      <div class="settings-row"><label>Graphics quality</label>
        <select data-k="quality">
          <option value="low" ${s.quality === 'low' ? 'selected' : ''}>Low · phones</option>
          <option value="medium" ${s.quality === 'medium' ? 'selected' : ''}>Medium</option>
          <option value="high" ${s.quality === 'high' ? 'selected' : ''}>High · desktop</option>
        </select></div>
      <div class="settings-row"><label>Subtitles</label><input type="checkbox" data-k="subtitles" ${s.subtitles ? 'checked' : ''}></div>
      <div class="settings-row"><label>Text size</label><input type="range" min="0.9" max="1.3" step="0.05" value="${s.textScale}" data-k="textScale"></div>
      <div class="settings-row"><label>Mute all audio</label><input type="checkbox" data-k="muted" ${s.muted ? 'checked' : ''}></div>
      <div class="btn-row" style="margin-top:20px"><button class="btn btn-primary" data-a="back">Back</button></div>`);
    this.root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-k]').forEach((el) => {
      const key = (el as HTMLElement).dataset.k!;
      const handler = () => {
        const v = el instanceof HTMLInputElement && el.type === 'checkbox' ? el.checked
          : el instanceof HTMLInputElement ? Number(el.value) : el.value;
        this.cb.onSetting(key, v);
      };
      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
    });
    this.wire({ back: () => from === 'pause' ? this.pause() : this.main() });
  }

  slots(slots: SlotInfo[]) {
    this.show('slots', `
      <h2>Load Game</h2>
      <p class="lead">Progress is saved automatically at each chapter and can be saved manually from the pause menu.</p>
      ${slots.map((s) => {
        const d = s.data;
        const when = d ? new Date(d.savedAt).toLocaleString() : 'empty';
        return `<div class="slot">
          <div><b>${s.slot.replace('slot', 'Slot ')}</b><div class="meta">${d ? `${d.label} · ${when}` : when}</div></div>
          <div class="slot-actions">
            ${d ? `<button class="btn" data-load="${s.slot}">Load</button><button class="btn btn-danger" data-del="${s.slot}">Delete</button>` : ''}
          </div>
        </div>`;
      }).join('')}
      <div class="btn-row" style="margin-top:16px"><button class="btn" data-a="back">Back</button></div>`);
    this.root.querySelectorAll<HTMLElement>('[data-load]').forEach((el) => el.addEventListener('click', () => this.cb.onLoadSlot(el.dataset.load!)));
    this.root.querySelectorAll<HTMLElement>('[data-del]').forEach((el) => {
      el.addEventListener('click', () => {
        const slot = el.dataset.del!;
        if (confirm('Delete this save permanently?')) this.cb.onDeleteSlot(slot);
      });
    });
    this.wire({ back: () => this.main() });
  }

  intro() {
    this.show('intro', `
      <div class="tagline">FRIDAY · 22:00 · YOU ARE ALONE</div>
      <h2>The first call</h2>
      <p class="lead">Your phone buzzes. One message, from a number you do not recognise:<br>
      <strong class="accent">"They only come when you're alone."</strong><br><br>
      You laugh it off. Then the living room window catches your eye. A dark shape is standing outside. You blink, and it is gone.<br><br>
      A door creaks somewhere inside the house. Your phone starts ringing.</p>
      <p class="lead">A distorted voice whispers: <em>"Keep talking. Don't let them get close."</em><br>
      The line goes dead. Whatever is out there gets bolder every time the house is silent.</p>
      <div class="btn-row"><button class="btn btn-primary" data-a="go">Take the phone</button></div>
      <div class="footer-note">TAB opens the phone. Call someone. Then keep calling until dawn.</div>`);
    this.wire({ go: () => this.cb.onIntroDone() });
  }

  chapter(id: number) {
    const ch = CHAPTERS[id - 1];
    if (!ch) return;
    this.show('chapter', `
      <div class="tagline">${String(ch.hour % 24).padStart(2, '0')}:00 · CHAPTER ${ch.id}</div>
      <h2>${ch.title}</h2>
      <p class="lead">${ch.intro}</p>
      <p class="lead"><strong>Objective:</strong> ${ch.objective}</p>
      <div class="btn-row"><button class="btn btn-primary" data-a="go">Continue</button></div>`);
    this.wire({ go: () => this.hide() });
  }

  event(title: string, text: string) {
    this.show('event', `
      <div class="tagline accent">Something happened</div>
      <h2>${title}</h2>
      <p class="lead">${text}</p>
      <div class="btn-row"><button class="btn btn-primary" data-a="go">React</button></div>`);
    this.wire({ go: () => this.hide() });
  }

  pause() {
    this.show('pause', `
      <div class="tagline">The night is not over</div>
      <h2>Paused</h2>
      <div class="menu-actions">
        <button class="btn btn-primary" data-a="resume">Resume</button>
        <button class="btn" data-a="save">Save game</button>
        <button class="btn" data-a="settings">Settings</button>
        <button class="btn btn-danger" data-a="menu">Main menu</button>
      </div>`);
    this.wire({
      resume: () => this.cb.onResume(),
      save: () => this.cb.onSave(),
      settings: () => this.settings('pause'),
      menu: () => this.cb.onMenu()
    });
  }

  gameOver() {
    this.show('gameover', `
      <div class="tagline accent">10:00 PM — 06:00 AM</div>
      <h1 class="accent">CAPTURED</h1>
      <p class="lead">The line went quiet. Something stepped out of the dark, and the last thing you heard was your own breathing in the receiver.<br>
      The house is still there in the morning. You are not.</p>
      <div class="btn-row">
        <button class="btn btn-primary" data-a="retry">Try again</button>
        <button class="btn" data-a="menu">Main menu</button>
      </div>`);
    this.wire({ retry: () => this.cb.onRestart(), menu: () => this.cb.onMenu() });
  }

  ending(ending: Ending, state: GameState) {
    const bonds = Object.values(state.relationships).reduce((a, b) => a + b, 0);
    this.show('ending', `
      <div class="tagline">06:00 AM · DAWN</div>
      <h2 class="ending-title">${ending.title}</h2>
      <p class="ending-body">${ending.text}</p>
      <div class="stat-grid">
        <div><span>Calls made</span><b>${Object.values(state.callCounts).reduce((a, b) => a + b, 0)}</b></div>
        <div><span>Contacts reached</span><b>${Object.values(state.callCounts).filter((n) => n > 0).length} / 8</b></div>
        <div><span>Secrets revealed</span><b>${state.reveals.size}</b></div>
        <div><span>Bonds</span><b>${bonds}</b></div>
        <div><span>Final threat</span><b>${Math.round(state.threat)}%</b></div>
        <div><span>Battery left</span><b>${Math.round(state.battery)}%</b></div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" data-a="retry">Play again</button>
        <button class="btn" data-a="menu">Main menu</button>
      </div>`);
    this.wire({ retry: () => this.cb.onRestart(), menu: () => this.cb.onMenu() });
  }

  credits() {
    this.show('credits', `
      <h2>Credits</h2>
      <div class="credits-list">
        <strong>PHONE OR DIE</strong><br>
        Design, narrative, code, 3D assets and audio synthesis: an autonomous indie studio.<br><br>
        <strong>Technology</strong><br>
        Three.js · TypeScript · Vite · Web Audio API · WebGL 2<br><br>
        <strong>Assets</strong><br>
        Every mesh, texture and sound in this game is generated procedurally at runtime.<br>
        No external game assets, stock media or third-party services are used.<br><br>
        <strong>Special thanks</strong><br>
        To everyone who keeps a voice on the line.<br><br>
        This is a work of fiction. All characters and events are invented.
      </div>
      <div class="btn-row" style="margin-top:18px"><button class="btn" data-a="back">Back</button></div>`);
    this.wire({ back: () => this.main() });
  }

  private wire(actions: Record<string, () => void>) {
    this.root.querySelectorAll<HTMLElement>('[data-a]').forEach((el) => {
      el.addEventListener('click', () => actions[el.dataset.a!]?.());
    });
  }
}
