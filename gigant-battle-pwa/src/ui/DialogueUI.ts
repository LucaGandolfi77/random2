import { FIGHTER_BY_ID } from '../data/fighters';
import type { DialogueNode } from '../data/story/dialogue';
import { spriteFactory } from '../render/SpriteFactory';

export interface DialogueCallbacks {
  onChoice: (index: number) => void;
  onAdvance: () => void;
}

export class DialogueUI {
  readonly root: HTMLElement;
  private portrait: HTMLCanvasElement;
  private speaker: HTMLElement;
  private text: HTMLElement;
  private choices: HTMLElement;
  private hint: HTMLElement;
  private node: DialogueNode | null = null;
  private shown = 0;
  onChoiceCb?: (i: number) => void;

  constructor(container: HTMLElement, private cb: DialogueCallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'screen hidden';
    this.root.innerHTML = `
      <div class="panel narrow dialogue-panel">
        <canvas class="dialogue-portrait" width="24" height="32"></canvas>
        <div class="dialogue-main">
          <div class="subtitle" id="dlg-speaker">NARRATOR</div>
          <p class="dialogue-text" id="dlg-text"></p>
          <div class="dialogue-choices" id="dlg-choices"></div>
          <div class="dialogue-hint" id="dlg-hint">TAP TO CONTINUE</div>
        </div>
      </div>`;
    container.appendChild(this.root);
    this.portrait = this.root.querySelector('canvas')!;
    this.speaker = this.root.querySelector('#dlg-speaker')!;
    this.text = this.root.querySelector('#dlg-text')!;
    this.choices = this.root.querySelector('#dlg-choices')!;
    this.hint = this.root.querySelector('#dlg-hint')!;
    this.text.addEventListener('click', () => this.advance());
    this.root.addEventListener('click', (e) => {
      if (e.target === this.text || (e.target as HTMLElement).closest('.dialogue-choices')) return;
      this.advance();
    });
  }

  show(node: DialogueNode) {
    this.node = node;
    this.shown = 0;
    this.speaker.textContent = node.speaker.toUpperCase();
    this.text.textContent = '';
    this.choices.innerHTML = '';
    this.hint.textContent = 'TAP TO CONTINUE';
    const def = FIGHTER_BY_ID[node.portrait] ?? FIGHTER_BY_ID.gold;
    const src = spriteFactory.get(def, 'idle', 0, 1);
    const g = this.portrait.getContext('2d')!;
    g.clearRect(0, 0, 24, 32);
    g.drawImage(src, 0, 0);
    this.root.classList.remove('hidden');
  }

  hide() { this.node = null; this.root.classList.add('hidden'); }

  private advance() {
    if (!this.node) return;
    if (this.shown < this.node.text.length) {
      this.shown = this.node.text.length;
      this.text.textContent = this.node.text;
      this.renderChoices();
    } else this.cb.onAdvance();
  }

  private renderChoices() {
    if (!this.node) return;
    this.choices.innerHTML = this.node.choices.map((c, i) => `<button class="btn dlg-choice" data-i="${i}">${c.text}</button>`).join('');
    this.hint.textContent = 'CHOOSE A RESPONSE';
    this.choices.querySelectorAll<HTMLElement>('[data-i]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cb.onChoice(Number(el.dataset.i));
      });
    });
  }

  update(dt: number) {
    if (!this.node || this.shown >= this.node.text.length) return;
    this.shown = Math.min(this.node.text.length, this.shown + dt * 48);
    this.text.textContent = this.node.text.slice(0, Math.floor(this.shown));
    if (this.shown >= this.node.text.length) this.renderChoices();
  }
}
