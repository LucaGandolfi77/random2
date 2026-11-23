import type { Language } from '../data/types';
import { QUESTS } from '../data/quests';
import { FESTIVAL_BRANCHES, FESTIVAL_LANTERNS, FESTIVAL_MUSICIANS } from '../data/festival';
import { canStartProcession, lanternsDone, musiciansDone } from '../game/festival';
import {
  activeQuest,
  hospitality,
  questProgress,
  rankIndex,
  type GameState
} from '../game/state';
import { rankName, t } from '../data/strings';
import { drawMinimap } from './map';

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

export type HudAction = () => void;

export class Hud {
  private root = byId<HTMLDivElement>('hud');
  private rankEl = byId<HTMLSpanElement>('hud-rank');
  private pointsEl = byId<HTMLSpanElement>('hud-points');
  private objective = byId<HTMLDivElement>('hud-objective');
  private objectiveName = byId<HTMLElement>('hud-objective-name');
  private objectiveProgress = byId<HTMLSpanElement>('hud-objective-progress');
  private objectiveLabel = this.objective.querySelector<HTMLElement>('.objective-label');
  private zoneEl = byId<HTMLDivElement>('hud-zone');
  private prompt = byId<HTMLDivElement>('prompt');
  private promptKey = byId<HTMLElement>('prompt-key');
  private promptText = byId<HTMLElement>('prompt-text');
  private toasts = byId<HTMLDivElement>('toasts');
  private compass = byId<HTMLCanvasElement>('compass');
  private minimap = byId<HTMLCanvasElement>('minimap');
  private travelEl = byId<HTMLDivElement>('travel-status');
  private travelValue = byId<HTMLElement>('travel-value');
  private travelDetail = byId<HTMLElement>('travel-detail');
  private trainEl = byId<HTMLDivElement>('train-status');
  private zoneTimer: number | undefined;
  private zoneName = '';

  constructor(
    private lang: Language,
    onJournal: HudAction,
    onMap: HudAction,
    onPause: HudAction
  ) {
    byId<HTMLButtonElement>('btn-journal').addEventListener('click', onJournal);
    byId<HTMLButtonElement>('btn-map').addEventListener('click', onMap);
    byId<HTMLButtonElement>('btn-pause').addEventListener('click', onPause);
  }

  setLanguage(lang: Language): void {
    this.lang = lang;
    this.refreshObjective(this.lastState);
    this.drawCompass(this.lastHeading);
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
    if (!visible) {
      this.setPrompt(null);
      this.setTravel(null);
      this.setTrain(null);
      this.zoneEl.classList.remove('visible');
      this.toasts.textContent = '';
    }
  }

  setTravel(value: string | null, detail = ''): void {
    if (!value) {
      this.travelEl.hidden = true;
      return;
    }
    this.travelEl.hidden = false;
    this.travelValue.textContent = value;
    this.travelDetail.textContent = detail;
  }

  setTrain(text: string | null): void {
    if (!text) {
      this.trainEl.hidden = true;
      return;
    }
    this.trainEl.hidden = false;
    this.trainEl.textContent = text;
  }

  private lastState: GameState | null = null;
  private lastHeading = 0;

  refresh(state: GameState): void {
    this.lastState = state;
    this.rankEl.textContent = rankName(rankIndex(state), this.lang);
    this.pointsEl.textContent = String(hospitality(state));
    this.refreshObjective(state);
  }

  private festivalObjective(state: GameState): { name: string; progress: string } | null {
    const festival = state.festival;
    if (festival.phase === 'ready') {
      return { name: t('festivalReadyName', this.lang), progress: '' };
    }
    if (festival.phase === 'active') {
      if (!lanternsDone(festival)) {
        return {
          name: t('festivalTaskLanterns', this.lang),
          progress: `${festival.lanterns.length}/${FESTIVAL_LANTERNS.length}`
        };
      }
      if (!musiciansDone(festival)) {
        return {
          name: t('festivalTaskMusicians', this.lang),
          progress: `${festival.musicians.length}/${FESTIVAL_MUSICIANS.length}`
        };
      }
      if (!festival.garland) {
        return {
          name: t('festivalTaskGarland', this.lang),
          progress: `${festival.branches.length}/${FESTIVAL_BRANCHES.length}`
        };
      }
      if (!festival.guest) {
        return { name: t('festivalTaskGuest', this.lang), progress: '' };
      }
      if (canStartProcession(festival)) {
        return { name: t('festivalProcessionReady', this.lang), progress: '' };
      }
      return null;
    }
    if (festival.phase === 'procession') {
      return { name: t('festivalProcession', this.lang), progress: '' };
    }
    return null;
  }

  private refreshObjective(state: GameState | null): void {
    if (!state) {
      this.objective.hidden = true;
      return;
    }
    const active = activeQuest(state);
    if (!active) {
      const festival = this.festivalObjective(state);
      if (festival) {
        this.objective.hidden = false;
        this.objectiveName.textContent = festival.name;
        this.objectiveProgress.textContent = festival.progress;
        if (this.objectiveLabel) this.objectiveLabel.textContent = t('objectiveFestival', this.lang);
        return;
      }
    }
    const id = active ?? (state.quests.bell === 'available' ? 'bell' : null);
    if (!id) {
      this.objective.hidden = true;
      return;
    }
    const meta = QUESTS[id];
    const phase = state.quests[id];
    this.objective.hidden = false;
    this.objectiveName.textContent = meta.name[this.lang];
    this.objectiveProgress.textContent =
      id === 'letters' || id === 'flowers' ? questProgress(state, id) : '';
    const label = this.objectiveLabel;
    if (label) {
      label.textContent = t(
        phase === 'objective' ? 'objectiveReady' : phase === 'available' ? 'questAvailable' : 'objective',
        this.lang
      );
    }
  }

  setPrompt(text: string | null, key = 'E'): void {
    if (!text) {
      this.prompt.hidden = true;
      return;
    }
    this.prompt.hidden = false;
    this.promptKey.textContent = key;
    this.promptText.textContent = text;
  }

  toast(text: string): void {
    const element = document.createElement('div');
    element.className = 'toast';
    element.textContent = text;
    this.toasts.appendChild(element);
    while (this.toasts.children.length > 3) {
      this.toasts.removeChild(this.toasts.firstElementChild as Element);
    }
    window.setTimeout(() => {
      element.classList.add('toast-out');
      window.setTimeout(() => element.remove(), 450);
    }, 3600);
  }

  setZone(name: string): void {
    if (!name || name === this.zoneName) return;
    this.zoneName = name;
    this.zoneEl.textContent = name;
    this.zoneEl.classList.add('visible');
    if (this.zoneTimer) window.clearTimeout(this.zoneTimer);
    this.zoneTimer = window.setTimeout(() => this.zoneEl.classList.remove('visible'), 4200);
  }

  updateCompass(heading: number): void {
    this.lastHeading = heading;
    this.drawCompass(heading);
  }

  private drawCompass(heading: number): void {
    const ctx = this.compass.getContext('2d');
    if (!ctx) return;
    const { width, height } = this.compass;
    ctx.clearRect(0, 0, width, height);

    const headingDeg = ((heading * 180) / Math.PI) % 360;
    const center = width / 2;
    const pixelsPerDegree = 1;
    const cardinals = this.lang === 'it' ? ['N', 'E', 'S', 'O'] : ['N', 'E', 'S', 'W'];

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let tick = 0; tick < 24; tick++) {
      const degrees = tick * 15;
      let diff = degrees - headingDeg;
      diff = ((diff + 540) % 360) - 180;
      if (Math.abs(diff) > 98) continue;
      const x = center + diff * pixelsPerDegree;
      const cardinal = degrees % 90 === 0;
      ctx.strokeStyle = cardinal ? 'rgba(43,36,28,0.9)' : 'rgba(43,36,28,0.42)';
      ctx.lineWidth = cardinal ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, height - 3);
      ctx.lineTo(x, height - (cardinal ? 12 : 7));
      ctx.stroke();
      if (cardinal) {
        ctx.fillStyle = 'rgba(43,36,28,0.92)';
        ctx.font = '600 10px Georgia, serif';
        ctx.fillText(cardinals[tick / 6], x, 8);
      }
    }

    ctx.fillStyle = '#3a2f23';
    ctx.beginPath();
    ctx.moveTo(center, height - 1);
    ctx.lineTo(center - 4, height - 7);
    ctx.lineTo(center + 4, height - 7);
    ctx.closePath();
    ctx.fill();
  }

  drawMinimap(
    state: GameState,
    player: { x: number; z: number },
    heading: number,
    waypoint: { x: number; z: number } | null
  ): void {
    drawMinimap(this.minimap, state, player, heading, waypoint);
  }
}
