import { CHAPTERS, NIGHT_REAL_SECONDS, nightHour } from '../data/chapters';
import { EVENTS, pickEvent } from '../data/events';
import { ENDINGS } from '../data/endings';
import type { Ending } from '../data/types';
import type { GameState } from '../game/GameState';

export interface StoryCallbacks {
  onChapter?: (id: number) => void;
  onEvent?: (id: string, title: string, text: string) => void;
  onToast?: (text: string) => void;
  onReveal?: (id: string) => void;
  onIncoming?: (id: 'unknown') => void;
  onEnding?: (ending: Ending) => void;
}

export class StorySystem {
  private eventTimer = 30;
  private nextEvent = 34;

  constructor(private state: GameState, private cb: StoryCallbacks = {}) {}

  reset() { this.eventTimer = 26; this.nextEvent = 34; }

  update(dt: number) {
    if (this.state.phase !== 'playing') return;

    let chapter = 1;
    for (const c of CHAPTERS) if (this.state.hour >= nightHour(c.hour)) chapter = c.id;
    if (chapter > this.state.chapter) {
      this.state.chapter = chapter;
      this.cb.onChapter?.(chapter);
    }

    this.eventTimer -= dt;
    if (this.eventTimer <= 0) {
      this.eventTimer = this.nextEvent;
      this.nextEvent = 26 + Math.random() * 24;
      const ev = pickEvent(this.state.chapter, this.state.eventsDone);
      if (ev) this.trigger(ev.id);
    }

    if (this.state.elapsed >= NIGHT_REAL_SECONDS) this.finish();
  }

  trigger(id: string) {
    const ev = EVENTS.find((e) => e.id === id);
    if (!ev) return;
    if (!this.state.eventsDone.includes(ev.id)) this.state.eventsDone.push(ev.id);
    if (ev.flag) this.state.addFlag(ev.flag);
    if (ev.reveal && this.state.reveal(ev.reveal)) this.cb.onReveal?.(ev.reveal);
    if (ev.threat) this.state.threat = Math.min(100, this.state.threat + ev.threat);
    this.cb.onEvent?.(ev.id, ev.title, ev.text);
    if (ev.id === 'unknown_call') this.cb.onIncoming?.('unknown');
    if (ev.id === 'power_outage') this.state.addFlag('blackout');
  }

  /** pure resolution of the ending, exported for tests */
  static resolveEnding(state: GameState): string {
    const f = (x: string) => state.hasFlag(x);
    const r = (x: string) => state.reveals.has(x);
    const called = Object.values(state.callCounts).filter((n) => n > 0).length;

    if (r('garden_mimic') && f('truth_seeker') && (state.callCounts.unknown ?? 0) > 0) return 'secret';
    if (r('journal') || (r('mother_knew') && f('truth_seeker') && state.reveals.size >= 5)) return 'the-truth';
    if (called >= 8) return 'everyone-is-safe';
    const bonds = Object.values(state.relationships).reduce((a, b) => a + b, 0);
    if (state.visited.size >= 10 && state.reveals.size >= 8 && bonds >= 5) return 'city-remembers';
    if (state.visited.size >= 5 && called <= 2) return 'alone-in-the-crowd';
    if (bonds >= 7 && state.reveals.size >= 4 && state.threat < 60) return 'true-survival';
    return 'escape-alone';
  }

  finish() {
    if (this.state.phase !== 'playing') return;
    const id = StorySystem.resolveEnding(this.state);
    this.state.activeEnding = id;
    this.state.phase = 'ending';
    this.cb.onEnding?.(ENDINGS[id]);
  }
}
