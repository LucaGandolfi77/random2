import type { Building, CityData } from './types';
import { buildStreets } from './city/streets';
import { buildProps } from './city/props';
import { buildTerrain } from './city/terrain';
import { Viewer, type ViewerMode } from './viewer/scene';
import { TouchControls } from './ui/touch';
import { CityLodManager } from './viewer/lod-manager';

const dataBase = `${import.meta.env.BASE_URL}data/`;

const $ = <T extends HTMLElement>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element ${selector}`);
  return element;
};

function setStage(text: string, progress: number): void {
  $('#loading-stage').textContent = text;
  $('#loading-bar').style.width = `${progress}%`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function heightSourceLabel(source: string | undefined): string {
  if (source === 'dsm_agea2008_minus_dtm_rer2023_24') return 'DSM 2008 − DTM 2023‑24';
  if (source === 'osm_building_levels') return 'building:levels OSM';
  if (source === 'typology_prior') return 'stima tipologica';
  return source ?? 'non nota';
}

function inspectorHtml(building: Building): string {
  const evidence = building.evidence?.length
    ? `<ul>${building.evidence.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="note">Nessuna evidenza archivista specifica.</p>';
  const flags = building.procedural_flags?.length
    ? `<ul>${building.procedural_flags.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="note">Nessun dettaglio procedurale dichiarato.</p>';
  return `
    <h2>${escapeHtml(building.name ?? building.style_label ?? building.osm_id)}</h2>
    <div class="style">${escapeHtml(building.style_label ?? building.archetype)} · ${escapeHtml(building.category ?? '')}</div>
    <span class="tier tier-${escapeHtml(building.tier)}">Tier ${escapeHtml(building.tier)}</span>
    <dl>
      <dt>OSM ID</dt><dd>${escapeHtml(building.osm_id)}</dd>
      <dt>Altezza</dt><dd>${building.height_m.toFixed(1)} m</dd>
      <dt>Fonte altezza</dt><dd>${escapeHtml(heightSourceLabel(building.height_source))}</dd>
      <dt>Confidenza altezza</dt><dd>${Math.round((building.height_confidence ?? 0) * 100)}%</dd>
      <dt>Piani</dt><dd>${building.floors}</dd>
      <dt>Area impronta</dt><dd>${Math.round(building.area_m2)} m²</dd>
      <dt>Tetto</dt><dd>${escapeHtml(building.roof.shape)} · ${escapeHtml(building.roof.material)}</dd>
      <dt>Facciata</dt><dd>${escapeHtml(building.facade.material)} · ${escapeHtml(building.facade.primary)}</dd>
      <dt>Finestre</dt><dd>${building.window_count}</dd>
      <dt>Balconi</dt><dd>${building.balcony_count}</dd>
      <dt>Confidenza archetipo</dt><dd>${Math.round((building.archetype_confidence ?? 0) * 100)}%</dd>
    </dl>
    <h3>Evidenza</h3>
    ${evidence}
    <h3>Dettagli procedurali</h3>
    ${flags}
    <p class="note">${escapeHtml(building.notes ?? '')}</p>
    <p class="note"><strong>Provenienza.</strong> ${escapeHtml(
      Object.entries(building.provenance ?? {})
        .map(([key, value]) => `${key}: ${value}`)
        .join(' · '),
    )}</p>
  `;
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

async function boot(): Promise<void> {
  const loading = $('#loading');
  const error = $('#error');
  try {
    setStage('Caricamento del payload geografico…', 18);
    const response = await fetch(`${dataBase}city.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const city = (await response.json()) as CityData;
    setStage('Preparazione del terreno e dell’ortofoto…', 38);

    const viewer = new Viewer($('#scene'));
    const terrain = buildTerrain(city, dataBase);
    viewer.scene.add(terrain.group);

    setStage('Strade, marciapiedi e arredo urbano…', 52);
    viewer.cityRoot.add(buildStreets(city.roads, city.props));
    viewer.cityRoot.add(buildProps(city.props));
    viewer.load(city, terrain.sample);

    setStage('Streaming LOD3 e batch LOD1 per l’area estesa…', 82);
    const coarsePointer = matchMedia('(pointer: coarse)').matches;
    const lodManager = new CityLodManager(
      viewer.buildingRoot,
      city.buildings,
      city.meta.lod_distances_m,
      120,
      coarsePointer ? 120 : 160,
      coarsePointer ? 5 : 8,
    );
    viewer.setLodManager(lodManager);
    lodManager.warmUp(viewer.camera, coarsePointer ? 2 : 3);
    viewer.requestShadowUpdate();

    viewer.setStatsElements({
      fps: $('#stat-fps'),
      calls: $('#stat-calls'),
      triangles: $('#stat-triangles'),
      buildings: $('#stat-buildings'),
      windows: $('#stat-windows'),
      height: $('#stat-confidence'),
    });
    $('#brand-buildings').textContent = String(city.stats.pilot_buildings);
    $('#stat-buildings').textContent = String(city.stats.buildings);
    $('#stat-windows').textContent = city.stats.windows.toLocaleString('it-IT');
    $('#stat-confidence').textContent = `${Math.round(city.stats.height_confidence_median * 100)}%`;

    const inspector = $('#inspector');
    const inspectorContent = $('#inspector-content');
    viewer.setSelectionHandler((building) => {
      if (!building) {
        inspector.classList.add('hidden');
        return;
      }
      inspectorContent.innerHTML = inspectorHtml(building);
      inspector.classList.remove('hidden');
    });
    $('#close-inspector').addEventListener('click', () => inspector.classList.add('hidden'));

    const duomo =
      city.buildings.find((building) => /cattedrale|duomo/i.test(building.name ?? '')) ??
      city.buildings[0];
    const porta = city.buildings.find((building) => /porta/i.test(building.name ?? ''));
    const focus = (building: Building | undefined): void => {
      if (building) viewer.focusBuilding(building);
    };

    const controlsPanel = $('.controls');
    const menuToggle = $('#menu-toggle') as HTMLButtonElement;
    const photoUi = $('#photo-ui');
    const photoGrid = $('#photo-grid');
    const photoGridToggle = $('#photo-grid-toggle') as HTMLInputElement;
    const photoSubject = $('#photo-subject') as HTMLInputElement;
    const photoFov = $('#photo-fov') as HTMLInputElement;
    const photoExit = $('#photo-exit') as HTMLButtonElement;
    const photoShoot = $('#photo-shoot') as HTMLButtonElement;
    const photoFlash = $('#photo-flash');
    const toast = $('#toast');
    const playHint = $('#play-hint');
    const fullscreenButton = $('#fullscreen-toggle') as HTMLButtonElement;

    let toastTimer = 0;
    const showToast = (text: string): void => {
      toast.textContent = text;
      toast.classList.add('visible');
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 1900);
    };

    const applyMode = (mode: ViewerMode): void => {
      for (const name of ['walk', 'fly', 'photo', 'orbit'] as const) {
        document.body.classList.toggle(`mode-${name}`, mode === name);
      }
      document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => {
        const active = button.dataset.mode === mode;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      photoUi.setAttribute('aria-hidden', String(mode !== 'photo'));
      if (mode !== 'orbit') inspector.classList.add('hidden');
      controlsPanel.classList.remove('open');
      document.body.classList.remove('menu-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      if (mode === 'photo') {
        photoFov.value = String(Math.round(viewer.getPhotoFov()));
        photoSubject.checked = viewer.getPhotoSubjectVisible();
        photoGrid.classList.toggle('off', !photoGridToggle.checked);
      }
    };
    viewer.onModeChange(applyMode);
    applyMode(viewer.getMode());

    const togglePhoto = (): void => {
      if (viewer.getMode() === 'photo') viewer.exitPhoto();
      else viewer.setMode('photo');
    };

    const takePhoto = (): void => {
      if (!viewer.capturePhoto()) return;
      photoFlash.classList.remove('on');
      void photoFlash.offsetWidth;
      photoFlash.classList.add('on');
      window.setTimeout(() => photoFlash.classList.remove('on'), 360);
      showToast('Foto salvata');
    };

    document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        const mode = button.dataset.mode as ViewerMode;
        if (mode === 'photo') togglePhoto();
        else viewer.setMode(mode);
      });
    });

    document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((button) => {
      button.addEventListener('click', () => {
        const view = button.dataset.view;
        if (view === 'duomo') focus(duomo);
        else if (view === 'porta') focus(porta ?? duomo);
        else if (view === 'overview') viewer.setOverview(city);
        else if (view === 'street') viewer.setStreetView();
      });
    });

    const footprints = $('#toggle-footprints') as HTMLInputElement;
    const confidence = $('#toggle-confidence') as HTMLInputElement;
    const labels = $('#toggle-labels') as HTMLInputElement;
    const details = $('#toggle-details') as HTMLInputElement;
    const legend = $('#legend');
    footprints.addEventListener('change', () => viewer.setFootprints(footprints.checked));
    confidence.addEventListener('change', () => {
      viewer.setConfidence(confidence.checked);
      legend.classList.toggle('hidden', !confidence.checked);
    });
    labels.addEventListener('change', () => viewer.setLabels(labels.checked));
    details.addEventListener('change', () => viewer.setDetailVisibility(details.checked));

    const exportButton = $('#export-glb') as HTMLButtonElement;
    exportButton.addEventListener('click', async () => {
      const original = exportButton.textContent;
      exportButton.disabled = true;
      exportButton.textContent = 'Esportazione…';
      try {
        const blob = await viewer.exportGLB();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'fidenza-piazza-duomo.glb';
        anchor.click();
        URL.revokeObjectURL(url);
        exportButton.textContent = 'Esportato';
      } catch (exportError) {
        console.error(exportError);
        exportButton.textContent = 'Errore export';
      } finally {
        setTimeout(() => {
          exportButton.disabled = false;
          exportButton.textContent = original;
        }, 1800);
      }
    });

    $('#reset-view').addEventListener('click', () => viewer.resetView());

    photoShoot.addEventListener('click', takePhoto);
    photoExit.addEventListener('click', () => viewer.exitPhoto());
    photoFov.addEventListener('input', () => viewer.setPhotoFov(Number(photoFov.value)));
    photoGridToggle.addEventListener('change', () => {
      photoGrid.classList.toggle('off', !photoGridToggle.checked);
    });
    photoSubject.addEventListener('change', () => {
      viewer.setPhotoSubjectVisible(photoSubject.checked);
    });

    menuToggle.addEventListener('click', () => {
      const open = controlsPanel.classList.toggle('open');
      document.body.classList.toggle('menu-open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
    });

    if (!document.documentElement.requestFullscreen) {
      fullscreenButton.style.display = 'none';
    } else {
      fullscreenButton.addEventListener('click', async () => {
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else await document.documentElement.requestFullscreen();
        } catch {
          showToast('Schermo intero non disponibile');
        }
      });
      document.addEventListener('fullscreenchange', () => {
        fullscreenButton.classList.toggle('active', Boolean(document.fullscreenElement));
      });
    }

    const pressed = new Set<string>();
    const movementKeys = new Set([
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'KeyW',
      'KeyA',
      'KeyS',
      'KeyD',
    ]);
    const updateKeyboardMove = (): void => {
      const forward =
        (pressed.has('ArrowUp') || pressed.has('KeyW') ? 1 : 0) -
        (pressed.has('ArrowDown') || pressed.has('KeyS') ? 1 : 0);
      const strafe =
        (pressed.has('ArrowRight') || pressed.has('KeyD') ? 1 : 0) -
        (pressed.has('ArrowLeft') || pressed.has('KeyA') ? 1 : 0);
      viewer.setKeyboardMove(strafe, forward);
    };

    window.addEventListener('keydown', (event) => {
      if (isTypingTarget(event.target)) return;
      if (movementKeys.has(event.code)) {
        pressed.add(event.code);
        updateKeyboardMove();
        event.preventDefault();
        return;
      }
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        viewer.setRunHeld(true);
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        if (viewer.getMode() === 'photo') {
          if (!event.repeat) takePhoto();
          return;
        }
        if (!event.repeat) {
          viewer.setJumpHeld(true);
          viewer.queueJump();
        }
        return;
      }
      if (event.code === 'KeyE') {
        if (viewer.getMode() === 'photo') viewer.setJumpHeld(true);
        return;
      }
      if (event.code === 'KeyC') {
        viewer.setDescendHeld(true);
        return;
      }
      if (event.code === 'KeyF' && !event.repeat) {
        viewer.toggleFlight();
        return;
      }
      if (event.code === 'KeyP' && !event.repeat) {
        togglePhoto();
        return;
      }
      if (event.code === 'KeyO' && !event.repeat) {
        viewer.setMode('orbit');
        return;
      }
      if (event.code === 'Escape') {
        if (viewer.getMode() === 'photo') viewer.exitPhoto();
        else inspector.classList.add('hidden');
        return;
      }
      if (event.code === 'Enter' && viewer.getMode() === 'photo') {
        event.preventDefault();
        if (!event.repeat) takePhoto();
        return;
      }
      if (event.code === 'Digit1') focus(duomo);
      else if (event.code === 'Digit2') focus(porta ?? duomo);
      else if (event.code === 'Digit3') viewer.setOverview(city);
      else if (event.code === 'Digit4') viewer.setStreetView();
    });

    window.addEventListener('keyup', (event) => {
      if (movementKeys.has(event.code)) {
        pressed.delete(event.code);
        updateKeyboardMove();
        return;
      }
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        viewer.setRunHeld(false);
      } else if (event.code === 'Space') {
        viewer.setJumpHeld(false);
      } else if (event.code === 'KeyE') {
        viewer.setJumpHeld(false);
      } else if (event.code === 'KeyC') {
        viewer.setDescendHeld(false);
      }
    });

    window.addEventListener('blur', () => {
      pressed.clear();
      viewer.setKeyboardMove(0, 0);
      viewer.setRunHeld(false);
      viewer.setJumpHeld(false);
      viewer.setDescendHeld(false);
    });

    const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    document.body.classList.toggle('is-touch', isTouch);
    new TouchControls({
      onMove: (x, y, magnitude) => viewer.setJoystickMove(x, y, magnitude),
      onJumpDown: () => {
        viewer.setJumpHeld(true);
        viewer.queueJump();
      },
      onJumpUp: () => viewer.setJumpHeld(false),
      onDescendDown: () => viewer.setDescendHeld(true),
      onDescendUp: () => viewer.setDescendHeld(false),
      onFly: () => viewer.toggleFlight(),
      onPhoto: () => togglePhoto(),
    });

    let hintTimer = window.setTimeout(() => playHint.classList.add('dismissed'), 12000);
    const dismissHint = (): void => {
      playHint.classList.add('dismissed');
      window.clearTimeout(hintTimer);
    };
    window.addEventListener('keydown', dismissHint, { once: true });
    window.addEventListener('pointerdown', dismissHint, { once: true });

    setStage('Pronto.', 100);
    window.setTimeout(() => loading.classList.add('done'), 350);
  } catch (bootError) {
    console.error(bootError);
    loading.classList.add('done');
    error.classList.remove('hidden');
  }
}

boot();
