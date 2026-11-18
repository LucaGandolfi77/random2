import { CONTACTS, CONTACT_BY_ID } from '../data/contacts';
import { contactAvailability, type GameState } from '../game/GameState';
import type { ActiveCall, CallSystem } from '../systems/CallSystem';
import type { PhoneSystem, PhoneTab } from '../systems/PhoneSystem';
import type { ContactId } from '../data/types';

export interface PhoneUICallbacks {
  onCall: (id: ContactId) => void;
  onHangup: () => void;
  onChoice: (index: number) => void;
  onClose: () => void;
  onSound: (name: string) => void;
}

export class PhoneUI {
  readonly root: HTMLElement;
  private body: HTMLElement;
  private head: HTMLElement;
  private status: HTMLElement;
  private tabs: HTMLElement;
  private actions: HTMLElement;
  private footer: HTMLElement;
  private signature = '';

  constructor(container: HTMLElement, private cb: PhoneUICallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'phone hidden';
    this.root.innerHTML = `
      <div class="phone-screen">
        <div class="phone-status"><span id="p-time">22:00</span><span class="sig" id="p-sig">▮▮▮ 4G</span></div>
        <div class="phone-head" id="p-head"></div>
        <div class="phone-tabs">
          <div class="tab" data-tab="contacts">Contacts</div>
          <div class="tab" data-tab="messages">Messages</div>
          <div class="tab" data-tab="history">Calls</div>
          <div class="tab" data-tab="notifications">Alerts</div>
        </div>
        <div class="phone-body" id="p-body"></div>
        <div class="phone-actions" id="p-actions"></div>
        <div class="phone-footer">NO SIGNAL · LOCAL NETWORK ONLY</div>
      </div>`;
    container.appendChild(this.root);
    this.body = this.root.querySelector('#p-body') as HTMLElement;
    this.head = this.root.querySelector('#p-head') as HTMLElement;
    this.status = this.root.querySelector('#p-sig') as HTMLElement;
    this.tabs = this.root.querySelector('.phone-tabs') as HTMLElement;
    this.actions = this.root.querySelector('#p-actions') as HTMLElement;
    this.footer = this.root.querySelector('.phone-footer') as HTMLElement;

    this.tabs.querySelectorAll<HTMLElement>('.tab').forEach((el) => {
      el.addEventListener('click', () => {
        this.cb.onSound('click');
        this.onTab?.(el.dataset.tab as PhoneTab);
      });
    });
    this.actions.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
      if (!btn) return;
      this.cb.onSound('click');
      if (btn.dataset.act === 'hangup') this.cb.onHangup();
      if (btn.dataset.act === 'close') this.cb.onClose();
    });
  }

  onTab?: (tab: PhoneTab) => void;

  setVisible(on: boolean, state: GameState) {
    this.root.classList.toggle('hidden', !on);
    if (on) this.signature = '';
    this.status.textContent = state.battery <= 15 ? '▮ BATTERY LOW' : `▮▮▮ ${state.battery > 60 ? '4G' : '2G'}`;
  }

  update(state: GameState, phone: PhoneSystem, calls: CallSystem) {
    if (!state.phoneOpen) return;
    const c = calls.call;
    const sig = [
      phone.tab, c?.id, c?.phase, c && Math.floor(c.elapsed),
      c && Math.floor(c.nodeElapsed), c?.nodeId, state.chapter,
      state.battery | 0, phone.messages.length, state.history.length,
      Object.keys(state.relationships).map((k) => state.relationships[k]).join(',')
    ].join('|');
    if (sig === this.signature) return;
    this.signature = sig;

    this.root.classList.toggle('interference', state.threat > 78 || state.battery < 10);
    (this.root.querySelector('#p-time') as HTMLElement).textContent = state.timeString;
    this.tabs.querySelectorAll('.tab').forEach((el) => el.classList.toggle('on', (el as HTMLElement).dataset.tab === phone.tab));
    this.tabs.classList.toggle('hidden', !!c && c.phase !== 'ended');

    if (c && c.phase !== 'ended') this.renderCall(c, calls, state);
    else if (phone.tab === 'contacts') this.renderContacts(state);
    else if (phone.tab === 'messages') this.renderMessages(phone);
    else if (phone.tab === 'history') this.renderHistory(state);
    else this.renderNotifications(state);
  }

  private setHead(title: string, sub: string) {
    this.head.innerHTML = `<h2>${title}</h2><p>${sub}</p>`;
  }

  private renderContacts(state: GameState) {
    this.setHead('Contacts', 'Keep a voice in your ear. Never let the line go quiet.');
    this.body.innerHTML = CONTACTS.map((c) => {
      const avail = contactAvailability(state, c.id);
      const cd = c.cooldownSec - (state.elapsed - state.lastCallAt[c.id]);
      const status = avail === 'off' ? 'off' : avail === 'busy' || cd > 0 ? 'busy' : 'ok';
      const text = status === 'ok' ? 'Available' : status === 'busy' ? `Busy ${Math.ceil(Math.max(0, cd))}s` : 'Unavailable';
      return `<button class="contact-row ${status === 'ok' ? '' : 'unavailable'}" data-id="${c.id}">
        <span class="avatar" style="color:${c.tint}">${c.initials}</span>
        <span class="who"><b>${c.name}</b><small>${c.role} · ${c.benefit}</small></span>
        <span class="state ${status}">${text}</span>
      </button>`;
    }).join('');
    this.body.querySelectorAll<HTMLElement>('.contact-row').forEach((el) => {
      el.addEventListener('click', () => {
        this.cb.onSound('click');
        this.cb.onCall(el.dataset.id as ContactId);
      });
    });
    this.actions.innerHTML = '<button class="btn" data-act="close">Close phone</button>';
    this.footer.textContent = 'TAP A CONTACT TO CALL · CALLS COST BATTERY';
  }

  private renderMessages(phone: PhoneSystem) {
    this.setHead('Messages', 'Unread and received during the night.');
    this.body.innerHTML = phone.messages.map((m) => `<div class="msg ${m.from === 'Unknown' ? 'them' : ''}"><b>${m.from}</b>${m.text}</div>`).join('');
    this.actions.innerHTML = '<button class="btn" data-act="close">Close phone</button>';
  }

  private renderHistory(state: GameState) {
    this.setHead('Call history', `${state.history.length} calls recorded tonight.`);
    this.body.innerHTML = state.history.map((h) => {
      const m = Math.floor(h.at / 60), s = Math.floor(h.at % 60);
      const time = `${String(Math.floor((22 + m / 60) % 24)).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      return `<div class="history-row"><span>${h.name}</span><span class="${h.missed ? 'missed' : ''}">${h.missed ? 'MISSED' : time}</span></div>`;
    }).join('') || '<div class="msg">No calls yet. Tonight is not over.</div>';
    this.actions.innerHTML = '<button class="btn" data-act="close">Close phone</button>';
  }

  private renderNotifications(state: GameState) {
    this.setHead('Notifications', 'System alerts and discovered facts.');
    const notes = [
      ...[...state.reveals].map((r) => `<div class="msg them"><b>REVELATION</b>${r.replace(/_/g, ' ')}</div>`),
      ...state.eventsDone.map((e) => `<div class="msg"><b>EVENT</b>${e.replace(/_/g, ' ')}</div>`)
    ];
    this.body.innerHTML = notes.join('') || '<div class="msg">No new alerts. The silence is normal. Probably.</div>';
    this.actions.innerHTML = '<button class="btn" data-act="close">Close phone</button>';
  }

  private renderCall(c: ActiveCall, calls: CallSystem, state: GameState) {
    const contact = CONTACT_BY_ID[c.id];
    this.head.innerHTML = '';
    if (c.phase === 'ringing') {
      this.body.innerHTML = `<div class="call-screen">
        <div class="call-avatar ringing" style="color:${contact.tint}">${contact.initials}</div>
        <h2 class="call-name">${contact.name}</h2>
        <p class="call-sub">${c.incoming ? 'INCOMING CALL' : 'CALLING...'}</p>
        <div class="call-timer">${c.incoming ? 'Answer before it stops' : 'Ringing'}</div>
      </div>`;
      this.actions.innerHTML = '<button class="btn hangup" data-act="hangup">End call</button>';
      return;
    }
    const node = calls.node;
    if (!node) return;
    const timeout = node.timeout ? Math.max(0, Math.ceil(node.timeout - c.nodeElapsed)) : null;
    const min = Math.floor(c.elapsed / 60), sec = Math.floor(c.elapsed % 60);
    this.body.innerHTML = `<div class="call-screen">
      <div class="call-avatar" style="color:${contact.tint}">${contact.initials}</div>
      <h2 class="call-name">${contact.name}</h2>
      <p class="call-sub">${contact.role.toUpperCase()} · CONNECTED</p>
      <div class="call-timer">${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}${timeout !== null ? ` · ANSWER IN ${timeout}s` : ''}</div>
      <div class="dialogue-box"><div class="speaker">${node.speaker}</div><div class="line">${node.line}</div></div>
      <div class="choices">${node.choices.map((ch, i) => `<button class="choice" data-choice="${i}">${ch.text}</button>`).join('')}</div>
    </div>`;
    this.body.querySelectorAll<HTMLElement>('[data-choice]').forEach((el) => {
      el.addEventListener('click', () => {
        this.cb.onSound('click');
        this.cb.onChoice(Number(el.dataset.choice));
      });
    });
    this.actions.innerHTML = `<button class="btn hangup" data-act="hangup">Hang up</button>`;
    this.footer.textContent = state.battery <= 15 ? 'BATTERY CRITICAL · CALL MAY DROP' : 'KEEP TALKING · SILENCE LETS THEM CLOSER';
  }
}
