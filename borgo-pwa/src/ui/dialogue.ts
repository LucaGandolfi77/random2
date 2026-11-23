import type { Conversation, DialogueAction, Language } from '../data/types';
import { pick, t } from '../data/strings';

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

export interface DialogueHandlers {
  onChoice(action: DialogueAction): void;
  onClose(): void;
}

export class DialogueUI {
  private root = byId<HTMLDivElement>('dialogue');
  private nameEl = byId<HTMLSpanElement>('dialogue-name');
  private textEl = byId<HTMLParagraphElement>('dialogue-text');
  private choicesEl = byId<HTMLDivElement>('dialogue-choices');
  private hint = byId<HTMLDivElement>('dialogue-hint');
  private keyEl = byId<HTMLElement>('dialogue-key');
  private conversation: Conversation | null = null;
  private handlers: DialogueHandlers | null = null;
  private lang: Language = 'it';
  private lineIndex = 0;
  private revealed = 0;
  private typing = false;
  private choicesShown = false;

  constructor() {
    this.root.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('button')) return;
      this.advance();
    });
  }

  get isOpen(): boolean {
    return this.conversation !== null;
  }

  setKeyLabel(label: string): void {
    this.keyEl.textContent = label;
  }

  open(conversation: Conversation, lang: Language, handlers: DialogueHandlers): void {
    this.conversation = conversation;
    this.handlers = handlers;
    this.lang = lang;
    this.lineIndex = 0;
    this.revealed = 0;
    this.typing = true;
    this.choicesShown = false;
    this.root.hidden = false;
    this.nameEl.textContent = conversation.speaker;
    this.choicesEl.textContent = '';
    this.choicesEl.hidden = true;
    this.hint.hidden = false;
    this.renderLine();
  }

  update(dt: number): void {
    if (!this.conversation || !this.typing) return;
    const line = this.conversation.lines[this.lineIndex];
    const full = pick(line, this.lang);
    this.revealed = Math.min(full.length, this.revealed + dt * 55);
    this.textEl.textContent = full.slice(0, Math.floor(this.revealed));
    if (this.revealed >= full.length) {
      this.typing = false;
    }
  }

  advance(): void {
    if (!this.conversation) return;
    const line = this.conversation.lines[this.lineIndex];
    const full = pick(line, this.lang);

    if (this.typing || this.revealed < full.length) {
      this.typing = false;
      this.revealed = full.length;
      this.textEl.textContent = full;
      return;
    }

    if (this.choicesShown) return;

    if (this.lineIndex < this.conversation.lines.length - 1) {
      this.lineIndex += 1;
      this.revealed = 0;
      this.typing = true;
      this.renderLine();
      return;
    }

    if (this.conversation.choices && this.conversation.choices.length > 0) {
      this.showChoices();
      return;
    }

    this.close();
  }

  close(): void {
    if (!this.conversation) return;
    this.conversation = null;
    this.root.hidden = true;
    const handlers = this.handlers;
    this.handlers = null;
    handlers?.onClose();
  }

  private renderLine(): void {
    if (!this.conversation) return;
    const line = this.conversation.lines[this.lineIndex];
    this.textEl.textContent = '';
    this.hint.hidden = false;
    this.hint.querySelector('span')!.textContent = t('continueHint', this.lang);
    this.revealed = 0;
    this.typing = true;
    this.textEl.textContent = pick(line, this.lang).slice(0, 0);
  }

  private showChoices(): void {
    if (!this.conversation?.choices) return;
    this.choicesShown = true;
    this.choicesEl.textContent = '';
    this.choicesEl.hidden = false;
    this.hint.hidden = true;
    this.conversation.choices.forEach((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice-btn';
      button.textContent = pick(choice.label, this.lang);
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        this.choose(index);
      });
      this.choicesEl.appendChild(button);
    });
    this.choicesEl.querySelector<HTMLButtonElement>('button')?.focus();
  }

  private choose(index: number): void {
    if (!this.conversation?.choices) return;
    const choice = this.conversation.choices[index];
    if (!choice) return;
    const handlers = this.handlers;
    this.close();
    handlers?.onChoice(choice.action);
  }
}
