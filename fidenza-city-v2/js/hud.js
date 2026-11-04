import { formatNumber, formatTime, escapeHtml } from './utils.js';

export class HUD {
  constructor() {
    this.el = {
      loading: document.getElementById('loading'),
      loadingText: document.getElementById('loading-text'),
      loadProgress: document.getElementById('load-progress'),
      hud: document.getElementById('hud'),
      intro: document.getElementById('intro'),
      play: document.getElementById('play'),
      score: document.getElementById('score'),
      pop: document.getElementById('pop'),
      stars: document.getElementById('stars'),
      places: document.getElementById('places'),
      careerChip: document.getElementById('career-chip'),
      barLm: document.getElementById('bar-lm'),
      barSt: document.getElementById('bar-st'),
      target: document.getElementById('target'),
      targetName: document.getElementById('target-name'),
      targetDist: document.getElementById('target-dist'),
      arrow: document.getElementById('arrow'),
      mission: document.getElementById('mission'),
      missionTitle: document.getElementById('mission-title'),
      missionText: document.getElementById('mission-text'),
      missionTimer: document.getElementById('mission-timer'),
      missionProgress: document.getElementById('mission-progress'),
      toast: document.getElementById('toast'),
      prompt: document.getElementById('prompt'),
      big: document.getElementById('big'),
      zone: document.getElementById('zone'),
      mode: document.getElementById('mode'),
      zoneName: document.getElementById('zone-name'),
      speed: document.getElementById('speed'),
      btnAct: document.getElementById('btn-act'),
      bigmap: document.getElementById('bigmap'),
      whoShown: document.getElementById('who-shown'),
      whoCurrent: document.getElementById('who-current'),
      progress: document.getElementById('progress'),
      now: document.getElementById('now'),
      weatherIcon: document.getElementById('weather-icon'),
      weatherTemp: document.getElementById('weather-temp'),
      weatherDesc: document.getElementById('weather-desc'),
      missionList: document.getElementById('mission-list'),
      infoEyebrow: document.getElementById('info-eyebrow'),
      infoTitle: document.getElementById('info-title'),
      infoDescription: document.getElementById('info-description'),
      infoFact: document.getElementById('info-fact'),
      boardBody: document.getElementById('board-body'),
      btnAudio: document.getElementById('btn-audio'),
      rotateHint: document.getElementById('rotate-hint')
    };
    this.lastScore = 0;
    this.toastTimer = 0;
    this.bigTimer = 0;
    this._bindCloseButtons();
  }

  _bindCloseButtons() {
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-close');
        document.getElementById(id)?.close();
      });
    });
  }

  setLoading(p, text) {
    if (this.el.loadProgress) this.el.loadProgress.style.width = `${Math.round(p * 100)}%`;
    if (text && this.el.loadingText) this.el.loadingText.textContent = text;
  }

  hideLoading() {
    this.el.loading?.classList.add('done');
  }

  showHUD() {
    if (this.el.hud) this.el.hud.hidden = false;
  }

  hideHUD() {
    if (this.el.hud) this.el.hud.hidden = true;
  }

  showIntro() {
    this.el.intro?.classList.remove('done');
    this.el.intro?.removeAttribute('aria-hidden');
  }

  hideIntro() {
    this.el.intro?.classList.add('done');
    this.el.intro?.setAttribute('aria-hidden', 'true');
  }

  setPlayReady(ready, label = 'Gioca') {
    if (!this.el.play) return;
    this.el.play.disabled = !ready;
    this.el.play.textContent = ready ? label : 'Caricamento…';
  }

  setScore(score, animate = true) {
    if (!this.el.score) return;
    const diff = score - this.lastScore;
    this.el.score.textContent = formatNumber(score);
    if (animate && diff > 0 && this.el.pop) {
      this.el.pop.textContent = `+${formatNumber(diff)}`;
      this.el.pop.classList.add('show');
      clearTimeout(this._popTimer);
      this._popTimer = setTimeout(() => this.el.pop.classList.remove('show'), 900);
    }
    this.lastScore = score;
  }

  setProgress(stars, totalStars, places, totalPlaces) {
    if (this.el.stars) this.el.stars.textContent = `★ ${stars}/${totalStars}`;
    if (this.el.places) this.el.places.textContent = `◆ ${places}/${totalPlaces}`;
    if (this.el.barSt) this.el.barSt.style.width = `${totalStars ? stars / totalStars * 100 : 0}%`;
    if (this.el.barLm) this.el.barLm.style.width = `${totalPlaces ? places / totalPlaces * 100 : 0}%`;
  }

  setCareer(level, money) {
    if (!this.el.careerChip) return;
    this.el.careerChip.textContent = `Lv ${level} · ${formatNumber(money || 0)} €`;
  }

  setTarget(target) {
    if (!this.el.target) return;
    if (!target) {
      this.el.target.hidden = true;
      return;
    }
    this.el.target.hidden = false;
    if (this.el.targetName) this.el.targetName.textContent = target.name || 'Obiettivo';
    if (this.el.targetDist) this.el.targetDist.textContent = target.distanceLabel || '';
    if (this.el.arrow) this.el.arrow.style.transform = `rotate(${target.relativeAngle || 0}rad)`;
  }

  setMission(m) {
    if (!this.el.mission) return;
    if (!m) {
      this.el.mission.hidden = true;
      return;
    }
    this.el.mission.hidden = false;
    if (this.el.missionTitle) this.el.missionTitle.textContent = m.title;
    if (this.el.missionText) this.el.missionText.textContent = m.text;
    if (this.el.missionTimer) this.el.missionTimer.textContent = formatTime(m.timer);
    if (this.el.missionProgress) this.el.missionProgress.style.width = `${Math.round((m.progress || 0) * 100)}%`;
  }

  setMode(mode, zoneName) {
    if (this.el.mode) this.el.mode.textContent = mode;
    if (this.el.zoneName) this.el.zoneName.textContent = zoneName || 'Fidenza';
  }

  setSpeed(kmh, visible) {
    if (!this.el.speed) return;
    this.el.speed.hidden = !visible;
    if (visible) {
      this.el.speed.querySelector('b').textContent = Math.round(kmh);
    }
  }

  setPrompt(prompt) {
    if (!this.el.prompt) return;
    if (!prompt) {
      this.el.prompt.hidden = true;
      this.el.btnAct?.setAttribute('hidden', '');
      return;
    }
    this.el.prompt.hidden = false;
    let text = prompt.text || prompt;
    const isTouch = matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0;
    if (isTouch && typeof text === 'string') text = text.replace('<kbd>E</kbd>', '<kbd>▶</kbd>');
    this.el.prompt.innerHTML = text;
    if (isTouch && this.el.btnAct) {
      this.el.btnAct.hidden = false;
      this.el.btnAct.textContent = prompt.action === 'missions' ? '☰' : '▶';
    } else {
      this.el.btnAct?.setAttribute('hidden', '');
    }
  }

  setToast(text, duration = 2300) {
    if (!this.el.toast) return;
    this.el.toast.textContent = text;
    this.el.toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.el.toast.classList.remove('show'), duration);
  }

  setBig(text, duration = 1500) {
    if (!this.el.big) return;
    this.el.big.textContent = text;
    this.el.big.classList.add('show');
    clearTimeout(this.bigTimer);
    this.bigTimer = setTimeout(() => this.el.big.classList.remove('show'), duration);
  }

  setAudioMuted(muted) {
    if (!this.el.btnAudio) return;
    this.el.btnAudio.classList.toggle('muted', muted);
    this.el.btnAudio.setAttribute('aria-label', muted ? 'Attiva audio' : 'Disattiva audio');
  }

  fillIntro({ save, weather, nowLabel, totalStars, totalPlaces }) {
    if (this.el.whoShown) {
      this.el.whoShown.hidden = !save.name;
      if (this.el.whoCurrent) this.el.whoCurrent.textContent = save.name || '';
    }
    if (this.el.progress) {
      const chips = [];
      if (save.name) chips.push(`<span>★ ${save.stars.length}/${totalStars}</span>`);
      chips.push(`<span>◆ ${save.places.length}/${totalPlaces} luoghi</span>`);
      chips.push(`<span>${formatNumber(save.score)} punti</span>`);
      this.el.progress.innerHTML = chips.join('');
    }
    if (this.el.now) this.el.now.textContent = nowLabel || '';
    if (this.el.weatherTemp) this.el.weatherTemp.textContent = weather?.temp != null ? `${Math.round(weather.temp)}°` : '—';
    if (this.el.weatherDesc) this.el.weatherDesc.textContent = weather?.label || 'cielo';
    if (this.el.weatherIcon) this.el.weatherIcon.textContent = weather?.icon || '☀';
  }

  renderMissionList(defs, activeId, onStart) {
    if (!this.el.missionList) return;
    this.el.missionList.innerHTML = '';
    for (const d of defs) {
      const item = document.createElement('div');
      item.className = 'mission-item' + (d.id === activeId ? ' active' : '') + (d.record ? ' done' : '');
      const record = d.record ? `<span class="badge">${d.record.time ? `record ${formatTime(d.record.time)}` : 'completata'}</span>` : '';
      item.innerHTML = `
        <div class="mi-icon" style="background:${d.color}">${d.icon}</div>
        <div>
          <h3>${escapeHtml(d.title)} ${record}</h3>
          <p>${escapeHtml(d.short)}</p>
        </div>
        <button type="button" data-mission="${d.id}">${d.id === activeId ? 'In corso' : d.record ? 'Rigioca' : 'Inizia'}</button>
      `;
      item.querySelector('button')?.addEventListener('click', () => {
        onStart?.(d.id);
      });
      this.el.missionList.appendChild(item);
    }
  }

  showInfo(landmark, index, total) {
    if (this.el.infoEyebrow) this.el.infoEyebrow.textContent = `Luogo scoperto · ${index}/${total}`;
    if (this.el.infoTitle) this.el.infoTitle.textContent = landmark.name;
    if (this.el.infoDescription) this.el.infoDescription.textContent = landmark.description || '';
    if (this.el.infoFact) this.el.infoFact.textContent = landmark.fact || '';
    const d = document.getElementById('info-dialog');
    if (d && !d.open) d.showModal();
  }

  renderBoard(save, missions) {
    if (!this.el.boardBody) return;
    const rows = missions.map(m => {
      const r = m.record;
      return `<tr><td>${escapeHtml(m.title)}</td><td class="num">${r?.time ? formatTime(r.time) : '—'}</td><td class="num">${r?.score ? formatNumber(r.score) : '—'}</td></tr>`;
    }).join('');
    this.el.boardBody.innerHTML = `
      <table>
        <thead><tr><th>Missione</th><th class="num">Tempo</th><th class="num">Punti</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:18px;font-size:14px"><b>Punteggio migliore:</b> ${formatNumber(save.best.score || 0)} · <b>Stelle:</b> ${save.stars.length} · <b>Luoghi:</b> ${save.places.length}</p>
    `;
  }

  openDialog(id) {
    const d = document.getElementById(id);
    if (d && !d.open) d.showModal();
  }

  closeDialog(id) {
    const d = document.getElementById(id);
    if (d?.open) d.close();
  }

  closeAllDialogs() {
    document.querySelectorAll('dialog[open]').forEach(d => d.close());
  }
}
