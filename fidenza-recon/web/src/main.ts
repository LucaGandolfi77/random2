import type { Building, CityData } from './types';
import { DetailBatcher } from './city/facade';
import { buildBuildingLODs, buildContextBatch } from './city/building';
import { buildStreets } from './city/streets';
import { buildProps } from './city/props';
import { buildTerrain } from './city/terrain';
import { Viewer } from './viewer/scene';

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

    setStage('Costruzione degli edifici e delle facciate LOD3…', 56);
    const batcher = new DetailBatcher();
    const contextBuildings: Building[] = [];
    for (const building of city.buildings) {
      if (building.detail === 'context') {
        contextBuildings.push(building);
      } else {
        viewer.buildingRoot.add(
          buildBuildingLODs(building, batcher, city.meta.lod_distances_m),
        );
      }
    }
    viewer.buildingRoot.add(buildContextBatch(contextBuildings));
    setStage('Dettagli architettonici: finestre, balconi, cornici…', 76);
    viewer.setDetailGroup(batcher.build());

    setStage('Strade, marciapiedi e arredo urbano…', 88);
    viewer.cityRoot.add(buildStreets(city.roads, city.props));
    viewer.cityRoot.add(buildProps(city.props));
    viewer.load(city);
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
    if (duomo) viewer.focusBuilding(duomo);
    const focus = (building: Building | undefined): void => {
      if (building) viewer.focusBuilding(building);
    };
    document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((button) => {
      button.addEventListener('click', () => {
        const view = button.dataset.view;
        if (view === 'duomo') focus(duomo);
        else if (view === 'porta') focus(porta ?? duomo);
        else if (view === 'overview') viewer.setOverview(city);
        else if (view === 'street') viewer.setStreetView();
      });
    });
    window.addEventListener('keydown', (event) => {
      if (event.key === '1') focus(duomo);
      if (event.key === '2') focus(porta ?? duomo);
      if (event.key === '3') viewer.setOverview(city);
      if (event.key === '4') viewer.setStreetView();
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

    setStage('Pronto.', 100);
    window.setTimeout(() => loading.classList.add('done'), 350);
  } catch (bootError) {
    console.error(bootError);
    loading.classList.add('done');
    error.classList.remove('hidden');
  }
}

boot();
