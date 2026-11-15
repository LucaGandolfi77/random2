import { ACTS, CHAPTERS, CHAPTER_BY_ID, EPILOGUE, FINAL_CHAPTER_ID, TOTAL_CHAPTERS, formatTime } from './content.js';
import { ENEMIES, RANKS, WEAPONS } from './config.js';
import { interactionPrompt } from './sim.js';

const $ = (id) => document.getElementById(id);
const number = new Intl.NumberFormat('it-IT');

function esc(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

export function createUI() {
  const screens = new Map([...document.querySelectorAll('.screen')].map((screen) => [screen.id, screen]));
  const el = {
    hud: $('hud'),
    canvas: $('game'),
    health: $('health-frames'),
    weapon: $('weapon-name'),
    ammo: $('ammo-count'),
    mag: $('ammo-mag'),
    molotov: $('molotov-count'),
    chapter: $('chapter-label'),
    objective: $('objective-text'),
    alert: $('alert-badge'),
    boss: $('boss-bar'),
    bossName: $('boss-name'),
    bossFill: $('boss-fill'),
    chase: $('chase-panel'),
    chaseCar: $('chase-car-hp'),
    chaseEnemy: $('chase-enemy-hp'),
    chaseFill: $('chase-enemy-fill'),
    prompt: $('prompt'),
    reloadFill: $('reload-fill'),
    trainWarning: $('train-warning'),
    titleAct: $('title-act'),
    titleFilmstrip: $('title-filmstrip'),
    introPanels: $('intro-panels'),
    banner: $('banner'),
    bannerKicker: $('banner-kicker'),
    bannerTitle: $('banner-title'),
    bannerSub: $('banner-sub'),
    toasts: $('toast-layer'),
    titleRank: $('title-rank'),
    titleProgress: $('title-progress'),
    titleKills: $('title-kills'),
    continueBtn: $('continue-btn'),
    continueCopy: $('continue-copy'),
    chapterList: $('chapter-list'),
    introKicker: $('intro-kicker'),
    introTitle: $('intro-heading'),
    introSub: $('intro-subtitle'),
    introCopy: $('intro-copy'),
    introObjective: $('intro-objective'),
    pauseChapter: $('pause-chapter'),
    pauseTime: $('pause-time'),
    pauseKills: $('pause-kills'),
    resultKicker: $('result-kicker'),
    resultTitle: $('result-heading'),
    resultCopy: $('result-copy'),
    resultRank: $('result-rank'),
    resultStats: $('result-stats'),
    resultNote: $('result-note'),
    resultNext: $('result-next'),
    resultRetry: $('result-retry'),
    endingCopy: $('ending-copy'),
    endingRank: $('ending-rank'),
    installBtn: $('install-btn'),
    iosInstall: $('ios-install'),
    iosInstallCopy: $('ios-install-copy'),
    resetDialog: $('reset-dialog')
  };
  const cache = { health: '', hud: '', boss: '', chase: '', prompt: '', alert: '', reload: '', train: '' };
  let bannerTimer = 0;
  let installAvailable = false;

  function setPhase(phase) {
    document.body.dataset.phase = phase;
    const visible = phase === 'playing';
    if (el.hud) {
      el.hud.setAttribute('aria-hidden', visible ? 'false' : 'true');
      el.hud.toggleAttribute('inert', !visible);
    }
    if (el.canvas) el.canvas.tabIndex = visible ? 0 : -1;
    const touch = document.getElementById('touch-controls');
    if (touch) touch.setAttribute('aria-hidden', visible && document.body.classList.contains('has-touch') ? 'false' : 'true');
  }

  function setScreen(id) {
    for (const [screenId, screen] of screens) screen.classList.toggle('is-active', screenId === id);
    const screen = screens.get(id);
    if (screen) {
      screen.scrollTop = 0;
      const heading = screen.querySelector('h1, h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    }
  }

  function hideScreens() {
    for (const screen of screens.values()) screen.classList.remove('is-active');
  }

  function bestRank(profile) {
    let best = 'C';
    for (const entry of Object.values(profile.best || {})) {
      if (entry?.rank && RANKS.indexOf(entry.rank) > RANKS.indexOf(best)) best = entry.rank;
    }
    return profile.completed?.length ? best : '—';
  }

  function renderTitle(profile) {
    el.titleRank.textContent = bestRank(profile);
    el.titleProgress.textContent = `${profile.completed?.length || 0} / ${TOTAL_CHAPTERS}`;
    el.titleKills.textContent = number.format(profile.totalKills || 0);
    const hasProgress = (profile.completed?.length || 0) > 0 || profile.unlocked > 1;
    el.continueBtn.disabled = !hasProgress;
    el.continueCopy.textContent = hasProgress
      ? `Capitolo ${Math.min(TOTAL_CHAPTERS, profile.unlocked)}`
      : 'Nessun salvataggio';
    const focusId = Math.min(TOTAL_CHAPTERS, Math.max(1, profile.unlocked));
    const act = CHAPTER_BY_ID[focusId]?.act || 1;
    el.titleAct.textContent = `Milano, 1977 · Atto ${act === 1 ? 'I' : act === 2 ? 'II' : 'III'}`;
    el.titleFilmstrip.innerHTML = CHAPTERS.map((chapter) => {
      const completed = profile.completed?.includes(chapter.id);
      const open = chapter.id <= profile.unlocked;
      return `<i class="${completed ? 'is-complete' : open ? 'is-open' : ''}" title="${esc(chapter.title)}"></i>`;
    }).join('');
  }

  function renderChapters(profile) {
    el.chapterList.innerHTML = ACTS.map((act) => `
      <section class="act-block">
        <header class="act-heading"><span>${esc(act.title)}</span><strong>${esc(act.subtitle)}</strong></header>
        <div class="act-grid">
          ${act.chapters.map((id) => {
            const chapter = CHAPTER_BY_ID[id];
            if (!chapter) return '';
            const open = chapter.id <= profile.unlocked;
            const entry = profile.best?.[chapter.id];
            const completed = profile.completed?.includes(chapter.id);
            return `
              <button class="chapter-card${open ? '' : ' is-locked'}" type="button" data-chapter="${chapter.id}" ${open ? '' : 'disabled'}>
                <span class="chapter-number">${chapter.id}</span>
                <span class="chapter-copy">
                  <span>${esc(chapter.subtitle)}</span>
                  <h3>${esc(chapter.title)}</h3>
                  <p>${esc(chapter.tagline)}</p>
                </span>
                <span class="chapter-state">
                  <span>${open ? (completed ? 'Concluso' : 'Aperto') : 'Bloccato'}</span>
                  ${open ? `<strong>${entry?.rank || '—'}</strong>` : '<svg class="icon"><use href="#i-lock"/></svg>'}
                </span>
              </button>`;
          }).join('')}
        </div>
      </section>
    `).join('');
  }

  function renderIntro(chapter) {
    el.introKicker.textContent = `Capitolo ${chapter.id} · ${chapter.subtitle}`;
    el.introTitle.textContent = chapter.title;
    el.introSub.textContent = chapter.tagline;
    el.introCopy.innerHTML = chapter.intro.map((paragraph) => `<p>${esc(paragraph)}</p>`).join('');
    el.introObjective.textContent = chapter.objectiveText;
    el.introPanels.innerHTML = [1, 2, 3].map((index) => {
      const label = index === 1 ? 'NOTTE' : index === 2 ? 'CITTÀ' : 'PIOMBO';
      return `<span class="intro-panel" style="--panel:${index}"><b>${String(index).padStart(2, '0')}</b><i>${label}</i></span>`;
    }).join('');
  }

  function renderHUD(state) {
    if (!state) return;
    const chase = state.mode === 'chase';
    const hp = chase ? state.chase.car.hp : state.player.hp;
    const maxHp = chase ? state.chase.car.maxHp : state.player.maxHp;
    const healthKey = `${hp}/${maxHp}`;
    if (cache.health !== healthKey) {
      cache.health = healthKey;
      let html = '';
      for (let index = 0; index < maxHp; index++) {
        html += `<span class="health-frame${index < hp ? ' is-full' : ''}"></span>`;
      }
      el.health.innerHTML = html;
      el.health.setAttribute('aria-label', `${hp} di ${maxHp} fotogrammi di salute`);
    }

    const weaponDef = WEAPONS[state.player.weapon] || WEAPONS.pistol;
    const hudKey = `${state.mode}:${state.stage}:${state.chapterId}:${state.objective.type}:${state.objective.done}:${state.alert}:${state.player.weapon}:${state.player.ammo}:${state.player.reloading}:${state.stats.kills}`;
    if (cache.hud !== hudKey) {
      cache.hud = hudKey;
      el.weapon.textContent = weaponDef.name;
      el.ammo.textContent = state.player.reloading ? '…' : String(state.player.ammo);
      el.mag.textContent = `/${weaponDef.mag}`;
      el.molotov.textContent = String(state.player.molotov);
      el.chapter.textContent = `Capitolo ${state.chapterId} · ${state.chapter.title}`;
      let objective = state.objective.label || state.chapter.objectiveText;
      if (state.objective.type === 'collect' && state.objective.done) objective = 'Raggiungi l’uscita';
      else if (state.objective.type === 'boss' && state.objective.done) objective = 'Il lavoro è fatto';
      else if (state.mode === 'chase') objective = state.chase.won ? 'La Darsena aspetta' : 'Distruggi l’auto del Bianco';
      el.objective.textContent = objective;
    }

    const weaponDefForReload = WEAPONS[state.player.weapon] || WEAPONS.pistol;
    const reloadRatio = state.player.reloading
      ? 1 - Math.max(0, state.player.reloadTimer) / Math.max(0.01, weaponDefForReload.reload)
      : 0;
    const reloadKey = `${state.player.reloading}:${Math.round(reloadRatio * 100)}`;
    if (cache.reload !== reloadKey) {
      cache.reload = reloadKey;
      el.reloadFill.style.setProperty('--reload', `${Math.round(reloadRatio * 100)}%`);
      el.reloadFill.classList.toggle('is-reloading', state.player.reloading);
    }

    const train = !chase && Boolean(state.hazardWarning);
    if (cache.train !== String(train)) {
      cache.train = String(train);
      el.trainWarning.classList.toggle('is-visible', train);
      el.trainWarning.setAttribute('aria-hidden', train ? 'false' : 'true');
    }

    const alertVisible = !chase && state.alert;
    if (cache.alert !== String(alertVisible)) {
      cache.alert = String(alertVisible);
      el.alert.classList.toggle('is-visible', alertVisible);
    }

    const boss = state.boss && !state.boss.dead && (state.flags?.bossAnnounced || state.mode === 'chase') ? state.boss : null;
    const bossKey = boss ? `${boss.name}:${boss.hp}` : '';
    if (cache.boss !== bossKey) {
      cache.boss = bossKey;
      el.boss.classList.toggle('is-visible', Boolean(boss));
      el.boss.setAttribute('aria-hidden', boss ? 'false' : 'true');
      if (boss) {
        el.bossName.textContent = boss.name || ENEMIES[boss.type]?.name || 'Boss';
        el.bossFill.style.setProperty('--boss', `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`);
      }
    }

    const chaseKey = chase ? `${state.chase.car.hp}:${state.chase.enemy.hp}:${state.chase.won}` : '';
    if (cache.chase !== chaseKey) {
      cache.chase = chaseKey;
      el.chase.classList.toggle('is-visible', chase);
      el.chase.setAttribute('aria-hidden', chase ? 'false' : 'true');
      if (chase) {
        el.chaseCar.textContent = String(state.chase.car.hp);
        el.chaseEnemy.textContent = String(Math.max(0, state.chase.enemy.hp));
        el.chaseFill.style.setProperty('--chase', `${Math.max(0, (state.chase.enemy.hp / state.chase.enemy.maxHp) * 100)}%`);
      }
    }

    const prompt = interactionPrompt(state);
    const promptKey = prompt ? `${prompt.key}:${prompt.text}` : '';
    if (cache.prompt !== promptKey) {
      cache.prompt = promptKey;
      el.prompt.classList.toggle('is-visible', Boolean(prompt));
      el.prompt.innerHTML = prompt ? `<kbd>${esc(prompt.key)}</kbd>${esc(prompt.text)}` : '';
    }
  }

  function renderPause(state) {
    el.pauseChapter.textContent = String(state.chapterId);
    el.pauseTime.textContent = formatTime(state.time);
    el.pauseKills.textContent = String(state.stats.kills);
  }

  function renderResult(summary, record, options = {}) {
    const won = Boolean(options.won);
    const final = Boolean(options.final);
    el.resultKicker.textContent = won ? 'Capitolo concluso' : 'La notte è finita';
    el.resultTitle.textContent = won ? 'La notte è tua.' : 'Sei morto.';
    const outro = CHAPTER_BY_ID[summary.chapterId]?.outro?.[0];
    el.resultCopy.textContent = won
      ? outro || (final
        ? 'La Tangenziale è alle spalle. La Darsena ha smesso di sparare.'
        : 'Il fumo si dirada. Milano non applaude, ma qualcuno ha smesso di cercarti.')
      : 'La città ha vinto questa mano. Il nastro può aspettare un’altra notte.';
    el.resultRank.textContent = won ? summary.rank : '—';
    const stats = [
      ['Tempo', formatTime(summary.time)],
      ['Uccisioni', number.format(summary.kills)],
      ['Precisione', `${Math.round((summary.accuracy || 0) * 100)}%`],
      ['Furtivi', number.format(summary.stealthKills || 0)],
      ['Danni', number.format(summary.damage || 0)],
      ['Boss', number.format(summary.bossKills || 0)]
    ];
    el.resultStats.innerHTML = stats.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('');
    if (won && record) {
      const notes = [];
      if (record.isBestRank) notes.push('Nuovo grado migliore');
      if (record.isBestTime) notes.push('Tempo record');
      if (record.unlocked > summary.chapterId) notes.push(`Capitolo ${record.unlocked} sbloccato`);
      el.resultNote.textContent = notes.join(' · ');
    } else {
      el.resultNote.textContent = '';
    }
    el.resultNext.classList.toggle('is-hidden', !won);
    el.resultRetry.classList.toggle('is-hidden', won);
    if (won) {
      el.resultNext.querySelector('strong').textContent = final ? 'Vedi il finale' : 'Prossimo capitolo';
      el.resultNext.querySelector('small').textContent = final ? 'La verità, finalmente' : 'La notte continua';
    }
  }

  function renderEnding(profile) {
    const best = bestRank(profile);
    el.endingRank.textContent = best;
    const finalOutro = CHAPTER_BY_ID[FINAL_CHAPTER_ID]?.outro || [];
    el.endingCopy.innerHTML = [...finalOutro, ...EPILOGUE].map((paragraph) => `<p>${esc(paragraph)}</p>`).join('');
  }

  function renderSettings(settings, profile) {
    for (const row of document.querySelectorAll('[data-setting]')) {
      row.setAttribute('aria-checked', String(Boolean(settings[row.dataset.setting])));
    }
    for (const input of document.querySelectorAll('[data-volume]')) {
      const value = settings[`${input.dataset.volume}Volume`] ?? 0.82;
      input.value = String(Math.round(value * 100));
    }
    el.installBtn.classList.toggle('is-hidden', !installAvailable);
  }

  function setInstallAvailable(value) {
    installAvailable = Boolean(value);
    if (el.installBtn) el.installBtn.classList.toggle('is-hidden', !installAvailable);
  }

  function setIOSInstallVisible(value, copy = '') {
    if (!el.iosInstall) return;
    el.iosInstall.classList.toggle('is-hidden', !value);
    if (copy) el.iosInstallCopy.textContent = copy;
  }

  function banner(kicker, title, sub = '', duration = 2400) {
    if (bannerTimer) clearTimeout(bannerTimer);
    el.bannerKicker.textContent = kicker;
    el.bannerTitle.textContent = title;
    el.bannerSub.textContent = sub;
    el.banner.classList.remove('is-visible');
    void el.banner.offsetWidth;
    el.banner.classList.add('is-visible');
    bannerTimer = window.setTimeout(() => {
      el.banner.classList.remove('is-visible');
      bannerTimer = 0;
    }, duration);
  }

  function toast(title, text = '') {
    const node = document.createElement('div');
    node.className = 'toast';
    node.innerHTML = `<span><strong>${esc(title)}</strong><span>${esc(text)}</span></span>`;
    el.toasts.appendChild(node);
    while (el.toasts.children.length > 3) el.toasts.firstElementChild.remove();
    window.setTimeout(() => {
      node.style.transition = 'opacity .25s ease, transform .25s ease';
      node.style.opacity = '0';
      node.style.transform = 'translateY(5px)';
      window.setTimeout(() => node.remove(), 280);
    }, 3000);
  }

  function clearToasts() {
    el.toasts.innerHTML = '';
  }

  function showResetDialog() {
    if (typeof el.resetDialog.showModal === 'function') el.resetDialog.showModal();
    else el.resetDialog.setAttribute('open', '');
  }

  function closeResetDialog() {
    if (typeof el.resetDialog.close === 'function') el.resetDialog.close();
    else el.resetDialog.removeAttribute('open');
  }

  function setReducedMotion(value) {
    document.documentElement.classList.toggle('reduced-motion', Boolean(value));
    document.body.classList.toggle('reduced-motion', Boolean(value));
  }

  return {
    setPhase,
    setScreen,
    hideScreens,
    renderTitle,
    renderChapters,
    renderIntro,
    renderHUD,
    renderPause,
    renderResult,
    renderEnding,
    renderSettings,
    setInstallAvailable,
    setIOSInstallVisible,
    banner,
    toast,
    clearToasts,
    showResetDialog,
    closeResetDialog,
    setReducedMotion,
    bestRank,
    formatTime
  };
}
