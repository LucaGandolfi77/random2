import { THEME_ORDER, VERSION } from './config.js';
import { ACHIEVEMENT_BY_ID, UPGRADE_BY_ID, windLabel } from './content.js';
import { comboProgress, derived } from './sim.js';
import { dateKey } from './rng.js';
import { achievementList, dailyBestFor } from './storage.js';

const $ = (id) => document.getElementById(id);
const number = new Intl.NumberFormat('en-US');
const shortDate = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const longDate = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const UPGRADE_COLORS = {
  broadhead: '#ff9f5e',
  quickdraw: '#ffcf6e',
  twinshot: '#8ee8ff',
  bodkin: '#ff8f6e',
  wallwright: '#8ee89a',
  windreader: '#8ee8ff',
  battletrance: '#ffcf6e',
  volley: '#6ff7ff',
  executioner: '#ff8f6e',
  luckycharm: '#c9a7ff',
  sureshot: '#8ee8ff',
  guardian: '#8ee89a',
  bounty: '#ffcf6e'
};

const TROPHY = '<svg class="icon"><use href="#i-trophy"/></svg>';
const LOCK = '<svg class="icon"><use href="#i-lock"/></svg>';

function parseDateKey(key) {
  const [y, m, d] = String(key || '').split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

function formatDate(key, long = false) {
  const date = parseDateKey(key || dateKey());
  return (long ? longDate : shortDate).format(date);
}

function h(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[character];
  });
}

export function createUI() {
  const screens = new Map(
    [...document.querySelectorAll('.screen')].map((screen) => [screen.id, screen])
  );
  const el = {
    hud: $('hud'),
    canvas: $('game'),
    hearts: $('hearts'),
    wave: $('wave-num'),
    score: $('score-num'),
    hudBest: $('hud-best'),
    windChip: $('wind-chip'),
    windValue: $('wind-value'),
    combo: $('combo-chip'),
    comboMult: $('combo-mult'),
    comboFill: $('combo-fill'),
    guard: $('guard-row'),
    fx: $('fx-row'),
    volley: $('volley-btn'),
    volleyState: $('volley-state'),
    volleyCool: $('volley-cool'),
    boss: $('boss-chip'),
    bossName: $('boss-name'),
    bossFill: $('boss-fill'),
    banner: $('banner'),
    bannerKicker: $('banner-kicker'),
    bannerTitle: $('banner-title'),
    bannerSub: $('banner-sub'),
    toasts: $('toast-layer'),
    menuBest: $('menu-best'),
    menuWave: $('menu-wave'),
    menuDailyStreak: $('menu-daily-streak'),
    menuStreak: $('menu-streak'),
    menuDailyMeta: $('menu-daily-meta'),
    dailyDate: $('daily-date'),
    dailyBest: $('daily-best'),
    dailyStreak: $('daily-streak'),
    dailyAllBest: $('daily-allbest'),
    achievementCount: $('achievement-count'),
    achievementList: $('achievement-list'),
    draftWave: $('draft-wave'),
    draftBonus: $('draft-bonus'),
    draftFlawless: $('draft-flawless'),
    draftCards: $('draft-cards'),
    pauseWave: $('pause-wave'),
    pauseScore: $('pause-score'),
    overKicker: $('over-kicker'),
    overTitle: $('over-title'),
    overSub: $('over-sub'),
    overScore: $('over-score'),
    overBest: $('over-best'),
    overStats: $('over-stats'),
    overDaily: $('over-daily'),
    overAchievements: $('over-achievements'),
    overAgainSub: $('over-again-sub'),
    installBtn: $('install-btn'),
    version: $('version'),
    resetDialog: $('reset-dialog')
  };

  const cache = {
    hearts: '',
    hud: '',
    guard: '',
    fx: '',
    boss: '',
    wind: '',
    combo: '',
    volley: '',
    install: false
  };

  let bannerTimer = 0;
  let installAvailable = false;

  if (el.version) el.version.textContent = VERSION;

  function setScreen(id) {
    for (const [screenId, screen] of screens) {
      screen.classList.toggle('is-active', screenId === id);
    }
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

  function setPhase(phase) {
    document.body.dataset.phase = phase;
    if (el.hud) {
      const playing = phase === 'playing';
      el.hud.setAttribute('aria-hidden', playing ? 'false' : 'true');
      el.hud.toggleAttribute('inert', !playing);
    }
    if (el.canvas) el.canvas.tabIndex = phase === 'playing' ? 0 : -1;
  }

  function renderMenu(profile) {
    const today = dateKey();
    const dailyBest = dailyBestFor(profile, today);
    const streak = profile.daily?.streak || 0;
    el.menuBest.textContent = number.format(profile.best || 0);
    el.menuWave.textContent = number.format(profile.bestWave || 1);
    el.menuDailyStreak.textContent = number.format(streak);
    el.menuStreak.textContent = String(streak);
    el.menuDailyMeta.textContent = dailyBest > 0
      ? `${formatDate(today)} • best ${number.format(dailyBest)}`
      : `${formatDate(today)} • today's horde`;
  }

  function renderDaily(profile) {
    const today = dateKey();
    el.dailyDate.textContent = formatDate(today, true);
    el.dailyBest.textContent = number.format(dailyBestFor(profile, today));
    el.dailyStreak.textContent = `${number.format(profile.daily?.streak || 0)} ${(profile.daily?.streak || 0) === 1 ? 'day' : 'days'}`;
    el.dailyAllBest.textContent = number.format(profile.daily?.best || 0);
  }

  function renderSettings(settings, profile) {
    for (const row of document.querySelectorAll('[data-setting]')) {
      const key = row.dataset.setting;
      row.setAttribute('aria-checked', String(Boolean(settings[key])));
    }
    for (const button of document.querySelectorAll('button[data-theme]')) {
      button.setAttribute('aria-pressed', String(button.dataset.theme === profile.theme));
    }
    el.installBtn.classList.toggle('is-hidden', !installAvailable);
  }

  function setInstallAvailable(value) {
    installAvailable = Boolean(value);
    if (el.installBtn) el.installBtn.classList.toggle('is-hidden', !installAvailable);
    cache.install = installAvailable;
  }

  function showInstall(value) {
    setInstallAvailable(value);
  }

  function renderAchievements(profile) {
    const list = achievementList(profile);
    const unlocked = list.filter((entry) => entry.unlocked).length;
    el.achievementCount.textContent = `${unlocked} / ${list.length}`;
    el.achievementList.innerHTML = list
      .map(
        (entry) => `
        <article class="achievement-card${entry.unlocked ? '' : ' is-locked'}">
          <span class="achievement-card__icon">${entry.unlocked ? TROPHY : LOCK}</span>
          <span class="achievement-card__copy">
            <strong>${h(entry.name)}</strong>
            <span>${h(entry.desc)}</span>
          </span>
          <span class="achievement-card__state">${entry.unlocked ? 'Earned' : 'Locked'}</span>
        </article>`
      )
      .join('');
  }

  function renderDraft(run) {
    if (!run?.draft) return;
    el.draftWave.textContent = `Wave ${run.draft.wave}`;
    el.draftBonus.textContent = `+${number.format(run.draft.bonus)}`;
    el.draftFlawless.classList.toggle('is-hidden', !run.draft.flawless);
    el.draftCards.dataset.count = String(run.draft.choices.length);
    el.draftCards.innerHTML = run.draft.choices
      .map((id, index) => {
        const upgrade = UPGRADE_BY_ID[id];
        if (!upgrade) return '';
        const level = run.upgrades[id] || 0;
        const desc = upgrade.desc[Math.min(level, upgrade.desc.length - 1)];
        const limited = upgrade.max <= 6;
        const pips = limited
          ? Array.from({ length: upgrade.max }, (_, i) => `<i class="${i < level ? 'is-on' : ''}"></i>`).join('')
          : '';
        const levelText = limited
          ? `<span class="draft-card__level">Level ${level} / ${upgrade.max} ${pips}</span>`
          : `<span class="draft-card__level">Level ${level} • stackable</span>`;
        return `
          <button class="draft-card" type="button" data-action="pick-upgrade" data-upgrade-id="${id}"
            style="--card-color:${UPGRADE_COLORS[id] || 'var(--accent)'};--card-glow:${UPGRADE_COLORS[id] || 'var(--accent)'}">
            <span class="draft-card__glyph">${h(upgrade.glyph)}</span>
            <span class="draft-card__tag">${h(upgrade.tag)}</span>
            <span class="draft-card__name">${h(upgrade.name)}</span>
            <span class="draft-card__desc">${h(desc)}</span>
            ${levelText}
            <span class="draft-card__key">${index + 1}</span>
          </button>`;
      })
      .join('');
  }

  function renderPause(run) {
    el.pauseWave.textContent = number.format(run.wave);
    el.pauseScore.textContent = number.format(run.score);
  }

  function renderGameOver(summary, record, options = {}) {
    const loss = summary.outcome === 'loss';
    const quit = summary.outcome === 'quit';
    el.overKicker.textContent = loss ? 'The wall has fallen' : quit ? 'The wall waits' : 'Siege complete';
    el.overTitle.textContent = loss ? 'The realm remembers.' : quit ? 'Run abandoned.' : 'The realm remembers.';
    el.overSub.textContent = loss
      ? 'The gate broke. Your aim did not.'
      : quit
        ? 'The bow is still warm. The horde is still coming.'
        : 'A tale for the bards. For now.';
    el.overScore.textContent = number.format(summary.score);
    el.overBest.classList.toggle('is-hidden', !record?.isBest);
    el.overAgainSub.textContent = options.daily ? "Replay today's siege" : 'Same oath, fresh run';

    const accuracy = Math.round((summary.accuracy || 0) * 100);
    const rows = [
      ['Wave', summary.wave],
      ['Kills', number.format(summary.kills)],
      ['Accuracy', `${accuracy}%`],
      ['Best combo', `x${number.format(summary.bestCombo)}`],
      ['Bullseyes', number.format(summary.bullseyes)],
      ['Warlords', number.format(summary.bossKills)]
    ];
    el.overStats.innerHTML = rows
      .map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`)
      .join('');

    const earned = [...new Set(options.earned || [])].filter((id) => ACHIEVEMENT_BY_ID[id]);
    el.overAchievements.innerHTML = earned.length
      ? earned.map((id) => `<span>${h(ACHIEVEMENT_BY_ID[id].name)}</span>`).join('')
      : '';
    el.overAchievements.classList.toggle('is-hidden', earned.length === 0);

    if (options.daily) {
      el.overDaily.classList.remove('is-hidden');
      el.overDaily.innerHTML = `Daily Siege • <strong>${number.format(options.dailyBest || 0)}</strong> best today • <strong>${number.format(options.streak || 0)}</strong>-day streak`;
    } else {
      el.overDaily.classList.add('is-hidden');
      el.overDaily.innerHTML = '';
    }
  }

  function renderHUD(run, best) {
    if (!run) return;

    const heartKey = `${run.hp}/${run.maxHp}`;
    if (cache.hearts !== heartKey) {
      cache.hearts = heartKey;
      let html = '';
      for (let i = 0; i < run.maxHp; i++) {
        html += `<svg class="heart${i < run.hp ? '' : ' is-empty'}" aria-hidden="true"><use href="#i-heart"/></svg>`;
      }
      el.hearts.innerHTML = html;
      el.hearts.setAttribute('aria-label', `${run.hp} of ${run.maxHp} hearts remaining`);
    }

    const hudKey = `${run.wave}:${Math.round(run.score)}:${best}`;
    if (cache.hud !== hudKey) {
      cache.hud = hudKey;
      el.wave.textContent = number.format(run.wave);
      el.score.textContent = number.format(run.score);
      el.hudBest.textContent = `BEST ${number.format(best || 0)}`;
    }

    const wind = windLabel(run.wind);
    if (cache.wind !== wind) {
      cache.wind = wind;
      el.windValue.textContent = wind;
      el.windChip.classList.toggle('is-calm', wind === 'CALM');
      el.windChip.classList.toggle('is-left', run.wind < 0);
      el.windChip.classList.toggle('is-right', run.wind > 0);
    }

    const comboKey = `${run.combo.mult}:${Math.round(comboProgress(run) * 100)}`;
    if (cache.combo !== comboKey) {
      cache.combo = comboKey;
      el.comboMult.textContent = `x${run.combo.mult}`;
      el.comboFill.style.setProperty('--combo', `${Math.round(comboProgress(run) * 100)}%`);
      el.combo.classList.toggle('is-hot', run.combo.mult > 1);
    }

    const guardKey = `${run.guard}/${run.waveShield}`;
    if (cache.guard !== guardKey) {
      cache.guard = guardKey;
      el.guard.innerHTML = Array.from(
        { length: run.guard },
        () => '<span class="guard-pip"><svg class="icon"><use href="#i-shield"/></svg></span>'
      ).join('');
    }

    const fx = [];
    if (run.fx.multi > 0) fx.push({ label: `Triple ${Math.ceil(run.fx.multi)}s`, color: '#ffcf6e' });
    if (run.fx.pierce > 0) fx.push({ label: `Pierce ${Math.ceil(run.fx.pierce)}s`, color: '#ff8f6e' });
    if (run.fx.slow > 0) fx.push({ label: `Frost ${Math.ceil(run.fx.slow)}s`, color: '#8ee8ff' });
    const fxKey = fx.map((entry) => entry.label).join('|');
    if (cache.fx !== fxKey) {
      cache.fx = fxKey;
      el.fx.innerHTML = fx
        .map(
          (entry) =>
            `<span class="fx-pill" style="--fx-color:${entry.color}"><i></i>${entry.label}</span>`
        )
        .join('');
    }

    const d = derived(run);
    const volleyKey = `${d.volleyLevel}:${run.volleyCooldown.toFixed(1)}`;
    if (cache.volley !== volleyKey) {
      cache.volley = volleyKey;
      const locked = d.volleyLevel <= 0;
      const charging = d.volleyLevel > 0 && run.volleyCooldown > 0;
      el.volley.classList.toggle('is-locked', locked);
      el.volley.classList.toggle('is-charging', charging);
      el.volley.disabled = locked || charging;
      el.volleyState.textContent = locked
        ? 'Locked'
        : charging
          ? `${Math.ceil(run.volleyCooldown)}s`
          : 'Ready';
      const ratio = charging ? run.volleyCooldown / Math.max(0.01, d.volleyCooldown) : 0;
      el.volleyCool.style.setProperty('--volley', String(Math.min(1, ratio)));
    }

    const bossKey = run.boss && !run.boss.dead
      ? `${run.boss.name}:${Math.max(0, run.boss.hp / run.boss.maxHp)}`
      : '';
    if (cache.boss !== bossKey) {
      cache.boss = bossKey;
      if (bossKey) {
        el.boss.classList.add('is-visible');
        el.boss.setAttribute('aria-hidden', 'false');
        el.bossName.textContent = run.boss.name;
        el.bossFill.style.setProperty('--boss', `${Math.max(0, (run.boss.hp / run.boss.maxHp) * 100)}%`);
      } else {
        el.boss.classList.remove('is-visible');
        el.boss.setAttribute('aria-hidden', 'true');
      }
    }

    document.body.classList.toggle('is-low-hp', run.hp <= 1 && run.phase === 'playing');
  }

  function banner(kicker, title, sub = '', kind = '', duration = 2600) {
    if (bannerTimer) clearTimeout(bannerTimer);
    el.bannerKicker.textContent = kicker;
    el.bannerTitle.textContent = title;
    el.bannerSub.textContent = sub;
    el.banner.classList.toggle('is-boss', kind === 'boss');
    el.banner.classList.remove('is-visible');
    void el.banner.offsetWidth;
    el.banner.classList.add('is-visible');
    bannerTimer = window.setTimeout(() => {
      el.banner.classList.remove('is-visible');
      bannerTimer = 0;
    }, duration);
  }

  function toast(title, text = '', icon = 'i-trophy', kind = '') {
    const node = document.createElement('div');
    node.className = `toast${kind ? ` toast--${kind}` : ''}`;
    node.innerHTML = `
      <span class="toast__icon"><svg class="icon"><use href="#${icon}"/></svg></span>
      <span><strong>${h(title)}</strong><span>${h(text)}</span></span>`;
    el.toasts.appendChild(node);
    while (el.toasts.children.length > 3) el.toasts.firstElementChild.remove();
    window.setTimeout(() => {
      node.style.transition = 'opacity .3s ease, transform .3s ease';
      node.style.opacity = '0';
      node.style.transform = 'translateY(6px)';
      window.setTimeout(() => node.remove(), 320);
    }, 3600);
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

  function setReducedMotionClass(value) {
    document.documentElement.classList.toggle('reduced-motion', Boolean(value));
    document.body.classList.toggle('reduced-motion', Boolean(value));
  }

  function setLowHp(value) {
    document.body.classList.toggle('is-low-hp', Boolean(value));
  }

  function setTheme(value) {
    document.documentElement.dataset.theme = value;
  }

  return {
    setScreen,
    hideScreens,
    setPhase,
    renderMenu,
    renderDaily,
    renderSettings,
    renderAchievements,
    renderDraft,
    renderPause,
    renderGameOver,
    renderHUD,
    banner,
    toast,
    clearToasts,
    showResetDialog,
    closeResetDialog,
    setReducedMotionClass,
    setLowHp,
    setTheme,
    setInstallAvailable,
    formatDate,
    version: VERSION
  };
}
