import { QUESTS, QUEST_ORDER } from '../data/quests';
import { pick, t } from '../data/strings';
import type { Language, QuestId } from '../data/types';
import { questProgress, type GameState } from '../game/state';

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

const TILE_COLORS = ['#d9a441', '#4f8a8b', '#c2603f', '#7f8e56', '#8a6fb0', '#5b7fa8'];

export class JournalPanel {
  private root = byId<HTMLDivElement>('journal');
  private list = byId<HTMLUListElement>('journal-quests');
  private done = byId<HTMLUListElement>('journal-done');
  private empty = byId<HTMLParagraphElement>('journal-empty');
  private mosaic = byId<HTMLCanvasElement>('journal-mosaic');
  private count = byId<HTMLParagraphElement>('journal-tiles-count');
  private open = false;

  constructor(private onClose: () => void) {
    byId<HTMLButtonElement>('journal-close').addEventListener('click', () => this.close());
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(state: GameState, lang: Language): void {
    this.open = true;
    this.root.hidden = false;
    this.refresh(state, lang);
  }

  hide(): void {
    this.open = false;
    this.root.hidden = true;
  }

  close(): void {
    if (!this.open) return;
    this.hide();
    this.onClose();
  }

  refresh(state: GameState, lang: Language): void {
    if (!this.open) return;
    this.list.textContent = '';
    this.done.textContent = '';

    const active: QuestId[] = [];
    const completed: QuestId[] = [];
    for (const id of QUEST_ORDER) {
      if (state.quests[id] === 'active' || state.quests[id] === 'objective') active.push(id);
      if (state.quests[id] === 'done') completed.push(id);
    }

    for (const id of active) {
      this.list.appendChild(this.questItem(id, state, lang, false));
    }
    for (const id of completed) {
      this.done.appendChild(this.questItem(id, state, lang, true));
    }

    this.empty.hidden = active.length > 0;
    this.done.parentElement?.classList.toggle('is-empty', completed.length === 0);
    this.count.textContent = `${state.tiles.length}/6 · ${t('tilesFound', lang)}`;
    this.drawMosaic(state.tiles);
  }

  private questItem(id: QuestId, state: GameState, lang: Language, done: boolean): HTMLLIElement {
    const item = document.createElement('li');
    item.className = 'quest' + (done ? ' quest-done' : '');

    const head = document.createElement('div');
    head.className = 'quest-head';
    const name = document.createElement('strong');
    name.textContent = pick(QUESTS[id].name, lang);
    const status = document.createElement('span');
    status.className = 'quest-state';
    status.textContent = done
      ? t('questDone', lang)
      : state.quests[id] === 'objective'
        ? t('questReady', lang)
        : t('questActive', lang);
    head.append(name, status);

    const description = document.createElement('p');
    description.textContent = pick(QUESTS[id].description, lang);

    item.append(head, description);
    if (id === 'letters' || id === 'flowers') {
      const progress = document.createElement('span');
      progress.className = 'quest-progress';
      progress.textContent = questProgress(state, id);
      item.appendChild(progress);
    }
    return item;
  }

  private drawMosaic(found: string[]): void {
    const ctx = this.mosaic.getContext('2d');
    if (!ctx) return;
    const { width, height } = this.mosaic;
    ctx.clearRect(0, 0, width, height);

    const cols = 3;
    const rows = 2;
    const gap = 12;
    const tile = Math.min((width - gap * (cols + 1)) / cols, (height - gap * (rows + 1)) / rows);
    const totalW = cols * tile + (cols - 1) * gap;
    const totalH = rows * tile + (rows - 1) * gap;
    const startX = (width - totalW) / 2;
    const startY = (height - totalH) / 2;

    for (let i = 0; i < 6; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (tile + gap);
      const y = startY + row * (tile + gap);
      const isFound = found.length > i;

      ctx.fillStyle = isFound ? TILE_COLORS[i] : 'rgba(58,47,35,0.08)';
      ctx.fillRect(x, y, tile, tile);
      ctx.strokeStyle = isFound ? 'rgba(43,36,28,0.8)' : 'rgba(58,47,35,0.28)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, tile, tile);

      if (isFound) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, tile, tile);
        ctx.clip();
        const pattern = TILE_COLORS[(i + 2) % TILE_COLORS.length];
        ctx.fillStyle = pattern;
        ctx.globalAlpha = 0.45;
        if (i % 2 === 0) {
          ctx.beginPath();
          ctx.arc(x + tile / 2, y + tile / 2, tile * 0.3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + tile, y);
          ctx.lineTo(x, y + tile);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
      } else {
        ctx.strokeStyle = 'rgba(58,47,35,0.2)';
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 8);
        ctx.lineTo(x + tile - 8, y + tile - 8);
        ctx.moveTo(x + tile - 8, y + 8);
        ctx.lineTo(x + 8, y + tile - 8);
        ctx.stroke();
      }
    }
  }
}
