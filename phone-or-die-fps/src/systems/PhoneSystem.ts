import type { GameState } from '../game/GameState';

export type PhoneTab = 'contacts' | 'messages' | 'history' | 'notifications' | 'settings';

export interface Message { from: string; text: string; at: number }

/** Owns the phone's UI state. The simulated network lives in CallSystem. */
export class PhoneSystem {
  tab: PhoneTab = 'contacts';
  messages: Message[] = [
    { from: 'Unknown', text: 'They only come when you are alone.', at: 0 }
  ];
  selected: string | null = null;
  justOpened = false;

  constructor(private state: GameState) {}

  toggle(): boolean {
    this.state.phoneOpen = !this.state.phoneOpen;
    if (this.state.phoneOpen) this.justOpened = true;
    return this.state.phoneOpen;
  }

  open(tab: PhoneTab = 'contacts') {
    this.state.phoneOpen = true;
    this.tab = tab;
    this.justOpened = true;
  }

  close() { this.state.phoneOpen = false; }

  addMessage(from: string, text: string) {
    this.messages.unshift({ from, text, at: this.state.elapsed });
    if (this.messages.length > 20) this.messages.pop();
  }

  get usable(): boolean { return this.state.battery > 1; }
}
