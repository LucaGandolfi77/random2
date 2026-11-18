import { CONTACT_BY_ID } from '../data/contacts';
import { DIALOGUE } from '../data/dialogue';
import type { ContactId, DialogueEffects } from '../data/types';
import type { GameState } from '../game/GameState';
import { contactAvailability } from '../game/GameState';
import { ThreatSystem } from './ThreatSystem';

export type CallPhase = 'ringing' | 'connected' | 'ended';

export interface ActiveCall {
  id: ContactId;
  incoming: boolean;
  phase: CallPhase;
  ringLeft: number;
  nodeId: string;
  elapsed: number;
  nodeElapsed: number;
  startedAt: number;
}

export interface CallCallbacks {
  onToast?: (text: string) => void;
  onReveal?: (id: string) => void;
  onEvent?: (id: string) => void;
  onEnd?: (id: ContactId) => void;
  onSound?: (name: string) => void;
}

export class CallSystem {
  call: ActiveCall | null = null;
  lastError = '';

  constructor(private state: GameState, private threat: ThreatSystem, private cb: CallCallbacks = {}) {}

  get connected(): boolean { return this.call?.phase === 'connected'; }
  get busy(): boolean { return this.call !== null && this.call.phase !== 'ended'; }

  start(id: ContactId, incoming = false): boolean {
    if (this.busy) return false;
    if (this.state.battery <= 2) {
      this.lastError = 'Battery too low to place a call.';
      this.cb.onToast?.(this.lastError);
      return false;
    }
    const contact = CONTACT_BY_ID[id];
    if (!contact) return false;
    if (!incoming) {
      const avail = contactAvailability(this.state, id);
      const cd = contact.cooldownSec - (this.state.elapsed - this.state.lastCallAt[id]);
      if (avail === 'busy' || cd > 0) {
        this.lastError = avail === 'off' ? `${contact.name} is not answering tonight.` : `${contact.name}'s line is busy. Try again in ${Math.ceil(Math.max(0, cd))}s.`;
        this.cb.onToast?.(this.lastError);
        this.cb.onSound?.('busy');
        if (avail === 'off' || cd <= 0) this.state.addHistory(contact.name, true);
        return false;
      }
    }
    this.call = {
      id, incoming, phase: 'ringing',
      ringLeft: incoming ? 4.5 : 1.6 + Math.random() * 1.6,
      nodeId: contact.startNode,
      elapsed: 0, nodeElapsed: 0,
      startedAt: this.state.elapsed
    };
    this.cb.onSound?.('ring');
    return true;
  }

  update(dt: number) {
    const c = this.call;
    if (!c || c.phase === 'ended') return;
    c.elapsed += dt;
    c.nodeElapsed += dt;
    if (c.phase === 'ringing') {
      c.ringLeft -= dt;
      if (c.ringLeft <= 0) {
        c.phase = 'connected';
        c.nodeElapsed = 0;
        this.cb.onSound?.('connect');
        if (c.incoming) this.cb.onToast?.('You answered. Keep talking.');
      }
      return;
    }
    const node = DIALOGUE[c.nodeId];
    if (node?.timeout && c.nodeElapsed >= node.timeout) {
      this.choose(node.timeoutChoice ?? 0, true);
    }
  }

  choose(index: number, timedOut = false): boolean {
    const c = this.call;
    if (!c || c.phase !== 'connected') return false;
    const node = DIALOGUE[c.nodeId];
    if (!node) return this.end();
    const choice = node.choices[index];
    if (!choice) return false;
    this.apply(choice.effects, c.id);
    if (timedOut) this.cb.onToast?.('You said nothing. The line crackles.');
    this.cb.onSound?.('talk');
    if (choice.effects?.end || !choice.next || !DIALOGUE[choice.next]) return this.end();
    c.nodeId = choice.next;
    c.nodeElapsed = 0;
    return true;
  }

  private apply(effects: DialogueEffects | undefined, id: ContactId) {
    if (!effects) return;
    const eff = this.state.callEffectiveness(id);

    if (typeof effects.threat === 'number') {
      const delta = effects.threat < 0 ? effects.threat * Math.max(0.4, eff) : effects.threat;
      this.threat.change(this.state, delta);
    }
    if (typeof effects.shieldSec === 'number') this.threat.shield(this.state, effects.shieldSec * eff);
    if (typeof effects.relationship === 'number') this.state.addRelation(id, effects.relationship);
    if (typeof effects.battery === 'number') this.state.battery = Math.max(0, Math.min(100, this.state.battery + effects.battery));
    effects.flags?.forEach((f) => this.state.addFlag(f));
    if (effects.reveal && this.state.reveal(effects.reveal)) this.cb.onReveal?.(effects.reveal);
    if (effects.unlock) this.cb.onToast?.(`A new number was saved: ${CONTACT_BY_ID[effects.unlock]?.name ?? 'Unknown'}.`);
    if (effects.event) this.cb.onEvent?.(effects.event);
  }

  end(): boolean {
    const c = this.call;
    if (!c) return false;
    const contact = CONTACT_BY_ID[c.id];
    this.state.callCounts[c.id] = (this.state.callCounts[c.id] ?? 0) + 1;
    this.state.lastCallAt[c.id] = this.state.elapsed;
    this.state.addHistory(contact.name);
    this.call = null;
    this.cb.onSound?.('hangup');
    this.cb.onEnd?.(c.id);
    return true;
  }

  hangUp() { if (this.call) this.end(); }

  get node() {
    return this.call ? DIALOGUE[this.call.nodeId] : null;
  }
}
