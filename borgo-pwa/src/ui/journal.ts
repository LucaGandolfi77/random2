import { QUESTS, QUEST_ORDER } from '../data/quests';
import { DISCOVERIES } from '../data/town';
import { FESTIVAL_BRANCHES, FESTIVAL_LANTERNS, FESTIVAL_MUSICIANS, FESTIVAL_POSTCARDS } from '../data/festival';
import { festivalTaskCount, lanternsDone, musiciansDone } from '../game/festival';
import { STAMPS, stampEarned } from '../data/stamps';
import { FRANCIGENA_STAGES } from '../data/francigena';
import { loadPhotos, PHOTO_SPOTS, photoFileName } from '../data/photo';
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
  private places = byId<HTMLUListElement>('journal-places');
  private placesCount = byId<HTMLParagraphElement>('journal-places-count');
  private festivalStatus = byId<HTMLParagraphElement>('journal-festival-status');
  private festivalList = byId<HTMLUListElement>('journal-festival');
  private postcards = byId<HTMLUListElement>('journal-postcards');
  private credential = byId<HTMLUListElement>('journal-credential');
  private credentialCount = byId<HTMLParagraphElement>('journal-credential-count');
  private credentialNote = byId<HTMLParagraphElement>('journal-credential-note');
  private photos = byId<HTMLUListElement>('journal-photos');
  private photosCount = byId<HTMLParagraphElement>('journal-photos-count');
  private photosNote = byId<HTMLParagraphElement>('journal-photos-note');
  private stamps = byId<HTMLUListElement>('journal-stamps');
  private stampsCount = byId<HTMLParagraphElement>('journal-stamps-count');
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
    this.places.textContent = '';
    this.festivalList.textContent = '';
    this.postcards.textContent = '';
    this.credential.textContent = '';
    this.photos.textContent = '';
    this.stamps.textContent = '';

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
    this.count.textContent = `${state.tiles.length}/12 · ${t('tilesFound', lang)}`;
    this.placesCount.textContent = `${state.discovered.length}/${DISCOVERIES.length} · ${t('placesFound', lang)}`;
    for (const place of DISCOVERIES) {
      const found = state.discovered.includes(place.id);
      const item = document.createElement('li');
      item.className = found ? 'place' : 'place place-locked';
      const name = document.createElement('strong');
      name.textContent = pick(place.name, lang);
      const description = document.createElement('p');
      description.textContent = found ? pick(place.description, lang) : t('undiscovered', lang);
      item.append(name, description);
      this.places.appendChild(item);
    }
    this.refreshCredential(state, lang);
    this.refreshPhotos(lang);
    this.refreshFestival(state, lang);
    this.refreshStamps(state, lang);
    this.drawMosaic(state.tiles);
  }

  private refreshCredential(state: GameState, lang: Language): void {
    let found = 0;
    for (const [index, stage] of FRANCIGENA_STAGES.entries()) {
      const reached = state.discovered.includes(stage.placeId);
      if (reached) found += 1;
      const item = document.createElement('li');
      item.className = reached ? 'place credential-place' : 'place place-locked credential-place';
      const name = document.createElement('strong');
      name.textContent = `${index + 1}. ${pick(stage.name, lang)}`;
      const description = document.createElement('p');
      description.textContent = reached
        ? t('credentialStageFound', lang)
        : t('credentialStageLocked', lang);
      item.append(name, description);
      this.credential.appendChild(item);
    }
    this.credentialCount.textContent = `${found}/${FRANCIGENA_STAGES.length} · ${t('credentialProgress', lang)}`;
    this.credentialNote.textContent =
      found === FRANCIGENA_STAGES.length
        ? t('credentialNoteComplete', lang)
        : t('credentialNoteLocked', lang);
  }

  private refreshPhotos(lang: Language): void {
    const photos = loadPhotos();
    const byId = new Map(photos.map((photo) => [photo.spotId, photo]));
    for (const spot of PHOTO_SPOTS) {
      const photo = byId.get(spot.id);
      const item = document.createElement('li');
      item.className = photo ? 'photo-card' : 'photo-card photo-locked';
      if (photo) {
        const link = document.createElement('a');
        link.className = 'photo-link';
        link.href = photo.image;
        link.download = photoFileName(spot);
        const image = document.createElement('img');
        image.src = photo.image;
        image.alt = pick(spot.name, lang);
        image.loading = 'lazy';
        link.appendChild(image);
        item.appendChild(link);
      } else {
        const empty = document.createElement('div');
        empty.className = 'photo-empty';
        empty.textContent = t('photoLocked', lang);
        item.appendChild(empty);
      }
      const name = document.createElement('strong');
      name.textContent = pick(spot.name, lang);
      const description = document.createElement('p');
      description.textContent = pick(spot.description, lang);
      item.append(name, description);
      if (photo) {
        const download = document.createElement('a');
        download.className = 'photo-download';
        download.href = photo.image;
        download.download = photoFileName(spot);
        download.textContent = t('photoDownload', lang);
        item.appendChild(download);
      }
      this.photos.appendChild(item);
    }
    this.photosCount.textContent = `${photos.length}/${PHOTO_SPOTS.length} · ${t('photoProgress', lang)}`;
    this.photosNote.textContent =
      photos.length === PHOTO_SPOTS.length
        ? t('photoNoteComplete', lang)
        : t('photoNoteLocked', lang);
  }

  private refreshStamps(state: GameState, lang: Language): void {
    let earned = 0;
    for (const stamp of STAMPS) {
      const found = stampEarned(stamp, state.discovered);
      if (found) earned += 1;
      const item = document.createElement('li');
      item.className = found ? 'place stamp stamp-earned' : 'place place-locked stamp';
      const name = document.createElement('strong');
      name.textContent = pick(stamp.name, lang);
      const description = document.createElement('p');
      description.textContent = found ? pick(stamp.description, lang) : t('stampLocked', lang);
      item.append(name, description);
      this.stamps.appendChild(item);
    }
    this.stampsCount.textContent = `${earned}/${STAMPS.length} · ${t('stampsFound', lang)}`;
  }

  private refreshFestival(state: GameState, lang: Language): void {
    const festival = state.festival;
    const count = festivalTaskCount(festival);
    this.festivalStatus.textContent =
      festival.phase === 'locked'
        ? t('festivalLockedJournal', lang)
        : festival.phase === 'ready'
          ? t('festivalReadyJournal', lang)
          : festival.phase === 'done'
            ? t('festivalCompleted', lang)
            : festival.phase === 'procession'
              ? t('festivalProcession', lang)
              : `${count}/4 · ${t('festivalProgress', lang)}`;

    if (festival.phase === 'active' || festival.phase === 'procession' || festival.phase === 'done') {
      const tasks: Array<{ label: string; progress: string; done: boolean }> = [
        {
          label: t('festivalTaskLanterns', lang),
          progress: `${festival.lanterns.length}/${FESTIVAL_LANTERNS.length}`,
          done: lanternsDone(festival)
        },
        {
          label: t('festivalTaskMusicians', lang),
          progress: `${festival.musicians.length}/${FESTIVAL_MUSICIANS.length}`,
          done: musiciansDone(festival)
        },
        {
          label: t('festivalTaskGarland', lang),
          progress: `${festival.branches.length}/${FESTIVAL_BRANCHES.length}`,
          done: festival.garland
        },
        {
          label: t('festivalTaskGuest', lang),
          progress: festival.guest ? '1/1' : '0/1',
          done: festival.guest
        }
      ];
      for (const task of tasks) {
        const item = document.createElement('li');
        item.className = 'festival-task' + (task.done ? ' festival-task-done' : '');
        const name = document.createElement('strong');
        name.textContent = task.label;
        const progress = document.createElement('span');
        progress.className = 'festival-task-progress';
        progress.textContent = task.progress;
        item.append(name, progress);
        this.festivalList.appendChild(item);
      }
    }

    for (const card of FESTIVAL_POSTCARDS) {
      const found = state.postcards.includes(card.id);
      const item = document.createElement('li');
      item.className = found ? 'place postcard' : 'place place-locked postcard';
      const title = document.createElement('strong');
      title.textContent = pick(card.title, lang);
      const description = document.createElement('p');
      description.textContent = found ? pick(card.description, lang) : t('postcardLocked', lang);
      item.append(title, description);
      this.postcards.appendChild(item);
    }
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

    const cols = 4;
    const rows = 3;
    const gap = 10;
    const tile = Math.min((width - gap * (cols + 1)) / cols, (height - gap * (rows + 1)) / rows);
    const totalW = cols * tile + (cols - 1) * gap;
    const totalH = rows * tile + (rows - 1) * gap;
    const startX = (width - totalW) / 2;
    const startY = (height - totalH) / 2;

    for (let i = 0; i < 12; i++) {
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
